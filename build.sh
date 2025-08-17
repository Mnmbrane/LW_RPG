#!/bin/bash

# LW RPG Build Script
# Builds WASM, frontend, and deploys to GitHub Pages

set -e  # Exit on any error

echo "🦀 Building WASM package..."
wasm-pack build

echo "📦 Copying lw.json to frontend..."
cp lw.json frontend/lw.json

echo "📦 Building frontend..."
cd frontend
npm run build

echo "🚀 Deploying to GitHub Pages (docs/ directory)..."
cd ..
mkdir -p docs
rm -rf docs/*
cp -r frontend/dist/* docs/

echo "✅ Build complete! Files deployed to docs/ directory"
echo "📊 Build summary:"
echo "   - WASM package: $(du -h pkg/lw_rpg_bg.wasm | cut -f1)"
echo "   - Docs size: $(du -sh docs/ | cut -f1)"
echo "   - Files: $(ls docs/ | wc -l) files in docs/"

echo "🌐 Ready for GitHub Pages deployment!"