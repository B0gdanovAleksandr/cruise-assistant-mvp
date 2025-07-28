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
  // RAG-specific fields
  title?: string;
  timing?: string;
  originEventId?: string;
  personalizedAdvice?: string;
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

export interface RAGSource {
  id: string;
  title: string;
  type: string;
  experienceAffinity?: string;
  score?: number;
  tags?: string[];
}

export interface RAGInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  relevance: string;
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
  // RAG-specific fields
  ragSources?: RAGSource[];
  ragInsights?: RAGInsight[];
  retrievedEvents?: any[];
  prompt?: {
    type: string;
    content: string;
    estimatedTokens: number;
    maxTokens: number;
  };
  count?: number;
  minAffinity?: number;
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