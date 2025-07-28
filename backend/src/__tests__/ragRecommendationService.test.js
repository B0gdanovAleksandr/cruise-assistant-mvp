const RAGRecommendationService = require('../services/ragRecommendationService');

// Mock dependencies
jest.mock('../services/eventRetriever');
jest.mock('../services/promptGenerator');
jest.mock('../services/llmClient');

const EventRetriever = require('../services/eventRetriever');
const PromptGenerator = require('../services/promptGenerator');
const llmClient = require('../services/llmClient');

// Mock llmClient methods
llmClient.generateResponse = jest.fn();

describe('RAGRecommendationService', () => {
  let ragService;
  let mockEventRetriever;
  let mockPromptGenerator;

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

    // Mock constructor returns
    EventRetriever.mockImplementation(() => mockEventRetriever);
    PromptGenerator.mockImplementation(() => mockPromptGenerator);

    ragService = new RAGRecommendationService();
  });

  describe('generateRecommendations', () => {
    const mockUserPrefs = {
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

    it('should generate recommendations successfully', async () => {
      // Setup mocks
      mockEventRetriever.retrieveRelevantEventsWithMinAffinity.mockResolvedValue(mockRetrievedEvents);
      mockPromptGenerator.generateRecommendationPrompt.mockReturnValue('Generated prompt');
      mockPromptGenerator.estimateTokens.mockReturnValue(150);
      llmClient.generateResponse.mockResolvedValue(mockGPTResponse);

      const result = await ragService.generateRecommendations(mockUserPrefs);

      // Verify the result structure
      expect(result.success).toBe(true);
      expect(result.userPrefs).toEqual(mockUserPrefs);
      expect(result.recommendations).toHaveLength(2);
      expect(result.aiInsights).toHaveLength(1);
      expect(result.ragSources).toHaveLength(2);

      // Verify recommendations structure
      expect(result.recommendations[0]).toHaveProperty('id');
      expect(result.recommendations[0]).toHaveProperty('title');
      expect(result.recommendations[0]).toHaveProperty('originEventId');
      expect(result.recommendations[0]).toHaveProperty('timing');
      expect(result.recommendations[0]).toHaveProperty('personalizedAdvice');

      // Verify RAG sources structure
      expect(result.ragSources[0]).toHaveProperty('id');
      expect(result.ragSources[0]).toHaveProperty('title');
      expect(result.ragSources[0]).toHaveProperty('type');
      expect(result.ragSources[0]).toHaveProperty('experienceAffinity');

      // Verify service calls
      expect(mockEventRetriever.retrieveRelevantEventsWithMinAffinity).toHaveBeenCalledWith(
        mockUserPrefs, 0.4, 5
      );
      expect(mockPromptGenerator.generateRecommendationPrompt).toHaveBeenCalledWith(
        mockRetrievedEvents, mockUserPrefs
      );
      expect(llmClient.generateResponse).toHaveBeenCalled();
    });

    it('should handle empty retrieved events', async () => {
      mockEventRetriever.retrieveRelevantEventsWithMinAffinity.mockResolvedValue([]);

      const result = await ragService.generateRecommendations(mockUserPrefs);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No relevant events found for the given preferences');
      expect(result.recommendations).toEqual([]);
      expect(result.ragSources).toEqual([]);
    });

    it('should throw error for missing user preferences', async () => {
      await expect(ragService.generateRecommendations({}))
        .rejects.toThrow('User preferences must include interests');

      await expect(ragService.generateRecommendations(null))
        .rejects.toThrow('User preferences must include interests');
    });

    it('should handle GPT response parsing errors gracefully', async () => {
      mockEventRetriever.retrieveRelevantEventsWithMinAffinity.mockResolvedValue(mockRetrievedEvents);
      mockPromptGenerator.generateRecommendationPrompt.mockReturnValue('Generated prompt');
      mockPromptGenerator.estimateTokens.mockReturnValue(150);
      llmClient.generateResponse.mockResolvedValue('Invalid JSON response');

      const result = await ragService.generateRecommendations(mockUserPrefs);

      expect(result.success).toBe(true);
      expect(result.recommendations).toEqual([]);
      expect(result.aiInsights).toEqual([]);
      expect(result.ragSources).toEqual([]);
    });

    it('should normalize recommendations with missing fields', async () => {
      const invalidGPTResponse = JSON.stringify({
        recommendations: [
          {
            id: 'rec_1',
            originEventId: 'event_001'
            // Missing other fields
          },
          {
            title: 'Some recommendation',
            originEventId: 'invalid_event_id'
            // Missing id and invalid originEventId
          }
        ],
        aiInsights: []
      });

      mockEventRetriever.retrieveRelevantEventsWithMinAffinity.mockResolvedValue(mockRetrievedEvents);
      mockPromptGenerator.generateRecommendationPrompt.mockReturnValue('Generated prompt');
      mockPromptGenerator.estimateTokens.mockReturnValue(150);
      llmClient.generateResponse.mockResolvedValue(invalidGPTResponse);

      const result = await ragService.generateRecommendations(mockUserPrefs);

      expect(result.recommendations).toHaveLength(1); // Only valid recommendation
      expect(result.recommendations[0].id).toBe('rec_1');
      expect(result.recommendations[0].title).toBe('Personalized Recommendation');
      expect(result.recommendations[0].originEventId).toBe('event_001');
    });
  });

  describe('parseGPTResponse', () => {
    const mockRetrievedEvents = [
      {
        id: 'event_001',
        title: 'Live Jazz Evening',
        type: 'entertainment',
        score: 0.85,
        experienceAffinity: 'relaxation',
        tags: ['jazz', 'music', 'culture']
      }
    ];

    it('should parse valid JSON response', () => {
      const validResponse = JSON.stringify({
        recommendations: [
          {
            id: 'rec_1',
            title: 'Test Recommendation',
            originEventId: 'event_001'
          }
        ],
        aiInsights: [
          {
            id: 'insight_1',
            type: 'timing',
            title: 'Test Insight'
          }
        ]
      });

      const result = ragService.parseGPTResponse(validResponse, mockRetrievedEvents);

      expect(result.recommendations).toHaveLength(1);
      expect(result.aiInsights).toHaveLength(1);
      expect(result.ragSources).toHaveLength(1);
    });

    it('should extract JSON from mixed response', () => {
      const mixedResponse = `Here are my recommendations:
      {
        "recommendations": [
          {
            "id": "rec_1",
            "title": "Test Recommendation",
            "originEventId": "event_001"
          }
        ],
        "aiInsights": []
      }
      Hope this helps!`;

      const result = ragService.parseGPTResponse(mixedResponse, mockRetrievedEvents);

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].originEventId).toBe('event_001');
    });

    it('should handle completely invalid response', () => {
      const invalidResponse = 'This is not JSON at all';

      const result = ragService.parseGPTResponse(invalidResponse, mockRetrievedEvents);

      expect(result.recommendations).toEqual([]);
      expect(result.aiInsights).toEqual([]);
      expect(result.ragSources).toEqual([]);
    });
  });

  describe('normalizeRecommendations', () => {
    const mockRetrievedEvents = [
      { id: 'event_001', title: 'Event 1' },
      { id: 'event_002', title: 'Event 2' }
    ];

    it('should normalize valid recommendations', () => {
      const rawRecommendations = [
        {
          id: 'rec_1',
          title: 'Test Recommendation',
          description: 'Test description',
          timing: 'Test timing',
          originEventId: 'event_001',
          personalizedAdvice: 'Test advice'
        }
      ];

      const result = ragService.normalizeRecommendations(rawRecommendations, mockRetrievedEvents);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rec_1');
      expect(result[0].originEventId).toBe('event_001');
    });

    it('should filter out recommendations with invalid originEventId', () => {
      const rawRecommendations = [
        {
          id: 'rec_1',
          title: 'Valid Recommendation',
          originEventId: 'event_001'
        },
        {
          id: 'rec_2',
          title: 'Invalid Recommendation',
          originEventId: 'invalid_event'
        }
      ];

      const result = ragService.normalizeRecommendations(rawRecommendations, mockRetrievedEvents);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rec_1');
    });

    it('should provide default values for missing fields', () => {
      const rawRecommendations = [
        {
          id: 'rec_1',
          originEventId: 'event_001'
          // Missing other fields
        }
      ];

      const result = ragService.normalizeRecommendations(rawRecommendations, mockRetrievedEvents);

      expect(result[0].title).toBe('Personalized Recommendation');
      expect(result[0].description).toBe('A personalized recommendation based on your preferences');
      expect(result[0].timing).toBe('Flexible timing available');
      expect(result[0].personalizedAdvice).toBe('Consider this experience based on your interests');
    });
  });

  describe('normalizeInsights', () => {
    it('should normalize valid insights', () => {
      const rawInsights = [
        {
          id: 'insight_1',
          type: 'timing',
          title: 'Test Insight',
          description: 'Test description',
          relevance: 'high'
        }
      ];

      const result = ragService.normalizeInsights(rawInsights);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('insight_1');
      expect(result[0].type).toBe('timing');
      expect(result[0].relevance).toBe('high');
    });

    it('should provide default values for invalid fields', () => {
      const rawInsights = [
        {
          id: 'insight_1',
          type: 'invalid_type',
          relevance: 'invalid_relevance'
        }
      ];

      const result = ragService.normalizeInsights(rawInsights);

      expect(result[0].type).toBe('general');
      expect(result[0].relevance).toBe('medium');
      expect(result[0].title).toBe('AI Insight');
    });
  });

  describe('extractRAGSources', () => {
    const mockRetrievedEvents = [
      {
        id: 'event_001',
        title: 'Live Jazz Evening',
        type: 'entertainment',
        experienceAffinity: 'relaxation',
        score: 0.85,
        tags: ['jazz', 'music']
      },
      {
        id: 'event_002',
        title: 'Sunset Yoga Class',
        type: 'activity',
        experienceAffinity: 'wellness',
        score: 0.75,
        tags: ['yoga', 'wellness']
      }
    ];

    it('should extract RAG sources from recommendations', () => {
      const recommendations = [
        {
          id: 'rec_1',
          originEventId: 'event_001'
        },
        {
          id: 'rec_2',
          originEventId: 'event_002'
        }
      ];

      const result = ragService.extractRAGSources(recommendations, mockRetrievedEvents);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('event_001');
      expect(result[0].title).toBe('Live Jazz Evening');
      expect(result[1].id).toBe('event_002');
      expect(result[1].title).toBe('Sunset Yoga Class');
    });

    it('should filter out invalid event IDs', () => {
      const recommendations = [
        {
          id: 'rec_1',
          originEventId: 'event_001'
        },
        {
          id: 'rec_2',
          originEventId: 'invalid_event'
        }
      ];

      const result = ragService.extractRAGSources(recommendations, mockRetrievedEvents);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('event_001');
    });
  });

  describe('validateResponse', () => {
    it('should validate correct response structure', () => {
      const validResponse = {
        success: true,
        recommendations: [
          {
            id: 'rec_1',
            title: 'Test Recommendation',
            originEventId: 'event_001'
          }
        ],
        ragSources: [
          {
            id: 'event_001',
            title: 'Test Event',
            type: 'entertainment'
          }
        ]
      };

      expect(ragService.validateResponse(validResponse)).toBe(true);
    });

    it('should reject invalid response structure', () => {
      const invalidResponses = [
        { success: false }, // Missing arrays
        { success: true, recommendations: [] }, // Missing ragSources
        { success: true, ragSources: [] }, // Missing recommendations
        {
          success: true,
          recommendations: [{ id: 'rec_1' }], // Missing required fields
          ragSources: [{ id: 'event_001' }]
        }
      ];

      invalidResponses.forEach(response => {
        expect(ragService.validateResponse(response)).toBe(false);
      });
    });
  });
}); 