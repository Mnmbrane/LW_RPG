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
    const selectedIndex = event.target.dataset.index;
    const selectedName = characterNames[selectedIndex];

    console.log('Character selected:', selectedName, 'Index:', selectedIndex);

    // Store selected character data
    localStorage.setItem('selectedCharacterIndex', selectedIndex);
    localStorage.setItem('selectedCharacterName', selectedName);

    // Navigate to character page
    console.log('Navigating to character.html');
    window.location.href = 'character.html';
  }
});

