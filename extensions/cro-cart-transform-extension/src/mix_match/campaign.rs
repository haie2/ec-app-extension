use super::eligibility::Buyer;
use crate::common::js_value::{as_array, get, is_truthy, to_text_or_empty};
use crate::schema::cart_transform_run::CartTransformRunInput;
use shopify_function::prelude::*;
use std::cell::OnceCell;
use std::collections::HashMap;

pub struct MixMatchState<'a> {
    pub(super) bundles_by_id: HashMap<String, &'a JsonValue>,
    input: &'a CartTransformRunInput,
    buyer: OnceCell<Buyer<'a>>,
}

impl<'a> MixMatchState<'a> {
    /// The envelope is `{ version, collectionIds, tags, customerTags, bundles }`
    /// and each bundle holds its settings flat, so the map value IS the config.
    /// The other top-level keys only feed the input query variables.
    pub fn new(input: &'a CartTransformRunInput) -> Self {
        let envelope = input
            .cart_transform()
            .mix_match()
            .map(|metafield| metafield.json_value());
        let mut bundles_by_id = HashMap::new();
        for bundle in as_array(get(envelope, "bundles")) {
            let id = get(Some(bundle), "id");
            if is_truthy(id) {
                bundles_by_id.insert(to_text_or_empty(id), bundle);
            }
        }

        MixMatchState {
            bundles_by_id,
            input,
            buyer: OnceCell::new(),
        }
    }

    /// Read only once a bundle's campaign is found: the customer's tags are not
    /// worth reading for a cart whose bundles are no longer active.
    pub(super) fn buyer(&self) -> &Buyer<'a> {
        self.buyer.get_or_init(|| Buyer::new(self.input))
    }
}

/// Shopify ids in the metafield are stored as their numeric tail only, to stay
/// under the 10 kB limit, so both sides are compared by tail.
pub(super) fn id_tail(id: &str) -> &str {
    match id.rfind('/') {
        Some(position) => &id[position + 1..],
        None => id,
    }
}

pub(super) fn numeric_id(value: Option<&JsonValue>) -> String {
    id_tail(&to_text_or_empty(value)).to_string()
}

fn date_prefix(value: Option<&JsonValue>) -> Option<String> {
    if !is_truthy(value) {
        return None;
    }
    Some(to_text_or_empty(value).chars().take(10).collect())
}

/// Fails CLOSED on a missing `today`, unlike BXGY's schedule: Mix & Match lines
/// are real variants Shopify already priced, so skipping only means full price.
pub(super) fn within_date_range(
    starts_at: Option<&JsonValue>,
    ends_at: Option<&JsonValue>,
    today: &str,
) -> bool {
    if today.is_empty() {
        return false;
    }
    if let Some(start) = date_prefix(starts_at) {
        if today < start.as_str() {
            return false;
        }
    }
    if let Some(end) = date_prefix(ends_at) {
        if today > end.as_str() {
            return false;
        }
    }
    true
}

/// Mirrors the widget's group-id contract: `group.id ?? "group-" + index`.
/// A repeated id keeps its first position and the later group, like a JS `Map`.
pub(super) fn index_groups(config: Option<&JsonValue>) -> Vec<(String, &JsonValue)> {
    let mut groups: Vec<(String, &JsonValue)> = Vec::new();
    for (index, group) in as_array(get(config, "groups")).iter().enumerate() {
        let id = match get(Some(group), "id") {
            None | Some(JsonValue::Null) => format!("group-{}", index),
            id => to_text_or_empty(id),
        };
        match groups.iter_mut().find(|(known_id, _)| *known_id == id) {
            Some(entry) => entry.1 = group,
            None => groups.push((id, group)),
        }
    }
    groups
}
