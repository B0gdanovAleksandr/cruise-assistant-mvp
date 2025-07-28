const logger = require('../utils/logger');

class EnhancedPromptGenerator {
  constructor() {
    this.maxTokens = 800; // Увеличить лимит для более детальных промптов
  }

  /**
   * Generates an enhanced GPT-4 compatible prompt with citation requirements
   * @param {Array} retrievedEvents - array of retrieved events
   * @param {Object} userPrefs - user preferences object
   * @param {Array} userPrefs.interests - array of user interests
   * @param {string} userPrefs.location - user location/cruise region
   * @returns {string} generated prompt
   */
  generateRecommendationPrompt(retrievedEvents, userPrefs) {
    try {
      if (!retrievedEvents || !Array.isArray(retrievedEvents) || retrievedEvents.length === 0) {
        throw new Error('Retrieved events must be a non-empty array');
      }

      if (!userPrefs || !userPrefs.interests) {
        throw new Error('User preferences must include interests');
      }

      // Build the enhanced prompt components
      const eventsList = this.formatEventsWithMetadata(retrievedEvents);
      const userProfile = this.formatDetailedUserProfile(userPrefs);
      const instruction = this.getEnhancedInstruction();
      const validationRules = this.getValidationRules();

      // Combine all components
      const fullPrompt = `${eventsList}\n\n${userProfile}\n\n${instruction}\n\n${validationRules}`;

      // Check token limit
      const estimatedTokens = this.estimateTokens(fullPrompt);
      if (estimatedTokens > this.maxTokens) {
        logger.warn(`Prompt exceeds ${this.maxTokens} tokens (${estimatedTokens}), truncating...`);
        return this.truncatePrompt(fullPrompt);
      }

      logger.info(`Generated enhanced prompt with ${estimatedTokens} estimated tokens`, {
        eventsCount: retrievedEvents.length,
        hasValidationRules: true,
        hasCitationRequirements: true
      });
      
      return fullPrompt;

    } catch (error) {
      logger.error('Error generating enhanced recommendation prompt:', error);
      throw error;
    }
  }

  /**
   * Formats the list of retrieved events with detailed metadata
   * @param {Array} events - array of events
   * @returns {string} formatted events list
   */
  formatEventsWithMetadata(events) {
    const eventLines = events.map((event, index) => {
      const affinity = event.score ? `(affinity: ${event.score.toFixed(3)})` : '';
      const tags = event.tags && Array.isArray(event.tags) ? `[${event.tags.slice(0, 3).join(', ')}]` : '';
      const experienceAffinity = event.experienceAffinity ? `(experience: ${event.experienceAffinity})` : '';
      
      return `${index + 1}. [ID: ${event.id}] ${event.title} - ${event.type} ${affinity} ${experienceAffinity} ${tags}`;
    });

    return `Available Events:\n${eventLines.join('\n')}`;
  }

  /**
   * Formats detailed user profile section
   * @param {Object} userPrefs - user preferences
   * @returns {string} formatted user profile
   */
  formatDetailedUserProfile(userPrefs) {
    const interests = Array.isArray(userPrefs.interests) 
      ? userPrefs.interests.join(', ') 
      : userPrefs.interests;
    
    const location = userPrefs.location || 'cruise';
    const budget = userPrefs.budget ? `Budget: ${userPrefs.budget}` : '';
    const preferences = userPrefs.preferences ? `Preferences: ${userPrefs.preferences}` : '';
    
    return `User Profile:
- Interests: ${interests}
- Location: ${location}
${budget ? `- ${budget}` : ''}
${preferences ? `- ${preferences}` : ''}`;
  }

  /**
   * Gets the enhanced recommendation instruction with citation requirements
   * @returns {string} enhanced instruction text
   */
  getEnhancedInstruction() {
    return `You are an expert cruise travel assistant. Generate personalized recommendations based on the provided events and user preferences.

**CRITICAL REQUIREMENTS:**
1. **Faithfulness**: Every recommendation MUST cite specific event IDs
2. **Grounding**: All claims must be supported by provided events
3. **Personalization**: Tailor recommendations to user's specific interests
4. **Structured Output**: Use exact JSON format with citations

**Response Format:**
{
  "recommendations": [
    {
      "id": "rec_1",
      "title": "Recommendation title",
      "description": "Detailed description",
      "originEventId": "event_001", // REQUIRED citation
      "personalizedAdvice": "Specific advice",
      "timing": "Best time to experience this",
      "confidence": "high|medium|low",
      "grounding": ["event_001", "event_002"] // Supporting events
    }
  ],
  "aiInsights": [
    {
      "id": "insight_1",
      "type": "timing|location|combination|personal",
      "title": "Insight title",
      "description": "Insight description",
      "supportingEvents": ["event_001", "event_002"],
      "relevance": "high|medium|low"
    }
  ],
  "faithfulness_score": 0.95, // Self-assessment
  "grounding_validation": {
    "all_claims_supported": true,
    "citation_coverage": 1.0,
    "fact_check_passed": true
  }
}`;
  }

  /**
   * Gets validation rules for faithfulness and grounding
   * @returns {string} validation rules
   */
  getValidationRules() {
    return `**VALIDATION RULES (MUST FOLLOW):**
1. **Citation Required**: Every recommendation MUST have originEventId
2. **Grounding Required**: All claims must be supported by provided events
3. **No Hallucination**: Do not add information not present in events
4. **Personalization**: Base recommendations on user preferences
5. **Structured Output**: Use exact JSON format specified above
6. **Self-Assessment**: Provide faithfulness_score and grounding_validation
7. **Fact Checking**: Verify all factual statements against provided events`;
  }

