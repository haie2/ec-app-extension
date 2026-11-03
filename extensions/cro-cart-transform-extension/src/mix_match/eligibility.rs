use crate::common::js_value::{as_array, get, is_truthy};
use crate::schema::cart_transform_run::CartTransformRunInput;
use shopify_function::prelude::*;

pub(super) struct Buyer<'a> {
    is_authenticated: bool,
    /// None for a guest — distinct from 0, an authenticated customer with no
    /// orders yet ("new").
    number_of_orders: Option<i64>,
    /// The customer's tags among the `$customerTags` union of every tagged-scope
    /// bundle; each bundle still checks its own required list against it.
    customer_tags: Vec<&'a str>,
    country_iso_code: &'a str,
}

impl<'a> Buyer<'a> {
    pub(super) fn new(input: &'a CartTransformRunInput) -> Self {
        let buyer_identity = input.cart().buyer_identity();
        let customer = buyer_identity.and_then(|identity| identity.customer());
        let customer_tags = customer
            .map(|customer| {
                customer
                    .has_tags()
                    .iter()
                    .filter(|entry| *entry.has_tag())
                    .map(|entry| entry.tag().as_str())
                    .collect()
            })
            .unwrap_or_default();

        Buyer {
            is_authenticated: buyer_identity
                .map(|identity| *identity.is_authenticated())
                .unwrap_or(false),
            number_of_orders: customer.map(|customer| *customer.number_of_orders() as i64),
            customer_tags,
            country_iso_code: input.localization().country().iso_code(),
        }
    }

    /// A guest is never "new": its order count cannot be told apart from a
    /// real miss, so that case fails closed.
    pub(super) fn is_eligible(&self, eligibility: Option<&JsonValue>) -> bool {
        if !is_truthy(eligibility) {
            return true;
        }

        let scope = match get(eligibility, "customerScope") {
            Some(JsonValue::String(scope)) => scope.as_str(),
            _ => "",
        };
        match scope {
            "logged_in" if !self.is_authenticated => return false,
            "new" if self.number_of_orders != Some(0) => return false,
            "tagged" => {
                let required = as_array(get(eligibility, "customerTags"));
                let has_required_tag = required.iter().any(|tag| {
                    matches!(tag, JsonValue::String(tag) if self.customer_tags.contains(&tag.as_str()))
                });
                if !required.is_empty() && !has_required_tag {
                    return false;
                }
            }
            _ => {}
        }

        let countries = as_array(get(eligibility, "countries"));
        let in_country = countries.iter().any(|country| {
            matches!(country, JsonValue::String(country) if country == self.country_iso_code)
        });
        countries.is_empty() || in_country
    }
}
