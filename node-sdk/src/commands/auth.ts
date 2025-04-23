import { VisionFi } from 'visionfi';
import { error, success, info } from '../ui/colors';
import { loadConfig } from '../utils/config';
import { CLIConfig } from '../types/config';
import { AuthCommandResult, ClientFactory } from '../types/auth';

/**
 * Core authentication logic - separated for testability
 * 
 * @param config The configuration to use
 * @param clientFactory Factory function to create API client (injectable for testing)
 * @returns Authentication result with status, message and exit code
 */
export async function authenticateWithApi(
  config: CLIConfig,
  clientFactory: ClientFactory = (cfg) => new VisionFi(cfg)
): Promise<AuthCommandResult> {
  if (!config.service_account_path || config.service_account_path === undefined) {
    return {
      success: false,
      message: 'Client not initialized. Please configure a service account first.',
      exitCode: 1
    };
  }
  
  try {
    // Create a client instance
    const client = clientFactory({
      serviceAccountPath: config.service_account_path,
      apiBaseUrl: config.api_endpoint,
    });
    
    // Verify authentication
    const authResult = await client.verifyAuth();
    
    return {
      success: !!authResult.data,
      message: authResult.data ? 'Authentication successful!' : 'Authentication failed!',
      exitCode: authResult.data ? 0 : 1,
      data: authResult.data
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Authentication error: ${err.message}`,
      exitCode: 1,
      error: err
    };
  }
}

/**
 * CLI command to verify authentication
 * Handles user interaction (console output) and process flow
 * 
 * @returns Exit code (0 for success, non-zero for failure)
 */
export async function verifyAuth(): Promise<number> {
  const result = await authenticateWithApi(loadConfig());
  
  // Display appropriate message based on result
  if (result.success) {
    console.log(success(result.message));
  } else {
    console.log(error(result.message));
    
    // Add helpful instructions for initialization errors
    if (result.message.includes('not initialized')) {
      console.log(info('Run the interactive mode to set up your service account.'));
    }
  }
  
  return result.exitCode;
}