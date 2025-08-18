import { CharacterList } from "lw-rpg";
import { memory } from "lw-rpg/lw_rpg_bg.wasm";

let characterList;

// Session storage functions for current view state
function saveCharacterState(index, characterData, currentView = 'character-view') {
  const state = {
    characterIndex: index,
    characterData: characterData,
    currentView: currentView,
    timestamp: Date.now(),
    isNewCharacter: characterData.isNewCharacter || false
  };
  sessionStorage.setItem('lw-rpg-state', JSON.stringify(state));

  // Also save to global character states
  saveToGlobalStates(index, characterData);
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

// Global character states functions
function saveToGlobalStates(characterIndex, characterData) {
  const globalStates = JSON.parse(sessionStorage.getItem('lw-rpg-global-states') || '{}');
  globalStates[characterIndex] = {
    characterData: characterData,
    timestamp: Date.now()
  };
  sessionStorage.setItem('lw-rpg-global-states', JSON.stringify(globalStates));
}

function loadFromGlobalStates(characterIndex) {
  const globalStates = JSON.parse(sessionStorage.getItem('lw-rpg-global-states') || '{}');
  return globalStates[characterIndex] || null;
}

// Store all character data for filtering
let allCharacterData = [];
let nameListPtr, listSize, nameListArray, characterNames;

// Populate character data array and subclass filter
function populateCharacterData() {
  const decoder = new TextDecoder('utf-8');
  const subclasses = new Set();

  for (let i = 0; i < listSize; i++) {
    const namePtr = characterList.get_name(i);
    const nameSize = characterList.get_name_size(i);
    const subclassPtr = characterList.get_subclass(i);
    const subclassSize = characterList.get_subclass_size(i);

    const name = decoder.decode(new Uint8Array(memory.buffer, namePtr, nameSize));
    const subclass = decoder.decode(new Uint8Array(memory.buffer, subclassPtr, subclassSize));

    allCharacterData.push({
      index: i,
      name: name,
      subclass: subclass
    });

    subclasses.add(subclass);
  }

  // Populate subclass filter dropdown
  const subclassFilter = document.getElementById('subclass-filter');
  Array.from(subclasses).sort().forEach(subclass => {
    const option = document.createElement('option');
    option.value = subclass;
    option.textContent = subclass;
    subclassFilter.appendChild(option);
  });
}

function refreshCharacterListFromRust() {
  // Clear existing data
  allCharacterData = [];
  
  // Update list size from Rust
  listSize = characterList.get_character_count();
  
  // Update name list data
  nameListPtr = characterList.get_name_list();
  nameListArray = new Uint8Array(memory.buffer, nameListPtr);
  
  // Convert the byte array to string and split by null terminators
  const decoder = new TextDecoder('utf-8');
  const fullString = decoder.decode(nameListArray);
  characterNames = fullString.split('\0').filter(name => name.length > 0).slice(0, listSize);
  
  // Repopulate character data from Rust
  populateCharacterData();
  
  // Debug: Log the order of characters
  console.log('Character order after refresh:', allCharacterData.map((char, i) => `${i}: ${char.name}`));
  
  // Refresh the display
  filterAndDisplayCharacters();
}

async function reloadCharacterDataFromServer() {
  try {
    console.log('Reloading character data from server...');
    
    // Check if we're currently viewing a character
    const savedState = loadCharacterState();
    const currentCharacterName = savedState?.characterData?.name;
    
    // Fetch fresh JSON data
    const response = await fetch(`./lw.json?v=${Date.now()}`);
    const jsonString = await response.text();
    
    // Create new CharacterList with fresh data
    characterList = CharacterList.new(jsonString);
    
    // Clear existing data and refresh from new Rust data
    allCharacterData = [];
    refreshCharacterListFromRust();
    
    // Check if currently viewed character still exists
    if (currentCharacterName) {
      const characterStillExists = allCharacterData.some(char => char.name === currentCharacterName);
      if (!characterStillExists) {
        console.log(`Character "${currentCharacterName}" was deleted by another user`);
        // Clear the character view and go back to selection
        clearCharacterState();
        showCharacterSelection();
        alert(`The character "${currentCharacterName}" has been deleted by another user.`);
      }
    }
    
    console.log('Character data reloaded successfully');
  } catch (error) {
    console.error('Failed to reload character data:', error);
  }
}

// Filter and display characters
function filterAndDisplayCharacters() {
  const searchTerm = document.getElementById('character-search').value.toLowerCase();
  const selectedSubclass = document.getElementById('subclass-filter').value;

  const filteredCharacters = allCharacterData.filter(char => {
    const matchesSearch = char.name.toLowerCase().includes(searchTerm);
    const matchesSubclass = !selectedSubclass || char.subclass === selectedSubclass;
    return matchesSearch && matchesSubclass;
  });

  const characterListElement = document.getElementById('character-list');

  if (filteredCharacters.length === 0) {
    characterListElement.innerHTML = '<div class="loading">No characters found matching your criteria.</div>';
  } else {
    // Debug: Log the filtered characters order
    console.log('Filtered characters order:', filteredCharacters.map((char, i) => `${i}: ${char.name} (index: ${char.index})`));
    
    characterListElement.innerHTML = filteredCharacters.map(char =>
      `<div class="character-item" data-index="${char.index}">
        <h3>${char.name}</h3>
        <div class="subclass">${char.subclass}</div>
      </div>`
    ).join('');
  }
}

// Load characters dynamically and initialize
fetch(`./lw.json?v=${Date.now()}`)
  .then(response => response.text())
  .then(jsonString => {
    characterList = CharacterList.new(jsonString);

    // Initialize name list data that other functions depend on
    nameListPtr = characterList.get_name_list();
    listSize = characterList.get_character_count();
    nameListArray = new Uint8Array(memory.buffer, nameListPtr);

    // Convert the byte array to string and split by null terminators
    const decoder = new TextDecoder('utf-8');
    const fullString = decoder.decode(nameListArray);
    characterNames = fullString.split('\0').filter(name => name.length > 0).slice(0, listSize);

    // Initialize character data and display
    populateCharacterData();
    filterAndDisplayCharacters();

    // Add search and filter event listeners
    document.getElementById('character-search').addEventListener('input', filterAndDisplayCharacters);
    document.getElementById('subclass-filter').addEventListener('change', filterAndDisplayCharacters);
    document.getElementById('clear-filters-btn').addEventListener('click', () => {
      document.getElementById('character-search').value = '';
      document.getElementById('subclass-filter').value = '';
      filterAndDisplayCharacters();
    });

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
  })
  .catch(error => {
    console.error('Failed to load characters:', error);
    document.getElementById('character-list').innerHTML =
      '<div class="loading">Failed to load character data</div>';
  });

// Auto-refresh character data when user returns to page
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Page became visible, check for updates
    console.log('Page visible again, checking for character data updates...');
    reloadCharacterDataFromServer();
  }
});

// Also refresh when window regains focus
window.addEventListener('focus', () => {
  console.log('Window focused, checking for character data updates...');
  reloadCharacterDataFromServer();
});

