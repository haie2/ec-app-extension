use crate::cart_transform_run::cart_transform_run;
use crate::schema;
use serde_json::{json, Value};
use shopify_function::run_function_with_input;

fn cro_data(campaign: &str, bundle: &str, group: &str, qty: i64) -> String {
    json!({ "type": "mixMatch", "campaign": campaign, "bundle": bundle, "group": group, "qty": qty })
        .to_string()
}

fn line(index: usize, price: f64) -> Value {
    json!({
        "id": format!("gid://shopify/CartLine/{}", index),
        "quantity": 1,
        "cost": { "amountPerQuantity": { "amount": format!("{:.2}", price) } },
        "croData": { "value": cro_data("campaign-1", "instance-1", "group-0", 1) },
        "merchandise": {
            "__typename": "ProductVariant",
            "id": format!("gid://shopify/ProductVariant/{}", index + 1),
            "product": {
                "id": format!("gid://shopify/Product/{}", index + 1),
                "vendor": "Acme",
                "productType": "Beauty",
                "hasTags": [],
            },
            "inCollections": [],
        },
        "sellingPlanAllocation": null,
        "parentRelationship": null,
    })
}

fn make_input(discount: Value) -> Value {
    let mut discount_settings = json!({ "minBasis": "qty", "minValue": 2 });
    for (key, value) in discount.as_object().unwrap() {
        discount_settings[key] = value.clone();
    }
    json!({
        "cart": {
            "buyerIdentity": null,
            "lines": [line(0, 10.0), line(1, 20.0), line(2, 30.0)],
        },
        "cartTransform": {
            "mixMatch": {
                "jsonValue": {
                    "bundles": [{
                        "id": "campaign-1",
                        "bundleParent": { "variantId": "999" },
                        "groups": [{ "id": "group-0", "min": 1, "max": 10, "items": [{ "t": "vendor", "v": ["Acme"] }] }],
                        "discount": discount_settings,
                        "eligibility": {},
                    }],
                },
            },
            "bxgy": null,
        },
        "presentmentCurrencyRate": "1",
        "localization": { "country": { "isoCode": "US" } },
        "shop": { "localTime": { "date": "2026-10-23" } },
    })
}

fn percentage() -> Value {
    json!({ "method": "percentage", "pct": 15 })
}

fn bundle_config(input: &mut Value) -> &mut Value {
    &mut input["cartTransform"]["mixMatch"]["jsonValue"]["bundles"][0]
}

fn run(input: &Value) -> schema::CartTransformRunResult {
    run_function_with_input(cart_transform_run, &input.to_string()).unwrap()
}

fn merges(result: &schema::CartTransformRunResult) -> Vec<&schema::LinesMergeOperation> {
    result
        .operations
        .iter()
        .map(|operation| match operation {
            schema::Operation::LinesMerge(merge) => merge,
            _ => panic!("expected only linesMerge operations"),
        })
        .collect()
}

fn merged_price(input: &Value) -> Option<String> {
    let result = run(input);
    let merges = merges(&result);
    assert_eq!(merges.len(), 1);
    merges[0]
        .price
        .as_ref()
        .and_then(|price| price.percentage_decrease.as_ref())
        .map(|value| value.value.clone())
}

fn assert_no_operations(input: &Value) {
    assert!(run(input).operations.is_empty());
}

#[test]
fn merges_preserve_parent_component_quantities_and_instance_identity() {
    let input = make_input(percentage());
    let result = run(&input);
    let merges = merges(&result);

    assert_eq!(merges.len(), 1);
    assert_eq!(
        merges[0].parent_variant_id,
        "gid://shopify/ProductVariant/999"
    );
    let cart_lines: Vec<(&str, i32)> = merges[0]
        .cart_lines
        .iter()
        .map(|entry| (entry.cart_line_id.as_str(), entry.quantity))
        .collect();
    assert_eq!(
        cart_lines,
        vec![
            ("gid://shopify/CartLine/0", 1),
            ("gid://shopify/CartLine/1", 1),
            ("gid://shopify/CartLine/2", 1),
        ]
    );
    assert_eq!(merged_price(&input).as_deref(), Some("15.000000"));
    let attributes = merges[0].attributes.as_ref().unwrap();
    assert_eq!(attributes.len(), 1);
    assert_eq!(attributes[0].key, "_cro_bundle");
    assert_eq!(attributes[0].value, "instance-1");
    assert!(merges[0].title.is_none() && merges[0].image.is_none());
}

