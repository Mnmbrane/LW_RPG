use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
struct Characters {
    char_names: Vec<String>,
    healths: Vec<u8>,
    subclasses: Vec<String>,
    descriptions: Vec<String>,
    attacks: Vec<u8>,
}

#[wasm_bindgen]
impl Characters {
    pub fn get_character_list(&self) -> *const u8 {
        todo!("flatten char names and output it")
    }

    pub fn parse_json(&mut self) {
        todo!("Parse json and populate Character")
    }
}

