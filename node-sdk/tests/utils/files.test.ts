import * as fs from 'fs';
import * as path from 'path';
import { getExamplesFilesDir } from '../../src/utils/files';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

describe('Files Utilities', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup the path.resolve mock to return expected paths
    (path.resolve as jest.Mock).mockImplementation((...args) => 
      args.join('/').replace(/\/\//g, '/'));
    
    // Setup the path.join mock to join paths
    (path.join as jest.Mock).mockImplementation((...args) => 
      args.join('/').replace(/\/\//g, '/'));
    
    // Setup dirname to return parent directory
    (path.dirname as jest.Mock).mockImplementation((p) => {
      const parts = p.split('/');
      parts.pop();
      return parts.join('/');
    });
  });
  
  describe('getExamplesFilesDir', () => {
    it('should return the correct path to examples files directory', () => {
      // Setup
      (path.resolve as jest.Mock).mockReturnValueOnce('/mnt/c/Users/path/visionfi-client-examples/node-sdk');
      (path.join as jest.Mock).mockReturnValueOnce('/mnt/c/Users/path/visionfi-client-examples/common/files');
      
      // Execute
      const result = getExamplesFilesDir();
      
      // Verify it constructs the path correctly
      expect(path.resolve).toHaveBeenCalled();
      expect(path.join).toHaveBeenCalled();
      expect(result).toContain('common/files');
    });
  });
});