#[test]
fn every_discount_method_keeps_its_arithmetic() {
    let cases = [
        (json!({ "method": "percentage", "pct": 15 }), "15.000000"),
        (json!({ "method": "fixed", "fixed": 12 }), "20.000000"),
        (
            json!({ "method": "bundle", "bundlePrice": 45 }),
            "25.000000",
        ),
        (json!({ "method": "cheapest", "cheapPct": 60 }), "10.000000"),
        (
            json!({ "method": "tiers", "tierBasis": "total_qty", "tiers": [
                { "at": 1, "t": "percentage", "v": 5 },
                { "at": 3, "t": "percentage", "v": 20 },
            ] }),
            "20.000000",
        ),
        (
            json!({ "method": "tiers", "tierBasis": "total_amount", "tiers": [
                { "at": 50, "t": "fixed", "v": 6 },
                { "at": 61, "t": "percentage", "v": 50 },
            ] }),
            "10.000000",
        ),
    ];
    for (discount, expected) in cases {
        assert_eq!(
            merged_price(&make_input(discount.clone())).as_deref(),
            Some(expected),
            "{}",
            discount
        );
    }
}

#[test]
fn a_percentage_that_is_not_round_is_printed_with_six_decimals_without_rounding_up() {
    let input = make_input(json!({ "method": "fixed", "fixed": 7 }));
    assert_eq!(merged_price(&input).as_deref(), Some("11.666667"));
}

#[test]
fn a_method_left_at_its_default_or_below_its_minimum_merges_without_a_price_change() {
    for discount in [
        json!({ "method": "fixed", "fixed": 0 }),
        json!({ "method": "bundle", "bundlePrice": 0 }),
        json!({ "method": "percentage", "pct": 15, "minValue": 4 }),
        json!({ "method": "percentage", "pct": 15, "minBasis": "amount", "minValue": 61 }),
        json!({ "method": "cheapest", "cheapPct": 60, "minBasis": "amount", "minValue": 0, "minQtyInBundle": 4 }),
        json!({ "method": "unknown" }),
    ] {
        assert_eq!(
            merged_price(&make_input(discount.clone())),
            None,
            "{}",
            discount
        );
    }
}

#[test]
fn free_gifts_merge_once_and_only_discount_the_gift() {
    let mut input =
        make_input(json!({ "method": "free", "freeProduct": { "id": "3", "variantIds": ["3"] } }));
    input["cart"]["lines"][2]["croData"]["value"] =
        json!(cro_data("campaign-1", "instance-1", "free-gift", 1));
    assert_eq!(merged_price(&input).as_deref(), Some("50.000000"));

    input["cart"]["lines"][2]["quantity"] = json!(2);
    assert_no_operations(&input);
}

#[test]
fn a_gift_line_that_is_not_the_campaigns_gift_fails_closed() {
    let mut input =
        make_input(json!({ "method": "free", "freeProduct": { "id": "3", "variantIds": ["99"] } }));
    input["cart"]["lines"][2]["croData"]["value"] =
        json!(cro_data("campaign-1", "instance-1", "free-gift", 1));
    assert_no_operations(&input);

    let mut input = make_input(percentage());
    input["cart"]["lines"][2]["croData"]["value"] =
        json!(cro_data("campaign-1", "instance-1", "free-gift", 1));
    assert_no_operations(&input);
}

#[test]
fn cart_quantity_multipliers_keep_the_fixed_discount_per_bundle_set() {
    let mut input = make_input(json!({ "method": "fixed", "fixed": 12 }));
    for line in input["cart"]["lines"].as_array_mut().unwrap() {
        line["quantity"] = json!(3);
    }
    assert_eq!(merged_price(&input).as_deref(), Some("20.000000"));
    let result = run(&input);
    let quantities: Vec<i32> = merges(&result)[0]
        .cart_lines
        .iter()
        .map(|entry| entry.quantity)
        .collect();
    assert_eq!(quantities, vec![1, 1, 1]);
}

#[test]
fn a_line_edited_on_its_own_falls_back_to_one_set() {
    let mut input = make_input(json!({ "method": "fixed", "fixed": 12 }));
    input["cart"]["lines"][0]["quantity"] = json!(2);
    let result = run(&input);
    let quantities: Vec<i32> = merges(&result)[0]
        .cart_lines
        .iter()
        .map(|entry| entry.quantity)
        .collect();
    assert_eq!(quantities, vec![2, 1, 1]);
    assert_eq!(merged_price(&input).as_deref(), Some("17.142857"));
}

