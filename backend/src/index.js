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
const RecommendationGenerator = require('./services/recommendationGenerator');
const InsightsAggregator = require('./services/insightsAggregator');
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
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      recommendations: 'POST /recommend',
      insights: 'POST /test-insights',
      promptInjection: 'POST /test-prompt-injection',
      apiStatus: 'GET /api-status',
      qlooTest: 'GET /test-qloo'
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
    const resolutionResult = await qlooClient.resolveEntities(interests, {
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

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});