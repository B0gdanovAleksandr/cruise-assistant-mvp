const axios = require('axios');
const logger = require('../utils/logger');
const mockData = require('../mock/qlooMock.json');
const entityResolver = require('./entityResolver');
const urnRegistry = require('./urnRegistry');

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 8000,  // 8 seconds
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
};

class QlooClient {
  constructor() {
    this.apiKey = process.env.QLOO_API_KEY;
    this.baseURL = process.env.QLOO_API_URL || 'https://hackathon.api.qloo.com';
    this.timeout = 10000; // 10 seconds timeout
    this.useMock = !this.apiKey;
    this.locale = 'en';
    
    // Initialize URN registry
    this._initializeURNRegistry();
    
    // Debug logging
    console.log('QlooClient initialized:', {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey ? this.apiKey.length : 0,
      baseURL: this.baseURL,
      useMock: this.useMock
    });
  }
  
  /**
   * Initialize URN registry
   * @private
   */
  async _initializeURNRegistry() {
    try {
      await urnRegistry.initialize();
      console.log('URN Registry initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize URN Registry:', error.message);
    }
  }

  /**
   * Execute HTTP request with retry logic
   * @param {Function} requestFn - Function that returns axios request
   * @param {string} operation - Operation name for logging
   * @returns {Promise} - Request result
   * @private
   */
  async _executeWithRetry(requestFn, operation) {
    let lastError;
    
    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const response = await requestFn();
        return response;
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        const isRetryable = this._isRetryableError(error);
        
        if (!isRetryable || attempt === RETRY_CONFIG.maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
          RETRY_CONFIG.maxDelay
        );
        
        console.warn(`Retry attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries} for ${operation}`, {
          error: error.message,
          status: error.response?.status,
          delay: delay,
          nextAttempt: attempt + 1
        });
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} - Whether error is retryable
   * @private
   */
  _isRetryableError(error) {
    // Check HTTP status codes
    if (error.response && RETRY_CONFIG.retryableStatuses.includes(error.response.status)) {
      return true;
    }
    
    // Check network error codes
    if (error.code && RETRY_CONFIG.retryableErrors.includes(error.code)) {
      return true;
    }
    
    // Check timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Search for entities based on interests with enhanced resolution
   * @param {string[]} interests - Array of interest keywords
   * @returns {Promise<string[]>} - Array of unique entity IDs
   */
  async searchEntities(interests) {
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      console.warn('No interests provided for entity search');
      return [];
    }
    
    console.info(`Searching entities for ${interests.length} interests`);
    
    if (this.useMock) {
      console.info('Using mock data for entity search');
      return this._getMockEntityIds(interests);
    }
    
    try {
      // Use EntityResolver for better entity resolution
      const resolutionResult = await entityResolver.resolveEntities(interests, {
        types: ['brand', 'place', 'tag', 'audience'],
        confidenceThreshold: 0.4,
        limit: 15
      });
      
      if (resolutionResult.entities && resolutionResult.entities.length > 0) {
        // Filter and validate entities
        const validatedEntities = resolutionResult.entities
          .filter(entity => {
            const confidence = entity.confidence >= 0.4;
            const urn = entity.urn || entity.entity_id || entity.id;
            const isFallback = entity.source === 'fallback' || (urn && urn.includes('fallback'));
            
            // Skip fallback entities
            if (isFallback) {
              console.info(`Skipping fallback entity: ${urn}`);
              return false;
            }
            
            // For real entities, validate URN if present
            const validURN = urn ? urnRegistry.validateURN(urn) : true;
            
            return confidence && validURN;
          })
          .map(entity => entity.urn || entity.entity_id || entity.id)
          .filter(Boolean);
        
        console.info(`Resolved ${validatedEntities.length} entities with confidence >= 0.4 and valid URNs`, {
          totalResolved: resolutionResult.entities.length,
          filteredCount: validatedEntities.length,
          confidence: resolutionResult.metadata.confidence,
          urnValidated: true,
          fallbackUsed: resolutionResult.metadata.fallback
        });
        
        // If we have valid entities, return them
        if (validatedEntities.length > 0) {
          return validatedEntities;
        }
        
        // If no valid entities but we have fallback, return empty array to trigger mock data
        if (resolutionResult.metadata.fallback) {
          console.info('No valid entities found, will use mock data');
          return [];
        }
      }
      
      // Fallback to legacy search if resolution fails
      console.info('Entity resolution failed, falling back to legacy search');
      return this._legacySearchEntities(interests);
      
    } catch (error) {
      console.error('Error in enhanced entity search', {
        error: error.message,
        interests
      });
      
      // Fallback to legacy search
      return this._legacySearchEntities(interests);
    }
  }
  
  /**
   * Legacy entity search method (fallback)
   * @param {string[]} interests - Array of interest keywords
   * @returns {Promise<string[]>} - Array of unique entity IDs
   * @private
   */
  async _legacySearchEntities(interests) {
    const uniqueEntityIds = new Set();
    
    // Process each interest in parallel
    const searchPromises = interests.map(async (interest) => {
      try {
        const encodedInterest = encodeURIComponent(interest);
        const url = `${this.baseURL}/search?query=${encodedInterest}`;
        
        console.info(`Searching for entities with interest: "${interest}"`);
        
        const response = await this._executeWithRetry(
          () => axios.get(url, {
            headers: this._getAuthHeaders(),
            timeout: 5000
          }),
          `search entities for "${interest}"`
        );
        
        // Check if response has results array
        if (response.data && response.data.results && Array.isArray(response.data.results)) {
          const entities = response.data.results;
          
          if (entities.length > 0) {
            entities.forEach(entity => {
              // Check for entity_id or id field
              const entityId = entity.entity_id || entity.id;
              if (entityId) {
                uniqueEntityIds.add(entityId);
                console.info(`Found entity: ${entity.name} (${entityId})`);
              }
            });
            
            console.info(`Found ${entities.length} entities for "${interest}"`);
          } else {
            console.info(`No entities found for interest "${interest}"`);
          }
        } else {
          console.warn(`Unexpected response format for "${interest}"`, {
            hasResults: !!response.data?.results,
            isResultsArray: Array.isArray(response.data?.results),
            dataKeys: response.data ? Object.keys(response.data) : []
          });
        }
      } catch (error) {
        console.error(`Error searching for interest "${interest}"`, {
          error: error.message,
          status: error.response?.status
        });
      }
    });
    
    // Wait for all searches to complete
    await Promise.all(searchPromises);
    
    const entityIds = Array.from(uniqueEntityIds);
    console.info(`Found ${entityIds.length} unique entities from interests`);
    
    return entityIds;
  }
  
