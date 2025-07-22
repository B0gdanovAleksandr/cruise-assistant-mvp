const axios = require('axios');
const logger = require('../utils/logger');

class LLMClient {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
  }

  async enhanceRecommendations(recommendations, context) {
    if (!this.apiKey) {
      logger.warn('OpenAI API key not provided, returning original recommendations');
      return recommendations;
    }

    try {
      const prompt = this.buildPrompt(recommendations, context);
      
      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a cruise travel assistant. Enhance travel recommendations with personalized insights and practical tips.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const enhancement = response.data.choices[0].message.content;
      
      return {
        ...recommendations,
        enhanced: true,
        insights: enhancement,
        personalizedTips: this.extractTips(enhancement)
      };

    } catch (error) {
      logger.error('LLM enhancement error', error);
      return recommendations; // Return original if enhancement fails
    }
  }

  buildPrompt(recommendations, context) {
    return `
Based on these travel recommendations and user context, provide personalized insights:

User Interests: ${context.interests.join(', ')}
Location: ${context.location}
Budget: ${context.budget}

Recommendations:
${JSON.stringify(recommendations, null, 2)}

Please provide:
1. Why these recommendations fit the user's interests
2. Practical tips for each recommendation
3. Budget-conscious advice
4. Best times to visit/experience these recommendations
`;
  }

  extractTips(enhancement) {
    // Simple extraction of tips from LLM response
    const lines = enhancement.split('\n');
    return lines
      .filter(line => line.includes('tip') || line.includes('advice'))
      .slice(0, 3);
  }
}

module.exports = new LLMClient();