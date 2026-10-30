use crate::cart_transform_run::cart_transform_run;
use crate::common::js_value::js_round;
use crate::schema;
use serde_json::{json, Value};
use shopify_function::run_function_with_input;
use std::sync::atomic::{AtomicUsize, Ordering};

static LINE_COUNTER: AtomicUsize = AtomicUsize::new(0);

#[derive(Clone)]
struct LineOptions {
    variant: u64,
    product: u64,
    price: f64,
    quantity: i64,
    role: &'static str,
    bundle: &'static str,
    campaign: &'static str,
    qty: Option<i64>,
    line_type: &'static str,
    extra: Value,
}

fn line_options(variant: u64, product: u64, price: f64) -> LineOptions {
    LineOptions {
        variant,
        product,
        price,
        quantity: 1,
        role: "trigger",
        bundle: "b1",
        campaign: "c1",
        qty: None,
        line_type: "bxgy",
        extra: json!({}),
    }
}

fn shirt_options() -> LineOptions {
    line_options(11, 1, 500.0)
}

fn cap_options() -> LineOptions {
    LineOptions {
        role: "reward",
        ..line_options(31, 3, 100.0)
    }
}

fn line(options: LineOptions) -> Value {
    let counter = LINE_COUNTER.fetch_add(1, Ordering::SeqCst) + 1;
    let cro_data = json!({
        "type": options.line_type,
        "campaign": options.campaign,
        "bundle": options.bundle,
        "role": options.role,
        "qty": options.qty.unwrap_or(options.quantity),
    });
    let mut value = json!({
        "id": format!("gid://shopify/CartLine/{}", counter),
        "quantity": options.quantity,
        "cost": { "amountPerQuantity": { "amount": format!("{:.2}", options.price) } },
        "merchandise": {
            "__typename": "ProductVariant",
            "id": format!("gid://shopify/ProductVariant/{}", options.variant),
            "product": { "id": format!("gid://shopify/Product/{}", options.product) },
        },
        "croData": { "value": cro_data.to_string() },
        "parentRelationship": null,
        "sellingPlanAllocation": null,
    });
    merge_into(&mut value, options.extra);
    value
}

fn shirt() -> Value {
    line(shirt_options())
}

fn cap() -> Value {
    line(cap_options())
}

fn merge_into(target: &mut Value, overrides: Value) {
    if let (Some(target), Value::Object(overrides)) = (target.as_object_mut(), overrides) {
        for (key, value) in overrides {
            target.insert(key, value);
        }
    }
}

fn offer(overrides: Value) -> Value {
    let mut value = json!({
        "id": "c1",
        "repeatLimit": { "enabled": false, "max": 1 },
        "schedule": null,
        "parentProduct": { "variantId": 9001 },
        "trigger": { "type": "fixed", "items": [{ "productId": 1, "quantity": 1 }] },
        "reward": {
            "type": "fixed",
            "discountOffer": { "type": "percentage", "value": 50 },
            "items": [{ "productId": 3, "quantity": 1 }],
        },
    });
    merge_into(&mut value, overrides);
    value
}

fn run_with(
    lines: &[Value],
    campaigns: Option<Vec<Value>>,
    overrides: Value,
) -> schema::CartTransformRunResult {
    let bxgy =
        campaigns.map(|campaigns| json!({ "jsonValue": { "version": 1, "campaigns": campaigns } }));
    let mut input = json!({
        "cart": { "lines": lines },
        "presentmentCurrencyRate": "1.0",
        "shop": { "localTime": { "date": "2026-10-21" } },
        "cartTransform": { "bxgy": bxgy },
    });
    merge_into(&mut input, overrides);
    run_function_with_input(cart_transform_run, &input.to_string()).unwrap()
}

fn run(lines: &[Value]) -> schema::CartTransformRunResult {
    run_with(lines, Some(vec![offer(json!({}))]), json!({}))
}

fn run_offer(lines: &[Value], campaign: Value) -> schema::CartTransformRunResult {
    run_with(lines, Some(vec![campaign]), json!({}))
}

fn merges(result: &schema::CartTransformRunResult) -> Vec<&schema::LinesMergeOperation> {
    result
        .operations
        .iter()
        .filter_map(|operation| match operation {
            schema::Operation::LinesMerge(merge) => Some(merge),
            _ => None,
        })
        .collect()
}

fn percent_of(result: &schema::CartTransformRunResult) -> Vec<String> {
    merges(result)
        .iter()
        .map(|merge| {
            merge
                .price
                .as_ref()
                .and_then(|price| price.percentage_decrease.as_ref())
                .map(|value| value.value.clone())
                .unwrap()
        })
        .collect()
}

