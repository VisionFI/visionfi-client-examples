import * as fs from 'fs';
import * as path from 'path';

/**
 * Browse example files directory and let the user select a file
 * @param examplesFilesDir Directory containing example files
 * @returns Path to the selected file, or null if no file was selected
 */
export async function browseExampleFiles(examplesFilesDir: string): Promise<string | null> {
  const inquirer = require('inquirer');
  const { info, warning, title, subtitle, menuOption } = require('../ui/colors');
  
  // Check if the examples directory exists
  if (!fs.existsSync(examplesFilesDir)) {
    console.log(warning(`Example files directory not found: ${examplesFilesDir}`));
    return null;
  }
  
  // Start at the root directory
  let currentDir = examplesFilesDir;
  let selectedFile: string | null = null;
  
  // Browse directories until a file is selected or user cancels
  while (selectedFile === null) {
    try {
      // Get directory contents
      const items = fs.readdirSync(currentDir);
      
      // Separate directories and files
      const dirs = items.filter(item => 
        fs.statSync(path.join(currentDir, item)).isDirectory()
      ).sort();
      
      const files = items.filter(item => 
        fs.statSync(path.join(currentDir, item)).isFile()
      ).sort();
      
      // Create choices list with proper typing
      interface FileChoice {
        value: string;
        item: string;
        type: 'dir' | 'file';
      }
      let choices: FileChoice[] = [];
      
      // Clear screen
      console.clear();
      
      // Display current path
      const relPath = path.relative(examplesFilesDir, currentDir);
      const displayPath = relPath === '' ? '/' : `/${relPath}`;
      
      console.log(title('EXAMPLE FILES BROWSER'));
      console.log(subtitle(`Current directory: ${displayPath}`));
      console.log();
      
      // Add navigation options
      if (currentDir !== examplesFilesDir) {
        console.log(menuOption('.', 'Go up one directory'));
      }
      console.log(menuOption('b', 'Back to previous menu'));
      console.log();
      
      // Add directories
      if (dirs.length > 0) {
        console.log(subtitle('Directories:'));
        dirs.forEach((dir, index) => {
          console.log(menuOption(`d${index + 1}`, dir));
          choices.push({ value: `d${index + 1}`, item: dir, type: 'dir' });
        });
        console.log();
      }
      
      // Add files
      if (files.length > 0) {
        console.log(subtitle('Files:'));
        files.forEach((file, index) => {
          console.log(menuOption(`f${index + 1}`, file));
          choices.push({ value: `f${index + 1}`, item: file, type: 'file' });
        });
        console.log();
      } else if (dirs.length === 0) {
        console.log(warning('No files in this directory.'));
        console.log();
      }
      
      // Prompt for choice
      const choice = await inquirer.prompt([
        {
          type: 'input',
          name: 'selection',
          message: 'Enter your choice:',
        }
      ]);
      
      const selection = choice.selection.trim();
      
      // Handle choice
      if (selection === 'b') {
        // Return to previous menu
        return null;
      } else if (selection === '.' && currentDir !== examplesFilesDir) {
        // Go up one directory
        currentDir = path.dirname(currentDir);
      } else {
        // Find the selected choice
        const selectedChoice = choices.find(c => c.value === selection);
        
        if (selectedChoice) {
          if (selectedChoice.type === 'dir') {
            // Navigate to selected directory
            currentDir = path.join(currentDir, selectedChoice.item);
          } else {
            // Return selected file
            selectedFile = path.join(currentDir, selectedChoice.item);
          }
        } else {
          console.log(warning('Invalid selection. Please try again.'));
        }
      }
    } catch (err: any) {
      console.log(warning(`Error browsing files: ${err.message}`));
      return null;
    }
  }
  
  return selectedFile;
}

/**
 * Get the path to the examples/files directory
 */
export function getExamplesFilesDir(): string {
  // Get path to common/files directory relative to the node-sdk directory
  // From node-sdk/src/utils to ../common/files
  const nodeSdkDir = path.resolve(__dirname, '..', '..');  // node-sdk/
  const filesDir = path.join(nodeSdkDir, '..', 'common', 'files');
  
  return filesDir;
}