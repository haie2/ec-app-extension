use shopify_function::prelude::JsonValue;

pub fn get<'a>(value: Option<&'a JsonValue>, key: &str) -> Option<&'a JsonValue> {
    match value {
        Some(JsonValue::Object(map)) => map.get(key),
        _ => None,
    }
}

pub fn get_json<'a>(
    value: Option<&'a serde_json::Value>,
    key: &str,
) -> Option<&'a serde_json::Value> {
    value.and_then(|value| value.get(key))
}

pub fn number_from_text(text: &str) -> f64 {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return 0.0;
    }
    trimmed.parse::<f64>().unwrap_or(f64::NAN)
}

pub fn to_number(value: Option<&JsonValue>) -> f64 {
    match value {
        None => f64::NAN,
        Some(JsonValue::Null) => 0.0,
        Some(JsonValue::Boolean(flag)) => {
            if *flag {
                1.0
            } else {
                0.0
            }
        }
        Some(JsonValue::Number(number)) => *number,
        Some(JsonValue::String(text)) => number_from_text(text),
        Some(JsonValue::Array(_)) | Some(JsonValue::Object(_)) => f64::NAN,
    }
}

pub fn json_to_number(value: Option<&serde_json::Value>) -> f64 {
    match value {
        None => f64::NAN,
        Some(serde_json::Value::Null) => 0.0,
        Some(serde_json::Value::Bool(flag)) => {
            if *flag {
                1.0
            } else {
                0.0
            }
        }
        Some(serde_json::Value::Number(number)) => number.as_f64().unwrap_or(f64::NAN),
        Some(serde_json::Value::String(text)) => number_from_text(text),
        Some(_) => f64::NAN,
    }
}

pub fn number_to_text(number: f64) -> String {
    if number.fract() == 0.0 && number.abs() < 1e15 {
        format!("{}", number as i64)
    } else {
        format!("{}", number)
    }
}

pub fn to_text_or_empty(value: Option<&JsonValue>) -> String {
    match value {
        None | Some(JsonValue::Null) => String::new(),
        Some(JsonValue::String(text)) => text.clone(),
        Some(JsonValue::Number(number)) => number_to_text(*number),
        Some(JsonValue::Boolean(flag)) => flag.to_string(),
        Some(_) => String::new(),
    }
}

pub fn json_to_text_or_empty(value: Option<&serde_json::Value>) -> String {
    match value {
        None | Some(serde_json::Value::Null) => String::new(),
        Some(serde_json::Value::String(text)) => text.clone(),
        Some(serde_json::Value::Number(number)) => {
            number.as_f64().map(number_to_text).unwrap_or_default()
        }
        Some(serde_json::Value::Bool(flag)) => flag.to_string(),
        Some(_) => String::new(),
    }
}

pub fn is_truthy(value: Option<&JsonValue>) -> bool {
    match value {
        None | Some(JsonValue::Null) => false,
        Some(JsonValue::Boolean(flag)) => *flag,
        Some(JsonValue::Number(number)) => *number != 0.0 && !number.is_nan(),
        Some(JsonValue::String(text)) => !text.is_empty(),
        Some(JsonValue::Array(_)) | Some(JsonValue::Object(_)) => true,
    }
}

pub fn as_array(value: Option<&JsonValue>) -> &[JsonValue] {
    match value {
        Some(JsonValue::Array(items)) => items.as_slice(),
        _ => &[],
    }
}

pub fn js_round(number: f64) -> f64 {
    (number + 0.5).floor()
}
