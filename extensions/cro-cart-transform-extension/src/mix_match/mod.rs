pub mod campaign;
pub mod eligibility;
pub mod membership;
pub mod pricing;

use crate::cart_transform_run::RunContext;
use crate::schema;
use crate::schema::cart_transform_run::cart_transform_run_input::cart::Lines;

pub const TYPE: &str = "mixMatch";

pub struct MixMatchLine {
    pub bundle: String,
}

pub fn read_line(_parsed: &serde_json::Value) -> Option<MixMatchLine> {
    None
}

pub fn run(
    _lines: &[(&Lines, &MixMatchLine)],
    _context: &RunContext,
) -> Option<schema::LinesMergeOperation> {
    None
}
