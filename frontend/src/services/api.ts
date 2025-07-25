// API client for backend communication
import { 
  RecommendationsResponse, 
  UserPreferences, 
  ApiStatus, 
  HealthCheck 
} from '../types/api';

// Types for fetch API
type RequestOptions = RequestInit & {
  body?: string;
};

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint: string, options: RequestOptions = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;

    const defaultOptions: RequestOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Get recommendations
  async getRecommendations(preferences: UserPreferences): Promise<{ success: boolean; recommendations: RecommendationsResponse }> {
    return this.request('/recommend', {
      method: 'POST',
      body: JSON.stringify(preferences),
    });
  }

  // Check API status
  async getApiStatus(): Promise<ApiStatus> {
    return this.request('/api-status');
  }

  // Check service health
  async getHealth(): Promise<HealthCheck> {
    return this.request('/health');
  }
}

export const apiClient = new ApiClient();