/**
 * VisionFi API response types
 * These types match the actual responses from the VisionFi npm package.
 */

/**
 * Base response interface for VisionFi API calls
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * Authentication verification result
 */
export interface AuthVerificationResult extends ApiResponse {
  // No additional properties
}

/**
 * Client information result
 */
export interface ClientInfoResult extends ApiResponse<{
  client_id: string;
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
}> {
  // No additional properties
}

/**
 * Workflow information result
 */
export interface WorkflowsResult extends ApiResponse<Array<{
  workflow_key: string;
  description: string;
  [key: string]: any;
}>> {
  // No additional properties
}

/**
 * Document analysis job result
 */
export interface AnalysisJobResult {
  uuid: string;
  [key: string]: any;
}

/**
 * Document analysis results
 */
export interface JobResultsResponse {
  found?: boolean;
  status?: string;
  message?: string;
  results?: any;
  error?: any;
}