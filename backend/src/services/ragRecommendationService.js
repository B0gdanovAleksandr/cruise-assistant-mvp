const EventRetriever = require('./eventRetriever');
const MockVectorStore = require('./mockVectorStore');
const PromptGenerator = require('./promptGenerator');
const llmClient = require('./llmClient');
const HallucinationDetector = require('./hallucinationDetector');
const MonitoringService = require('./monitoringService');
const AdvancedMetrics = require('./advancedMetrics');
const PerformanceOptimizer = require('./performanceOptimizer');
const AlertingSystem = require('./alertingSystem');
const logger = require('../utils/logger');

class RAGRecommendationService {
  constructor() {
    // Use mock vector store for testing
    const mockVectorStore = new MockVectorStore();
    this.eventRetriever = new EventRetriever(mockVectorStore);
    this.promptGenerator = new PromptGenerator();
    this.hallucinationDetector = new HallucinationDetector();
    
    // Phase 3: Production Optimization components
    this.monitoringService = new MonitoringService();
    this.advancedMetrics = new AdvancedMetrics();
    this.performanceOptimizer = new PerformanceOptimizer();
    this.alertingSystem = new AlertingSystem();
  }

  /**
   * Generates RAG-based recommendations using GPT-4
   * @param {Object} userPrefs - user preferences
   * @param {Array} userPrefs.interests - array of user interests
   * @param {string} userPrefs.location - user location/cruise region
   * @param {Object} options - additional options
   * @returns {Object} recommendation response
   */
  async generateRecommendations(userPrefs, options = {}) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting RAG recommendation generation', { userPrefs });

      // Validate user preferences
      if (!userPrefs || !userPrefs.interests) {
        throw new Error('User preferences must include interests');
      }

      const {
        topK = 5,
        minAffinity = 0.4,
        promptType = 'standard',
        maxTokens = 1000
      } = options;

      // Phase 3: Performance optimization - Query optimization
      const query = userPrefs.interests.join(' ');
      const optimizedQuery = this.performanceOptimizer.optimizeQuery(query, userPrefs);
      const optimizedParams = this.performanceOptimizer.optimizeRetrievalParameters(query, userPrefs);
      
      // Check cache for existing response
      const cacheKey = this.performanceOptimizer.generateCacheKey(query, userPrefs);
      const cachedResponse = this.performanceOptimizer.getCachedResponse(cacheKey);
      
      if (cachedResponse) {
        logger.info('Returning cached response');
        return {
          ...cachedResponse,
          cached: true,
          responseTime: Date.now() - startTime
        };
      }

      // 1. Retrieve relevant events with optimized parameters
      logger.info('Retrieving relevant events with optimized parameters');
      const retrievalStartTime = Date.now();
      
      const retrievedEvents = await this.performanceOptimizer.monitorOperation(
        () => this.eventRetriever.retrieveRelevantEventsWithMinAffinity(
          userPrefs, 
          optimizedParams.similarityThreshold || minAffinity, 
          optimizedParams.topK || topK
        ),
        'event_retrieval'
      );

      // Handle both mock and real vector store responses
      let events, retrievalTime;
      if (Array.isArray(retrievedEvents)) {
        // Mock vector store returns array directly
        events = retrievedEvents;
        retrievalTime = Date.now() - startTime;
      } else {
        // Real vector store returns object with success/result
        if (!retrievedEvents.success) {
          throw new Error(`Event retrieval failed: ${retrievedEvents.error}`);
        }
        events = retrievedEvents.result;
        retrievalTime = retrievedEvents.duration;
      }

      if (events.length === 0) {
        logger.warn('No relevant events found for user preferences');
        return {
          success: false,
          error: 'No relevant events found for the given preferences',
          userPrefs,
          recommendations: [],
          aiInsights: [],
          ragSources: [],
          timestamp: new Date().toISOString()
        };
      }

      // 2. Generate prompt
      logger.info('Generating prompt for GPT-4');
      const prompt = this.promptGenerator.generateRecommendationPrompt(events, userPrefs);
      const estimatedTokens = this.promptGenerator.estimateTokens(prompt);

      // 3. Call GPT-4 with monitoring
      logger.info('Calling GPT-4 for recommendations');
      const gptResponse = await this.performanceOptimizer.monitorOperation(
        () => this.callGPT4(prompt, maxTokens),
        'gpt_generation'
      );

