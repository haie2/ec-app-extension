use super::{Fact, Totals};
use crate::common::js_value::{as_array, get, is_truthy, js_round, to_number};
use shopify_function::prelude::*;

/// `Number(value) || 0`.
fn number_or_zero(value: Option<&JsonValue>) -> f64 {
    let number = to_number(value);
    if number.is_nan() {
        0.0
    } else {
        number
    }
}

fn text_of<'a>(value: Option<&'a JsonValue>, key: &str) -> &'a str {
    match get(value, key) {
        Some(JsonValue::String(text)) => text.as_str(),
        _ => "",
    }
}

/// Every method defaults to 0 until the merchant types a number, and a method
/// left at its default applies NOTHING rather than its degenerate case (a $0
/// bundle price giving the bundle away). Mirrors `isConfiguredAmount` in the widget.
fn is_configured(value: Option<&JsonValue>) -> bool {
    let amount = to_number(value);
    amount.is_finite() && amount > 0.0
}

/// Config money is plain units in the SHOP currency; cart money is cents in
/// the PRESENTMENT currency. Rounded once, as the widget does.
fn to_presentment_cents(amount: Option<&JsonValue>, rate: f64) -> f64 {
    js_round(number_or_zero(amount) * 100.0 * rate)
}

fn to_shop_units(cents: f64, rate: f64) -> f64 {
    cents / 100.0 / rate
}

fn clamp_to_subtotal(cents: f64, subtotal_cents: f64) -> f64 {
    cents.max(0.0).min(subtotal_cents)
}

/// "Cheapest item" by quantity needs 2+ items so one stays at full price.
fn quantity_minimum_to_qualify(discount: Option<&JsonValue>) -> f64 {
    let minimum = number_or_zero(get(discount, "minValue"));
    if text_of(discount, "method") == "cheapest" {
        minimum.max(2.0)
    } else {
        minimum
    }
}

/// Units the bundle must hold before "cheapest" applies, so the single cheapest
/// one never discounts itself. Only an amount minimum asks for it.
fn cheapest_minimum_items(discount: Option<&JsonValue>) -> f64 {
    if text_of(discount, "minBasis") != "amount" {
        return 2.0;
    }
    let minimum = to_number(get(discount, "minQtyInBundle"));
    let minimum = if minimum.is_nan() || minimum == 0.0 {
        2.0
    } else {
        minimum
    };
    minimum.floor().max(2.0)
}

/// Highest tier the metric has reached; on a tie the earlier tier wins, like
/// the widget's stable sort.
fn qualifying_tier(tiers: &[JsonValue], metric: f64) -> Option<&JsonValue> {
    let mut best: Option<(&JsonValue, f64)> = None;
    for tier in tiers {
        let at = number_or_zero(get(Some(tier), "at"));
        if metric < at {
            continue;
        }
        if best.is_none_or(|(_, best_at)| at > best_at) {
            best = Some((tier, at));
        }
    }
    best.map(|(tier, _)| tier)
}

/// Discount in presentment cents. This MUST agree with `computeDiscount` in
/// CroMixMatchBundleWidget.js: that one shows the shopper a number, this one is
/// what they are charged.
pub(super) fn discount_cents(
    discount: Option<&JsonValue>,
    facts: &[Fact],
    totals: &Totals,
    rate: f64,
) -> f64 {
    if !is_truthy(discount) {
        return 0.0;
    }
    let subtotal_cents = totals.subtotal_cents;
    let total_quantity = totals.total_quantity as f64;

    if text_of(discount, "method") == "tiers" {
        let metric = if text_of(discount, "tierBasis") == "total_amount" {
            to_shop_units(totals.items_subtotal_cents, rate)
        } else {
            total_quantity
        };
        let Some(tier) = qualifying_tier(as_array(get(discount, "tiers")), metric) else {
            return 0.0;
        };
        let amount = if text_of(Some(tier), "t") == "percentage" {
            js_round(subtotal_cents * number_or_zero(get(Some(tier), "v")) / 100.0)
        } else {
            to_presentment_cents(get(Some(tier), "v"), rate)
        };
        return clamp_to_subtotal(amount, subtotal_cents);
    }

    let qualifies = if text_of(discount, "minBasis") == "amount" {
        to_shop_units(totals.items_subtotal_cents, rate)
            >= number_or_zero(get(discount, "minValue"))
    } else {
        total_quantity >= quantity_minimum_to_qualify(discount)
    };
    if !qualifies {
        return 0.0;
    }

    match text_of(discount, "method") {
        "percentage" => {
            if !is_configured(get(discount, "pct")) {
                return 0.0;
            }
            let pct = to_number(get(discount, "pct"));
            clamp_to_subtotal(js_round(subtotal_cents * pct / 100.0), subtotal_cents)
        }
        "fixed" => {
            if !is_configured(get(discount, "fixed")) {
                return 0.0;
            }
            clamp_to_subtotal(
                to_presentment_cents(get(discount, "fixed"), rate),
                subtotal_cents,
            )
        }
        "bundle" => {
            if !is_configured(get(discount, "bundlePrice")) {
                return 0.0;
            }
            let bundle_cents = to_presentment_cents(get(discount, "bundlePrice"), rate);
            clamp_to_subtotal(subtotal_cents - bundle_cents, subtotal_cents)
        }
        // No gift line in the cart means nothing to give away, and an empty
        // bundle never earns it whatever the minimum.
        "free" => {
            if total_quantity <= 0.0 || totals.gift_cents <= 0.0 {
                return 0.0;
            }
            clamp_to_subtotal(totals.gift_cents, subtotal_cents)
        }
        "cheapest" => {
            if !is_configured(get(discount, "cheapPct")) {
                return 0.0;
            }
            if total_quantity < cheapest_minimum_items(discount) {
                return 0.0;
            }
            let cheapest_unit_cents = facts
                .iter()
                .map(|fact| fact.unit_cents)
                .fold(f64::INFINITY, f64::min);
            let cheap_pct = to_number(get(discount, "cheapPct"));
            clamp_to_subtotal(
                js_round(cheapest_unit_cents * cheap_pct / 100.0),
                subtotal_cents,
            )
        }
        _ => 0.0,
    }
}

/// `LinesMergeOperation.price` only takes a percentage, so every method is
/// re-expressed as a fraction of the bundle's real subtotal. Unlike BXGY this
/// is not rounded up; the caller prints it with six decimals.
pub(super) fn percentage_decrease(subtotal_cents: f64, discount_cents: f64) -> f64 {
    if subtotal_cents <= 0.0 || discount_cents <= 0.0 {
        return 0.0;
    }
    let percent = (discount_cents.min(subtotal_cents) / subtotal_cents) * 100.0;
    percent.clamp(0.0, 100.0)
}
