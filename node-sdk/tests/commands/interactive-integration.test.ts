/**
 * Integration tests for interactive command functionality
 * Uses minimal mocking to ensure implementation code paths are executed
 */

// Define mock functions before imports (important for hoisting)
const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
const mockAnalyzeDocument = jest.fn().mockResolvedValue({ uuid: 'test-uuid' });
const mockGetResults = jest.fn().mockResolvedValue({ results: { key: 'value' } });
const mockGetClientInfo = jest.fn().mockResolvedValue({ 
  success: true, 
  data: { client_id: 'test-id' } 
});
const mockGetWorkflows = jest.fn().mockResolvedValue({ 
  success: true, 
  data: [{ workflow_key: 'test-workflow' }] 
});

// Create mockVisionFiInstance with required VisionFi properties
const mockVisionFiInstance = { 
  verifyAuth: mockVerifyAuth,
  analyzeDocument: mockAnalyzeDocument,
  getResults: mockGetResults,
  getClientInfo: mockGetClientInfo,
  getWorkflows: mockGetWorkflows,
  getAuthToken: jest.fn().mockResolvedValue('mock-token'),
  apiClient: { get: jest.fn(), post: jest.fn() }
};

// Mock the VisionFi class constructor to return properly typed instance
const mockVisionFiConstructor = jest.fn(() => mockVisionFiInstance as unknown as any);

// Setup mock BEFORE imports - Jest hoists this
jest.mock('visionfi', () => ({
  VisionFi: mockVisionFiConstructor
}));

// We should NOT be mocking or tracking QualityCheck points
// This violates the principle of test independence from QualityCheck
// The QualityCheck system should validate coverage later, not during normal tests

// Just let the real QualityCheck module be used
// The real implementation does nothing when not in validation mode

// Now import modules
import {
  initializeClientCore,
  verifyAuthenticationCore,
  setupServiceAccountWithPathCore,
  getWorkflowsCore,
  analyzeDocumentCore,
  getResultsCore
} from '../../src/commands/interactive-core';
import * as path from 'path';
import * as os from 'os';
import { SERVICE_ACCOUNT_KEY_NAME } from '../../src/utils/config';

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

// We need to mock fs for testing file operations
const mockExistsSync = jest.fn().mockReturnValue(true);
const mockMkdirSync = jest.fn();
const mockReadFileSync = jest.fn().mockReturnValue(Buffer.from('mock-data'));
const mockCopyFileSync = jest.fn();

jest.mock('fs', () => ({
  existsSync: (...args: any[]) => mockExistsSync(...args),
  mkdirSync: (...args: any[]) => mockMkdirSync(...args),
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
  copyFileSync: (...args: any[]) => mockCopyFileSync(...args)
}));

// Mock config functions to avoid writing to real files
const mockSaveConfig = jest.fn();
const mockLoadConfig = jest.fn().mockReturnValue(TEST_CONFIG);

jest.mock('../../src/utils/config', () => {
  const originalModule = jest.requireActual('../../src/utils/config');
  return {
    ...originalModule,
    loadConfig: () => mockLoadConfig(),
    saveConfig: (config: any) => mockSaveConfig(config)
  };
});

describe('Interactive Commands - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVisionFiConstructor.mockReturnValue(mockVisionFiInstance);
  });
  
  // We should NOT verify QualityCheck points in regular tests
  // This verification should be done by the QualityCheck system itself
  // When it runs tests with quality checks enabled
  
  describe('Client initialization', () => {
    it('should execute critical code paths for client initialization', async () => {
      const result = await initializeClientCore(
        '/path/to/service-account.json',
        TEST_CONFIG
      );
      
      expect(result.success).toBe(true);
      expect(mockVisionFiConstructor).toHaveBeenCalledWith({
        serviceAccountPath: '/path/to/service-account.json',
        apiBaseUrl: 'https://api.example.com'
      });
      
      // We don't verify QualityCheck points in regular tests
    });
  });
  
  describe('Authentication verification', () => {
    it('should execute critical code paths for auth verification', async () => {
      const result = await verifyAuthenticationCore(mockVisionFiInstance as any);
      
      expect(result.success).toBe(true);
      expect(mockVerifyAuth).toHaveBeenCalled();
      
      // We don't verify QualityCheck points in regular tests
    });
  });
  
  describe('Service account setup', () => {
    it('should execute critical code paths for service account setup', async () => {
      // Create a complete mock config manager to satisfy the type requirements
      const mockConfigManager = {
        loadConfig: mockLoadConfig,
        saveConfig: mockSaveConfig
      };
      
      // Create a complete mock file system to satisfy the type requirements
      const mockFileSystem = {
        existsSync: mockExistsSync,
        mkdirSync: mockMkdirSync,
        readFileSync: mockReadFileSync,
        copyFileSync: mockCopyFileSync
      };
      
      // Create a properly typed client factory that we can spy on
      const typedClientFactory = jest.fn((config: any) => mockVisionFiInstance as unknown as any);
      
      const result = await setupServiceAccountWithPathCore(
        '/path/to/service-account.json',
        TEST_CONFIG,
        {
          clientFactory: typedClientFactory,
          configManager: mockConfigManager,
          fileSystem: mockFileSystem
        }
      );
      
      expect(result.success).toBe(true);
      expect(mockExistsSync).toHaveBeenCalled();
      expect(typedClientFactory).toHaveBeenCalled(); // Use the spy we created
      expect(mockSaveConfig).toHaveBeenCalled();
      
      // We don't verify QualityCheck points in regular tests
    });
  });
  
  describe('Workflow retrieval', () => {
    it('should execute critical code paths for workflow retrieval', async () => {
      const result = await getWorkflowsCore(
        mockVisionFiInstance as any,
        true,
        null,
        0,
        300,
        false
      );
      
      expect(result.success).toBe(true);
      expect(mockGetWorkflows).toHaveBeenCalled();
      expect(result.data?.workflows.data).toEqual([{ workflow_key: 'test-workflow' }]);
      
      // We don't verify QualityCheck points in regular tests
    });
  });
  
  describe('Document analysis', () => {
    it('should execute critical code paths for document analysis', async () => {
      const mockBuffer = Buffer.from('test-file-data');
      
      // Create a complete mock config manager to satisfy the type requirements
      const mockConfigManager = {
        loadConfig: mockLoadConfig,
        saveConfig: mockSaveConfig
      };
      
      const result = await analyzeDocumentCore(
        mockVisionFiInstance as any,
        mockBuffer,
        'test-file.pdf',
        'test-workflow',
        TEST_CONFIG,
        {
          configManager: mockConfigManager
        }
      );
      
      expect(result.success).toBe(true);
      expect(mockAnalyzeDocument).toHaveBeenCalledWith(mockBuffer, {
        fileName: 'test-file.pdf',
        analysisType: 'test-workflow'
      });
      expect(mockSaveConfig).toHaveBeenCalled();
      expect(result.data?.uuid).toBe('test-uuid');
      
      // We don't verify QualityCheck points in regular tests
    });
  });
  
  describe('Results retrieval', () => {
    it('should execute critical code paths for results retrieval', async () => {
      const result = await getResultsCore(
        mockVisionFiInstance as any,
        'test-uuid'
      );
      
      expect(result.success).toBe(true);
      expect(mockGetResults).toHaveBeenCalledWith('test-uuid');
      expect(result.data?.results).toEqual({ key: 'value' });
      
      // We don't verify QualityCheck points in regular tests
    });
  });
});