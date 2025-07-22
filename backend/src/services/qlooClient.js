const axios = require('axios');
const logger = require('../utils/logger');
const mockData = require('../mock/qlooMock.json');

class QlooClient {
  constructor() {
    this.apiKey = process.env.QLOO_API_KEY;
    this.baseURL = 'https://api.qloo.com/v1';
    this.useMock = !this.apiKey || process.env.NODE_ENV === 'development';
  }

  async getRecommendations({ interests, location, budget }) {
    if (this.useMock) {
      logger.info('Using mock Qloo data');
      return this.getMockRecommendations({ interests, location, budget });
    }

    try {
      const response = await axios.post(`${this.baseURL}/recommendations`, {
        interests,
        location,
        budget,
        category: 'travel'
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      logger.error('Qloo API error', error);
      // Fallback to mock data
      return this.getMockRecommendations({ interests, location, budget });
    }
  }

  getMockRecommendations({ interests, location, budget }) {
    // Filter mock data based on interests
    const filtered = mockData.recommendations.filter(rec => 
      interests.some(interest => 
        rec.categories.includes(interest.toLowerCase())
      )
    );

    return {
      recommendations: filtered.slice(0, 5),
      metadata: {
        source: 'mock',
        location,
        budget
      }
    };
  }
}

module.exports = new QlooClient();