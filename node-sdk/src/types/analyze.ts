/**
 * Types for document analysis functionality
 */

import { CLIConfig } from './config';

/**
 * Options for document analysis
 */
export interface AnalyzeOptions {
  workflow: string;
  [key: string]: any;
}

/**
 * Result of analyze operations
 */
export interface AnalyzeCommandResult {
  success: boolean;
  message: string;
  exitCode: number;
  uuid?: string;
  data?: any;
  error?: Error;
}

/**
 * Type for API client factory functions
 */
export type AnalyzeClientFactory = (config: { 
  serviceAccountPath: string; 
  apiBaseUrl: string;
}) => {
  verifyAuth: () => Promise<{ data: any }>;
  analyzeDocument: (fileData: Buffer, options: {
    fileName: string;
    analysisType: string;
  }) => Promise<{ uuid?: string; [key: string]: any }>;
};

/**
 * Type for file system operations
 */
export interface FileSystem {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string) => Buffer;
}

/**
 * Type for config operations
 */
export interface ConfigManager {
  loadConfig: () => CLIConfig;
  saveConfig: (config: CLIConfig) => void;
}

/**
 * Type for path operations
 */
export interface PathUtils {
  basename: (path: string) => string;
}