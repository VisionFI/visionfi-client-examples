import * as fs from 'fs';
import { VisionFi } from 'visionfi';
import { analyzeDocument, analyzeDocumentCore } from '../../src/commands/analyze';
import * as config from '../../src/utils/config';
import { CLIConfig } from '../../src/types/config';
import { AnalyzeOptions } from '../../src/types/analyze';

// Mock the modules
jest.mock('fs');
jest.mock('visionfi');
jest.mock('../../src/utils/config');

// 
// 

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
  return undefined as never;
});

describe('Analyze Command', () => {
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
    
    // Mock fs.existsSync
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    // Mock fs.readFileSync
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test file content'));
  });
  
  afterEach(() => {
    // Restore console.log after each test
    consoleLogSpy.mockRestore();
  });
  
  describe('analyzeDocumentCore', () => {
    it('should return success result when document analysis succeeds', async () => {
      // Create mock dependencies
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
      const mockAnalyzeDocument = jest.fn().mockResolvedValue({ uuid: 'test-uuid-123' });
      const mockClient = { 
        verifyAuth: mockVerifyAuth,
        analyzeDocument: mockAnalyzeDocument
      };
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
      
      // Mock options
      const options: AnalyzeOptions = { workflow: 'invoice' };
      
      // Execute core function directly
      const result = await analyzeDocumentCore(
        '/path/to/document.pdf',
        options,
        testConfig,
        { clientFactory: mockClientFactory }
      );
      
      // Verify
      expect(mockClientFactory).toHaveBeenCalledWith({
        serviceAccountPath: '/path/to/service-account.json',
        apiBaseUrl: 'https://api.visionfi.com'
      });
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockAnalyzeDocument).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          fileName: 'document.pdf',
          analysisType: 'invoice'
        })
      );
      expect(result).toEqual({
        success: true,
        message: 'Document submitted successfully!',
        exitCode: 0,
        uuid: 'test-uuid-123',
        data: { uuid: 'test-uuid-123' }
      });
    });
    
    it('should return failure result when no service account is configured', async () => {
      // Create mock dependencies
      const mockClientFactory = jest.fn();
      
      // Mock config without service account
      const testConfig: CLIConfig = {
        api_endpoint: 'https://api.visionfi.com',
        recent_uuids: [],
        debug_mode: false,
        test_mode: false,
        workflow_cache_ttl: 3600,
        service_account_path: ''  // Empty service account path
      };
      
      // Mock options
      const options: AnalyzeOptions = { workflow: 'invoice' };
      
      // Execute core function directly
      const result = await analyzeDocumentCore(
        '/path/to/document.pdf',
        options,
        testConfig,
        { clientFactory: mockClientFactory }
      );
      
      // Verify
      expect(mockClientFactory).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'No service account configured. Run in interactive mode to set up a service account.',
        exitCode: 1
      });
    });
    
    it('should return failure result when file does not exist', async () => {
      // Create mock dependencies
      const mockClientFactory = jest.fn();
      const mockFileSystem = {
        existsSync: jest.fn().mockReturnValue(false),
        readFileSync: jest.fn()
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
      const options: AnalyzeOptions = { workflow: 'invoice' };
      
      // Execute core function directly
      const result = await analyzeDocumentCore(
        '/path/to/nonexistent.pdf',
        options,
        testConfig,
        { 
          clientFactory: mockClientFactory,
          fileSystem: mockFileSystem
        }
      );
      
      // Verify
      expect(mockFileSystem.existsSync).toHaveBeenCalledWith('/path/to/nonexistent.pdf');
      expect(mockClientFactory).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'File not found: /path/to/nonexistent.pdf',
        exitCode: 1
      });
    });
    
    it('should return failure result when authentication fails', async () => {
      // Create mock dependencies
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: false });
      const mockClient = { 
        verifyAuth: mockVerifyAuth,
        analyzeDocument: jest.fn()
      };
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
      
      // Mock options
      const options: AnalyzeOptions = { workflow: 'invoice' };
      
      // Execute core function directly
      const result = await analyzeDocumentCore(
        '/path/to/document.pdf',
        options,
        testConfig,
        { clientFactory: mockClientFactory }
      );
      
      // Verify
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockClient.analyzeDocument).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Authentication failed.',
        exitCode: 1
      });
    });
    
    it('should return failure result when no workflow is specified', async () => {
      // Create mock dependencies
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
      const mockClient = { 
        verifyAuth: mockVerifyAuth,
        analyzeDocument: jest.fn()
      };
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
      
      // Mock options - empty object, no workflow
      const options = {} as AnalyzeOptions;
      
      // Execute core function directly
      const result = await analyzeDocumentCore(
        '/path/to/document.pdf',
        options,
        testConfig,
        { clientFactory: mockClientFactory }
      );
      
      // Verify
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockClient.analyzeDocument).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'No workflow specified. Use --workflow option to specify analysis workflow.',
        exitCode: 1
      });
    });
    
    it('should handle API errors when analyzing document', async () => {
      // Create mock dependencies
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
      const apiError = new Error('API error');
      const mockAnalyzeDocument = jest.fn().mockRejectedValue(apiError);
      const mockClient = { 
        verifyAuth: mockVerifyAuth,
        analyzeDocument: mockAnalyzeDocument
      };
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
      
      // Mock options
      const options: AnalyzeOptions = { workflow: 'invoice' };
      
      // Execute core function directly
      const result = await analyzeDocumentCore(
        '/path/to/document.pdf',
        options,
        testConfig,
        { clientFactory: mockClientFactory }
      );
      
      // Verify
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockAnalyzeDocument).toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Error submitting document: API error',
        exitCode: 1,
        error: apiError
      });
    });
  });
  
  describe('analyzeDocument CLI wrapper', () => {
    it('should display success message and return zero exit code on success', async () => {
      // Setup VisionFi mock
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: true });
      const mockAnalyzeDocument = jest.fn().mockResolvedValue({ uuid: 'test-uuid-123' });
      (VisionFi as jest.Mock).mockImplementation(() => ({
        verifyAuth: mockVerifyAuth,
        analyzeDocument: mockAnalyzeDocument
      }));
      
      // Execute CLI function
      await analyzeDocument('/path/to/document.pdf', { workflow: 'invoice' });
      
      // Verify
      expect(config.loadConfig).toHaveBeenCalled();
      expect(VisionFi).toHaveBeenCalledWith({
        serviceAccountPath: '/path/to/service-account.json',
        apiBaseUrl: 'https://api.visionfi.com'
      });
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockAnalyzeDocument).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('submitted successfully'));
      expect(config.saveConfig).toHaveBeenCalled();
      expect(mockExit).not.toHaveBeenCalled(); // No exit for success
    });
    
    it('should display error message and exit with error code on failure', async () => {
      // Setup VisionFi mock to return authentication failure
      const mockVerifyAuth = jest.fn().mockResolvedValue({ data: false });
      (VisionFi as jest.Mock).mockImplementation(() => ({
        verifyAuth: mockVerifyAuth,
      }));
      
      // Execute CLI function
      await analyzeDocument('/path/to/document.pdf', { workflow: 'invoice' });
      
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
    const mockAnalyzeDocument = jest.fn().mockResolvedValue({ uuid: 'test-uuid-123' });
    (VisionFi as jest.Mock).mockImplementation(() => ({
      verifyAuth: mockVerifyAuth,
      analyzeDocument: mockAnalyzeDocument
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
    
    const options: AnalyzeOptions = { workflow: 'invoice' };
    
    // This should hit all QualityCheck points
    const result = await analyzeDocumentCore('/path/to/document.pdf', options, testConfig);
    
    // Verify behavior - just for completeness
    expect(result.success).toBe(true);
    expect(result.message).toContain('Document submitted successfully');
    expect(result.exitCode).toBe(0);
  });
});