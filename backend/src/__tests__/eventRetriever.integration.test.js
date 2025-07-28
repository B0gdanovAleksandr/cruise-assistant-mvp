const EventRetriever = require('../services/eventRetriever');
const EventIndexer = require('../services/eventIndexer');
const fs = require('fs').promises;
const path = require('path');

// Mock modules that require API keys
jest.mock('../services/vectorStore', () => {
  const mockVectorStore = {
    generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    upsert: jest.fn().mockImplementation((documents) => Promise.resolve({
      status: 'OK',
      upsertedCount: documents.length,
      result: { upsertedCount: documents.length }
    })),
    query: jest.fn().mockImplementation((vector, topK) => {
      // Mock search results based on query context
      const mockResults = [
        {
          id: 'event_009',
          score: 0.85,
          metadata: {
            id: 'event_009',
            title: 'Live Jazz Evening',
            description: 'Experience the soulful sounds of live jazz music in an intimate setting. Perfect for culture enthusiasts and music lovers.',
            type: 'entertainment',
            experienceAffinity: 'relaxation',
            tags: ['jazz', 'music', 'culture', 'live music', 'evening', 'mediterranean']
          }
        },
        {
          id: 'event_010',
          score: 0.75,
          metadata: {
            id: 'event_010',
            title: 'Sunset Yoga Class',
            description: 'Practice yoga during the magical Mediterranean sunset. A perfect blend of wellness and cultural experience.',
            type: 'activity',
            experienceAffinity: 'wellness',
            tags: ['yoga', 'sunset', 'wellness', 'meditation', 'mediterranean', 'culture']
          }
        },
        {
          id: 'event_011',
          score: 0.65,
          metadata: {
            id: 'event_011',
            title: 'Mediterranean History Lecture',
            description: 'Discover the rich history and culture of the Mediterranean region through an engaging lecture by a renowned historian.',
            type: 'education',
            experienceAffinity: 'learning',
            tags: ['history', 'culture', 'mediterranean', 'education', 'lecture']
          }
        },
        {
          id: 'event_012',
          score: 0.55,
          metadata: {
            id: 'event_012',
            title: 'Mediterranean Spa Experience',
            description: 'Indulge in traditional Mediterranean spa treatments using local herbs and techniques.',
            type: 'wellness',
            experienceAffinity: 'relaxation',
            tags: ['spa', 'wellness', 'mediterranean', 'relaxation', 'traditional']
          }
        },
        {
          id: 'event_001',
          score: 0.45,
          metadata: {
            id: 'event_001',
            title: 'Evening Jazz in the Main Salon',
            description: 'Enjoy live jazz music in the elegant atmosphere of the main salon.',
            type: 'entertainment',
            experienceAffinity: 'relaxation',
            tags: ['music', 'jazz', 'evening', 'live music', 'salon']
          }
        }
      ];

      // Return top K results
      return Promise.resolve(mockResults.slice(0, topK));
    })
  };

  return {
    VectorStore: jest.fn().mockImplementation(() => mockVectorStore),
    PineconeStore: jest.fn().mockImplementation(() => mockVectorStore)
  };
});

