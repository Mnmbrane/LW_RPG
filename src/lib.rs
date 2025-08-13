use serde::{Deserialize, Serialize};
use serde_json;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Debug)]
pub struct Character {
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

#[wasm_bindgen]
#[derive(Debug)]
pub struct CharacterList {
    list: Vec<Character>,
    serialized_name_list: Vec<u8>,
}

#[wasm_bindgen]
impl CharacterList {
    pub fn new() -> Self {
        let char_list = Self::parse_json();
        let name_list = Self::build_name_list(&char_list);
        Self {
            list: char_list,
            serialized_name_list: name_list,
        }
    }

    fn parse_json() -> Vec<Character> {
        let json_string: &str = include_str!("../lw.json");
        let json_string = json_string.trim_start_matches('\u{feff}').to_string();
        match serde_json::from_str::<Vec<Character>>(&json_string) {
            Ok(characters) => characters,
            Err(e) => panic!("JSON parse error: {}", e),
        }
    }

    fn build_name_list(char_list: &Vec<Character>) -> Vec<u8> {
        let mut result: Vec<u8> = Vec::new();
        for character in char_list {
            result.extend(character.name.as_bytes());
            result.push(0u8);
        }
        result
    }

    pub fn get_name_list(&self) -> *const u8 {
        self.serialized_name_list.as_ptr()
    }

    pub fn get_character_count(&self) -> usize {
        self.list.len()
    }
}