// Manual refresh button
document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('refresh-character-list-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      console.log('Manual refresh requested');
      reloadCharacterDataFromServer();
    });
  }
});


// Handle character selection (using event delegation for dynamic content)
document.getElementById('character-list').addEventListener('click', (event) => {
  console.log('Click detected on:', event.target);

  // Find the character-item element (could be the clicked element or its parent)
  let characterItem = event.target.closest('.character-item');

  if (characterItem) {
    let selectedIndex = parseInt(characterItem.dataset.index);
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

    // Get saved state for this specific character from global states
    const globalSavedData = loadFromGlobalStates(selectedIndex);

    // Create character data object, using saved data if available
    const characterData = {
      index: selectedIndex,
      name: name,
      subclass: subclass,
      description: description,
      health: globalSavedData ? globalSavedData.characterData.health : characterList.get_health(selectedIndex),
      attack: globalSavedData ? globalSavedData.characterData.attack : characterList.get_attack(selectedIndex),
      defense: globalSavedData ? globalSavedData.characterData.defense : characterList.get_defense(selectedIndex),
      will: globalSavedData ? globalSavedData.characterData.will : characterList.get_will(selectedIndex),
      speed: globalSavedData ? globalSavedData.characterData.speed : characterList.get_speed(selectedIndex),
      isFlying: globalSavedData ? globalSavedData.characterData.isFlying : characterList.get_is_flying(selectedIndex),
      attacks: globalSavedData ? globalSavedData.characterData.attacks : attacks
    };

    // Save state and display character view
    saveCharacterState(selectedIndex, characterData);
    showCharacterView(characterData);
  }
});

// Function to show character view and hide welcome section
function showCharacterView(data) {
  // Hide welcome section, show character view
  document.getElementById('welcome-section').style.display = 'none';
  document.getElementById('character-view-section').style.display = 'block';

  // Add selected class to the character in the sidebar (only if data exists and has an index)
  if (data && data.index !== undefined) {
    updateSelectedCharacter(data.index);
  }

  // Save view state
  saveViewState('character-view');

  // Update character data (only if data exists)
  if (data) {
    displayCharacter(data);
  }
}

// Function to show welcome section and hide character view
function showCharacterSelection() {
  document.getElementById('welcome-section').style.display = 'block';
  document.getElementById('character-view-section').style.display = 'none';

  // Remove selected class from all characters
  document.querySelectorAll('.character-item').forEach(item => {
    item.classList.remove('selected');
  });

  // Update admin button state (grey out when no character selected)
  updateAdminButtonText(null);

  // Save view state but don't clear character data
  saveViewState('character-selection');
}

// Function to highlight selected character in sidebar
function updateSelectedCharacter(selectedIndex) {
  document.querySelectorAll('.character-item').forEach(item => {
    item.classList.remove('selected');
  });

  const selectedItem = document.querySelector(`[data-index="${selectedIndex}"]`);
  if (selectedItem) {
    selectedItem.classList.add('selected');
  }
}

// Function to display character data
function displayCharacter(data) {
  if (data && data.isNewCharacter) {
    // For new characters, show editable fields
    document.getElementById('character-name').style.display = 'none';
    document.getElementById('character-name-edit').style.display = 'block';
    document.getElementById('character-subclass').style.display = 'none';
    document.getElementById('character-subclass-edit').style.display = 'block';
    document.getElementById('character-description').style.display = 'none';
    document.getElementById('character-description-edit').style.display = 'block';

    // Set values in edit fields
    const nameEdit = document.getElementById('character-name-edit');
    const subclassEdit = document.getElementById('character-subclass-edit');
    const descEdit = document.getElementById('character-description-edit');

    nameEdit.value = data.name === 'New Character' ? '' : data.name || '';
    subclassEdit.value = data.subclass || '';
    descEdit.value = data.description || '';

    // Add validation event listeners for real-time validation
    nameEdit.addEventListener('input', () => updateAdminButtonText(data));
    subclassEdit.addEventListener('input', () => updateAdminButtonText(data));
    descEdit.addEventListener('input', () => updateAdminButtonText(data));
  } else {
    // For existing characters, hide editable fields and show normal displays
    document.getElementById('character-name').style.display = 'block';
    document.getElementById('character-name-edit').style.display = 'none';
    document.getElementById('character-subclass').style.display = 'block';
    document.getElementById('character-subclass-edit').style.display = 'none';
    document.getElementById('character-description').style.display = 'block';
    document.getElementById('character-description-edit').style.display = 'none';

    // Update basic info
    document.getElementById('character-name').textContent = data.name;
    document.getElementById('character-subclass').textContent = data.subclass;
    document.getElementById('character-description').textContent = data.description;
  }

  // Update stats in input elements (default to 0 if undefined)
  setStatValue('character-health', data.health ?? 0);
  setStatValue('character-attack', data.attack ?? 0);
  setStatValue('character-defense', data.defense ?? 0);
  setStatValue('character-will', data.will ?? 0);
  setStatValue('character-speed', data.speed ?? 0);
  document.getElementById('character-flying').checked = data.isFlying || false;

  // Add change listener for checkbox to save state
  const flyingCheckbox = document.getElementById('character-flying');
  flyingCheckbox.removeEventListener('change', updateStoredStats);
  flyingCheckbox.addEventListener('change', updateStoredStats);

  // Add reset button event listeners (remove existing first)
  const resetStatsBtn = document.getElementById('reset-stats-btn');
  const resetAbilitiesBtn = document.getElementById('reset-abilities-btn');
  const addAbilityBtn = document.getElementById('add-ability-btn');

  resetStatsBtn.removeEventListener('click', resetCharacterStats);
  resetStatsBtn.addEventListener('click', resetCharacterStats);

  resetAbilitiesBtn.removeEventListener('click', resetCharacterAbilities);
  resetAbilitiesBtn.addEventListener('click', resetCharacterAbilities);

  addAbilityBtn.removeEventListener('click', addNewAbility);
  addAbilityBtn.addEventListener('click', addNewAbility);

  // Add portrait upload event listeners (remove existing first)
  const uploadBtn = document.getElementById('upload-portrait-btn');
  const uploadInput = document.getElementById('portrait-upload');
  const removeBtn = document.getElementById('remove-portrait-btn');

  uploadBtn.removeEventListener('click', uploadBtnHandler);
  uploadInput.removeEventListener('change', handlePortraitUpload);
  removeBtn.removeEventListener('click', removeCustomPortrait);

  uploadBtn.addEventListener('click', uploadBtnHandler);
  uploadInput.addEventListener('change', handlePortraitUpload);
  removeBtn.addEventListener('click', removeCustomPortrait);

  // Update attacks
  if (data.attacks && data.attacks.length > 0) {
    const attacksContainer = document.getElementById('character-attacks');
    attacksContainer.innerHTML = data.attacks.map((attack, index) =>
      `<div class="ability-item">
        <textarea class="ability-text" data-attack-index="${index}" placeholder="Attack description...">${attack}</textarea>
        <button class="remove-ability-btn">×</button>
      </div>`
    ).join('');

    // Add event listeners for attack text changes
    const attackTextareas = attacksContainer.querySelectorAll('.ability-text');
    attackTextareas.forEach(textarea => {
      textarea.addEventListener('blur', updateStoredStats);
      textarea.addEventListener('input', autoResizeTextarea);
      textarea.addEventListener('input', () => updateAdminButtonText(data));
      // Auto-resize on load for existing content
      autoResizeTextarea.call(textarea);
    });
  } else {
    // If no attacks, show empty container for adding new ones
    document.getElementById('character-attacks').innerHTML = '';
  }

  // Hide companions section for now
  document.getElementById('companions-section').style.display = 'none';

  // Load custom portrait if available
  loadCustomPortrait(data.index);

  // Add event delegation for remove ability buttons
  setupRemoveAbilityListeners();

  // Update admin button text based on character type
  updateAdminButtonText(data);
}

