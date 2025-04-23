import { VisionFi } from 'visionfi';
import { getResults, getResultsCore } from '../../src/commands/results';
import * as config from '../../src/utils/config';
import { CLIConfig } from '../../src/types/config';
import { ResultsOptions } from '../../src/types/results';

// Mock the modules
jest.mock('visionfi');
jest.mock('../../src/utils/config');

// 
// 

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
  return undefined as never;
});

describe('Results Command', () => {
  // Mock console.log to test output
  let consoleLogSpy: jest.SpyInstance;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup console.log spy
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Mock the loadConfig function
    (config.loadConfig as jest.Mock).mockReturnValue({
      service_account_path: '/path/to/service-account.json',
      api_endpoint: 'https://api.visionfi.com',
      recent_uuids: []
    });
    
    // Mock the saveConfig function
    (config.saveConfig as jest.Mock).mockImplementation(() => {});
  });
  
  afterEach(() => {
    // Restore console.log after each test
    consoleLogSpy.mockRestore();
  });
  
  describe('getResultsCore', () => {
    it('should return success result when results are available', async () => {
      // Create mock dependencies
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
      const mockGetResults = jest.fn().mockResolvedValue({ 
        status: 'processed',
        results: { key: 'value' }
      });
      const mockClient = { 
        verifyAuth: mockVerifyAuth,
        getResults: mockGetResults
      };
      const mockClientFactory = jest.fn().mockReturnValue(mockClient);
      const mockConfigManager = {
        loadConfig: jest.fn(),
        saveConfig: jest.fn()
      };
      
      // Mock config
      const testConfig: CLIConfig = {
        service_account_path: '/path/to/service-account.json',
        api_endpoint: 'https://api.visionfi.com',
        recent_uuids: [],
        debug_mode: false,
        test_mode: false,
        workflow_cache_ttl: 3600
      };
      
      // Mock options
      const options: ResultsOptions = {}; // Default options
      
      // Execute core function directly
      const result = await getResultsCore(
        'test-uuid-123',
        options,
        testConfig,
        { 
          clientFactory: mockClientFactory,
          configManager: mockConfigManager
        }
      );
      
      // Verify
      expect(mockClientFactory).toHaveBeenCalledWith({
        serviceAccountPath: '/path/to/service-account.json',
        apiBaseUrl: 'https://api.visionfi.com'
      });
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockGetResults).toHaveBeenCalledWith('test-uuid-123', 0, 1);
      expect(mockConfigManager.saveConfig).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Results retrieved successfully!',
        exitCode: 0,
        status: 'processed',
        results: { key: 'value' }
      });
    });
    
    it('should return failure result when no service account is configured', async () => {
      // Create mock dependencies
      const mockClientFactory = jest.fn();
      const mockConfigManager = {
        loadConfig: jest.fn(),
        saveConfig: jest.fn()
      };
      
      // Mock config without service account
      const testConfig: CLIConfig = {
        api_endpoint: 'https://api.visionfi.com',
        recent_uuids: [],
        debug_mode: false,
        test_mode: false,
        workflow_cache_ttl: 3600,
        service_account_path: '' // Empty service account path
      };
      
      // Mock options
      const options: ResultsOptions = {};
      
      // Execute core function directly
      const result = await getResultsCore(
        'test-uuid-123',
        options,
        testConfig,
        { 
          clientFactory: mockClientFactory,
          configManager: mockConfigManager
        }
      );
      
      // Verify
      expect(mockClientFactory).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'No service account configured. Run in interactive mode to set up a service account.',
        exitCode: 1
      });
    });
    
    it('should return failure result when authentication fails', async () => {
      // Create mock dependencies
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: false });
      const mockClient = { 
        verifyAuth: mockVerifyAuth,
        getResults: jest.fn()
      };
      const mockClientFactory = jest.fn().mockReturnValue(mockClient);
      const mockConfigManager = {
        loadConfig: jest.fn(),
        saveConfig: jest.fn()
      };
      
      // Mock config
      const testConfig: CLIConfig = {
        service_account_path: '/path/to/service-account.json',
        api_endpoint: 'https://api.visionfi.com',
        recent_uuids: [],
        debug_mode: false,
        test_mode: false,
        workflow_cache_ttl: 3600
      };
      
      // Mock options
      const options: ResultsOptions = {};
      
      // Execute core function directly
      const result = await getResultsCore(
        'test-uuid-123',
        options,
        testConfig,
        { 
          clientFactory: mockClientFactory,
          configManager: mockConfigManager
        }
      );
      
      // Verify
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockClient.getResults).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Authentication failed.',
        exitCode: 1
      });
    });
    
    it('should return failure result when no UUID is provided', async () => {
      // Create mock dependencies
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
      const mockClient = { 
        verifyAuth: mockVerifyAuth,
        getResults: jest.fn()
      };
      const mockClientFactory = jest.fn().mockReturnValue(mockClient);
      const mockConfigManager = {
        loadConfig: jest.fn(),
        saveConfig: jest.fn()
      };
      
      // Mock config
      const testConfig: CLIConfig = {
        service_account_path: '/path/to/service-account.json',
        api_endpoint: 'https://api.visionfi.com',
        recent_uuids: [],
        debug_mode: false,
        test_mode: false,
        workflow_cache_ttl: 3600
      };
      
      // Mock options
      const options: ResultsOptions = {};
      
      // Execute core function directly with empty UUID
      const result = await getResultsCore(
        '',
        options,
        testConfig,
        { 
          clientFactory: mockClientFactory,
          configManager: mockConfigManager
        }
      );
      
      // Verify
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockClient.getResults).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'No job UUID specified.',
        exitCode: 1
      });
    });
    
    it('should return success result when no results available yet', async () => {
      // Create mock dependencies
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
      const mockGetResults = jest.fn().mockResolvedValue({ 
        status: 'processing',
        found: false
      });
      const mockClient = { 
        verifyAuth: mockVerifyAuth,
        getResults: mockGetResults
      };
      const mockClientFactory = jest.fn().mockReturnValue(mockClient);
      const mockConfigManager = {
        loadConfig: jest.fn(),
        saveConfig: jest.fn()
      };
      
      // Mock config
      const testConfig: CLIConfig = {
        service_account_path: '/path/to/service-account.json',
        api_endpoint: 'https://api.visionfi.com',
        recent_uuids: [],
        debug_mode: false,
        test_mode: false,
        workflow_cache_ttl: 3600
      };
      
      // Mock options
      const options: ResultsOptions = {};
      
      // Execute core function directly
      const result = await getResultsCore(
        'test-uuid-123',
        options,
        testConfig,
        { 
          clientFactory: mockClientFactory,
          configManager: mockConfigManager
        }
      );
      
      // Verify
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockGetResults).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'No results available yet. The job may still be processing.',
        exitCode: 0,
        status: 'processing'
      });
    });
    
    it('should use wait option when specified', async () => {
      // Create mock dependencies
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
      const mockGetResults = jest.fn().mockResolvedValue({ 
        status: 'processed',
        results: { key: 'value' }
      });
      const mockClient = { 
        verifyAuth: mockVerifyAuth,
        getResults: mockGetResults
      };
      const mockClientFactory = jest.fn().mockReturnValue(mockClient);
      const mockConfigManager = {
        loadConfig: jest.fn(),
        saveConfig: jest.fn()
      };
      
      // Mock config
      const testConfig: CLIConfig = {
        service_account_path: '/path/to/service-account.json',
        api_endpoint: 'https://api.visionfi.com',
        recent_uuids: [],
        debug_mode: false,
        test_mode: false,
        workflow_cache_ttl: 3600
      };
      
      // Mock options
      const options: ResultsOptions = { 
        wait: true,
        pollInterval: 5000,
        maxAttempts: 20
      };
      
      // Execute core function directly
      const result = await getResultsCore(
        'test-uuid-123',
        options,
        testConfig,
        { 
          clientFactory: mockClientFactory,
          configManager: mockConfigManager
        }
      );
      
      // Verify
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockGetResults).toHaveBeenCalledWith('test-uuid-123', 5000, 20);
      expect(result).toEqual({
        success: true,
        message: 'Results retrieved successfully!',
        exitCode: 0,
        status: 'processed',
        results: { key: 'value' }
      });
    });
    
    it('should return failure result for API errors', async () => {
      // Create mock dependencies
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
      const apiError = new Error('API error');
      const mockGetResults = jest.fn().mockRejectedValue(apiError);
      const mockClient = { 
        verifyAuth: mockVerifyAuth,
        getResults: mockGetResults
      };
      const mockClientFactory = jest.fn().mockReturnValue(mockClient);
      const mockConfigManager = {
        loadConfig: jest.fn(),
        saveConfig: jest.fn()
      };
      
      // Mock config
      const testConfig: CLIConfig = {
        service_account_path: '/path/to/service-account.json',
        api_endpoint: 'https://api.visionfi.com',
        recent_uuids: [],
        debug_mode: false,
        test_mode: false,
        workflow_cache_ttl: 3600
      };
      
      // Mock options
      const options: ResultsOptions = {};
      
      // Execute core function directly
      const result = await getResultsCore(
        'test-uuid-123',
        options,
        testConfig,
        { 
          clientFactory: mockClientFactory,
          configManager: mockConfigManager
        }
      );
      
      // Verify
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockGetResults).toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Failed to retrieve results: API error',
        exitCode: 1,
        error: apiError
      });
    });
  });
  
  describe('getResults CLI wrapper', () => {
    it('should display success message and results on success', async () => {
      // Setup VisionFi mock
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
      const mockGetResults = jest.fn().mockResolvedValue({ 
        status: 'processed',
        results: { key: 'value' }
      });
      (VisionFi as jest.Mock).mockImplementation(() => ({
        verifyAuth: mockVerifyAuth,
        getResults: mockGetResults
      }));
      
      // Execute CLI function
      await getResults('test-uuid-123');
      
      // Verify
      expect(config.loadConfig).toHaveBeenCalled();
      expect(VisionFi).toHaveBeenCalledWith({
        serviceAccountPath: '/path/to/service-account.json',
        apiBaseUrl: 'https://api.visionfi.com'
      });
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockGetResults).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Results retrieved successfully'));
      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify({ key: 'value' }, null, 2));
      expect(mockExit).not.toHaveBeenCalled(); // No exit for success
    });
    
    it('should display warning and hint when no results available', async () => {
      // Setup VisionFi mock
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
      const mockGetResults = jest.fn().mockResolvedValue({ 
        status: 'processing',
        found: false
      });
      (VisionFi as jest.Mock).mockImplementation(() => ({
        verifyAuth: mockVerifyAuth,
        getResults: mockGetResults
      }));
      
      // Execute CLI function
      await getResults('test-uuid-123');
      
      // Verify
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockGetResults).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No results available yet'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Try using --wait option'));
      expect(mockExit).not.toHaveBeenCalled(); // No exit for this case
    });
    
    it('should display error message and exit with error code on failure', async () => {
      // Setup VisionFi mock to return authentication failure
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: false });
      (VisionFi as jest.Mock).mockImplementation(() => ({
        verifyAuth: mockVerifyAuth,
      }));
      
      // Execute CLI function
      await getResults('test-uuid-123');
      
      // Verify
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Authentication failed'));
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
  
  // Special test for QualityCheck validation
  it('should hit all QualityCheck points in a comprehensive flow', async () => {
    // Use the original integration style test to ensure all points are hit
    // Setup for a full successful run
    const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
    const mockGetResults = jest.fn().mockResolvedValue({ 
      status: 'processed',
      results: { key: 'value' }
    });
    (VisionFi as jest.Mock).mockImplementation(() => ({
      verifyAuth: mockVerifyAuth,
      getResults: mockGetResults
    }));
    
    // Execute directly rather than through CLI wrapper
    const testConfig: CLIConfig = {
      service_account_path: '/path/to/service-account.json',
      api_endpoint: 'https://api.visionfi.com',
      recent_uuids: [],
      debug_mode: false,
      test_mode: false,
      workflow_cache_ttl: 3600
    };
    
    const options: ResultsOptions = {};
    
    // This should hit all QualityCheck points
    const result = await getResultsCore('test-uuid-123', options, testConfig);
    
    // Verify behavior - just for completeness
    expect(result.success).toBe(true);
    expect(result.message).toContain('Results retrieved successfully');
    expect(result.exitCode).toBe(0);
  });
});