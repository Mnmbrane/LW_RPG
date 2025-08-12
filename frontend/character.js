import * as wasm from "lw-rpg";

// Character viewer functionality
class CharacterViewer {
  constructor() {
    this.character = null;
    this.characterIndex = null;
    this.init();
  }

  async init() {
    try {
      // Wait for WASM to load
      await wasm.default();
      
      // Get selected character index from localStorage
      this.characterIndex = localStorage.getItem('selectedCharacterIndex');
      
      if (this.characterIndex === null) {
        this.showError("No character selected");
        return;
      }

      // Load character data from Rust
      this.loadCharacter();
      this.setupEventListeners();
    } catch (error) {
      console.error("Failed to initialize WASM:", error);
      this.showError("Failed to load application");
    }
  }

  loadCharacter() {
    try {
      // Call Rust function to get specific character data
      // Expected Rust function signature: get_character_by_index(index: usize) -> *const u8 (JSON string)
      const characterJson = wasm.get_character_by_index(parseInt(this.characterIndex));
      this.character = JSON.parse(characterJson);
      this.renderCharacter();
    } catch (error) {
      console.error("Failed to load character:", error);
      this.showError("Failed to load character data");
    }
  }

  renderCharacter() {
    if (!this.character) {
      this.showError("Character not found");
      return;
    }

    // Update character header
    document.getElementById('character-name').textContent = this.character.name;
    document.getElementById('character-subclass').textContent = this.character.subclass;

    // Update character description
    document.getElementById('character-description').textContent = this.character.description;

    // Update character portrait (if available)
    const portrait = document.getElementById('character-portrait');
    if (this.character.portrait_url) {
      portrait.src = this.character.portrait_url;
      portrait.alt = `${this.character.name} Portrait`;
    } else {
      portrait.src = 'default-portrait.png';
      portrait.alt = 'Default Portrait';
    }

    // Update character stats
    document.getElementById('character-health').textContent = this.character.health;
    document.getElementById('character-attack').textContent = this.character.attack;
    document.getElementById('character-defense').textContent = this.character.defense;
    document.getElementById('character-will').textContent = this.character.will;
    document.getElementById('character-speed').textContent = this.character.speed;
    document.getElementById('character-flying').textContent = this.character.is_flying ? 'Yes' : 'No';

    // Update abilities/attacks
    this.renderAttacks();

    // Update companions (if any)
    this.renderCompanions();
  }

  renderAttacks() {
    const attacksContainer = document.getElementById('character-attacks');
    
    if (!this.character.attacks || this.character.attacks.length === 0) {
      attacksContainer.innerHTML = '<div class="loading">No abilities available</div>';
      return;
    }

    const attacksHtml = this.character.attacks.map((attack, index) => {
      return `<div class="ability-item">${attack}</div>`;
    }).join('');

    attacksContainer.innerHTML = attacksHtml;
  }

  renderCompanions() {
    const companionsSection = document.getElementById('companions-section');
    const companionsContainer = document.getElementById('character-companions');
    
    if (!this.character.companions || this.character.companions.length === 0) {
      companionsSection.style.display = 'none';
      return;
    }

    companionsSection.style.display = 'block';
    
    const companionsHtml = this.character.companions.map((companion, index) => {
      if (typeof companion === 'string') {
        return `<div class="companion-item">${companion}</div>`;
      } else {
        // If companion is an object with more details
        return `
          <div class="companion-item">
            <strong>${companion.name || 'Companion'}</strong>
            ${companion.description ? `<br>${companion.description}` : ''}
          </div>
        `;
      }
    }).join('');

    companionsContainer.innerHTML = companionsHtml;
  }

  setupEventListeners() {
    // Back button functionality
    const backButton = document.getElementById('back-button');
    if (backButton) {
      backButton.addEventListener('click', () => {
        window.location.href = 'index.html';
      });
    }
  }

  showError(message) {
    document.getElementById('character-name').textContent = 'Error';
    document.getElementById('character-subclass').textContent = message;
    document.getElementById('character-description').textContent = 'Unable to load character data. Please try again.';
    document.getElementById('character-attacks').innerHTML = `<div class="loading" style="color: #ff6b6b;">${message}</div>`;
  }
}

// Initialize the character viewer when page loads
const characterViewer = new CharacterViewer();