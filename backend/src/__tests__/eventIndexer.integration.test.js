const EventIndexer = require('../services/eventIndexer');
const fs = require('fs').promises;
const path = require('path');

describe('EventIndexer Integration Tests', () => {
  let eventIndexer;
  let testEventsPath;

  beforeAll(() => {
    // Create temporary file with test events
    testEventsPath = path.join(__dirname, '../mock/test-events.json');
  });

  beforeEach(() => {
    eventIndexer = new EventIndexer();
  });

  afterAll(async () => {
    // Delete temporary file
    try {
      await fs.unlink(testEventsPath);
    } catch (error) {
      // Ignore deletion errors
    }
  });

  describe('Full Load and Index Cycle', () => {
    it('should successfully load and index events with valid data', async () => {
      // Create test events
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

      // Write test events to temporary file
      await fs.writeFile(testEventsPath, JSON.stringify(testEvents, null, 2));

      // Perform loading and indexing
      const result = await eventIndexer.loadAndIndex(testEventsPath);

      // Check result
      expect(result.status).toBe('OK');
      expect(result.loadedCount).toBeGreaterThan(0);
      expect(result.indexedCount).toBeGreaterThan(0);
      expect(result.loadedCount).toBe(result.indexedCount);
      expect(result.message).toContain('Successfully loaded and indexed');
    });

    it('should validate event structure correctly', async () => {
      // Create events with correct structure
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

      const result = await eventIndexer.loadAndIndex(testEventsPath);

      expect(result.status).toBe('OK');
      expect(result.loadedCount).toBe(1);
    });

    it('should reject events with missing required fields', async () => {
      // Create events with missing fields
      const invalidEvents = [
        {
          id: 'invalid_event_001',
          type: 'entertainment',
          title: 'Incomplete Event'
          // missing description, tags, experienceAffinity
        }
      ];

      await fs.writeFile(testEventsPath, JSON.stringify(invalidEvents, null, 2));

      const result = await eventIndexer.loadAndIndex(testEventsPath);

      expect(result.status).toBe('ERROR');
      expect(result.error).toContain('missing required field');
    });

    it('should reject events with duplicate IDs', async () => {
      // Create events with duplicate IDs
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

      const result = await eventIndexer.loadAndIndex(testEventsPath);

      expect(result.status).toBe('ERROR');
      expect(result.error).toContain('Duplicate event ID found');
    });

    it('should reject events with non-array tags', async () => {
      // Create events with incorrect tags format
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

      const result = await eventIndexer.loadAndIndex(testEventsPath);

      expect(result.status).toBe('ERROR');
      expect(result.error).toContain('tags field must be an array');
    });
  });

  describe('Event Loading Validation', () => {
    it('should load events from default path when no path specified', async () => {
      // Check that loadEvents method works with default path
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

    it('should handle file not found error gracefully', async () => {
      const nonExistentPath = '/path/to/nonexistent/events.json';
      
      const result = await eventIndexer.loadAndIndex(nonExistentPath);
      
      expect(result.status).toBe('ERROR');
      expect(result.error).toContain('ENOENT');
    });

    it('should handle invalid JSON format', async () => {
      // Create file with invalid JSON
      await fs.writeFile(testEventsPath, 'invalid json content');

      const result = await eventIndexer.loadAndIndex(testEventsPath);

      expect(result.status).toBe('ERROR');
      expect(result.error).toContain('Unexpected token');
    });
  });

  describe('Event Search Functionality', () => {
    it('should search events by text query', async () => {
      // First load events
      const events = await eventIndexer.loadEvents();
      expect(events.length).toBeGreaterThan(0);

      // Perform search
      const searchResults = await eventIndexer.searchEvents('jazz music', 3);
      
      expect(Array.isArray(searchResults)).toBe(true);
      // Results may be empty if no suitable events
      // but structure should be correct
      if (searchResults.length > 0) {
        expect(searchResults[0]).toHaveProperty('id');
        expect(searchResults[0]).toHaveProperty('score');
        expect(searchResults[0]).toHaveProperty('metadata');
      }
    });

    it('should use default topK value when not specified', async () => {
      const searchResults = await eventIndexer.searchEvents('test query');
      
      // Check that no more than 5 results are returned (default value)
      expect(searchResults.length).toBeLessThanOrEqual(5);
    });
  });
}); 