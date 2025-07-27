/**
 * Entity Resolver Service
 * Handles entity resolution using Qloo API resolve-entities endpoint
 */

const axios = require('axios');
const logger = require('../utils/logger');
const urnRegistry = require('./urnRegistry');

class EntityResolver {
  constructor() {
    this.baseURL = process.env.QLOO_API_URL || 'https://hackathon.api.qloo.com';
    this.apiKey = process.env.QLOO_API_KEY;
    this.timeout = 10000;
    
    // Entity types supported by Qloo API
    this.supportedTypes = ['brand', 'place', 'tag', 'audience'];
    
    // Resolution confidence thresholds
    this.confidenceThresholds = {
      high: 0.8,
      medium: 0.6,
      low: 0.4
    };
  }

  /**
   * Resolve entities from user input
   * @param {string[]} userInput - Array of user input strings
   * @param {Object} options - Resolution options
   * @returns {Promise<Object>} - Resolved entities with metadata
   */
  async resolveEntities(userInput, options = {}) {
    if (!userInput || !Array.isArray(userInput) || userInput.length === 0) {
      logger.warn('No user input provided for entity resolution');
      return {
        entities: [],
        metadata: {
          resolved: false,
          reason: 'No user input provided',
          timestamp: new Date().toISOString()
        }
      };
    }

    try {
      logger.info('Resolving entities from user input', {
        inputCount: userInput.length,
        input: userInput
      });

      if (!this.apiKey) {
        logger.warn('No API key available, using fallback resolution');
        return this._fallbackResolution(userInput, options);
      }

      const resolvedEntities = await this._resolveFromAPI(userInput, options);
      
      // Validate and filter resolved entities
      const validatedEntities = this._validateResolvedEntities(resolvedEntities);
      
      // Cache resolved entities
      this._cacheResolvedEntities(validatedEntities);
      
      return {
        entities: validatedEntities,
        metadata: {
          resolved: true,
          inputCount: userInput.length,
          resolvedCount: validatedEntities.length,
          confidence: this._calculateOverallConfidence(validatedEntities),
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Entity resolution failed', {
        error: error.message,
        input: userInput
      });
      
      return this._fallbackResolution(userInput, options);
    }
  }

  /**
   * Resolve entities from Qloo API
   * @param {string[]} userInput - User input array
   * @param {Object} options - Resolution options
   * @returns {Promise<Array>} - Resolved entities
   * @private
   */
  async _resolveFromAPI(userInput, options) {
    logger.info('Resolving entities using Qloo search API', {
      input: userInput,
      types: options.types || this.supportedTypes
    });

    const resolvedEntities = [];

    // Process each input term individually using the search endpoint
    for (const term of userInput) {
      try {
        const response = await axios.get(`${this.baseURL}/search`, {
          params: {
            query: term,
            limit: options.limit || 5
          },
          headers: this._getAuthHeaders(),
          timeout: this.timeout
        });

        if (response.data && response.data.results) {
          logger.info(`Successfully resolved entities for term "${term}"`, {
            entityCount: response.data.results.length
          });
          
          // Add resolved entities with source term
          const entities = response.data.results.map(entity => ({
            ...entity,
            source_term: term,
            urn: entity.entity_id || entity.id,
            confidence: entity.popularity || 0.5,
            type: entity.types ? entity.types[0] : 'urn:tag'
          }));
          
          resolvedEntities.push(...entities);
        }

      } catch (error) {
        logger.warn(`Failed to resolve term "${term}":`, error.message);
      }
    }

    if (resolvedEntities.length === 0) {
      throw new Error('No entities resolved from API');
    }

    return resolvedEntities;
  }

  /**
   * Validate resolved entities
   * @param {Array} entities - Resolved entities
   * @returns {Array} - Validated entities
   * @private
   */
  _validateResolvedEntities(entities) {
    if (!Array.isArray(entities)) {
      return [];
    }

    return entities.filter(entity => {
      // Check required fields
      if (!entity.urn && !entity.entity_id && !entity.id) {
        logger.warn('Entity missing identifier', entity);
        return false;
      }

      // Validate URN if present
      if (entity.urn && !urnRegistry.validateURN(entity.urn)) {
        logger.warn('Invalid URN in resolved entity', { urn: entity.urn, entity });
        return false;
      }

      // Check confidence score
      const confidence = entity.confidence || entity.score || 0.5;
      if (confidence < this.confidenceThresholds.low) {
        logger.debug('Entity below confidence threshold', {
          entity: entity.name || entity.urn,
          confidence
        });
        return false;
      }

      return true;
    }).map(entity => ({
      ...entity,
      urn: entity.urn || entity.entity_id || entity.id,
      confidence: entity.confidence || entity.score || 0.5,
      type: entity.type || urnRegistry.getURNType(entity.urn || entity.entity_id || entity.id),
      resolved_at: new Date().toISOString()
    }));
  }

