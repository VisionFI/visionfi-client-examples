/**
 * Types for authentication functionality
 */

import { CLIConfig } from './config';

/**
 * Result of authentication operations
 */
export interface AuthCommandResult {
  success: boolean;
  message: string;
  exitCode: number;
  data?: any;
  error?: Error;
}

/**
 * Type for client factory functions
 */
export type ClientFactory = (config: { 
  serviceAccountPath: string; 
  apiBaseUrl: string;
}) => {
  verifyAuth: () => Promise<{ data: any }>;
};