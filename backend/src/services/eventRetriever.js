const { PineconeStore } = require('./vectorStore');
const MockVectorStore = require('./mockVectorStore');
const Reranker = require('./reranker');
const logger = require('../utils/logger');

class EventRetriever {
  constructor(vectorStore = null) {
    // Use mock vector store for testing if Pinecone is not configured
    const useMock = process.env.USE_MOCK_VECTOR_STORE === 'true' || !process.env.PINECONE_API_KEY;
    this.vectorStore = vectorStore || (useMock ? new MockVectorStore() : new PineconeStore());
    this.reranker = new Reranker();
    this.useReranking = process.env.USE_RERANKING === 'true';
    this.rerankingType = process.env.RERANKING_TYPE || 'hybrid'; // 'llm', 'hybrid', 'diverse'
  }

  /**
   * Retrieves relevant events based on user preferences with optional reranking
   * @param {Object} userPrefs - user preferences object
   * @param {Array} userPrefs.interests - array of user interests
   * @param {string} userPrefs.location - user location/cruise region
   * @param {number} topK - number of events to retrieve (default: 5)
   * @returns {Array} array of relevant events with scores
   */
  async retrieveRelevantEvents(userPrefs, topK = 5) {
    try {
      if (!userPrefs || !userPrefs.interests) {
        throw new Error('User preferences must include interests');
      }

      // Create search query from user preferences
      const searchQuery = this.buildSearchQuery(userPrefs);
      
      logger.info(`Retrieving events for query: "${searchQuery}" with topK: ${topK}`);

      // Search for relevant events (get more for reranking)
      const initialTopK = this.useReranking ? Math.min(topK * 3, 20) : topK;
      
      let searchResults;
      if (this.vectorStore.constructor.name === 'MockVectorStore') {
        // Use direct search for mock vector store
        searchResults = await this.vectorStore.search(searchQuery, { topK: initialTopK });
      } else {
        // Use embedding-based search for real vector store
        const embedding = await this.vectorStore.generateEmbedding(searchQuery);
        searchResults = await this.vectorStore.query(embedding, initialTopK);
      }
      
      // Transform and validate results
      const relevantEvents = this.transformAndValidateResults(searchResults);
      
      logger.info(`Retrieved ${relevantEvents.length} relevant events`);
      
      // Apply reranking if enabled
      if (this.useReranking && relevantEvents.length > 0) {
        const rerankedEvents = await this.applyReranking(relevantEvents, userPrefs, topK);
        logger.info(`Reranking applied. Top result score: ${rerankedEvents[0]?.score?.toFixed(3)}`);
        return rerankedEvents;
      }
      
      return relevantEvents.slice(0, topK);
    } catch (error) {
      logger.error('Error retrieving relevant events:', error);
      throw error;
    }
  }

  /**
   * Applies reranking to search results
   * @param {Array} events - Initial search results
   * @param {Object} userPrefs - User preferences
   * @param {number} topK - Number of results to return
   * @returns {Array} Reranked events
   */
  async applyReranking(events, userPrefs, topK) {
    try {
      switch (this.rerankingType) {
        case 'llm':
          return await this.reranker.rerankResults(events, userPrefs, topK);
        case 'hybrid':
          return await this.reranker.hybridRerank(events, userPrefs, topK);
        case 'diverse':
          return await this.reranker.diverseRerank(events, userPrefs, topK);
        default:
          return await this.reranker.hybridRerank(events, userPrefs, topK);
      }
    } catch (error) {
      logger.error('Error applying reranking:', error);
      return events.slice(0, topK);
    }
  }

  /**
   * Builds search query from user preferences
   * @param {Object} userPrefs - user preferences
   * @returns {string} search query
   */
  buildSearchQuery(userPrefs) {
    const { interests, location } = userPrefs;
    
    // Combine interests and location into a search query
    const interestsText = Array.isArray(interests) ? interests.join(' ') : interests;
    const locationText = location || '';
    
    // Create a comprehensive search query
    const searchQuery = `${interestsText} ${locationText}`.trim();
    
    return searchQuery;
  }

  /**
   * Transforms and validates search results with chunk deduplication
   * @param {Array} searchResults - raw search results from vector store
   * @returns {Array} validated and transformed events
   */
  transformAndValidateResults(searchResults) {
    if (!Array.isArray(searchResults)) {
      throw new Error('Search results must be an array');
    }

    // Group results by original event ID to deduplicate chunks
    const eventGroups = new Map();
    
    searchResults.forEach(result => {
      if (!result.metadata) {
        logger.warn(`Skipping result with missing metadata: ${result.id}`);
        return;
      }

      // Handle both chunked and non-chunked results
      const originalEventId = result.metadata.originalEventId || result.metadata.id;
      
      if (!eventGroups.has(originalEventId)) {
        eventGroups.set(originalEventId, {
          id: originalEventId,
          title: result.metadata.title,
          description: result.metadata.description,
          type: result.metadata.type,
          experienceAffinity: result.metadata.experienceAffinity,
          tags: result.metadata.tags,
          chunks: [],
          bestScore: 0,
          metadata: result.metadata
        });
      }

      const event = eventGroups.get(originalEventId);
      event.chunks.push({
        id: result.id,
        text: result.metadata.text || result.metadata.description,
        score: result.score,
        chunkIndex: result.metadata.chunkIndex,
        chunkType: result.metadata.chunkType
      });

      // Update best score
      if (result.score > event.bestScore) {
        event.bestScore = result.score;
      }
    });

    // Convert to array and sort by best score
    const events = Array.from(eventGroups.values())
      .filter(event => {
        // Validate required fields
        const hasRequiredFields = event.title && 
          event.experienceAffinity && 
          event.tags;
        
        if (!hasRequiredFields) {
          logger.warn(`Skipping event with missing required fields: ${event.id}`);
          return false;
        }
        
        return true;
      })
      .map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        type: event.type,
        experienceAffinity: event.experienceAffinity,
        tags: event.tags,
        score: event.bestScore,
        chunks: event.chunks,
        chunkCount: event.chunks.length,
        metadata: event.metadata
      }))
      .sort((a, b) => b.score - a.score);

    logger.info(`Deduplicated ${searchResults.length} chunks into ${events.length} unique events`);
    return events;
  }

  /**
   * Retrieves events with minimum affinity score
   * @param {Object} userPrefs - user preferences
   * @param {number} minAffinity - minimum affinity score (default: 0.4)
   * @param {number} topK - number of events to retrieve (default: 5)
   * @returns {Array} filtered events with minimum affinity
   */
  async retrieveRelevantEventsWithMinAffinity(userPrefs, minAffinity = 0.4, topK = 5) {
    try {
      const allEvents = await this.retrieveRelevantEvents(userPrefs, topK * 2); // Get more to filter
      
      // Filter events with minimum affinity score
      const filteredEvents = allEvents.filter(event => event.score >= minAffinity);
      
      // Return top K events after filtering
      return filteredEvents.slice(0, topK);
    } catch (error) {
      logger.error('Error retrieving events with minimum affinity:', error);
      throw error;
    }
  }

  /**
   * Retrieves events by specific interests and location
   * @param {Array} interests - array of interests
   * @param {string} location - location/cruise region
   * @param {number} topK - number of events to retrieve
   * @returns {Array} relevant events
   */
  async retrieveByInterestsAndLocation(interests, location, topK = 5) {
    const userPrefs = {
      interests: interests,
      location: location
    };
    
    return await this.retrieveRelevantEvents(userPrefs, topK);
  }
}

module.exports = EventRetriever; 