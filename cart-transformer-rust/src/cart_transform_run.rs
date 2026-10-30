use super::bxgy::{self, BxgyState, LineData};
use super::schema;
use super::schema::cart_transform_run::cart_transform_run_input::cart::Lines;
use shopify_function::prelude::*;
use shopify_function::Result;

#[shopify_function]
fn cart_transform_run(
    input: schema::cart_transform_run::CartTransformRunInput,
) -> Result<schema::CartTransformRunResult> {
    let lines = input.cart().lines();
    let jobs = group_bxgy_lines(lines);
    if jobs.is_empty() {
        return Ok(schema::CartTransformRunResult { operations: vec![] });
    }

    let envelope = input
        .cart_transform()
        .bxgy()
        .map(|metafield| metafield.json_value());
    let mut state = BxgyState::new(envelope);
    let today = input.shop().local_time().date().to_string();
    let presentment_rate = input.presentment_currency_rate().as_f64();

    let mut operations = Vec::new();
    for job in &jobs {
        let job_lines: Vec<(&Lines, &LineData)> = job
            .iter()
            .map(|(index, data)| (&lines[*index], data))
            .collect();
        if let Some(lines_merge) = bxgy::run(&job_lines, &mut state, &today, presentment_rate) {
            operations.push(schema::Operation::LinesMerge(lines_merge));
        }
    }

    Ok(schema::CartTransformRunResult { operations })
}

fn group_bxgy_lines(lines: &[Lines]) -> Vec<Vec<(usize, LineData)>> {
    let mut bundle_keys: Vec<String> = Vec::new();
    let mut jobs: Vec<Vec<(usize, LineData)>> = Vec::new();

    for (index, line) in lines.iter().enumerate() {
        let raw = match line.cro_data().and_then(|attribute| attribute.value()) {
            Some(raw) if !raw.is_empty() => raw,
            _ => continue,
        };
        let Some(data) = bxgy::read_line_data(raw) else {
            continue;
        };
        if data.bundle.is_empty() {
            continue;
        }

        match bundle_keys.iter().position(|key| *key == data.bundle) {
            Some(position) => jobs[position].push((index, data)),
            None => {
                bundle_keys.push(data.bundle.clone());
                jobs.push(vec![(index, data)]);
            }
        }
    }

    jobs
}
