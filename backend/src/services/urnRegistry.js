/**
 * URN Registry Service
 * Handles URN validation, caching, and registry management for Qloo API entities
 */

const axios = require('axios');
const logger = require('../utils/logger');

class URNRegistry {
  constructor() {
    this.audiences = new Set();
    this.tags = new Set();
    this.types = new Set();
    this.cache = new Map();
    this.lastRefresh = null;
    this.refreshInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.baseURL = process.env.QLOO_API_URL || 'https://hackathon.api.qloo.com';
    this.apiKey = process.env.QLOO_API_KEY;
    
    // URN patterns for validation
    this.urnPatterns = {
      brand: /^urn:brand:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/,
      place: /^urn:place:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/,
      tag: /^urn:tag:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/,
      audience: /^urn:audience:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/,
      general: /^urn:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/
    };
    
    // Default URN types for fallback
    this.defaultURNs = {
      audiences: [
        'urn:audience:demographic:millennials',
        'urn:audience:demographic:gen-x',
        'urn:audience:demographic:boomers',
        'urn:audience:lifestyle:luxury',
        'urn:audience:lifestyle:budget'
      ],
      tags: [
        'urn:tag:genre:music',
        'urn:tag:genre:food',
        'urn:tag:genre:travel',
        'urn:tag:genre:wellness',
        'urn:tag:genre:adventure'
      ],
      types: [
        'urn:type:activity:entertainment',
        'urn:type:activity:dining',
        'urn:type:activity:wellness',
        'urn:type:activity:adventure',
        'urn:type:activity:culture'
      ]
    };
  }