      if (!gptResponse.success) {
        throw new Error(`GPT generation failed: ${gptResponse.error}`);
      }

      const gptResult = gptResponse.result;
      const generationTime = gptResponse.duration;

      // 4. Parse GPT response
      logger.info('Parsing GPT-4 response');
      const parsedResponse = this.parseGPTResponse(gptResult, events);

      // 5. Validate response for hallucinations
      logger.info('Validating response for hallucinations');
      const validation = await this.performanceOptimizer.monitorOperation(
        () => this.hallucinationDetector.validateResponse(parsedResponse, events),
        'hallucination_validation'
      );

      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.error}`);
      }

      const validationResult = validation.result;
      const validationTime = validation.duration;

      // 6. Phase 3: Advanced metrics calculation
      const advancedMetrics = this.advancedMetrics.evaluateRAGResponse({
        retrievedEvents: events,
        recommendations: parsedResponse.recommendations,
        validation: validationResult,
        responseTime: Date.now() - startTime
      }, events, userPrefs.history || []);

      // 7. Phase 3: Monitoring and alerting
      const totalResponseTime = Date.now() - startTime;
      
      // Record metrics for monitoring
      this.monitoringService.recordRetrievalMetrics({
        precision: advancedMetrics.retrieval.precisionAt5,
        recall: advancedMetrics.retrieval.recallAt5,
        responseTime: retrievalTime,
        query: optimizedQuery.optimizedQuery,
        userPrefs: userPrefs
      });

      this.monitoringService.recordGenerationMetrics({
        faithfulness: validationResult.overall,
        relevance: advancedMetrics.generation.relevance,
        hallucinationRate: validationResult.hallucination.hallucination_score,
        responseTime: generationTime,
        response: parsedResponse,
        retrievedEvents: events
      });

      this.monitoringService.recordSystemMetrics({
        apiLatency: totalResponseTime,
        throughput: 1,
        costPerRequest: 0.01 // Mock cost
      });

      // Check for alerts
      const performanceAlerts = this.alertingSystem.checkPerformanceAlerts({
        responseTime: totalResponseTime,
        errorRate: 0,
        apiLatency: totalResponseTime
      });

      const qualityAlerts = this.alertingSystem.checkQualityAlerts({
        precision: advancedMetrics.retrieval.precisionAt5,
        recall: advancedMetrics.retrieval.recallAt5,
        faithfulness: validationResult.overall,
        hallucinationRate: validationResult.hallucination.hallucination_score
      });

      const cacheAlerts = this.alertingSystem.checkCacheAlerts({
        cacheHitRate: this.performanceOptimizer.getPerformanceMetrics().cache.hitRate
      });

      // Process all alerts
      const allAlerts = [...performanceAlerts, ...qualityAlerts, ...cacheAlerts];
      this.alertingSystem.processAlerts(allAlerts);

      // 8. Cache the response
      this.performanceOptimizer.cacheResponse(cacheKey, {
        success: true,
        userPrefs,
        retrievedEvents: events.map(event => ({
          id: event.id,
          title: event.title,
          type: event.type,
          score: event.score,
          experienceAffinity: event.experienceAffinity
        })),
        prompt: {
          type: promptType,
          content: prompt,
          estimatedTokens,
          maxTokens: this.promptGenerator.maxTokens
        },
        recommendations: parsedResponse.recommendations,
        aiInsights: parsedResponse.aiInsights,
        ragSources: parsedResponse.ragSources,
        validation: {
          overall_score: validationResult.overall,
          citation_coverage: validationResult.citations.coverage,
          claim_support_rate: validationResult.claims.supportRate,
          hallucination_score: validationResult.hallucination.hallucination_score,
          faithfulness_score: validationResult.hallucination.faithfulness_score,
          quality_passes: this.hallucinationDetector.checkQualityThresholds(validationResult)
        },
        count: events.length,
        minAffinity,
        advancedMetrics: advancedMetrics,
        performanceMetrics: {
          retrievalTime: retrievalTime,
          generationTime: generationTime,
          validationTime: validationTime,
          totalResponseTime: totalResponseTime,
          queryOptimization: optimizedQuery.optimizationTime
        }
      });

      // 9. Prepare final response
      const response = {
        success: true,
        userPrefs,
        retrievedEvents: events.map(event => ({
          id: event.id,
          title: event.title,
          type: event.type,
          score: event.score,
          experienceAffinity: event.experienceAffinity
        })),
        prompt: {
          type: promptType,
          content: prompt,
          estimatedTokens,
          maxTokens: this.promptGenerator.maxTokens
        },
        recommendations: parsedResponse.recommendations,
        aiInsights: parsedResponse.aiInsights,
        ragSources: parsedResponse.ragSources,
        validation: {
          overall_score: validationResult.overall,
          citation_coverage: validationResult.citations.coverage,
          claim_support_rate: validationResult.claims.supportRate,
          hallucination_score: validationResult.hallucination.hallucination_score,
          faithfulness_score: validationResult.hallucination.faithfulness_score,
          quality_passes: this.hallucinationDetector.checkQualityThresholds(validationResult)
        },
        count: events.length,
        minAffinity,
        // Phase 3: Advanced metrics
        advancedMetrics: advancedMetrics,
        performanceMetrics: {
          retrievalTime: retrievalTime,
          generationTime: generationTime,
          validationTime: validationTime,
          totalResponseTime: totalResponseTime,
          queryOptimization: optimizedQuery.optimizationTime
        },
        // Phase 3: Optimization info
        optimization: {
          originalQuery: optimizedQuery.originalQuery,
          optimizedQuery: optimizedQuery.optimizedQuery,
          optimizationTime: optimizedQuery.optimizationTime,
          cacheHit: false
        },
        // Phase 3: Alerts
        alerts: allAlerts.length > 0 ? allAlerts.map(alert => ({
          type: alert.type,
          severity: alert.severity,
          message: alert.message
        })) : [],
        timestamp: new Date().toISOString()
      };

      logger.info('RAG recommendation generation completed successfully', {
        recommendationsCount: response.recommendations.length,
        ragSourcesCount: response.ragSources.length
      });

      return response;

    } catch (error) {
      logger.error('Error generating RAG recommendations:', error);
      throw error;
    }
  }

  /**
   * Calls GPT-4 with the generated prompt
   * @param {string} prompt - generated prompt
   * @param {number} maxTokens - maximum tokens for response
   * @returns {string} GPT-4 response
   */
  async callGPT4(prompt, maxTokens = 1000) {
    try {
      const systemPrompt = `You are a cruise assistant expert. Generate personalized recommendations based on the provided events and user preferences. 