// Check if required fields are filled for validation
function validateRequiredFields() {
  const savedState = loadCharacterState();
  if (!savedState || !savedState.characterData) return false;

  // Get current values from form
  const nameEdit = document.getElementById('character-name-edit');
  const subclassEdit = document.getElementById('character-subclass-edit');
  const descEdit = document.getElementById('character-description-edit');

  const currentName = nameEdit && nameEdit.style.display === 'block' ? nameEdit.value.trim() : savedState.characterData.name;
  const currentSubclass = subclassEdit && subclassEdit.style.display === 'block' ? subclassEdit.value.trim() : savedState.characterData.subclass;
  const currentDescription = descEdit && descEdit.style.display === 'block' ? descEdit.value.trim() : savedState.characterData.description;

  // Check abilities/attacks
  const abilityTextareas = document.querySelectorAll('.ability-text');
  const hasAbilities = Array.from(abilityTextareas).some(textarea => textarea.value.trim() !== '');

  // All required fields must be filled
  return currentName && currentSubclass && currentDescription && hasAbilities;
}

// Update admin button text and state based on character type and validation
function updateAdminButtonText(data) {
  const addCharacterBtn = document.getElementById('add-character-btn');
  const deleteCharacterBtn = document.getElementById('delete-character-btn');
  
  if (addCharacterBtn) {
    if (data && (data.isNewCharacter || data)) {
      if (data.isNewCharacter) {
        // For new characters, validate required fields
        const isValid = validateRequiredFields();
        addCharacterBtn.textContent = 'Submit Character';

        if (isValid) {
          addCharacterBtn.disabled = false;
          addCharacterBtn.style.opacity = '1';
          addCharacterBtn.style.cursor = 'pointer';
        } else {
          addCharacterBtn.disabled = true;
          addCharacterBtn.style.opacity = '0.5';
          addCharacterBtn.style.cursor = 'not-allowed';
        }
      } else {
        // For existing characters, always allow modifications
        addCharacterBtn.textContent = 'Submit Modific.';
        addCharacterBtn.disabled = false;
        addCharacterBtn.style.opacity = '1';
        addCharacterBtn.style.cursor = 'pointer';
      }
    } else {
      // No character selected - grey out button
      addCharacterBtn.textContent = 'Submit Character';
      addCharacterBtn.disabled = true;
      addCharacterBtn.style.opacity = '0.5';
      addCharacterBtn.style.cursor = 'not-allowed';
    }
  }
  
  // Update delete button state
  if (deleteCharacterBtn) {
    if (data && !data.isNewCharacter && data.index !== undefined && data.index >= 0) {
      // Enable delete for existing characters only
      deleteCharacterBtn.disabled = false;
      deleteCharacterBtn.style.opacity = '1';
      deleteCharacterBtn.style.cursor = 'pointer';
    } else {
      // Disable delete for new characters or when no character selected
      deleteCharacterBtn.disabled = true;
      deleteCharacterBtn.style.opacity = '0.5';
      deleteCharacterBtn.style.cursor = 'not-allowed';
    }
  }
}

// Back button functionality
// Back button removed in new sidebar layout

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

  // Update attacks from textareas
  const attackTextareas = document.querySelectorAll('.ability-text');
  savedState.characterData.attacks = Array.from(attackTextareas).map(textarea => textarea.value);

  // Save back to sessionStorage (current view state)
  sessionStorage.setItem('lw-rpg-state', JSON.stringify(savedState));

  // Also save to global states (persistent across character switches)
  saveToGlobalStates(savedState.characterIndex, savedState.characterData);
}

function getStatValue(elementId) {
  const element = document.getElementById(elementId);
  return element.value === '∞' ? 255 : parseInt(element.value) || 0;
}

function autoResizeTextarea() {
  this.style.height = 'auto';
  this.style.height = Math.max(40, this.scrollHeight) + 'px';
}

function resetCharacterStats() {
  if (!confirm('Reset all stats to original values?')) {
    return;
  }

  const savedState = loadCharacterState();
  if (!savedState) return;

  const characterIndex = savedState.characterIndex;

  // Get original character data from WASM
  const decoder = new TextDecoder('utf-8');

  const namePtr = characterList.get_name(characterIndex);
  const nameSize = characterList.get_name_size(characterIndex);
  const subclassPtr = characterList.get_subclass(characterIndex);
  const subclassSize = characterList.get_subclass_size(characterIndex);
  const descriptionPtr = characterList.get_description(characterIndex);
  const descriptionSize = characterList.get_description_size(characterIndex);

  const name = decoder.decode(new Uint8Array(memory.buffer, namePtr, nameSize));
  const subclass = decoder.decode(new Uint8Array(memory.buffer, subclassPtr, subclassSize));
  const description = decoder.decode(new Uint8Array(memory.buffer, descriptionPtr, descriptionSize));

  // Get original attacks
  const attacksPtr = characterList.get_attacks(characterIndex);
  const attacksCount = characterList.get_attacks_count(characterIndex);
  let attacks = [];
  if (attacksCount > 0) {
    const attacksArray = new Uint8Array(memory.buffer, attacksPtr);
    const attacksString = decoder.decode(attacksArray);
    attacks = attacksString.split('\0').filter(attack => attack.length > 0).slice(0, attacksCount);
  }

  // Create original character data
  const originalData = {
    index: characterIndex,
    name: name,
    subclass: subclass,
    description: description,
    health: characterList.get_health(characterIndex),
    attack: characterList.get_attack(characterIndex),
    defense: characterList.get_defense(characterIndex),
    will: characterList.get_will(characterIndex),
    speed: characterList.get_speed(characterIndex),
    isFlying: characterList.get_is_flying(characterIndex),
    attacks: attacks
  };

  // Update the display with original data
  displayCharacter(originalData);

  // Save the reset state
  saveCharacterState(characterIndex, originalData);
}

