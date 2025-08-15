import { CharacterList } from "lw-rpg";
import { memory } from "lw-rpg/lw_rpg_bg.wasm";

const characterList = CharacterList.new();

// Session storage functions for current view state
function saveCharacterState(index, characterData, currentView = 'character-view') {
  const state = {
    characterIndex: index,
    characterData: characterData,
    currentView: currentView,
    timestamp: Date.now()
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
const nameListPtr = characterList.get_name_list();
const listSize = characterList.get_character_count();
const nameListArray = new Uint8Array(memory.buffer, nameListPtr);

// Convert the byte array to string and split by null terminators
const decoder = new TextDecoder('utf-8');
const fullString = decoder.decode(nameListArray);
const characterNames = fullString.split('\0').filter(name => name.length > 0).slice(0, listSize);

// Store all character data for filtering
let allCharacterData = [];

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
    characterListElement.innerHTML = filteredCharacters.map(char =>
      `<div class="character-item" data-index="${char.index}">
        <h3>${char.name}</h3>
        <div class="subclass">${char.subclass}</div>
      </div>`
    ).join('');
  }
}

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

  // Add selected class to the character in the sidebar
  updateSelectedCharacter(data.index);

  // Save view state
  saveViewState('character-view');

  // Update character data
  displayCharacter(data);
}

// Function to show welcome section and hide character view
function showCharacterSelection() {
  document.getElementById('welcome-section').style.display = 'block';
  document.getElementById('character-view-section').style.display = 'none';

  // Remove selected class from all characters
  document.querySelectorAll('.character-item').forEach(item => {
    item.classList.remove('selected');
  });

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
    });
  } else {
    document.getElementById('character-attacks').innerHTML = '<div class="loading">No abilities available</div>';
  }

  // Hide companions section for now
  document.getElementById('companions-section').style.display = 'none';

  // Load custom portrait if available
  loadCustomPortrait(data.index);
  
  // Add event delegation for remove ability buttons
  setupRemoveAbilityListeners();
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
  this.style.height = (this.scrollHeight) + 'px';
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
    });
    
    // Set up remove button listeners
    setupRemoveAbilityListeners();
  } else {
    attacksContainer.innerHTML = '<div class="loading">No abilities available</div>';
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
