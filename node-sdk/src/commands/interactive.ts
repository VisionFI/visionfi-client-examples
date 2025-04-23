/**
 * Interactive mode for VisionFi CLI
 * Refactored to separate UI/CLI concerns from core business logic
 */

import { VisionFi, AuthVerificationResult } from 'visionfi';
import * as inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { displayBanner } from '../ui/banner';
import { error, success, info, title, subtitle, menuOption, warning } from '../ui/colors';
import { loadConfig, saveConfig, SERVICE_ACCOUNT_KEY_NAME, DEFAULT_CONFIG } from '../utils/config';
import { getExamplesFilesDir } from '../utils/files';
import {
  InteractiveOptions,
  InteractiveCommandResult,
  InteractiveDependencies
} from '../types/interactive';
import {
  initializeClientCore,
  verifyAuthenticationCore,
  setupServiceAccountWithPathCore,
  setupDefaultServiceAccountCore,
  getWorkflowsCore,
  analyzeDocumentCore,
  getResultsCore,
  getClientInfoCore,
  updateConfigCore,
  parseWorkflowCacheTtlCore,
  formatCacheTtlCore
} from './interactive-core';

// Config paths
const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.visionfi');
const DEFAULT_KEY_DIR = path.join(DEFAULT_CONFIG_DIR, 'keys');

/**
 * VisionFi CLI class - similar to the Python CLI's VisionFiCLI class
 * Refactored to use dependency injection and separate core logic
 */
class VisionFiCLI {
  config: any;
  client: VisionFi | null = null;
  examplesFilesDir: string;
  
  // Workflow cache
  private _cachedWorkflows: any = null;
  private _workflowsCachedAt: number = 0;
  private _workflowCacheTtl: number;
  
  // Dependencies for testing
  private _dependencies: InteractiveDependencies;
  
  constructor(dependencies: InteractiveDependencies = {}) {
    
    this._dependencies = dependencies;
    
    // Setup dependencies with defaults
    const configManager = dependencies.configManager || {
      loadConfig: () => loadConfig(),
      saveConfig: (config) => saveConfig(config)
    };
    
    // Initialize from config
    this.config = configManager.loadConfig();
    this._workflowCacheTtl = this.config.workflow_cache_ttl;
    this.examplesFilesDir = getExamplesFilesDir();
    
    // Initialize the client if service account path is set
    this.initializeClient();
  }
  
  /**
   * Initialize client from configuration
   */
  async initializeClient(): Promise<void> {
    
    if (this.config.service_account_path) {
      try {
        const result = await initializeClientCore(
          this.config.service_account_path,
          this.config,
          this._dependencies
        );
        
        if (result.success) {
          this.client = result.data?.client;
        } else if (this.config.debug_mode) {
          console.log(error(`Failed to initialize client: ${result.message}`));
        }
      } catch (err: any) {
        if (this.config.debug_mode) {
          console.log(error(`Failed to initialize client: ${err.message}`));
        }
      }
    }
  }
  
  /**
   * Save configuration to file
   */
  saveConfig(): void {
    
    const configManager = this._dependencies.configManager || {
      saveConfig: (config) => saveConfig(config)
    };
    
    configManager.saveConfig(this.config);
  }
  
  /**
   * Run the CLI in interactive mode
   */
  async interactiveMode(): Promise<void> {
    
    displayBanner();
    
    // Check if service account is already in the default location
    const defaultKeyPath = path.join(DEFAULT_KEY_DIR, SERVICE_ACCOUNT_KEY_NAME);
    
    // Check if the client is initialized
    if (!this.client) {
      await this.handleServiceAccountSetup(defaultKeyPath);
    }
    
    // Main menu loop
    await this.runMainMenu();
  }
  
  /**
   * Handle service account setup
   */
  async handleServiceAccountSetup(defaultKeyPath: string): Promise<void> {
    
    const fileSystem = this._dependencies.fileSystem || {
      existsSync: (path) => fs.existsSync(path)
    };
    
    // Look for service account in default location
    if (fileSystem.existsSync(defaultKeyPath)) {
      await this.setupWithExistingDefaultAccount(defaultKeyPath);
    } else {
      await this.guideThroughServiceAccountSetup();
    }
  }
  
  /**
   * Set up with existing default service account
   */
  async setupWithExistingDefaultAccount(defaultKeyPath: string): Promise<void> {
    
    try {
      // Initialize client with the found service account
      const initResult = await initializeClientCore(
        defaultKeyPath,
        this.config,
        this._dependencies
      );
      
      if (initResult.success) {
        this.client = initResult.data?.client;
        
        // Update config
        this.config.service_account_path = defaultKeyPath;
        this.saveConfig();
        
        console.log(success(`Service account found in ${DEFAULT_KEY_DIR}!`));
        console.log(info('Testing authentication...'));
        
        const authResult = await verifyAuthenticationCore(this.client, this._dependencies);
        
        if (authResult.success) {
          console.log(success('Authentication successful!'));
        } else {
          console.log(warning(authResult.message));
        }
      } else {
        console.log(error(initResult.message));
      }
    } catch (err: any) {
      console.log(error(`Failed to initialize client with discovered service account: ${err.message}`));
    }
  }
  
