import { VisionFi } from 'visionfi';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, saveConfig } from '../utils/config';
import { error, success, info } from '../ui/colors';
import { CLIConfig } from '../types/config';
import { 
  AnalyzeOptions,
  AnalyzeCommandResult,
  AnalyzeClientFactory,
  FileSystem,
  ConfigManager,
  PathUtils
} from '../types/analyze';

/**
 * Core implementation for analyzing a document
 * Separated for testability and proper validation
 * 
 * @param filePath Path to the document to analyze
 * @param options Analysis options including workflow
 * @param config Configuration object
 * @param dependencies Injectable dependencies for testing
 * @returns Result object with success status, message, and exit code
 */
export async function analyzeDocumentCore(
  filePath: string,
  options: AnalyzeOptions,
  config: CLIConfig,
  dependencies: {
    clientFactory?: AnalyzeClientFactory,
    fileSystem?: FileSystem,
    pathUtils?: PathUtils,
    configManager?: ConfigManager
  } = {}
): Promise<AnalyzeCommandResult> {
  // Set up dependencies with defaults
  const clientFactory = dependencies.clientFactory || ((cfg) => new VisionFi(cfg));
  const fileSystem = dependencies.fileSystem || fs;
  const pathUtils = dependencies.pathUtils || path;
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
    
    
    // Check if file exists
    if (!fileSystem.existsSync(filePath)) {
      return {
        success: false,
        message: `File not found: ${filePath}`,
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
    
    
    // Check for workflow option
    if (!options.workflow) {
      return {
        success: false,
        message: 'No workflow specified. Use --workflow option to specify analysis workflow.',
        exitCode: 1
      };
    }
    
    const workflowKey = options.workflow;
    
    
    // Read file
    const fileData = fileSystem.readFileSync(filePath);
    
    
    // Submit for analysis
    try {
      const result = await client.analyzeDocument(fileData, {
        fileName: pathUtils.basename(filePath),
        analysisType: workflowKey
      });
      
      
      // Return result
      if (result.uuid) {
        return {
          success: true,
          message: 'Document submitted successfully!',
          exitCode: 0,
          uuid: result.uuid,
          data: result
        };
      } else {
        return {
          success: false,
          message: 'Document submitted but no UUID was returned.',
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
 * CLI command to analyze a document
 * Handles user interaction (console output) and process flow
 * 
 * @param filePath Path to the document to analyze
 * @param options Command options including workflow
 * @returns Exit code (0 for success, non-zero for failure)
 */
export async function analyzeDocument(filePath: string, options: any): Promise<void> {
  // Get configuration
  const config = loadConfig();
  
  // Execute core function
  const result = await analyzeDocumentCore(filePath, options, config);
  
  // Display appropriate messages based on result
  if (result.success) {
    console.log(success(result.message));
    
    // Save UUID to recent list if available
    if (result.uuid) {
      const uuid = result.uuid;
      config.recent_uuids = [uuid, ...config.recent_uuids.filter((u: string) => u !== uuid).slice(0, 9)];
      
      // Save updated config
      saveConfig(config);
      
      console.log(info(`Job UUID: ${uuid}`));
      console.log();
      console.log(info('You can retrieve results using this UUID with:'));
      console.log(info(`  visionfi results ${uuid}`));
    }
  } else {
    console.log(error(result.message));
  }
  
  // Exit with appropriate code
  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}