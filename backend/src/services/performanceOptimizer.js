const logger = require('../utils/logger');

/**
 * Performance optimization service for RAG system
 * Implements caching, query optimization, and performance monitoring
 */
class PerformanceOptimizer {
  constructor() {
    this.cache = new Map();
    this.queryCache = new Map();
    this.embeddingCache = new Map();
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      queryOptimizations: 0,
      responseTimeImprovements: []
    };
    this.config = {
      maxCacheSize: 1000,
      cacheTTL: 3600000, // 1 hour in milliseconds
      enableQueryOptimization: true,
      enableEmbeddingCache: true,
      enableResponseCache: true
    };
  }

  /**
   * Optimizes query for better retrieval performance
   * @param {string} query - Original query
   * @param {Object} userPrefs - User preferences
   * @returns {Object} Optimized query object
   */
  optimizeQuery(query, userPrefs) {
    if (!this.config.enableQueryOptimization) {
      return { originalQuery: query, optimizedQuery: query };
    }

    const startTime = Date.now();
    let optimizedQuery = query;

    // Query expansion based on user preferences
    if (userPrefs && userPrefs.interests) {
      const expandedTerms = this.expandQueryWithInterests(query, userPrefs.interests);
      optimizedQuery = `${query} ${expandedTerms.join(' ')}`;
    }

    // Query preprocessing
    optimizedQuery = this.preprocessQuery(optimizedQuery);

    // Query normalization
    optimizedQuery = this.normalizeQuery(optimizedQuery);

    const optimizationTime = Date.now() - startTime;
    this.metrics.queryOptimizations++;

    logger.info('Query optimization completed', {
      originalQuery: query,
      optimizedQuery: optimizedQuery,
      optimizationTime: optimizationTime,
      userPrefs: userPrefs
    });

    return {
      originalQuery: query,
      optimizedQuery: optimizedQuery,
      optimizationTime: optimizationTime
    };
  }

  /**
   * Expands query with user interests
   * @param {string} query - Original query
   * @param {Array} interests - User interests
   * @returns {Array} Expanded terms
   */
  expandQueryWithInterests(query, interests) {
    const expandedTerms = [];
    
    // Add relevant interests based on query content
    interests.forEach(interest => {
      if (this.isInterestRelevant(query, interest)) {
        expandedTerms.push(interest);
      }
    });

    // Add synonyms for common terms
    const synonyms = this.getSynonyms(query);
    expandedTerms.push(...synonyms);

    return expandedTerms;
  }

  /**
   * Checks if interest is relevant to query
   * @param {string} query - Query text
   * @param {string} interest - User interest
   * @returns {boolean} Relevance flag
   */
  isInterestRelevant(query, interest) {
    const queryLower = query.toLowerCase();
    const interestLower = interest.toLowerCase();
    
    // Direct match
    if (queryLower.includes(interestLower)) {
      return true;
    }

    // Semantic relevance (simplified)
    const relevanceMap = {
      'culture': ['museum', 'art', 'history', 'heritage'],
      'wellness': ['spa', 'yoga', 'relaxation', 'health'],
      'adventure': ['sports', 'outdoor', 'exciting', 'thrilling'],
      'food': ['cuisine', 'dining', 'restaurant', 'taste'],
      'family': ['kids', 'children', 'entertainment', 'fun']
    };

    const relatedTerms = relevanceMap[interestLower] || [];
    return relatedTerms.some(term => queryLower.includes(term));
  }

  /**
   * Gets synonyms for query terms
   * @param {string} query - Query text
   * @returns {Array} Synonyms
   */
  getSynonyms(query) {
    const synonyms = [];
    const queryLower = query.toLowerCase();

    // Simple synonym mapping
    const synonymMap = {
      'tour': ['excursion', 'trip', 'visit'],
      'spa': ['wellness', 'relaxation', 'treatment'],
      'food': ['cuisine', 'dining', 'restaurant'],
      'culture': ['heritage', 'tradition', 'art'],
      'adventure': ['sports', 'outdoor', 'exciting']
    };

    Object.entries(synonymMap).forEach(([term, termSynonyms]) => {
      if (queryLower.includes(term)) {
        synonyms.push(...termSynonyms);
      }
    });

    return synonyms;
  }

  /**
   * Preprocesses query for better performance
   * @param {string} query - Query text
   * @returns {string} Preprocessed query
   */
  preprocessQuery(query) {
    // Remove extra whitespace
    let processed = query.replace(/\s+/g, ' ').trim();
    
    // Remove common stop words (simplified)
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = processed.split(' ');
    const filteredWords = words.filter(word => !stopWords.includes(word.toLowerCase()));
    
    return filteredWords.join(' ');
  }

  /**
   * Normalizes query for consistency
   * @param {string} query - Query text
   * @returns {string} Normalized query
   */
  normalizeQuery(query) {
    // Convert to lowercase
    let normalized = query.toLowerCase();
    
    // Remove punctuation (keep spaces)
    normalized = normalized.replace(/[^\w\s]/g, '');
    
    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }

  /**
   * Caches embedding for reuse
   * @param {string} text - Text to cache
   * @param {Array} embedding - Embedding vector
   */
  cacheEmbedding(text, embedding) {
    if (!this.config.enableEmbeddingCache) return;

    const normalizedText = this.normalizeQuery(text);
    const cacheKey = `embedding:${normalizedText}`;
    
    this.embeddingCache.set(cacheKey, {
      embedding: embedding,
      timestamp: Date.now()
    });

    // Cleanup if cache is too large
    if (this.embeddingCache.size > this.config.maxCacheSize) {
      this.cleanupCache(this.embeddingCache);
    }
  }

  /**
   * Gets cached embedding if available
   * @param {string} text - Text to get embedding for
   * @returns {Array|null} Cached embedding or null
   */
  getCachedEmbedding(text) {
    if (!this.config.enableEmbeddingCache) return null;

    const normalizedText = this.normalizeQuery(text);
    const cacheKey = `embedding:${normalizedText}`;
    const cached = this.embeddingCache.get(cacheKey);

    if (cached && this.isCacheValid(cached.timestamp)) {
      this.metrics.cacheHits++;
      return cached.embedding;
    }

    this.metrics.cacheMisses++;
    return null;
  }

  /**
   * Caches RAG response for reuse
   * @param {string} cacheKey - Cache key
   * @param {Object} response - RAG response
   */
  cacheResponse(cacheKey, response) {
    if (!this.config.enableResponseCache) return;

    this.cache.set(cacheKey, {
      response: response,
      timestamp: Date.now()
    });

    // Cleanup if cache is too large
    if (this.cache.size > this.config.maxCacheSize) {
      this.cleanupCache(this.cache);
    }
  }

  /**
   * Gets cached response if available
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} Cached response or null
   */
  getCachedResponse(cacheKey) {
    if (!this.config.enableResponseCache) return null;

    const cached = this.cache.get(cacheKey);

    if (cached && this.isCacheValid(cached.timestamp)) {
      this.metrics.cacheHits++;
      return cached.response;
    }

    this.metrics.cacheMisses++;
    return null;
  }

  /**
   * Generates cache key for query and user preferences
   * @param {string} query - Query text
   * @param {Object} userPrefs - User preferences
   * @returns {string} Cache key
   */
  generateCacheKey(query, userPrefs) {
    const normalizedQuery = this.normalizeQuery(query);
    const prefsHash = this.hashObject(userPrefs);
    return `response:${normalizedQuery}:${prefsHash}`;
  }

  /**
   * Simple hash function for objects
   * @param {Object} obj - Object to hash
   * @returns {string} Hash string
   */
  hashObject(obj) {
    return JSON.stringify(obj).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0).toString();
  }

  /**
   * Checks if cache entry is still valid
   * @param {number} timestamp - Cache timestamp
   * @returns {boolean} Validity flag
   */
  isCacheValid(timestamp) {
    return (Date.now() - timestamp) < this.config.cacheTTL;
  }

  /**
   * Cleans up cache by removing old entries
   * @param {Map} cache - Cache to cleanup
   */
  cleanupCache(cache) {
    const now = Date.now();
    const entriesToDelete = [];

    for (const [key, value] of cache.entries()) {
      if (!this.isCacheValid(value.timestamp)) {
        entriesToDelete.push(key);
      }
    }

    entriesToDelete.forEach(key => cache.delete(key));
    
    logger.info('Cache cleanup completed', {
      deletedEntries: entriesToDelete.length,
      remainingEntries: cache.size
    });
  }

  /**
   * Optimizes retrieval parameters based on query
   * @param {string} query - Query text
   * @param {Object} userPrefs - User preferences
   * @returns {Object} Optimized parameters
   */
  optimizeRetrievalParameters(query, userPrefs) {
    const params = {
      topK: 10,
      similarityThreshold: 0.7,
      useReranking: true,
      rerankingType: 'hybrid'
    };

    // Adjust topK based on query complexity
    const queryLength = query.split(' ').length;
    if (queryLength > 10) {
      params.topK = 15; // More specific query, retrieve more results
    } else if (queryLength < 3) {
      params.topK = 5; // Simple query, fewer results
    }

    // Adjust similarity threshold based on user preferences
    if (userPrefs && userPrefs.interests && userPrefs.interests.length > 2) {
      params.similarityThreshold = 0.8; // More specific preferences, higher threshold
    }

    // Disable reranking for simple queries
    if (queryLength < 3) {
      params.useReranking = false;
    }

    return params;
  }

  /**
   * Monitors and optimizes response time
   * @param {Function} operation - Operation to monitor
   * @param {string} operationName - Name of operation
   * @returns {Promise} Operation result with timing
   */
  async monitorOperation(operation, operationName) {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const endTime = Date.now();
      const duration = endTime - startTime;

      this.metrics.responseTimeImprovements.push({
        operation: operationName,
        duration: duration,
        timestamp: new Date().toISOString()
      });

      logger.info('Operation completed', {
        operation: operationName,
        duration: duration,
        success: true
      });

      return {
        result: result,
        duration: duration,
        success: true
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      logger.error('Operation failed', {
        operation: operationName,
        duration: duration,
        error: error.message
      });

      return {
        result: null,
        duration: duration,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Gets performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    const cacheHitRate = this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0;
    
    const avgResponseTime = this.metrics.responseTimeImprovements.length > 0
      ? this.metrics.responseTimeImprovements.reduce((sum, item) => sum + item.duration, 0) / this.metrics.responseTimeImprovements.length
      : 0;

    return {
      cache: {
        hitRate: cacheHitRate,
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        size: this.cache.size + this.embeddingCache.size
      },
      optimization: {
        queryOptimizations: this.metrics.queryOptimizations,
        avgResponseTime: avgResponseTime,
        totalOperations: this.metrics.responseTimeImprovements.length
      },
      config: this.config
    };
  }

  /**
   * Generates performance optimization report
   * @returns {string} Performance report
   */
  generatePerformanceReport() {
    const metrics = this.getPerformanceMetrics();
    
    let report = '⚡ Performance Optimization Report\n';
    report += '=====================================\n\n';

    report += '📊 Cache Performance:\n';
    report += `- Hit Rate: ${(metrics.cache.hitRate * 100).toFixed(1)}%\n`;
    report += `- Cache Hits: ${metrics.cache.hits}\n`;
    report += `- Cache Misses: ${metrics.cache.misses}\n`;
    report += `- Cache Size: ${metrics.cache.size} entries\n\n`;

    report += '🔧 Optimization Stats:\n';
    report += `- Query Optimizations: ${metrics.optimization.queryOptimizations}\n`;
    report += `- Average Response Time: ${metrics.optimization.avgResponseTime.toFixed(2)}ms\n`;
    report += `- Total Operations: ${metrics.optimization.totalOperations}\n\n`;

    report += '⚙️ Configuration:\n';
    report += `- Embedding Cache: ${metrics.config.enableEmbeddingCache ? 'Enabled' : 'Disabled'}\n`;
    report += `- Response Cache: ${metrics.config.enableResponseCache ? 'Enabled' : 'Disabled'}\n`;
    report += `- Query Optimization: ${metrics.config.enableQueryOptimization ? 'Enabled' : 'Disabled'}\n`;
    report += `- Cache TTL: ${metrics.config.cacheTTL / 1000}s\n`;

    return report;
  }

  /**
   * Updates configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    logger.info('Performance optimizer configuration updated', {
      newConfig: newConfig
    });
  }

  /**
   * Clears all caches
   */
  clearCaches() {
    this.cache.clear();
    this.embeddingCache.clear();
    this.queryCache.clear();
    
    logger.info('All caches cleared');
  }
}

module.exports = PerformanceOptimizer; 