Your response must be in the following JSON format:
{
  "recommendations": [
    {
      "id": "rec_1",
      "title": "Recommendation title",
      "description": "Detailed recommendation description",
      "timing": "Best time to experience this",
      "originEventId": "event_001",
      "personalizedAdvice": "Specific advice for this user"
    }
  ],
  "aiInsights": [
    {
      "id": "insight_1",
      "type": "timing|location|combination|personal",
      "title": "Insight title",
      "description": "Insight description",
      "relevance": "high|medium|low"
    }
  ]
}

Important:
- Each recommendation must reference an originEventId from the provided events
- Provide specific timing suggestions
- Include personalized advice based on user interests
- Generate relevant insights about timing, location, or combinations
- Keep recommendations practical and actionable`;

      const response = await llmClient.generateResponse({
        systemPrompt,
        userPrompt: prompt,
        maxTokens,
        temperature: 0.7
      });

      return response;

    } catch (error) {
      logger.error('Error calling GPT-4:', error);
      throw new Error(`Failed to generate recommendations: ${error.message}`);
    }
  }

  /**
   * Parses GPT-4 response and extracts recommendations, insights, and RAG sources
   * @param {string} gptResponse - raw GPT-4 response
   * @param {Array} retrievedEvents - original retrieved events
   * @returns {Object} parsed response with recommendations, insights, and RAG sources
   */
  parseGPTResponse(gptResponse, retrievedEvents) {
    try {
      // Try to parse JSON response
      let parsedData;
      try {
        parsedData = JSON.parse(gptResponse);
      } catch (parseError) {
        logger.warn('Failed to parse GPT response as JSON, attempting to extract JSON');
        parsedData = this.extractJSONFromResponse(gptResponse);
      }

      // Validate and normalize recommendations
      const recommendations = this.normalizeRecommendations(
        parsedData.recommendations || [], 
        retrievedEvents
      );

      // Validate and normalize insights
      const aiInsights = this.normalizeInsights(parsedData.aiInsights || []);

      // Extract RAG sources from recommendations
      const ragSources = this.extractRAGSources(recommendations, retrievedEvents);

      return {
        recommendations,
        aiInsights,
        ragSources
      };

    } catch (error) {
      logger.error('Error parsing GPT response:', error);
      
      // Return fallback response
      return {
        recommendations: [],
        aiInsights: [],
        ragSources: []
      };
    }
  }

  /**
   * Extracts JSON from GPT response if it's not pure JSON
   * @param {string} response - GPT response
   * @returns {Object} extracted JSON data
   */
  extractJSONFromResponse(response) {
    try {
      // Try to find JSON block in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, create a basic structure
      return {
        recommendations: [],
        aiInsights: []
      };
    } catch (error) {
      logger.warn('Failed to extract JSON from response:', error);
      return {
        recommendations: [],
        aiInsights: []
      };
    }
  }

  /**
   * Normalizes recommendations to ensure proper structure
   * @param {Array} recommendations - raw recommendations from GPT
   * @param {Array} retrievedEvents - original events for validation
   * @returns {Array} normalized recommendations
   */
  normalizeRecommendations(recommendations, retrievedEvents) {
    const eventIds = new Set(retrievedEvents.map(event => event.id));
    
    return recommendations
      .filter(rec => rec && typeof rec === 'object')
      .map((rec, index) => ({
        id: rec.id || `rec_${index + 1}`,
        title: rec.title || 'Personalized Recommendation',
        description: rec.description || 'A personalized recommendation based on your preferences',
        timing: rec.timing || 'Flexible timing available',
        originEventId: eventIds.has(rec.originEventId) ? rec.originEventId : null,
        personalizedAdvice: rec.personalizedAdvice || 'Consider this experience based on your interests',
        confidence: rec.confidence || 'high'
      }))
      .filter(rec => rec.originEventId !== null); // Only include recommendations with valid origin events
  }

  /**
   * Normalizes AI insights to ensure proper structure
   * @param {Array} insights - raw insights from GPT
   * @returns {Array} normalized insights
   */
  normalizeInsights(insights) {
    return insights
      .filter(insight => insight && typeof insight === 'object')
      .map((insight, index) => ({
        id: insight.id || `insight_${index + 1}`,
        type: ['timing', 'location', 'combination', 'personal'].includes(insight.type) 
          ? insight.type 
          : 'general',
        title: insight.title || 'AI Insight',
        description: insight.description || 'An AI-generated insight for your cruise experience',
        relevance: ['high', 'medium', 'low'].includes(insight.relevance) 
          ? insight.relevance 
          : 'medium'
      }));
  }

  /**
   * Extracts RAG sources from recommendations and retrieved events
   * @param {Array} recommendations - normalized recommendations
   * @param {Array} retrievedEvents - original retrieved events
   * @returns {Array} RAG sources with event details
   */
  extractRAGSources(recommendations, retrievedEvents) {
    const eventMap = new Map(retrievedEvents.map(event => [event.id, event]));
    const usedEventIds = new Set(recommendations.map(rec => rec.originEventId).filter(Boolean));
    
    return Array.from(usedEventIds)
      .map(eventId => {
        const event = eventMap.get(eventId);
        if (!event) return null;
        
        return {
          id: event.id,
          title: event.title,
          type: event.type,
          experienceAffinity: event.experienceAffinity,
          score: event.score,
          tags: event.tags || []
        };
      })
      .filter(Boolean);
  }

  /**
   * Validates the final response structure
   * @param {Object} response - final response object
   * @returns {boolean} validation result
   */
  validateResponse(response) {
    try {
      // Check required fields
      if (!response.success || !response.recommendations || !response.ragSources) {
        return false;
      }

      // Validate recommendations structure
      const validRecommendations = response.recommendations.every(rec => 
        rec.id && rec.title && rec.originEventId
      );

      // Validate RAG sources structure
      const validRAGSources = response.ragSources.every(source => 
        source.id && source.title && source.type
      );

      return validRecommendations && validRAGSources;

    } catch (error) {
      logger.error('Response validation error:', error);
      return false;
    }
  }
}

module.exports = RAGRecommendationService; 