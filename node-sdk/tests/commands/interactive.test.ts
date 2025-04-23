/**
 * Tests for interactive command core functionality
 */

import {
  initializeClientCore,
  verifyAuthenticationCore,
  setupServiceAccountWithPathCore,
  setupDefaultServiceAccountCore,
  getWorkflowsCore,
  analyzeDocumentCore,
  getResultsCore,
  getClientInfoCore,
  updateConfigCore,
  parseWorkflowCacheTtlCore,
  formatCacheTtlCore
} from '../../src/commands/interactive-core';
import { SERVICE_ACCOUNT_KEY_NAME } from '../../src/utils/config';
import * as os from 'os';
import * as path from 'path';

// Mock VisionFi
const mockVerifyAuth = jest.fn();
const mockAnalyzeDocument = jest.fn();
const mockGetResults = jest.fn();
const mockGetClientInfo = jest.fn();
const mockGetWorkflows = jest.fn();

const mockVisionFiInstance = { 
  verifyAuth: mockVerifyAuth,
  analyzeDocument: mockAnalyzeDocument,
  getResults: mockGetResults,
  getClientInfo: mockGetClientInfo,
  getWorkflows: mockGetWorkflows
};

// Mock config values
const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.visionfi');
const DEFAULT_KEY_DIR = path.join(DEFAULT_CONFIG_DIR, 'keys');
const DEFAULT_KEY_PATH = path.join(DEFAULT_KEY_DIR, SERVICE_ACCOUNT_KEY_NAME);

const TEST_CONFIG = {
  service_account_path: '/path/to/service-account.json',
  api_endpoint: 'https://api.example.com',
  debug_mode: false,
  test_mode: false,
  workflow_cache_ttl: 300,
  recent_uuids: ['uuid1', 'uuid2']
};

