const EventIndexer = require('../services/eventIndexer');
const { PineconeStore } = require('../services/vectorStore');
const fs = require('fs').promises;
const path = require('path');

// Mock for PineconeStore
jest.mock('../services/vectorStore');

describe('EventIndexer', () => {
  let eventIndexer;
  let mockVectorStore;

  beforeEach(() => {
    // Create mock for vector store
    mockVectorStore = {
      upsert: jest.fn(),
      generateEmbedding: jest.fn(),
      query: jest.fn()
    };

    // Mock PineconeStore constructor
    PineconeStore.mockImplementation(() => mockVectorStore);

    eventIndexer = new EventIndexer(mockVectorStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadEvents', () => {
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

      // Mock fs.readFile
      jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockEvents));

      const result = await eventIndexer.loadEvents();

      expect(result).toEqual(mockEvents);
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('events.json'),
        'utf8'
      );
    });

    it('should throw error for invalid JSON', async () => {
      jest.spyOn(fs, 'readFile').mockResolvedValue('invalid json');

      await expect(eventIndexer.loadEvents()).rejects.toThrow();
    });

    it('should throw error for missing required fields', async () => {
      const invalidEvents = [
        {
          id: 'event_001',
          type: 'entertainment',
          title: 'Test Event'
          // missing description, tags, experienceAffinity
        }
      ];

      jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(invalidEvents));

      await expect(eventIndexer.loadEvents()).rejects.toThrow('missing required field');
    });

    it('should throw error for duplicate IDs', async () => {
      const duplicateEvents = [
        {
          id: 'event_001',
          type: 'entertainment',
          title: 'Test Event 1',
          description: 'Test Description 1',
          tags: ['test'],
          experienceAffinity: 'test'
        },
        {
          id: 'event_001', // duplicate ID
          type: 'entertainment',
          title: 'Test Event 2',
          description: 'Test Description 2',
          tags: ['test'],
          experienceAffinity: 'test'
        }
      ];

      jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(duplicateEvents));

      await expect(eventIndexer.loadEvents()).rejects.toThrow('Duplicate event ID found');
    });

    it('should throw error if tags is not an array', async () => {
      const invalidEvents = [
        {
          id: 'event_001',
          type: 'entertainment',
          title: 'Test Event',
          description: 'Test Description',
          tags: 'not an array', // should be array
          experienceAffinity: 'test'
        }
      ];

      jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(invalidEvents));

      await expect(eventIndexer.loadEvents()).rejects.toThrow('tags field must be an array');
    });
  });

  describe('indexEvents', () => {
    it('should index events successfully', async () => {
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

      const mockUpsertResult = {
        status: 'OK',
        upsertedCount: 1,
        result: { upsertedCount: 1 }
      };

      mockVectorStore.upsert.mockResolvedValue(mockUpsertResult);

      const result = await eventIndexer.indexEvents(mockEvents);

      expect(result).toEqual(mockUpsertResult);
      expect(mockVectorStore.upsert).toHaveBeenCalledWith(mockEvents);
    });

    it('should handle indexing errors', async () => {
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

      const error = new Error('Indexing failed');
      mockVectorStore.upsert.mockRejectedValue(error);

      await expect(eventIndexer.indexEvents(mockEvents)).rejects.toThrow('Indexing failed');
    });
  });

  describe('loadAndIndex', () => {
    it('should load and index events successfully', async () => {
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

      const mockUpsertResult = {
        status: 'OK',
        upsertedCount: 1,
        result: { upsertedCount: 1 }
      };

      jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockEvents));
      mockVectorStore.upsert.mockResolvedValue(mockUpsertResult);

      const result = await eventIndexer.loadAndIndex();

      expect(result).toEqual({
        status: 'OK',
        loadedCount: 1,
        indexedCount: 1,
        message: 'Successfully loaded and indexed 1 events'
      });
    });

    it('should return error status when loading fails', async () => {
      jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('File not found'));

      const result = await eventIndexer.loadAndIndex();

      expect(result.status).toBe('ERROR');
      expect(result.error).toBe('File not found');
      expect(result.message).toBe('Failed to load and index events');
    });

    it('should return error status when indexing fails', async () => {
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

      jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockEvents));
      mockVectorStore.upsert.mockRejectedValue(new Error('Indexing failed'));

      const result = await eventIndexer.loadAndIndex();

      expect(result.status).toBe('ERROR');
      expect(result.error).toBe('Indexing failed');
      expect(result.message).toBe('Failed to load and index events');
    });
  });

  describe('searchEvents', () => {
    it('should search events successfully', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockQueryResults = [
        {
          id: 'event_001',
          score: 0.95,
          metadata: {
            title: 'Test Event',
            description: 'Test Description'
          }
        }
      ];

      mockVectorStore.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockVectorStore.query.mockResolvedValue(mockQueryResults);

      const result = await eventIndexer.searchEvents('test query', 3);

      expect(result).toEqual([
        {
          id: 'event_001',
          score: 0.95,
          metadata: {
            title: 'Test Event',
            description: 'Test Description'
          }
        }
      ]);

      expect(mockVectorStore.generateEmbedding).toHaveBeenCalledWith('test query');
      expect(mockVectorStore.query).toHaveBeenCalledWith(mockEmbedding, 3);
    });

    it('should use default topK value when not specified', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockVectorStore.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockVectorStore.query.mockResolvedValue([]);

      await eventIndexer.searchEvents('test query');

      expect(mockVectorStore.query).toHaveBeenCalledWith(mockEmbedding, 5);
    });
  });
}); 