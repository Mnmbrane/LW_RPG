import { CharacterList } from "lw-rpg";
import { memory } from "lw-rpg/lw_rpg_bg.wasm";

const characterList = CharacterList.new();

// Session storage functions
function saveCharacterState(index, characterData, currentView = 'character-view') {
  const state = {
    characterIndex: index,
    characterData: characterData,
    currentView: currentView,
    timestamp: Date.now()
  };
  sessionStorage.setItem('lw-rpg-state', JSON.stringify(state));
}

function loadCharacterState() {
  const saved = sessionStorage.getItem('lw-rpg-state');
  return saved ? JSON.parse(saved) : null;
}

function clearCharacterState() {
  sessionStorage.removeItem('lw-rpg-state');
}

function saveViewState(view) {
  const savedState = loadCharacterState();
  if (savedState) {
    savedState.currentView = view;
    sessionStorage.setItem('lw-rpg-state', JSON.stringify(savedState));
  }
}
const nameListPtr = characterList.get_name_list();
const listSize = characterList.get_character_count();
const nameListArray = new Uint8Array(memory.buffer, nameListPtr);

// Convert the byte array to string and split by null terminators
const decoder = new TextDecoder('utf-8');
const fullString = decoder.decode(nameListArray);
const characterNames = fullString.split('\0').filter(name => name.length > 0).slice(0, listSize);

// Add characters to the HTML list
const characterListElement = document.getElementById('character-list');
characterListElement.innerHTML = characterNames.map((name, index) =>
  `<button class="character-item" data-index="${index}">${name}</button>`
).join('');

// Check for saved state on page load
const savedState = loadCharacterState();
if (savedState && savedState.characterData) {
  if (savedState.currentView === 'character-view') {
    // Restore character view with saved data
    showCharacterView(savedState.characterData);
  } else {
    // Stay on character selection but keep the saved data
    showCharacterSelection();
  }
} else {
  // No saved state, default to character selection
  showCharacterSelection();
}

// Handle character selection
characterListElement.addEventListener('click', (event) => {
  console.log('Click detected on:', event.target);
  if (event.target.classList.contains('character-item')) {
    let selectedIndex = parseInt(event.target.dataset.index);
    let selectedName = characterNames[selectedIndex];

    console.log('Character selected:', selectedName, 'Index:', selectedIndex);

    // Get all character data and convert pointers to strings
    const decoder = new TextDecoder('utf-8');

    const namePtr = characterList.get_name(selectedIndex);
    const nameSize = characterList.get_name_size(selectedIndex);
    const subclassPtr = characterList.get_subclass(selectedIndex);
    const subclassSize = characterList.get_subclass_size(selectedIndex);
    const descriptionPtr = characterList.get_description(selectedIndex);
    const descriptionSize = characterList.get_description_size(selectedIndex);

    const name = decoder.decode(new Uint8Array(memory.buffer, namePtr, nameSize));
    const subclass = decoder.decode(new Uint8Array(memory.buffer, subclassPtr, subclassSize));
    const description = decoder.decode(new Uint8Array(memory.buffer, descriptionPtr, descriptionSize));

    // Get attacks
    const attacksPtr = characterList.get_attacks(selectedIndex);
    const attacksCount = characterList.get_attacks_count(selectedIndex);
    let attacks = [];
    if (attacksCount > 0) {
      const attacksArray = new Uint8Array(memory.buffer, attacksPtr);
      const attacksString = decoder.decode(attacksArray);
      attacks = attacksString.split('\0').filter(attack => attack.length > 0).slice(0, attacksCount);
    }

    // Create character data object
    const characterData = {
      index: selectedIndex,
      name: name,
      subclass: subclass,
      description: description,
      health: characterList.get_health(selectedIndex),
      attack: characterList.get_attack(selectedIndex),
      defense: characterList.get_defense(selectedIndex),
      will: characterList.get_will(selectedIndex),
      speed: characterList.get_speed(selectedIndex),
      isFlying: characterList.get_is_flying(selectedIndex),
      attacks: attacks
    };

    // Save state and display character view
    saveCharacterState(selectedIndex, characterData);
    showCharacterView(characterData);
  }
});

