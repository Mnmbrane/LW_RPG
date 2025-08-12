import * as wasm from "lw-rpg";

// Character selection functionality
class CharacterSelector {
  constructor() {
    this.characters = [];
    this.init();
  }

  async init() {
    try {
      // Wait for WASM to load
      await wasm.default();

      // Load characters from Rust
      this.loadCharacters();
    } catch (error) {
      console.error("Failed to initialize WASM:", error);
      this.showError("Failed to load application");
    }
  }

  loadCharacters() {
    try {
      // Call Rust function to get character list
      // Expected Rust function signature: get_character_list() -> *const u8 (JSON string)
      const charactersJson = wasm.get_character_list();
      this.characters = JSON.parse(charactersJson);
      this.renderCharacterList();
    } catch (error) {
      console.error("Failed to load characters:", error);
      this.showError("Failed to load characters");
    }
  }

  renderCharacterList() {
    const characterList = document.getElementById('character-list');

    if (this.characters.length === 0) {
      characterList.innerHTML = '<div class="loading">No characters found</div>';
      return;
    }

    const characterCards = this.characters.map((character, index) => {
      return `
        <div class="character-card" onclick="selectCharacter(${index})">
          <h3>${character.name}</h3>
          <div class="subclass">${character.subclass}</div>
          <div class="preview-stats">
            <span>HP: ${character.health}</span>
            <span>ATK: ${character.attack}</span>
            <span>DEF: ${character.defense}</span>
            <span>SPD: ${character.speed}</span>
          </div>
        </div>
      `;
    }).join('');

    characterList.innerHTML = characterCards;
  }

  showError(message) {
    const characterList = document.getElementById('character-list');
    characterList.innerHTML = `<div class="loading" style="color: #ff6b6b;">${message}</div>`;
  }

  selectCharacter(index) {
    // Store selected character index in localStorage
    localStorage.setItem('selectedCharacterIndex', index.toString());
    // Navigate to character viewer page
    window.location.href = 'character.html';
  }
}

// Global function for onclick handlers
window.selectCharacter = function(index) {
  characterSelector.selectCharacter(index);
};

// Initialize the character selector when page loads
const characterSelector = new CharacterSelector();