function resetCharacterAbilities() {
  if (!confirm('Reset all abilities to original text?')) {
    return;
  }

  const savedState = loadCharacterState();
  if (!savedState) return;

  const characterIndex = savedState.characterIndex;

  // Get original attacks from WASM
  const decoder = new TextDecoder('utf-8');
  const attacksPtr = characterList.get_attacks(characterIndex);
  const attacksCount = characterList.get_attacks_count(characterIndex);
  let originalAttacks = [];

  if (attacksCount > 0) {
    const attacksArray = new Uint8Array(memory.buffer, attacksPtr);
    const attacksString = decoder.decode(attacksArray);
    originalAttacks = attacksString.split('\0').filter(attack => attack.length > 0).slice(0, attacksCount);
  }

  // Update only the attacks in saved state (keep other edits)
  savedState.characterData.attacks = originalAttacks;

  // Rebuild the attacks display
  const attacksContainer = document.getElementById('character-attacks');
  if (originalAttacks.length > 0) {
    attacksContainer.innerHTML = originalAttacks.map((attack, index) =>
      `<div class="ability-item">
        <textarea class="ability-text" data-attack-index="${index}" placeholder="Attack description...">${attack}</textarea>
        <button class="remove-ability-btn">×</button>
      </div>`
    ).join('');

    // Re-add event listeners for the new textareas
    const attackTextareas = attacksContainer.querySelectorAll('.ability-text');
    attackTextareas.forEach(textarea => {
      textarea.addEventListener('blur', updateStoredStats);
      textarea.addEventListener('input', autoResizeTextarea);
      // Auto-resize on load for existing content
      autoResizeTextarea.call(textarea);
    });

    // Set up remove button listeners
    setupRemoveAbilityListeners();
  } else {
    // If no attacks, show empty container for adding new ones
    attacksContainer.innerHTML = '';
  }

  // Save the updated state
  sessionStorage.setItem('lw-rpg-state', JSON.stringify(savedState));
}

function addNewAbility() {
  const attacksContainer = document.getElementById('character-attacks');

  // Create new ability item
  const abilityItem = document.createElement('div');
  abilityItem.className = 'ability-item';

  const attackIndex = attacksContainer.children.length;
  abilityItem.innerHTML = `<textarea class="ability-text" data-attack-index="${attackIndex}" placeholder="Attack description..."></textarea>
    <button class="remove-ability-btn">×</button>`;

  // Add to container
  attacksContainer.appendChild(abilityItem);

  // Add event listeners to the new textarea
  const textarea = abilityItem.querySelector('.ability-text');
  textarea.addEventListener('blur', updateStoredStats);
  textarea.addEventListener('input', autoResizeTextarea);
  // Set initial height
  autoResizeTextarea.call(textarea);

  // Add validation listener for real-time validation
  const savedState = loadCharacterState();
  if (savedState && savedState.characterData) {
    textarea.addEventListener('input', () => updateAdminButtonText(savedState.characterData));
  }

  // Focus the new textarea
  textarea.focus();

  // Update stored stats to include the new empty ability
  updateStoredStats();

  // Make sure remove button listeners are set up
  setupRemoveAbilityListeners();
}

function removeAbility(button) {
  const attacksContainer = document.getElementById('character-attacks');

  // Don't allow removing if there's only one ability left
  if (attacksContainer.children.length <= 1) {
    alert('At least one ability must remain.');
    return;
  }

  // Check if the ability text is empty
  const textarea = button.parentElement.querySelector('.ability-text');
  const abilityText = textarea.value.trim();

  // Confirm removal only if there's text content
  if (abilityText.length > 0 && !confirm('Remove this ability?')) {
    return;
  }

  // Remove the ability item
  button.parentElement.remove();

  // Update the data-attack-index for remaining textareas
  const remainingTextareas = attacksContainer.querySelectorAll('.ability-text');
  remainingTextareas.forEach((textarea, index) => {
    textarea.setAttribute('data-attack-index', index);
  });

  // Update stored stats to reflect the removal
  updateStoredStats();

  // Update button validation after removing ability
  const savedState = loadCharacterState();
  if (savedState && savedState.characterData) {
    updateAdminButtonText(savedState.characterData);
  }
}

function setupRemoveAbilityListeners() {
  const attacksContainer = document.getElementById('character-attacks');

  // Remove any existing listeners to avoid duplicates
  attacksContainer.removeEventListener('click', handleRemoveAbilityClick);

  // Add event delegation for remove buttons
  attacksContainer.addEventListener('click', handleRemoveAbilityClick);
}

function handleRemoveAbilityClick(event) {
  if (event.target.classList.contains('remove-ability-btn')) {
    removeAbility(event.target);
  }
}

// Portrait upload functions
function uploadBtnHandler() {
  document.getElementById('portrait-upload').click();
}

function handlePortraitUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Check file size (limit to 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Image file too large. Please choose a file smaller than 5MB.');
    return;
  }

  // Check file type
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Image = e.target.result;
    const savedState = loadCharacterState();
    if (savedState) {
      // Store in localStorage with character-specific key
      const portraitKey = `lw-rpg-portrait-${savedState.characterIndex}`;
      localStorage.setItem(portraitKey, base64Image);

      // Update the portrait display
      document.getElementById('character-portrait').src = base64Image;

      // Show remove button, hide upload button
      document.getElementById('remove-portrait-btn').style.display = 'flex';
      document.getElementById('upload-portrait-btn').style.display = 'none';
    }
  };
  reader.readAsDataURL(file);
}

function removeCustomPortrait() {
  if (!confirm('Remove custom portrait?')) {
    return;
  }

  const savedState = loadCharacterState();
  if (savedState) {
    // Remove from localStorage
    const portraitKey = `lw-rpg-portrait-${savedState.characterIndex}`;
    localStorage.removeItem(portraitKey);

    // Reset to default image
    document.getElementById('character-portrait').src = 'default_profile.jpg';

    // Hide remove button, show upload button
    document.getElementById('remove-portrait-btn').style.display = 'none';
    document.getElementById('upload-portrait-btn').style.display = 'flex';
  }
}

function loadCustomPortrait(characterIndex) {
  const portraitKey = `lw-rpg-portrait-${characterIndex}`;
  const customPortrait = localStorage.getItem(portraitKey);

  if (customPortrait) {
    // Load custom portrait - show remove button, hide upload button
    document.getElementById('character-portrait').src = customPortrait;
    document.getElementById('remove-portrait-btn').style.display = 'flex';
    document.getElementById('upload-portrait-btn').style.display = 'none';
  } else {
    // Use default portrait - show upload button, hide remove button
    document.getElementById('character-portrait').src = 'default_profile.jpg';
    document.getElementById('remove-portrait-btn').style.display = 'none';
    document.getElementById('upload-portrait-btn').style.display = 'flex';
  }
}

// Panel state persistence
const PANEL_STATE_KEY = 'lw-rpg-panel-collapsed';

function savePanelState(isCollapsed) {
  localStorage.setItem(PANEL_STATE_KEY, isCollapsed.toString());
}

function loadPanelState() {
  const saved = localStorage.getItem(PANEL_STATE_KEY);
  return saved === 'true';
}

function setPanelState(isCollapsed) {
  const panel = document.getElementById('character-panel');
  const appLayout = document.querySelector('.app-layout');
  const showPanelBtn = document.getElementById('show-panel-btn');

  if (panel && appLayout && showPanelBtn) {
    if (isCollapsed) {
      panel.classList.add('collapsed');
      appLayout.classList.add('panel-collapsed');
      showPanelBtn.style.display = 'block';
    } else {
      panel.classList.remove('collapsed');
      appLayout.classList.remove('panel-collapsed');
      showPanelBtn.style.display = 'none';
    }
  }
}

