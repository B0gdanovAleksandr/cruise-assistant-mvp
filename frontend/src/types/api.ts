// API response types
export interface UserPreferences {
  interests: string[];
  location: string;
  budget: string;
}

export interface Recommendation {
  id: string;
  name: string;
  description: string;
  categories: string[];
  rating: number;
  price_range: string;
  location: string;
  duration: string;
  highlights: string[];
  fallback?: boolean;
}

export interface AIInsights {
  summary: string;
  personalizedAdvice: string[];
  budgetTips: string[];
  bestTimes: string[];
}

export interface GeneratedActivity {
  title: string;
  description: string;
  emoji: string;
  interest: string;
}

export interface GeneratedActivities {
  recommendations: GeneratedActivity[];
  metadata: {
    generated: boolean;
    interestCount: number;
    entityCount: number;
    recommendationCount: number;
    timestamp: string;
  };
}

export interface EnhancementMetadata {
  error?: string;
  fallback?: boolean;
  timestamp: string;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  metadata: {
    source: string;
    fallback?: boolean;
    timestamp: string;
  };
  enhanced?: boolean;
  aiInsights?: AIInsights;
  enhancementMetadata?: EnhancementMetadata;
  generatedActivities?: GeneratedActivities;
}

export interface ApiStatus {
  qloo: {
    status: string;
    available: boolean;
  };
  openai: {
    status: string;
    available: boolean;
  };
  timestamp: string;
}

export interface HealthCheck {
  status: string;
  timestamp: string;
} 