#[test]
fn presentment_currency_converts_campaign_amounts() {
    let mut input = make_input(json!({ "method": "fixed", "fixed": 12 }));
    input["presentmentCurrencyRate"] = json!("2");
    assert_eq!(merged_price(&input).as_deref(), Some("40.000000"));
}

#[test]
fn absent_malformed_and_unknown_cro_metadata_produce_no_operations() {
    for value in [
        "",
        "{broken",
        "null",
        "42",
        "[]",
        r#"{"type":"unknown"}"#,
        r#"{"type":"mixMatch"}"#,
    ] {
        let mut input = make_input(percentage());
        for line in input["cart"]["lines"].as_array_mut().unwrap() {
            line["croData"]["value"] = json!(value);
        }
        assert_no_operations(&input);
    }
}

#[test]
fn separate_bundle_instances_remain_separate_operations() {
    let mut input = make_input(percentage());
    let mut second: Vec<Value> = input["cart"]["lines"].as_array().unwrap().clone();
    for (index, line) in second.iter_mut().enumerate() {
        line["id"] = json!(format!("gid://shopify/CartLine/{}-second", index));
        line["croData"]["value"] = json!(cro_data("campaign-1", "instance-2", "group-0", 1));
    }
    input["cart"]["lines"]
        .as_array_mut()
        .unwrap()
        .extend(second);

    let result = run(&input);
    let instances: Vec<&str> = merges(&result)
        .iter()
        .map(|merge| merge.attributes.as_ref().unwrap()[0].value.as_str())
        .collect();
    assert_eq!(instances, vec!["instance-1", "instance-2"]);
}

#[test]
fn every_group_source_is_verified_against_the_line() {
    let cases = [
        (
            json!({ "t": "product", "id": "gid://shopify/Product/1" }),
            json!({}),
            false,
        ),
        (json!({ "t": "product", "id": 1 }), json!({}), false),
        (
            json!({ "t": "product_type", "v": ["Beauty"] }),
            json!({}),
            true,
        ),
        (
            json!({ "t": "collection", "id": "77" }),
            json!({ "inCollections": [{ "collectionId": "gid://shopify/Collection/77", "isMember": true }] }),
            true,
        ),
        (
            json!({ "t": "tag", "v": ["sale"] }),
            json!({ "hasTags": [{ "tag": "sale", "hasTag": true }] }),
            true,
        ),
    ];
    for (item, member_facts, applies_to_every_line) in cases {
        let mut input = make_input(percentage());
        bundle_config(&mut input)["groups"][0]["items"] = json!([item.clone()]);
        for line in input["cart"]["lines"].as_array_mut().unwrap() {
            if let Some(memberships) = member_facts.get("inCollections") {
                line["merchandise"]["inCollections"] = memberships.clone();
            }
            if let Some(tags) = member_facts.get("hasTags") {
                line["merchandise"]["product"]["hasTags"] = tags.clone();
            }
        }
        if applies_to_every_line {
            assert_eq!(
                merged_price(&input).as_deref(),
                Some("15.000000"),
                "{}",
                item
            );
        } else {
            assert_no_operations(&input);
            input["cart"]["lines"].as_array_mut().unwrap().truncate(1);
            bundle_config(&mut input)["discount"]["minValue"] = json!(1);
            assert_eq!(
                merged_price(&input).as_deref(),
                Some("15.000000"),
                "{}",
                item
            );
        }
    }

    let mut input = make_input(percentage());
    input["cart"]["lines"][0]["merchandise"]["inCollections"] =
        json!([{ "collectionId": "gid://shopify/Collection/77", "isMember": false }]);
    bundle_config(&mut input)["groups"][0]["items"] = json!([{ "t": "collection", "id": "77" }]);
    assert_no_operations(&input);
}

#[test]
fn an_item_type_this_extension_cannot_verify_fails_the_bundle() {
    let mut input = make_input(percentage());
    bundle_config(&mut input)["groups"][0]["items"] =
        json!([{ "t": "vendor", "v": ["Acme"] }, { "t": "metafield", "v": ["x"] }]);
    assert_no_operations(&input);
}

#[test]
fn an_excluded_product_fails_the_bundle_but_an_excluded_variant_does_not() {
    let mut input = make_input(percentage());
    bundle_config(&mut input)["groups"][0]["excludeProducts"] =
        json!([{ "id": "2", "variantId": "2" }]);
    assert_eq!(merged_price(&input).as_deref(), Some("15.000000"));

    bundle_config(&mut input)["groups"][0]["excludeProducts"] =
        json!([{ "id": "gid://shopify/Product/2" }]);
    assert_no_operations(&input);
}

