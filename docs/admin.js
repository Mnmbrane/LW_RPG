// Admin functionality for character management

// Hash-based password protection
// Current hash is for a strong LOTR-themed password
// To generate new hash: Use the "Generate New Hash" button
const ADMIN_PASSWORD_HASH = '2043945af7a4924fc6c9ca20c1b8ec0b413475ba33d8c30daa06c1515c324d76';
const PASSWORD_SESSION_KEY = 'lw-rpg-admin-session';

let charactersData = [];
let editingCharacterIndex = -1;

// Load characters from localStorage or initialize with empty array
function loadCharactersData() {
  const saved = localStorage.getItem('lw-rpg-characters');
  if (saved) {
    charactersData = JSON.parse(saved);
  } else {
    // Initialize with existing characters from WASM (if available)
    // For now, start with empty array - you can populate from JSON later
    charactersData = [];
  }
}

// Save characters to localStorage
function saveCharactersData() {
  localStorage.setItem('lw-rpg-characters', JSON.stringify(charactersData));
}

// Populate subclass filter
function populateSubclassFilter() {
  const subclasses = new Set();
  charactersData.forEach(char => {
    if (char.subclass) subclasses.add(char.subclass);
  });
  
  const filter = document.getElementById('admin-subclass-filter');
  // Clear existing options except "All Subclasses"
  filter.innerHTML = '<option value="">All Subclasses</option>';
  
  Array.from(subclasses).sort().forEach(subclass => {
    const option = document.createElement('option');
    option.value = subclass;
    option.textContent = subclass;
    filter.appendChild(option);
  });
}

// Filter and display characters
function filterAndDisplayCharacters() {
  const searchTerm = document.getElementById('admin-search').value.toLowerCase();
  const selectedSubclass = document.getElementById('admin-subclass-filter').value;
  
  const filteredCharacters = charactersData.filter(char => {
    const matchesSearch = char.name.toLowerCase().includes(searchTerm);
    const matchesSubclass = !selectedSubclass || char.subclass === selectedSubclass;
    return matchesSearch && matchesSubclass;
  });
  
  const grid = document.getElementById('admin-character-grid');
  
  if (filteredCharacters.length === 0) {
    grid.innerHTML = '<div class="loading">No characters found matching your criteria.</div>';
  } else {
    grid.innerHTML = filteredCharacters.map((char, index) => `
      <div class="admin-character-card">
        <div class="admin-card-header">
          <div>
            <h3 class="admin-card-title">${char.name}</h3>
            <p class="admin-card-subclass">${char.subclass || 'No subclass'}</p>
          </div>
          <button class="edit-character-btn" onclick="editCharacter(${char.originalIndex || index})">Edit</button>
        </div>
        
        <div class="admin-card-stats">
          <div class="stat-item">
            <div class="stat-label">Health</div>
            <div>${char.health}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Attack</div>
            <div>${char.attack}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Defense</div>
            <div>${char.defense}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Will</div>
            <div>${char.will}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Speed</div>
            <div>${char.speed}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Flying</div>
            <div>${char.is_flying ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>
    `).join('');
  }
}

// Show character list view
function showCharacterList() {
  document.getElementById('admin-character-list').style.display = 'block';
  document.getElementById('admin-character-form').style.display = 'none';
  filterAndDisplayCharacters();
  populateSubclassFilter();
}

// Show character form view
function showCharacterForm(isEdit = false) {
  document.getElementById('admin-character-list').style.display = 'none';
  document.getElementById('admin-character-form').style.display = 'block';
  document.getElementById('form-title').textContent = isEdit ? 'Edit Character' : 'Add New Character';
  document.getElementById('delete-character-btn').style.display = isEdit ? 'block' : 'none';
}

// Clear form
function clearForm() {
  document.getElementById('character-form').reset();
  const attacksContainer = document.getElementById('attacks-container');
  attacksContainer.innerHTML = `
    <div class="attack-item">
      <textarea class="attack-input" placeholder="Enter attack or ability description..."></textarea>
      <button type="button" class="remove-attack-btn" onclick="removeAttack(this)">Remove</button>
    </div>
  `;
}

// Add new character
function addNewCharacter() {
  editingCharacterIndex = -1;
  clearForm();
  showCharacterForm(false);
}

// Edit existing character
function editCharacter(index) {
  editingCharacterIndex = index;
  const char = charactersData[index];
  
  // Populate form with character data
  document.getElementById('char-name').value = char.name || '';
  document.getElementById('char-subclass').value = char.subclass || '';
  document.getElementById('char-description').value = char.description || '';
  document.getElementById('char-health').value = char.health || 0;
  document.getElementById('char-attack').value = char.attack || 0;
  document.getElementById('char-defense').value = char.defense || 0;
  document.getElementById('char-will').value = char.will || 0;
  document.getElementById('char-speed').value = char.speed || 0;
  document.getElementById('char-flying').checked = char.is_flying || false;
  
  // Populate attacks
  const attacksContainer = document.getElementById('attacks-container');
  if (char.attacks && char.attacks.length > 0) {
    attacksContainer.innerHTML = char.attacks.map(attack => `
      <div class="attack-item">
        <textarea class="attack-input" placeholder="Enter attack or ability description...">${attack}</textarea>
        <button type="button" class="remove-attack-btn" onclick="removeAttack(this)">Remove</button>
      </div>
    `).join('');
  } else {
    clearForm();
  }
  
  showCharacterForm(true);
}

