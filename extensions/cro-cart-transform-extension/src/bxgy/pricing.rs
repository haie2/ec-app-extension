use super::Fact;
use crate::common::js_value::{as_array, get, js_round, to_number};
use shopify_function::prelude::*;

const PERCENT_DECIMALS_SCALE: f64 = 1e6;

struct Unit {
    unit_cents: f64,
    quantity: i64,
}

fn positive_integer(value: Option<&JsonValue>) -> i64 {
    let number = to_number(value).floor();
    if number.is_finite() && number > 0.0 {
        number as i64
    } else {
        0
    }
}

fn to_presentment_cents(amount: Option<&JsonValue>, rate: f64) -> f64 {
    let number = to_number(amount);
    let amount = if number.is_nan() { 0.0 } else { number };
    js_round(js_round(amount * 100.0) * rate)
}

fn type_of(value: Option<&JsonValue>) -> &str {
    match get(value, "type") {
        Some(JsonValue::String(text)) => text.as_str(),
        _ => "",
    }
}

fn count_of(fact_indexes: &[usize], facts: &[Fact]) -> i64 {
    fact_indexes
        .iter()
        .map(|index| facts[*index].quantity)
        .sum()
}

pub(super) fn trigger_qualifies(
    trigger: Option<&JsonValue>,
    trigger_units: &[Vec<usize>],
    facts: &[Fact],
    rate: f64,
) -> bool {
    let items = as_array(get(trigger, "items"));

    match type_of(trigger) {
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

pub(super) fn reward_cents_per_set(
    reward: Option<&JsonValue>,
    reward_units: &[Vec<usize>],
    facts: &[Fact],
) -> f64 {
    let items = as_array(get(reward, "items"));

    match type_of(reward) {
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

pub(super) fn discount_cents_per_set(
    discount_offer: Option<&JsonValue>,
    reward_cents: f64,
    rate: f64,
) -> f64 {
    let value = to_number(get(discount_offer, "value"));
    if !value.is_finite() || value <= 0.0 {
        return 0.0;
    }

    match type_of(discount_offer) {
        "percentage" => js_round(reward_cents * (value.min(100.0) / 100.0)),
        "fixedAmount" => to_presentment_cents(get(discount_offer, "value"), rate).min(reward_cents),
        _ => 0.0,
    }
}

pub(super) fn allowed_sets(config: Option<&JsonValue>, used_sets: i64, multiplier: i64) -> i64 {
    let repeat_limit = get(config, "repeatLimit");
    if !matches!(get(repeat_limit, "enabled"), Some(JsonValue::Boolean(true))) {
        return multiplier;
    }
    let remaining = positive_integer(get(repeat_limit, "max")) - used_sets;
    multiplier.min(remaining).max(0)
}

pub(super) fn percentage_decrease(subtotal_cents: f64, discount_cents: f64) -> f64 {
    if subtotal_cents <= 0.0 || discount_cents <= 0.0 {
        return 0.0;
    }
    let percent = (discount_cents.min(subtotal_cents) / subtotal_cents) * 100.0;
    (percent * PERCENT_DECIMALS_SCALE)
        .ceil()
        .min(100.0 * PERCENT_DECIMALS_SCALE)
        / PERCENT_DECIMALS_SCALE
}
