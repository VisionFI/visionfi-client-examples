/**
 * Types for results retrieval functionality
 */

import { CLIConfig } from './config';

/**
 * Options for results retrieval
 */
export interface ResultsOptions {
  wait?: boolean;
  pollInterval?: number | string;
  maxAttempts?: number | string;
  [key: string]: any;
}

/**
 * Result of getResults operations
 */
export interface ResultsCommandResult {
  success: boolean;
  message: string;
  exitCode: number;
  status?: string;
  results?: any;
  error?: Error | any;
}

/**
 * Type for API client factory functions
 */
export type ResultsClientFactory = (config: { 
  serviceAccountPath: string; 
  apiBaseUrl: string;
}) => {
  verifyAuth: () => Promise<{ data: any }>;
  getResults: (
    uuid: string, 
    pollInterval?: number | string, 
    maxAttempts?: number | string
  ) => Promise<{
    status?: string;
    results?: any;
    error?: any;
    [key: string]: any;
  }>;
};

/**
 * Type for config operations
 */
export interface ResultsConfigManager {
  loadConfig: () => CLIConfig;
  saveConfig: (config: CLIConfig) => void;
}