// Function to show character view and hide selection
function showCharacterView(data) {
  // Hide selection section, show character view
  document.getElementById('character-selection-section').style.display = 'none';
  document.getElementById('character-view-section').style.display = 'block';
  document.getElementById('back-button').style.display = 'block';

  // Save view state
  saveViewState('character-view');

  // Update character data
  displayCharacter(data);
}

// Function to show selection and hide character view
function showCharacterSelection() {
  document.getElementById('character-selection-section').style.display = 'block';
  document.getElementById('character-view-section').style.display = 'none';
  document.getElementById('back-button').style.display = 'none';
  
  // Save view state but don't clear character data
  saveViewState('character-selection');
}

// Function to display character data
function displayCharacter(data) {
  // Update basic info
  document.getElementById('character-name').textContent = data.name;
  document.getElementById('character-subclass').textContent = data.subclass;
  document.getElementById('character-description').textContent = data.description;

  // Update stats in input elements
  setStatValue('character-health', data.health);
  setStatValue('character-attack', data.attack);
  setStatValue('character-defense', data.defense);
  setStatValue('character-will', data.will);
  setStatValue('character-speed', data.speed);
  document.getElementById('character-flying').checked = data.isFlying;
  
  // Add change listener for checkbox to save state
  document.getElementById('character-flying').addEventListener('change', updateStoredStats);

  // Update attacks
  if (data.attacks && data.attacks.length > 0) {
    const attacksContainer = document.getElementById('character-attacks');
    attacksContainer.innerHTML = data.attacks.map(attack =>
      `<div class="ability-item">${attack}</div>`
    ).join('');
  } else {
    document.getElementById('character-attacks').innerHTML = '<div class="loading">No abilities available</div>';
  }

  // Hide companions section for now
  document.getElementById('companions-section').style.display = 'none';
}

// Back button functionality
document.getElementById('back-button').addEventListener('click', showCharacterSelection);

// Stat display functions for infinity symbol
function setStatValue(elementId, value) {
  const element = document.getElementById(elementId);
  console.log(`Setting ${elementId} to value: ${value} (type: ${typeof value})`);

  // Remove existing event listeners to prevent duplicates
  element.removeEventListener('focus', handleStatFocus);
  element.removeEventListener('blur', handleStatBlur);
  element.removeEventListener('input', handleStatInput);

  // Set the value first
  element.value = value;

  // Add event listeners
  element.addEventListener('focus', handleStatFocus);
  element.addEventListener('blur', handleStatBlur);
  element.addEventListener('input', handleStatInput);

  // Set initial display (infinity if 255)
  if (value === 255) {
    console.log(`Setting ${elementId} to infinity symbol`);
    element.type = 'text';  // Change to text to allow infinity symbol
    element.value = '∞';
  }
}

function handleStatFocus() {
  // Show actual number when focused for editing
  if (this.value === '∞') {
    this.type = 'number';  // Change back to number for editing
    this.value = '255';
  }
}

function handleStatInput() {
  // Real-time validation while typing
  if (this.type === 'number') {
    let value = parseInt(this.value);
    if (value > 255) {
      this.value = '255';
    } else if (value < 0) {
      this.value = '0';
    }
  }
}

function handleStatBlur() {
  // Validate and clamp the value to 0-255 range
  let value = parseInt(this.value) || 0;
  value = Math.max(0, Math.min(255, value));
  this.value = value;

  // Show infinity symbol when not focused if value is 255
  if (value === 255) {
    this.type = 'text';  // Change to text to allow infinity symbol
    this.value = '∞';
  }

  // Update sessionStorage with current stats
  updateStoredStats();
}

function updateStoredStats() {
  const savedState = loadCharacterState();
  if (!savedState) return;

  // Update the characterData with current values
  savedState.characterData.health = getStatValue('character-health');
  savedState.characterData.attack = getStatValue('character-attack');
  savedState.characterData.defense = getStatValue('character-defense');
  savedState.characterData.will = getStatValue('character-will');
  savedState.characterData.speed = getStatValue('character-speed');
  savedState.characterData.isFlying = document.getElementById('character-flying').checked;

  // Save back to sessionStorage
  sessionStorage.setItem('lw-rpg-state', JSON.stringify(savedState));
}

function getStatValue(elementId) {
  const element = document.getElementById(elementId);
  return element.value === '∞' ? 255 : parseInt(element.value) || 0;
}