    /**
   * Get insights for entity IDs to build taste profile
   * @param {string[]} entityIds - Array of entity IDs
   * @returns {Promise<Object>} - Insights object with taste profile
   */
  async getInsights(entityIds) {
    if (!this.apiKey) {
      console.warn('QLOO_API_KEY not provided, using fallback insights');
      return this._getMockInsights();
    }

    if (!entityIds || !Array.isArray(entityIds) || entityIds.length === 0) {
      console.warn('No entity IDs provided for insights, using mock data');
      return this._getMockInsights();
    }

    // Filter out fallback URNs
    const validEntityIds = entityIds.filter(entityId => {
      const isFallback = entityId.includes('fallback');
      if (isFallback) {
        console.info(`Skipping fallback entity: ${entityId}`);
      }
      return !isFallback;
    });

    if (validEntityIds.length === 0) {
      console.warn('No valid entity IDs after filtering fallback URNs, using mock data');
      return this._getMockInsights();
    }

    // If we have API key but want to test with mock data for development
    if (process.env.USE_MOCK_INSIGHTS === 'true') {
      console.info('Using mock insights for development/testing');
      return this._getMockInsights();
    }

    console.info(`Getting insights for ${entityIds.length} entities`);

    try {
      const allInsights = [];
      const processedEntities = new Set();

          // Process up to 10 entities for insights (increased for better coverage)
    const entitiesToProcess = validEntityIds.slice(0, 10);

      for (const entityId of entitiesToProcess) {
        if (processedEntities.has(entityId)) continue;
        processedEntities.add(entityId);

        try {
          console.info(`Getting entity data for insights: ${entityId}`);

          // Try insights endpoint first, then fallback to entities
          let response;
          try {
            response = await this._executeWithRetry(
              () => axios.get(`${this.baseURL}/insights`, {
                params: {
                  entity_ids: entityId,
                  locale: 'en',
                  types: ['brand', 'place', 'tag', 'audience']
                },
                headers: this._getAuthHeaders(),
                timeout: 8000
              }),
              `get insights for ${entityId}`
            );
          } catch (insightsError) {
            console.info(`Insights endpoint failed for ${entityId}, falling back to entities endpoint`);
            response = await this._executeWithRetry(
              () => axios.get(`${this.baseURL}/entities`, {
                params: {
                  entity_ids: entityId,
                  locale: 'en'
                },
                headers: this._getAuthHeaders(),
                timeout: 8000
              }),
              `get entity data for ${entityId}`
            );
          }

          if (response.data && response.data.results && Array.isArray(response.data.results)) {
            const entityData = response.data.results[0];
            console.info(`Received entity data for ${entityId}:`, {
              entityName: entityData.name,
              hasProperties: !!entityData.properties,
              propertiesKeys: entityData.properties ? Object.keys(entityData.properties) : [],
              hasTypes: !!entityData.types,
              types: entityData.types || []
            });
            
            // Extract insights from entity properties and data
            const extractedInsights = this._extractInsightsFromEntity(entityData);
            
            if (extractedInsights) {
              const enhancedInsight = {
                ...extractedInsights,
                sourceEntityId: entityId,
                sourceEntityName: entityData.name || entityId
              };
              
              allInsights.push(enhancedInsight);
              console.info(`Extracted insights for ${entityId}:`, {
                preferenceCount: Object.keys(extractedInsights.preferences || {}).length,
                interestCount: Object.keys(extractedInsights.interests || {}).length,
                demographicCount: Object.keys(extractedInsights.demographics || {}).length
              });
            }
          } else {
            console.warn(`No entity data received for ${entityId}`);
          }
        } catch (error) {
          console.warn(`Failed to get entity data for ${entityId}:`, error.message);
          // Continue with other entities
        }
      }

      console.info(`Total insights extracted: ${allInsights.length}`);

      // Build taste profile from insights
      const tasteProfile = this._buildTasteProfile(allInsights);

      return {
        insights: allInsights,
        tasteProfile,
        metadata: {
          source: 'qloo',
          entityCount: entityIds.length,
          processedEntities: entitiesToProcess.length,
          totalInsights: allInsights.length,
          fallback: false,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting insights from Qloo API', {
        error: error.message,
        status: error.response?.status,
        code: error.code
      });

      return this._getMockInsights();
    }
  }

