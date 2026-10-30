use crate::bxgy::{self, BxgyLine, BxgyState};
use crate::cro_data::{read_cro_line, CroLine};
use crate::mix_match::{self, MixMatchLine};
use crate::schema;
use crate::schema::cart_transform_run::cart_transform_run_input::cart::Lines;
use shopify_function::prelude::*;
use shopify_function::Result;

pub struct RunContext {
    pub today: String,
    pub presentment_rate: f64,
}

enum Job {
    Bxgy(Vec<(usize, BxgyLine)>),
    MixMatch(Vec<(usize, MixMatchLine)>),
}

#[shopify_function]
pub fn cart_transform_run(
    input: schema::cart_transform_run::CartTransformRunInput,
) -> Result<schema::CartTransformRunResult> {
    let lines = input.cart().lines();
    let jobs = group_cart_lines(lines);
    if jobs.is_empty() {
        return Ok(schema::CartTransformRunResult { operations: vec![] });
    }

    let context = RunContext {
        today: input.shop().local_time().date().to_string(),
        presentment_rate: input.presentment_currency_rate().as_f64(),
    };
    let mut bxgy_state: Option<BxgyState> = None;
    let mut operations = Vec::new();

    for job in &jobs {
        let lines_merge = match job {
            Job::Bxgy(entries) => {
                let state = bxgy_state.get_or_insert_with(|| {
                    BxgyState::new(
                        input
                            .cart_transform()
                            .bxgy()
                            .map(|metafield| metafield.json_value()),
                    )
                });
                let job_lines: Vec<(&Lines, &BxgyLine)> = entries
                    .iter()
                    .map(|(index, data)| (&lines[*index], data))
                    .collect();
                bxgy::run(&job_lines, state, &context)
            }
            Job::MixMatch(entries) => {
                let job_lines: Vec<(&Lines, &MixMatchLine)> = entries
                    .iter()
                    .map(|(index, data)| (&lines[*index], data))
                    .collect();
                mix_match::run(&job_lines, &context)
            }
        };
        if let Some(lines_merge) = lines_merge {
            operations.push(schema::Operation::LinesMerge(lines_merge));
        }
    }

    Ok(schema::CartTransformRunResult { operations })
}

fn group_cart_lines(lines: &[Lines]) -> Vec<Job> {
    let mut job_keys: Vec<(&'static str, String)> = Vec::new();
    let mut jobs: Vec<Job> = Vec::new();

    for (index, line) in lines.iter().enumerate() {
        let raw = match line.cro_data().and_then(|attribute| attribute.value()) {
            Some(raw) if !raw.is_empty() => raw,
            _ => continue,
        };
        let Some(cro_line) = read_cro_line(raw) else {
            continue;
        };
        let job_type = cro_line.job_type();
        let bundle = cro_line.bundle().to_string();
        if bundle.is_empty() {
            continue;
        }

        let position = job_keys
            .iter()
            .position(|(key_type, key_bundle)| *key_type == job_type && *key_bundle == bundle);
        match (position, cro_line) {
            (Some(position), CroLine::Bxgy(data)) => {
                if let Job::Bxgy(entries) = &mut jobs[position] {
                    entries.push((index, data));
                }
            }
            (Some(position), CroLine::MixMatch(data)) => {
                if let Job::MixMatch(entries) = &mut jobs[position] {
                    entries.push((index, data));
                }
            }
            (None, CroLine::Bxgy(data)) => {
                job_keys.push((job_type, bundle));
                jobs.push(Job::Bxgy(vec![(index, data)]));
            }
            (None, CroLine::MixMatch(data)) => {
                job_keys.push((job_type, bundle));
                jobs.push(Job::MixMatch(vec![(index, data)]));
            }
        }
    }

    jobs
}
