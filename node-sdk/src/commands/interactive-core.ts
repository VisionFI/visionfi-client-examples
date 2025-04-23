/**
 * Core logic for interactive CLI mode
 * Implements business logic separated from UI concerns
 */

import { VisionFi, AuthVerificationResult } from 'visionfi';
import * as path from 'path';
import * as os from 'os';
import {
  InteractiveOptions,
  InteractiveCommandResult,
  InteractiveDependencies,
  InteractiveClientFactory,
  InteractiveConfigManager,
  InteractiveFileSystem
} from '../types/interactive';
import { SERVICE_ACCOUNT_KEY_NAME, DEFAULT_CONFIG } from '../utils/config';

// Config paths
const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.visionfi');
const DEFAULT_KEY_DIR = path.join(DEFAULT_CONFIG_DIR, 'keys');

/**
 * Initialize client with service account
 */
export async function initializeClientCore(
  serviceAccountPath: string,
  config: any,
  dependencies: InteractiveDependencies = {}
): Promise<InteractiveCommandResult> {
  
  try {
    // Set up dependencies
    const clientFactory = dependencies.clientFactory || ((cfg) => new VisionFi(cfg));
    
    // Initialize client with the service account
    const client = clientFactory({
      serviceAccountPath,
      apiBaseUrl: config.api_endpoint
    });
    
    return {
      success: true,
      message: 'Client initialized successfully',
      exitCode: 0,
      data: { client }
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to initialize client: ${err.message}`,
      exitCode: 1,
      error: err
    };
  }
}

/**
 * Verify authentication with API
 */
export async function verifyAuthenticationCore(
  client: VisionFi | null,
  dependencies: InteractiveDependencies = {}
): Promise<InteractiveCommandResult> {
  
  if (!client) {
    return {
      success: false,
      message: 'Client not initialized',
      exitCode: 1
    };
  }
  
  try {
    const authResult = await client.verifyAuth();
    
    if (authResult.data) {
      return {
        success: true,
        message: 'Authentication successful',
        exitCode: 0,
        data: authResult
      };
    } else {
      return {
        success: false,
        message: 'Authentication check returned without error, but may not be fully authenticated',
        exitCode: 1,
        data: authResult
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Authentication test failed: ${err.message}`,
      exitCode: 1,
      error: err
    };
  }
}

/**
 * Set up service account with custom path
 */
export async function setupServiceAccountWithPathCore(
  serviceAccountPath: string,
  config: any,
  dependencies: InteractiveDependencies = {}
): Promise<InteractiveCommandResult> {
  
  // Set up dependencies
  const fileSystem = dependencies.fileSystem || {
    existsSync: (path) => require('fs').existsSync(path),
    readFileSync: (path) => require('fs').readFileSync(path)
  };
  const configManager = dependencies.configManager || {
    saveConfig: (config) => require('../utils/config').saveConfig(config)
  };
  
  // Validate and normalize path
  let normalizedPath = serviceAccountPath.trim();
  if (!normalizedPath) {
    return {
      success: false,
      message: 'Service account path is empty',
      exitCode: 1
    };
  }
  
  // Expand user directory if needed
  normalizedPath = normalizedPath.replace(/^~/, os.homedir());
  
  // Validate the file exists
  if (!fileSystem.existsSync(normalizedPath)) {
    return {
      success: false,
      message: `File not found: ${normalizedPath}`,
      exitCode: 1
    };
  }
  
  // Initialize client
  const initResult = await initializeClientCore(normalizedPath, config, dependencies);
  if (!initResult.success) {
    return initResult;
  }
  
  // Update config
  const updatedConfig = { ...config, service_account_path: normalizedPath };
  configManager.saveConfig(updatedConfig);
  
  return {
    success: true,
    message: 'Service account configured successfully',
    exitCode: 0,
    data: {
      client: initResult.data?.client,
      config: updatedConfig
    }
  };
}

/**
 * Setup default service account location
 */