  /**
   * Build taste profile from insights data
   * @param {Array} insights - Array of insights from Qloo API
   * @returns {Object} - Taste profile object
   * @private
   */
  _buildTasteProfile(insights) {
    const tasteProfile = {
      preferences: {},
      demographics: {},
      interests: {},
      behaviors: {},
      affinities: {}
    };

    insights.forEach(insight => {
      // Extract preference data
      if (insight.preferences) {
        Object.entries(insight.preferences).forEach(([key, value]) => {
          if (!tasteProfile.preferences[key]) {
            tasteProfile.preferences[key] = [];
          }
          tasteProfile.preferences[key].push(value);
        });
      }

      // Extract demographic data
      if (insight.demographics) {
        Object.entries(insight.demographics).forEach(([key, value]) => {
          if (!tasteProfile.demographics[key]) {
            tasteProfile.demographics[key] = [];
          }
          tasteProfile.demographics[key].push(value);
        });
      }

      // Extract interest data
      if (insight.interests) {
        Object.entries(insight.interests).forEach(([key, value]) => {
          if (!tasteProfile.interests[key]) {
            tasteProfile.interests[key] = [];
          }
          tasteProfile.interests[key].push(value);
        });
      }

      // Extract behavior data
      if (insight.behaviors) {
        Object.entries(insight.behaviors).forEach(([key, value]) => {
          if (!tasteProfile.behaviors[key]) {
            tasteProfile.behaviors[key] = [];
          }
          tasteProfile.behaviors[key].push(value);
        });
      }

      // Extract affinity data
      if (insight.affinities) {
        Object.entries(insight.affinities).forEach(([key, value]) => {
          if (!tasteProfile.affinities[key]) {
            tasteProfile.affinities[key] = [];
          }
          tasteProfile.affinities[key].push(value);
        });
      }
    });

    // Aggregate and rank the data
    const aggregatedProfile = {
      topPreferences: this._aggregateAndRank(tasteProfile.preferences),
      topDemographics: this._aggregateAndRank(tasteProfile.demographics),
      topInterests: this._aggregateAndRank(tasteProfile.interests),
      topBehaviors: this._aggregateAndRank(tasteProfile.behaviors),
      topAffinities: this._aggregateAndRank(tasteProfile.affinities)
    };

    console.info('Taste profile built successfully', {
      preferenceCount: Object.keys(tasteProfile.preferences).length,
      demographicCount: Object.keys(tasteProfile.demographics).length,
      interestCount: Object.keys(tasteProfile.interests).length,
      behaviorCount: Object.keys(tasteProfile.behaviors).length,
      affinityCount: Object.keys(tasteProfile.affinities).length
    });

    return aggregatedProfile;
  }

  /**
   * Aggregate and rank profile data
   * @param {Object} data - Profile data object
   * @returns {Array} - Ranked array of top items
   * @private
   */
  _aggregateAndRank(data) {
    const aggregated = {};

    Object.entries(data).forEach(([key, values]) => {
      // Count occurrences and calculate average score
      const count = values.length;
      const avgScore = values.reduce((sum, val) => sum + (val.score || 0.5), 0) / count;
      
      aggregated[key] = {
        count,
        avgScore,
        totalScore: avgScore * count,
        values: values.slice(0, 5) // Keep top 5 values
      };
    });

    // Sort by total score (count * avgScore)
    return Object.entries(aggregated)
      .sort(([, a], [, b]) => b.totalScore - a.totalScore)
      .slice(0, 10) // Return top 10
      .map(([key, data]) => ({
        key,
        ...data
      }));
  }

  /**
   * Extract insights from entity data
   * @param {Object} entityData - Entity data from Qloo API
   * @returns {Object|null} - Extracted insights or null
   * @private
   */
  _extractInsightsFromEntity(entityData) {
    if (!entityData || !entityData.properties) {
      return null;
    }

    const insights = {
      preferences: {},
      demographics: {},
      interests: {},
      behaviors: {},
      affinities: {}
    };

    const properties = entityData.properties;
    const types = entityData.types || [];
    const popularity = entityData.popularity || 0.5;

    // Extract preferences from properties
    if (properties.description) {
      insights.preferences.description = {
        score: popularity,
        value: properties.description.substring(0, 100)
      };
    }

    if (properties.melody) {
      insights.preferences.melody = {
        score: popularity,
        value: properties.melody
      };
    }

    if (properties.rhythm) {
      insights.preferences.rhythm = {
        score: popularity,
        value: properties.rhythm
      };
    }

    if (properties.tempo) {
      insights.preferences.tempo = {
        score: popularity,
        value: properties.tempo
      };
    }

    if (properties.vocals) {
      insights.preferences.vocals = {
        score: popularity,
        value: properties.vocals
      };
    }

    // Extract interests from types
    types.forEach((type, index) => {
      if (type.includes('genre')) {
        insights.interests[`genre_${index}`] = {
          score: popularity,
          value: type.split(':').pop() || type
        };
      }
      if (type.includes('tag')) {
        insights.interests[`tag_${index}`] = {
          score: popularity,
          value: type.split(':').pop() || type
        };
      }
    });

    // Extract demographics based on popularity
    if (popularity > 0.8) {
      insights.demographics.popularity = {
        score: popularity,
        value: 'high_popularity'
      };
    } else if (popularity > 0.5) {
      insights.demographics.popularity = {
        score: popularity,
        value: 'medium_popularity'
      };
    } else {
      insights.demographics.popularity = {
        score: popularity,
        value: 'low_popularity'
      };
    }

    // Extract behaviors from properties
    if (properties.performance) {
      insights.behaviors.performance = {
        score: popularity,
        value: properties.performance
      };
    }

    // Extract affinities from entity name and types
    insights.affinities.entity_type = {
      score: popularity,
      value: entityData.name || 'unknown'
    };

    // Check if we have meaningful insights
    const totalInsights = Object.keys(insights.preferences).length +
                         Object.keys(insights.interests).length +
                         Object.keys(insights.demographics).length +
                         Object.keys(insights.behaviors).length +
                         Object.keys(insights.affinities).length;

    return totalInsights > 0 ? insights : null;
  }