#[test]
fn groups_without_an_id_use_their_index_and_the_current_product_skips_membership() {
    let mut input = make_input(percentage());
    bundle_config(&mut input)["groups"] =
        json!([{ "min": 1, "items": [{ "t": "vendor", "v": ["Acme"] }] }]);
    input["cart"]["lines"][2]["croData"]["value"] =
        json!(cro_data("campaign-1", "instance-1", "current-product", 1));
    input["cart"]["lines"][2]["merchandise"]["product"]["vendor"] = json!("Other");
    assert_eq!(merged_price(&input).as_deref(), Some("15.000000"));
}

#[test]
fn an_empty_group_still_has_to_reach_its_minimum() {
    let mut input = make_input(percentage());
    bundle_config(&mut input)["groups"]
        .as_array_mut()
        .unwrap()
        .push(json!({ "id": "group-1", "min": 1, "items": [{ "t": "vendor", "v": ["Acme"] }] }));
    assert_no_operations(&input);
}

#[test]
fn the_campaign_window_is_compared_on_the_shop_date() {
    let mut input = make_input(percentage());
    bundle_config(&mut input)["startsAt"] = json!("2026-10-23T00:00:00Z");
    bundle_config(&mut input)["endsAt"] = json!("2026-10-23");
    assert_eq!(merged_price(&input).as_deref(), Some("15.000000"));

    bundle_config(&mut input)["endsAt"] = json!("2026-10-22");
    assert_no_operations(&input);
}

#[test]
fn customer_eligibility_is_checked_per_bundle() {
    let customer = |orders: i64, tags: Value| json!({ "isAuthenticated": true, "customer": { "numberOfOrders": orders, "hasTags": tags } });

    let mut input = make_input(percentage());
    bundle_config(&mut input)["eligibility"] = json!({ "customerScope": "new" });
    assert_no_operations(&input);
    input["cart"]["buyerIdentity"] = customer(0, json!([]));
    assert_eq!(merged_price(&input).as_deref(), Some("15.000000"));
    input["cart"]["buyerIdentity"] = customer(3, json!([]));
    assert_no_operations(&input);

    let mut input = make_input(percentage());
    bundle_config(&mut input)["eligibility"] =
        json!({ "customerScope": "tagged", "customerTags": ["vip"] });
    input["cart"]["buyerIdentity"] = customer(3, json!([{ "tag": "vip", "hasTag": false }]));
    assert_no_operations(&input);
    input["cart"]["buyerIdentity"] = customer(3, json!([{ "tag": "vip", "hasTag": true }]));
    assert_eq!(merged_price(&input).as_deref(), Some("15.000000"));

    let mut input = make_input(percentage());
    bundle_config(&mut input)["eligibility"] =
        json!({ "customerScope": "logged_in", "countries": ["CA", "US"] });
    input["cart"]["buyerIdentity"] = customer(3, json!([]));
    assert_eq!(merged_price(&input).as_deref(), Some("15.000000"));
}

#[test]
fn a_tagged_bundle_never_applies_to_a_buyer_without_a_customer_unless_it_requires_no_tag() {
    let mut input = make_input(percentage());
    bundle_config(&mut input)["eligibility"] =
        json!({ "customerScope": "tagged", "customerTags": ["vip"] });
    assert_no_operations(&input);
    input["cart"]["buyerIdentity"] = json!({ "isAuthenticated": true, "customer": null });
    assert_no_operations(&input);

    bundle_config(&mut input)["eligibility"]["customerTags"] = json!([]);
    assert_eq!(merged_price(&input).as_deref(), Some("15.000000"));
    input["cart"]["buyerIdentity"] = json!(null);
    assert_eq!(merged_price(&input).as_deref(), Some("15.000000"));
}

#[test]
fn a_logged_in_bundle_needs_an_authenticated_buyer_even_when_a_customer_is_known() {
    let mut input = make_input(percentage());
    bundle_config(&mut input)["eligibility"] = json!({ "customerScope": "logged_in" });
    input["cart"]["buyerIdentity"] =
        json!({ "isAuthenticated": false, "customer": { "numberOfOrders": 0, "hasTags": [] } });
    assert_no_operations(&input);

    input["cart"]["buyerIdentity"]["isAuthenticated"] = json!(true);
    assert_eq!(merged_price(&input).as_deref(), Some("15.000000"));
}

