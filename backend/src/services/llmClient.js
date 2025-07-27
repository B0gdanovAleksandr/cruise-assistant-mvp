const axios = require('axios');
const logger = require('../utils/logger');

class LLMClient {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseURL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 1500;
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7;
    this.timeout = 30000; // 30 seconds timeout for GPT-4
  }

  async enhanceRecommendations(recommendations, context, insights = null) {
    if (!this.apiKey) {
      logger.warn('OpenAI API key not provided, returning original recommendations');
      return recommendations;
    }

    try {
      logger.info('Enhancing recommendations with OpenAI', { 
        recommendationCount: recommendations.recommendations?.length || 0,
        userContext: context,
        hasInsights: !!insights,
        profileStrength: insights?.profileStrength || 0
      });

      // Extract trusted URNs for security
      const trustedURNs = this._extractTrustedURNs(recommendations.recommendations || []);
      logger.info('Extracted trusted URNs', { urnCount: trustedURNs.length });

      const prompt = this.buildEnhancementPrompt(recommendations, context, insights);
    
    // Log the exact prompt for debugging
    logger.info('LLM Prompt being sent:', {
      promptLength: prompt.length,
      recommendationCount: recommendations.recommendations?.length || 0,
      hasInsights: !!insights,
      fullPrompt: prompt // Log the full prompt
    });
    
    // Also write to a temporary file for easy viewing
    const fs = require('fs');
    fs.writeFileSync('/tmp/llm_prompt.txt', `=== LLM PROMPT ===\n${prompt}\n=== END PROMPT ===`);
      
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
        data: error.response?.data,
        model: this.model,
        maxTokens: this.maxTokens,
        temperature: this.temperature
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
    return `You are an expert cruise travel assistant with deep knowledge of luxury travel, cultural experiences, and personalized vacation planning. Your role is to transform Qloo taste profile data into highly personalized, actionable cruise travel recommendations.

**Your Expertise:**
- Luxury cruise experiences and premium travel planning
- Cultural immersion and authentic local experiences
- Fine dining, wine culture, and culinary tourism
- Music, arts, and entertainment onboard and ashore
- Mediterranean, Caribbean, and global cruise destinations
- Budget optimization for luxury travel

**Response Format:**
Provide a comprehensive analysis in this exact JSON structure:

{
  "summary": "A compelling 2-3 sentence explanation of why these experiences perfectly match the user's taste profile and cruise preferences, incorporating specific insights from their Qloo data",
  "personalizedAdvice": [
    "Specific, actionable tip based on their interests and taste profile",
    "Another personalized recommendation leveraging their preferences",
    "Third tip focusing on their budget level and location preferences"
  ],
  "budgetTips": [
    "Smart spending advice for their budget level",
    "Value-optimization tip for their interests",
    "Luxury enhancement suggestion within their budget"
  ],
  "bestTimes": [
    "Optimal timing recommendation for their interests",
    "Seasonal advice for their preferred location",
    "Onboard timing tip for their preferred activities"
  ]
}

**Key Guidelines:**
1. **Personalization**: Use their specific interests, location preferences, and budget level
2. **Taste Profile Integration**: Reference their Qloo insights scores and cross-type relevance
3. **Cultural Context**: Consider Mediterranean culture, fine dining, wine regions, etc.
4. **Practical Value**: Provide specific, actionable advice they can implement
5. **Luxury Focus**: Emphasize premium experiences and sophisticated recommendations
6. **Onboard Integration**: Suggest how to enjoy experiences during the cruise

**Data Utilization:**
- Use entityName, entityId, affinityScore, and crossTypeRelevance for deep personalization
- Leverage insightsScore to prioritize recommendations
- Consider their taste profile strength and preferences
- Reference source entities for context

Make each recommendation feel like it was crafted specifically for this traveler's unique taste profile.`;
  }

  buildEnhancementPrompt(recommendations, context, insights = null) {
    const recs = recommendations.recommendations || [];
    
    // Build enhanced context with insights data
    let enhancedContext = `**User Profile:**
- Interests: ${context.interests.join(', ')}
- Preferred Location: ${context.location}
- Budget Level: ${context.budget}`;

    // Add insights data if available with enhanced entity information
    if (insights && insights.tasteProfile) {
      const profile = insights.tasteProfile;
      enhancedContext += `\n\n**Taste Profile Insights:**
- Profile Strength: ${(insights.profileStrength * 100).toFixed(1)}%
- Top Preferences: ${this._formatInsightsList(profile.preferences)}
- Top Interests: ${this._formatInsightsList(profile.interests)}
- Top Demographics: ${this._formatInsightsList(profile.demographics)}
- Cross-type Insights: ${this._formatCrossTypeInsights(insights.tasteProfile.crossTypeInsights)}`;
      
      // Add entity-specific insights if available
      if (insights.metadata && insights.metadata.sourceEntities) {
        enhancedContext += `\n\n**Source Entities:**
${insights.metadata.sourceEntities.slice(0, 5).map(entity => `- ${entity}`).join('\n')}`;
      }
    }



    // Convert recommendations to structured format with enhanced entity information
    // Limit to top 5 recommendations to reduce prompt size
    const experiences = recs.slice(0, 5).map(rec => {
      // Expand "Various" location based on category
      let expandedLocation = rec.location;
      if (rec.location === 'Various') {
        expandedLocation = this._expandLocation(rec.categories, context.location);
      }
      
      return {
        name: rec.name,
        description: rec.description,
        categories: rec.categories,
        duration: rec.duration,
        priceRange: rec.price_range,
        location: expandedLocation,
        highlights: rec.highlights,
        insightsScore: rec.insightsScore ? (rec.insightsScore * 100).toFixed(1) : null,
        // Add entity-specific information for better prompt injection
        entityName: rec.metadata?.sourceEntityName || null,
        entityId: rec.metadata?.sourceEntityId || null,
        affinityScore: rec.affinity_score ? (rec.affinity_score * 100).toFixed(1) : null,
        crossTypeRelevance: rec.crossTypeRelevance ? (rec.crossTypeRelevance * 100).toFixed(1) : null
      };
    });

    return `{
  "userProfile": {
    "interests": ${JSON.stringify(context.interests)},
    "preferredLocation": "${context.location}",
    "budgetLevel": "${context.budget}"
  },
  "experiences": ${JSON.stringify(experiences, null, 2)}
}

**Analysis Request:**
Based on the user's taste profile and the provided experiences, create a comprehensive recommendation that:
1. Explains why these experiences match their unique preferences
2. Provides specific, actionable advice for their cruise
3. Offers smart budget tips for their luxury level
4. Suggests optimal timing for their interests and location

Focus on creating a truly personalized experience that leverages their Qloo insights data.`;
  }

  parseEnhancement(enhancement) {
    try {
      // Clean the response - remove any markdown formatting
      let cleanedResponse = enhancement.trim();
      
      // Remove markdown code blocks if present
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try to parse as JSON first
      const parsed = JSON.parse(cleanedResponse);
      
      // Check if response is an array (new format) or single object (old format)
      let insightsArray = Array.isArray(parsed) ? parsed : [parsed];
      
      // Validate and process each insight
      const validatedInsights = insightsArray.map((insight, index) => {
        // Validate required fields
        const requiredFields = ['summary', 'personalizedAdvice', 'budgetTips', 'bestTimes'];
        const missingFields = requiredFields.filter(field => !insight[field]);
        
        if (missingFields.length > 0) {
          logger.warn(`Insight ${index} missing required fields`, { missingFields });
          // Fill missing fields with defaults
          missingFields.forEach(field => {
            if (field === 'summary') insight[field] = "These recommendations are tailored to your interests and preferences.";
            else if (field === 'personalizedAdvice') insight[field] = ["Consider booking this experience during your cruise."];
            else if (field === 'budgetTips') insight[field] = ["Look for package deals to save money."];
            else if (field === 'bestTimes') insight[field] = ["Book early to secure the best times."];
          });
        }
        
        return insight;
      });
      
      // Return the first insight for backward compatibility
      return validatedInsights[0] || {
        summary: "These recommendations are tailored to your interests and preferences.",
        personalizedAdvice: ["Consider booking this experience during your cruise."],
        budgetTips: ["Look for package deals to save money."],
        bestTimes: ["Book early to secure the best times."]
      };
    } catch (error) {
      // Fallback to text parsing if JSON parsing fails
      logger.warn('Failed to parse OpenAI response as JSON, using text parsing', { 
        error: error.message,
        response: enhancement.substring(0, 200) + '...'
      });
      
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

  /**
   * Format insights list for prompt injection
   * @param {Object} insights - Insights object
   * @returns {string} - Formatted insights string
   * @private
   */
  _formatInsightsList(insights) {
    if (!insights || Object.keys(insights).length === 0) {
      return 'None available';
    }

    const topItems = Object.entries(insights)
      .sort(([, a], [, b]) => b.avgScore - a.avgScore)
      .slice(0, 3)
      .map(([key, data]) => `${key} (${(data.avgScore * 100).toFixed(0)}%)`);

    return topItems.join(', ');
  }

  /**
   * Format cross-type insights for prompt injection
   * @param {Array} crossTypeInsights - Cross-type insights array
   * @returns {string} - Formatted cross-type insights string
   * @private
   */
  _formatCrossTypeInsights(crossTypeInsights) {
    if (!crossTypeInsights || crossTypeInsights.length === 0) {
      return 'None available';
    }

    return crossTypeInsights
      .map(insight => {
        const score = (insight.data.synergyScore || insight.data.alignmentScore || 0) * 100;
        return `${insight.type} (${score.toFixed(0)}%)`;
      })
      .join(', ');
  }

  /**
   * Expand "Various" location based on category and region
   * @param {Array} categories - Experience categories
   * @param {string} region - User's preferred region
   * @returns {string} - Expanded location
   * @private
   */
  _expandLocation(categories, region) {
    const locationMap = {
      'Wellness': {
        'Mediterranean': 'Barcelona, Santorini, Dubrovnik, Venice',
        'Caribbean': 'St. Barts, St. Lucia, Turks & Caicos, Aruba',
        'default': 'Popular cruise ports worldwide'
      },
      'Adventure': {
        'Mediterranean': 'Barcelona, Naples, Athens, Istanbul',
        'Caribbean': 'Cozumel, St. Maarten, Grand Cayman, Jamaica',
        'default': 'Adventure-friendly cruise destinations'
      },
      'History': {
        'Mediterranean': 'Rome, Athens, Istanbul, Alexandria',
        'Caribbean': 'Havana, San Juan, Santo Domingo, Cartagena',
        'default': 'Historically rich cruise ports'
      },
      'Food': {
        'Mediterranean': 'Barcelona, Naples, Athens, Istanbul',
        'Caribbean': 'St. Martin, Barbados, Jamaica, Puerto Rico',
        'default': 'Culinary-focused cruise destinations'
      }
    };

    // Find matching category
    for (const category of categories) {
      if (locationMap[category]) {
        return locationMap[category][region] || locationMap[category]['default'];
      }
    }

    return 'Popular cruise destinations worldwide';
  }

  /**
   * Validate URN format for security
   * @param {string} urn - URN to validate
   * @returns {boolean} - Whether URN is valid
   * @private
   */
  _validateURN(urn) {
    if (!urn || typeof urn !== 'string') {
      return false;
    }

    // Basic URN validation pattern
    const urnPattern = /^urn:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/;
    return urnPattern.test(urn);
  }

  /**
   * Extract trusted URNs from recommendations
   * @param {Array} recommendations - Recommendations array
   * @returns {Array} - Array of trusted URNs
   * @private
   */
  _extractTrustedURNs(recommendations) {
    const trustedURNs = [];
    
    recommendations.forEach(rec => {
      if (rec.categories && Array.isArray(rec.categories)) {
        rec.categories.forEach(category => {
          if (typeof category === 'object' && category.value && this._validateURN(category.value)) {
            trustedURNs.push(category.value);
          }
        });
      }
    });

    return [...new Set(trustedURNs)]; // Remove duplicates
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