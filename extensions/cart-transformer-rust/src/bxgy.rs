use super::js_value::{
    as_array, get, get_json, is_truthy, js_round, json_to_number, json_to_text_or_empty,
    number_from_text, number_to_text, to_number, to_text_or_empty,
};
use super::schema;
use super::schema::cart_transform_run::cart_transform_run_input::cart::lines::Merchandise;
use super::schema::cart_transform_run::cart_transform_run_input::cart::Lines;
use shopify_function::prelude::*;
use std::collections::HashMap;

const TYPE: &str = "bxgy";
const CART_LINE_BUDGET: usize = 25;
const SUPPORTED_ENVELOPE_VERSION: f64 = 1.0;
const PRODUCT_GID_PREFIX: &str = "gid://shopify/Product/";
const VARIANT_GID_PREFIX: &str = "gid://shopify/ProductVariant/";
const PERCENT_DECIMALS_SCALE: f64 = 1e6;

pub struct LineData {
    pub campaign: String,
    pub bundle: String,
    pub role: Option<Role>,
    pub unit_quantity: i64,
}

#[derive(Clone, Copy, PartialEq)]
pub enum Role {
    Trigger,
    Reward,
}

struct Campaign<'a> {
    config: &'a JsonValue,
    used_sets: i64,
    trigger_items_by_product: Option<HashMap<String, Vec<usize>>>,
    reward_items_by_product: Option<HashMap<String, Vec<usize>>>,
}

pub struct BxgyState<'a> {
    campaigns_by_id: HashMap<String, Campaign<'a>>,
    processed_lines: usize,
}

struct Fact<'a> {
    role: Role,
    cart_line_id: &'a str,
    unit_quantity: i64,
    cart_quantity: i64,
    quantity: i64,
    unit_cents: f64,
    product_gid: &'a str,
}

struct Unit {
    unit_cents: f64,
    quantity: i64,
}

impl<'a> BxgyState<'a> {
    pub fn new(envelope: Option<&'a JsonValue>) -> Self {
        let mut campaigns_by_id = HashMap::new();
        let version = get(envelope, "version");
        let is_supported = matches!(version, Some(JsonValue::Number(number)) if *number == SUPPORTED_ENVELOPE_VERSION);

        if is_supported {
            for config in as_array(get(envelope, "campaigns")) {
                let id = to_text_or_empty(get(Some(config), "id"));
                if id.is_empty() {
                    continue;
                }
                campaigns_by_id.insert(
                    id,
                    Campaign {
                        config,
                        used_sets: 0,
                        trigger_items_by_product: None,
                        reward_items_by_product: None,
                    },
                );
            }
        }

        BxgyState {
            campaigns_by_id,
            processed_lines: 0,
        }
    }
}

pub fn read_line_data(raw: &str) -> Option<LineData> {
    let parsed: serde_json::Value = serde_json::from_str(raw).ok()?;
    if !parsed.is_object() || parsed.get("type").and_then(|value| value.as_str()) != Some(TYPE) {
        return None;
    }

    let parsed = Some(&parsed);
    let role = match get_json(parsed, "role").and_then(|value| value.as_str()) {
        Some("trigger") => Some(Role::Trigger),
        Some("reward") => Some(Role::Reward),
        _ => None,
    };
    let unit_quantity = json_to_number(get_json(parsed, "qty"));

    Some(LineData {
        campaign: json_to_text_or_empty(get_json(parsed, "campaign")),
        bundle: json_to_text_or_empty(get_json(parsed, "bundle")),
        role,
        unit_quantity: if unit_quantity.is_finite() {
            unit_quantity.floor() as i64
        } else {
            0
        },
    })
}

