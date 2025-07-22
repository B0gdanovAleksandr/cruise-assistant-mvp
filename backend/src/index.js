const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const qlooClient = require('./services/qlooClient');
const llmClient = require('./services/llmClient');

dotenv.config();

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
      recommendations: 'POST /recommend'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Recommendation endpoint
app.post('/recommend', async (req, res) => {
  try {
    const { interests, location, budget } = req.body;
    
    logger.info('Recommendation request received', { interests, location, budget });
    
    // Get recommendations from Qloo
    const qlooRecommendations = await qlooClient.getRecommendations({
      interests,
      location,
      budget
    });
    
    // Enhance with LLM
    const enhancedRecommendations = await llmClient.enhanceRecommendations(
      qlooRecommendations,
      { interests, location, budget }
    );
    
    res.json({
      success: true,
      recommendations: enhancedRecommendations,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error processing recommendation request', error);
    
    // Fallback response
    res.status(500).json({
      success: false,
      error: 'Unable to process recommendation request',
      fallback: {
        message: 'We are experiencing technical difficulties. Please try again later.',
        recommendations: []
      }
    });
  }
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});