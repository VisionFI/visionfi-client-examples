import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadConfig, saveConfig, DEFAULT_CONFIG, SERVICE_ACCOUNT_KEY_NAME } from '../../src/utils/config';

// Mock modules
jest.mock('fs');
jest.mock('path');
jest.mock('os');

describe('Config Utilities', () => {
  // Setup mock console.error
  let consoleErrorSpy: jest.SpyInstance;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock path.join to be predictable
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    
    // Mock os.homedir
    (os.homedir as jest.Mock).mockReturnValue('/mock/home');
    
    // Mock fs functions with default successful behavior
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(DEFAULT_CONFIG));
    (fs.writeFileSync as jest.Mock).mockImplementation(() => undefined);
    
    // Setup console.error spy
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });
  
  afterEach(() => {
    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
  
  describe('loadConfig', () => {
    it('should create config directory if it doesnt exist', () => {
      // Setup mocks for this specific test
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(false)  // DEFAULT_CONFIG_DIR doesn't exist
        .mockReturnValueOnce(true)   // DEFAULT_KEY_DIR exists
        .mockReturnValueOnce(false); // DEFAULT_CONFIG_PATH doesn't exist
      
      // Execute
      loadConfig();
      
      // Verify
      expect(fs.mkdirSync).toHaveBeenCalled();
    });
    
    it('should create key directory if it doesnt exist', () => {
      // Setup mocks for this specific test
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true)   // DEFAULT_CONFIG_DIR exists
        .mockReturnValueOnce(false)  // DEFAULT_KEY_DIR doesn't exist
        .mockReturnValueOnce(false); // DEFAULT_CONFIG_PATH doesn't exist
      
      // Execute
      loadConfig();
      
      // Verify
      expect(fs.mkdirSync).toHaveBeenCalled();
    });
    
    it('should return default config if config file doesnt exist', () => {
      // Setup mocks for this specific test
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true)  // DEFAULT_CONFIG_DIR exists
        .mockReturnValueOnce(true)  // DEFAULT_KEY_DIR exists
        .mockReturnValueOnce(false); // DEFAULT_CONFIG_PATH doesn't exist
      
      // Execute
      const config = loadConfig();
      
      // Verify
      expect(config).toEqual(DEFAULT_CONFIG);
      expect(fs.writeFileSync).toHaveBeenCalled(); // Should save the default config
    });
    
    it('should load and merge config with defaults', () => {
      // Setup mocks for this specific test
      const partialConfig = {
        api_endpoint: 'https://custom.endpoint.com',
        debug_mode: true
      };
      
      (fs.existsSync as jest.Mock).mockReturnValue(true); // All paths exist
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(partialConfig));
      
      // Execute
      const config = loadConfig();
      
      // Verify - should contain all default keys merged with loaded values
      expect(config).toEqual({
        ...DEFAULT_CONFIG,
        ...partialConfig
      });
    });
    
    it('should handle invalid JSON in config file', () => {
      // Setup mocks for this specific test
      (fs.existsSync as jest.Mock).mockReturnValue(true); // All paths exist
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');
      
      // Execute
      const config = loadConfig();
      
      // Verify
      expect(config).toEqual(DEFAULT_CONFIG);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
  
  describe('saveConfig', () => {
    it('should save config to file', () => {
      // Setup
      const config = { ...DEFAULT_CONFIG, debug_mode: true };
      
      // Execute
      saveConfig(config);
      
      // Verify - just check that it was called with any arguments
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });
  
  describe('Constants', () => {
    it('should export SERVICE_ACCOUNT_KEY_NAME constant', () => {
      expect(SERVICE_ACCOUNT_KEY_NAME).toBeDefined();
      expect(typeof SERVICE_ACCOUNT_KEY_NAME).toBe('string');
    });
    
    it('should export DEFAULT_CONFIG with expected properties', () => {
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(DEFAULT_CONFIG.api_endpoint).toBeDefined();
      expect(DEFAULT_CONFIG.debug_mode).toBeDefined();
      expect(DEFAULT_CONFIG.recent_uuids).toBeInstanceOf(Array);
    });
  });
});