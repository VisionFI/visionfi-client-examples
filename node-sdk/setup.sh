#!/bin/bash

# Setup script for VisionFi CLI

# Install dependencies
echo "Installing dependencies..."
npm install

# Create a build
echo "Building TypeScript..."
npm run build

# Create a symlink
echo "Creating symlink..."
npm link

# Test the CLI
echo "Testing the CLI..."
visionfi auth verify

echo ""
echo "Setup complete! You can now use the CLI with the 'visionfi' command."
echo ""
echo "To run in interactive mode:"
echo "  visionfi"
echo ""
echo "To test authentication:"
echo "  visionfi auth verify"
echo ""