  /**
   * Get mock insights for fallback
   * @returns {Object} - Mock insights object
   * @private
   */
  _getMockInsights() {
    return {
      insights: [
        {
          sourceEntityId: 'mock_jazz_entity',
          preferences: {
            music_genre: { score: 0.85, value: 'jazz' },
            music_style: { score: 0.8, value: 'smooth_jazz' },
            food_style: { score: 0.75, value: 'fine_dining' },
            travel_style: { score: 0.7, value: 'luxury' },
            entertainment: { score: 0.8, value: 'live_music' }
          },
          demographics: {
            age_group: { score: 0.75, value: 'millennials' },
            income_level: { score: 0.7, value: 'high' },
            lifestyle: { score: 0.8, value: 'urban_professional' }
          },
          interests: {
            culture: { score: 0.85, value: 'music_culture' },
            entertainment: { score: 0.9, value: 'live_performances' },
            social: { score: 0.7, value: 'nightlife' }
          },
          behaviors: {
            dining: { score: 0.8, value: 'upscale_restaurants' },
            entertainment: { score: 0.85, value: 'music_venues' },
            travel: { score: 0.75, value: 'luxury_accommodations' }
          },
          affinities: {
            music_artists: { score: 0.8, value: 'jazz_legends' },
            venues: { score: 0.75, value: 'jazz_clubs' },
            experiences: { score: 0.8, value: 'intimate_performances' }
          }
        },
        {
          sourceEntityId: 'mock_dining_entity',
          preferences: {
            food_style: { score: 0.9, value: 'fine_dining' },
            cuisine_type: { score: 0.85, value: 'international' },
            dining_atmosphere: { score: 0.8, value: 'elegant' },
            wine_preference: { score: 0.75, value: 'premium_wines' }
          },
          demographics: {
            age_group: { score: 0.7, value: 'millennials' },
            income_level: { score: 0.85, value: 'high' },
            lifestyle: { score: 0.8, value: 'luxury_lifestyle' }
          },
          interests: {
            food_culture: { score: 0.9, value: 'culinary_arts' },
            wine: { score: 0.8, value: 'wine_tasting' },
            social: { score: 0.75, value: 'fine_dining_experiences' }
          },
          behaviors: {
            dining: { score: 0.9, value: 'upscale_restaurants' },
            social: { score: 0.8, value: 'business_entertainment' },
            travel: { score: 0.75, value: 'luxury_travel' }
          },
          affinities: {
            restaurants: { score: 0.85, value: 'michelin_starred' },
            chefs: { score: 0.8, value: 'celebrity_chefs' },
            experiences: { score: 0.85, value: 'tasting_menus' }
          }
        }
      ],
      tasteProfile: {
        topPreferences: [
          { key: 'food_style', count: 2, avgScore: 0.825, totalScore: 1.65 },
          { key: 'music_genre', count: 1, avgScore: 0.85, totalScore: 0.85 },
          { key: 'dining_atmosphere', count: 1, avgScore: 0.8, totalScore: 0.8 }
        ],
        topDemographics: [
          { key: 'income_level', count: 2, avgScore: 0.775, totalScore: 1.55 },
          { key: 'age_group', count: 2, avgScore: 0.725, totalScore: 1.45 },
          { key: 'lifestyle', count: 2, avgScore: 0.8, totalScore: 1.6 }
        ],
        topInterests: [
          { key: 'food_culture', count: 1, avgScore: 0.9, totalScore: 0.9 },
          { key: 'entertainment', count: 1, avgScore: 0.9, totalScore: 0.9 },
          { key: 'culture', count: 1, avgScore: 0.85, totalScore: 0.85 }
        ],
        topBehaviors: [
          { key: 'dining', count: 2, avgScore: 0.85, totalScore: 1.7 },
          { key: 'entertainment', count: 1, avgScore: 0.85, totalScore: 0.85 },
          { key: 'travel', count: 2, avgScore: 0.75, totalScore: 1.5 }
        ],
        topAffinities: [
          { key: 'experiences', count: 2, avgScore: 0.825, totalScore: 1.65 },
          { key: 'restaurants', count: 1, avgScore: 0.85, totalScore: 0.85 },
          { key: 'music_artists', count: 1, avgScore: 0.8, totalScore: 0.8 }
        ]
      },
      metadata: {
        source: 'mock',
        entityCount: 2,
        processedEntities: 2,
        totalInsights: 2,
        fallback: true,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Get recommendations based on entity IDs
   * @param {string[]} entityIds - Array of entity IDs
   * @returns {Promise<Object>} - Recommendations object with fallback flag
   */
  async getRecommendations(entityIds) {
    // Early fallback if no API key
    if (!this.apiKey) {
      console.warn('QLOO_API_KEY not provided, using fallback mock data');
      return this._getMockRecommendationsWithFallback();
    }
    
    if (!entityIds || !Array.isArray(entityIds) || entityIds.length === 0) {
      console.warn('No entity IDs provided for recommendations, using mock data');
      return this._getMockRecommendationsWithFallback();
    }

    // Filter out fallback URNs
    const validEntityIds = entityIds.filter(entityId => {
      const isFallback = entityId.includes('fallback');
      if (isFallback) {
        console.info(`Skipping fallback entity for recommendations: ${entityId}`);
      }
      return !isFallback;
    });

    if (validEntityIds.length === 0) {
      console.warn('No valid entity IDs after filtering fallback URNs, using mock data');
      return this._getMockRecommendationsWithFallback();
    }
    
    console.info(`Getting recommendations for ${validEntityIds.length} entities`);
    
    try {
      // Get recommendations for multiple entities to increase variety
      const allRecommendations = [];
      const processedEntities = new Set();
      
      // Process more entities to get diverse recommendations
      const entitiesToProcess = validEntityIds.slice(0, 10);
      
      for (const entityId of entitiesToProcess) {
        if (processedEntities.has(entityId)) continue;
        processedEntities.add(entityId);
        
        try {
          console.info(`Getting recommendations for entity: ${entityId}`);
          
          const response = await this._executeWithRetry(
            () => axios.get(`${this.baseURL}/entities/${entityId}/similar`, {
              params: {
                entity_ids: entityId,
                limit: 10, // Increased limit for more variety
                locale: 'en'
              },
              headers: this._getAuthHeaders(),
              timeout: 5000
            }),
            `get recommendations for ${entityId}`
          );
          
          if (response.data && response.data.results && Array.isArray(response.data.results)) {
            const recommendations = response.data.results;
            console.info(`Received ${recommendations.length} recommendations for entity ${entityId}`);
            
            // Add source entity info to each recommendation
            const enhancedRecommendations = recommendations.map(item => ({
              ...item,
              sourceEntityId: entityId,
              sourceEntityName: entityId // We'll enhance this later
            }));
            
            allRecommendations.push(...enhancedRecommendations);
          }
        } catch (error) {
          console.warn(`Failed to get recommendations for entity ${entityId}:`, error.message);
          // Continue with other entities
        }
      }
      
      console.info(`Total recommendations collected: ${allRecommendations.length}`);
      
      // Apply affinity filtering and deduplication
      const filteredRecommendations = this._filterAndDeduplicateRecommendations(allRecommendations);
      
      console.info(`After filtering and deduplication: ${filteredRecommendations.length} recommendations`);
      
      if (filteredRecommendations.length === 0) {
        console.warn('No recommendations after filtering, using fallback');
        return this._getMockRecommendationsWithFallback();
      }
      
      return {
        recommendations: filteredRecommendations.map(item => ({
          id: item.entity_id || `qloo_${Math.random().toString(36).substr(2, 9)}`,
          name: item.name || item.title || 'Unknown',
          description: item.description || item.summary || `Experience related to ${item.name}`,
          categories: this._extractCategories(item),
          rating: (item.popularity || item.score || 0.5) * 5, // Convert 0-1 to 0-5 scale
          price_range: item.price_range || '$$',
          location: item.location || 'Various',
          duration: item.duration || '2-4 hours',
          highlights: this._generateUserFriendlyHighlights(item),
          type: item.type || 'entity',
          score: item.relevance_score || item.score || 0.5,
          affinity_score: item.affinity_score || item.score || 0.5,
          metadata: {
            ...item.metadata,
            sourceEntityId: item.sourceEntityId,
            sourceEntityName: item.sourceEntityName
          }
        })),
        metadata: {
          source: 'qloo',
          entityCount: entityIds.length,
          processedEntities: entitiesToProcess.length,
          totalRecommendations: allRecommendations.length,
          filteredRecommendations: filteredRecommendations.length,
          fallback: false,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting recommendations from Qloo API', {
        error: error.message,
        status: error.response?.status,
        code: error.code
      });
      
      return this._getMockRecommendationsWithFallback();
    }
  }
  
  /**
   * Get authentication headers for API requests
   * @returns {Object} - Headers object with authentication
   * @private
   */
  _getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Use X-API-Key format which we confirmed works
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
      
      // Keep these for backward compatibility
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['api-key'] = this.apiKey;
      
      // Debug logging for authentication
      console.log('Auth headers debug:', {
        hasApiKey: !!this.apiKey,
        apiKeyLength: this.apiKey ? this.apiKey.length : 0,
        apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'none',
        headers: Object.keys(headers)
      });
    } else {
      console.warn('No API key available for authentication');
    }
    
    return headers;
  }
  
  /**
   * Generate mock entity IDs for testing
   * @param {string[]} interests - Array of interests
   * @returns {string[]} - Array of mock entity IDs
   * @private
   */
  _getMockEntityIds(interests) {
    // Generate predictable but unique IDs based on interests
    return interests.map((interest, index) => {
      const hash = interest.split('').reduce((acc, char) => {
        return acc + char.charCodeAt(0);
      }, 0);
      return `mock_entity_${hash}_${index}`;
    });
  }
  
  /**
   * Format recommendations from API response
   * @param {Array} recommendations - Raw recommendations from API
   * @returns {Array} - Formatted recommendations
   * @private
   */
  _formatRecommendations(recommendations) {
    return recommendations.map(rec => ({
      name: rec.name || rec.title || 'Unknown',
      type: rec.type || rec.entity_type || 'entity',
      score: rec.score || rec.affinity || rec.rating / 5 || 0.5,
      metadata: {
        id: rec.id || rec.entity_id,
        description: rec.description || rec.summary || '',
        categories: rec.categories || rec.tags || [],
        location: rec.location || '',
        image: rec.image?.url || '',
        properties: rec.properties || {}
      }
    }));
  }
  
  /**
   * Get mock recommendations with fallback flag
   * @param {Object} params - Parameters for mock recommendations
   * @param {string[]} params.interests - User interests
   * @param {string} params.location - Location preference
   * @param {string} params.budget - Budget preference
   * @returns {Object} - Mock recommendations with fallback flag
   */
  getMockRecommendations({ interests, location, budget }) {
    logger.info('Using mock recommendations', { interests, location, budget });
    
    return {
      recommendations: mockData.recommendations.slice(0, 5).map(rec => ({
        name: rec.name,
        type: 'entity',
        score: rec.rating / 5, // Convert 5-star rating to 0-1 score
        metadata: {
          id: rec.id,
          description: rec.description,
          categories: rec.categories,
          location: rec.location,
          duration: rec.duration,
          highlights: rec.highlights
        }
      })),
      metadata: {
        source: 'mock',
        fallback: true,
        timestamp: new Date().toISOString(),
        interests,
        location,
        budget
      }
    };
  }
  
  /**
   * Get mock recommendations with fallback flag (private method)
   * @returns {Object} - Mock recommendations with fallback flag
   * @private
   */
  _getMockRecommendationsWithFallback() {
    console.info('Returning fallback mock recommendations');
    
    const mockData = require('../mock/qlooMock.json');
    
    return {
      recommendations: mockData.recommendations.map(item => ({
        ...item,
        fallback: true
      })),
      metadata: {
        source: 'mock',
        fallback: true,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  /**
   * Legacy method for backward compatibility
   * @param {Object} params - Parameters for recommendations
   * @param {string[]} params.interests - User interests
   * @param {string} params.location - Location preference
   * @param {string} params.budget - Budget preference
   * @returns {Object} - Recommendations
   */
  async getRecommendationsLegacy({ interests, location, budget }) {
    if (this.useMock) {
      logger.info('Using mock Qloo data (legacy)');
      return this.getMockRecommendations({ interests, location, budget });
    }

    try {
      logger.info('Attempting Qloo API request (legacy)', { 
        interests, 
        location, 
        budget,
        apiUrl: this.baseURL 
      });
      
      const requestPayload = {
        input: {
          liked: interests.map(interest => ({ name: interest })),
          context: {
            location: location,
            budget: budget,
            category: 'travel',
            subcategory: 'cruise'
          }
        },
        geo_hint: this.getGeoHint(location),
        num_results: 5
      };
      
      const response = await axios.post(`${this.baseURL}/recommendations`, requestPayload, {
        headers: this._getAuthHeaders(),
        timeout: this.timeout
      });

      return {
        recommendations: this._formatRecommendations(response.data.recommendations || []),
        metadata: {
          source: 'qloo',
          location,
          budget,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Qloo API error (legacy)', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Fallback to mock data
      return this.getMockRecommendations({ interests, location, budget });
    }
  }

  async callQlooAPI({ interests, location, budget }) {
    // Qloo hackathon API specific request format
    const requestPayload = {
      input: {
        liked: interests.map(interest => ({ name: interest })),
        context: {
          location: location,
          budget: budget,
          category: 'travel',
          subcategory: 'cruise'
        }
      },
      geo_hint: this.getGeoHint(location),
      num_results: 5
    };

    logger.info('Qloo API request payload', requestPayload);

    // Try different authorization methods for Qloo API
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Try multiple authorization formats
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['X-API-Key'] = this.apiKey;
      headers['api-key'] = this.apiKey;
    }

    logger.info('Qloo API request headers', { 
      hasAuth: !!headers['Authorization'],
      hasXApiKey: !!headers['X-API-Key'],
      hasApiKey: !!headers['api-key']
    });

    const response = await axios.post(`${this.baseURL}/recommendations`, requestPayload, {
      headers,
      timeout: this.timeout
    });

    return response;
  }

  getGeoHint(location) {
    const geoHints = {
      'Mediterranean': 'IT',
      'Caribbean': 'US',
      'Alaska': 'US',
      'Northern Europe': 'NO',
      'Asia': 'JP',
      'Australia': 'AU',
      'South America': 'BR'
    };
    
    return geoHints[location] || 'US';
  }

  formatQlooRecommendations(qlooData) {
    if (!qlooData.recommendations || !Array.isArray(qlooData.recommendations)) {
      logger.warn('Unexpected Qloo API response format', qlooData);
      return [];
    }

    return qlooData.recommendations.map((rec, index) => ({
      id: rec.id || `qloo_${index}`,
      name: rec.name || rec.title || 'Cruise Experience',
      description: rec.description || rec.summary || 'Exciting cruise activity',
      categories: this.extractCategories(rec),
      rating: rec.rating || rec.score || 4.5,
      price_range: this.mapPriceRange(rec.price_level),
      location: rec.location || rec.geo?.city || 'Various Locations',
      duration: rec.duration || this.estimateDuration(rec),
      highlights: this.extractHighlights(rec),
      source: 'qloo',
      originalData: rec // Keep original for debugging
    }));
  }

  extractCategories(rec) {
    const categories = [];
    
    if (rec.categories) {
      categories.push(...rec.categories);
    }
    
    if (rec.tags) {
      categories.push(...rec.tags);
    }
    
    if (rec.type) {
      categories.push(rec.type);
    }

    return categories.length > 0 ? categories : ['cruise', 'travel'];
  }

  mapPriceRange(priceLevel) {
    if (typeof priceLevel === 'number') {
      if (priceLevel <= 2) return '$';
      if (priceLevel <= 3) return '$$';
      return '$$$';
    }
    
    if (typeof priceLevel === 'string') {
      const lower = priceLevel.toLowerCase();
      if (lower.includes('budget') || lower.includes('cheap')) return '$';
      if (lower.includes('expensive') || lower.includes('luxury')) return '$$$';
      return '$$';
    }
    
    return '$$'; // Default
  }

  estimateDuration(rec) {
    if (rec.duration) return rec.duration;
    
    // Estimate based on type or category
    const categories = this.extractCategories(rec);
    const categoryStr = categories.join(' ').toLowerCase();
    
    if (categoryStr.includes('dining') || categoryStr.includes('food')) return '2-3 hours';
    if (categoryStr.includes('tour') || categoryStr.includes('walking')) return '2-4 hours';
    if (categoryStr.includes('adventure') || categoryStr.includes('water')) return '4-6 hours';
    if (categoryStr.includes('spa') || categoryStr.includes('wellness')) return 'Half day';
    
    return '2-4 hours'; // Default
  }

  extractHighlights(rec) {
    const highlights = [];
    
    if (rec.highlights && Array.isArray(rec.highlights)) {
      highlights.push(...rec.highlights);
    }
    
    if (rec.features && Array.isArray(rec.features)) {
      highlights.push(...rec.features);
    }
    
    if (rec.amenities && Array.isArray(rec.amenities)) {
      highlights.push(...rec.amenities.slice(0, 3));
    }

    // Generate default highlights if none found
    if (highlights.length === 0) {
      const categories = this.extractCategories(rec);
      if (categories.includes('dining')) highlights.push('Gourmet cuisine', 'Ocean views');
      if (categories.includes('adventure')) highlights.push('Professional guide', 'Equipment included');
      if (categories.includes('culture')) highlights.push('Expert guide', 'Historical insights');
    }

    return highlights.slice(0, 4); // Limit to 4 highlights
  }

  getMockRecommendations({ interests = [], location = '', budget = '' }) {
    logger.info('Using mock Qloo data', { interests, location, budget });
    
    // Enhanced filtering logic
    const filtered = mockData.recommendations.filter(rec => {
      // Check if any interest matches any category
      const interestMatch = interests.length === 0 || interests.some(interest => 
        rec.categories.some(category => 
          category.toLowerCase().includes(interest.toLowerCase()) ||
          interest.toLowerCase().includes(category.toLowerCase())
        )
      );
      
      // Location preference (loose matching)
      const locationMatch = !location || 
        rec.location.toLowerCase().includes(location.toLowerCase()) ||
        location.toLowerCase().includes(rec.location.toLowerCase()) ||
        rec.location === 'Various';
      
      return interestMatch && locationMatch;
    });

    // If no matches, return all recommendations
    const recommendations = filtered.length > 0 ? filtered : mockData.recommendations;

    return {
      recommendations: recommendations.slice(0, 5),
      metadata: {
        source: 'mock',
        location,
        budget,
        filteredCount: filtered.length,
        totalAvailable: mockData.recommendations.length,
        fallback: !this.apiKey,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Health check method for API status
  async healthCheck() {
    if (!this.apiKey) {
      return { status: 'mock', message: 'No API key provided, using mock data' };
    }

    try {
      // Try different health check endpoints
      const possibleUrls = [
        `${this.baseURL}/health`,
        `${this.baseURL}/status`,
        `${this.baseURL}/ping`,
        `${this.baseURL}/`,
        `${this.baseURL}/v1/health`
      ];
      
      const headers = this._getAuthHeaders();
      
      for (const url of possibleUrls) {
        try {
          const response = await axios.get(url, {
            headers,
            timeout: 3000
          });
          
          if (response.status === 200) {
            return { 
              status: 'healthy', 
              message: 'Qloo API is accessible',
              endpoint: url
            };
          }
        } catch (endpointError) {
          // Continue to next endpoint
        }
      }
      
      // If all health checks failed, but we have an API key, it might still work
      return { 
        status: 'unknown', 
        message: 'Health check endpoints not found, but API key is configured',
        fallback: 'Will attempt API calls'
      };
      
    } catch (error) {
      return { 
        status: 'error', 
        message: `Qloo API error: ${error.message}`,
        fallback: 'Using mock data'
      };
    }
  }
  
  /**
   * Test API endpoints to find working ones
   * @returns {Promise<Object>} - Test results
   */
  async testEndpoints() {
    if (!this.apiKey) {
      return { status: 'no-api-key', message: 'No API key provided' };
    }
    
    const results = {
      baseURL: this.baseURL,
      workingEndpoints: [],
      failedEndpoints: []
    };
    
    const testEndpoints = [
      { path: '/', method: 'GET', name: 'Root' },
      { path: '/health', method: 'GET', name: 'Health' },
      { path: '/status', method: 'GET', name: 'Status' },
      { path: '/search', method: 'GET', name: 'Search', params: '?q=test' },
      { path: '/recommendations', method: 'GET', name: 'Recommendations' },
      { path: '/v1/search', method: 'GET', name: 'V1 Search', params: '?q=test' },
      { path: '/api/search', method: 'GET', name: 'API Search', params: '?q=test' }
    ];
    
    const headers = this._getAuthHeaders();
    
    for (const endpoint of testEndpoints) {
      try {
        const url = `${this.baseURL}${endpoint.path}${endpoint.params || ''}`;
        const response = await axios.get(url, {
          headers,
          timeout: 3000
        });
        
        results.workingEndpoints.push({
          name: endpoint.name,
          url: url,
          status: response.status,
          hasData: !!response.data
        });
      } catch (error) {
        results.failedEndpoints.push({
          name: endpoint.name,
          url: `${this.baseURL}${endpoint.path}${endpoint.params || ''}`,
          error: error.message,
          status: error.response?.status
        });
      }
    }
    
    return results;
  }

  /**
   * Filter and deduplicate recommendations based on affinity scores and relevance
   * @param {Array} recommendations - Array of raw recommendations
   * @returns {Array} - Filtered and deduplicated recommendations
   * @private
   */
  _filterAndDeduplicateRecommendations(recommendations) {
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      return [];
    }
    
    // Enhanced configuration for filtering with better thresholds
    const AFFINITY_CONFIG = {
      minScore: 0.3,        // Higher minimum score for quality
      preferredScore: 0.5,  // Higher preferred score for relevance
      maxResults: 25,       // More results for better variety
      noiseThreshold: 0.2,  // Higher noise threshold
      crossTypeBonus: 0.1   // Bonus for cross-type relevance
    };
    
    // Add affinity scores if not present and enhance with cross-type analysis
    const recommendationsWithScore = recommendations.map(rec => {
      const baseScore = rec.affinity_score || rec.score || rec.relevance_score || 0.5;
      
      // Add cross-type bonus if entity has multiple types
      let enhancedScore = baseScore;
      if (rec.types && Array.isArray(rec.types) && rec.types.length > 1) {
        enhancedScore += AFFINITY_CONFIG.crossTypeBonus;
      }
      
      // Add bonus for high-quality entities (URNs)
      if (rec.urn && rec.urn.startsWith('urn:')) {
        enhancedScore += 0.05;
      }
      
      return {
        ...rec,
        affinity_score: Math.min(enhancedScore, 1.0), // Cap at 1.0
        original_score: baseScore
      };
    });
    
    // Filter by minimum affinity score
    const filteredByAffinity = recommendationsWithScore.filter(rec => 
      rec.affinity_score >= AFFINITY_CONFIG.minScore
    );
    
    // Remove noisy results (very low scores)
    const cleanRecommendations = filteredByAffinity.filter(rec =>
      rec.affinity_score >= AFFINITY_CONFIG.noiseThreshold
    );
    
    // Deduplicate by entity_id and name to avoid similar recommendations
    const uniqueRecommendations = [];
    const seenIds = new Set();
    const seenNames = new Set();
    
    for (const rec of cleanRecommendations) {
      const entityId = rec.entity_id || rec.id;
      const name = (rec.name || rec.title || '').toLowerCase().trim();
      
      // Check if we've seen this entity ID or a very similar name
      if (entityId && !seenIds.has(entityId) && !seenNames.has(name)) {
        seenIds.add(entityId);
        seenNames.add(name);
        uniqueRecommendations.push(rec);
      }
    }
    
    // Sort by affinity score but add some randomness for variety
    const sortedRecommendations = uniqueRecommendations.sort((a, b) => {
      const scoreDiff = b.affinity_score - a.affinity_score;
      // Add small random factor to break ties and increase variety
      if (Math.abs(scoreDiff) < 0.1) {
        return Math.random() - 0.5;
      }
      return scoreDiff;
    });
    
    // Limit results
    const limitedRecommendations = sortedRecommendations.slice(0, AFFINITY_CONFIG.maxResults);
    
    console.info('Affinity filtering and deduplication completed', {
      originalCount: recommendations.length,
      filteredByAffinity: filteredByAffinity.length,
      cleanCount: cleanRecommendations.length,
      uniqueCount: uniqueRecommendations.length,
      finalCount: limitedRecommendations.length,
      minScore: AFFINITY_CONFIG.minScore,
      noiseThreshold: AFFINITY_CONFIG.noiseThreshold
    });
    
    return limitedRecommendations;
  }

  /**
   * Generate user-friendly highlights for recommendations
   * @param {Object} item - Entity item from Qloo API
   * @returns {Array} - Array of user-friendly highlights
   * @private
   */
  _generateUserFriendlyHighlights(item) {
    const highlights = [];
    
    // Add from existing highlights if they're user-friendly
    if (item.highlights && Array.isArray(item.highlights)) {
      item.highlights.forEach(highlight => {
        if (typeof highlight === 'string' && 
            !highlight.startsWith('urn:') && 
            !highlight.includes('{') && 
            highlight.length < 100) {
          highlights.push(highlight);
        }
      });
    }
    
    // Generate highlights based on categories and type
    const categories = this._extractCategories(item);
    const name = item.name || item.title || '';
    
    // Add category-based highlights
    if (categories.includes('dining') || name.toLowerCase().includes('dining')) {
      highlights.push('Gourmet cuisine', 'Ocean views', 'Fine dining experience');
    } else if (categories.includes('adventure') || name.toLowerCase().includes('adventure')) {
      highlights.push('Professional guide', 'Equipment included', 'Thrilling experience');
    } else if (categories.includes('culture') || name.toLowerCase().includes('culture')) {
      highlights.push('Expert guide', 'Historical insights', 'Cultural immersion');
    } else if (categories.includes('wellness') || name.toLowerCase().includes('wellness')) {
      highlights.push('Relaxing atmosphere', 'Professional staff', 'Health benefits');
    } else if (categories.includes('nature') || name.toLowerCase().includes('nature')) {
      highlights.push('Natural beauty', 'Outdoor experience', 'Scenic views');
    } else {
      highlights.push('Professional guidance', 'Memorable experience', 'Quality service');
    }
    
    // Remove duplicates and limit to 3 highlights
    const uniqueHighlights = [...new Set(highlights)];
    return uniqueHighlights.slice(0, 3);
  }

  /**
   * Extract categories from Qloo entity data
   * @param {Object} item - Entity item from Qloo API
   * @returns {Array} - Array of categories
   * @private
   */
  _extractCategories(item) {
    const categories = [];
    
    // Add from categories array (only if they're user-friendly)
    if (item.categories && Array.isArray(item.categories)) {
      item.categories.forEach(cat => {
        if (typeof cat === 'string' && !cat.startsWith('urn:') && cat.length < 50) {
          categories.push(cat);
        }
      });
    }
    
    // Add from tags array (only if they're user-friendly)
    if (item.tags && Array.isArray(item.tags)) {
      item.tags.forEach(tag => {
        if (typeof tag === 'string' && !tag.startsWith('urn:') && tag.length < 50) {
          categories.push(tag);
        }
      });
    }
    
    // Extract meaningful categories from types array (Qloo specific format)
    if (item.types && Array.isArray(item.types)) {
      item.types.forEach(type => {
        if (typeof type === 'string') {
          // Extract meaningful part from URN format like "urn:tag:genre:media"
          const parts = type.split(':');
          if (parts.length > 2) {
            const category = parts[parts.length - 1];
            // Only add user-friendly categories (not technical URNs)
            if (category && 
                !category.includes('_') && 
                !category.includes('urn:') && 
                category.length < 30 &&
                !categories.includes(category)) {
              categories.push(category);
            }
          }
        }
      });
    }
    
    // Add disambiguation as category if available and user-friendly
    if (item.disambiguation && 
        !item.disambiguation.startsWith('urn:') && 
        item.disambiguation.length < 50 &&
        !categories.includes(item.disambiguation)) {
      categories.push(item.disambiguation);
    }
    
    // Fallback to general category if no categories found
    if (categories.length === 0) {
      categories.push('general');
    }
    
    // Limit to 3 most relevant categories
    return categories.slice(0, 3);
  }
}

// Export both the class and an instance
module.exports = QlooClient;
module.exports.instance = new QlooClient();