  /**
   * Initialize the URN registry
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      logger.info('Initializing URN Registry');
      
      if (this.apiKey) {
        await this.loadRegistryFromAPI();
      } else {
        await this.loadDefaultRegistry();
      }
      
      this.lastRefresh = new Date();
      logger.info('URN Registry initialized successfully', {
        audienceCount: this.audiences.size,
        tagCount: this.tags.size,
        typeCount: this.types.size
      });
    } catch (error) {
      logger.error('Failed to initialize URN Registry, using defaults', error);
      await this.loadDefaultRegistry();
    }
  }

  /**
   * Load URN registry from Qloo API
   * @returns {Promise<void>}
   * @private
   */
  async loadRegistryFromAPI() {
    try {
      logger.info('Loading URN registry from Qloo API');
      
      // Try different endpoints for URN registry
      const endpoints = [
        '/registry',
        '/urns',
        '/entities/registry',
        '/v1/registry'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${this.baseURL}${endpoint}`, {
            headers: this._getAuthHeaders(),
            timeout: 5000
          });
          
          if (response.data) {
            this._parseRegistryData(response.data);
            logger.info(`Successfully loaded URN registry from ${endpoint}`);
            return;
          }
        } catch (endpointError) {
          logger.debug(`Failed to load from ${endpoint}:`, endpointError.message);
        }
      }
      
      // If no API endpoint works, fall back to defaults
      logger.warn('No working URN registry endpoints found, using defaults');
      await this.loadDefaultRegistry();
      
    } catch (error) {
      logger.error('Error loading URN registry from API', error);
      await this.loadDefaultRegistry();
    }
  }

  /**
   * Load default URN registry
   * @returns {Promise<void>}
   * @private
   */
  async loadDefaultRegistry() {
    logger.info('Loading default URN registry');
    
    // Load default URNs
    this.defaultURNs.audiences.forEach(urn => this.audiences.add(urn));
    this.defaultURNs.tags.forEach(urn => this.tags.add(urn));
    this.defaultURNs.types.forEach(urn => this.types.add(urn));
    
    logger.info('Default URN registry loaded', {
      audienceCount: this.audiences.size,
      tagCount: this.tags.size,
      typeCount: this.types.size
    });
  }

  /**
   * Parse registry data from API response
   * @param {Object} data - Registry data from API
   * @private
   */
  _parseRegistryData(data) {
    if (data.audiences && Array.isArray(data.audiences)) {
      data.audiences.forEach(urn => this.audiences.add(urn));
    }
    
    if (data.tags && Array.isArray(data.tags)) {
      data.tags.forEach(urn => this.tags.add(urn));
    }
    
    if (data.types && Array.isArray(data.types)) {
      data.types.forEach(urn => this.types.add(urn));
    }
    
    // Handle alternative data structures
    if (data.entities && Array.isArray(data.entities)) {
      data.entities.forEach(entity => {
        if (entity.urn) {
          this._addURNByType(entity.urn);
        }
      });
    }
  }

  /**
   * Add URN to appropriate set based on type
   * @param {string} urn - URN to add
   * @private
   */
  _addURNByType(urn) {
    if (urn.startsWith('urn:audience:')) {
      this.audiences.add(urn);
    } else if (urn.startsWith('urn:tag:')) {
      this.tags.add(urn);
    } else if (urn.startsWith('urn:type:')) {
      this.types.add(urn);
    }
  }

  /**
   * Validate URN format
   * @param {string} urn - URN to validate
   * @returns {boolean} - Whether URN is valid
   */
  validateURN(urn) {
    if (!urn || typeof urn !== 'string') {
      return false;
    }
    
    // Check against patterns
    for (const [type, pattern] of Object.entries(this.urnPatterns)) {
      if (pattern.test(urn)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get URN type
   * @param {string} urn - URN to analyze
   * @returns {string|null} - URN type or null if invalid
   */
  getURNType(urn) {
    if (!this.validateURN(urn)) {
      return null;
    }
    
    if (urn.startsWith('urn:brand:')) return 'brand';
    if (urn.startsWith('urn:place:')) return 'place';
    if (urn.startsWith('urn:tag:')) return 'tag';
    if (urn.startsWith('urn:audience:')) return 'audience';
    if (urn.startsWith('urn:type:')) return 'type';
    
    return 'unknown';
  }

  /**
   * Check if URN exists in registry
   * @param {string} urn - URN to check
   * @returns {boolean} - Whether URN exists in registry
   */
  existsInRegistry(urn) {
    if (!this.validateURN(urn)) {
      return false;
    }
    
    const type = this.getURNType(urn);
    switch (type) {
      case 'audience':
        return this.audiences.has(urn);
      case 'tag':
        return this.tags.has(urn);
      case 'type':
        return this.types.has(urn);
      default:
        // For brand and place, we can't validate against registry
        // as they are dynamic, but we can validate format
        return true;
    }
  }

  /**
   * Get cached entity data
   * @param {string} urn - URN to get cache for
   * @returns {Object|null} - Cached data or null
   */
  getCachedEntity(urn) {
    if (!this.validateURN(urn)) {
      return null;
    }
    
    const cached = this.cache.get(urn);
    if (cached && Date.now() - cached.timestamp < this.refreshInterval) {
      return cached.data;
    }
    
    return null;
  }

  /**
   * Cache entity data
   * @param {string} urn - URN to cache
   * @param {Object} data - Data to cache
   */
  cacheEntity(urn, data) {
    if (!this.validateURN(urn)) {
      logger.warn('Attempted to cache invalid URN:', urn);
      return;
    }
    
    this.cache.set(urn, {
      data,
      timestamp: Date.now()
    });
    
    logger.debug('Cached entity data for URN:', urn);
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    let clearedCount = 0;
    
    for (const [urn, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.refreshInterval) {
        this.cache.delete(urn);
        clearedCount++;
      }
    }
    
    if (clearedCount > 0) {
      logger.info(`Cleared ${clearedCount} expired cache entries`);
    }
  }

  /**
   * Refresh registry if needed
   * @returns {Promise<void>}
   */
  async refreshIfNeeded() {
    if (!this.lastRefresh || Date.now() - this.lastRefresh.getTime() > this.refreshInterval) {
      logger.info('Refreshing URN registry');
      await this.initialize();
    }
  }

  /**
   * Get registry statistics
   * @returns {Object} - Registry statistics
   */
  getStats() {
    return {
      audiences: this.audiences.size,
      tags: this.tags.size,
      types: this.types.size,
      cacheSize: this.cache.size,
      lastRefresh: this.lastRefresh,
      isInitialized: this.lastRefresh !== null
    };
  }

  /**
   * Get authentication headers
   * @returns {Object} - Headers object
   * @private
   */
  _getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }

  /**
   * Validate and normalize entity IDs
   * @param {string[]} entityIds - Array of entity IDs
   * @returns {string[]} - Validated and normalized entity IDs
   */
  validateEntityIds(entityIds) {
    if (!Array.isArray(entityIds)) {
      return [];
    }
    
    return entityIds.filter(id => {
      if (!id || typeof id !== 'string') {
        return false;
      }
      
      // Check if it's a URN
      if (id.startsWith('urn:')) {
        return this.validateURN(id);
      }
      
      // For non-URN IDs, just check basic format
      return /^[a-zA-Z0-9_-]+$/.test(id);
    });
  }

  /**
   * Convert entity IDs to URNs if possible
   * @param {string[]} entityIds - Array of entity IDs
   * @returns {string[]} - Array of URNs
   */
  convertToURNs(entityIds) {
    return entityIds.map(id => {
      if (id.startsWith('urn:')) {
        return id;
      }
      
      // Try to infer URN type based on context
      // This is a simplified approach - in production you'd want more sophisticated logic
      if (id.includes('brand') || id.includes('company')) {
        return `urn:brand:entity:${id}`;
      }
      
      if (id.includes('place') || id.includes('location')) {
        return `urn:place:entity:${id}`;
      }
      
      // Default to tag
      return `urn:tag:entity:${id}`;
    });
  }
}

// Export singleton instance
module.exports = new URNRegistry(); 