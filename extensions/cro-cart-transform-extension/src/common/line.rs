use crate::schema::cart_transform_run::cart_transform_run_input::cart::lines::Merchandise;
use crate::schema::cart_transform_run::cart_transform_run_input::cart::Lines;

pub fn mergeable_product_id(line: &Lines) -> Option<&str> {
    if line.selling_plan_allocation().is_some() || line.parent_relationship().is_some() {
        return None;
    }
    match line.merchandise() {
        Merchandise::ProductVariant(variant) => Some(variant.product().id()),
        _ => None,
    }
}

pub fn bundle_multiplier(quantities: impl Iterator<Item = (i64, i64)>) -> i64 {
    let mut multiplier = 0;

    for (unit_quantity, cart_quantity) in quantities {
        if unit_quantity <= 0 || cart_quantity <= 0 {
            return 1;
        }
        if cart_quantity % unit_quantity != 0 {
            return 1;
        }

        let factor = cart_quantity / unit_quantity;
        if multiplier != 0 && factor != multiplier {
            return 1;
        }
        multiplier = factor;
    }

    if multiplier == 0 {
        1
    } else {
        multiplier
    }
}
