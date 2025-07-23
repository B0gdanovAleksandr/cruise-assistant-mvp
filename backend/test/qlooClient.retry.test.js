const axios = require('axios');
const qlooClient = require('../src/services/qlooClient').instance;

// Mock axios
jest.mock('axios');

describe('QlooClient Retry Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Force API mode for tests
    qlooClient.apiKey = 'test-api-key';
    qlooClient.useMock = false;
  });

  describe('searchEntities retry', () => {
    test('should retry on 5xx errors and eventually succeed', async () => {
      // Mock 500 error twice, then success
      axios.get
        .mockRejectedValueOnce({ response: { status: 500 }, message: 'Internal Server Error' })
        .mockRejectedValueOnce({ response: { status: 502 }, message: 'Bad Gateway' })
        .mockResolvedValueOnce({
          data: {
            results: [
              { id: 'entity1', name: 'Entity 1' },
              { id: 'entity2', name: 'Entity 2' }
            ]
          }
        });

      const result = await qlooClient.searchEntities(['test']);

      expect(result).toEqual(['entity1', 'entity2']);
      expect(axios.get).toHaveBeenCalledTimes(3);
    });

    test('should retry on network errors and eventually succeed', async () => {
      // Mock network errors twice, then success
      axios.get
        .mockRejectedValueOnce({ code: 'ECONNRESET', message: 'Connection reset' })
        .mockRejectedValueOnce({ code: 'ETIMEDOUT', message: 'Connection timeout' })
        .mockResolvedValueOnce({
          data: {
            results: [
              { id: 'entity1', name: 'Entity 1' }
            ]
          }
        });

      const result = await qlooClient.searchEntities(['test']);

      expect(result).toEqual(['entity1']);
      expect(axios.get).toHaveBeenCalledTimes(3);
    });

    test('should not retry on 4xx errors', async () => {
      // Mock 404 error (not retryable)
      axios.get.mockRejectedValueOnce({ 
        response: { status: 404 }, 
        message: 'Not Found' 
      });

      const result = await qlooClient.searchEntities(['test']);

      expect(result).toEqual([]);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('should fail after max retries', async () => {
      // Mock 500 errors for all attempts
      axios.get
        .mockRejectedValue({ response: { status: 500 }, message: 'Internal Server Error' });

      const result = await qlooClient.searchEntities(['test']);

      expect(result).toEqual([]);
      expect(axios.get).toHaveBeenCalledTimes(4); // Initial + 3 retries
    }, 15000); // 15 second timeout
  });

  describe('getRecommendations retry', () => {
    test('should retry on 5xx errors and eventually succeed', async () => {
      // Mock 500 error twice, then success
      axios.get
        .mockRejectedValueOnce({ response: { status: 500 }, message: 'Internal Server Error' })
        .mockRejectedValueOnce({ response: { status: 503 }, message: 'Service Unavailable' })
        .mockResolvedValueOnce({
          data: {
            results: [
              { 
                id: 'rec1', 
                name: 'Recommendation 1',
                type: 'activity',
                relevance_score: 0.95
              }
            ]
          }
        });

      const result = await qlooClient.getRecommendations(['entity1']);

      expect(result.metadata.source).toBe('qloo');
      expect(result.recommendations).toHaveLength(1);
      expect(axios.get).toHaveBeenCalledTimes(3);
    }, 10000); // 10 second timeout

    test('should retry on rate limiting (429)', async () => {
      // Mock 429 error twice, then success
      axios.get
        .mockRejectedValueOnce({ response: { status: 429 }, message: 'Too Many Requests' })
        .mockRejectedValueOnce({ response: { status: 429 }, message: 'Too Many Requests' })
        .mockResolvedValueOnce({
          data: {
            results: [
              { 
                id: 'rec1', 
                name: 'Recommendation 1',
                type: 'activity',
                relevance_score: 0.95
              }
            ]
          }
        });

      const result = await qlooClient.getRecommendations(['entity1']);

      expect(result.metadata.source).toBe('qloo');
      expect(axios.get).toHaveBeenCalledTimes(3);
    }, 10000); // 10 second timeout

    test('should not retry on 4xx errors (except 429)', async () => {
      // Mock 400 error (not retryable)
      axios.get.mockRejectedValueOnce({ 
        response: { status: 400 }, 
        message: 'Bad Request' 
      });

      const result = await qlooClient.getRecommendations(['entity1']);

      expect(result.metadata.fallback).toBe(true);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('should handle timeout errors', async () => {
      // Mock timeout error twice, then success
      axios.get
        .mockRejectedValueOnce({ code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' })
        .mockRejectedValueOnce({ message: 'timeout of 5000ms exceeded' })
        .mockResolvedValueOnce({
          data: {
            results: [
              { 
                id: 'rec1', 
                name: 'Recommendation 1',
                type: 'activity',
                relevance_score: 0.95
              }
            ]
          }
        });

      const result = await qlooClient.getRecommendations(['entity1']);

      expect(result.metadata.source).toBe('qloo');
      expect(axios.get).toHaveBeenCalledTimes(3);
    }, 10000); // 10 second timeout
  });

  describe('retry configuration', () => {
    test('should use exponential backoff delays', async () => {
      const startTime = Date.now();
      
      // Mock 500 errors for all attempts
      axios.get.mockRejectedValue({ 
        response: { status: 500 }, 
        message: 'Internal Server Error' 
      });

      await qlooClient.searchEntities(['test']);

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should have delays: 1s + 2s + 4s = 7s minimum
      expect(totalTime).toBeGreaterThan(7000);
      expect(axios.get).toHaveBeenCalledTimes(4);
    }, 15000); // 15 second timeout

    test('should cap delay at maximum value', async () => {
      const startTime = Date.now();
      
      // Mock many 500 errors to test max delay cap
      axios.get.mockRejectedValue({ 
        response: { status: 500 }, 
        message: 'Internal Server Error' 
      });

      await qlooClient.searchEntities(['test']);

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should not exceed reasonable time (max delay is 8s)
      expect(totalTime).toBeLessThan(30000);
    }, 35000); // 35 second timeout
  });
}); 