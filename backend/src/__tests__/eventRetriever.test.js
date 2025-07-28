const EventRetriever = require('../services/eventRetriever');
const { PineconeStore } = require('../services/vectorStore');

// Mock for PineconeStore
jest.mock('../services/vectorStore');

describe('EventRetriever', () => {
  let eventRetriever;
  let mockVectorStore;

  beforeEach(() => {
    // Create mock for vector store
    mockVectorStore = {
      generateEmbedding: jest.fn(),
      query: jest.fn()
    };

    // Mock PineconeStore constructor
    PineconeStore.mockImplementation(() => mockVectorStore);

    eventRetriever = new EventRetriever(mockVectorStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('retrieveRelevantEvents', () => {
    it('should retrieve relevant events with required fields', async () => {
      const userPrefs = {
        interests: ['culture', 'wellness'],
        location: 'Mediterranean'
      };

      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockSearchResults = [
        {
          id: 'event_001',
          score: 0.85,
          metadata: {
            id: 'event_001',
            title: 'Evening Jazz in the Main Salon',
            description: 'Enjoy live jazz music in the elegant atmosphere',
            type: 'entertainment',
            experienceAffinity: 'relaxation',
            tags: ['music', 'jazz', 'evening', 'live music', 'salon']
          }
        },
        {
          id: 'event_002',
          score: 0.75,
          metadata: {
            id: 'event_002',
            title: 'Sunrise Yoga',
            description: 'Start your day with refreshing yoga practice',
            type: 'activity',
            experienceAffinity: 'wellness',
            tags: ['yoga', 'morning', 'health', 'deck', 'sunrise']
          }
        }
      ];

      mockVectorStore.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockVectorStore.query.mockResolvedValue(mockSearchResults);

      const result = await eventRetriever.retrieveRelevantEvents(userPrefs, 5);

      // Check that required fields are present
      expect(result).toHaveLength(2);
      
      result.forEach(event => {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('title');
        expect(event).toHaveProperty('experienceAffinity');
        expect(event).toHaveProperty('tags');
        expect(event).toHaveProperty('score');
        expect(Array.isArray(event.tags)).toBe(true);
      });

      // Check specific events
      expect(result[0].title).toBe('Evening Jazz in the Main Salon');
      expect(result[0].experienceAffinity).toBe('relaxation');
      expect(result[1].title).toBe('Sunrise Yoga');
      expect(result[1].experienceAffinity).toBe('wellness');

      expect(mockVectorStore.generateEmbedding).toHaveBeenCalledWith('culture wellness Mediterranean');
      expect(mockVectorStore.query).toHaveBeenCalledWith(mockEmbedding, 5);
    });

    it('should throw error for missing user preferences', async () => {
      await expect(eventRetriever.retrieveRelevantEvents({})).rejects.toThrow('User preferences must include interests');
      await expect(eventRetriever.retrieveRelevantEvents(null)).rejects.toThrow('User preferences must include interests');
      await expect(eventRetriever.retrieveRelevantEvents({ location: 'Mediterranean' })).rejects.toThrow('User preferences must include interests');
    });

    it('should filter out results with missing required fields', async () => {
      const userPrefs = {
        interests: ['culture'],
        location: 'Mediterranean'
      };

      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockSearchResults = [
        {
          id: 'event_001',
          score: 0.85,
          metadata: {
            id: 'event_001',
            title: 'Valid Event',
            experienceAffinity: 'relaxation',
            tags: ['music']
          }
        },
        {
          id: 'event_002',
          score: 0.75,
          metadata: {
            id: 'event_002',
            // Missing title
            experienceAffinity: 'wellness',
            tags: ['yoga']
          }
        },
        {
          id: 'event_003',
          score: 0.65,
          metadata: {
            id: 'event_003',
            title: 'Another Valid Event',
            experienceAffinity: 'entertainment',
            tags: ['dance']
          }
        }
      ];

      mockVectorStore.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockVectorStore.query.mockResolvedValue(mockSearchResults);

      const result = await eventRetriever.retrieveRelevantEvents(userPrefs, 5);

      // Should only return events with all required fields
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Valid Event');
      expect(result[1].title).toBe('Another Valid Event');
    });
  });

  describe('retrieveRelevantEventsWithMinAffinity', () => {
    it('should filter events with minimum affinity score of 0.4', async () => {
      const userPrefs = {
        interests: ['culture', 'wellness'],
        location: 'Mediterranean'
      };

      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockSearchResults = [
        {
          id: 'event_001',
          score: 0.85,
          metadata: {
            id: 'event_001',
            title: 'Live Jazz Evening',
            experienceAffinity: 'relaxation',
            tags: ['music', 'jazz']
          }
        },
        {
          id: 'event_002',
          score: 0.35, // Below 0.4 threshold
          metadata: {
            id: 'event_002',
            title: 'Low Affinity Event',
            experienceAffinity: 'wellness',
            tags: ['yoga']
          }
        },
        {
          id: 'event_003',
          score: 0.75,
          metadata: {
            id: 'event_003',
            title: 'Sunset Yoga Class',
            experienceAffinity: 'wellness',
            tags: ['yoga', 'sunset']
          }
        },
        {
          id: 'event_004',
          score: 0.25, // Below 0.4 threshold
          metadata: {
            id: 'event_004',
            title: 'Another Low Affinity Event',
            experienceAffinity: 'entertainment',
            tags: ['dance']
          }
        }
      ];

      mockVectorStore.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockVectorStore.query.mockResolvedValue(mockSearchResults);

      const result = await eventRetriever.retrieveRelevantEventsWithMinAffinity(userPrefs, 0.4, 5);

      // Should only return events with score >= 0.4
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Live Jazz Evening');
      expect(result[0].score).toBeGreaterThanOrEqual(0.4);
      expect(result[1].title).toBe('Sunset Yoga Class');
      expect(result[1].score).toBeGreaterThanOrEqual(0.4);
    });
  });

  describe('retrieveByInterestsAndLocation', () => {
    it('should retrieve events for specific interests and location', async () => {
      const interests = ['culture', 'wellness'];
      const location = 'Mediterranean';

      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockSearchResults = [
        {
          id: 'event_001',
          score: 0.85,
          metadata: {
            id: 'event_001',
            title: 'Live Jazz Evening',
            experienceAffinity: 'relaxation',
            tags: ['music', 'jazz']
          }
        }
      ];

      mockVectorStore.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockVectorStore.query.mockResolvedValue(mockSearchResults);

      const result = await eventRetriever.retrieveByInterestsAndLocation(interests, location, 3);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Live Jazz Evening');
      expect(mockVectorStore.generateEmbedding).toHaveBeenCalledWith('culture wellness Mediterranean');
    });
  });

  describe('buildSearchQuery', () => {
    it('should build correct search query from user preferences', () => {
      const userPrefs = {
        interests: ['culture', 'wellness'],
        location: 'Mediterranean'
      };

      const query = eventRetriever.buildSearchQuery(userPrefs);
      expect(query).toBe('culture wellness Mediterranean');
    });

    it('should handle single interest', () => {
      const userPrefs = {
        interests: ['culture'],
        location: 'Mediterranean'
      };

      const query = eventRetriever.buildSearchQuery(userPrefs);
      expect(query).toBe('culture Mediterranean');
    });

    it('should handle empty location', () => {
      const userPrefs = {
        interests: ['culture', 'wellness'],
        location: ''
      };

      const query = eventRetriever.buildSearchQuery(userPrefs);
      expect(query).toBe('culture wellness');
    });
  });

  describe('Specific Test Case: Mediterranean with culture and wellness interests', () => {
    it('should return "Live Jazz Evening" and "Sunset Yoga Class" with affinity >= 0.4', async () => {
      const userPrefs = {
        interests: ['culture', 'wellness'],
        location: 'Mediterranean'
      };

      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockSearchResults = [
        {
          id: 'event_001',
          score: 0.85,
          metadata: {
            id: 'event_001',
            title: 'Live Jazz Evening',
            description: 'Enjoy live jazz music in the elegant atmosphere',
            type: 'entertainment',
            experienceAffinity: 'relaxation',
            tags: ['music', 'jazz', 'evening', 'live music', 'salon']
          }
        },
        {
          id: 'event_002',
          score: 0.75,
          metadata: {
            id: 'event_002',
            title: 'Sunset Yoga Class',
            description: 'Practice yoga during beautiful sunset',
            type: 'activity',
            experienceAffinity: 'wellness',
            tags: ['yoga', 'sunset', 'wellness', 'meditation']
          }
        },
        {
          id: 'event_003',
          score: 0.35, // Below threshold
          metadata: {
            id: 'event_003',
            title: 'Low Affinity Event',
            experienceAffinity: 'entertainment',
            tags: ['dance']
          }
        }
      ];

      mockVectorStore.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockVectorStore.query.mockResolvedValue(mockSearchResults);

      const result = await eventRetriever.retrieveRelevantEventsWithMinAffinity(userPrefs, 0.4, 5);

      // Verify the specific requirements
      expect(result).toHaveLength(2);
      
      // Check first event
      expect(result[0].title).toBe('Live Jazz Evening');
      expect(result[0].score).toBeGreaterThanOrEqual(0.4);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('experienceAffinity');
      expect(result[0]).toHaveProperty('tags');
      
      // Check second event
      expect(result[1].title).toBe('Sunset Yoga Class');
      expect(result[1].score).toBeGreaterThanOrEqual(0.4);
      expect(result[1]).toHaveProperty('id');
      expect(result[1]).toHaveProperty('title');
      expect(result[1]).toHaveProperty('experienceAffinity');
      expect(result[1]).toHaveProperty('tags');

      // Verify search query
      expect(mockVectorStore.generateEmbedding).toHaveBeenCalledWith('culture wellness Mediterranean');
    });
  });
}); 