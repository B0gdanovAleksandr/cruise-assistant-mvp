const fs = require('fs').promises;
const path = require('path');
const { PineconeStore } = require('./vectorStore');
const logger = require('../utils/logger');

class EventIndexer {
  constructor(vectorStore = null) {
    this.vectorStore = vectorStore || new PineconeStore();
    this.chunkSize = 512; // Оптимальный размер чанка
    this.chunkOverlap = 50; // ~20 tokens overlap
    this.useSemanticChunking = true; // Использовать семантическое разбиение
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
   * Indexes events in vector database with chunking strategy
   * @param {Array} events - array of events to index
   * @returns {Object} indexing result
   */
  async indexEvents(events) {
    logger.info(`Indexing ${events.length} events with chunking strategy`);
    
    try {
      const allChunks = [];
      
      for (const event of events) {
        const chunks = this.createChunks(event);
        allChunks.push(...chunks);
      }

      // Batch upsert chunks for better performance
      await this.vectorStore.upsertChunks(allChunks);
      
      logger.info(`Successfully indexed ${events.length} events into ${allChunks.length} chunks`);
      
      // Log chunking statistics
      this.logChunkingStats(events, allChunks);
      
      return {
        status: 'OK',
        eventsCount: events.length,
        chunksCount: allChunks.length,
        avgChunksPerEvent: (allChunks.length / events.length).toFixed(2)
      };
    } catch (error) {
      logger.error('Error indexing events:', error);
      throw error;
    }
  }

  createChunks(event) {
    const fullText = `${event.title} ${event.description} ${event.tags.join(' ')}`;
    
    if (this.useSemanticChunking) {
      return this.createSemanticChunks(fullText, event);
    } else {
      return this.createOverlappingChunks(fullText, event);
    }
  }

  createSemanticChunks(text, event) {
    // Разбиваем по предложениям и семантическим границам
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > this.chunkSize) {
        if (currentChunk.trim()) {
          chunks.push({
            id: `${event.id}_chunk_${chunkIndex}`,
            text: currentChunk.trim(),
            metadata: {
              originalEventId: event.id,
              chunkIndex: chunkIndex,
              totalChunks: Math.ceil(sentences.length / 2),
              type: event.type,
              title: event.title,
              tags: event.tags,
              experienceAffinity: event.experienceAffinity,
              chunkType: 'semantic'
            }
          });
          chunkIndex++;
        }
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    // Добавляем последний чанк
    if (currentChunk.trim()) {
      chunks.push({
        id: `${event.id}_chunk_${chunkIndex}`,
        text: currentChunk.trim(),
        metadata: {
          originalEventId: event.id,
          chunkIndex: chunkIndex,
          totalChunks: chunkIndex + 1,
          type: event.type,
          title: event.title,
          tags: event.tags,
          experienceAffinity: event.experienceAffinity,
          chunkType: 'semantic'
        }
      });
    }

    return chunks;
  }

  createOverlappingChunks(text, event) {
    const words = text.split(' ');
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
          experienceAffinity: event.experienceAffinity,
          chunkType: 'overlapping'
        }
      });
    }

    return chunks;
  }

  logChunkingStats(events, chunks) {
    const avgChunksPerEvent = chunks.length / events.length;
    const avgChunkSize = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0) / chunks.length;
    
    logger.info('Chunking Statistics:', {
      totalEvents: events.length,
      totalChunks: chunks.length,
      avgChunksPerEvent: avgChunksPerEvent.toFixed(2),
      avgChunkSize: Math.round(avgChunkSize),
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
      semanticChunking: this.useSemanticChunking
    });
  }

  /**
   * Complete loading and indexing of events
   * @param {string} filePath - path to events.json file
   * @returns {Object} operation result
   */
  async loadAndIndex(filePath = null) {
    try {
      const events = await this.loadEvents(filePath);
      const result = await this.indexEvents(events);
      
      return {
        status: 'OK',
        loadedCount: events.length,
        indexedCount: result.upsertedCount,
        message: `Successfully loaded and indexed ${events.length} events`
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
      
      return results.map(match => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata
      }));
    } catch (error) {
      logger.error('Error searching events:', error);
      throw error;
    }
  }
}

module.exports = EventIndexer; 