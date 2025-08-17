use serde::{Deserialize, Serialize};
use serde_json;
use wasm_bindgen::prelude::*;
use web_sys::console;

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
    pub fn new(json_string: &str) -> Self {
        let char_list = Self::parse_json(json_string);
        let name_list = Self::build_name_list(&char_list);
        Self {
            list: char_list,
            serialized_name_list: name_list,
        }
    }

    fn parse_json(json_string: &str) -> Vec<Character> {
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

    pub fn add_character(&mut self, json_string: &str) {
        self.list
            .push(serde_json::from_str::<Character>(&json_string).unwrap());
    }

    pub fn get_health(&self, index: usize) -> u8 {
        self.list[index].health
    }

    pub fn get_name(&self, index: usize) -> *const u8 {
        self.list[index].name.as_ptr()
    }

    pub fn get_name_size(&self, index: usize) -> usize {
        self.list[index].name.len()
    }

    pub fn get_subclass(&self, index: usize) -> *const u8 {
        self.list[index].subclass.as_ptr()
    }

    pub fn get_subclass_size(&self, index: usize) -> usize {
        self.list[index].subclass.len()
    }

    pub fn get_description(&self, index: usize) -> *const u8 {
        self.list[index].description.as_ptr()
    }

    pub fn get_description_size(&self, index: usize) -> usize {
        self.list[index].description.len()
    }

    pub fn get_attack(&self, index: usize) -> u8 {
        self.list[index].attack
    }

    pub fn get_defense(&self, index: usize) -> u8 {
        self.list[index].defense
    }

    pub fn get_will(&self, index: usize) -> u8 {
        self.list[index].will
    }

    pub fn get_speed(&self, index: usize) -> u8 {
        self.list[index].speed
    }

    pub fn get_is_flying(&self, index: usize) -> bool {
        self.list[index].is_flying
    }

    pub fn get_attacks(&self, index: usize) -> *const u8 {
        let mut result: Vec<u8> = Vec::new();
        for attack in &self.list[index].attacks {
            result.extend(attack.as_bytes());
            result.push(0u8);
        }
        result.as_ptr()
    }

    pub fn get_attacks_count(&self, index: usize) -> usize {
        self.list[index].attacks.len()
    }

    pub fn get_name_list(&self) -> *const u8 {
        self.serialized_name_list.as_ptr()
    }

    pub fn get_character_count(&self) -> usize {
        self.list.len()
    }
}
