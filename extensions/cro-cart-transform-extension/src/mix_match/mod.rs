//! Mix & Match is the opposite shape of BXGY: the widget adds one REAL cart
//! line per picked item at Shopify's own price, all tagged with the same
//! `bundle` instance id. Doing nothing is therefore safe — every failed check
//! leaves the lines at full price — and no price is ever read from a line
//! property, only from `cost.amountPerQuantity`.

pub mod campaign;
pub mod eligibility;
pub mod membership;
pub mod pricing;
#[cfg(test)]
mod tests;

pub use campaign::MixMatchState;

use crate::cart_transform_run::RunContext;
use crate::common::js_value::{get, get_json, js_round, json_to_number, json_to_text_or_empty};
use crate::common::line::{bundle_multiplier, mergeable_variant};
use crate::schema;
use crate::schema::cart_transform_run::cart_transform_run_input::cart::lines::merchandise::ProductVariant;
use crate::schema::cart_transform_run::cart_transform_run_input::cart::Lines;
use campaign::{index_groups, numeric_id, within_date_range};
use std::collections::HashMap;

pub const TYPE: &str = "mixMatch";
const VARIANT_GID_PREFIX: &str = "gid://shopify/ProductVariant/";

/// The product page's own product, when it belongs to no configured group.
const CURRENT_PRODUCT_GROUP_ID: &str = "current-product";

/// The "Free product" gift line: merged with the bundle but counted toward no
/// minimum or group Min/Max, and the discount is exactly its price.
const FREE_GIFT_GROUP_ID: &str = "free-gift";

/// `_cro_data` as written by `_buildCartLines` in CroMixMatchBundleWidget.js:
/// `{"type","campaign","bundle","group","qty"}`.
pub struct MixMatchLine {
    pub campaign: String,
    pub bundle: String,
    pub group: String,
    pub unit_quantity: i64,
}

struct Fact<'a> {
    cart_line_id: &'a str,
    variant: &'a ProductVariant,
    group_id: &'a str,
    quantity: i64,
    unit_cents: f64,
}

struct Totals<'a> {
    subtotal_cents: f64,
    /// Without the gift — what an amount minimum and an amount tier measure.
    items_subtotal_cents: f64,
    total_quantity: i64,
    quantity_by_group: HashMap<&'a str, i64>,
    gift_cents: f64,
}

pub fn read_line(parsed: &serde_json::Value) -> Option<MixMatchLine> {
    let parsed = Some(parsed);
    let campaign = json_to_text_or_empty(get_json(parsed, "campaign"));
    let bundle = json_to_text_or_empty(get_json(parsed, "bundle"));
    if campaign.is_empty() || bundle.is_empty() {
        return None;
    }
    let unit_quantity = json_to_number(get_json(parsed, "qty"));

    Some(MixMatchLine {
        campaign,
        bundle,
        group: json_to_text_or_empty(get_json(parsed, "group")),
        unit_quantity: if unit_quantity.is_finite() {
            unit_quantity.floor() as i64
        } else {
            0
        },
    })
}

