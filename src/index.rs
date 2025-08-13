use serde::{de::Error, Deserialize, Serialize};
use serde_json;
use std::fs;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
struct Character {
    name: String,
    health: u8,
    subclass: String,
    description: String,
    attack: u8,
    defense: u8,
    will: u8,
    speed: u8,
    is_flying: bool,
    companions: Option<Vec<Character>>,
    attacks: Vec<String>,
}

pub fn parse_json() -> String {
    let json_string = fs::read_to_string("lw.json").unwrap();
    let json_string = json_string.trim_start_matches('\u{feff}').to_string();
    match serde_json::from_str::<Vec<Character>>(&json_string) {
        Ok(characters) => println!("Loaded {} characters", characters.len()),
        Err(e) => println!("JSON parse error: {}", e),
    }
    json_string
}