pub fn run(
    lines: &[(&Lines, &LineData)],
    state: &mut BxgyState,
    today: &str,
    presentment_rate: f64,
) -> Option<schema::LinesMergeOperation> {
    if state.processed_lines + lines.len() > CART_LINE_BUDGET {
        return None;
    }
    state.processed_lines += lines.len();

    let first_data = lines[0].1;
    if first_data.campaign.is_empty() || first_data.role.is_none() {
        return None;
    }
    let campaign_id = first_data.campaign.as_str();
    let bundle_id = first_data.bundle.as_str();

    let mut facts: Vec<Fact> = Vec::with_capacity(lines.len());
    for (line, data) in lines {
        let role = data.role?;
        if data.campaign.is_empty() || data.campaign != campaign_id {
            return None;
        }
        if line.selling_plan_allocation().is_some() || line.parent_relationship().is_some() {
            return None;
        }
        let Merchandise::ProductVariant(variant) = line.merchandise() else {
            return None;
        };

        let amount = line.cost().amount_per_quantity().amount().as_f64();
        facts.push(Fact {
            role,
            cart_line_id: line.id(),
            unit_quantity: data.unit_quantity,
            cart_quantity: *line.quantity() as i64,
            quantity: 0,
            unit_cents: js_round(if amount.is_nan() { 0.0 } else { amount } * 100.0),
            product_gid: variant.product().id(),
        });
    }

    let campaign = state.campaigns_by_id.get_mut(campaign_id)?;
    let config = Some(campaign.config);

    let parent_variant_id = to_numeric_id(
        get(config, "parentProduct").and_then(|parent| get(Some(parent), "variantId")),
    );
    if parent_variant_id == 0 {
        return None;
    }

    let schedule = get(config, "schedule");
    if is_truthy(get(schedule, "enabled")) && today.is_empty() {
        return None;
    }
    if !within_schedule(schedule, today) {
        return None;
    }

    let multiplier = bundle_multiplier(&facts);
    let trigger_items = as_array(get(get(config, "trigger"), "items"));
    let reward_items = as_array(get(get(config, "reward"), "items"));
    let mut trigger_units: Vec<Vec<usize>> = vec![Vec::new(); trigger_items.len()];
    let mut reward_units: Vec<Vec<usize>> = vec![Vec::new(); reward_items.len()];
    let mut subtotal_cents = 0.0;

    for (fact_index, fact) in facts.iter_mut().enumerate() {
        fact.quantity = fact.cart_quantity / multiplier;
        if fact.quantity <= 0 {
            return None;
        }

        let items_by_product = match fact.role {
            Role::Trigger => campaign
                .trigger_items_by_product
                .get_or_insert_with(|| index_items_by_product(trigger_items)),
            Role::Reward => campaign
                .reward_items_by_product
                .get_or_insert_with(|| index_items_by_product(reward_items)),
        };
        let item_indexes = items_by_product.get(fact.product_gid)?;
        if item_indexes.len() > 1 {
            return None;
        }
        let item_index = item_indexes[0];

        match fact.role {
            Role::Trigger => trigger_units[item_index].push(fact_index),
            Role::Reward => reward_units[item_index].push(fact_index),
        }
        subtotal_cents += fact.unit_cents * fact.cart_quantity as f64;
    }

    let rate = if presentment_rate.is_finite() && presentment_rate > 0.0 {
        presentment_rate
    } else {
        1.0
    };
    if !trigger_qualifies(
        get(config, "trigger"),
        trigger_items,
        &trigger_units,
        &facts,
        rate,
    ) {
        return None;
    }

    let reward = get(config, "reward");
    let reward_cents = reward_cents_per_set(reward, reward_items, &reward_units, &facts);
    if reward_cents <= 0.0 {
        return None;
    }

    let sets = allowed_sets(config, campaign.used_sets, multiplier);
    if sets <= 0 {
        return None;
    }

    let discount_per_set = discount_cents_per_set(get(reward, "discountOffer"), reward_cents, rate);
    let discount_cents = discount_per_set * sets as f64;
    let percent = percentage_decrease(subtotal_cents, discount_cents);

    campaign.used_sets += sets;

    let cart_lines = facts
        .iter()
        .map(|fact| schema::CartLineInput {
            cart_line_id: fact.cart_line_id.to_string(),
            quantity: fact.quantity as i32,
        })
        .collect();

    let summary = format!(
        r#"{{"type":"{}","campaign":{},"bundle":{},"lines":{}}}"#,
        TYPE,
        serde_json::Value::from(campaign_id),
        serde_json::Value::from(bundle_id),
        facts.len()
    );
    let price = if percent > 0.0 {
        Some(schema::PriceAdjustment {
            percentage_decrease: Some(schema::PriceAdjustmentValue {
                value: Decimal(percent),
            }),
        })
    } else {
        None
    };

    Some(schema::LinesMergeOperation {
        parent_variant_id: format!(
            "{}{}",
            VARIANT_GID_PREFIX,
            number_to_text(parent_variant_id as f64)
        ),
        cart_lines,
        price,
        attributes: Some(vec![
            schema::AttributeOutput {
                key: "_cro_bundle".to_string(),
                value: bundle_id.to_string(),
            },
            schema::AttributeOutput {
                key: "_cro_data".to_string(),
                value: summary,
            },
        ]),
        image: None,
        title: None,
    })
}

