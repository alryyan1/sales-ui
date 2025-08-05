import apiClient from '@/lib/axios';

export interface SystemVersion {
  current_commit: string;
  current_branch: string;
  last_commit_date: string;
  laravel_version: string;
  php_version: string;
  has_uncommitted_changes: boolean;
  remote_url: string;
  last_check: string;
}

export interface UpdateCheck {
  has_updates: boolean;
  current_commit: string;
  latest_commit: string;
  commit_count: number;
  latest_commit_info: {
    hash: string;
    message: string;
    author: string;
    date: string;
  } | null;
  fetch_result: string;
  checked_at: string;
  // Enhanced to include both frontend and backend
  backend_has_updates: boolean;
  frontend_has_updates: boolean;
  backend_commit_count: number;
  frontend_commit_count: number;
  backend_latest_commit_info?: {
    hash: string;
    message: string;
    author: string;
    date: string;
  };
  frontend_latest_commit_info?: {
    hash: string;
    message: string;
    author: string;
    date: string;
  };
}

export interface BackendUpdateResult {
  message: string;
  data: {
    steps: string[];
    errors: string[];
    success: boolean;
    updated_at: string;
  };
}

export interface FrontendUpdateResult {
  message: string;
  data: {
    steps: string[];
    errors: string[];
    success: boolean;
    updated_at: string;
    build_output?: string;
  };
}

export interface CombinedUpdateResult {
  message: string;
  data: {
    backend: BackendUpdateResult['data'];
    frontend: FrontendUpdateResult['data'];
    overall_success: boolean;
    updated_at: string;
  };
}

export interface FrontendInstructions {
  frontend_path: string;
  commands: string[];
  description: string;
}

export interface UpdateProgress {
  step: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
  progress?: number; // 0-100
}

class SystemService {
  /**
   * Get current system version information
   */
  async getVersion(): Promise<SystemVersion> {
    const response = await apiClient.get('/admin/system/version');
    return response.data.data;
  }

  /**
   * Check for available updates (both frontend and backend)
   */
  async checkForUpdates(): Promise<UpdateCheck> {
    const response = await apiClient.get('/admin/system/check-updates');
    return response.data.data;
  }

  /**
   * Perform backend update operations
   */
  async updateBackend(): Promise<BackendUpdateResult> {
    const response = await apiClient.post('/admin/system/update-backend');
    return response.data;
  }

  /**
   * Perform frontend update operations
   */
  async updateFrontend(): Promise<FrontendUpdateResult> {
    const response = await apiClient.post('/admin/system/update-frontend');
    return response.data;
  }

  /**
   * Perform combined update (both frontend and backend)
   */
  async updateBoth(): Promise<CombinedUpdateResult> {
    const response = await apiClient.post('/admin/system/update-both');
    return response.data;
  }

  /**
   * Get frontend update instructions
   */
  async getFrontendInstructions(): Promise<FrontendInstructions> {
    const response = await apiClient.get('/admin/system/frontend-instructions');
    return response.data.data;
  }

  /**
   * Stream update progress (for real-time updates)
   */
  async streamUpdateProgress(updateType: 'backend' | 'frontend' | 'both'): Promise<ReadableStream<UpdateProgress>> {
    const response = await apiClient.post(`/admin/system/update-${updateType}/stream`, {}, {
      responseType: 'stream'
    });
    return response.data;
  }
}

export default new SystemService(); 