// Panel toggle functionality
function setupPanelToggle() {
  const panelToggle = document.getElementById('panel-toggle');
  const showPanelBtn = document.getElementById('show-panel-btn');

  if (panelToggle && showPanelBtn) {
    console.log('Panel buttons found, setting up event listeners');

    // Restore saved panel state
    const savedState = loadPanelState();
    setPanelState(savedState);

    // Remove temporary classes and apply proper state
    document.documentElement.classList.remove('panel-will-be-collapsed');
    document.documentElement.classList.remove('character-will-be-shown');

    // Make panel visible now that state is applied
    const panel = document.getElementById('character-panel');
    const appLayout = document.querySelector('.app-layout');
    if (panel) {
      panel.classList.add('js-ready');
    }
    if (appLayout) {
      appLayout.classList.add('js-ready');
    }

    // Hide panel button (<<)
    panelToggle.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Hide panel clicked!');
      const panel = document.getElementById('character-panel');

      if (panel) {
        const appLayout = document.querySelector('.app-layout');
        panel.classList.add('collapsed');
        if (appLayout) appLayout.classList.add('panel-collapsed');
        showPanelBtn.style.display = 'block'; // Show the >> button
        savePanelState(true); // Save collapsed state
        console.log('Panel collapsed');
      }
    });

    // Show panel button (>>)
    showPanelBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Show panel clicked!');
      const panel = document.getElementById('character-panel');

      if (panel) {
        const appLayout = document.querySelector('.app-layout');
        panel.classList.remove('collapsed');
        if (appLayout) appLayout.classList.remove('panel-collapsed');
        showPanelBtn.style.display = 'none'; // Hide the >> button
        savePanelState(false); // Save expanded state
        console.log('Panel shown');
      }
    });

  } else {
    console.error('Panel buttons not found!');
    // Try again in a bit
    setTimeout(setupPanelToggle, 100);
  }
}

// Call setup after a short delay to ensure DOM is ready
setTimeout(setupPanelToggle, 100);

// Admin functionality
const ADMIN_PASSWORD_HASH = '2043945af7a4924fc6c9ca20c1b8ec0b413475ba33d8c30daa06c1515c324d76';
const ADMIN_SESSION_KEY = 'lw-rpg-admin-session';
let isAdminMode = false;

// Password hashing function
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Admin login functionality
function showAdminModal() {
  console.log('showAdminModal called');
  const modal = document.getElementById('admin-modal');
  console.log('Admin modal element:', modal);
  if (modal) {
    modal.style.display = 'flex';
    console.log('Admin modal should now be visible');
  } else {
    console.error('Admin modal element not found!');
  }
}

function hideAdminModal() {
  document.getElementById('admin-modal').style.display = 'none';
  document.getElementById('admin-password').value = '';
  document.getElementById('admin-password-error').style.display = 'none';
}

async function handleAdminLogin(event) {
  event.preventDefault();

  const password = document.getElementById('admin-password').value;
  const errorElement = document.getElementById('admin-password-error');

  try {
    const passwordHash = await hashPassword(password);

    if (passwordHash === ADMIN_PASSWORD_HASH) {
      // Set persistent flag (valid until manually disabled)
      localStorage.setItem(ADMIN_SESSION_KEY, 'valid');

      // Try to decrypt GitHub token for this admin using password hash
      console.log('🔍 Debug: Looking for token with hash:', passwordHash);
      console.log('🔍 Debug: Available token keys:', Object.keys(ADMIN_TOKENS));
      
      const encryptedToken = ADMIN_TOKENS[passwordHash];
      console.log('🔍 Debug: Found encrypted token:', !!encryptedToken);
      
      if (encryptedToken) {
        console.log('🔍 Debug: Attempting decryption with password...');
        const githubToken = decryptGitHubToken(encryptedToken, password);
        console.log('🔍 Debug: Decryption successful:', !!githubToken);
        
        if (githubToken) {
          GITHUB_CONFIG.token = githubToken;
          // Save token persistently for this admin session
          sessionStorage.setItem('lw-rpg-github-token', githubToken);
          console.log('✅ GitHub token loaded and saved for admin');
          console.log('🔍 Debug: Token starts with:', githubToken.substring(0, 10));
        } else {
          console.warn('❌ Failed to decrypt GitHub token');
        }
      } else {
        console.warn('❌ No GitHub token found for this admin');
        console.log('🔍 Debug: Expected hash:', passwordHash);
        console.log('🔍 Debug: Available hashes:', Object.keys(ADMIN_TOKENS));
      }

      enableAdminMode();
      hideAdminModal();
    } else {
      errorElement.style.display = 'block';
      document.getElementById('admin-password').value = '';
      document.getElementById('admin-password').focus();
    }
  } catch (error) {
    console.error('Password hashing failed:', error);
    errorElement.textContent = 'Authentication error. Please try again.';
    errorElement.style.display = 'block';
  }
}

function enableAdminMode() {
  isAdminMode = true;
  document.getElementById('admin-controls').style.display = 'block';

  // Add class to character sheet for proper spacing
  const characterSheet = document.querySelector('.character-sheet');
  if (characterSheet) {
    characterSheet.classList.add('admin-mode-active');
  }

  // Change admin button text
  const adminLink = document.getElementById('admin-link');
  adminLink.textContent = 'Admin Mode: ON';
  adminLink.style.background = '#28a745';
  adminLink.style.color = 'white';
  adminLink.style.borderColor = '#28a745';
}

function disableAdminMode() {
  isAdminMode = false;
  localStorage.removeItem(ADMIN_SESSION_KEY);
  // Clear GitHub token when exiting admin mode
  sessionStorage.removeItem('lw-rpg-github-token');
  GITHUB_CONFIG.token = '';
  document.getElementById('admin-controls').style.display = 'none';

  // Remove class from character sheet
  const characterSheet = document.querySelector('.character-sheet');
  if (characterSheet) {
    characterSheet.classList.remove('admin-mode-active');
  }

  // Reset admin button
  const adminLink = document.getElementById('admin-link');
  adminLink.textContent = 'Admin Mode: OFF';
  adminLink.style.background = 'none';
  adminLink.style.color = '#6c757d';
  adminLink.style.borderColor = '#6c757d';
}

function checkAdminSession() {
  const sessionValid = localStorage.getItem(ADMIN_SESSION_KEY) === 'valid';
  if (sessionValid) {
    // Restore GitHub token if available
    const savedToken = sessionStorage.getItem('lw-rpg-github-token');
    if (savedToken) {
      GITHUB_CONFIG.token = savedToken;
      console.log('🔄 GitHub token restored from session');
    }
    enableAdminMode();
  }
}