  /**
   * Guide user through service account setup
   */
  async guideThroughServiceAccountSetup(): Promise<void> {
    
    const ui = this._dependencies.ui || {
      prompt: (questions) => inquirer.prompt(questions)
    };
    
    console.log(warning('No service account configured.'));
    console.log();
    console.log(subtitle('Service Account Setup'));
    console.log(info('VisionFi requires a service account JSON file to authenticate with the API.'));
    console.log();
    console.log(subtitle('Instructions:'));
    console.log(`1. Copy your service account JSON file to: ${DEFAULT_KEY_DIR}`);
    console.log(`2. Name the file: ${SERVICE_ACCOUNT_KEY_NAME}`);
    console.log(`3. Or provide a custom path below`);
    console.log();
    
    const setupChoices = await ui.prompt([
      {
        type: 'list',
        name: 'setupChoice',
        message: 'How would you like to proceed?',
        default: 1,
        choices: [
          { name: 'Use custom path', value: 0 },
          { name: 'I\'ll add the file now', value: 1 }
        ]
      }
    ]);
    
    if (setupChoices.setupChoice === 0) {
      await this.handleCustomPathSetup();
    } else {
      await this.handleDefaultPathSetup();
    }
    
    console.log(); // Add spacing
  }
  
  /**
   * Handle custom path service account setup
   */
  async handleCustomPathSetup(): Promise<void> {
    
    const ui = this._dependencies.ui || {
      prompt: (questions) => inquirer.prompt(questions)
    };
    
    // Ask for custom path
    const pathInput = await ui.prompt([
      {
        type: 'input',
        name: 'serviceAccountPath',
        message: 'Enter path to service account JSON file:'
      }
    ]);
    
    let serviceAccountPath = pathInput.serviceAccountPath.trim();
    
    if (serviceAccountPath) {
      const result = await setupServiceAccountWithPathCore(
        serviceAccountPath,
        this.config,
        this._dependencies
      );
      
      if (result.success) {
        this.client = result.data?.client;
        this.config = result.data?.config;
        console.log(success('Service account configured successfully!'));
      } else {
        console.log(error(result.message));
      }
    }
  }
  
