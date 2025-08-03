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

export interface FrontendInstructions {
  frontend_path: string;
  commands: string[];
  description: string;
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
   * Check for available updates
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
   * Get frontend update instructions
   */
  async getFrontendInstructions(): Promise<FrontendInstructions> {
    const response = await apiClient.get('/admin/system/frontend-instructions');
    return response.data.data;
  }
}

export default new SystemService(); 