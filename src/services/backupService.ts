import axios from '../lib/axios';

export interface Backup {
  filename: string;
  size: number;
  size_formatted: string;
  created_at: string;
  description: string;
  include_data: boolean;
  include_structure: boolean;
}

export interface BackupStatistics {
  total_backups: number;
  total_size: number;
  total_size_formatted: string;
  last_backup: string | null;
  oldest_backup: string | null;
  backups_this_month: number;
  backups_this_week: number;
  average_backup_size: number;
}

export interface CreateBackupRequest {
  description?: string;
  include_data?: boolean;
  include_structure?: boolean;
}

export interface BackupResponse {
  backups: Backup[];
  total_backups: number;
  total_size: string;
  last_backup: string | null;
}

class BackupService {
  async getBackups(): Promise<BackupResponse> {
    const response = await axios.get('/admin/backups');
    return response.data;
  }

  async getStatistics(): Promise<BackupStatistics> {
    const response = await axios.get('/admin/backups/statistics');
    return response.data;
  }

  async createBackup(data: CreateBackupRequest): Promise<{ message: string; backup_file: string; created_at: string }> {
    const response = await axios.post('/admin/backups', data);
    return response.data;
  }

  async downloadBackup(filename: string): Promise<Blob> {
    const response = await axios.get(`/admin/backups/${filename}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async deleteBackup(filename: string): Promise<{ message: string }> {
    const response = await axios.delete(`/admin/backups/${filename}`);
    return response.data;
  }
}

export default new BackupService(); 