function submitCharacterToJSON() {
  const savedState = loadCharacterState();
  if (!savedState || !savedState.characterData) {
    alert('No character selected or character data not available.');
    return;
  }

  // Ensure all stat inputs have default values
  ensureStatDefaults();

  // Update character data if it's a new character
  let characterData = savedState.characterData;
  if (savedState.isNewCharacter) {
    const updated = updateNewCharacterData();
    if (updated) {
      characterData = updated;
    }
  }

  // Get current character data - ALWAYS check edit fields first if they're visible
  let currentName, currentSubclass, currentDescription;

  // Check if edit fields exist and are visible
  const nameEdit = document.getElementById('character-name-edit');
  const subclassEdit = document.getElementById('character-subclass-edit');
  const descEdit = document.getElementById('character-description-edit');

  const nameEditVisible = nameEdit && nameEdit.style.display === 'block';
  const subclassEditVisible = subclassEdit && subclassEdit.style.display === 'block';
  const descEditVisible = descEdit && descEdit.style.display === 'block';

  console.log('=== CHECKING EDIT FIELDS ===');
  console.log('Name edit visible:', nameEditVisible);
  console.log('Subclass edit visible:', subclassEditVisible);
  console.log('Description edit visible:', descEditVisible);

  // Use edit field values if visible, otherwise use stored data
  currentName = nameEditVisible ? nameEdit.value.trim() : characterData.name;
  currentSubclass = subclassEditVisible ? subclassEdit.value.trim() : characterData.subclass;
  currentDescription = descEditVisible ? descEdit.value.trim() : characterData.description;

  console.log('=== VALUES BEING USED ===');
  console.log('Using name:', `"${currentName}"`);
  console.log('Using subclass:', `"${currentSubclass}"`);
  console.log('Using description:', `"${currentDescription}"`);
  console.log('From edit fields:', nameEditVisible || subclassEditVisible || descEditVisible);

  // Get current character stats from form
  const updatedCharacter = {
    name: currentName,
    subclass: currentSubclass,
    description: currentDescription,
    health: getStatValueWithDefault('character-health'),
    attack: getStatValueWithDefault('character-attack'),
    defense: getStatValueWithDefault('character-defense'),
    will: getStatValueWithDefault('character-will'),
    speed: getStatValueWithDefault('character-speed'),
    is_flying: document.getElementById('character-flying').checked,
    attacks: getCurrentAbilitiesList(),
    companions: characterData.companions || []
  };

  // Debug: Log the character data before validation
  console.log('Character data before validation:', updatedCharacter);
  console.log('Is new character:', savedState.isNewCharacter);

  // EMERGENCY DEBUG - Check input fields manually
  console.log('=== EMERGENCY DEBUG ===');
  const testNameEdit = document.getElementById('character-name-edit');
  const testSubclassEdit = document.getElementById('character-subclass-edit');
  const testDescEdit = document.getElementById('character-description-edit');

  console.log('Name edit exists:', !!testNameEdit);
  console.log('Name edit value:', testNameEdit ? `"${testNameEdit.value}"` : 'FIELD NOT FOUND');
  console.log('Name edit visible:', testNameEdit ? testNameEdit.style.display : 'N/A');

  console.log('Subclass edit exists:', !!testSubclassEdit);
  console.log('Subclass edit value:', testSubclassEdit ? `"${testSubclassEdit.value}"` : 'FIELD NOT FOUND');

  console.log('Description edit exists:', !!testDescEdit);
  console.log('Description edit value:', testDescEdit ? `"${testDescEdit.value}"` : 'FIELD NOT FOUND');

  // Comprehensive validation
  const validation = validateCharacterForSubmission(updatedCharacter, savedState.isNewCharacter);

  console.log('Validation result:', validation);

  if (!validation.isValid) {
    const errorMessage = 'Please fix the following issues before submitting:\n\n' +
      validation.errors.map((error, index) => `${index + 1}. ${error}`).join('\n');
    console.error('Validation errors:', validation.errors);
    alert(errorMessage);
    return;
  }

  // Use the validated character data
  const validatedCharacter = validation.characterData;

  // Show confirmation
  const confirmation = confirm(
    `Submit character "${validatedCharacter.name}"?` +
    `Character Summary:\n` +
    `• Name: ${validatedCharacter.name}\n` +
    `• Subclass: ${validatedCharacter.subclass}\n` +
    `• Health: ${validatedCharacter.health}, Attack: ${validatedCharacter.attack}, Defense: ${validatedCharacter.defense}\n` +
    `• Will: ${validatedCharacter.will}, Speed: ${validatedCharacter.speed}\n` +
    `• Flying: ${validatedCharacter.is_flying ? 'Yes' : 'No'}\n` +
    `• Abilities: ${validatedCharacter.attacks.length} total`
  );

  if (confirmation) {
    // In a real implementation, this would submit to GitHub API
    console.log('Character data to submit:', validatedCharacter);

    // For now, just show success message and save to localStorage with special key
    const submissionKey = `lw-rpg-submitted-${Date.now()}`;
    localStorage.setItem(submissionKey, JSON.stringify({
      character: validatedCharacter,
      timestamp: new Date().toISOString(),
      status: 'pending_submission',
      isNewCharacter: savedState.isNewCharacter || false,
      validationPassed: true
    }));

    alert(`Character "${validatedCharacter.name}" has been validated and prepared for submission!\n\nThe character data has been saved locally and is ready to be added to the main JSON file.`);
  }
}

function getCurrentAbilitiesList() {
  const abilities = [];
  const abilityItems = document.querySelectorAll('.ability-item textarea');
  console.log('Found ability textareas:', abilityItems.length);
  abilityItems.forEach((textarea, index) => {
    const value = textarea.value.trim();
    console.log(`Ability ${index + 1}:`, value);
    if (value) {
      abilities.push(value);
    }
  });
  console.log('Final abilities array:', abilities);
  return abilities;
}

// Comprehensive character validation function
function validateCharacterForSubmission(characterData, isNewCharacter = false) {
  const errors = [];

  // 1. Name validation
  if (!characterData.name || characterData.name.trim() === '') {
    errors.push('Character name is required');
  }

  // 2. Subclass validation
  if (!characterData.subclass || characterData.subclass.trim() === '') {
    errors.push('Subclass is required');
  }

  // 3. Description validation
  if (!characterData.description || characterData.description.trim() === '') {
    errors.push('Description is required');
  }

  // 4. At least one ability/attack validation
  if (!characterData.attacks || characterData.attacks.length === 0 ||
    (characterData.attacks.length === 1 && characterData.attacks[0].trim() === '')) {
    errors.push('At least one ability or attack is required');
  }

  // 5. Stat validation (0-255 inclusive)
  const stats = ['health', 'attack', 'defense', 'will', 'speed'];
  stats.forEach(stat => {
    const value = characterData[stat];
    if (value === undefined || value === null || value === '') {
      // Default to 0 if empty
      characterData[stat] = 0;
    } else {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 255) {
        errors.push(`${stat.charAt(0).toUpperCase() + stat.slice(1)} must be between 0 and 255 (got: ${value})`);
      } else {
        characterData[stat] = numValue; // Ensure it's stored as number
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors,
    characterData: characterData
  };
}

// Get stat value with default to 0
function getStatValueWithDefault(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return 0;

  if (element.value === '∞') return 255;

  const value = parseInt(element.value);
  return isNaN(value) ? 0 : Math.max(0, Math.min(255, value));
}

// Ensure all stat inputs have default values
function ensureStatDefaults() {
  const statInputs = ['character-health', 'character-attack', 'character-defense', 'character-will', 'character-speed'];

  statInputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    if (input && (input.value === '' || input.value === null || input.value === undefined)) {
      input.value = '0';
    }
  });
}

