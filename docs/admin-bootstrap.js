import("lw-rpg").then(module => {
  // Make WASM module available globally for admin.js
  window.CharacterList = module.CharacterList;
  window.memory = module.memory;
  
  // Load admin.js after WASM is ready
  const script = document.createElement('script');
  script.src = './admin.js';
  document.head.appendChild(script);
}).catch(err => {
  console.error("Failed to load WASM module:", err);
  // Still load admin.js but without WASM functionality
  const script = document.createElement('script');
  script.src = './admin.js';
  document.head.appendChild(script);
});