  /**
   * Estimates token count for a given text
   * @param {string} text - text to estimate tokens for
   * @returns {number} estimated token count
   */
  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncates prompt to fit within token limit
   * @param {string} prompt - full prompt
   * @returns {string} truncated prompt
   */
  truncatePrompt(prompt) {
    const maxChars = this.maxTokens * 4; // Convert tokens to characters
    
    if (prompt.length <= maxChars) {
      return prompt;
    }

    // Try to truncate events list while keeping essential parts
    const parts = prompt.split('\n\n');
    const eventsList = parts[0];
    const userProfile = parts[1];
    const instruction = parts[2];
    const validationRules = parts[3];

    // Calculate available space for events list
    const otherParts = `${userProfile}\n\n${instruction}\n\n${validationRules}`;
    const availableForEvents = maxChars - otherParts.length - 10; // Buffer

    if (availableForEvents <= 0) {
      // If even other parts are too long, truncate everything
      return prompt.substring(0, maxChars - 3) + '...';
    }

    // Truncate events list
    const truncatedEvents = this.truncateEventsList(eventsList, availableForEvents);
    
    return `${truncatedEvents}\n\n${userProfile}\n\n${instruction}\n\n${validationRules}`;
  }

  /**
   * Truncates events list to fit within character limit
   * @param {string} eventsList - events list text
   * @param {number} maxChars - maximum characters
   * @returns {string} truncated events list
   */
  truncateEventsList(eventsList, maxChars) {
    if (eventsList.length <= maxChars) {
      return eventsList;
    }

    const lines = eventsList.split('\n');
    const header = lines[0]; // "Available Events:"
    const eventLines = lines.slice(1);

    let result = header + '\n';
    let currentLength = result.length;

    for (const line of eventLines) {
      if (currentLength + line.length + 1 <= maxChars - 10) { // Leave space for "..."
        result += line + '\n';
        currentLength += line.length + 1;
      } else {
        result += '...';
        break;
      }
    }

    return result.trim();
  }

  /**
   * Generates a compact prompt for quick recommendations
   * @param {Array} retrievedEvents - array of retrieved events
   * @param {Object} userPrefs - user preferences
   * @returns {string} compact prompt
   */
  generateCompactPrompt(retrievedEvents, userPrefs) {
    try {
      // Take only top 3 events for compact version
      const topEvents = retrievedEvents.slice(0, 3);
      
      const eventsText = topEvents.map((event, index) => 
        `${index + 1}. [${event.id}] ${event.title} (${event.type})`
      ).join('; ');

      const interests = Array.isArray(userPrefs.interests) 
        ? userPrefs.interests.join(', ') 
        : userPrefs.interests;

      const location = userPrefs.location || 'cruise';

      const prompt = `Events: ${eventsText}. User: ${interests} in ${location}. 
Recommend with advice, timing, and cite originEventId for each recommendation.`;

      const estimatedTokens = this.estimateTokens(prompt);
      logger.info(`Generated compact prompt with ${estimatedTokens} estimated tokens`);

      return prompt;

    } catch (error) {
      logger.error('Error generating compact prompt:', error);
      throw error;
    }
  }

  /**
   * Generates a detailed prompt with additional context
   * @param {Array} retrievedEvents - array of retrieved events
   * @param {Object} userPrefs - user preferences
   * @param {Object} options - additional options
   * @returns {string} detailed prompt
   */
  generateDetailedPrompt(retrievedEvents, userPrefs, options = {}) {
    try {
      const includeTags = options.includeTags !== false;
      const includeAffinity = options.includeAffinity !== false;
      const maxEvents = options.maxEvents || 5;

      const topEvents = retrievedEvents.slice(0, maxEvents);
      
      const eventLines = topEvents.map((event, index) => {
        let line = `${index + 1}. [${event.id}] ${event.title} - ${event.type}`;
        
        if (includeAffinity && event.score) {
          line += ` (affinity: ${event.score.toFixed(3)})`;
        }
        
        if (includeTags && event.tags && Array.isArray(event.tags)) {
          line += ` [${event.tags.slice(0, 3).join(', ')}]`;
        }
        
        return line;
      });

      const eventsList = `Available Events:\n${eventLines.join('\n')}`;
      const userProfile = this.formatDetailedUserProfile(userPrefs);
      const instruction = this.getEnhancedInstruction();
      const validationRules = this.getValidationRules();

      const fullPrompt = `${eventsList}\n\n${userProfile}\n\n${instruction}\n\n${validationRules}`;
      
      const estimatedTokens = this.estimateTokens(fullPrompt);
      logger.info(`Generated detailed prompt with ${estimatedTokens} estimated tokens`);

      return fullPrompt;

    } catch (error) {
      logger.error('Error generating detailed prompt:', error);
      throw error;
    }
  }

  /**
   * Validates prompt structure and requirements
   * @param {string} prompt - generated prompt
   * @returns {Object} validation result
   */
  validatePrompt(prompt) {
    const validation = {
      isValid: true,
      issues: [],
      tokenCount: this.estimateTokens(prompt),
      hasCitationRequirements: prompt.includes('originEventId'),
      hasValidationRules: prompt.includes('VALIDATION RULES'),
      hasFaithfulnessScore: prompt.includes('faithfulness_score'),
      hasGroundingValidation: prompt.includes('grounding_validation')
    };

    if (validation.tokenCount > this.maxTokens) {
      validation.isValid = false;
      validation.issues.push(`Token count (${validation.tokenCount}) exceeds limit (${this.maxTokens})`);
    }

    if (!validation.hasCitationRequirements) {
      validation.isValid = false;
      validation.issues.push('Missing citation requirements');
    }

    if (!validation.hasValidationRules) {
      validation.isValid = false;
      validation.issues.push('Missing validation rules');
    }

    return validation;
  }
}

module.exports = EnhancedPromptGenerator; 