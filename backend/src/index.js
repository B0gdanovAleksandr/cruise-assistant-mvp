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
      apiStatus: 'GET /api-status'
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
    
    // Step 2: Get recommendations based on entity IDs
    const qlooRecommendations = await qlooClient.getRecommendations(entityIds);
    
    // Step 3: Generate personalized activities using RecommendationGenerator
    const generator = new RecommendationGenerator();
    const generatedActivities = generator.generateRecommendations(
      interests,
      qlooRecommendations.recommendations || [],
      qlooRecommendations.recommendations || []
    );
    
    // Step 4: Enhance with LLM if available
    const enhancedRecommendations = await llmClient.enhanceRecommendations(
      qlooRecommendations,
      { interests, location, budget }
    );
    
    // Combine Qloo recommendations with generated activities
    const combinedResponse = {
      ...enhancedRecommendations,
      generatedActivities: generatedActivities
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