const axios = require('axios');
const logger = require('../utils/logger');

class LLMClient {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseURL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 1000;
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7;
    this.timeout = 15000; // 15 seconds timeout
  }

  async enhanceRecommendations(recommendations, context) {
    if (!this.apiKey) {
      logger.warn('OpenAI API key not provided, returning original recommendations');
      return recommendations;
    }

    try {
      logger.info('Enhancing recommendations with OpenAI', { 
        recommendationCount: recommendations.recommendations?.length || 0,
        userContext: context 
      });

      const prompt = this.buildEnhancementPrompt(recommendations, context);
      
      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      const enhancement = response.data.choices[0].message.content;
      logger.info('OpenAI enhancement completed successfully');
      
      return {
        ...recommendations,
        enhanced: true,
        aiInsights: this.parseEnhancement(enhancement),
        personalizedTips: this.extractTips(enhancement),
        enhancementMetadata: {
          model: this.model,
          tokensUsed: response.data.usage?.total_tokens || 0,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('OpenAI enhancement error', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Return original recommendations with fallback message
      return {
        ...recommendations,
        enhanced: false,
        aiInsights: {
          summary: "AI enhancement temporarily unavailable. Showing curated recommendations based on your preferences.",
          personalizedAdvice: [],
          budgetTips: [],
          bestTimes: []
        },
        enhancementMetadata: {
          error: 'OpenAI API unavailable',
          fallback: true,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  getSystemPrompt() {
    return `You are an expert cruise travel advisor with deep knowledge of cruise destinations, activities, and travel planning. 

Your role is to:
1. Analyze cruise recommendations and user preferences
2. Provide personalized insights and practical advice
3. Suggest budget-conscious tips and optimal timing
4. Enhance the travel experience with local knowledge

Always respond in a structured JSON format with the following sections:
- summary: Brief overview of why these recommendations fit the user
- personalizedAdvice: Array of specific tips for each recommendation
- budgetTips: Array of money-saving suggestions
- bestTimes: Array of timing recommendations for activities

Keep responses concise, practical, and enthusiastic about cruise travel.`;
  }

  buildEnhancementPrompt(recommendations, context) {
    const recs = recommendations.recommendations || [];
    
    return `Analyze these cruise recommendations for a traveler with the following preferences:

**User Profile:**
- Interests: ${context.interests.join(', ')}
- Preferred Location: ${context.location}
- Budget Level: ${context.budget}

**Recommendations to Enhance:**
${recs.map((rec, index) => `
${index + 1}. ${rec.name}
   - Description: ${rec.description}
   - Categories: ${rec.categories.join(', ')}
   - Duration: ${rec.duration}
   - Price Range: ${rec.price_range}
   - Location: ${rec.location}
   - Highlights: ${rec.highlights.join(', ')}
`).join('\n')}

Please provide personalized insights in JSON format focusing on:
1. Why these recommendations match the user's interests
2. Specific tips for maximizing each experience
3. Budget-conscious advice for ${context.budget} travelers
4. Best times to book or experience these activities
5. Local insights and hidden gems

Respond only with valid JSON in the specified format.`;
  }

  parseEnhancement(enhancement) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(enhancement);
      return parsed;
    } catch (error) {
      // Fallback to text parsing if JSON parsing fails
      logger.warn('Failed to parse OpenAI response as JSON, using text parsing');
      
      return {
        summary: this.extractSection(enhancement, 'summary') || 
                "These recommendations are tailored to your interests and preferences.",
        personalizedAdvice: this.extractListItems(enhancement, 'advice|tips|recommendations'),
        budgetTips: this.extractListItems(enhancement, 'budget|money|cost|save'),
        bestTimes: this.extractListItems(enhancement, 'time|when|season|timing')
      };
    }
  }

  extractSection(text, sectionName) {
    const regex = new RegExp(`${sectionName}[:\\s]*([^\\n]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  extractListItems(text, keywords) {
    const lines = text.split('\n');
    const keywordRegex = new RegExp(keywords, 'i');
    
    return lines
      .filter(line => keywordRegex.test(line) && (line.includes('-') || line.includes('•') || line.includes('*')))
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(line => line.length > 10)
      .slice(0, 4); // Limit to 4 items
  }

  extractTips(enhancement) {
    const lines = enhancement.split('\n');
    return lines
      .filter(line => 
        (line.toLowerCase().includes('tip') || 
         line.toLowerCase().includes('advice') ||
         line.toLowerCase().includes('recommend')) &&
        line.length > 20
      )
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .slice(0, 5);
  }

  // Method for generating cruise-specific recommendations
  async generateCruiseInsights(userPreferences) {
    if (!this.apiKey) {
      logger.warn('OpenAI API key not provided for cruise insights generation');
      return null;
    }

    try {
      const prompt = `Generate cruise travel insights for a traveler interested in: ${userPreferences.interests.join(', ')} in the ${userPreferences.location} region with a ${userPreferences.budget} budget.

Provide 3-4 specific, actionable insights about cruise travel in this region that match their interests.`;

      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a cruise travel expert. Provide specific, actionable cruise travel insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.8
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error('Failed to generate cruise insights', error);
      return null;
    }
  }
}

module.exports = new LLMClient();