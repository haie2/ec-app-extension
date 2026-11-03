use super::campaign::{id_tail, numeric_id};
use super::{Fact, Totals, CURRENT_PRODUCT_GROUP_ID, FREE_GIFT_GROUP_ID};
use crate::common::js_value::{as_array, get, is_truthy, to_number, to_text_or_empty};
use shopify_function::prelude::*;

const KNOWN_GROUP_ITEM_TYPES: [&str; 5] =
    ["product", "collection", "vendor", "product_type", "tag"];

/// An item type this version does not recognise was written by a newer cro-hub
/// than the deployed extension. Nothing on the line can be compared to it, so
/// the whole bundle is skipped rather than discounting lines it cannot verify.
pub(super) fn every_line_belongs(
    facts: &[Fact],
    groups: &[(String, &JsonValue)],
    discount: Option<&JsonValue>,
) -> bool {
    let is_free_method =
        matches!(get(discount, "method"), Some(JsonValue::String(method)) if method == "free");
    let free_product = if is_free_method {
        get(discount, "freeProduct")
    } else {
        None
    };
    let gift_product_id = numeric_id(get(free_product, "id"));
    let gift_variant_ids: Vec<String> = as_array(get(free_product, "variantIds"))
        .iter()
        .map(|variant_id| numeric_id(Some(variant_id)))
        .collect();
    let mut gift_lines = 0;

    for fact in facts {
        let product_id = id_tail(fact.variant.product().id());
        if fact.group_id == CURRENT_PRODUCT_GROUP_ID {
            continue;
        }
        if fact.group_id == FREE_GIFT_GROUP_ID {
            gift_lines += 1;
            let variant_id = id_tail(fact.variant.id());
            let is_gift_variant = !gift_product_id.is_empty()
                && product_id == gift_product_id
                && (gift_variant_ids.is_empty()
                    || gift_variant_ids.iter().any(|id| id == variant_id));
            if !is_gift_variant || fact.quantity != 1 || gift_lines > 1 {
                return false;
            }
            continue;
        }

        let Some((_, group)) = groups.iter().find(|(id, _)| id == fact.group_id) else {
            return false;
        };
        if is_excluded(group, product_id) {
            return false;
        }

        let items = as_array(get(Some(group), "items"));
        if items
            .iter()
            .any(|item| !KNOWN_GROUP_ITEM_TYPES.contains(&item_type(item)))
        {
            return false;
        }
        if !items.iter().any(|item| matches_group_item(item, fact)) {
            return false;
        }
    }

    true
}

/// Per-group Min/Max over EVERY configured group: an empty group still has to
/// reach its own minimum, which stops a partial bundle earning the discount.
pub(super) fn groups_within_limits(totals: &Totals, groups: &[(String, &JsonValue)]) -> bool {
    groups.iter().all(|(id, group)| {
        let quantity = totals
            .quantity_by_group
            .get(id.as_str())
            .copied()
            .unwrap_or(0) as f64;
        let min = number_or_zero(get(Some(group), "min")).floor();
        if quantity < min {
            return false;
        }

        match get(Some(group), "max") {
            None | Some(JsonValue::Null) => true,
            max => {
                let max = to_number(max).floor();
                !(max.is_finite() && quantity > max)
            }
        }
    })
}

fn number_or_zero(value: Option<&JsonValue>) -> f64 {
    let number = to_number(value);
    if number.is_nan() {
        0.0
    } else {
        number
    }
}

fn item_type(item: &JsonValue) -> &str {
    match get(Some(item), "t") {
        Some(JsonValue::String(item_type)) => item_type.as_str(),
        _ => "",
    }
}

fn matches_group_item(item: &JsonValue, fact: &Fact) -> bool {
    let product = fact.variant.product();
    let item_id = || numeric_id(get(Some(item), "id"));

    match item_type(item) {
        "product" => item_id() == id_tail(product.id()),
        "collection" => {
            let collection_id = item_id();
            fact.variant.in_collections().iter().any(|membership| {
                *membership.is_member() && id_tail(membership.collection_id()) == collection_id
            })
        }
        "vendor" => has_candidate(item, product.vendor().map_or("", String::as_str)),
        "product_type" => has_candidate(item, product.product_type().map_or("", String::as_str)),
        "tag" => product
            .has_tags()
            .iter()
            .any(|response| *response.has_tag() && has_candidate(item, response.tag())),
        _ => false,
    }
}

/// Candidates are compared as JS `String(value)`, so a null candidate is "null".
fn has_candidate(item: &JsonValue, value: &str) -> bool {
    as_array(get(Some(item), "v"))
        .iter()
        .any(|candidate| match candidate {
            JsonValue::Null => value == "null",
            candidate => to_text_or_empty(Some(candidate)) == value,
        })
}

fn is_excluded(group: &JsonValue, product_id: &str) -> bool {
    as_array(get(Some(group), "excludeProducts"))
        .iter()
        .any(|entry| {
            !is_truthy(get(Some(entry), "variantId"))
                && numeric_id(get(Some(entry), "id")) == product_id
        })
}
