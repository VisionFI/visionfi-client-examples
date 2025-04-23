/**
 * Integration tests for analyze commands
 * Uses targeted mocking to ensure implementation code paths are executed
 */

// Define mock functions before imports (this is important for hoisting)
const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
const mockAnalyzeDocument = jest.fn().mockResolvedValue({ uuid: 'test-uuid-123' });
const mockVisionFiInstance = {
  verifyAuth: mockVerifyAuth,
  analyzeDocument: mockAnalyzeDocument
};
const mockVisionFiConstructor = jest.fn(() => mockVisionFiInstance);

// Define mock filesystem functions
const mockExistsSync = jest.fn().mockReturnValue(true);
const mockReadFileSync = jest.fn().mockReturnValue(Buffer.from('test file content'));

// Setup mocks BEFORE imports - Jest hoists these
jest.mock('visionfi', () => ({
  VisionFi: mockVisionFiConstructor
}));

jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync
  };
});

// Now we can import modules
import * as fs from 'fs';
import * as path from 'path';
import { analyzeDocument, analyzeDocumentCore } from '../../src/commands/analyze';
import * as config from '../../src/utils/config';
import { CLIConfig } from '../../src/types/config';
import { AnalyzeOptions } from '../../src/types/analyze';
import { VisionFi } from 'visionfi';

// We do NOT import QualityCheck - tests must remain independent

// Mock process.exit to prevent test termination
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('Analyze Command Integration', () => {
  let consoleLogSpy: jest.SpyInstance;
  let configLoadSpy: jest.SpyInstance;
  let configSaveSpy: jest.SpyInstance;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset fs mocks
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(Buffer.from('test file content'));
    
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
  
  describe('analyzeDocumentCore - Core Document Analysis', () => {
    it('should execute the happy path completely', async () => {
      // Reset mocks to default values
      mockVerifyAuth.mockResolvedValue({ data: true });
      mockAnalyzeDocument.mockResolvedValue({ uuid: 'test-uuid-123' });
      
      // Get test config directly
      const testConfig = config.loadConfig();
      
      // Mock options
      const options: AnalyzeOptions = { workflow: 'invoice' };
      
      // Execute core function directly (should hit QualityCheck points)
      const result = await analyzeDocumentCore('/path/to/document.pdf', options, testConfig);
      
      // Verify behavior
      expect(mockVisionFiConstructor).toHaveBeenCalledWith({
        serviceAccountPath: '/path/to/service-account.json',
        apiBaseUrl: 'https://api.visionfi.com'
      });
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockAnalyzeDocument).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          fileName: path.basename('/path/to/document.pdf'),
          analysisType: 'invoice'
        })
      );
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.uuid).toBe('test-uuid-123');
    });
    
    it('should handle missing workflow', async () => {
      // Reset mocks
      mockVerifyAuth.mockResolvedValue({ data: true });
      
      // Get test config
      const testConfig = config.loadConfig();
      
      // No workflow in options
      const options = {} as AnalyzeOptions;
      
      // Execute core function directly
      const result = await analyzeDocumentCore('/path/to/document.pdf', options, testConfig);
      
      // Verify behavior
      expect(mockVerifyAuth).toHaveBeenCalled(); // Auth was verified
      expect(result.success).toBe(false);
      expect(result.message).toContain('No workflow specified');
      expect(result.exitCode).toBe(1);
    });
    
    it('should handle file not found', async () => {
      // Setup file not found
      mockExistsSync.mockReturnValue(false);
      
      // Get test config
      const testConfig = config.loadConfig();
      
      // Mock options
      const options: AnalyzeOptions = { workflow: 'invoice' };
      
      // Execute core function directly
      const result = await analyzeDocumentCore('/path/to/nonexistent.pdf', options, testConfig);
      
      // Verify behavior
      expect(mockExistsSync).toHaveBeenCalledWith('/path/to/nonexistent.pdf');
      expect(result.success).toBe(false);
      expect(result.message).toContain('File not found');
      expect(result.exitCode).toBe(1);
    });
    
    it('should handle authentication failure', async () => {
      // Setup auth failure
      mockVerifyAuth.mockResolvedValue({ data: false });
      
      // Get test config
      const testConfig = config.loadConfig();
      
      // Mock options
      const options: AnalyzeOptions = { workflow: 'invoice' };
      
      // Execute core function directly
      const result = await analyzeDocumentCore('/path/to/document.pdf', options, testConfig);
      
      // Verify behavior
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Authentication failed');
      expect(result.exitCode).toBe(1);
    });
    
    it('should handle API errors', async () => {
      // Setup API error
      mockVerifyAuth.mockResolvedValue({ data: true });
      mockAnalyzeDocument.mockRejectedValue(new Error('API error'));
      
      // Get test config
      const testConfig = config.loadConfig();
      
      // Mock options
      const options: AnalyzeOptions = { workflow: 'invoice' };
      
      // Execute core function directly
      const result = await analyzeDocumentCore('/path/to/document.pdf', options, testConfig);
      
      // Verify behavior
      expect(mockAnalyzeDocument).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Error submitting document');
      expect(result.exitCode).toBe(1);
      expect(result.error).toBeInstanceOf(Error);
    });
  });
  
  describe('analyzeDocument - CLI Command', () => {
    it('should execute CLI command for successful document analysis', async () => {
      // Reset mocks
      mockVerifyAuth.mockResolvedValue({ data: true });
      mockAnalyzeDocument.mockResolvedValue({ uuid: 'test-uuid-123' });
      
      // Execute CLI function
      await analyzeDocument('/path/to/document.pdf', { workflow: 'invoice' });
      
      // Verify behavior
      expect(configLoadSpy).toHaveBeenCalled();
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockAnalyzeDocument).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('submitted successfully'));
      expect(configSaveSpy).toHaveBeenCalled();
      expect(mockExit).not.toHaveBeenCalled(); // Success shouldn't exit
    });
    
    it('should execute CLI command and handle errors properly', async () => {
      // Setup failure
      mockVerifyAuth.mockResolvedValue({ data: false });
      
      // Execute CLI function
      await analyzeDocument('/path/to/document.pdf', { workflow: 'invoice' });
      
      // Verify behavior
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Authentication failed'));
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});