fn to_numeric_id(value: Option<&JsonValue>) -> i64 {
    let number = match value {
        Some(JsonValue::Number(number)) => *number,
        _ => {
            let text = to_text_or_empty(value);
            let tail = match text.rfind('/') {
                Some(position) => &text[position + 1..],
                None => text.as_str(),
            };
            number_from_text(tail)
        }
    };
    let is_safe_integer =
        number.is_finite() && number.fract() == 0.0 && number.abs() <= 9_007_199_254_740_991.0;
    if is_safe_integer && number > 0.0 {
        number as i64
    } else {
        0
    }
}

fn positive_integer(value: Option<&JsonValue>) -> i64 {
    let number = to_number(value).floor();
    if number.is_finite() && number > 0.0 {
        number as i64
    } else {
        0
    }
}

fn date_prefix(value: Option<&JsonValue>) -> Option<String> {
    if !is_truthy(value) {
        return None;
    }
    Some(to_text_or_empty(value).chars().take(10).collect())
}

fn within_schedule(schedule: Option<&JsonValue>, today: &str) -> bool {
    let is_disabled = matches!(get(schedule, "enabled"), Some(JsonValue::Boolean(false)));
    if !is_truthy(schedule) || is_disabled || today.is_empty() {
        return true;
    }
    if let Some(start) = date_prefix(get(schedule, "startsAt")) {
        if today < start.as_str() {
            return false;
        }
    }
    if let Some(end) = date_prefix(get(schedule, "endsAt")) {
        if today > end.as_str() {
            return false;
        }
    }
    true
}

fn bundle_multiplier(facts: &[Fact]) -> i64 {
    let mut multiplier = 0;

    for fact in facts {
        if fact.unit_quantity <= 0 || fact.cart_quantity <= 0 {
            return 1;
        }
        if fact.cart_quantity % fact.unit_quantity != 0 {
            return 1;
        }

        let factor = fact.cart_quantity / fact.unit_quantity;
        if multiplier != 0 && factor != multiplier {
            return 1;
        }
        multiplier = factor;
    }

    if multiplier == 0 {
        1
    } else {
        multiplier
    }
}

fn index_items_by_product(items: &[JsonValue]) -> HashMap<String, Vec<usize>> {
    let mut items_by_product: HashMap<String, Vec<usize>> = HashMap::new();
    for (index, item) in items.iter().enumerate() {
        let product_gid = format!(
            "{}{}",
            PRODUCT_GID_PREFIX,
            to_numeric_id(get(Some(item), "productId"))
        );
        items_by_product.entry(product_gid).or_default().push(index);
    }
    items_by_product
}

fn to_presentment_cents(amount: Option<&JsonValue>, rate: f64) -> f64 {
    let number = to_number(amount);
    let amount = if number.is_nan() || number == 0.0 {
        0.0
    } else {
        number
    };
    js_round(js_round(amount * 100.0) * rate)
}

fn count_of(fact_indexes: &[usize], facts: &[Fact]) -> i64 {
    fact_indexes
        .iter()
        .map(|index| facts[*index].quantity)
        .sum()
}

fn trigger_qualifies(
    trigger: Option<&JsonValue>,
    items: &[JsonValue],
    trigger_units: &[Vec<usize>],
    facts: &[Fact],
    rate: f64,
) -> bool {
    let trigger_type = match get(trigger, "type") {
        Some(JsonValue::String(text)) => text.as_str(),
        _ => "",
    };

    match trigger_type {
        "fixed" => {
            if items.is_empty() {
                return false;
            }
            items.iter().enumerate().all(|(index, item)| {
                count_of(&trigger_units[index], facts)
                    >= positive_integer(get(Some(item), "quantity"))
            })
        }
        "mixMatch" => {
            let units: i64 = trigger_units
                .iter()
                .map(|fact_indexes| count_of(fact_indexes, facts))
                .sum();
            units >= positive_integer(get(trigger, "minQuantity")).max(1)
        }
        "spend" => {
            let spent_cents: f64 = trigger_units
                .iter()
                .flatten()
                .map(|index| facts[*index].unit_cents * facts[*index].quantity as f64)
                .sum();
            spent_cents >= to_presentment_cents(get(trigger, "minAmount"), rate).max(1.0)
        }
        _ => false,
    }
}

