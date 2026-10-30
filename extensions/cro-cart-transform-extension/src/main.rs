use shopify_function::prelude::*;
use std::process;

pub mod bxgy;
pub mod cart_transform_run;
pub mod common;
pub mod cro_data;
pub mod mix_match;

#[typegen("schema.graphql", custom_scalar_overrides = {
    "PriceAdjustmentValue.value" => ::std::string::String,
})]
pub mod schema {
    #[query("src/cart_transform_run.graphql")]
    pub mod cart_transform_run {}
}

fn main() {
    log!("Please invoke a named export.");
    process::abort();
}
