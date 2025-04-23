#!/usr/bin/env node

/**
 * VisionFi CLI
 * Command-line interface for interacting with the VisionFi API
 * 
 * Refactored to use the new command structure with proper separation of concerns
 * and dependency injection.
 */

import { Command } from 'commander';
import { loadConfig } from './utils/config';

// Import core functions
import { authenticateWithApi } from './commands/auth';
import { analyzeDocumentCore } from './commands/analyze';
import { getResultsCore } from './commands/results';

// Import CLI wrappers (for backward compatibility)
import { verifyAuth } from './commands/auth';
import { analyzeDocument } from './commands/analyze';
import { getResults } from './commands/results';
import { interactiveMode } from './commands/interactive';

/**
 * Handle exit code from command result
 * Exported for testing
 */
export function handleCommandResult(result: { success: boolean; message: string; exitCode: number }) {
  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}

// Create the command program
export const program = new Command();

// Set program metadata
program
  .name('visionfi')
  .description('VisionFi Command Line Interface')
  .version('1.0.0');

// Auth command
const authCommand = program.command('auth')
  .description('Authentication commands');

authCommand
  .command('verify')
  .description('Verify authentication')
  .action(async () => {
    try {
      // Option 1: Use refactored core function
      const config = loadConfig();
      const result = await authenticateWithApi(config);
      
      // Display appropriate message based on result
      if (result.success) {
        console.log(`Authentication successful!`);
      } else {
        console.log(`Authentication failed: ${result.message}`);
      }
      
      // Handle exit code
      handleCommandResult(result);
      
      // Option 2: Use existing wrapper (for compatibility)
      // const exitCode = await verifyAuth();
      // if (exitCode !== 0) {
      //   process.exit(exitCode);
      // }
    } catch (error: any) {
      console.error(`Error during authentication: ${error.message}`);
      process.exit(1);
    }
  });

// Analyze command
program
  .command('analyze <file>')
  .description('Analyze a document')
  .requiredOption('-w, --workflow <workflow>', 'Workflow key for analysis')
  .action(async (filePath, options) => {
    try {
      // Option 1: Use refactored core function
      const config = loadConfig();
      const result = await analyzeDocumentCore(filePath, options, config);
      
      // Display appropriate messages based on result
      if (result.success) {
        console.log(`Analysis successful: ${result.message}`);
        
        // Show UUID if available
        if (result.uuid) {
          console.log(`Job UUID: ${result.uuid}`);
          console.log();
          console.log('You can retrieve results using this UUID with:');
          console.log(`  visionfi results ${result.uuid}`);
        }
      } else {
        console.log(`Analysis failed: ${result.message}`);
      }
      
      // Handle exit code
      handleCommandResult(result);
      
      // Option 2: Use existing wrapper (for compatibility)
      // await analyzeDocument(filePath, options);
    } catch (error: any) {
      console.error(`Error during document analysis: ${error.message}`);
      process.exit(1);
    }
  });

// Results command
program
  .command('results <uuid>')
  .description('Get analysis results')
  .option('--wait', 'Wait for results if not yet available')
  .option('--poll-interval <ms>', 'Polling interval in milliseconds when using --wait', '3000')
  .option('--max-attempts <number>', 'Maximum number of polling attempts when using --wait', '10')
  .action(async (uuid, options) => {
    try {
      // Option 1: Use refactored core function
      const config = loadConfig();
      const result = await getResultsCore(uuid, options, config);
      
      // Display appropriate messages based on result
      if (result.success) {
        if (result.results) {
          console.log(`Results retrieved successfully!`);
          
          // Show status if available
          if (result.status) {
            console.log(`Status: ${result.status}`);
          }
          
          console.log();
          // Pretty print the results
          console.log(JSON.stringify(result.results, null, 2));
        } else {
          // No results yet
          if (result.status) {
            console.log(`Status: ${result.status}`);
          }
          
          console.log(`${result.message}`);
          
          // Show wait option hint if not already waiting
          if (!options.wait) {
            console.log('Try using --wait option to poll for results.');
          }
        }
      } else {
        console.log(`Failed to retrieve results: ${result.message}`);
        
        // Show detailed error if available
        if (result.error && typeof result.error === 'object') {
          console.log(JSON.stringify(result.error, null, 2));
        }
      }
      
      // Handle exit code
      handleCommandResult(result);
      
      // Option 2: Use existing wrapper (for compatibility)
      // await getResults(uuid, options);
    } catch (error: any) {
      console.error(`Error retrieving results: ${error.message}`);
      process.exit(1);
    }
  });

// Interactive mode (default)
program
  .command('interactive', { isDefault: true })
  .description('Run in interactive mode')
  .action(async () => {
    try {
      // Interactive mode is already properly handling errors
      await interactiveMode();
    } catch (error: any) {
      console.error(`Error in interactive mode: ${error.message}`);
      process.exit(1);
    }
  });

// Set interactive mode as the default action when no command is specified
if (!process.argv.slice(2).length) {
  process.argv.push('interactive');
}

// Parse command line arguments and execute the matching command
program.parse();