// Add attack input
function addAttack() {
  const attacksContainer = document.getElementById('attacks-container');
  const attackItem = document.createElement('div');
  attackItem.className = 'attack-item';
  attackItem.innerHTML = `
    <textarea class="attack-input" placeholder="Enter attack or ability description..."></textarea>
    <button type="button" class="remove-attack-btn" onclick="removeAttack(this)">Remove</button>
  `;
  attacksContainer.appendChild(attackItem);
}

// Remove attack input
function removeAttack(button) {
  const attacksContainer = document.getElementById('attacks-container');
  if (attacksContainer.children.length > 1) {
    button.parentElement.remove();
  } else {
    alert('At least one attack/ability is required.');
  }
}

// Save character
function saveCharacter(event) {
  event.preventDefault();
  
  // Validate form
  const form = document.getElementById('character-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  // Get form data
  const characterData = {
    name: document.getElementById('char-name').value.trim(),
    subclass: document.getElementById('char-subclass').value.trim(),
    description: document.getElementById('char-description').value.trim(),
    health: parseInt(document.getElementById('char-health').value) || 0,
    attack: parseInt(document.getElementById('char-attack').value) || 0,
    defense: parseInt(document.getElementById('char-defense').value) || 0,
    will: parseInt(document.getElementById('char-will').value) || 0,
    speed: parseInt(document.getElementById('char-speed').value) || 0,
    is_flying: document.getElementById('char-flying').checked,
    attacks: Array.from(document.querySelectorAll('.attack-input'))
      .map(input => input.value.trim())
      .filter(attack => attack.length > 0)
  };
  
  // Save or update character
  if (editingCharacterIndex >= 0) {
    // Update existing character
    charactersData[editingCharacterIndex] = characterData;
  } else {
    // Add new character
    charactersData.push(characterData);
  }
  
  // Save to localStorage
  saveCharactersData();
  
  // Return to character list
  showCharacterList();
  
  alert(editingCharacterIndex >= 0 ? 'Character updated successfully!' : 'Character added successfully!');
}

// Delete character
function deleteCharacter() {
  if (editingCharacterIndex >= 0) {
    if (confirm('Are you sure you want to delete this character? This cannot be undone.')) {
      charactersData.splice(editingCharacterIndex, 1);
      saveCharactersData();
      showCharacterList();
      alert('Character deleted successfully!');
    }
  }
}

// Password hashing function (made global for console access)
window.hashPassword = async function(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Password protection functions
function checkAdminAccess() {
  const sessionValid = sessionStorage.getItem(PASSWORD_SESSION_KEY) === 'valid';
  
  if (sessionValid) {
    showAdminInterface();
  } else {
    showPasswordModal();
  }
}

function showPasswordModal() {
  document.getElementById('password-modal').style.display = 'flex';
  document.getElementById('admin-content').style.display = 'none';
}

function showAdminInterface() {
  document.getElementById('password-modal').style.display = 'none';
  document.getElementById('admin-content').style.display = 'block';
  initializeAdmin();
}

async function handlePasswordSubmit(event) {
  event.preventDefault();
  
  const password = document.getElementById('admin-password').value;
  const errorElement = document.getElementById('password-error');
  
  try {
    const passwordHash = await window.hashPassword(password);
    
    if (passwordHash === ADMIN_PASSWORD_HASH) {
      // Set session flag (valid until browser tab closes)
      sessionStorage.setItem(PASSWORD_SESSION_KEY, 'valid');
      showAdminInterface();
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

// Initialize admin interface
function initializeAdmin() {
  loadCharactersData();
  showCharacterList();
  
  // Event listeners
  document.getElementById('add-character-btn').addEventListener('click', addNewCharacter);
  document.getElementById('cancel-edit-btn').addEventListener('click', showCharacterList);
  document.getElementById('character-form').addEventListener('submit', saveCharacter);
  document.getElementById('delete-character-btn').addEventListener('click', deleteCharacter);
  document.getElementById('add-attack-btn').addEventListener('click', addAttack);
  
  // Search and filter
  document.getElementById('admin-search').addEventListener('input', filterAndDisplayCharacters);
  document.getElementById('admin-subclass-filter').addEventListener('change', filterAndDisplayCharacters);
}

// Generate hash helper function
async function generateNewHash() {
  const newPassword = prompt('Enter the new password:');
  if (newPassword) {
    try {
      const hash = await window.hashPassword(newPassword);
      alert(`New password hash:\n\n${hash}\n\nCopy this and replace ADMIN_PASSWORD_HASH in admin.js`);
      console.log('New password hash:', hash);
    } catch (error) {
      alert('Error generating hash: ' + error.message);
    }
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Set up password form
  document.getElementById('password-form').addEventListener('submit', handlePasswordSubmit);
  
  // Set up hash generator button
  document.getElementById('generate-hash-btn').addEventListener('click', generateNewHash);
  
  // Check if user should have access
  checkAdminAccess();
});