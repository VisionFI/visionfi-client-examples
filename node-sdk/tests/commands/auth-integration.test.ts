/**
 * Integration tests for auth commands
 * Uses targeted mocking to ensure implementation code paths are executed
 */

// Define mock functions before imports (this is important for hoisting)
const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
const mockVisionFiInstance = {
  verifyAuth: mockVerifyAuth
};
const mockVisionFiConstructor = jest.fn(() => mockVisionFiInstance);

// Setup mock BEFORE imports - Jest hoists this
jest.mock('visionfi', () => ({
  VisionFi: mockVisionFiConstructor
}));

// Now import modules
import { verifyAuth, authenticateWithApi } from '../../src/commands/auth';
import * as config from '../../src/utils/config';
import { VisionFi } from 'visionfi';
import { CLIConfig } from '../../src/types';

// We do NOT import QualityCheck - tests must remain independent

describe('Auth Command Integration', () => {
  let consoleLogSpy: jest.SpyInstance;
  let configLoadSpy: jest.SpyInstance;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Spy on console.log to prevent output cluttering
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Mock config but don't mock our command implementation
    configLoadSpy = jest.spyOn(config, 'loadConfig').mockReturnValue({
      service_account_path: '/path/to/service-account.json',
      api_endpoint: 'https://api.visionfi.com',
      recent_uuids: [],
      debug_mode: false,
      test_mode: false,
      workflow_cache_ttl: 3600
    });
  });
  
  afterEach(() => {
    consoleLogSpy.mockRestore();
  });
  
  describe('authenticateWithApi - Core Auth Logic', () => {
    it('should execute core auth logic for successful authentication', async () => {
      // Reset mock to default success response
      mockVerifyAuth.mockResolvedValue({ data: true });
      
      // Get test config
      const testConfig = config.loadConfig();
      
      // Execute core function directly - this should hit QualityCheck points
      const result = await authenticateWithApi(testConfig);
      
      // Verify behavior
      expect(mockVisionFiConstructor).toHaveBeenCalledWith({
        serviceAccountPath: '/path/to/service-account.json',
        apiBaseUrl: 'https://api.visionfi.com'
      });
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain('successful');
      expect(result.exitCode).toBe(0);
    });
    
    it('should execute core auth logic for failed authentication', async () => {
      // Setup auth failure
      mockVerifyAuth.mockResolvedValue({ data: false });
      
      // Get test config
      const testConfig = config.loadConfig();
      
      // Execute core function directly - this should hit QualityCheck points
      const result = await authenticateWithApi(testConfig);
      
      // Verify behavior
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toContain('failed');
      expect(result.exitCode).toBe(1);
    });
    
    it('should execute core auth logic for API errors', async () => {
      // Setup API error
      mockVerifyAuth.mockRejectedValue(new Error('API error'));
      
      // Get test config
      const testConfig = config.loadConfig();
      
      // Execute core function directly - this should hit QualityCheck points
      const result = await authenticateWithApi(testConfig);
      
      // Verify behavior
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toContain('error');
      expect(result.exitCode).toBe(1);
      expect(result.error).toBeInstanceOf(Error);
    });
    
    it('should handle missing service account configuration', async () => {
      // Configure no service account
      configLoadSpy.mockReturnValue({
        api_endpoint: 'https://api.visionfi.com',
        recent_uuids: [],
        debug_mode: false,
        test_mode: false,
        workflow_cache_ttl: 3600,
        service_account_path: undefined
        // Explicitly set to undefined to simulate missing
      } as unknown as CLIConfig);
      
      // Get test config
      const testConfig = config.loadConfig();
      
      // Execute core function directly - this should hit QualityCheck points
      const result = await authenticateWithApi(testConfig);
      
      // Verify behavior
      expect(mockVisionFiConstructor).not.toHaveBeenCalled(); // Client shouldn't be created
      expect(mockVerifyAuth).not.toHaveBeenCalled(); // No API calls should be made
      expect(result.success).toBe(false);
      expect(result.message).toContain('not initialized');
      expect(result.exitCode).toBe(1);
    });
  });
  
  describe('verifyAuth - CLI Command', () => {
    it('should execute CLI command for successful authentication', async () => {
      // Reset mock to default success response
      mockVerifyAuth.mockResolvedValue({ data: true });
      
      // Execute CLI function
      const exitCode = await verifyAuth();
      
      // Verify behavior
      expect(configLoadSpy).toHaveBeenCalled();
      expect(mockVisionFiConstructor).toHaveBeenCalledWith({
        serviceAccountPath: '/path/to/service-account.json',
        apiBaseUrl: 'https://api.visionfi.com'
      });
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('successful'));
      expect(exitCode).toBe(0);
    });
  });
});