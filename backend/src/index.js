// Load .env FIRST before any other imports
const path = require('path');
const dotenv = require('dotenv');
const envPath = path.join(__dirname, '../../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Debug environment variables
console.log('Environment variables loaded:', {
  QLOO_API_KEY: process.env.QLOO_API_KEY ? `${process.env.QLOO_API_KEY.substring(0, 10)}...` : 'NOT_SET',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...` : 'NOT_SET',
  NODE_ENV: process.env.NODE_ENV
});

// Now import other modules AFTER .env is loaded
const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const qlooClient = require('./services/qlooClient').instance;
const llmClient = require('./services/llmClient');
const entityResolver = require('./services/entityResolver');
const RecommendationGenerator = require('./services/recommendationGenerator');
const InsightsAggregator = require('./services/insightsAggregator');
const EventIndexer = require('./services/eventIndexer');
const EventRetriever = require('./services/eventRetriever');
const PromptGenerator = require('./services/promptGenerator');
const RAGRecommendationService = require('./services/ragRecommendationService');
const TestRAGEndpoint = require('./testRAGEndpoint');
const mockData = require('./mock/qlooMock.json');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Cruise Assistant API',
    version: '3.3.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /health',
      promptInjection: 'POST /test-prompt-injection',
      apiStatus: 'GET /api-status',
      qlooTest: 'GET /test-qloo',
      eventsIndex: 'POST /events/index',
      eventsSearch: 'POST /events/search',
      eventsRetrieve: 'POST /events/retrieve',
      eventsStatus: 'GET /events/status',
      promptsGenerate: 'POST /prompts/generate',
      recommendRAG: 'POST /recommendRAG'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Status check
app.get('/api-status', async (req, res) => {
  try {
    logger.info('API status check requested');
    
    // Check Qloo API status
    const qlooStatus = await qlooClient.healthCheck();
    
    // Check OpenAI API status (simple check)
    const openaiStatus = {
      status: process.env.OPENAI_API_KEY ? 'configured' : 'not-configured',
      message: process.env.OPENAI_API_KEY ? 'OpenAI API key is configured' : 'OpenAI API key not provided'
    };

    const overallStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      apis: {
        qloo: qlooStatus,
        openai: openaiStatus
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: PORT,
        logLevel: process.env.LOG_LEVEL || 'info'
      }
    };

    res.json(overallStatus);
  } catch (error) {
    logger.error('API status check failed', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to check API status',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test Qloo API endpoints
app.get('/test-qloo', async (req, res) => {
  try {
    logger.info('Testing Qloo API endpoints');
    
    const testResults = await qlooClient.testEndpoints();
    
    res.json({
      success: true,
      results: testResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Qloo API test failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test Enhanced Prompt Injection
app.post('/test-prompt-injection', async (req, res) => {
  try {
    const { interests } = req.body;
    
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Interests array is required'
      });
    }
    
    logger.info('Testing enhanced prompt injection', { interests });
    
    // Step 1: Search for entities
    const entityIds = await qlooClient.searchEntities(interests);
    
    // Step 2: Get insights
    const insightsResult = await qlooClient.getInsights(entityIds);
    
    // Step 3: Aggregate insights
    const insightsAggregator = new InsightsAggregator();
    const aggregatedInsights = insightsAggregator.aggregateInsights(insightsResult.insights || []);
    
    // Step 4: Get recommendations
    const qlooRecommendations = await qlooClient.getRecommendations(entityIds);
    
    // Step 5: Enhance recommendations
    const enhancedRecommendations = insightsAggregator.enhanceRecommendations(
      qlooRecommendations.recommendations || [],
      aggregatedInsights
    );
    
    // Step 6: Test LLM enhancement with insights
    const llmEnhanced = await llmClient.enhanceRecommendations(
      { ...qlooRecommendations, recommendations: enhancedRecommendations },
      { interests, location: 'Miami', budget: 'luxury' },
      aggregatedInsights
    );
    
    res.json({
      success: true,
      test: {
        input: { interests },
        insights: {
          profileStrength: aggregatedInsights.profileStrength,
          tasteProfile: aggregatedInsights.tasteProfile
        },
        recommendations: {
          originalCount: qlooRecommendations.recommendations?.length || 0,
          enhancedCount: enhancedRecommendations.length,
          avgInsightsScore: enhancedRecommendations.length > 0 ? 
            enhancedRecommendations.reduce((sum, rec) => sum + (rec.insightsScore || 0), 0) / enhancedRecommendations.length : 0
        },
        llmEnhancement: {
          enhanced: llmEnhanced.enhanced,
          aiInsights: llmEnhanced.aiInsights,
          personalizedTips: llmEnhanced.personalizedTips,
          enhancementMetadata: llmEnhanced.enhancementMetadata
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Enhanced prompt injection test failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test Insights Aggregation
app.post('/test-insights', async (req, res) => {
  try {
    const { interests } = req.body;
    
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Interests array is required'
      });
    }
    
    logger.info('Testing insights aggregation', { interests });
    
    // Step 1: Search for entities
    const entityIds = await qlooClient.searchEntities(interests);
    
    // Step 2: Get insights
    const insightsResult = await qlooClient.getInsights(entityIds);
    
    // Step 3: Aggregate insights
    const insightsAggregator = new InsightsAggregator();
    const aggregatedInsights = insightsAggregator.aggregateInsights(insightsResult.insights || []);
    
    // Step 4: Get recommendations
    const qlooRecommendations = await qlooClient.getRecommendations(entityIds);
    
    // Step 5: Enhance recommendations
    const enhancedRecommendations = insightsAggregator.enhanceRecommendations(
      qlooRecommendations.recommendations || [],
      aggregatedInsights
    );
    
    res.json({
      success: true,
      test: {
        input: { interests },
        entityResolution: {
          entityCount: entityIds.length,
          entityIds: entityIds.slice(0, 5) // Show first 5
        },
        insights: {
          rawInsightsCount: insightsResult.insights?.length || 0,
          aggregatedProfileStrength: aggregatedInsights.profileStrength,
          crossTypeInsightsCount: aggregatedInsights.tasteProfile?.crossTypeInsights?.length || 0,
          tasteProfile: aggregatedInsights.tasteProfile
        },
        recommendations: {
          originalCount: qlooRecommendations.recommendations?.length || 0,
          enhancedCount: enhancedRecommendations.length,
          avgInsightsScore: enhancedRecommendations.length > 0 ? 
            enhancedRecommendations.reduce((sum, rec) => sum + (rec.insightsScore || 0), 0) / enhancedRecommendations.length : 0,
          sampleEnhanced: enhancedRecommendations.slice(0, 3).map(rec => ({
            name: rec.name,
            insightsScore: rec.insightsScore,
            crossTypeRelevance: rec.crossTypeRelevance,
            enhancedDescription: rec.enhancedDescription?.substring(0, 100) + '...'
          }))
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Insights test failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Entity analysis endpoint
app.post('/analyze-entities', async (req, res) => {
  try {
    const { interests, location, budget } = req.body;
    
    logger.info('Entity analysis request received', { interests, location, budget });
    
    // Step 1: Entity Resolution with detailed logging
    const resolutionResult = await entityResolver.resolveEntities(interests, {
      types: ['brand', 'place', 'tag', 'audience'],
      confidenceThreshold: 0.4
    });
    
    // Step 2: Search entities (legacy method for comparison)
    const searchResult = await qlooClient.searchEntities(interests);
    
    // Step 3: Get recommendations
    const entityIds = resolutionResult.entities.map(entity => entity.urn || entity.entity_id || entity.id);
    const qlooRecommendations = await qlooClient.getRecommendations(entityIds);
    
    // Step 4: Generate activities
    const generator = new RecommendationGenerator();
    const generatedActivities = generator.generateRecommendations(
      interests,
      qlooRecommendations.recommendations || [],
      qlooRecommendations.recommendations || []
    );
    
    // Analysis summary
    const analysis = {
      input: {
        interests,
        location,
        budget
      },
      entityResolution: {
        inputCount: interests.length,
        resolvedCount: resolutionResult.entities.length,
        confidence: resolutionResult.metadata.confidence,
        entities: resolutionResult.entities.map(e => ({
          urn: e.urn,
          name: e.name,
          type: e.type,
          confidence: e.confidence
        }))
      },
      entitySearch: {
        inputCount: interests.length,
        foundCount: searchResult.length,
        entityIds: searchResult
      },
      recommendations: {
        originalCount: qlooRecommendations.metadata?.originalCount || 0,
        filteredCount: qlooRecommendations.metadata?.filteredCount || 0,
        finalCount: qlooRecommendations.recommendations?.length || 0,
        affinityFiltered: qlooRecommendations.metadata?.affinityFiltered || false
      },
      generatedActivities: {
        count: generatedActivities.recommendations?.length || 0
      },
      metadata: {
        timestamp: new Date().toISOString(),
        hasApiKey: !!process.env.QLOO_API_KEY,
        fallbackUsed: qlooRecommendations.metadata?.fallback || false
      }
    };
    
    res.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Entity analysis failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Recommendation endpoint
app.post('/recommend', async (req, res) => {
  try {
    const { interests, location, budget } = req.body;
    
    logger.info('Recommendation request received', { interests, location, budget });
    
    // Step 1: Search for entities based on interests
    const entityIds = await qlooClient.searchEntities(interests);
    
    logger.info(`Found ${entityIds.length} entities for interests`, { 
      interestCount: interests.length,
      entityCount: entityIds.length
    });
    
    // Step 2: Get insights for taste profile building
    const insightsResult = await qlooClient.getInsights(entityIds);
    logger.info('Insights retrieved for taste profile', {
      insightsCount: insightsResult.insights?.length || 0,
      profileStrength: insightsResult.tasteProfile?.profileStrength || 0
    });
    
    // Step 3: Aggregate insights for comprehensive taste profile
    const insightsAggregator = new InsightsAggregator();
    const aggregatedInsights = insightsAggregator.aggregateInsights(insightsResult.insights || []);
    logger.info('Insights aggregation completed', {
      profileStrength: aggregatedInsights.profileStrength,
      crossTypeInsights: aggregatedInsights.tasteProfile?.crossTypeInsights?.length || 0
    });
    
    // Step 4: Get recommendations based on entity IDs
    const qlooRecommendations = await qlooClient.getRecommendations(entityIds);
    
    // Step 5: Enhance recommendations with insights data
    const enhancedRecommendations = insightsAggregator.enhanceRecommendations(
      qlooRecommendations.recommendations || [],
      aggregatedInsights
    );
    logger.info('Recommendations enhanced with insights', {
      enhancedCount: enhancedRecommendations.length,
      avgInsightsScore: enhancedRecommendations.reduce((sum, rec) => sum + (rec.insightsScore || 0), 0) / enhancedRecommendations.length
    });
    
    // Step 6: Generate personalized activities using RecommendationGenerator
    const generator = new RecommendationGenerator();
    const generatedActivities = generator.generateRecommendations(
      interests,
      enhancedRecommendations,
      qlooRecommendations.recommendations || []
    );
    
    // Step 7: Enhance with LLM if available (with insights data)
    const llmEnhancedRecommendations = await llmClient.enhanceRecommendations(
      { ...qlooRecommendations, recommendations: enhancedRecommendations },
      { interests, location, budget },
      aggregatedInsights
    );
    
    // Combine all recommendations with insights data
    const combinedResponse = {
      ...llmEnhancedRecommendations,
      generatedActivities: generatedActivities,
      insights: {
        tasteProfile: aggregatedInsights.tasteProfile,
        profileStrength: aggregatedInsights.profileStrength,
        crossTypeInsights: aggregatedInsights.tasteProfile?.crossTypeInsights || [],
        metadata: aggregatedInsights.metadata
      }
    };
    
    res.json({
      success: true,
      recommendations: combinedResponse,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error processing recommendation request', error);
    
    // Fallback response with generated activities
    try {
      const generator = new RecommendationGenerator();
      const fallbackActivities = generator.generateRecommendations(
        req.body.interests || ['general'],
        [],
        []
      );
      
      res.status(500).json({
        success: false,
        error: 'Unable to process recommendation request',
        fallback: {
          message: 'We are experiencing technical difficulties. Here are some general activities:',
          generatedActivities: fallbackActivities
        }
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        error: 'Unable to process recommendation request',
        fallback: {
          message: 'We are experiencing technical difficulties. Please try again later.',
          recommendations: []
        }
      });
    }
  }
});

// RAG Endpoints for Event Indexing and Search
app.post('/events/index', async (req, res) => {
  try {
    logger.info('Event indexing requested');
    
    const eventIndexer = new EventIndexer();
    const filePath = req.body.filePath || null; // Optional custom file path
    
    const result = await eventIndexer.loadAndIndex(filePath);
    
    if (result.status === 'OK') {
      res.json({
        success: true,
        message: result.message,
        loadedCount: result.loadedCount,
        indexedCount: result.indexedCount,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Error indexing events:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during event indexing',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/events/search', async (req, res) => {
  try {
    logger.info('Event search requested');
    
    const { query, topK = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required',
        timestamp: new Date().toISOString()
    });
    }
    
    const eventIndexer = new EventIndexer();
    const results = await eventIndexer.searchEvents(query, topK);
    
    res.json({
      success: true,
      query: query,
      results: results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error searching events:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during event search',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// New Retrieval Pipeline Endpoint
app.post('/events/retrieve', async (req, res) => {
  try {
    logger.info('Event retrieval requested');
    
    const { userPrefs, topK = 5, minAffinity = 0.4 } = req.body;
    
    if (!userPrefs || !userPrefs.interests || !userPrefs.location) {
      return res.status(400).json({
        success: false,
        error: 'User preferences must include interests and location',
        timestamp: new Date().toISOString()
      });
    }
    
    const eventRetriever = new EventRetriever();
    const results = await eventRetriever.retrieveRelevantEventsWithMinAffinity(userPrefs, minAffinity, topK);
    
    res.json({
      success: true,
      userPrefs: userPrefs,
      results: results,
      count: results.length,
      minAffinity: minAffinity,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving events:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during event retrieval',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/events/status', async (req, res) => {
  try {
    logger.info('Event indexing status requested');
    
    const eventIndexer = new EventIndexer();
    const events = await eventIndexer.loadEvents();
    
    res.json({
      success: true,
      eventsCount: events.length,
      status: 'indexed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error checking event status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error checking event status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// New Prompt Generation Endpoint
app.post('/prompts/generate', async (req, res) => {
  try {
    logger.info('Prompt generation requested');

    const { userPrefs, topK = 5, minAffinity = 0.4, promptType = 'standard' } = req.body;

    if (!userPrefs || !userPrefs.interests) {
      return res.status(400).json({
        success: false,
        error: 'User preferences must include interests',
        timestamp: new Date().toISOString()
      });
    }

    // First retrieve relevant events
    const eventRetriever = new EventRetriever();
    const retrievedEvents = await eventRetriever.retrieveRelevantEventsWithMinAffinity(userPrefs, minAffinity, topK);

    if (retrievedEvents.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No relevant events found for the given preferences',
        userPrefs: userPrefs,
        timestamp: new Date().toISOString()
      });
    }

    // Generate prompt based on retrieved events
    const promptGenerator = new PromptGenerator();
    let generatedPrompt;

    switch (promptType) {
      case 'compact':
        generatedPrompt = promptGenerator.generateCompactPrompt(retrievedEvents, userPrefs);
        break;
      case 'detailed':
        generatedPrompt = promptGenerator.generateDetailedPrompt(retrievedEvents, userPrefs, {
          includeTags: true,
          includeAffinity: true
        });
        break;
      case 'standard':
      default:
        generatedPrompt = promptGenerator.generateRecommendationPrompt(retrievedEvents, userPrefs);
        break;
    }

    const estimatedTokens = promptGenerator.estimateTokens(generatedPrompt);

    res.json({
      success: true,
      userPrefs: userPrefs,
      retrievedEvents: retrievedEvents.map(event => ({
        id: event.id,
        title: event.title,
        type: event.type,
        score: event.score,
        experienceAffinity: event.experienceAffinity
      })),
      prompt: {
        type: promptType,
        content: generatedPrompt,
        estimatedTokens: estimatedTokens,
        maxTokens: promptGenerator.maxTokens
      },
      count: retrievedEvents.length,
      minAffinity: minAffinity,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error generating prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during prompt generation',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// RAG Recommendation Endpoint
app.post('/recommendRAG', async (req, res) => {
  try {
    logger.info('RAG recommendation requested');

    const { userPrefs, options = {} } = req.body;

    if (!userPrefs || !userPrefs.interests) {
      return res.status(400).json({
        success: false,
        error: 'User preferences must include interests',
        timestamp: new Date().toISOString()
      });
    }

            const ragService = new RAGRecommendationService();
        const response = await ragService.generateRecommendations(userPrefs, options);

        // Check if the service returned an error response
        if (!response.success) {
          return res.status(200).json(response);
        }

        // Validate response structure for successful responses
        if (!ragService.validateResponse(response)) {
          logger.warn('Response validation failed, returning error');
          return res.status(500).json({
            success: false,
            error: 'Invalid response structure generated',
            timestamp: new Date().toISOString()
          });
        }

        res.json(response);

  } catch (error) {
    logger.error('Error in RAG recommendation endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during RAG recommendation generation',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize test RAG endpoint
const testRAGEndpoint = new TestRAGEndpoint();
testRAGEndpoint.createTestEndpoint(app);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});