  /**
   * Cache resolved entities
   * @param {Array} entities - Resolved entities
   * @private
   */
  _cacheResolvedEntities(entities) {
    entities.forEach(entity => {
      const urn = entity.urn || entity.entity_id || entity.id;
      if (urn && urn.startsWith('urn:')) {
        urnRegistry.cacheEntity(urn, {
          name: entity.name,
          type: entity.type,
          confidence: entity.confidence,
          metadata: entity.metadata || {}
        });
      }
    });
  }

  /**
   * Calculate overall confidence for resolved entities
   * @param {Array} entities - Resolved entities
   * @returns {number} - Overall confidence score
   * @private
   */
  _calculateOverallConfidence(entities) {
    if (!entities || entities.length === 0) {
      return 0;
    }

    const totalConfidence = entities.reduce((sum, entity) => 
      sum + (entity.confidence || 0), 0
    );

    return totalConfidence / entities.length;
  }

  /**
   * Fallback resolution when API is unavailable
   * @param {string[]} userInput - User input array
   * @param {Object} options - Resolution options
   * @returns {Object} - Fallback resolution result
   * @private
   */
  _fallbackResolution(userInput, options) {
    logger.info('Using fallback entity resolution');

    const fallbackEntities = userInput.map((input, index) => ({
      urn: `urn:tag:fallback:${input.toLowerCase().replace(/\s+/g, '_')}`,
      name: input,
      type: 'tag',
      confidence: 0.5,
      source: 'fallback',
      resolved_at: new Date().toISOString()
    }));

    return {
      entities: fallbackEntities,
      metadata: {
        resolved: false,
        fallback: true,
        inputCount: userInput.length,
        resolvedCount: fallbackEntities.length,
        confidence: 0.5,
        reason: 'API unavailable, using fallback resolution',
        timestamp: new Date().toISOString()
      }
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
   * Resolve specific entity by URN
   * @param {string} urn - URN to resolve
   * @returns {Promise<Object|null>} - Resolved entity or null
   */
  async resolveEntityByURN(urn) {
    if (!urnRegistry.validateURN(urn)) {
      logger.warn('Invalid URN provided for resolution', { urn });
      return null;
    }

    // Check cache first
    const cached = urnRegistry.getCachedEntity(urn);
    if (cached) {
      logger.debug('Entity found in cache', { urn });
      return {
        ...cached,
        urn,
        cached: true
      };
    }

    try {
      const response = await axios.get(`${this.baseURL}/entities/${encodeURIComponent(urn)}`, {
        headers: this._getAuthHeaders(),
        timeout: this.timeout
      });

      if (response.data) {
        const entity = {
          urn,
          ...response.data,
          resolved_at: new Date().toISOString()
        };

        // Cache the resolved entity
        urnRegistry.cacheEntity(urn, entity);

        return entity;
      }

    } catch (error) {
      logger.error('Failed to resolve entity by URN', { urn, error: error.message });
    }

    return null;
  }

  /**
   * Batch resolve multiple URNs
   * @param {string[]} urns - Array of URNs to resolve
   * @returns {Promise<Array>} - Array of resolved entities
   */
  async batchResolveURNs(urns) {
    if (!Array.isArray(urns) || urns.length === 0) {
      return [];
    }

    const validURNs = urns.filter(urn => urnRegistry.validateURN(urn));
    
    if (validURNs.length === 0) {
      logger.warn('No valid URNs provided for batch resolution');
      return [];
    }

    logger.info('Batch resolving URNs', { count: validURNs.length });

    const resolutionPromises = validURNs.map(urn => 
      this.resolveEntityByURN(urn).catch(error => {
        logger.error('Failed to resolve URN in batch', { urn, error: error.message });
        return null;
      })
    );

    const results = await Promise.all(resolutionPromises);
    return results.filter(result => result !== null);
  }

  /**
   * Get resolution statistics
   * @returns {Object} - Resolution statistics
   */
  getStats() {
    return {
      supportedTypes: this.supportedTypes,
      confidenceThresholds: this.confidenceThresholds,
      hasApiKey: !!this.apiKey,
      baseURL: this.baseURL
    };
  }
}

// Export singleton instance
module.exports = new EntityResolver(); 
module.exports = new EntityResolver(); 