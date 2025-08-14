import { CharacterList } from "lw-rpg";
import { memory } from "lw-rpg/lw_rpg_bg.wasm";

const characterList = CharacterList.new();
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

    // Display character view
    showCharacterView(characterData);
  }
});

// Function to show character view and hide selection
function showCharacterView(data) {
  // Hide selection section, show character view
  document.getElementById('character-selection-section').style.display = 'none';
  document.getElementById('character-view-section').style.display = 'block';
  document.getElementById('back-button').style.display = 'block';

  // Update character data
  displayCharacter(data);
}

// Function to show selection and hide character view
function showCharacterSelection() {
  document.getElementById('character-selection-section').style.display = 'block';
  document.getElementById('character-view-section').style.display = 'none';
  document.getElementById('back-button').style.display = 'none';
}

// Function to display character data
function displayCharacter(data) {
  // Update basic info
  document.getElementById('character-name').textContent = data.name;
  document.getElementById('character-subclass').textContent = data.subclass;
  document.getElementById('character-description').textContent = data.description;

  // Update stats in input elements
  document.getElementById('character-health').value = data.health;
  document.getElementById('character-attack').value = data.attack;
  document.getElementById('character-defense').value = data.defense;
  document.getElementById('character-will').value = data.will;
  document.getElementById('character-speed').value = data.speed;
  document.getElementById('character-flying').checked = data.isFlying;

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