describe('Interactive Core Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeClientCore', () => {
    it('should initialize client successfully', async () => {
      // Mock dependencies
      const mockClientFactory = jest.fn().mockReturnValue(mockVisionFiInstance);
      
      // Call the function
      const result = await initializeClientCore(
        '/path/to/service-account.json',
        TEST_CONFIG,
        { clientFactory: mockClientFactory }
      );
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(mockClientFactory).toHaveBeenCalledWith({
        serviceAccountPath: '/path/to/service-account.json',
        apiBaseUrl: 'https://api.example.com'
      });
      expect(result.data?.client).toBe(mockVisionFiInstance);
    });
    
    it('should handle client initialization errors', async () => {
      // Mock dependencies to throw an error
      const mockClientFactory = jest.fn().mockImplementation(() => {
        throw new Error('Initialization failed');
      });
      
      // Call the function
      const result = await initializeClientCore(
        '/path/to/service-account.json',
        TEST_CONFIG,
        { clientFactory: mockClientFactory }
      );
      
      // Verify result
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Failed to initialize client');
      expect(result.error).toBeDefined();
    });
  });

  describe('verifyAuthenticationCore', () => {
    it('should verify authentication successfully', async () => {
      // Mock dependencies
      mockVerifyAuth.mockResolvedValue({ data: true });
      
      // Call the function
      const result = await verifyAuthenticationCore(mockVisionFiInstance as any);
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(mockVerifyAuth).toHaveBeenCalled();
    });
    
    it('should handle authentication failure without error', async () => {
      // Mock dependencies
      mockVerifyAuth.mockResolvedValue({ data: false });
      
      // Call the function
      const result = await verifyAuthenticationCore(mockVisionFiInstance as any);
      
      // Verify result
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(mockVerifyAuth).toHaveBeenCalled();
    });
    
    it('should handle authentication errors', async () => {
      // Mock dependencies
      mockVerifyAuth.mockRejectedValue(new Error('Auth failed'));
      
      // Call the function
      const result = await verifyAuthenticationCore(mockVisionFiInstance as any);
      
      // Verify result
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Authentication test failed');
      expect(result.error).toBeDefined();
    });
    
    it('should handle null client', async () => {
      // Call the function with null client
      const result = await verifyAuthenticationCore(null);
      
      // Verify result
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toBe('Client not initialized');
    });
  });

  describe('setupServiceAccountWithPathCore', () => {
    it('should setup service account with valid path', async () => {
      // Mock dependencies with complete interface implementation
      const mockFileSystem = {
        existsSync: jest.fn().mockReturnValue(true),
        readFileSync: jest.fn().mockReturnValue(Buffer.from('mock-data')),
        mkdirSync: jest.fn(),
        copyFileSync: jest.fn()
      };
      
      const mockConfigManager = {
        loadConfig: jest.fn().mockReturnValue(TEST_CONFIG),
        saveConfig: jest.fn()
      };
      
      const mockClientFactory = jest.fn().mockReturnValue(mockVisionFiInstance);
      
      // Call the function
      const result = await setupServiceAccountWithPathCore(
        '/path/to/service-account.json',
        TEST_CONFIG,
        {
          fileSystem: mockFileSystem,
          configManager: mockConfigManager,
          clientFactory: mockClientFactory
        }
      );
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(mockFileSystem.existsSync).toHaveBeenCalled();
      expect(mockConfigManager.saveConfig).toHaveBeenCalled();
      expect(mockClientFactory).toHaveBeenCalled();
      expect(result.data?.client).toBe(mockVisionFiInstance);
    });
    
    it('should handle non-existent file', async () => {
      // Mock dependencies with complete interface implementation
      const mockFileSystem = {
        existsSync: jest.fn().mockReturnValue(false),
        readFileSync: jest.fn().mockReturnValue(Buffer.from('mock-data')),
        mkdirSync: jest.fn(),
        copyFileSync: jest.fn()
      };
      
      // Call the function
      const result = await setupServiceAccountWithPathCore(
        '/non-existent-file.json',
        TEST_CONFIG,
        { fileSystem: mockFileSystem }
      );
      
      // Verify result
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('File not found');
    });
    
    it('should handle empty path', async () => {
      // Call the function with empty path
      const result = await setupServiceAccountWithPathCore(
        '',
        TEST_CONFIG
      );
      
      // Verify result
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toBe('Service account path is empty');
    });
  });

  describe('getWorkflowsCore', () => {
    it('should fetch workflows when cache is empty', async () => {
      // Mock dependencies
      mockGetWorkflows.mockResolvedValue({
        success: true,
        data: [{ workflow_key: 'test-workflow' }]
      });
      
      // Call the function
      const result = await getWorkflowsCore(
        mockVisionFiInstance as any,
        false,
        null,
        0,
        300
      );
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(mockGetWorkflows).toHaveBeenCalled();
      expect(result.data?.workflows.success).toBe(true);
      expect(result.data?.workflows.data).toEqual([{ workflow_key: 'test-workflow' }]);
    });
    
    it('should use cache when available and not expired', async () => {
      // Mock cache data
      const cachedWorkflows = {
        success: true,
        data: [{ workflow_key: 'cached-workflow' }]
      };
      
      const now = Date.now();
      const cacheTime = now - 100000; // Less than TTL
      
      // Call the function
      const result = await getWorkflowsCore(
        mockVisionFiInstance as any,
        false,
        cachedWorkflows,
        cacheTime,
        300
      );
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(mockGetWorkflows).not.toHaveBeenCalled();
      expect(result.data?.workflows).toBe(cachedWorkflows);
      expect(result.data?.fromCache).toBe(true);
    });
    
    it('should force refresh cache when requested', async () => {
      // Mock dependencies
      mockGetWorkflows.mockResolvedValue({
        success: true,
        data: [{ workflow_key: 'new-workflow' }]
      });
      
      // Mock cache data
      const cachedWorkflows = {
        success: true,
        data: [{ workflow_key: 'cached-workflow' }]
      };
      
      const now = Date.now();
      const cacheTime = now - 100000; // Less than TTL
      
      // Call the function with forceRefresh=true
      const result = await getWorkflowsCore(
        mockVisionFiInstance as any,
        true, // force refresh
        cachedWorkflows,
        cacheTime,
        300
      );
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(mockGetWorkflows).toHaveBeenCalled();
      expect(result.data?.workflows.data).toEqual([{ workflow_key: 'new-workflow' }]);
    });
    
    it('should handle API errors', async () => {
      // Mock dependencies
      mockGetWorkflows.mockRejectedValue(new Error('API error'));
      
      // Call the function
      const result = await getWorkflowsCore(
        mockVisionFiInstance as any,
        false,
        null,
        0,
        300
      );
      
      // Verify result
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Error fetching workflows');
      expect(result.error).toBeDefined();
    });
  });

  describe('analyzeDocumentCore', () => {
    it('should analyze document successfully', async () => {
      // Mock dependencies
      mockAnalyzeDocument.mockResolvedValue({
        uuid: 'test-uuid',
        status: 'submitted'
      });
      
      const mockFileData = Buffer.from('test-file-data');
      const mockConfigManager = {
        loadConfig: jest.fn().mockReturnValue(TEST_CONFIG),
        saveConfig: jest.fn()
      };
      
      // Call the function
      const result = await analyzeDocumentCore(
        mockVisionFiInstance as any,
        mockFileData,
        'test-file.pdf',
        'test-workflow',
        TEST_CONFIG,
        { configManager: mockConfigManager }
      );
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(mockAnalyzeDocument).toHaveBeenCalledWith(mockFileData, {
        fileName: 'test-file.pdf',
        analysisType: 'test-workflow'
      });
      expect(mockConfigManager.saveConfig).toHaveBeenCalled();
      expect(result.data?.uuid).toBe('test-uuid');
    });
    
    it('should handle missing UUID in response', async () => {
      // Mock dependencies
      mockAnalyzeDocument.mockResolvedValue({
        status: 'submitted'
        // No UUID
      });
      
      const mockFileData = Buffer.from('test-file-data');
      
      // Call the function
      const result = await analyzeDocumentCore(
        mockVisionFiInstance as any,
        mockFileData,
        'test-file.pdf',
        'test-workflow',
        TEST_CONFIG
      );
      
      // Verify result
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Document submitted but no UUID was returned');
    });
    
    it('should handle analysis errors', async () => {
      // Mock dependencies
      mockAnalyzeDocument.mockRejectedValue(new Error('Analysis failed'));
      
      const mockFileData = Buffer.from('test-file-data');
      
      // Call the function
      const result = await analyzeDocumentCore(
        mockVisionFiInstance as any,
        mockFileData,
        'test-file.pdf',
        'test-workflow',
        TEST_CONFIG
      );
      
      // Verify result
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Error submitting document');
      expect(result.error).toBeDefined();
    });
  });

  // Additional test suites would be implemented for the remaining core functions
  // following the same pattern, testing success cases, error handling, and edge cases

  // Note: We're not directly testing QualityCheck integration here
  // This is handled by our quality-check runner
  describe('Function Structure Validation', () => {
    it('should ensure core functions have the correct structure', async () => {
      // Verify the functions exist and have the expected signature
      expect(typeof initializeClientCore).toBe('function');
      expect(typeof verifyAuthenticationCore).toBe('function');
      
      // Test function behavior without focusing on QualityCheck
      const initResult = await initializeClientCore(
        '/path/to/service-account.json',
        TEST_CONFIG
      );
      
      expect(initResult).toHaveProperty('success');
      expect(initResult).toHaveProperty('message');
      expect(initResult).toHaveProperty('exitCode');
      
      const authResult = await verifyAuthenticationCore(
        mockVisionFiInstance as any
      );
      
      expect(authResult).toHaveProperty('success');
      expect(authResult).toHaveProperty('message');
      expect(authResult).toHaveProperty('exitCode');
    });
  });
});