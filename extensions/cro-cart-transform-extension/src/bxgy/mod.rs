mod campaign;
mod pricing;
#[cfg(test)]
mod tests;

pub use campaign::BxgyState;

use crate::cart_transform_run::RunContext;
use crate::common::js_value::{
    get, get_json, is_truthy, js_round, json_to_number, json_to_text_or_empty, number_to_text,
};
use crate::common::line::{bundle_multiplier, mergeable_product_id};
use crate::schema;
use crate::schema::cart_transform_run::cart_transform_run_input::cart::Lines;
use campaign::{to_numeric_id, within_schedule};
use pricing::{
    allowed_sets, discount_cents_per_set, percentage_decrease, reward_cents_per_set,
    trigger_qualifies,
};

pub const TYPE: &str = "bxgy";
const CART_LINE_BUDGET: usize = 25;
const VARIANT_GID_PREFIX: &str = "gid://shopify/ProductVariant/";

pub struct BxgyLine {
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

struct Fact<'a> {
    role: Role,
    cart_line_id: &'a str,
    unit_quantity: i64,
    cart_quantity: i64,
    quantity: i64,
    unit_cents: f64,
    product_gid: &'a str,
}

pub fn read_line(parsed: &serde_json::Value) -> Option<BxgyLine> {
    let parsed = Some(parsed);
    let role = match get_json(parsed, "role").and_then(|value| value.as_str()) {
        Some("trigger") => Some(Role::Trigger),
        Some("reward") => Some(Role::Reward),
        _ => None,
    };
    let unit_quantity = json_to_number(get_json(parsed, "qty"));

    Some(BxgyLine {
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
    lines: &[(&Lines, &BxgyLine)],
    state: &mut BxgyState,
    context: &RunContext,
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
        let product_gid = mergeable_product_id(line)?;

        let amount = line.cost().amount_per_quantity().amount().as_f64();
        facts.push(Fact {
            role,
            cart_line_id: line.id(),
            unit_quantity: data.unit_quantity,
            cart_quantity: *line.quantity() as i64,
            quantity: 0,
            unit_cents: js_round(if amount.is_nan() { 0.0 } else { amount } * 100.0),
            product_gid,
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
    if is_truthy(get(schedule, "enabled")) && context.today.is_empty() {
        return None;
    }
    if !within_schedule(schedule, &context.today) {
        return None;
    }

    let multiplier = bundle_multiplier(
        facts
            .iter()
            .map(|fact| (fact.unit_quantity, fact.cart_quantity)),
    );
    let trigger = get(config, "trigger");
    let reward = get(config, "reward");
    let trigger_item_count = campaign.items_by_product(campaign::Side::Trigger).1;
    let reward_item_count = campaign.items_by_product(campaign::Side::Reward).1;
    let mut trigger_units: Vec<Vec<usize>> = vec![Vec::new(); trigger_item_count];
    let mut reward_units: Vec<Vec<usize>> = vec![Vec::new(); reward_item_count];
    let mut subtotal_cents = 0.0;

    for (fact_index, fact) in facts.iter_mut().enumerate() {
        fact.quantity = fact.cart_quantity / multiplier;
        if fact.quantity <= 0 {
            return None;
        }

        let side = match fact.role {
            Role::Trigger => campaign::Side::Trigger,
            Role::Reward => campaign::Side::Reward,
        };
        let item_indexes = campaign.items_by_product(side).0.get(fact.product_gid)?;
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

    let rate = if context.presentment_rate.is_finite() && context.presentment_rate > 0.0 {
        context.presentment_rate
    } else {
        1.0
    };
    if !trigger_qualifies(trigger, &trigger_units, &facts, rate) {
        return None;
    }

    let reward_cents = reward_cents_per_set(reward, &reward_units, &facts);
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
                value: format!("{:.6}", percent),
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
