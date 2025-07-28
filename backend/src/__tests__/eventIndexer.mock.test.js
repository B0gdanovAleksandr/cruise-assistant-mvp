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
    query: jest.fn().mockResolvedValue([
      {
        id: 'event_001',
        score: 0.95,
        metadata: {
          title: 'Test Event',
          description: 'Test Description',
          tags: ['test'],
          experienceAffinity: 'test'
        }
      }
    ])
  };

  return {
    VectorStore: jest.fn().mockImplementation(() => mockVectorStore),
    PineconeStore: jest.fn().mockImplementation(() => mockVectorStore)
  };
});

describe('EventIndexer Mock Tests (No API Keys Required)', () => {
  let eventIndexer;
  let testEventsPath;

  beforeAll(() => {
    testEventsPath = path.join(__dirname, '../mock/test-events.json');
  });

  beforeEach(() => {
    eventIndexer = new EventIndexer();
  });

  afterAll(async () => {
    try {
      await fs.unlink(testEventsPath);
    } catch (error) {
      // Ignore deletion errors
    }
  });

  describe('Event Loading and Validation', () => {
    it('should load events from JSON file successfully', async () => {
      const mockEvents = [
        {
          id: 'event_001',
          type: 'entertainment',
          title: 'Test Event',
          description: 'Test Description',
          tags: ['test', 'event'],
          experienceAffinity: 'test'
        }
      ];

      await fs.writeFile(testEventsPath, JSON.stringify(mockEvents, null, 2));

      const result = await eventIndexer.loadEvents(testEventsPath);

      expect(result).toEqual(mockEvents);
    });

    it('should validate event structure correctly', async () => {
      const validEvents = [
        {
          id: 'valid_event_001',
          type: 'dining',
          title: 'Gourmet Dinner',
          description: 'Exclusive dining experience',
          tags: ['dining', 'gourmet', 'exclusive'],
          experienceAffinity: 'luxury'
        }
      ];

      await fs.writeFile(testEventsPath, JSON.stringify(validEvents, null, 2));

      const result = await eventIndexer.loadEvents(testEventsPath);

      expect(result).toEqual(validEvents);
    });

    it('should reject events with missing required fields', async () => {
      const invalidEvents = [
        {
          id: 'invalid_event_001',
          type: 'entertainment',
          title: 'Incomplete Event'
          // missing description, tags, experienceAffinity
        }
      ];

      await fs.writeFile(testEventsPath, JSON.stringify(invalidEvents, null, 2));

      await expect(eventIndexer.loadEvents(testEventsPath)).rejects.toThrow('missing required field');
    });

    it('should reject events with duplicate IDs', async () => {
      const duplicateEvents = [
        {
          id: 'duplicate_id',
          type: 'entertainment',
          title: 'First Event',
          description: 'First event description',
          tags: ['first'],
          experienceAffinity: 'entertainment'
        },
        {
          id: 'duplicate_id', // duplicate ID
          type: 'activity',
          title: 'Second Event',
          description: 'Second event description',
          tags: ['second'],
          experienceAffinity: 'activity'
        }
      ];

      await fs.writeFile(testEventsPath, JSON.stringify(duplicateEvents, null, 2));

      await expect(eventIndexer.loadEvents(testEventsPath)).rejects.toThrow('Duplicate event ID found');
    });

    it('should reject events with non-array tags', async () => {
      const invalidEvents = [
        {
          id: 'invalid_tags_event',
          type: 'entertainment',
          title: 'Event with Invalid Tags',
          description: 'Event description',
          tags: 'not an array', // should be array
          experienceAffinity: 'entertainment'
        }
      ];

      await fs.writeFile(testEventsPath, JSON.stringify(invalidEvents, null, 2));

      await expect(eventIndexer.loadEvents(testEventsPath)).rejects.toThrow('tags field must be an array');
    });

    it('should handle file not found error gracefully', async () => {
      const nonExistentPath = '/path/to/nonexistent/events.json';
      
      await expect(eventIndexer.loadEvents(nonExistentPath)).rejects.toThrow();
    });

    it('should handle invalid JSON format', async () => {
      await fs.writeFile(testEventsPath, 'invalid json content');

      await expect(eventIndexer.loadEvents(testEventsPath)).rejects.toThrow();
    });
  });

  describe('Full Load and Index Cycle (Mocked)', () => {
    it('should successfully load and index events with valid data', async () => {
      const testEvents = [
        {
          id: 'test_event_001',
          type: 'entertainment',
          title: 'Test Jazz Evening',
          description: 'A wonderful jazz evening with live music',
          tags: ['jazz', 'music', 'evening', 'live'],
          experienceAffinity: 'relaxation'
        },
        {
          id: 'test_event_002',
          type: 'activity',
          title: 'Morning Yoga',
          description: 'Start your day with refreshing yoga practice',
          tags: ['yoga', 'morning', 'health', 'wellness'],
          experienceAffinity: 'wellness'
        }
      ];

      await fs.writeFile(testEventsPath, JSON.stringify(testEvents, null, 2));

      const result = await eventIndexer.loadAndIndex(testEventsPath);

      expect(result.status).toBe('OK');
      expect(result.loadedCount).toBeGreaterThan(0);
      expect(result.indexedCount).toBeGreaterThan(0);
      expect(result.loadedCount).toBe(result.indexedCount);
      expect(result.message).toContain('Successfully loaded and indexed');
    });

    it('should return error status when loading fails', async () => {
      const nonExistentPath = '/path/to/nonexistent/events.json';
      
      const result = await eventIndexer.loadAndIndex(nonExistentPath);
      
      expect(result.status).toBe('ERROR');
      expect(result.error).toContain('ENOENT');
      expect(result.message).toBe('Failed to load and index events');
    });
  });

  describe('Event Search Functionality (Mocked)', () => {
    it('should search events by text query', async () => {
      const searchResults = await eventIndexer.searchEvents('jazz music', 3);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0]).toHaveProperty('id');
      expect(searchResults[0]).toHaveProperty('score');
      expect(searchResults[0]).toHaveProperty('metadata');
    });

    it('should use default topK value when not specified', async () => {
      const searchResults = await eventIndexer.searchEvents('test query');
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);
    });
  });

  describe('Default Events Loading', () => {
    it('should load events from default path when no path specified', async () => {
      const events = await eventIndexer.loadEvents();
      
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
      
      // Check structure of first event
      const firstEvent = events[0];
      expect(firstEvent).toHaveProperty('id');
      expect(firstEvent).toHaveProperty('type');
      expect(firstEvent).toHaveProperty('title');
      expect(firstEvent).toHaveProperty('description');
      expect(firstEvent).toHaveProperty('tags');
      expect(firstEvent).toHaveProperty('experienceAffinity');
      expect(Array.isArray(firstEvent.tags)).toBe(true);
    });
  });
}); 