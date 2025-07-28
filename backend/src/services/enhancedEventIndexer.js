const fs = require('fs').promises;
const path = require('path');
const { EnhancedPineconeStore } = require('./enhancedVectorStore');
const logger = require('../utils/logger');

class EnhancedEventIndexer {
  constructor(vectorStore = null) {
    this.vectorStore = vectorStore || new EnhancedPineconeStore();
    this.chunkSize = 512; // Оптимальный размер чанка
    this.chunkOverlap = 50; // ~20 tokens overlap
  }

  /**
   * Loads events from JSON file
   * @param {string} filePath - path to events.json file
   * @returns {Array} array of events
   */
  async loadEvents(filePath = null) {
    try {
      const defaultPath = path.join(__dirname, '../mock/events.json');
      const eventsPath = filePath || defaultPath;
      
      const data = await fs.readFile(eventsPath, 'utf8');
      const events = JSON.parse(data);
      
      // Validate event structure
      this.validateEvents(events);
      
      logger.info(`Loaded ${events.length} events from ${eventsPath}`);
      return events;
    } catch (error) {
      logger.error('Error loading events:', error);
      throw error;
    }
  }

  /**
   * Validates event structure
   * @param {Array} events - array of events
   */
  validateEvents(events) {
    if (!Array.isArray(events)) {
      throw new Error('Events must be an array');
    }

    const requiredFields = ['id', 'type', 'title', 'description', 'tags', 'experienceAffinity'];
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      for (const field of requiredFields) {
        if (!(field in event)) {
          throw new Error(`Event at index ${i} is missing required field: ${field}`);
        }
      }

      // Check that tags is an array
      if (!Array.isArray(event.tags)) {
        throw new Error(`Event ${event.id} tags field must be an array`);
      }

      // Check that id is unique
      const duplicateId = events.findIndex((e, index) => 
        index !== i && e.id === event.id
      );
      if (duplicateId !== -1) {
        throw new Error(`Duplicate event ID found: ${event.id}`);
      }
    }
  }

  /**
   * Creates chunks from event text
   * @param {Object} event - event object
   * @returns {Array} array of chunks
   */
  createChunks(event) {
    const fullText = `${event.title} ${event.description} ${event.tags.join(' ')}`;
    const words = fullText.split(' ');
    const chunks = [];
    
    for (let i = 0; i < words.length; i += this.chunkSize - this.chunkOverlap) {
      const chunkWords = words.slice(i, i + this.chunkSize);
      const chunkText = chunkWords.join(' ');
      
      chunks.push({
        id: `${event.id}_chunk_${Math.floor(i / (this.chunkSize - this.chunkOverlap))}`,
        text: chunkText,
        metadata: {
          originalEventId: event.id,
          chunkIndex: Math.floor(i / (this.chunkSize - this.chunkOverlap)),
          totalChunks: Math.ceil(words.length / (this.chunkSize - this.chunkOverlap)),
          type: event.type,
          title: event.title,
          tags: event.tags,
          experienceAffinity: event.experienceAffinity
        }
      });
    }
    
    logger.info(`Created ${chunks.length} chunks for event ${event.id}`, {
      originalTextLength: fullText.length,
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
      totalChunks: chunks.length
    });
    
    return chunks;
  }

  /**
   * Indexes events with chunking strategy
   * @param {Array} events - array of events to index
   * @returns {Object} indexing result
   */
  async indexEvents(events) {
    try {
      logger.info(`Starting enhanced indexing of ${events.length} events with chunking`);
      
      const allChunks = [];
      
      for (const event of events) {
        const chunks = this.createChunks(event);
        allChunks.push(...chunks);
      }
      
      const result = await this.vectorStore.upsertChunks(allChunks);
      
      logger.info(`Successfully indexed ${result.upsertedCount} chunks from ${events.length} events`, {
        averageChunksPerEvent: allChunks.length / events.length,
        chunkSize: this.chunkSize,
        chunkOverlap: this.chunkOverlap,
        embeddingModel: result.embeddingModel,
        dimensions: result.dimensions
      });
      
      return result;
    } catch (error) {
      logger.error('Error indexing events:', error);
      throw error;
    }
  }

  /**
   * Indexes events without chunking (legacy method)
   * @param {Array} events - array of events to index
   * @returns {Object} indexing result
   */
  async indexEventsLegacy(events) {
    try {
      logger.info(`Starting legacy indexing of ${events.length} events (no chunking)`);
      
      const result = await this.vectorStore.upsert(events);
      
      logger.info(`Successfully indexed ${result.upsertedCount} events (legacy mode)`);
      return result;
    } catch (error) {
      logger.error('Error indexing events (legacy):', error);
      throw error;
    }
  }

  /**
   * Complete loading and indexing of events
   * @param {string} filePath - path to events.json file
   * @param {Object} options - indexing options
   * @returns {Object} operation result
   */
  async loadAndIndex(filePath = null, options = {}) {
    try {
      const { useChunking = true } = options;
      
      const events = await this.loadEvents(filePath);
      const result = useChunking 
        ? await this.indexEvents(events)
        : await this.indexEventsLegacy(events);
      
      return {
        status: 'OK',
        loadedCount: events.length,
        indexedCount: result.upsertedCount,
        useChunking,
        chunkSize: useChunking ? this.chunkSize : null,
        chunkOverlap: useChunking ? this.chunkOverlap : null,
        embeddingModel: result.embeddingModel,
        dimensions: result.dimensions,
        message: `Successfully loaded and indexed ${events.length} events${useChunking ? ' with chunking' : ''}`
      };
    } catch (error) {
      logger.error('Error in loadAndIndex:', error);
      return {
        status: 'ERROR',
        error: error.message,
        message: 'Failed to load and index events'
      };
    }
  }

  /**
   * Search for similar events by text query
   * @param {string} query - text query
   * @param {number} topK - number of results
   * @returns {Array} found events
   */
  async searchEvents(query, topK = 5) {
    try {
      const embedding = await this.vectorStore.generateEmbedding(query);
      const results = await this.vectorStore.query(embedding, topK);
      
      // Group results by original event ID and deduplicate
      const eventMap = new Map();
      
      results.forEach(match => {
        const originalEventId = match.metadata.originalEventId || match.id;
        
        if (!eventMap.has(originalEventId)) {
          eventMap.set(originalEventId, {
            id: originalEventId,
            score: match.score,
            metadata: {
              ...match.metadata,
              chunkCount: 0,
              bestChunkScore: match.score
            }
          });
        } else {
          const existing = eventMap.get(originalEventId);
          existing.chunkCount++;
          existing.bestChunkScore = Math.max(existing.bestChunkScore, match.score);
          // Update score to average of all chunks
          existing.score = (existing.score + match.score) / 2;
        }
      });
      
      const deduplicatedResults = Array.from(eventMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
      
      logger.info(`Search completed: ${results.length} chunks found, ${deduplicatedResults.length} unique events returned`);
      
      return deduplicatedResults.map(result => ({
        id: result.id,
        score: result.score,
        metadata: result.metadata
      }));
    } catch (error) {
      logger.error('Error searching events:', error);
      throw error;
    }
  }

  /**
   * Get chunking statistics
   * @param {Array} events - array of events
   * @returns {Object} chunking statistics
   */
  getChunkingStats(events) {
    const stats = {
      totalEvents: events.length,
      totalChunks: 0,
      averageChunksPerEvent: 0,
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
      overlapPercentage: (this.chunkOverlap / this.chunkSize) * 100
    };
    
    events.forEach(event => {
      const fullText = `${event.title} ${event.description} ${event.tags.join(' ')}`;
      const words = fullText.split(' ');
      const chunks = Math.ceil(words.length / (this.chunkSize - this.chunkOverlap));
      stats.totalChunks += chunks;
    });
    
    stats.averageChunksPerEvent = stats.totalChunks / stats.totalEvents;
    
    return stats;
  }
}

module.exports = EnhancedEventIndexer; 