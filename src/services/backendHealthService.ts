// src/services/backendHealthService.ts
import apiClient from '../lib/axios';

let lastCheckTime = 0;
let lastCheckResult = false;
const CACHE_DURATION = 30000; // 30 seconds cache (matches health check interval)
const HEALTH_CHECK_TIMEOUT = 3000; // 3 seconds timeout

export const backendHealthService = {
  /**
   * Check if backend is accessible by making a lightweight API call
   * Uses caching to avoid excessive requests
   */
  async checkBackendAccessible(): Promise<boolean> {
    const now = Date.now();
    
    // Use cached result if recent
    if (now - lastCheckTime < CACHE_DURATION) {
      return lastCheckResult;
    }
    
    try {
      // Try the lightweight /health endpoint (public, no auth required)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
      
      try {
        const response = await apiClient.get('/health', {
          signal: controller.signal,
          timeout: HEALTH_CHECK_TIMEOUT,
        });
        
        // If we get a successful response (200), backend is accessible
        if (response.status === 200) {
          lastCheckResult = true;
          lastCheckTime = now;
          clearTimeout(timeoutId);
          return true;
        }
        
        // Any other status means backend responded but with unexpected status
        // Still consider it accessible (backend is reachable)
        lastCheckResult = true;
        lastCheckTime = now;
        clearTimeout(timeoutId);
        return true;
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        // If it's a 200 response, backend is accessible
        if (error?.response?.status === 200) {
          lastCheckResult = true;
          lastCheckTime = now;
          return true;
        }
        
        // Network error, timeout, or unreachable backend means backend is not accessible
        throw error;
      }
    } catch (error: any) {
      // Network error, timeout, or unreachable backend
      lastCheckResult = false;
      lastCheckTime = now;
      return false;
    }
  },
  
  /**
   * Force a fresh check, bypassing cache
   */
  async forceCheck(): Promise<boolean> {
    lastCheckTime = 0;
    return this.checkBackendAccessible();
  },
  
  /**
   * Get last cached result without making a new request
   */
  getLastResult(): boolean {
    return lastCheckResult;
  },
};