fn cart_lines_of(lines: &[Value], quantities: &[i32]) -> Vec<schema::CartLineInput> {
    lines
        .iter()
        .zip(quantities)
        .map(|(line, quantity)| schema::CartLineInput {
            cart_line_id: line["id"].as_str().unwrap().to_string(),
            quantity: *quantity,
        })
        .collect()
}

fn bundle_ids(result: &schema::CartTransformRunResult) -> Vec<String> {
    merges(result)
        .iter()
        .map(|merge| merge.attributes.as_ref().unwrap()[0].value.clone())
        .collect()
}

#[test]
fn fixed_trigger_and_fixed_reward_merge_under_the_parent_with_the_reward_discount_spread_over_the_bundle(
) {
    let lines = vec![shirt(), cap()];
    let result = run(&lines);
    let merge = merges(&result)[0];

    assert_eq!(merge.parent_variant_id, "gid://shopify/ProductVariant/9001");
    assert_eq!(merge.cart_lines, cart_lines_of(&lines, &[1, 1]));
    assert_eq!(percent_of(&result), vec!["8.333334"]);
    assert_eq!(
        merge.attributes,
        Some(vec![
            schema::AttributeOutput {
                key: "_cro_bundle".to_string(),
                value: "b1".to_string()
            },
            schema::AttributeOutput {
                key: "_cro_data".to_string(),
                value: r#"{"type":"bxgy","campaign":"c1","bundle":"b1","lines":2}"#.to_string(),
            },
        ])
    );
}

#[test]
fn the_percentage_is_rounded_up_so_the_bundle_price_never_lands_above_the_widget_total() {
    let free_gifts = offer(json!({
        "trigger": { "type": "fixed", "items": [{ "productId": 1, "quantity": 1 }, { "productId": 2, "quantity": 1 }] },
        "reward": {
            "type": "fixed",
            "discountOffer": { "type": "percentage", "value": 100 },
            "items": [{ "productId": 3, "quantity": 1 }, { "productId": 4, "quantity": 1 }],
        },
    }));
    let lines = vec![
        line(LineOptions {
            price: 41.0,
            ..shirt_options()
        }),
        line(line_options(21, 2, 66.0)),
        line(LineOptions {
            price: 10.0,
            ..cap_options()
        }),
        line(LineOptions {
            role: "reward",
            ..line_options(41, 4, 67.0)
        }),
    ];

    let percent = percent_of(&run_offer(&lines, free_gifts))[0].clone();
    let bundle_price = js_round(184.0 * (1.0 - percent.parse::<f64>().unwrap() / 100.0));

    assert_eq!(percent, "41.847827");
    assert_eq!(bundle_price, 107.0);
}

#[test]
fn a_fixed_amount_is_capped_by_the_price_of_the_reward_and_converted_with_the_presentment_rate() {
    let fixed_amount = |value: f64| {
        offer(json!({
            "reward": {
                "type": "fixed",
                "discountOffer": { "type": "fixedAmount", "value": value },
                "items": [{ "productId": 3, "quantity": 1 }],
            },
        }))
    };

    assert_eq!(
        percent_of(&run_offer(&[shirt(), cap()], fixed_amount(150.0))),
        vec!["16.666667"]
    );
    assert_eq!(
        percent_of(&run_with(
            &[shirt(), cap()],
            Some(vec![fixed_amount(20.0)]),
            json!({ "presentmentCurrencyRate": "2.0" }),
        )),
        vec!["6.666667"]
    );
}

#[test]
fn an_offer_with_no_discount_still_merges_the_bundle_under_the_parent_without_a_price_change() {
    for discount_offer in [
        json!({ "type": "percentage", "value": 0 }),
        json!({ "type": "fixedAmount", "value": 0 }),
    ] {
        let campaign = offer(json!({
            "reward": { "type": "fixed", "discountOffer": discount_offer, "items": [{ "productId": 3, "quantity": 1 }] },
        }));
        let lines = vec![shirt(), cap()];
        let result = run_offer(&lines, campaign);
        let merge = merges(&result)[0];

        assert_eq!(merge.parent_variant_id, "gid://shopify/ProductVariant/9001");
        assert_eq!(merge.cart_lines, cart_lines_of(&lines, &[1, 1]));
        assert!(merge.price.is_none());
    }
}