// Create a new blank character
function createNewCharacter() {
  const newCharacter = {
    name: "",
    subclass: "",
    description: "",
    health: 0,
    attack: 0,
    defense: 0,
    will: 0,
    speed: 0,
    is_flying: false,
    attacks: [""],
    companions: [],
    isNewCharacter: true
  };

  // Create a temporary character state
  const newCharacterState = {
    characterIndex: -1, // Special index for new characters
    characterData: newCharacter,
    currentView: 'character-view',
    timestamp: Date.now(),
    isNewCharacter: true
  };

  // Save this state and show the character
  saveCharacterState(-1, newCharacter, 'character-view');

  // Show the character view section with the new character data
  showCharacterView(newCharacterState);

  // Make character name editable
  makeCharacterNameEditable();
}

function makeCharacterNameEditable() {
  console.log('makeCharacterNameEditable called');

  // Hide display elements and show edit fields
  document.getElementById('character-name').style.display = 'none';
  document.getElementById('character-subclass').style.display = 'none';
  document.getElementById('character-description').style.display = 'none';

  // Show edit fields
  const nameEdit = document.getElementById('character-name-edit');
  const subclassEdit = document.getElementById('character-subclass-edit');
  const descEdit = document.getElementById('character-description-edit');

  nameEdit.style.display = 'block';
  subclassEdit.style.display = 'block';
  descEdit.style.display = 'block';

  // Set default values
  nameEdit.value = '';
  subclassEdit.value = '';
  descEdit.value = '';

  // Focus on name field
  nameEdit.focus();
  nameEdit.select();

  console.log('Edit fields shown and focused');
}

function updateNewCharacterData() {
  const savedState = loadCharacterState();
  if (!savedState || !savedState.isNewCharacter) return;

  const nameInput = document.getElementById('character-name-edit');
  const subclassInput = document.getElementById('character-subclass-edit');
  const descriptionInput = document.getElementById('character-description-edit');

  console.log('updateNewCharacterData - Name input:', nameInput);
  console.log('updateNewCharacterData - Subclass input:', subclassInput);
  console.log('updateNewCharacterData - Description input:', descriptionInput);

  if (nameInput) console.log('Name value:', nameInput.value);
  if (subclassInput) console.log('Subclass value:', subclassInput.value);
  if (descriptionInput) console.log('Description value:', descriptionInput.value);

  const updatedCharacter = {
    ...savedState.characterData,
    name: nameInput ? nameInput.value.trim() : savedState.characterData.name,
    subclass: subclassInput ? subclassInput.value.trim() : savedState.characterData.subclass,
    description: descriptionInput ? descriptionInput.value.trim() : savedState.characterData.description,
    health: parseInt(document.getElementById('character-health').value) || 0,
    attack: parseInt(document.getElementById('character-attack').value) || 0,
    defense: parseInt(document.getElementById('character-defense').value) || 0,
    will: parseInt(document.getElementById('character-will').value) || 0,
    speed: parseInt(document.getElementById('character-speed').value) || 0,
    is_flying: document.getElementById('character-flying').checked,
    attacks: getCurrentAbilitiesList().length > 0 ? getCurrentAbilitiesList() : [""]
  };

  console.log('Updated character after updateNewCharacterData:', updatedCharacter);

  // Update the saved state
  saveCharacterState(-1, updatedCharacter, 'character-view');

  return updatedCharacter;
}

// Add character to the main character list or submit modifications
async function addCharacterToList() {
  const savedState = loadCharacterState();
  if (!savedState || !savedState.characterData) {
    alert('No character data available.');
    return;
  }

  const isNewCharacter = savedState.isNewCharacter;

  // Get current character data from the form
  const nameEdit = document.getElementById('character-name-edit');
  const subclassEdit = document.getElementById('character-subclass-edit');
  const descEdit = document.getElementById('character-description-edit');

  const currentName = nameEdit && nameEdit.style.display === 'block' ? nameEdit.value.trim() : savedState.characterData.name;
  const currentSubclass = subclassEdit && subclassEdit.style.display === 'block' ? subclassEdit.value.trim() : savedState.characterData.subclass;
  const currentDescription = descEdit && descEdit.style.display === 'block' ? descEdit.value.trim() : savedState.characterData.description;

  if (isNewCharacter) {
    // Validate required fields for new characters
    if (!currentName || !currentSubclass || !currentDescription) {
      alert('Please fill in all required fields: Name, Subclass, and Description');
      return;
    }

    // Create the new character object
    const newCharacter = {
      name: currentName,
      subclass: currentSubclass,
      description: currentDescription,
      health: getStatValueWithDefault('character-health'),
      attack: getStatValueWithDefault('character-attack'),
      defense: getStatValueWithDefault('character-defense'),
      will: getStatValueWithDefault('character-will'),
      speed: getStatValueWithDefault('character-speed'),
      is_flying: document.getElementById('character-flying').checked,
      companions: null,
      attacks: getCurrentAbilitiesList().length > 0 ? getCurrentAbilitiesList() : [""]
    };

    // Call Rust add_character method
    characterList.add_character(JSON.stringify(newCharacter));

    // Refresh all character data from Rust to ensure sync
    refreshCharacterListFromRust();

    // Commit new character to GitHub
    await commitToGitHub('add', currentName);
  } else {
    // Handle existing character modifications - confirm global commit
    const confirmCommit = confirm(
      `Are you sure you want to commit changes to "${currentName}" globally?\n\n` +
      `This will update the main JSON file and deploy to GitHub Pages.\n\n` +
      `Changes will be visible to all users.`
    );

    if (confirmCommit) {
      await commitToGitHub('modify', currentName);
    }
  }
}

// Delete character from the main character list
async function deleteCharacterFromList() {
  const savedState = loadCharacterState();
  if (!savedState || !savedState.characterData || savedState.characterData.isNewCharacter) {
    alert('No existing character selected for deletion.');
    return;
  }

  const characterName = savedState.characterData.name;
  const characterIndex = savedState.characterData.index;

  // Confirm deletion
  const confirmDelete = confirm(
    `Are you sure you want to permanently delete "${characterName}"?\n\n` +
    `This action cannot be undone and will:\n` +
    `• Remove the character from the main JSON file\n` +
    `• Deploy the changes to GitHub Pages\n` +
    `• Make the deletion visible to all users\n\n` +
    `Type the character name to confirm deletion.`
  );

  if (!confirmDelete) return;

  // Double confirmation with name typing
  const typedName = prompt(`To confirm deletion, please type the character name exactly: "${characterName}"`);
  if (typedName !== characterName) {
    alert('Character name does not match. Deletion cancelled.');
    return;
  }

  try {
    // Show loading state
    const deleteBtn = document.getElementById('delete-character-btn');
    if (deleteBtn) {
      deleteBtn.disabled = true;
      deleteBtn.style.opacity = '0.7';
    }

    // Call Rust delete_character method
    characterList.delete_character(characterIndex);

    // Refresh all character data from Rust to ensure sync
    refreshCharacterListFromRust();

    // Clear the character view and go back to selection
    clearCharacterState();
    showCharacterSelection();

    // Commit deletion to GitHub
    await commitToGitHub('delete', characterName);

  } catch (error) {
    console.error('Character deletion error:', error);
    alert(`Failed to delete character: ${error.message}\n\nDeletion has been cancelled.`);
    
    // Restore button state on error
    const deleteBtn = document.getElementById('delete-character-btn');
    if (deleteBtn) {
      deleteBtn.disabled = false;
      deleteBtn.style.opacity = '1';
    }
  }
}

