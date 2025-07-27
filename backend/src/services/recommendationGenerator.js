/**
 * Recommendation Generator Service
 * Generates personalized cruise activities based on user interests and entity data
 */

class RecommendationGenerator {
  constructor() {
    this.activityTemplates = {
      music: [
        {
          title: "Live Jazz Evening",
          description: "Unwind with smooth jazz melodies under the stars",
          emoji: "🎷"
        },
        {
          title: "Classical Concert",
          description: "Experience elegant classical music in the grand theater",
          emoji: "🎻"
        },
        {
          title: "Music Trivia Night",
          description: "Test your music knowledge with fun trivia games",
          emoji: "🎵"
        }
      ],
      food: [
        {
          title: "Cooking Masterclass",
          description: "Learn to prepare authentic local dishes with our chef",
          emoji: "👨‍🍳"
        },
        {
          title: "Wine Tasting Experience",
          description: "Discover fine wines from around the world",
          emoji: "🍷"
        },
        {
          title: "Food & Culture Tour",
          description: "Explore local cuisine and culinary traditions",
          emoji: "🍽️"
        }
      ],
      travel: [
        {
          title: "Port City Walking Tour",
          description: "Discover hidden gems and local history",
          emoji: "🏛️"
        },
        {
          title: "Adventure Excursion",
          description: "Thrilling outdoor activities and exploration",
          emoji: "🏔️"
        },
        {
          title: "Cultural Immersion",
          description: "Connect with local communities and traditions",
          emoji: "🌍"
        }
      ],
      wellness: [
        {
          title: "Sunrise Yoga",
          description: "Start your day with peaceful yoga on deck",
          emoji: "🧘‍♀️"
        },
        {
          title: "Spa & Relaxation",
          description: "Rejuvenate with premium spa treatments",
          emoji: "💆‍♀️"
        },
        {
          title: "Meditation Session",
          description: "Find inner peace with guided meditation",
          emoji: "🕉️"
        }
      ],
      adventure: [
        {
          title: "Rock Climbing",
          description: "Challenge yourself on our onboard climbing wall",
          emoji: "🧗‍♂️"
        },
        {
          title: "Water Sports",
          description: "Exciting aquatic adventures and activities",
          emoji: "🏄‍♂️"
        },
        {
          title: "Zip Line Experience",
          description: "Soar above the ship for breathtaking views",
          emoji: "🪂"
        }
      ],
      history: [
        {
          title: "Historical Lecture",
          description: "Learn about fascinating local history and culture",
          emoji: "📚"
        },
        {
          title: "Archaeological Tour",
          description: "Explore ancient ruins and historical sites",
          emoji: "🏺"
        },
        {
          title: "Museum Visit",
          description: "Discover local artifacts and cultural treasures",
          emoji: "🏛️"
        }
      ]
    };
  }

