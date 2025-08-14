# LW RPG Character Viewer

A web application for viewing LW RPG characters built with Rust/WebAssembly backend and JavaScript frontend. This project demonstrates character selection and detailed character viewing with stats, abilities, and descriptions.

## Features

- Character selection interface with a list of available characters
- Detailed character view showing stats, abilities, and descriptions
- Built with Rust/WASM for performance and JavaScript for the frontend
- Responsive web design

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) installed
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) installed
- [Node.js](https://nodejs.org/) installed

### Quick Build (Recommended)

**Automated build and deployment** using the build script:
```bash
# One command builds everything and deploys to GitHub Pages
./build.sh
```

### Manual Building and Running

1. **Install frontend dependencies** (one-time setup):
   ```bash
   cd frontend
   npm install
   cd ..
   ```

2. **Start development server**:
   ```bash
   cd frontend
   npm start
   ```

3. **Manual production build** (if not using build.sh):
   ```bash
   # Build WASM package
   wasm-pack build
   
   # Build frontend
   cd frontend
   npm run build
   
   # Deploy to GitHub Pages
   cd ..
   cp -r frontend/dist/* docs/
   ```

### Running the Built Application

After building, you can serve the `frontend/dist/` folder using any static file server.

**Option 1: Python HTTP Server**
```bash
cd frontend/dist
# Python 3
python -m http.server 8000
# Python 2
python -m SimpleHTTPServer 8000
```

**Option 2: Node.js HTTP Server**
```bash
npm install -g http-server
cd frontend/dist
http-server -p 8000
```

Then open your browser to `http://localhost:8000`

## Project Structure

- `/src/` - Rust source code for WASM backend
- `/frontend/` - JavaScript frontend application
- `/pkg/` - Generated WASM package (created by wasm-pack)
- `/frontend/dist/` - Built frontend application (created by npm run build)
- `/docs/` - GitHub Pages deployment directory
- `build.sh` - Automated build and deployment script
- `lw.json` - Character data file