#[test]
fn a_discount_that_is_tiny_next_to_the_bundle_subtotal_still_lowers_the_price_instead_of_rounding_to_zero(
) {
    let tiny_discount = offer(json!({
        "reward": {
            "type": "fixed",
            "discountOffer": { "type": "fixedAmount", "value": 0.01 },
            "items": [{ "productId": 3, "quantity": 1 }],
        },
    }));

    assert_eq!(
        percent_of(&run_offer(
            &[
                line(LineOptions {
                    price: 40_000_000.0,
                    ..shirt_options()
                }),
                cap()
            ],
            tiny_discount
        )),
        vec!["0.000001"]
    );
}

#[test]
fn a_mix_and_match_trigger_needs_its_minimum_quantity() {
    let mix_trigger = || {
        offer(
            json!({ "trigger": { "type": "mixMatch", "minQuantity": 2, "items": [{ "productId": 1, "quantity": 3 }] } }),
        )
    };

    assert_eq!(
        run_offer(&[shirt(), cap()], mix_trigger()).operations.len(),
        0
    );
    assert_eq!(
        percent_of(&run_offer(
            &[
                line(LineOptions {
                    quantity: 2,
                    ..shirt_options()
                }),
                cap()
            ],
            mix_trigger()
        )),
        vec!["4.545455"]
    );
}

#[test]
fn a_spend_trigger_is_measured_on_the_trigger_lines_before_discounts_in_the_presentment_currency() {
    let spend = |min_amount: f64| {
        offer(
            json!({ "trigger": { "type": "spend", "minAmount": min_amount, "items": [{ "productId": 1, "quantity": 2 }] } }),
        )
    };

    assert_eq!(
        run_offer(&[shirt(), cap()], spend(400.0)).operations.len(),
        1
    );
    assert_eq!(
        run_offer(&[shirt(), cap()], spend(600.0)).operations.len(),
        0
    );
    assert_eq!(
        run_with(
            &[shirt(), cap()],
            Some(vec![spend(400.0)]),
            json!({ "presentmentCurrencyRate": "1.5" })
        )
        .operations
        .len(),
        0
    );
}

#[test]
fn a_mix_and_match_reward_discounts_only_the_cheapest_units_it_allows() {
    let mix_reward = offer(json!({
        "reward": {
            "type": "mixMatch",
            "maxQuantity": 1,
            "discountOffer": { "type": "percentage", "value": 50 },
            "items": [{ "productId": 3, "quantity": 1 }, { "productId": 4, "quantity": 1 }],
        },
    }));
    let lines = vec![
        shirt(),
        cap(),
        line(LineOptions {
            role: "reward",
            ..line_options(41, 4, 80.0)
        }),
    ];

    assert_eq!(percent_of(&run_offer(&lines, mix_reward)), vec!["5.882353"]);
}

#[test]
fn a_bundle_raised_to_three_sets_keeps_the_same_percentage_and_a_repeat_limit_only_discounts_the_allowed_sets(
) {
    let tripled = || {
        vec![
            line(LineOptions {
                quantity: 3,
                qty: Some(1),
                ..shirt_options()
            }),
            line(LineOptions {
                quantity: 3,
                qty: Some(1),
                ..cap_options()
            }),
        ]
    };

    assert_eq!(percent_of(&run(&tripled())), vec!["8.333334"]);
    assert_eq!(
        percent_of(&run_offer(
            &tripled(),
            offer(json!({ "repeatLimit": { "enabled": true, "max": 2 } }))
        )),
        vec!["5.555556"]
    );
}

#[test]
fn a_bundle_raised_to_more_sets_merges_one_sets_quantity_of_each_line_so_the_parent_line_carries_the_number_of_sets(
) {
    let lines = vec![
        line(LineOptions {
            quantity: 4,
            qty: Some(2),
            ..shirt_options()
        }),
        line(LineOptions {
            quantity: 2,
            qty: Some(1),
            ..cap_options()
        }),
    ];
    let result = run(&lines);

    assert_eq!(
        merges(&result)[0].cart_lines,
        cart_lines_of(&lines, &[2, 1])
    );
}

#[test]
fn a_bundle_raised_to_two_sets_in_the_cart_under_a_repeat_limit_of_one_only_discounts_one_set() {
    let doubled = vec![
        line(LineOptions {
            quantity: 2,
            qty: Some(1),
            ..shirt_options()
        }),
        line(LineOptions {
            quantity: 2,
            qty: Some(1),
            ..cap_options()
        }),
    ];
    let result = run_offer(
        &doubled,
        offer(json!({ "repeatLimit": { "enabled": true, "max": 1 } })),
    );

    assert_eq!(
        merges(&result)[0].cart_lines,
        cart_lines_of(&doubled, &[1, 1])
    );
    assert_eq!(percent_of(&result), vec!["4.166667"]);
}

