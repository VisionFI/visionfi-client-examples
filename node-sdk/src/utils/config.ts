import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CLIConfig } from '../types/config';

// Config paths
const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.visionfi');
const DEFAULT_CONFIG_PATH = path.join(DEFAULT_CONFIG_DIR, 'config.json');
const DEFAULT_KEY_DIR = path.join(DEFAULT_CONFIG_DIR, 'keys');
export const SERVICE_ACCOUNT_KEY_NAME = 'visionfi_service_account.json';

// Default config values
export const DEFAULT_CONFIG: CLIConfig = {
  service_account_path: '',
  api_endpoint: 'https://platform.visionfi.ai/api/v1',
  recent_uuids: [],
  debug_mode: false,
  test_mode: false,
  workflow_cache_ttl: 1200, // 20 minutes
};

/**
 * Load configuration from file or create with defaults
 */
export function loadConfig(): CLIConfig {
  // Create config directory if it doesn't exist
  if (!fs.existsSync(DEFAULT_CONFIG_DIR)) {
    fs.mkdirSync(DEFAULT_CONFIG_DIR, { recursive: true });
  }

  // Create key directory if it doesn't exist
  if (!fs.existsSync(DEFAULT_KEY_DIR)) {
    fs.mkdirSync(DEFAULT_KEY_DIR, { recursive: true });
  }

  // Load existing config or create new one
  if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
    try {
      const config = JSON.parse(fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8'));
      
      // Ensure all keys exist
      for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
        if (!(key in config)) {
          config[key] = value;
        }
      }
      
      return config as CLIConfig;
    } catch (error) {
      console.error('Error loading config file. Using defaults.');
      return { ...DEFAULT_CONFIG };
    }
  } else {
    // Create new config file with defaults
    saveConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save configuration to file
 */
export function saveConfig(config: CLIConfig): void {
  fs.writeFileSync(DEFAULT_CONFIG_PATH, JSON.stringify(config, null, 2));
}