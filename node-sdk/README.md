# VisionFi CLI

Command-line interface for the VisionFi document analysis platform.

## Overview

This CLI provides a user-friendly interface for interacting with the VisionFi API, allowing you to analyze documents, retrieve results, and manage your VisionFi account.

## Installation

### Prerequisites

- Node.js 14 or higher
- npm or yarn

### Setup

#### Automatic Setup
Use the setup script to install dependencies, build the CLI, and create a symlink:

```bash
cd node-sdk
./setup.sh
```

#### Manual Setup
1. Install dependencies
   ```bash
   cd node-sdk
   npm install
   ```

2. Build the CLI
   ```bash
   npm run build
   ```

3. Link the CLI (optional, for development)
   ```bash
   npm link
   ```

## Usage

### Interactive Mode

The easiest way to use the CLI is in interactive mode:

```bash
npm run start
# or if linked:
visionfi
```

This will launch the interactive CLI with menus for document analysis, result retrieval, and configuration.

### Command Line Mode

You can also use the CLI directly from the command line:

```bash
# Verify authentication
npm run start -- auth verify
# or if linked:
visionfi auth verify

# Analyze a document
npm run start -- analyze /path/to/document.pdf --workflow WORKFLOW_KEY
# or if linked:
visionfi analyze /path/to/document.pdf --workflow WORKFLOW_KEY

# Retrieve results
npm run start -- results JOB_UUID
# or if linked:
visionfi results JOB_UUID
```

## Development

### Available Scripts

- `npm run build` - Build the TypeScript code
- `npm run dev` - Run the CLI in development mode
- `npm run lint` - Run linting
- `npm run start` - Run the built CLI
- `npm run test` - Run unit tests
- `npm run quality-check` - Run the QualityCheck validation process
- `npm run verify-all` - Run both tests and quality checks

### Project Structure

- `bin/` - CLI executable
- `docs/` - Documentation
- `scripts/` - Utility scripts
- `src/` - TypeScript source code
  - `commands/` - Command implementations
  - `types/` - TypeScript interfaces
  - `ui/` - UI components
  - `utils/` - Utility functions
    - `qualityCheck.ts` - QualityCheck system for test coverage validation
- `tests/` - Test files

### Quality Check System

This project utilizes a QualityCheck system to validate test coverage of critical code paths. For more information:

- See [QualityCheck-HOWTO.md](./docs/QualityCheck-HOWTO.md) for usage instructions
- Check [QualityCheckSystem.md](./QualityCheckSystem.md) for system design documentation
- Run `npm run quality-check` to validate test coverage

## License

MIT