fn cheapest_first(fact_indexes: &[usize], facts: &[Fact]) -> Vec<Unit> {
    let mut units: Vec<Unit> = fact_indexes
        .iter()
        .map(|index| Unit {
            unit_cents: facts[*index].unit_cents,
            quantity: facts[*index].quantity,
        })
        .collect();
    units.sort_by(|left, right| left.unit_cents.total_cmp(&right.unit_cents));
    units
}

fn cheapest_cents(mut units: Vec<Unit>, limit: i64) -> (f64, i64) {
    units.sort_by(|left, right| left.unit_cents.total_cmp(&right.unit_cents));
    let mut remaining = limit;
    let mut cents = 0.0;
    for unit in units {
        if remaining <= 0 {
            break;
        }
        let quantity = unit.quantity.min(remaining);
        cents += unit.unit_cents * quantity as f64;
        remaining -= quantity;
    }
    (cents, limit - remaining)
}

fn reward_cents_per_set(
    reward: Option<&JsonValue>,
    items: &[JsonValue],
    reward_units: &[Vec<usize>],
    facts: &[Fact],
) -> f64 {
    let reward_type = match get(reward, "type") {
        Some(JsonValue::String(text)) => text.as_str(),
        _ => "",
    };

    match reward_type {
        "fixed" => {
            let mut total = 0.0;
            for (index, item) in items.iter().enumerate() {
                let required = positive_integer(get(Some(item), "quantity"));
                if required == 0 {
                    return 0.0;
                }
                let (cents, count) =
                    cheapest_cents(cheapest_first(&reward_units[index], facts), required);
                if count < required {
                    return 0.0;
                }
                total += cents;
            }
            total
        }
        "mixMatch" => {
            let mut eligible = Vec::new();
            for (index, item) in items.iter().enumerate() {
                let mut remaining = positive_integer(get(Some(item), "quantity"));
                for unit in cheapest_first(&reward_units[index], facts) {
                    if remaining <= 0 {
                        break;
                    }
                    let quantity = unit.quantity.min(remaining);
                    eligible.push(Unit {
                        unit_cents: unit.unit_cents,
                        quantity,
                    });
                    remaining -= quantity;
                }
            }
            cheapest_cents(eligible, positive_integer(get(reward, "maxQuantity"))).0
        }
        _ => 0.0,
    }
}

fn discount_cents_per_set(discount_offer: Option<&JsonValue>, reward_cents: f64, rate: f64) -> f64 {
    let value = to_number(get(discount_offer, "value"));
    if !value.is_finite() || value <= 0.0 {
        return 0.0;
    }

    match get(discount_offer, "type") {
        Some(JsonValue::String(text)) if text == "percentage" => {
            js_round(reward_cents * (value.min(100.0) / 100.0))
        }
        Some(JsonValue::String(text)) if text == "fixedAmount" => {
            to_presentment_cents(get(discount_offer, "value"), rate).min(reward_cents)
        }
        _ => 0.0,
    }
}

fn allowed_sets(config: Option<&JsonValue>, used_sets: i64, multiplier: i64) -> i64 {
    let repeat_limit = get(config, "repeatLimit");
    if !matches!(get(repeat_limit, "enabled"), Some(JsonValue::Boolean(true))) {
        return multiplier;
    }
    let remaining = positive_integer(get(repeat_limit, "max")) - used_sets;
    multiplier.min(remaining).max(0)
}

fn percentage_decrease(subtotal_cents: f64, discount_cents: f64) -> f64 {
    if subtotal_cents <= 0.0 || discount_cents <= 0.0 {
        return 0.0;
    }
    let percent = (discount_cents.min(subtotal_cents) / subtotal_cents) * 100.0;
    (percent * PERCENT_DECIMALS_SCALE)
        .ceil()
        .min(100.0 * PERCENT_DECIMALS_SCALE)
        / PERCENT_DECIMALS_SCALE
}