#[test]
fn a_repeat_limit_of_one_leaves_the_second_bundle_of_the_offer_unmerged() {
    let lines = vec![
        shirt(),
        cap(),
        line(LineOptions {
            bundle: "b2",
            ..shirt_options()
        }),
        line(LineOptions {
            bundle: "b2",
            ..cap_options()
        }),
    ];
    let result = run_offer(
        &lines,
        offer(json!({ "repeatLimit": { "enabled": true, "max": 1 } })),
    );

    assert_eq!(bundle_ids(&result), vec!["b1"]);
    assert_eq!(run(&lines).operations.len(), 2);
}

#[test]
fn a_line_edited_on_its_own_falls_back_to_one_set_and_merges_every_lines_full_quantity() {
    let lines = vec![
        line(LineOptions {
            quantity: 2,
            qty: Some(1),
            ..shirt_options()
        }),
        line(LineOptions {
            quantity: 1,
            qty: Some(1),
            ..cap_options()
        }),
    ];
    let result = run(&lines);

    assert_eq!(percent_of(&result), vec!["4.545455"]);
    assert_eq!(
        merges(&result)[0].cart_lines,
        cart_lines_of(&lines, &[2, 1])
    );
}

#[test]
fn every_check_that_cannot_be_trusted_leaves_the_bundle_at_full_price() {
    let cases: Vec<(&str, Vec<Value>, Option<Vec<Value>>)> = vec![
        (
            "missing role",
            vec![
                shirt(),
                line(LineOptions {
                    role: "gift",
                    ..cap_options()
                }),
            ],
            Some(vec![offer(json!({}))]),
        ),
        (
            "campaign mismatch",
            vec![
                shirt(),
                line(LineOptions {
                    campaign: "c2",
                    ..cap_options()
                }),
            ],
            Some(vec![offer(json!({}))]),
        ),
        (
            "campaign not in metafield",
            vec![
                line(LineOptions {
                    campaign: "c9",
                    ..shirt_options()
                }),
                line(LineOptions {
                    campaign: "c9",
                    ..cap_options()
                }),
            ],
            Some(vec![offer(json!({}))]),
        ),
        ("metafield missing", vec![shirt(), cap()], None),
        (
            "no parent variant",
            vec![shirt(), cap()],
            Some(vec![offer(
                json!({ "parentProduct": { "variantId": null } }),
            )]),
        ),
        (
            "outside schedule",
            vec![shirt(), cap()],
            Some(vec![offer(
                json!({ "schedule": { "enabled": true, "startsAt": "2026-11-01", "endsAt": null } }),
            )]),
        ),
        (
            "selling plan",
            vec![
                line(LineOptions {
                    extra: json!({ "sellingPlanAllocation": { "sellingPlan": { "id": "gid://shopify/SellingPlan/1" } } }),
                    ..shirt_options()
                }),
                cap(),
            ],
            Some(vec![offer(json!({}))]),
        ),
        (
            "already a component",
            vec![
                line(LineOptions {
                    extra: json!({ "parentRelationship": { "parent": { "id": "gid://shopify/CartLine/0" } } }),
                    ..shirt_options()
                }),
                cap(),
            ],
            Some(vec![offer(json!({}))]),
        ),
        (
            "line not offered",
            vec![
                shirt(),
                line(LineOptions {
                    variant: 77,
                    product: 7,
                    ..cap_options()
                }),
            ],
            Some(vec![offer(json!({}))]),
        ),
        ("trigger not met", vec![cap()], Some(vec![offer(json!({}))])),
        (
            "fixed reward item missing",
            vec![shirt(), cap()],
            Some(vec![offer(json!({
                "reward": {
                    "type": "fixed",
                    "discountOffer": { "type": "percentage", "value": 50 },
                    "items": [{ "productId": 3, "quantity": 1 }, { "productId": 4, "quantity": 1 }],
                },
            }))]),
        ),
        (
            "line matches two items",
            vec![shirt(), cap()],
            Some(vec![offer(json!({
                "trigger": { "type": "fixed", "items": [{ "productId": 1, "quantity": 1 }, { "productId": 1, "quantity": 1 }] },
            }))]),
        ),
    ];

    for (name, lines, campaigns) in cases {
        assert_eq!(
            run_with(&lines, campaigns, json!({})).operations.len(),
            0,
            "{}",
            name
        );
    }
}

