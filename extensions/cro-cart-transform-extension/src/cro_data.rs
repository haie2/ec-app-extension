use crate::bxgy::{self, BxgyLine};
use crate::mix_match::{self, MixMatchLine};

pub enum CroLine {
    Bxgy(BxgyLine),
    MixMatch(MixMatchLine),
}

impl CroLine {
    pub fn job_type(&self) -> &'static str {
        match self {
            CroLine::Bxgy(_) => bxgy::TYPE,
            CroLine::MixMatch(_) => mix_match::TYPE,
        }
    }

    pub fn bundle(&self) -> &str {
        match self {
            CroLine::Bxgy(data) => &data.bundle,
            CroLine::MixMatch(data) => &data.bundle,
        }
    }
}

pub fn read_cro_line(raw: &str) -> Option<CroLine> {
    let parsed: serde_json::Value = serde_json::from_str(raw).ok()?;
    if !parsed.is_object() {
        return None;
    }

    match parsed.get("type").and_then(|value| value.as_str())? {
        bxgy::TYPE => bxgy::read_line(&parsed).map(CroLine::Bxgy),
        mix_match::TYPE => mix_match::read_line(&parsed).map(CroLine::MixMatch),
        _ => None,
    }
}