pub fn run(
    lines: &[(&Lines, &MixMatchLine)],
    state: &MixMatchState,
    context: &RunContext,
) -> Option<schema::LinesMergeOperation> {
    let first_data = lines[0].1;
    let campaign_id = first_data.campaign.as_str();
    if lines.iter().any(|(_, data)| data.campaign != campaign_id) {
        return None;
    }

    let config = Some(*state.bundles_by_id.get(campaign_id)?);
    let parent_variant_id = numeric_id(get(get(config, "bundleParent"), "variantId"));
    if parent_variant_id.is_empty() {
        return None;
    }
    if !within_date_range(
        get(config, "startsAt"),
        get(config, "endsAt"),
        &context.today,
    ) {
        return None;
    }
    if !state.buyer().is_eligible(get(config, "eligibility")) {
        return None;
    }

    let mut variants = Vec::with_capacity(lines.len());
    for (line, _) in lines {
        variants.push(mergeable_variant(line)?);
    }

    // Raising the merged line to 3 multiplies every component by 3. The
    // discount and the group gates describe ONE set, and the merge names the
    // per-set quantity so Shopify keeps the parent at quantity 3.
    let multiplier = bundle_multiplier(
        lines
            .iter()
            .map(|(line, data)| (data.unit_quantity, *line.quantity() as i64)),
    );
    let (facts, totals) = read_facts(lines, &variants, multiplier);
    if facts.is_empty() {
        return None;
    }

    let groups = index_groups(config);
    let discount = get(config, "discount");
    if !membership::every_line_belongs(&facts, &groups, discount) {
        return None;
    }
    if !membership::groups_within_limits(&totals, &groups) {
        return None;
    }

    let rate = if context.presentment_rate.is_finite() && context.presentment_rate > 0.0 {
        context.presentment_rate
    } else {
        1.0
    };
    let discount_cents = pricing::discount_cents(discount, &facts, &totals, rate);
    let percent = pricing::percentage_decrease(totals.subtotal_cents, discount_cents);

    let cart_lines = facts
        .iter()
        .map(|fact| schema::CartLineInput {
            cart_line_id: fact.cart_line_id.to_string(),
            quantity: fact.quantity as i32,
        })
        .collect();
    // A bundle that earns no discount is still merged under its parent, with
    // the lines at Shopify's own prices.
    let price = if percent > 0.0 {
        Some(schema::PriceAdjustment {
            percentage_decrease: Some(schema::PriceAdjustmentValue {
                value: format!("{:.6}", percent),
            }),
        })
    } else {
        None
    };

    // No title/image: Shopify shows the campaign's own parent product. The
    // `_cro_bundle` attribute keeps two instances of an identical selection
    // from collapsing into one merged line of quantity 2.
    Some(schema::LinesMergeOperation {
        parent_variant_id: format!("{}{}", VARIANT_GID_PREFIX, parent_variant_id),
        cart_lines,
        price,
        attributes: Some(vec![schema::AttributeOutput {
            key: "_cro_bundle".to_string(),
            value: first_data.bundle.clone(),
        }]),
        image: None,
        title: None,
    })
}

fn read_facts<'a>(
    lines: &[(&'a Lines, &'a MixMatchLine)],
    variants: &[&'a ProductVariant],
    multiplier: i64,
) -> (Vec<Fact<'a>>, Totals<'a>) {
    let mut facts = Vec::with_capacity(lines.len());
    let mut totals = Totals {
        subtotal_cents: 0.0,
        items_subtotal_cents: 0.0,
        total_quantity: 0,
        quantity_by_group: HashMap::new(),
        gift_cents: 0.0,
    };

    for ((line, data), variant) in lines.iter().zip(variants) {
        let quantity = *line.quantity() as i64 / multiplier;
        // A 0-priced line (a free item the merchant put in a group) is still
        // part of the bundle; only a quantity-less line is meaningless.
        if quantity <= 0 {
            continue;
        }
        let amount = line.cost().amount_per_quantity().amount().as_f64();
        let unit_cents = js_round(if amount.is_nan() { 0.0 } else { amount } * 100.0);
        let group_id = data.group.as_str();
        let line_cents = unit_cents * quantity as f64;

        totals.subtotal_cents += line_cents;
        if group_id == FREE_GIFT_GROUP_ID {
            totals.gift_cents += line_cents;
        } else {
            totals.total_quantity += quantity;
            *totals.quantity_by_group.entry(group_id).or_insert(0) += quantity;
        }

        facts.push(Fact {
            cart_line_id: line.id(),
            variant,
            group_id,
            quantity,
            unit_cents,
        });
    }
    totals.items_subtotal_cents = totals.subtotal_cents - totals.gift_cents;

    (facts, totals)
}
