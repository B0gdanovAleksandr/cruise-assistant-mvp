const axios = require('axios');
const logger = require('../utils/logger');
const mockData = require('../mock/qlooMock.json');

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
    
    // Debug logging
    console.log('QlooClient initialized:', {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey ? this.apiKey.length : 0,
      baseURL: this.baseURL,
      useMock: this.useMock
    });
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
   * Search for entities based on interests
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
    } catch (error) {
      console.error('Error in searchEntities', {
        error: error.message,
        interests
      });
      return [];
    }
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
      console.warn('No entity IDs provided for recommendations');
      return this._getMockRecommendationsWithFallback();
    }
    
    console.info(`Getting recommendations for ${entityIds.length} entities`);
    
    try {
      // Use the first entity ID to get similar entities
      const entityId = entityIds[0];
      
      // Use axios GET with the correct endpoint for similar entities
      const response = await this._executeWithRetry(
        () => axios.get(`${this.baseURL}/entities/${entityId}/similar`, {
          params: {
            entity_ids: entityId,
            limit: 5,
            locale: 'en'
          },
          headers: this._getAuthHeaders(),
          timeout: 5000
        }),
        'get recommendations'
      );
      
      console.info('Qloo API request successful');
      
      // Check if response has results array
      if (response.data && response.data.results && Array.isArray(response.data.results)) {
        const recommendations = response.data.results;
        console.info(`Received ${recommendations.length} recommendations from Qloo API`);
        
        // If results array is empty, return fallback
        if (recommendations.length === 0) {
          console.warn('Empty results array from recommendations API, using fallback');
          return this._getMockRecommendationsWithFallback();
        }
        
        return {
          recommendations: recommendations.map(item => ({
            id: item.entity_id || `qloo_${Math.random().toString(36).substr(2, 9)}`,
            name: item.name || item.title || 'Unknown',
            description: item.description || item.summary || `Experience related to ${item.name}`,
            categories: this._extractCategories(item),
            rating: (item.popularity || item.score || 0.5) * 5, // Convert 0-1 to 0-5 scale
            price_range: item.price_range || '$$',
            location: item.location || 'Various',
            duration: item.duration || '2-4 hours',
            highlights: item.highlights || [`Explore ${item.name}`, 'Professional guidance', 'Memorable experience'],
            type: item.type || 'entity',
            score: item.relevance_score || item.score || 0.5,
            metadata: item.metadata || {}
          })),
          metadata: {
            source: 'qloo',
            entityCount: entityIds.length,
            fallback: false,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        // Log warning and return fallback if results is not an array
        console.warn('Unexpected response format from recommendations API', {
          hasResults: !!response.data?.results,
          isResultsArray: Array.isArray(response.data?.results),
          dataKeys: response.data ? Object.keys(response.data) : []
        });
        
        return this._getMockRecommendationsWithFallback();
      }
    } catch (error) {
      // Log error and return fallback for all errors
      if (error.response && error.response.status === 429) {
        console.warn('Rate limit exceeded for Qloo API, using fallback', {
          status: 429
        });
      } else {
        console.error('Error getting recommendations from Qloo API', {
          error: error.message,
          status: error.response?.status,
          code: error.code
        });
      }
      
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
   * Extract categories from Qloo entity data
   * @param {Object} item - Entity item from Qloo API
   * @returns {Array} - Array of categories
   * @private
   */
  _extractCategories(item) {
    const categories = [];
    
    // Add from categories array
    if (item.categories && Array.isArray(item.categories)) {
      categories.push(...item.categories);
    }
    
    // Add from tags array
    if (item.tags && Array.isArray(item.tags)) {
      categories.push(...item.tags);
    }
    
    // Extract from types array (Qloo specific format)
    if (item.types && Array.isArray(item.types)) {
      item.types.forEach(type => {
        if (typeof type === 'string') {
          // Extract meaningful part from URN format like "urn:tag:genre:media"
          const parts = type.split(':');
          if (parts.length > 2) {
            const category = parts[parts.length - 1];
            if (category && !categories.includes(category)) {
              categories.push(category);
            }
          }
        }
      });
    }
    
    // Add disambiguation as category if available
    if (item.disambiguation && !categories.includes(item.disambiguation)) {
      categories.push(item.disambiguation);
    }
    
    // Fallback to general category if no categories found
    if (categories.length === 0) {
      categories.push('general');
    }
    
    return categories;
  }
}

// Export both the class and an instance
module.exports = QlooClient;
module.exports.instance = new QlooClient();