export async function setupDefaultServiceAccountCore(
  sourcePath: string,
  config: any,
  dependencies: InteractiveDependencies = {}
): Promise<InteractiveCommandResult> {
  
  // Set up dependencies
  const fileSystem = dependencies.fileSystem || {
    existsSync: (path) => require('fs').existsSync(path),
    mkdirSync: (path, options) => require('fs').mkdirSync(path, options),
    copyFileSync: (source, destination) => require('fs').copyFileSync(source, destination)
  };
  const configManager = dependencies.configManager || {
    saveConfig: (config) => require('../utils/config').saveConfig(config)
  };
  
  const defaultKeyPath = path.join(DEFAULT_KEY_DIR, SERVICE_ACCOUNT_KEY_NAME);
  
  // Validate and normalize path
  let normalizedPath = sourcePath.trim();
  if (!normalizedPath) {
    return {
      success: false,
      message: 'Source path is empty',
      exitCode: 1
    };
  }
  
  // Expand user directory if needed
  normalizedPath = normalizedPath.replace(/^~/, os.homedir());
  
  // Validate the file exists
  if (!fileSystem.existsSync(normalizedPath)) {
    return {
      success: false,
      message: `File not found: ${normalizedPath}`,
      exitCode: 1
    };
  }
  
  try {
    // Create the directory if it doesn't exist
    fileSystem.mkdirSync(path.dirname(defaultKeyPath), { recursive: true });
    
    // Copy the file
    fileSystem.copyFileSync(normalizedPath, defaultKeyPath);
    
    // Initialize client
    const initResult = await initializeClientCore(defaultKeyPath, config, dependencies);
    if (!initResult.success) {
      return initResult;
    }
    
    // Update config
    const updatedConfig = { ...config, service_account_path: defaultKeyPath };
    configManager.saveConfig(updatedConfig);
    
    return {
      success: true,
      message: 'Service account copied and configured successfully',
      exitCode: 0,
      data: {
        client: initResult.data?.client,
        config: updatedConfig
      }
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to setup default service account: ${err.message}`,
      exitCode: 1,
      error: err
    };
  }
}

/**
 * Get workflows with optional caching
 */
export async function getWorkflowsCore(
  client: VisionFi | null,
  forceRefresh: boolean = false,
  cachedWorkflows: any = null,
  workflowsCachedAt: number = 0,
  workflowCacheTtl: number = 300,
  debugMode: boolean = false
): Promise<InteractiveCommandResult> {
  
  if (!client) {
    return {
      success: false,
      message: 'Client not initialized',
      exitCode: 1
    };
  }
  
  const now = Date.now();
  
  // Check if cache is valid or if force refresh
  const shouldFetchFromApi = forceRefresh || 
                           cachedWorkflows === null ||
                           now - workflowsCachedAt > workflowCacheTtl * 1000;
  
  if (shouldFetchFromApi) {
    try {
      const workflows = await (client as any).getWorkflows();
      
      if (workflows?.success) {
        return {
          success: true,
          message: 'Workflows fetched successfully',
          exitCode: 0,
          data: {
            workflows: workflows,
            cachedAt: now
          }
        };
      } else {
        return {
          success: false,
          message: 'Failed to fetch workflows',
          exitCode: 1,
          data: workflows
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Error fetching workflows: ${err.message}`,
        exitCode: 1,
        error: err
      };
    }
  } else {
    // Using cached workflows
    return {
      success: true,
      message: 'Using cached workflows',
      exitCode: 0,
      data: {
        workflows: cachedWorkflows,
        cachedAt: workflowsCachedAt,
        fromCache: true
      }
    };
  }
}

/**
 * Analyze document with selected workflow
 */