  /**
   * Handle default path service account setup
   */
  async handleDefaultPathSetup(): Promise<void> {
    
    const ui = this._dependencies.ui || {
      prompt: (questions) => inquirer.prompt(questions)
    };
    
    const fileSystem = this._dependencies.fileSystem || {
      existsSync: (path) => fs.existsSync(path)
    };
    
    // Guide the user to add the file to the default location
    console.log();
    console.log(subtitle('Please follow these steps:'));
    console.log(`1. Create the directory if it doesn't exist: ${DEFAULT_KEY_DIR}`);
    console.log(`2. Copy your service account JSON file to this directory`);
    console.log(`3. Rename the file to: ${SERVICE_ACCOUNT_KEY_NAME}`);
    console.log(`4. Then return to this CLI`);
    console.log();
    
    await ui.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter when you\'ve added the service account file...',
      }
    ]);
    
    const defaultKeyPath = path.join(DEFAULT_KEY_DIR, SERVICE_ACCOUNT_KEY_NAME);
    
    // Check if the file now exists
    if (fileSystem.existsSync(defaultKeyPath)) {
      const result = await initializeClientCore(
        defaultKeyPath,
        this.config,
        this._dependencies
      );
      
      if (result.success) {
        this.client = result.data?.client;
        
        // Update config
        this.config.service_account_path = defaultKeyPath;
        this.saveConfig();
        
        console.log(success('Service account configured successfully!'));
      } else {
        console.log(error(result.message));
      }
    } else {
      console.log(error(`Service account file not found at: ${defaultKeyPath}`));
      console.log(info('You can configure it later in the Account & Configuration menu.'));
    }
  }
  
  /**
   * Run main menu loop
   */
  async runMainMenu(): Promise<void> {
    
    const ui = this._dependencies.ui || {
      prompt: (questions) => inquirer.prompt(questions),
      clearScreen: () => console.clear()
    };
    
    // Main menu loop
    let running = true;
    while (running) {
      let authStatus = 'Not Authenticated';
      let authColor = error;
      
      // Check authentication status if client is initialized
      if (this.client) {
        try {
          // Try to verify authentication
          const authResult = await verifyAuthenticationCore(this.client, this._dependencies);
          if (authResult.success) {
            authStatus = 'Authenticated';
            authColor = success;
          }
        } catch (err) {
          // Authentication failed, leave status as Not Authenticated
        }
      }
      
      // Clear screen for main menu
      ui.clearScreen();
      displayBanner();
      
      console.log(`Authentication Status: ${authColor(authStatus)}`);
      console.log(`API Endpoint: ${info(this.config.api_endpoint)}`);
      console.log(`Debug Mode: ${info(this.config.debug_mode ? 'Enabled' : 'Disabled')}`);
      console.log(`Test Mode: ${info(this.config.test_mode ? 'Enabled' : 'Disabled')}`);
      console.log();
      
      console.log(title('MAIN MENU'));
      console.log();
      console.log(menuOption('1', 'Document Analysis'));
      console.log(menuOption('2', 'Retrieve Results'));
      console.log(menuOption('3', 'Account & Configuration'));
      console.log(menuOption('4', 'Developer Tools'));
      console.log();
      console.log(menuOption('q', 'Quit'));
      console.log();
      
      const mainMenuChoice = await ui.prompt([
        {
          type: 'input',
          name: 'choice',
          message: 'Enter your choice:',
        }
      ]);
      
      const choice = mainMenuChoice.choice.trim().toLowerCase();
      
      if (choice === 'q') {
        console.log(info('Thank you for using VisionFi CLI!'));
        running = false;
      } else if (choice === '1') {
        await this.showDocumentAnalysisMenu();
      } else if (choice === '2') {
        await this.showResultsMenu();
      } else if (choice === '3') {
        await this.showConfigMenu();
      } else if (choice === '4') {
        await this.showDeveloperMenu();
      } else {
        console.log(warning('Invalid choice. Please try again.'));
        await ui.prompt([
          {
            type: 'input',
            name: 'continue',
            message: 'Press Enter to continue...',
          }
        ]);
      }
    }
  }
  
  /**
   * Get workflows with caching
   * @param forceRefresh Force refresh of cache
   */
  async getCachedWorkflows(forceRefresh = false): Promise<any> {
    
    const result = await getWorkflowsCore(
      this.client,
      forceRefresh,
      this._cachedWorkflows,
      this._workflowsCachedAt,
      this._workflowCacheTtl,
      this.config.debug_mode
    );
    
    if (result.success) {
      // Update cache if result contains new data
      if (!result.data?.fromCache) {
        this._cachedWorkflows = result.data?.workflows;
        this._workflowsCachedAt = result.data?.cachedAt;
        
        if (this.config.debug_mode) {
          if (this._cachedWorkflows?.success) {
            const count = this._cachedWorkflows.data ? this._cachedWorkflows.data.length : 0;
            console.log(info(`Cached ${count} workflows.`));
          } else {
            console.log(warning('Failed to cache workflows.'));
          }
        }
      } else if (this.config.debug_mode) {
        console.log(info('Using cached workflows.'));
      }
    } else if (this.config.debug_mode) {
      console.log(warning('Failed to get workflows.'));
    }
    
    return this._cachedWorkflows;
  }
  
  /**
   * Clear the workflow cache
   */
  clearWorkflowCache(): void {
    
    this._cachedWorkflows = null;
    this._workflowsCachedAt = 0;
    console.log(success('Workflow cache cleared.'));
  }
  
  /**
   * Set the workflow cache TTL
   * @param seconds Cache TTL in seconds
   */
  setWorkflowCacheTtl(seconds: number): boolean {
    
    const parseResult = parseWorkflowCacheTtlCore(seconds.toString());
    
    if (parseResult.success) {
      this._workflowCacheTtl = parseResult.data?.seconds;
      this.config.workflow_cache_ttl = parseResult.data?.seconds;
      this.saveConfig();
      
      console.log(success(`Workflow cache time set to ${parseResult.data?.formattedString}.`));
      return true;
    } else {
      console.log(error(parseResult.message));
      return false;
    }
  }
  
  // Only implementing a subset of methods for brevity in this initial refactoring
  // More methods would be implemented following the same pattern
  
  /**
   * Show document analysis menu
   */
  async showDocumentAnalysisMenu(): Promise<void> {
    
    const ui = this._dependencies.ui || {
      prompt: (questions) => inquirer.prompt(questions),
      clearScreen: () => console.clear()
    };
    
    const fileSystem = this._dependencies.fileSystem || {
      existsSync: (path) => fs.existsSync(path),
      readFileSync: (path) => fs.readFileSync(path)
    };
    
    if (!this.client) {
      console.log(error('Client not initialized. Please configure a service account first.'));
      await ui.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
      return;
    }
    
    // Check if we need to fetch workflows for the first time
    const isFirstLoad = this._cachedWorkflows === null;
    
    if (isFirstLoad) {
      // First-time loading needs to fetch workflows - show a clear loading message
      ui.clearScreen();
      displayBanner();
      console.log(title('DOCUMENT ANALYSIS'));
      console.log(subtitle('Initializing...'));
      console.log(info('Fetching available workflows for the first time...'));
      console.log(info('This may take a few moments, but future loads will be faster.'));
      console.log();
      
      // Get workflows (this will cache them)
      try {
        const workflows = await this.getCachedWorkflows();
        
        // Clear screen before showing the actual menu
        ui.clearScreen();
        displayBanner();
      } catch (err: any) {
        console.log(error(`Failed to get workflows: ${err.message}`));
        await ui.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
        return;
      }
    } else {
      // Using cached workflows
      try {
        const workflows = await this.getCachedWorkflows();
        
        ui.clearScreen();
        displayBanner();
      } catch (err: any) {
        console.log(error(`Failed to get workflows: ${err.message}`));
        await ui.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
        return;
      }
    }
    
    console.log(title('DOCUMENT ANALYSIS'));
    console.log(subtitle('Select a workflow to analyze a document'));
    console.log();
    
    const workflows = await this.getCachedWorkflows();
    
    // Display available workflows
    if (workflows.success && workflows.data) {
      const workflowChoices = workflows.data.map((workflow: any, index: number) => {
        const workflowKey = workflow.workflow_key || '';
        const description = workflow.description || 'No description';
        console.log(menuOption(String(index + 1), `${workflowKey} - ${description}`));
        return { name: `${workflowKey} - ${description}`, value: workflowKey };
      });
    } else {
      console.log(warning('No workflows available.'));
    }
    
    console.log();
    console.log(menuOption('b', 'Back to Main Menu'));
    console.log();
    
    const choice = await ui.prompt([
      {
        type: 'input',
        name: 'option',
        message: 'Enter your choice:',
      }
    ]);
    
    const input = choice.option.trim().toLowerCase();
    
    if (input === 'b') {
      return;
    }
    
    // Try to parse choice as a number
    try {
      const index = parseInt(input) - 1;
      if (index >= 0 && index < workflows.data.length) {
        const selectedWorkflow = workflows.data[index];
        const workflowKey = selectedWorkflow.workflow_key || '';
        
        // Check if test mode is enabled
        if (this.config.test_mode) {
          console.log();
          console.log(subtitle('Test Mode is ON. Choose a file source:'));
          console.log(menuOption('1', 'Enter a custom file path'));
          console.log(menuOption('2', 'Browse example files'));
          console.log();
          
          const fileSource = await ui.prompt([
            {
              type: 'input',
              name: 'source',
              message: 'Enter your choice:',
            }
          ]);
          
          let filePath: string | null = null;
          
          if (fileSource.source.trim() === '2') {
            // Browse example files
            console.log(info('Opening example files browser...'));
            const { browseExampleFiles } = require('../utils/files');
            filePath = await browseExampleFiles(this.examplesFilesDir);
            
            if (filePath === null) {
              console.log(info('File browsing cancelled.'));
            } else {
              console.log(success(`Selected file: ${path.basename(filePath)}`));
            }
          } else {
            // Ask for file path
            const pathInput = await ui.prompt([
              {
                type: 'input',
                name: 'filePath',
                message: 'Enter path to document file:',
              }
            ]);
            
            filePath = pathInput.filePath.trim().replace(/^~/, os.homedir());
          }
          
          if (filePath && fileSystem.existsSync(filePath)) {
            console.log(info(`Analyzing document with workflow: ${workflowKey}`));
            
            // Read file
            const fileData = fileSystem.readFileSync(filePath);
            
            // Submit for analysis
            try {
              const result = await analyzeDocumentCore(
                this.client, 
                fileData, 
                path.basename(filePath),
                workflowKey,
                this.config,
                this._dependencies
              );
              
              if (result.success) {
                const uuid = result.data?.uuid;
                this.config = result.data?.config || this.config;
                
                console.log(success(`Document submitted successfully!`));
                console.log(info(`Job UUID: ${uuid}`));
                console.log();
                console.log(info('You can retrieve results using this UUID.'));
              } else {
                console.log(warning(result.message));
              }
              
              await ui.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
              return;
            } catch (err: any) {
              console.log(error(`Error submitting document: ${err.message}`));
              await ui.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
              return;
            }
          } else if (filePath) {
            console.log(error(`File not found: ${filePath}`));
            await ui.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
            return;
          }
        } else {
          // Ask for file path (normal mode)
          const pathInput = await ui.prompt([
            {
              type: 'input',
              name: 'filePath',
              message: 'Enter path to document file:',
            }
          ]);
          
          const filePath = pathInput.filePath.trim().replace(/^~/, os.homedir());
          
          if (fileSystem.existsSync(filePath)) {
            console.log(info(`Analyzing document with workflow: ${workflowKey}`));
            
            // Read file
            const fileData = fileSystem.readFileSync(filePath);
            
            // Submit for analysis
            try {
              const result = await analyzeDocumentCore(
                this.client, 
                fileData, 
                path.basename(filePath),
                workflowKey,
                this.config,
                this._dependencies
              );
              
              if (result.success) {
                const uuid = result.data?.uuid;
                this.config = result.data?.config || this.config;
                
                console.log(success(`Document submitted successfully!`));
                console.log(info(`Job UUID: ${uuid}`));
                console.log();
                console.log(info('You can retrieve results using this UUID.'));
              } else {
                console.log(warning(result.message));
              }
              
              await ui.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
              return;
            } catch (err: any) {
              console.log(error(`Error submitting document: ${err.message}`));
              await ui.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
              return;
            }
          } else {
            console.log(error(`File not found: ${filePath}`));
            await ui.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
            return;
          }
        }
      } else {
        console.log(warning('Invalid workflow selection.'));
      }
    } catch (err) {
      console.log(warning('Invalid choice.'));
    }
    
    await ui.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
  }
  
  /**
   * Show results retrieval menu
   */
  async showResultsMenu(): Promise<void> {
    
    const ui = this._dependencies.ui || {
      prompt: (questions) => inquirer.prompt(questions),
      clearScreen: () => console.clear()
    };
    
    if (!this.client) {
      console.log(error('Client not initialized. Please configure a service account first.'));
      await ui.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
      return;
    }
    
    ui.clearScreen();
    displayBanner();
    
    console.log(title('RETRIEVE RESULTS'));
    console.log(subtitle('Get analysis results by job UUID'));
    console.log();
    
    // Show recent UUIDs
    let choices = [];
    if (this.config.recent_uuids && this.config.recent_uuids.length > 0) {
      console.log(subtitle('Recent job UUIDs:'));
      for (let i = 0; i < this.config.recent_uuids.length; i++) {
        const uuid = this.config.recent_uuids[i];
        console.log(menuOption(String(i + 1), uuid));
        choices.push({ name: uuid, value: uuid });
      }
      console.log();
    } else {
      console.log(info('No recent jobs found.'));
      console.log();
    }
    
    console.log(menuOption('n', 'Enter new UUID'));
    console.log(menuOption('b', 'Back to Main Menu'));
    console.log();
    
    const choice = await ui.prompt([
      {
        type: 'input',
        name: 'option',
        message: 'Enter your choice:',
      }
    ]);
    
    const input = choice.option.trim().toLowerCase();
    
    if (input === 'b') {
      return;
    }
    
    let uuid: string | null = null;
    
    if (input === 'n') {
      // Enter new UUID
      const uuidInput = await ui.prompt([
        {
          type: 'input',
          name: 'uuid',
          message: 'Enter job UUID:',
        }
      ]);
      
      uuid = uuidInput.uuid.trim();
    } else {
      // Try to parse choice as a number
      try {
        const index = parseInt(input) - 1;
        if (index >= 0 && index < this.config.recent_uuids.length) {
          uuid = this.config.recent_uuids[index];
        } else {
          console.log(warning('Invalid choice.'));
        }
      } catch (err) {
        console.log(warning('Invalid choice.'));
      }
    }
    
    if (uuid) {
      try {
        console.log(info(`Retrieving results for job: ${uuid}`));
        
        // Get results
        const result = await getResultsCore(this.client, uuid);
        
        console.log();
        if (result.data?.status) {
          console.log(`Status: ${info(result.data.status)}`);
        }
        
        if (result.success && result.data?.results) {
          console.log(success('Results retrieved successfully!'));
          console.log();
          
          // Pretty print the results
          console.log(JSON.stringify(result.data.results, null, 2));
        } else if (result.error) {
          console.log(error('Analysis error:'));
          console.log(JSON.stringify(result.error, null, 2));
        } else {
          console.log(warning(result.message));
        }
      } catch (err: any) {
        console.log(error(`Failed to retrieve results: ${err.message}`));
      }
    }
    
    await ui.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...',
      }
    ]);
  }
  
  /**
   * Show configuration menu
   */
  async showConfigMenu(): Promise<void> {
    
    const ui = this._dependencies.ui || {
      prompt: (questions) => inquirer.prompt(questions),
      clearScreen: () => console.clear()
    };
    
    const fileSystem = this._dependencies.fileSystem || {
      existsSync: (path) => fs.existsSync(path),
      mkdirSync: (path, options) => fs.mkdirSync(path, options),
      copyFileSync: (source, destination) => fs.copyFileSync(source, destination)
    };
    
    ui.clearScreen();
    displayBanner();
    
    // Check if default key exists
    const defaultKeyPath = path.join(DEFAULT_KEY_DIR, SERVICE_ACCOUNT_KEY_NAME);
    const defaultKeyExists = fileSystem.existsSync(defaultKeyPath);
    
    console.log(title('ACCOUNT & CONFIGURATION'));
    console.log(subtitle('Manage service account and API settings'));
    console.log();
    
    // Current settings
    console.log(subtitle('Current Settings:'));
    console.log(`Service Account: ${info(this.config.service_account_path || 'Not configured')}`);
    console.log(`API Endpoint: ${info(this.config.api_endpoint)}`);
    console.log(`Default Key Location: ${defaultKeyExists ? success('Found') : warning('Not found')} (${defaultKeyPath})`);
    
    // Format workflow cache TTL for display
    const cacheTtl = this.config.workflow_cache_ttl;
    const cacheTtlResult = formatCacheTtlCore(cacheTtl);
    const cacheStr = cacheTtlResult.message;
    
    console.log(`Workflow Cache Time: ${info(cacheStr)}`);
    console.log();
    
    // Menu options
    console.log(menuOption('1', 'Set Service Account Path'));
    if (defaultKeyExists) {
      console.log(menuOption('2', 'Use Default Service Account'));
    }
    console.log(menuOption('3', 'Setup Default Service Account Location'));
    console.log(menuOption('4', 'Set API Endpoint'));
    console.log(menuOption('5', 'Test Authentication'));
    console.log(menuOption('6', 'Get Client Info'));
    console.log(menuOption('7', 'Clear Recent UUIDs'));
    console.log(menuOption('8', 'Clear Workflow Cache'));
    console.log(menuOption('9', 'Set Workflow Cache Time'));
    console.log();
    console.log(menuOption('b', 'Back to Main Menu'));
    console.log();
    
    const configMenuChoice = await ui.prompt([
      {
        type: 'input',
        name: 'choice',
        message: 'Enter your choice:',
      }
    ]);
    
    const choice = configMenuChoice.choice.trim().toLowerCase();
    
    if (choice === 'b') {
      return;
    } else if (choice === '1') {
      // Set Service Account Path
      const pathInput = await ui.prompt([
        {
          type: 'input',
          name: 'serviceAccountPath',
          message: 'Enter path to service account JSON file:',
        }
      ]);
      
      let serviceAccountPath = pathInput.serviceAccountPath.trim();
      if (serviceAccountPath) {
        serviceAccountPath = serviceAccountPath.replace(/^~/, os.homedir());
        const result = await setupServiceAccountWithPathCore(
          serviceAccountPath,
          this.config,
          this._dependencies
        );
        
        if (result.success) {
          this.client = result.data?.client;
          this.config = result.data?.config || this.config;
          console.log(success('Service account updated successfully!'));
        } else {
          console.log(error(result.message));
        }
      }
    } else if (choice === '2' && defaultKeyExists) {
      // Use Default Service Account
      const result = await initializeClientCore(
        defaultKeyPath,
        this.config,
        this._dependencies
      );
      
      if (result.success) {
        this.client = result.data?.client;
        this.config.service_account_path = defaultKeyPath;
        this.saveConfig();
        console.log(success('Using default service account successfully!'));
      } else {
        console.log(error(result.message));
      }
    } else if (choice === '3') {
      // Setup Default Service Account Location
      console.log(subtitle('\nSetting up default service account location:'));
      console.log(info(`Default location: ${DEFAULT_KEY_DIR}`));
      console.log(info(`Default filename: ${SERVICE_ACCOUNT_KEY_NAME}`));
      console.log();
      
      // Create directory if it doesn't exist
      fileSystem.mkdirSync(DEFAULT_KEY_DIR, { recursive: true });
      
      console.log(subtitle('You have two options:'));
      console.log('1. Copy an existing service account file to the default location');
      console.log('2. Manually copy your service account JSON to the default location');
      console.log();
      
      const setupChoice = await ui.prompt([
        {
          type: 'input',
          name: 'choice',
          message: 'Choose an option (1/2):',
        }
      ]);
      
      if (setupChoice.choice.trim() === '1') {
        const existingPath = await ui.prompt([
          {
            type: 'input',
            name: 'path',
            message: 'Enter path to your existing service account JSON file:',
          }
        ]);
        
        let sourcePath = existingPath.path.trim();
        if (sourcePath) {
          sourcePath = sourcePath.replace(/^~/, os.homedir());
          const result = await setupDefaultServiceAccountCore(
            sourcePath,
            this.config,
            this._dependencies
          );
          
          if (result.success) {
            this.client = result.data?.client;
            this.config = result.data?.config || this.config;
            console.log(success('Service account copied and configured successfully!'));
          } else {
            console.log(error(result.message));
          }
        }
      } else {
        console.log();
        console.log(subtitle('Please follow these steps:'));
        console.log(`1. The directory has been created: ${DEFAULT_KEY_DIR}`);
        console.log(`2. Copy your service account JSON file to this directory`);
        console.log(`3. Rename the file to: ${SERVICE_ACCOUNT_KEY_NAME}`);
        console.log();
        console.log(info('After completing these steps, select option 2 from the menu to use the default service account.'));
      }
    } else if (choice === '4') {
      // Set API Endpoint
      const current = this.config.api_endpoint;
      const endpointInput = await ui.prompt([
        {
          type: 'input',
          name: 'endpoint',
          message: `Enter new API endpoint [${current}]:`,
          default: current
        }
      ]);
      
      const newEndpoint = endpointInput.endpoint.trim();
      if (newEndpoint) {
        const result = updateConfigCore(
          this.config,
          'api_endpoint',
          newEndpoint,
          this._dependencies
        );
        
        if (result.success) {
          this.config = result.data?.config || this.config;
          
          // Re-initialize client
          if (this.client && this.config.service_account_path) {
            const initResult = await initializeClientCore(
              this.config.service_account_path,
              this.config,
              this._dependencies
            );
            
            if (initResult.success) {
              this.client = initResult.data?.client;
              console.log(success('API endpoint updated successfully!'));
            } else {
              console.log(warning(`API endpoint updated but client re-initialization failed: ${initResult.message}`));
            }
          } else {
            console.log(success('API endpoint updated successfully!'));
          }
        } else {
          console.log(error(result.message));
        }
      }
    } else if (choice === '5') {
      // Test Authentication
      if (!this.client) {
        console.log(error('Client not initialized. Please configure a service account first.'));
      } else {
        const authResult = await verifyAuthenticationCore(this.client, this._dependencies);
        
        if (authResult.success) {
          console.log(success('Authentication successful!'));
        } else {
          console.log(error(`Authentication failed! ${authResult.message}`));
        }
      }
    } else if (choice === '6') {
      // Get Client Info
      await this.showClientInfo();
      return; // Skip the "Press Enter to continue" at the end
    } else if (choice === '7') {
      // Clear Recent UUIDs
      const confirm = await ui.prompt([
        {
          type: 'input',
          name: 'confirm',
          message: 'Are you sure you want to clear recent UUIDs? (y/n):',
        }
      ]);
      
      if (confirm.confirm.trim().toLowerCase() === 'y') {
        const result = updateConfigCore(
          this.config,
          'recent_uuids',
          [],
          this._dependencies
        );
        
        if (result.success) {
          this.config = result.data?.config || this.config;
          console.log(success('Recent UUIDs cleared.'));
        } else {
          console.log(error(result.message));
        }
      }
    } else if (choice === '8') {
      // Clear Workflow Cache
      const confirm = await ui.prompt([
        {
          type: 'input',
          name: 'confirm',
          message: 'Are you sure you want to clear the workflow cache? (y/n):',
        }
      ]);
      
      if (confirm.confirm.trim().toLowerCase() === 'y') {
        this.clearWorkflowCache();
      }
    } else if (choice === '9') {
      // Set Workflow Cache Time
      const currentTtl = this.config.workflow_cache_ttl;
      const currentTtlResult = formatCacheTtlCore(currentTtl);
      const currentStr = currentTtlResult.message;
      
      console.log(`Current workflow cache time: ${currentStr}`);
      console.log(subtitle('Enter new cache time:'));
      console.log('Examples: 30s, 10m, 2h');
      
      // Get new TTL setting
      const newTtlInput = await ui.prompt([
        {
          type: 'input',
          name: 'ttl',
          message: 'New cache time:',
        }
      ]);
      
      const newTtlStr = newTtlInput.ttl.trim().toLowerCase();
      const parseResult = parseWorkflowCacheTtlCore(newTtlStr);
      
      if (parseResult.success) {
        this.setWorkflowCacheTtl(parseResult.data?.seconds as number);
      } else {
        console.log(error(parseResult.message));
      }
    } else {
      console.log(warning('Invalid choice.'));
    }
    
    await ui.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...',
      }
    ]);
  }
  
  /**
   * Display client account information
   */
  async showClientInfo(): Promise<void> {
    
    const ui = this._dependencies.ui || {
      prompt: (questions) => inquirer.prompt(questions),
      clearScreen: () => console.clear()
    };
    
    if (!this.client) {
      console.log(error('Client not initialized. Please configure a service account first.'));
      await ui.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
      return;
    }
    
    try {
      console.log(info('Retrieving client information...'));
      const clientInfoResult = await getClientInfoCore(this.client);
      
      ui.clearScreen();
      displayBanner();
      
      console.log(title('CLIENT INFORMATION'));
      console.log();
      
      if (clientInfoResult.success && clientInfoResult.data) {
        const data = clientInfoResult.data;
        console.log(`Client ID: ${info(String(data.client_id || 'Unknown'))}`);
        console.log(`Name: ${info(String(data.name || 'Unknown'))}`);
        console.log(`Status: ${info(String(data.status || 'Unknown'))}`);
        console.log(`Tenant Type: ${info(String(data.tenantType || 'Unknown'))}`);
        
        // Format and display creation date if available
        if (data.createdAt) {
          try {
            // Try to parse and format the date
            const dt = new Date(data.createdAt);
            const formattedDate = dt.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
            console.log(`Created: ${info(formattedDate)}`);
          } catch (err) {
            console.log(`Created: ${info(String(data.createdAt))}`);
          }
        }
        
        // Display configured workflows if available
        if (data.configuredWorkflows && Array.isArray(data.configuredWorkflows)) {
          console.log();
          console.log(subtitle('Configured Workflows:'));
          if (data.configuredWorkflows.length > 0) {
            for (const workflow of data.configuredWorkflows) {
              console.log(`  ${info(workflow)}`);
            }
          } else {
            console.log(`  ${warning('No workflows configured')}`);
          }
        }
        
        // Display features if available
        if (data.features && typeof data.features === 'object') {
          console.log();
          console.log(subtitle('Features:'));
          for (const [featureName, featureData] of Object.entries(data.features)) {
            if (featureData && typeof featureData === 'object') {
              const featureObj = featureData as {enabled?: boolean, limits?: Record<string, any>};
              const status = featureObj.enabled ? success('Enabled') : warning('Disabled');
              console.log(`  ${featureName}: ${status}`);
              
              // Show limits if available
              if (featureObj.limits && typeof featureObj.limits === 'object') {
                console.log('    Limits:');
                for (const [limitName, limitValue] of Object.entries(featureObj.limits)) {
                  console.log(`      ${limitName}: ${info(String(limitValue))}`);
                }
              }
            }
          }
        }
        
        console.log();
        console.log(subtitle('Additional Information:'));
        // Display other fields that weren't specifically handled
        const excludedFields = new Set(['client_id', 'name', 'status', 'tenantType', 'createdAt', 'features', 'configuredWorkflows']);
        let otherFields = false;
        for (const [key, value] of Object.entries(data)) {
          if (!excludedFields.has(key) && typeof value !== 'object' && !Array.isArray(value)) {
            console.log(`  ${key}: ${info(String(value))}`);
            otherFields = true;
          }
        }
        
        if (!otherFields) {
          console.log(`  ${info('No additional information available')}`);
        }
      } else {
        console.log(warning(`Failed to retrieve client information: ${clientInfoResult.message}`));
      }
    } catch (err: any) {
      console.log(error(`Error retrieving client information: ${err.message}`));
    }
    
    console.log();
    await ui.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
  }
  
  /**
   * Show developer menu
   */
  async showDeveloperMenu(): Promise<void> {
    
    const ui = this._dependencies.ui || {
      prompt: (questions) => inquirer.prompt(questions),
      clearScreen: () => console.clear()
    };
    
    ui.clearScreen();
    displayBanner();
    
    console.log(title('DEVELOPER TOOLS'));
    console.log(subtitle('Advanced features for development and debugging'));
    console.log();
    
    console.log(menuOption('1', 'Test Authentication'));
    console.log(menuOption('2', `Toggle Debug Mode (${this.config.debug_mode ? 'ON' : 'OFF'})`));
    console.log(menuOption('3', `Toggle Test Mode (${this.config.test_mode ? 'ON' : 'OFF'})`));
    console.log();
    console.log(menuOption('b', 'Back to Main Menu'));
    console.log();
    
    const devMenuChoice = await ui.prompt([
      {
        type: 'input',
        name: 'choice',
        message: 'Enter your choice:',
      }
    ]);
    
    const choice = devMenuChoice.choice.trim().toLowerCase();
    
    if (choice === 'b') {
      return;
    } else if (choice === '1') {
      if (!this.client) {
        console.log(error('Client not initialized. Please configure a service account first.'));
      } else {
        try {
          const authResult = await verifyAuthenticationCore(this.client, this._dependencies);
          console.log(JSON.stringify(authResult, null, 2));
        } catch (err: any) {
          console.log(error(`Authentication error: ${err.message}`));
        }
      }
    } else if (choice === '2') {
      const result = updateConfigCore(
        this.config,
        'debug_mode',
        !this.config.debug_mode,
        this._dependencies
      );
      
      if (result.success) {
        this.config = result.data?.config || this.config;
        console.log(success(`Debug mode ${this.config.debug_mode ? 'enabled' : 'disabled'}.`));
      } else {
        console.log(error(result.message));
      }
    } else if (choice === '3') {
      const result = updateConfigCore(
        this.config,
        'test_mode',
        !this.config.test_mode,
        this._dependencies
      );
      
      if (result.success) {
        this.config = result.data?.config || this.config;
        console.log(success(`Test mode ${this.config.test_mode ? 'enabled' : 'disabled'}.`));
        if (this.config.test_mode) {
          console.log(info('You can now browse example files in the Document Analysis menu.'));
        }
      } else {
        console.log(error(result.message));
      }
    } else {
      console.log(warning('Invalid choice.'));
    }
    
    await ui.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...',
      }
    ]);
  }
}

/**
 * Run the CLI in interactive mode
 * This is the exported function that CLI users will call
 * It's a thin wrapper around the VisionFiCLI class
 */
export async function interactiveMode(): Promise<void> {
  
  const cli = new VisionFiCLI();
  await cli.interactiveMode();
}