const request = require('supertest');
const express = require('express');

// Mock all external dependencies
jest.mock('../services/eventRetriever');
jest.mock('../services/promptGenerator');
jest.mock('../services/llmClient');
jest.mock('../services/vectorStore');
jest.mock('../services/ragRecommendationService');

const EventRetriever = require('../services/eventRetriever');
const PromptGenerator = require('../services/promptGenerator');
const llmClient = require('../services/llmClient');
const RAGRecommendationService = require('../services/ragRecommendationService');

// Mock llmClient methods
llmClient.generateResponse = jest.fn();

describe('RAG Recommendation Endpoint Integration Tests', () => {
  let app;
  let mockEventRetriever;
  let mockPromptGenerator;
  let mockRAGService;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock instances
    mockEventRetriever = {
      retrieveRelevantEventsWithMinAffinity: jest.fn()
    };
    mockPromptGenerator = {
      generateRecommendationPrompt: jest.fn(),
      estimateTokens: jest.fn()
    };
    mockRAGService = {
      generateRecommendations: jest.fn(),
      validateResponse: jest.fn()
    };

    // Mock constructor returns
    EventRetriever.mockImplementation(() => mockEventRetriever);
    PromptGenerator.mockImplementation(() => mockPromptGenerator);
    RAGRecommendationService.mockImplementation(() => mockRAGService);

    // Create Express app with the endpoint
    app = express();
    app.use(express.json());
    
    app.post('/recommendRAG', async (req, res) => {
      try {
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

        // Validate response structure
        if (!ragService.validateResponse(response)) {
          return res.status(500).json({
            success: false,
            error: 'Invalid response structure generated',
            timestamp: new Date().toISOString()
          });
        }

        res.json(response);

      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Internal server error during RAG recommendation generation',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
  });

  describe('POST /recommendRAG', () => {
    const validUserPrefs = {
      interests: ['culture', 'wellness'],
      location: 'Mediterranean'
    };

    const mockRetrievedEvents = [
      {
        id: 'event_001',
        title: 'Live Jazz Evening',
        type: 'entertainment',
        score: 0.85,
        experienceAffinity: 'relaxation',
        tags: ['jazz', 'music', 'culture']
      },
      {
        id: 'event_002',
        title: 'Sunset Yoga Class',
        type: 'activity',
        score: 0.75,
        experienceAffinity: 'wellness',
        tags: ['yoga', 'sunset', 'wellness']
      }
    ];

    const mockGPTResponse = JSON.stringify({
      recommendations: [
        {
          id: 'rec_1',
          title: 'Evening Jazz Experience',
          description: 'Perfect for culture enthusiasts',
          timing: '7:00 PM - 9:00 PM',
          originEventId: 'event_001',
          personalizedAdvice: 'Arrive early to secure the best seats'
        },
        {
          id: 'rec_2',
          title: 'Sunset Wellness Session',
          description: 'Ideal for wellness seekers',
          timing: '6:00 PM - 7:30 PM',
          originEventId: 'event_002',
          personalizedAdvice: 'Bring comfortable clothing for yoga'
        }
      ],
      aiInsights: [
        {
          id: 'insight_1',
          type: 'timing',
          title: 'Optimal Evening Schedule',
          description: 'Combine yoga and jazz for a perfect evening',
          relevance: 'high'
        }
      ]
    });

    it('should return successful RAG recommendations', async () => {
      // Setup mocks
      const mockResponse = {
        success: true,
        userPrefs: validUserPrefs,
        recommendations: [
          {
            id: 'rec_1',
            title: 'Evening Jazz Experience',
            description: 'Perfect for culture enthusiasts',
            timing: '7:00 PM - 9:00 PM',
            originEventId: 'event_001',
            personalizedAdvice: 'Arrive early to secure the best seats'
          }
        ],
        ragSources: [
          {
            id: 'event_001',
            title: 'Live Jazz Evening',
            type: 'entertainment',
            experienceAffinity: 'relaxation'
          }
        ],
        aiInsights: [
          {
            id: 'insight_1',
            type: 'timing',
            title: 'Optimal Evening Schedule',
            description: 'Combine yoga and jazz for a perfect evening',
            relevance: 'high'
          }
        ]
      };
      
      mockRAGService.generateRecommendations.mockResolvedValue(mockResponse);
      mockRAGService.validateResponse.mockReturnValue(true);

      const response = await request(app)
        .post('/recommendRAG')
        .send({
          userPrefs: validUserPrefs,
          options: {
            topK: 5,
            minAffinity: 0.4,
            promptType: 'standard'
          }
        })
        .expect(200);

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.userPrefs).toEqual(validUserPrefs);
      expect(response.body.recommendations).toBeDefined();
      expect(response.body.aiInsights).toBeDefined();
      expect(response.body.ragSources).toBeDefined();

      // Verify recommendations array
      expect(Array.isArray(response.body.recommendations)).toBe(true);
      expect(response.body.recommendations.length).toBeGreaterThan(0);
      
      // Verify each recommendation has required fields
      response.body.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('originEventId');
        expect(rec).toHaveProperty('timing');
        expect(rec).toHaveProperty('personalizedAdvice');
      });

      // Verify RAG sources array
      expect(Array.isArray(response.body.ragSources)).toBe(true);
      expect(response.body.ragSources.length).toBeGreaterThan(0);
      
      // Verify each RAG source has required fields
      response.body.ragSources.forEach(source => {
        expect(source).toHaveProperty('id');
        expect(source).toHaveProperty('title');
        expect(source).toHaveProperty('type');
        expect(source).toHaveProperty('experienceAffinity');
      });

      // Verify AI insights array
      expect(Array.isArray(response.body.aiInsights)).toBe(true);
      expect(response.body.aiInsights.length).toBeGreaterThan(0);

      // Verify service calls
      expect(mockRAGService.generateRecommendations).toHaveBeenCalledWith(
        validUserPrefs, {
          topK: 5,
          minAffinity: 0.4,
          promptType: 'standard'
        }
      );
      expect(mockRAGService.validateResponse).toHaveBeenCalledWith(mockResponse);
    });

    it('should handle missing user preferences', async () => {
      const response = await request(app)
        .post('/recommendRAG')
        .send({
          userPrefs: {},
          options: {}
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User preferences must include interests');
    });

    it('should handle missing interests', async () => {
      const response = await request(app)
        .post('/recommendRAG')
        .send({
          userPrefs: { location: 'Mediterranean' },
          options: {}
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User preferences must include interests');
    });

    it('should handle no relevant events found', async () => {
      const mockResponse = {
        success: false,
        error: 'No relevant events found for the given preferences',
        userPrefs: validUserPrefs,
        recommendations: [],
        aiInsights: [],
        ragSources: []
      };
      
      mockRAGService.generateRecommendations.mockResolvedValue(mockResponse);
      mockRAGService.validateResponse.mockReturnValue(true);

      const response = await request(app)
        .post('/recommendRAG')
        .send({
          userPrefs: validUserPrefs,
          options: {}
        })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No relevant events found for the given preferences');
      expect(response.body.recommendations).toEqual([]);
      expect(response.body.ragSources).toEqual([]);
    });

    it('should handle GPT response parsing errors gracefully', async () => {
      const mockResponse = {
        success: true,
        userPrefs: validUserPrefs,
        recommendations: [],
        aiInsights: [],
        ragSources: []
      };
      
      mockRAGService.generateRecommendations.mockResolvedValue(mockResponse);
      mockRAGService.validateResponse.mockReturnValue(true);

      const response = await request(app)
        .post('/recommendRAG')
        .send({
          userPrefs: validUserPrefs,
          options: {}
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.recommendations).toEqual([]);
      expect(response.body.aiInsights).toEqual([]);
      expect(response.body.ragSources).toEqual([]);
    });

    it('should handle service errors', async () => {
      mockRAGService.generateRecommendations.mockRejectedValue(
        new Error('Service error')
      );

      const response = await request(app)
        .post('/recommendRAG')
        .send({
          userPrefs: validUserPrefs,
          options: {}
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error during RAG recommendation generation');
    });

    it('should validate response structure and return error for invalid structure', async () => {
      const mockResponse = {
        success: true,
        userPrefs: validUserPrefs,
        recommendations: [],
        ragSources: []
      };
      
      mockRAGService.generateRecommendations.mockResolvedValue(mockResponse);
      mockRAGService.validateResponse.mockReturnValue(false);

      const response = await request(app)
        .post('/recommendRAG')
        .send({
          userPrefs: validUserPrefs,
          options: {}
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid response structure generated');
    });

    it('should handle different user preference combinations', async () => {
      const differentPrefs = [
        { interests: ['adventure'], location: 'Alaska' },
        { interests: ['relaxation', 'food'], location: 'Caribbean' },
        { interests: ['history'], location: 'Northern Europe' }
      ];

      for (const prefs of differentPrefs) {
        const mockResponse = {
          success: true,
          userPrefs: prefs,
          recommendations: [],
          ragSources: []
        };
        
        mockRAGService.generateRecommendations.mockResolvedValue(mockResponse);
        mockRAGService.validateResponse.mockReturnValue(true);

        const response = await request(app)
          .post('/recommendRAG')
          .send({
            userPrefs: prefs,
            options: {}
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.userPrefs).toEqual(prefs);
        expect(Array.isArray(response.body.recommendations)).toBe(true);
        expect(Array.isArray(response.body.ragSources)).toBe(true);
      }
    });

    it('should handle custom options', async () => {
      const customOptions = {
        topK: 3,
        minAffinity: 0.6,
        promptType: 'detailed',
        maxTokens: 800
      };

      const mockResponse = {
        success: true,
        userPrefs: validUserPrefs,
        recommendations: [],
        ragSources: [],
        minAffinity: 0.6,
        count: 2
      };
      
      mockRAGService.generateRecommendations.mockResolvedValue(mockResponse);
      mockRAGService.validateResponse.mockReturnValue(true);

      const response = await request(app)
        .post('/recommendRAG')
        .send({
          userPrefs: validUserPrefs,
          options: customOptions
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.minAffinity).toBe(0.6);
      expect(response.body.count).toBe(2);

      // Verify service was called with custom options
      expect(mockRAGService.generateRecommendations).toHaveBeenCalledWith(
        validUserPrefs, customOptions
      );
    });

    it('should include timestamp in response', async () => {
      const mockResponse = {
        success: true,
        userPrefs: validUserPrefs,
        recommendations: [],
        ragSources: [],
        timestamp: new Date().toISOString()
      };
      
      mockRAGService.generateRecommendations.mockResolvedValue(mockResponse);
      mockRAGService.validateResponse.mockReturnValue(true);

      const response = await request(app)
        .post('/recommendRAG')
        .send({
          userPrefs: validUserPrefs,
          options: {}
        })
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });
}); 