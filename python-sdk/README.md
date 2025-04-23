# VisionFi Python Package Examples

This directory contains example code and resources demonstrating how to use the VisionFi Python client package.

## Contents

- **basic_usage.py** - Demonstrates the core functionality of the VisionFi client
- **visionfi_cli.py** - Command-line interface for interacting with the VisionFi API
- **banner.py** - UI components for the CLI

This directory uses shared resources from the common directory:
- **../common/visionfi_ascii.txt** - ASCII art for the CLI
- **../common/files/invoices/** - Sample files for testing document analysis

## Dependencies

All examples use the visionfi-client Python package (imported as 'visionfi' namespace), which relies on industry-standard dependencies:

- **requests** - ~721 million monthly downloads, 52k+ GitHub stars (Apache 2.0)
- **pydantic** - ~348 million monthly downloads, 23k+ GitHub stars (MIT)
- **google-auth** - ~202 million monthly downloads (Apache 2.0)
- **google-auth-oauthlib** - ~71 million monthly downloads (Apache 2.0)

The CLI example additionally uses:

- **colorama** - ~233 million monthly downloads, 3.7k GitHub stars (BSD 3-Clause)

## Installation

1. Set up a virtual environment (optional but recommended):
```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate
```

2. Install the dependencies:
```bash
# Install from requirements.txt
pip install -r requirements.txt

# Note: This installs the 'visionfi-client' package, which is then imported in Python as:
# from visionfi import VisionFi
```

## Getting Started

The easiest way to get started is to run the basic usage example:

```bash
# Run the basic example (you'll need to provide your own service account)
python basic_usage.py --service-account /path/to/your/service-account.json info
```

For help with available commands:
```bash
python basic_usage.py --help
```

## CLI Usage

The CLI provides an interactive interface to the VisionFi API:

```bash
# Run the CLI in interactive mode
python visionfi_cli.py interactive
```

Available commands:
```bash
# Verify authentication
python visionfi_cli.py auth verify

# Analyze a document
python visionfi_cli.py analyze /path/to/document.pdf --workflow WORKFLOW_KEY

# Retrieve results
python visionfi_cli.py results JOB_UUID
```

## License

All examples are provided under the MIT License, same as the VisionFi package.