export async function analyzeDocumentCore(
  client: VisionFi | null,
  fileData: Buffer,
  fileName: string,
  workflowKey: string,
  config: any,
  dependencies: InteractiveDependencies = {}
): Promise<InteractiveCommandResult> {
  
  // Set up dependencies
  const configManager = dependencies.configManager || {
    saveConfig: (config) => require('../utils/config').saveConfig(config)
  };
  
  if (!client) {
    return {
      success: false,
      message: 'Client not initialized',
      exitCode: 1
    };
  }
  
  try {
    const result = await client.analyzeDocument(fileData, {
      fileName: fileName,
      analysisType: workflowKey
    });
    
    // Save UUID to recent list if available
    if (result.uuid) {
      const uuid = result.uuid;
      const recentUuids = [uuid, ...(config.recent_uuids || [])
        .filter((u: string) => u !== uuid)
        .slice(0, 9)];
      
      const updatedConfig = {
        ...config,
        recent_uuids: recentUuids
      };
      
      configManager.saveConfig(updatedConfig);
      
      return {
        success: true,
        message: 'Document submitted successfully',
        exitCode: 0,
        data: {
          uuid,
          result,
          config: updatedConfig
        }
      };
    } else {
      return {
        success: false,
        message: 'Document submitted but no UUID was returned',
        exitCode: 1,
        data: result
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Error submitting document: ${err.message}`,
      exitCode: 1,
      error: err
    };
  }
}

/**
 * Get results for a job UUID
 */
export async function getResultsCore(
  client: VisionFi | null,
  uuid: string
): Promise<InteractiveCommandResult> {
  
  if (!client) {
    return {
      success: false,
      message: 'Client not initialized',
      exitCode: 1
    };
  }
  
  try {
    const result = await client.getResults(uuid);
    
    if (result.results) {
      return {
        success: true,
        message: 'Results retrieved successfully',
        exitCode: 0,
        data: result
      };
    } else if ('error' in result && result.error) {
      return {
        success: false,
        message: 'Analysis error',
        exitCode: 1,
        data: result,
        error: result.error
      };
    } else {
      return {
        success: false,
        message: 'No results available yet. The job may still be processing.',
        exitCode: 0,
        data: result
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to retrieve results: ${err.message}`,
      exitCode: 1,
      error: err
    };
  }
}

/**
 * Get client information
 */
export async function getClientInfoCore(
  client: VisionFi | null
): Promise<InteractiveCommandResult> {
  
  if (!client) {
    return {
      success: false,
      message: 'Client not initialized',
      exitCode: 1
    };
  }
  
  try {
    const clientInfo = await client.getClientInfo();
    
    if (clientInfo.success && clientInfo.data) {
      return {
        success: true,
        message: 'Client information retrieved successfully',
        exitCode: 0,
        data: clientInfo.data
      };
    } else {
      return {
        success: false,
        message: 'Failed to retrieve client information',
        exitCode: 1,
        data: clientInfo
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Error retrieving client information: ${err.message}`,
      exitCode: 1,
      error: err
    };
  }
}

/**
 * Update configuration setting
 */
export function updateConfigCore(
  config: any,
  key: string,
  value: any,
  dependencies: InteractiveDependencies = {}
): InteractiveCommandResult {
  
  // Set up dependencies
  const configManager = dependencies.configManager || {
    saveConfig: (config) => require('../utils/config').saveConfig(config)
  };
  
  try {
    const updatedConfig = { ...config, [key]: value };
    configManager.saveConfig(updatedConfig);
    
    return {
      success: true,
      message: `Configuration updated: ${key}`,
      exitCode: 0,
      data: {
        key,
        value,
        config: updatedConfig
      }
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to update configuration: ${err.message}`,
      exitCode: 1,
      error: err
    };
  }
}

/**
 * Parse and convert workflow cache TTL input
 */
export function parseWorkflowCacheTtlCore(
  input: string
): InteractiveCommandResult {
  
  try {
    const normalizedInput = input.trim().toLowerCase();
    let seconds: number;
    
    if (normalizedInput.endsWith('s')) {
      seconds = parseInt(normalizedInput.slice(0, -1));
    } else if (normalizedInput.endsWith('m')) {
      seconds = parseInt(normalizedInput.slice(0, -1)) * 60;
    } else if (normalizedInput.endsWith('h')) {
      seconds = parseInt(normalizedInput.slice(0, -1)) * 3600;
    } else {
      seconds = parseInt(normalizedInput);
    }
    
    if (isNaN(seconds) || seconds < 0) {
      return {
        success: false,
        message: 'Invalid cache TTL. Must be a positive number.',
        exitCode: 1
      };
    }
    
    return {
      success: true,
      message: 'Cache TTL parsed successfully',
      exitCode: 0,
      data: {
        seconds,
        formattedString: formatCacheTtlCore(seconds).message
      }
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Invalid format. Examples: 30s, 10m, 2h',
      exitCode: 1,
      error: err
    };
  }
}

/**
 * Format cache TTL for display
 */
export function formatCacheTtlCore(
  seconds: number
): InteractiveCommandResult {
  
  let formattedString: string;
  
  if (seconds < 60) {
    formattedString = `${seconds} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    formattedString = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(seconds / 3600);
    formattedString = `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return {
    success: true,
    message: formattedString,
    exitCode: 0,
    data: { seconds, formattedString }
  };
}