#[test]
fn rules_written_in_an_envelope_version_this_function_does_not_know_are_ignored() {
    let with_version = |version: Value| {
        let input = json!({
            "cart": { "lines": [shirt(), cap()] },
            "presentmentCurrencyRate": "1.0",
            "shop": { "localTime": { "date": "2026-10-21" } },
            "cartTransform": { "bxgy": { "jsonValue": { "version": version, "campaigns": [offer(json!({}))] } } },
        });
        run_function_with_input(cart_transform_run, &input.to_string())
            .map(|result: schema::CartTransformRunResult| result.operations.len())
            .unwrap()
    };

    assert_eq!(with_version(json!(1)), 1);
    assert_eq!(with_version(json!(2)), 0);
    assert_eq!(with_version(Value::Null), 0);
}

#[test]
fn every_variant_of_an_offered_product_is_offered() {
    assert_eq!(run(&[shirt(), cap()]).operations.len(), 1);
    assert_eq!(
        run(&[
            line(LineOptions {
                variant: 12,
                ..shirt_options()
            }),
            cap()
        ])
        .operations
        .len(),
        1
    );
}

#[test]
fn the_same_product_as_trigger_and_reward_is_told_apart_by_role() {
    let same_product = offer(json!({
        "reward": {
            "type": "fixed",
            "discountOffer": { "type": "percentage", "value": 100 },
            "items": [{ "productId": 1, "quantity": 1 }],
        },
    }));

    assert_eq!(
        percent_of(&run_offer(
            &[
                shirt(),
                line(LineOptions {
                    role: "reward",
                    ..shirt_options()
                })
            ],
            same_product
        )),
        vec!["50.000000"]
    );
}

#[test]
fn mix_and_match_lines_in_the_same_cart_are_left_to_their_own_handler() {
    let mix_match_line = line(LineOptions {
        line_type: "mixMatch",
        bundle: "mm1",
        campaign: "m1",
        ..line_options(51, 5, 30.0)
    });
    let mix_match_line_id = mix_match_line["id"].as_str().unwrap().to_string();
    let result = run(&[shirt(), cap(), mix_match_line]);

    assert_eq!(result.operations.len(), 1);
    assert!(!merges(&result)[0]
        .cart_lines
        .iter()
        .any(|entry| entry.cart_line_id == mix_match_line_id));
}

#[test]
fn a_bundle_of_more_than_25_lines_is_left_at_full_price_while_one_of_25_still_merges() {
    let bundle_of = |trigger_count: u64| {
        let mut lines: Vec<Value> = (0..trigger_count)
            .map(|index| line(line_options(1000 + index, 100 + index, 10.0)))
            .collect();
        lines.push(cap());
        let items: Vec<Value> = (0..trigger_count)
            .map(|index| json!({ "productId": 100 + index, "quantity": 1 }))
            .collect();
        (
            lines,
            offer(json!({ "trigger": { "type": "fixed", "items": items } })),
        )
    };

    let (at_limit_lines, at_limit_campaign) = bundle_of(24);
    let (over_limit_lines, over_limit_campaign) = bundle_of(25);

    assert_eq!(
        run_offer(&at_limit_lines, at_limit_campaign)
            .operations
            .len(),
        1
    );
    assert_eq!(
        run_offer(&over_limit_lines, over_limit_campaign)
            .operations
            .len(),
        0
    );
}

#[test]
fn the_cart_processes_at_most_25_offer_lines_and_a_later_bundle_that_would_pass_the_budget_stays_at_full_price(
) {
    let bundle_of = |bundle: &'static str, trigger_count: u64, first_product: u64| {
        let mut lines: Vec<Value> = (0..trigger_count)
            .map(|index| {
                line(LineOptions {
                    bundle,
                    ..line_options(2000 + first_product + index, first_product + index, 10.0)
                })
            })
            .collect();
        lines.push(line(LineOptions {
            bundle,
            ..cap_options()
        }));
        lines
    };
    let items: Vec<Value> = (0..30)
        .map(|index| json!({ "productId": 200 + index, "quantity": 1 }))
        .collect();
    let campaign =
        || offer(json!({ "trigger": { "type": "mixMatch", "minQuantity": 1, "items": items } }));

    let first = bundle_of("b1", 19, 200);
    let fitting = bundle_of("b2", 4, 220);
    let overflowing = bundle_of("b3", 5, 220);

    let with_fitting: Vec<Value> = first.iter().chain(fitting.iter()).cloned().collect();
    let with_overflowing: Vec<Value> = first.iter().chain(overflowing.iter()).cloned().collect();

    assert_eq!(
        bundle_ids(&run_offer(&with_fitting, campaign())),
        vec!["b1", "b2"]
    );
    assert_eq!(
        bundle_ids(&run_offer(&with_overflowing, campaign())),
        vec!["b1"]
    );
}