#[test]
fn an_empty_or_unknown_eligibility_lets_every_buyer_in() {
    for eligibility in [
        json!(null),
        json!({}),
        json!({ "customerScope": "all" }),
        json!({ "customerScope": "all", "countries": [] }),
    ] {
        let mut input = make_input(percentage());
        bundle_config(&mut input)["eligibility"] = eligibility.clone();
        assert_eq!(
            merged_price(&input).as_deref(),
            Some("15.000000"),
            "{}",
            eligibility
        );
    }
}

#[test]
fn two_bundles_in_one_cart_are_each_checked_against_their_own_required_tags() {
    let mut input = make_input(percentage());
    bundle_config(&mut input)["eligibility"] =
        json!({ "customerScope": "tagged", "customerTags": ["vip"] });
    let mut wholesale_bundle = bundle_config(&mut input).clone();
    wholesale_bundle["id"] = json!("campaign-2");
    wholesale_bundle["eligibility"]["customerTags"] = json!(["wholesale"]);
    input["cartTransform"]["mixMatch"]["jsonValue"]["bundles"]
        .as_array_mut()
        .unwrap()
        .push(wholesale_bundle);

    let mut wholesale_lines: Vec<Value> = input["cart"]["lines"].as_array().unwrap().clone();
    for (index, line) in wholesale_lines.iter_mut().enumerate() {
        line["id"] = json!(format!("gid://shopify/CartLine/{}-wholesale", index));
        line["croData"]["value"] = json!(cro_data("campaign-2", "instance-2", "group-0", 1));
    }
    input["cart"]["lines"]
        .as_array_mut()
        .unwrap()
        .extend(wholesale_lines);

    let merged_instances = |input: &Value| -> Vec<String> {
        merges(&run(input))
            .iter()
            .map(|merge| merge.attributes.as_ref().unwrap()[0].value.clone())
            .collect()
    };
    let buyer_with = |tags: Value| json!({ "isAuthenticated": true, "customer": { "numberOfOrders": 3, "hasTags": tags } });

    input["cart"]["buyerIdentity"] = buyer_with(json!([
        { "tag": "vip", "hasTag": true },
        { "tag": "wholesale", "hasTag": false },
    ]));
    assert_eq!(merged_instances(&input), vec!["instance-1"]);

    input["cart"]["buyerIdentity"] = buyer_with(json!([
        { "tag": "vip", "hasTag": false },
        { "tag": "wholesale", "hasTag": true },
    ]));
    assert_eq!(merged_instances(&input), vec!["instance-2"]);

    input["cart"]["buyerIdentity"] = buyer_with(json!([
        { "tag": "vip", "hasTag": true },
        { "tag": "wholesale", "hasTag": true },
    ]));
    assert_eq!(merged_instances(&input), vec!["instance-1", "instance-2"]);

    input["cart"]["buyerIdentity"] = json!(null);
    assert!(merged_instances(&input).is_empty());
}

#[test]
fn campaign_disagreement_membership_group_gates_and_eligibility_fail_closed() {
    let mutations: Vec<fn(&mut Value)> = vec![
        |input| {
            input["cart"]["lines"][0]["croData"]["value"] =
                json!(cro_data("campaign-2", "instance-1", "group-0", 1))
        },
        |input| input["cart"]["lines"][0]["merchandise"]["product"]["vendor"] = json!("Other"),
        |input| bundle_config(input)["groups"][0]["min"] = json!(4),
        |input| bundle_config(input)["groups"][0]["max"] = json!(2),
        |input| bundle_config(input)["eligibility"]["customerScope"] = json!("logged_in"),
        |input| bundle_config(input)["eligibility"]["countries"] = json!(["CA"]),
        |input| input["shop"]["localTime"]["date"] = json!(""),
        |input| {
            input["cart"]["lines"][0]["sellingPlanAllocation"] =
                json!({ "sellingPlan": { "id": "plan" } })
        },
        |input| {
            input["cart"]["lines"][0]["parentRelationship"] =
                json!({ "parent": { "id": "parent" } })
        },
        |input| {
            input["cart"]["lines"][0]["croData"]["value"] =
                json!(cro_data("campaign-1", "instance-1", "group-9", 1))
        },
        |input| bundle_config(input)["bundleParent"] = json!(null),
        |input| bundle_config(input)["id"] = json!("campaign-other"),
        |input| input["cartTransform"]["mixMatch"] = json!(null),
    ];
    for mutate in mutations {
        let mut input = make_input(percentage());
        mutate(&mut input);
        assert_no_operations(&input);
    }
}