  /**
   * Generate personalized recommendations based on interests and entities
   * @param {string[]} interests - User interests
   * @param {Array} entities - Entity data from API
   * @param {Array} recommendations - Recommendation data from API
   * @returns {Object} - Generated recommendations
   */
  generateRecommendations(interests, entities = [], recommendations = []) {
    try {
      const generatedActivities = [];
      const usedTemplates = new Set();

      // Process each interest to generate activities
      interests.forEach(interest => {
        const normalizedInterest = this.normalizeInterest(interest);
        const templates = this.activityTemplates[normalizedInterest] || [];

        // Select 1-2 activities per interest, avoiding duplicates
        templates.forEach(template => {
          if (generatedActivities.length >= 5) return; // Max 5 recommendations
          
          const templateKey = `${template.title}-${template.emoji}`;
          if (!usedTemplates.has(templateKey)) {
            usedTemplates.add(templateKey);
            
            // Enhance description based on entities if available
            const enhancedDescription = this.enhanceDescription(
              template.description,
              entities,
              recommendations
            );

            generatedActivities.push({
              title: template.title,
              description: enhancedDescription,
              emoji: template.emoji,
              interest: normalizedInterest
            });
          }
        });
      });

      // If we don't have enough activities, add some general ones
      if (generatedActivities.length < 3) {
        const generalActivities = [
          {
            title: "Sunset Deck Party",
            description: "Celebrate with music, drinks, and stunning ocean views",
            emoji: "🌅"
          },
          {
            title: "Poolside Relaxation",
            description: "Unwind by the pool with refreshing cocktails",
            emoji: "🏊‍♀️"
          },
          {
            title: "Stargazing Night",
            description: "Marvel at the night sky with astronomy guidance",
            emoji: "⭐"
          }
        ];

        generalActivities.forEach(activity => {
          if (generatedActivities.length < 5) {
            const templateKey = `${activity.title}-${activity.emoji}`;
            if (!usedTemplates.has(templateKey)) {
              usedTemplates.add(templateKey);
              generatedActivities.push({
                ...activity,
                interest: 'general'
              });
            }
          }
        });
      }

      // Ensure we have 3-5 recommendations
      const finalRecommendations = generatedActivities.slice(0, 5);

      return {
        recommendations: finalRecommendations,
        metadata: {
          generated: true,
          interestCount: interests.length,
          entityCount: entities.length,
          recommendationCount: finalRecommendations.length,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error generating recommendations:', error);
      
      // Fallback recommendations
      return {
        recommendations: [
          {
            title: "Sunset Deck Party",
            description: "Celebrate with music, drinks, and stunning ocean views",
            emoji: "🌅"
          },
          {
            title: "Poolside Relaxation", 
            description: "Unwind by the pool with refreshing cocktails",
            emoji: "🏊‍♀️"
          },
          {
            title: "Live Music Evening",
            description: "Enjoy live performances in the grand theater",
            emoji: "🎵"
          }
        ],
        metadata: {
          generated: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Normalize interest to match available templates
   * @param {string} interest - Raw interest
   * @returns {string} - Normalized interest
   */
  normalizeInterest(interest) {
    const normalized = interest.toLowerCase().trim();
    
    // Map variations to template keys
    const interestMap = {
      'music': 'music',
      'musical': 'music',
      'jazz': 'music',
      'classical': 'music',
      'food': 'food',
      'cuisine': 'food',
      'cooking': 'food',
      'dining': 'food',
      'travel': 'travel',
      'tourism': 'travel',
      'exploration': 'travel',
      'wellness': 'wellness',
      'health': 'wellness',
      'spa': 'wellness',
      'yoga': 'wellness',
      'adventure': 'adventure',
      'sports': 'adventure',
      'outdoor': 'adventure',
      'history': 'history',
      'historical': 'history',
      'culture': 'history',
      'cultural': 'history'
    };

    return interestMap[normalized] || 'general';
  }

  /**
   * Enhance description based on available entity and recommendation data
   * @param {string} baseDescription - Base template description
   * @param {Array} entities - Entity data
   * @param {Array} recommendations - Recommendation data
   * @returns {string} - Enhanced description
   */
  enhanceDescription(baseDescription, entities, recommendations) {
    let enhanced = baseDescription;

    // If we have entity data, try to personalize more naturally
    if (entities && entities.length > 0) {
      const topEntity = entities[0];
      if (topEntity.name && topEntity.name !== 'Unknown' && topEntity.name !== 'Adventure') {
        // Only add entity name if it's meaningful and not generic
        const entityName = topEntity.name;
        const isGenericName = ['Adventure', 'History', 'Nature', 'Culture', 'Food', 'Music'].includes(entityName);
        
        if (!isGenericName) {
          // Keep description under 150 characters
          const personalized = `${baseDescription} featuring ${entityName}`;
          if (personalized.length <= 150) {
            enhanced = personalized;
          }
        }
      }
    }

    // If we have recommendation data, try to add location context
    if (recommendations && recommendations.length > 0) {
      const topRec = recommendations[0];
      if (topRec.metadata && topRec.metadata.location && topRec.metadata.location !== 'Various') {
        const locationEnhanced = `${enhanced} in ${topRec.metadata.location}`;
        if (locationEnhanced.length <= 150) {
          enhanced = locationEnhanced;
        }
      }
    }

    return enhanced;
  }

  /**
   * Get available interest categories
   * @returns {Array} - List of supported interests
   */
  getAvailableInterests() {
    return Object.keys(this.activityTemplates);
  }

  /**
   * Get activity templates for a specific interest
   * @param {string} interest - Interest category
   * @returns {Array} - Activity templates
   */
  getTemplatesForInterest(interest) {
    const normalized = this.normalizeInterest(interest);
    return this.activityTemplates[normalized] || [];
  }
}

module.exports = RecommendationGenerator; 