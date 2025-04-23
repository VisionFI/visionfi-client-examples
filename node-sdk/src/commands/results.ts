import { VisionFi } from 'visionfi';
import { loadConfig, saveConfig } from '../utils/config';
import { error, success, info, warning } from '../ui/colors';
import { CLIConfig } from '../types/config';
import {
  ResultsOptions,
  ResultsCommandResult,
  ResultsClientFactory,
  ResultsConfigManager
} from '../types/results';

/**
 * Core implementation for retrieving results
 * Separated for testability and proper validation
 * 
 * @param uuid Job UUID to retrieve results for
 * @param options Options for results retrieval
 * @param config Configuration object
 * @param dependencies Injectable dependencies for testing
 * @returns Result object with success status, message, and exit code
 */
export async function getResultsCore(
  uuid: string,
  options: ResultsOptions = {},
  config: CLIConfig,
  dependencies: {
    clientFactory?: ResultsClientFactory,
    configManager?: ResultsConfigManager
  } = {}
): Promise<ResultsCommandResult> {
  // Set up dependencies with defaults
  const clientFactory = dependencies.clientFactory || ((cfg) => new VisionFi(cfg));
  const configManager = dependencies.configManager || { 
    loadConfig, 
    saveConfig 
  };

  try {
    
    // Check if service account is configured
    if (!config.service_account_path) {
      return {
        success: false,
        message: 'No service account configured. Run in interactive mode to set up a service account.',
        exitCode: 1
      };
    }
    
    // Initialize client
    const client = clientFactory({
      serviceAccountPath: config.service_account_path,
      apiBaseUrl: config.api_endpoint
    });
    
    
    // Verify authentication
    try {
      const authResult = await client.verifyAuth();
      if (!authResult.data) {
        return {
          success: false,
          message: 'Authentication failed.',
          exitCode: 1
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Authentication error: ${err.message}`,
        exitCode: 1,
        error: err
      };
    }
    
    
    // Check if UUID was provided
    if (!uuid) {
      return {
        success: false,
        message: 'No job UUID specified.',
        exitCode: 1
      };
    }
    
    
    // Save UUID to recent list if not already there
    if (!config.recent_uuids.includes(uuid)) {
      config.recent_uuids = [uuid, ...config.recent_uuids.filter((u: string) => u !== uuid).slice(0, 9)];
      configManager.saveConfig(config);
    }
    
    
    // Optional parameters
    const pollInterval = typeof options.pollInterval === 'string' 
      ? parseInt(options.pollInterval, 10) 
      : (options.pollInterval || 3000); // 3 seconds default
      
    const maxAttempts = typeof options.maxAttempts === 'string'
      ? parseInt(options.maxAttempts, 10)
      : (options.maxAttempts || 10);    // 10 attempts default
    
    // Check for wait option
    const shouldWait = options.wait || false;
    
    // Get results
    try {
      let result;
      
      if (shouldWait) {
        result = await client.getResults(uuid, pollInterval, maxAttempts);
      } else {
        result = await client.getResults(uuid, 0, 1);
      }
      
      
      // Return different success/failure based on what's available
      if (result.results) {
        return {
          success: true,
          message: 'Results retrieved successfully!',
          exitCode: 0,
          status: result.status,
          results: result.results
        };
      } else if ('error' in result && result.error) {
        return {
          success: false,
          message: 'Analysis error occurred during processing.',
          exitCode: 1,
          status: result.status,
          error: result.error
        };
      } else {
        // No results yet, but not an error
        return {
          success: true,
          message: 'No results available yet. The job may still be processing.',
          exitCode: 0,
          status: result.status
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
  } catch (err: any) {
    return {
      success: false,
      message: `Unexpected error: ${err.message}`,
      exitCode: 1,
      error: err
    };
  }
}

/**
 * CLI command to retrieve results
 * Handles user interaction (console output) and process flow
 * 
 * @param uuid Job UUID to retrieve results for
 * @param options Command options
 */
export async function getResults(uuid: string, options: any = {}): Promise<void> {
  // Get configuration
  const config = loadConfig();
  
  // Execute core function
  const result = await getResultsCore(uuid, options, config);
  
  // Display appropriate messages based on result
  if (result.success) {
    if (result.results) {
      console.log(success(result.message));
      
      // Show status if available
      if (result.status) {
        console.log(`Status: ${info(result.status)}`);
      }
      
      console.log();
      // Pretty print the results
      console.log(JSON.stringify(result.results, null, 2));
    } else {
      // No results yet
      if (result.status) {
        console.log(`Status: ${info(result.status)}`);
      }
      
      console.log(warning(result.message));
      
      // Show wait option hint if not already waiting
      if (!options.wait) {
        console.log(info('Try using --wait option to poll for results.'));
      }
    }
  } else {
    console.log(error(result.message));
    
    // Show detailed error if available
    if (result.error && typeof result.error === 'object') {
      console.log(JSON.stringify(result.error, null, 2));
    }
    
    // Add helpful instructions for initialization errors
    if (result.message.includes('not configured')) {
      console.log(info('Run in interactive mode to set up your service account.'));
    }
    
    // Exit with error code
    process.exit(result.exitCode);
  }
}