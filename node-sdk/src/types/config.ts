/**
 * Configuration interfaces for the VisionFi CLI
 */

export interface CLIConfig {
  service_account_path: string;
  api_endpoint: string;
  recent_uuids: string[];
  debug_mode: boolean;
  test_mode: boolean;
  workflow_cache_ttl: number;
}

export interface ClientInfo {
  clientId: string;
  name: string;
  status: string;
  tenantType: string;
  createdAt: string;
  configuredWorkflows?: string[];
  features?: {
    [key: string]: {
      enabled: boolean;
      limits?: {
        [key: string]: any;
      };
    };
  };
  [key: string]: any;
}

export interface Workflow {
  workflow_key: string;
  description: string;
  [key: string]: any;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  data?: any;
}

export interface JobResult {
  uuid: string;
  status: string;
  found?: boolean;
  message?: string;
  results?: any;
  error?: any;
}