// Encrypted admin tokens (password hash -> encrypted token)
const ADMIN_TOKENS = {
  '2043945af7a4924fc6c9ca20c1b8ec0b413475ba33d8c30daa06c1515c324d76':
    'U2FsdGVkX19eEbrQN8S+69quV4Zp2AqI2d8Zro8L7NQlu1BC/EoJ/AXUmnMPjz8sHY49sYSSR6iQvpq8TkJ/gXCNE0WK6GkazQrCiH93A3z1vE+ztBoqIdXcEqcafCztzSQFuc6fyYSyUaB9WVQkJg=='
};

// Token encryption/decryption functions
function encryptGitHubToken(token, password) {
  if (typeof CryptoJS === 'undefined') {
    console.error('CryptoJS not loaded yet. Make sure the page is fully loaded.');
    return null;
  }
  return CryptoJS.AES.encrypt(token, password).toString();
}

function decryptGitHubToken(encryptedToken, password) {
  try {
    if (typeof CryptoJS === 'undefined') {
      console.error('CryptoJS not loaded yet.');
      return null;
    }
    const decrypted = CryptoJS.AES.decrypt(encryptedToken, password);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Failed to decrypt token:', error);
    return null;
  }
}

// Make functions globally available for console use
window.encryptGitHubToken = encryptGitHubToken;
window.decryptGitHubToken = decryptGitHubToken;
window.hashPassword = hashPassword;

// Helper function to check if everything is ready
window.checkCryptoReady = function() {
  console.log('CryptoJS available:', typeof CryptoJS !== 'undefined');
  console.log('encryptGitHubToken available:', typeof window.encryptGitHubToken === 'function');
  console.log('decryptGitHubToken available:', typeof window.decryptGitHubToken === 'function');

  if (typeof CryptoJS !== 'undefined') {
    console.log('✅ Ready to encrypt/decrypt tokens!');
    console.log('Usage: encryptGitHubToken("your_token", "your_password")');
  } else {
    console.log('❌ CryptoJS not loaded yet. Wait for page to fully load.');
  }
};

// GitHub configuration
const GITHUB_CONFIG = {
  owner: 'Mnmbrane',
  repo: 'LW_RPG',
  token: '', // Will be set dynamically after admin login
  filePath: 'lw.json'
};

// Make variables globally available for debugging
window.GITHUB_CONFIG = GITHUB_CONFIG;
window.ADMIN_TOKENS = ADMIN_TOKENS;

// Commit to GitHub using Rust-prepared data
async function commitToGitHub(action, characterName) {
  try {
    // Check if GitHub token is available
    if (!GITHUB_CONFIG.token) {
      throw new Error('GitHub token not available. Please ensure your admin account has GitHub access configured.');
    }

    // Show loading state
    const addCharacterBtn = document.getElementById('add-character-btn');
    if (addCharacterBtn) {
      addCharacterBtn.textContent = 'Committing...';
      addCharacterBtn.disabled = true;
      addCharacterBtn.style.opacity = '0.7';
    }

    // Get prepared data from Rust
    const updatedJson = characterList.get_updated_json();
    const commitMessage = characterList.get_commit_message(action);

    // Step 1: Get current file content from GitHub
    const fileResponse = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.filePath}`, {
      headers: {
        'Authorization': `token ${GITHUB_CONFIG.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.status}`);
    }

    const fileData = await fileResponse.json();

    // Step 2: Commit the updated content
    const updateResponse = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_CONFIG.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: btoa(unescape(encodeURIComponent(updatedJson))),
        sha: fileData.sha,
        committer: {
          name: 'LW Admin',
          email: 'admin@lw-rpg.com'
        }
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to commit: ${updateResponse.status}`);
    }

    // Success handling
    if (action === 'add') {
      // Clear the new character state
      clearCharacterState();
      // Show the character selection view
      showCharacterSelection();
      alert(`Character "${characterName}" has been added and committed to GitHub!\n\nChanges will be live on GitHub Pages shortly.`);
    } else {
      alert(`Changes to "${characterName}" have been committed to GitHub!\n\nChanges will be live on GitHub Pages shortly.`);
    }

  } catch (error) {
    console.error('GitHub commit error:', error);
    alert(`Failed to commit to GitHub: ${error.message}\n\nChanges have been saved locally only.`);
  } finally {
    // Restore button state
    const addCharacterBtn = document.getElementById('add-character-btn');
    if (addCharacterBtn) {
      const savedState = loadCharacterState();
      if (savedState && savedState.characterData) {
        updateAdminButtonText(savedState.characterData);
      }
    }
  }
}

// Set up admin event listeners
function setupAdminEventListeners() {
  const adminLink = document.getElementById('admin-link');
  const adminLoginForm = document.getElementById('admin-login-form');
  const cancelAdminBtn = document.getElementById('cancel-admin-btn');
  const addNewCharacterBtn = document.getElementById('add-new-character-btn');
  const addCharacterBtn = document.getElementById('add-character-btn');
  const deleteCharacterBtn = document.getElementById('delete-character-btn');

  if (!adminLink || !adminLoginForm || !cancelAdminBtn || !addNewCharacterBtn || !addCharacterBtn || !deleteCharacterBtn) {
    // Elements not ready yet, try again in a bit
    setTimeout(setupAdminEventListeners, 100);
    return;
  }

  // Admin link click
  adminLink.addEventListener('click', function() {
    console.log('Admin button clicked, isAdminMode:', isAdminMode);
    if (isAdminMode) {
      // If already in admin mode, show options or toggle off
      const action = confirm('Exit admin mode?');
      if (action) {
        disableAdminMode();
      }
    } else {
      showAdminModal();
    }
  });

  // Admin login form
  adminLoginForm.addEventListener('submit', handleAdminLogin);

  // Cancel admin login
  cancelAdminBtn.addEventListener('click', hideAdminModal);

  // Admin controls
  addNewCharacterBtn.addEventListener('click', createNewCharacter);
  addCharacterBtn.addEventListener('click', addCharacterToList);
  deleteCharacterBtn.addEventListener('click', deleteCharacterFromList);

  // Check for existing admin session
  checkAdminSession();

  console.log('Admin event listeners set up successfully');
}

// Check if DOM is already loaded, otherwise wait for it
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAdminEventListeners);
} else {
  // DOM is already loaded, set up immediately
  setupAdminEventListeners();
}
