const request = require('supertest');
const express = require('express');

// Mock the services
jest.mock('../services/qlooClient');
jest.mock('../services/llmClient');
jest.mock('../utils/logger');

const app = express();
app.use(express.json());

// Import after mocking
const qlooClient = require('../services/qlooClient');
const llmClient = require('../services/llmClient');

// Setup basic routes for testing
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/recommend', async (req, res) => {
  try {
    const { interests, location, budget } = req.body;
    
    const qlooRecommendations = await qlooClient.getRecommendations({
      interests,
      location,
      budget
    });
    
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
    res.status(500).json({
      success: false,
      error: 'Unable to process recommendation request'
    });
  }
});

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /recommend', () => {
    it('should return recommendations for valid input', async () => {
      const mockQlooResponse = {
        recommendations: [
          { id: 'test1', name: 'Test Recommendation' }
        ]
      };
      
      const mockEnhancedResponse = {
        ...mockQlooResponse,
        enhanced: true,
        insights: 'Test insights'
      };

      qlooClient.getRecommendations.mockResolvedValue(mockQlooResponse);
      llmClient.enhanceRecommendations.mockResolvedValue(mockEnhancedResponse);

      const requestBody = {
        interests: ['Adventure', 'Culture'],
        location: 'Mediterranean',
        budget: 'moderate'
      };

      const response = await request(app)
        .post('/recommend')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.recommendations).toEqual(mockEnhancedResponse);
      expect(qlooClient.getRecommendations).toHaveBeenCalledWith(requestBody);
    });

    it('should handle errors gracefully', async () => {
      qlooClient.getRecommendations.mockRejectedValue(new Error('API Error'));

      const requestBody = {
        interests: ['Adventure'],
        location: 'Mediterranean',
        budget: 'moderate'
      };

      const response = await request(app)
        .post('/recommend')
        .send(requestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unable to process recommendation request');
    });
  });
});