describe('EventRetriever Integration Tests (Mocked)', () => {
  let eventRetriever;
  let eventIndexer;

  beforeEach(() => {
    eventRetriever = new EventRetriever();
    eventIndexer = new EventIndexer();
  });

  describe('Full Retrieval Pipeline', () => {
    it('should retrieve relevant events for Mediterranean culture and wellness interests', async () => {
      const userPrefs = {
        interests: ['culture', 'wellness'],
        location: 'Mediterranean'
      };

      const results = await eventRetriever.retrieveRelevantEventsWithMinAffinity(userPrefs, 0.4, 5);

      // Verify we get results
      expect(results).toHaveLength(5);
      
      // Check that all results have required fields
      results.forEach(event => {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('title');
        expect(event).toHaveProperty('experienceAffinity');
        expect(event).toHaveProperty('tags');
        expect(event).toHaveProperty('score');
        expect(Array.isArray(event.tags)).toBe(true);
        expect(event.score).toBeGreaterThanOrEqual(0.4);
      });

      // Check specific events are returned
      const eventTitles = results.map(event => event.title);
      expect(eventTitles).toContain('Live Jazz Evening');
      expect(eventTitles).toContain('Sunset Yoga Class');
    });

    it('should filter events with minimum affinity score correctly', async () => {
      const userPrefs = {
        interests: ['culture', 'wellness'],
        location: 'Mediterranean'
      };

      // Test with higher minimum affinity
      const results = await eventRetriever.retrieveRelevantEventsWithMinAffinity(userPrefs, 0.7, 5);

      // Should only return events with score >= 0.7
      expect(results.length).toBeLessThanOrEqual(5);
      
      results.forEach(event => {
        expect(event.score).toBeGreaterThanOrEqual(0.7);
      });
    });

    it('should handle different interest combinations', async () => {
      const testCases = [
        {
          interests: ['music', 'entertainment'],
          location: 'Mediterranean',
          expectedEvents: ['Live Jazz Evening']
        },
        {
          interests: ['wellness', 'health'],
          location: 'Mediterranean',
          expectedEvents: ['Sunset Yoga Class', 'Mediterranean Spa Experience']
        },
        {
          interests: ['education', 'culture'],
          location: 'Mediterranean',
          expectedEvents: ['Mediterranean History Lecture']
        }
      ];

      for (const testCase of testCases) {
        const userPrefs = {
          interests: testCase.interests,
          location: testCase.location
        };

        const results = await eventRetriever.retrieveRelevantEvents(userPrefs, 5);
        
        // Check that expected events are in results
        const eventTitles = results.map(event => event.title);
        testCase.expectedEvents.forEach(expectedEvent => {
          expect(eventTitles).toContain(expectedEvent);
        });
      }
    });
  });

  describe('Data Validation', () => {
    it('should validate user preferences', async () => {
      const invalidPrefs = [
        {},
        { location: 'Mediterranean' },
        null,
        undefined
      ];

      for (const invalidPref of invalidPrefs) {
        await expect(
          eventRetriever.retrieveRelevantEvents(invalidPref)
        ).rejects.toThrow('User preferences must include interests');
      }
    });

    it('should handle empty results gracefully', async () => {
      const userPrefs = {
        interests: ['nonexistent'],
        location: 'Nowhere'
      };

      const results = await eventRetriever.retrieveRelevantEvents(userPrefs, 5);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large topK values', async () => {
      const userPrefs = {
        interests: ['culture', 'wellness'],
        location: 'Mediterranean'
      };

      const results = await eventRetriever.retrieveRelevantEvents(userPrefs, 100);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(100);
    });

    it('should handle single interest', async () => {
      const userPrefs = {
        interests: ['culture'],
        location: 'Mediterranean'
      };

      const results = await eventRetriever.retrieveRelevantEvents(userPrefs, 5);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle empty location', async () => {
      const userPrefs = {
        interests: ['culture', 'wellness'],
        location: ''
      };

      const results = await eventRetriever.retrieveRelevantEvents(userPrefs, 5);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Specific Test Case: Mediterranean with culture and wellness', () => {
    it('should return "Live Jazz Evening" and "Sunset Yoga Class" with affinity >= 0.4', async () => {
      const userPrefs = {
        interests: ['culture', 'wellness'],
        location: 'Mediterranean'
      };

      const results = await eventRetriever.retrieveRelevantEventsWithMinAffinity(userPrefs, 0.4, 5);

      // Verify specific requirements
      expect(results.length).toBeGreaterThanOrEqual(2);
      
      const eventTitles = results.map(event => event.title);
      
      // Check for required events
      expect(eventTitles).toContain('Live Jazz Evening');
      expect(eventTitles).toContain('Sunset Yoga Class');
      
      // Check affinity scores
      const liveJazzEvent = results.find(event => event.title === 'Live Jazz Evening');
      const sunsetYogaEvent = results.find(event => event.title === 'Sunset Yoga Class');
      
      expect(liveJazzEvent.score).toBeGreaterThanOrEqual(0.4);
      expect(sunsetYogaEvent.score).toBeGreaterThanOrEqual(0.4);
      
      // Check required fields
      [liveJazzEvent, sunsetYogaEvent].forEach(event => {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('title');
        expect(event).toHaveProperty('experienceAffinity');
        expect(event).toHaveProperty('tags');
        expect(Array.isArray(event.tags)).toBe(true);
      });
    });
  });
}); 