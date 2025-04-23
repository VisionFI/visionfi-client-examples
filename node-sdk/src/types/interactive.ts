/**
 * Types for interactive CLI module
 */

import { VisionFi } from 'visionfi';

/**
 * Options for interactive CLI
 */
export interface InteractiveOptions {
  /**
   * Debug mode flag
   */
  debugMode?: boolean;
  
  /**
   * Test mode flag
   */
  testMode?: boolean;
  
  /**
   * Workflow cache TTL in seconds
   */
  workflowCacheTtl?: number;
}

/**
 * Result from an interactive CLI command
 */
export interface InteractiveCommandResult {
  /**
   * Success flag
   */
  success: boolean;
  
  /**
   * Message to display to user
   */
  message: string;
  
  /**
   * Exit code for process
   */
  exitCode: number;
  
  /**
   * Additional data (optional)
   */
  data?: any;
  
  /**
   * Error object (optional)
   */
  error?: Error | any;
}

/**
 * Dependencies for interactive CLI core functions
 */
export interface InteractiveDependencies {
  /**
   * Factory function to create VisionFi client
   */
  clientFactory?: InteractiveClientFactory;
  
  /**
   * Config manager for loading/saving config
   */
  configManager?: InteractiveConfigManager;
  
  /**
   * File system interface for interactive CLI
   */
  fileSystem?: InteractiveFileSystem;
  
  /**
   * UI interface for interactive CLI
   */
  ui?: InteractiveUI;
}

/**
 * Factory function to create VisionFi client
 */
export type InteractiveClientFactory = (config: any) => VisionFi;

/**
 * Config manager for loading/saving config
 */
export interface InteractiveConfigManager {
  /**
   * Load configuration from file
   */
  loadConfig: () => any;
  
  /**
   * Save configuration to file
   */
  saveConfig: (config: any) => void;
}

/**
 * File system interface for interactive CLI
 */
export interface InteractiveFileSystem {
  /**
   * Check if a file exists
   */
  existsSync: (path: string) => boolean;
  
  /**
   * Create a directory recursively
   */
  mkdirSync: (path: string, options?: { recursive?: boolean }) => void;
  
  /**
   * Read a file synchronously
   */
  readFileSync: (path: string) => Buffer;
  
  /**
   * Copy a file synchronously
   */
  copyFileSync: (source: string, destination: string) => void;
}

/**
 * UI interface for interactive CLI
 */
export interface InteractiveUI {
  /**
   * Display banner
   */
  displayBanner: () => void;
  
  /**
   * Prompt user for input
   */
  prompt: (questions: any[]) => Promise<any>;
  
  /**
   * Clear console
   */
  clearScreen: () => void;
  
  /**
   * Log message to console
   */
  log: (message: string) => void;
  
  /**
   * Display success message
   */
  success: (message: string) => string;
  
  /**
   * Display error message
   */
  error: (message: string) => string;
  
  /**
   * Display info message
   */
  info: (message: string) => string;
  
  /**
   * Display warning message
   */
  warning: (message: string) => string;
  
  /**
   * Display title
   */
  title: (message: string) => string;
  
  /**
   * Display subtitle
   */
  subtitle: (message: string) => string;
  
  /**
   * Display menu option
   */
  menuOption: (key: string, description: string) => string;
}
