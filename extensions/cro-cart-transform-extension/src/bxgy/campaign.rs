use crate::common::js_value::{as_array, get, is_truthy, number_from_text, to_text_or_empty};
use shopify_function::prelude::*;
use std::collections::HashMap;

const SUPPORTED_ENVELOPE_VERSION: f64 = 1.0;
const PRODUCT_GID_PREFIX: &str = "gid://shopify/Product/";

#[derive(Clone, Copy)]
pub(super) enum Side {
    Trigger,
    Reward,
}

pub(super) struct Campaign<'a> {
    pub(super) config: &'a JsonValue,
    pub(super) used_sets: i64,
    trigger_items_by_product: Option<HashMap<String, Vec<usize>>>,
    reward_items_by_product: Option<HashMap<String, Vec<usize>>>,
}

pub struct BxgyState<'a> {
    pub(super) campaigns_by_id: HashMap<String, Campaign<'a>>,
    pub(super) processed_lines: usize,
}

impl<'a> BxgyState<'a> {
    pub fn new(envelope: Option<&'a JsonValue>) -> Self {
        let mut campaigns_by_id = HashMap::new();
        let is_supported = matches!(
            get(envelope, "version"),
            Some(JsonValue::Number(number)) if *number == SUPPORTED_ENVELOPE_VERSION
        );

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

impl Campaign<'_> {
    pub(super) fn items_by_product(&mut self, side: Side) -> (&HashMap<String, Vec<usize>>, usize) {
        let (key, cache) = match side {
            Side::Trigger => ("trigger", &mut self.trigger_items_by_product),
            Side::Reward => ("reward", &mut self.reward_items_by_product),
        };
        let items = as_array(get(get(Some(self.config), key), "items"));
        let index = cache.get_or_insert_with(|| index_items_by_product(items));
        (index, items.len())
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

pub(super) fn to_numeric_id(value: Option<&JsonValue>) -> i64 {
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

fn date_prefix(value: Option<&JsonValue>) -> Option<String> {
    if !is_truthy(value) {
        return None;
    }
    Some(to_text_or_empty(value).chars().take(10).collect())
}

pub(super) fn within_schedule(schedule: Option<&JsonValue>, today: &str) -> bool {
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
