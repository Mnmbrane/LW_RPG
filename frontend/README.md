# LW RPG Character Viewer

A web application for viewing LW RPG characters built with Rust/WebAssembly and JavaScript.

## Running Locally

To run this application locally, you need to serve the files from a web server due to WASM requirements.

### Option 1: Python HTTP Server

If you have Python installed:

```bash
# Navigate to the dist folder
cd dist

# Python 3
python -m http.server 8000

# Python 2 (if needed)
python -m SimpleHTTPServer 8000
```

Then open your browser to `http://localhost:8000`

### Option 2: Node.js HTTP Server

If you have Node.js installed:

```bash
# Install a simple HTTP server globally
npm install -g http-server

# Navigate to the dist folder and serve
cd dist
http-server

# Or serve on a specific port
http-server -p 8000
```

### Option 3: Other Options

- Use any static file server of your choice
- Upload the `dist` folder contents to any web hosting service
- Use GitHub Pages, Netlify, or Vercel for hosting

## Building from Source

If you want to build the project yourself:

```bash
npm install
npm run build
```

The built files will be in the `dist/` folder.