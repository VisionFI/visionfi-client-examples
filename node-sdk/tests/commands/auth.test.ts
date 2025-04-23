import { VisionFi } from 'visionfi';
import { verifyAuth, authenticateWithApi } from '../../src/commands/auth';
import * as config from '../../src/utils/config';
import { CLIConfig } from '../../src/types';

// DO NOT mock the qualityCheck module
// 
jest.mock('visionfi');
jest.mock('../../src/utils/config');

// 
// This ensures QualityCheck points are hit during tests

// 
// 

describe('Auth Commands', () => {
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
      recent_uuids: [],
      debug_mode: false,
      test_mode: false,
      workflow_cache_ttl: 3600
    });
  });
  
  afterEach(() => {
    // Restore console.log after each test
    consoleLogSpy.mockRestore();
  });
  
  describe('authenticateWithApi', () => {
    it('should return success result when authentication succeeds', async () => {
      // Create mock client factory
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
      const mockClient = { verifyAuth: mockVerifyAuth };
      const mockClientFactory = jest.fn().mockReturnValue(mockClient);
      
      // Mock config
      const testConfig: CLIConfig = {
        service_account_path: '/path/to/service-account.json',
        api_endpoint: 'https://api.visionfi.com',
        recent_uuids: [],
        debug_mode: false,
        test_mode: false,
        workflow_cache_ttl: 3600
      };
      
      // Execute core function directly
      const result = await authenticateWithApi(testConfig, mockClientFactory);
      
      // Verify
      expect(mockClientFactory).toHaveBeenCalledWith({
        serviceAccountPath: '/path/to/service-account.json',
        apiBaseUrl: 'https://api.visionfi.com'
      });
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Authentication successful!',
        exitCode: 0,
        data: true
      });
    });
    
    it('should return failure result when authentication fails', async () => {
      // Create mock client factory 
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: false });
      const mockClient = { verifyAuth: mockVerifyAuth };
      const mockClientFactory = jest.fn().mockReturnValue(mockClient);
      
      // Mock config
      const testConfig: CLIConfig = {
        service_account_path: '/path/to/service-account.json',
        api_endpoint: 'https://api.visionfi.com',
        recent_uuids: [],
        debug_mode: false,
        test_mode: false,
        workflow_cache_ttl: 3600
      };
      
      // Execute core function directly
      const result = await authenticateWithApi(testConfig, mockClientFactory);
      
      // Verify
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Authentication failed!',
        exitCode: 1,
        data: false
      });
    });
    
    it('should handle API errors', async () => {
      // Create mock client factory that throws error
      const mockVerifyAuth = jest.fn().mockRejectedValue(new Error('API error'));
      const mockClient = { verifyAuth: mockVerifyAuth };
      const mockClientFactory = jest.fn().mockReturnValue(mockClient);
      
      // Mock config
      const testConfig: CLIConfig = {
        service_account_path: '/path/to/service-account.json',
        api_endpoint: 'https://api.visionfi.com',
        recent_uuids: [],
        debug_mode: false,
        test_mode: false,
        workflow_cache_ttl: 3600
      };
      
      // Execute core function directly
      const result = await authenticateWithApi(testConfig, mockClientFactory);
      
      // Verify
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Authentication error: API error',
        exitCode: 1,
        error: expect.any(Error)
      });
    });
    
    it('should handle missing service account', async () => {
      // Create mock client factory
      const mockClientFactory = jest.fn();
      
      // Mock config with missing service account
      const testConfig = {
        api_endpoint: 'https://api.visionfi.com',
        recent_uuids: [],
        debug_mode: false,
        test_mode: false,
        workflow_cache_ttl: 3600,
        service_account_path: undefined
      } as unknown as CLIConfig; // Cast through unknown to CLIConfig
      
      // Execute core function directly
      const result = await authenticateWithApi(testConfig, mockClientFactory);
      
      // Verify
      expect(mockClientFactory).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Client not initialized. Please configure a service account first.',
        exitCode: 1
      });
    });
  });
  
  describe('verifyAuth CLI command', () => {
    it('should display success message and return zero exit code on success', async () => {
      // Setup VisionFi mock
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
      (VisionFi as jest.Mock).mockImplementation(() => ({
        verifyAuth: mockVerifyAuth
      }));
      
      // Execute CLI function
      const exitCode = await verifyAuth();
      
      // Verify
      expect(config.loadConfig).toHaveBeenCalled();
      expect(VisionFi).toHaveBeenCalledWith({
        serviceAccountPath: '/path/to/service-account.json',
        apiBaseUrl: 'https://api.visionfi.com'
      });
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Authentication successful'));
      expect(exitCode).toBe(0);
    });
    
    it('should display error message and return non-zero exit code on failure', async () => {
      // Setup VisionFi mock
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: false });
      (VisionFi as jest.Mock).mockImplementation(() => ({
        verifyAuth: mockVerifyAuth
      }));
      
      // Execute CLI function
      const exitCode = await verifyAuth();
      
      // Verify
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Authentication failed'));
      expect(exitCode).toBe(1);
    });
    
    it('should display error message with API errors', async () => {
      // Setup VisionFi mock
      const mockVerifyAuth = jest.fn().mockRejectedValue(new Error('API error'));
      (VisionFi as jest.Mock).mockImplementation(() => ({
        verifyAuth: mockVerifyAuth
      }));
      
      // Execute CLI function
      const exitCode = await verifyAuth();
      
      // Verify
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Authentication error'));
      expect(exitCode).toBe(1);
    });
    
    it('should display helpful message with missing service account', async () => {
      // Mock config with missing service account
      (config.loadConfig as jest.Mock).mockReturnValue({
        api_endpoint: 'https://api.visionfi.com',
        recent_uuids: [],
        debug_mode: false,
        test_mode: false,
        workflow_cache_ttl: 3600
      });
      
      // Execute CLI function
      const exitCode = await verifyAuth();
      
      // Verify
      expect(VisionFi).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Client not initialized'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Run the interactive mode'));
      expect(exitCode).toBe(1);
    });
  });
  
  // Special test for QualityCheck validation
  it('should fail when quality checks are enabled', async () => {
    // Setup to enable quality checks
    // Normally you wouldn't import QualityCheck in tests, but this is a special test
    // that specifically tests the QualityCheck system itself
    const qc = require('../../src/utils/qualityCheck');
    
    try {
      // Enable quality checks to make QualityCheck calls throw
      qc.enableQualityChecks();
      
      // First check if it's enabled correctly
      expect(qc.areQualityChecksEnabled()).toBe(true);
      
      // Setup mock client factory
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
      const mockClient = { verifyAuth: mockVerifyAuth };
      const mockClientFactory = jest.fn().mockReturnValue(mockClient);
      
      // Execute core function directly with mock dependencies
      // This should hit QualityCheck points and throw
      await authenticateWithApi({
        service_account_path: '/path/to/service-account.json',
        api_endpoint: 'https://api.visionfi.com',
        recent_uuids: [],
        debug_mode: false,
        test_mode: false,
        workflow_cache_ttl: 3600
      }, mockClientFactory);
      
      // If we get here, the test should fail because no QualityCheck was triggered
      fail('authenticateWithApi() should have thrown due to QualityCheck being enabled');
    } catch (error) {
      // We expect an error with "QUALITY CHECK" in the message
      expect((error as Error).message).toContain('QUALITY CHECK');
    } finally {
      // Reset the quality checks
      qc.disableQualityChecks();
    }
  });
});