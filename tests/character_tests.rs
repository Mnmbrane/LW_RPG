use lw_rpg::CharacterList;

#[test] 
fn test_append_and_get_lw_json() {
    let mut char_list = CharacterList::new();
    let initial_count = char_list.get_character_count();

    let test_character = r#"{
        "name": "Test Warrior",
        "health": 25,
        "subclass": "Test Fighter",
        "description": "A test character for unit testing",
        "attack": 6,
        "defense": 4,
        "will": 8,
        "speed": 7,
        "is_flying": false,
        "attacks": [
            "Sword Strike - 8 - basic melee attack within 1 pace",
            "Shield Bash - 4 - stun enemy for one turn within 1 pace"
        ]
    }"#;

    let result = char_list.append_and_get_lw_json(test_character);

    assert!(result.is_ok(), "append_and_get_lw_json should succeed");

    let json_output = result.unwrap();
    println!("Generated JSON output:");
    println!("{}", json_output);
    assert!(
        json_output.contains("The Archangel"),
        "Should contain first character"
    );
    assert!(
        json_output.contains("The Enemy"),
        "Should contain second character"
    );
    assert!(
        json_output.contains("Test Warrior"),
        "Should contain newly added test character"
    );

    assert_eq!(
        char_list.get_character_count(),
        initial_count + 1,
        "Character count should increase by 1"
    );
    assert!(
        char_list.has_new_characters(),
        "Should mark as having new characters"
    );
}

#[test]
fn test_append_invalid_json() {
    let mut char_list = CharacterList::new();
    let invalid_json = r#"{"invalid": "json structure"}"#;

    let result = char_list.append_and_get_lw_json(invalid_json);
    assert!(result.is_err(), "Should fail with invalid JSON structure");
}