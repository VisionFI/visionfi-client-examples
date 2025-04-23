/**
 * Integration tests for results commands
 * Uses targeted mocking to ensure implementation code paths are executed
 */

// Define mock functions before imports (this is important for hoisting)
const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
const mockGetResults = jest.fn().mockResolvedValue({ 
  status: 'processed',
  results: { key: 'value' }
});
const mockVisionFiInstance = {
  verifyAuth: mockVerifyAuth,
  getResults: mockGetResults
};
const mockVisionFiConstructor = jest.fn(() => mockVisionFiInstance);

// Setup mocks BEFORE imports - Jest hoists these
jest.mock('visionfi', () => ({
  VisionFi: mockVisionFiConstructor
}));

// Now we can import modules
import { getResults, getResultsCore } from '../../src/commands/results';
import * as config from '../../src/utils/config';
import { CLIConfig } from '../../src/types/config';
import { ResultsOptions } from '../../src/types/results';
import { VisionFi } from 'visionfi';

// We do NOT import QualityCheck - tests must remain independent

// Mock process.exit to prevent test termination
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('Results Command Integration', () => {
  let consoleLogSpy: jest.SpyInstance;
  let configLoadSpy: jest.SpyInstance;
  let configSaveSpy: jest.SpyInstance;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks
    mockVerifyAuth.mockResolvedValue({ data: true });
    mockGetResults.mockResolvedValue({ 
      status: 'processed',
      results: { key: 'value' }
    });
    
    // Spy on console.log to prevent output cluttering
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Mock config module functions with spyOn
    configLoadSpy = jest.spyOn(config, 'loadConfig').mockReturnValue({
      service_account_path: '/path/to/service-account.json',
      api_endpoint: 'https://api.visionfi.com',
      recent_uuids: [],
      debug_mode: false,
      test_mode: false,
      workflow_cache_ttl: 3600
    });
    
    configSaveSpy = jest.spyOn(config, 'saveConfig').mockImplementation(() => {});
  });
  
  afterEach(() => {
    consoleLogSpy.mockRestore();
    mockExit.mockClear();
  });
  
  describe('getResultsCore - Core Results Logic', () => {
    it('should execute core logic for successful results retrieval', async () => {
      // Reset mock to default success response
      mockVerifyAuth.mockResolvedValue({ data: true });
      mockGetResults.mockResolvedValue({ 
        status: 'processed',
        results: { key: 'value' }
      });
      
      // Get test config
      const testConfig = config.loadConfig();
      
      // Options with wait false
      const options: ResultsOptions = { wait: false };
      
      // Execute core function directly - this should hit QualityCheck points
      const result = await getResultsCore('test-uuid-123', options, testConfig);
      
      // Verify behavior
      expect(mockVisionFiConstructor).toHaveBeenCalledWith({
        serviceAccountPath: '/path/to/service-account.json',
        apiBaseUrl: 'https://api.visionfi.com'
      });
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockGetResults).toHaveBeenCalledWith('test-uuid-123', 0, 1);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Results retrieved successfully');
      expect(result.exitCode).toBe(0);
    });
    
    it('should execute core logic for results not yet available', async () => {
      // Setup results not yet available
      mockVerifyAuth.mockResolvedValue({ data: true });
      mockGetResults.mockResolvedValue({ 
        status: 'processing',
        found: false
      });
      
      // Get test config
      const testConfig = config.loadConfig();
      
      // Default options
      const options: ResultsOptions = {};
      
      // Execute core function directly - this should hit QualityCheck points
      const result = await getResultsCore('test-uuid-123', options, testConfig);
      
      // Verify behavior
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockGetResults).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain('No results available yet');
      expect(result.exitCode).toBe(0);
    });
    
    it('should execute core logic with wait option', async () => {
      // Setup successful results
      mockVerifyAuth.mockResolvedValue({ data: true });
      mockGetResults.mockResolvedValue({ 
        status: 'processed',
        results: { key: 'value' }
      });
      
      // Get test config
      const testConfig = config.loadConfig();
      
      // Options with wait true
      const options: ResultsOptions = { 
        wait: true,
        pollInterval: 5000,
        maxAttempts: 20
      };
      
      // Execute core function directly - this should hit QualityCheck points
      const result = await getResultsCore('test-uuid-123', options, testConfig);
      
      // Verify behavior
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockGetResults).toHaveBeenCalledWith('test-uuid-123', 5000, 20);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });
    
    it('should execute core logic for API errors', async () => {
      // Setup API error
      mockVerifyAuth.mockResolvedValue({ data: true });
      mockGetResults.mockRejectedValue(new Error('API error'));
      
      // Get test config
      const testConfig = config.loadConfig();
      
      // Default options
      const options: ResultsOptions = {};
      
      // Execute core function directly - this should hit QualityCheck points
      const result = await getResultsCore('test-uuid-123', options, testConfig);
      
      // Verify behavior
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockGetResults).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to retrieve results');
      expect(result.exitCode).toBe(1);
      expect(result.error).toBeInstanceOf(Error);
    });
  });
  
  describe('getResults - CLI Command', () => {
    it('should execute CLI command for successful results retrieval', async () => {
      // Reset mocks
      mockVerifyAuth.mockResolvedValue({ data: true });
      mockGetResults.mockResolvedValue({ 
        status: 'processed',
        results: { key: 'value' }
      });
      
      // Execute CLI function
      await getResults('test-uuid-123');
      
      // Verify behavior
      expect(configLoadSpy).toHaveBeenCalled();
      expect(mockVisionFiConstructor).toHaveBeenCalled();
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockGetResults).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Results retrieved successfully'));
      expect(mockExit).not.toHaveBeenCalled(); // Success doesn't exit
    });
  });
});