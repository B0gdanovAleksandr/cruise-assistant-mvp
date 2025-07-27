/**
 * Insights Aggregator Service
 * Aggregates insights from multiple entities to build comprehensive taste profiles
 * and enhance recommendation quality through cross-type analysis
 */

const logger = require('../utils/logger');

class InsightsAggregator {
  constructor() {
    this.aggregationWeights = {
      preferences: 0.3,
      demographics: 0.2,
      interests: 0.25,
      behaviors: 0.15,
      affinities: 0.1
    };

    this.crossTypeMapping = {
      brand: ['preferences', 'demographics'],
      place: ['interests', 'behaviors'],
      tag: ['interests', 'affinities'],
      audience: ['demographics', 'behaviors']
    };
  }

  /**
   * Aggregate insights from multiple entities
   * @param {Array} insightsData - Array of insights from different entities
   * @returns {Object} - Aggregated taste profile
   */
  aggregateInsights(insightsData) {
    if (!insightsData || !Array.isArray(insightsData) || insightsData.length === 0) {
      logger.warn('No insights data provided for aggregation');
      return this._getDefaultTasteProfile();
    }

    logger.info('Aggregating insights from multiple entities', {
      entityCount: insightsData.length
    });

    try {
      const aggregatedProfile = {
        preferences: this._aggregateByType(insightsData, 'preferences'),
        demographics: this._aggregateByType(insightsData, 'demographics'),
        interests: this._aggregateByType(insightsData, 'interests'),
        behaviors: this._aggregateByType(insightsData, 'behaviors'),
        affinities: this._aggregateByType(insightsData, 'affinities'),
        crossTypeInsights: this._generateCrossTypeInsights(insightsData)
      };

      // Calculate overall profile strength
      const profileStrength = this._calculateProfileStrength(aggregatedProfile);

      const result = {
        tasteProfile: aggregatedProfile,
        profileStrength,
        metadata: {
          sourceEntities: insightsData.map(insight => insight.sourceEntityId),
          entityCount: insightsData.length,
          aggregationTimestamp: new Date().toISOString()
        }
      };

      logger.info('Insights aggregation completed', {
        profileStrength,
        preferenceCount: Object.keys(aggregatedProfile.preferences).length,
        demographicCount: Object.keys(aggregatedProfile.demographics).length,
        interestCount: Object.keys(aggregatedProfile.interests).length,
        behaviorCount: Object.keys(aggregatedProfile.behaviors).length,
        affinityCount: Object.keys(aggregatedProfile.affinities).length,
        crossTypeCount: aggregatedProfile.crossTypeInsights.length
      });

      return result;
    } catch (error) {
      logger.error('Insights aggregation failed', error);
      return this._getDefaultTasteProfile();
    }
  }

  /**
   * Aggregate data by type (preferences, demographics, etc.)
   * @param {Array} insightsData - Insights data array
   * @param {string} type - Type of data to aggregate
   * @returns {Object} - Aggregated data
   * @private
   */
  _aggregateByType(insightsData, type) {
    const aggregated = {};

    insightsData.forEach(insight => {
      if (insight[type] && typeof insight[type] === 'object') {
        Object.entries(insight[type]).forEach(([key, value]) => {
          if (!aggregated[key]) {
            aggregated[key] = {
              values: [],
              totalScore: 0,
              count: 0,
              avgScore: 0
            };
          }

          const score = value.score || 0.5;
          aggregated[key].values.push(value);
          aggregated[key].totalScore += score;
          aggregated[key].count += 1;
          aggregated[key].avgScore = aggregated[key].totalScore / aggregated[key].count;
        });
      }
    });

    // Sort by average score and return top items
    return Object.entries(aggregated)
      .sort(([, a], [, b]) => b.avgScore - a.avgScore)
      .slice(0, 10)
      .reduce((acc, [key, data]) => {
        acc[key] = data;
        return acc;
      }, {});
  }

  /**
   * Generate cross-type insights by analyzing relationships between different entity types
   * @param {Array} insightsData - Insights data array
   * @returns {Array} - Cross-type insights
   * @private
   */
  _generateCrossTypeInsights(insightsData) {
    const crossTypeInsights = [];

    // Analyze brand-place relationships
    const brandInsights = insightsData.filter(insight => 
      insight.sourceEntityId && insight.sourceEntityId.includes('brand')
    );
    const placeInsights = insightsData.filter(insight => 
      insight.sourceEntityId && insight.sourceEntityId.includes('place')
    );

    if (brandInsights.length > 0 && placeInsights.length > 0) {
      const brandPreferences = this._extractTopValues(brandInsights, 'preferences');
      const placeInterests = this._extractTopValues(placeInsights, 'interests');

      crossTypeInsights.push({
        type: 'brand_place_synergy',
        description: 'Brand preferences align with place interests',
        data: {
          brandPreferences,
          placeInterests,
          synergyScore: this._calculateSynergyScore(brandPreferences, placeInterests)
        }
      });
    }

    // Analyze audience-tag relationships
    const audienceInsights = insightsData.filter(insight => 
      insight.sourceEntityId && insight.sourceEntityId.includes('audience')
    );
    const tagInsights = insightsData.filter(insight => 
      insight.sourceEntityId && insight.sourceEntityId.includes('tag')
    );

    if (audienceInsights.length > 0 && tagInsights.length > 0) {
      const audienceDemographics = this._extractTopValues(audienceInsights, 'demographics');
      const tagAffinities = this._extractTopValues(tagInsights, 'affinities');

      crossTypeInsights.push({
        type: 'audience_tag_alignment',
        description: 'Audience demographics align with tag affinities',
        data: {
          audienceDemographics,
          tagAffinities,
          alignmentScore: this._calculateAlignmentScore(audienceDemographics, tagAffinities)
        }
      });
    }

    return crossTypeInsights;
  }

  /**
   * Extract top values from insights by type
   * @param {Array} insights - Insights array
   * @param {string} type - Type to extract
   * @returns {Array} - Top values
   * @private
   */
  _extractTopValues(insights, type) {
    const values = [];
    insights.forEach(insight => {
      if (insight[type]) {
        Object.entries(insight[type]).forEach(([key, value]) => {
          values.push({ key, value, score: value.score || 0.5 });
        });
      }
    });

    return values
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  /**
   * Calculate synergy score between brand preferences and place interests
   * @param {Array} brandPreferences - Brand preferences
   * @param {Array} placeInterests - Place interests
   * @returns {number} - Synergy score
   * @private
   */
  _calculateSynergyScore(brandPreferences, placeInterests) {
    if (brandPreferences.length === 0 || placeInterests.length === 0) {
      return 0;
    }

    const avgBrandScore = brandPreferences.reduce((sum, item) => sum + item.score, 0) / brandPreferences.length;
    const avgPlaceScore = placeInterests.reduce((sum, item) => sum + item.score, 0) / placeInterests.length;

    return (avgBrandScore + avgPlaceScore) / 2;
  }

  /**
   * Calculate alignment score between audience demographics and tag affinities
   * @param {Array} audienceDemographics - Audience demographics
   * @param {Array} tagAffinities - Tag affinities
   * @returns {number} - Alignment score
   * @private
   */
  _calculateAlignmentScore(audienceDemographics, tagAffinities) {
    if (audienceDemographics.length === 0 || tagAffinities.length === 0) {
      return 0;
    }

    const avgDemographicScore = audienceDemographics.reduce((sum, item) => sum + item.score, 0) / audienceDemographics.length;
    const avgAffinityScore = tagAffinities.reduce((sum, item) => sum + item.score, 0) / tagAffinities.length;

    return (avgDemographicScore + avgAffinityScore) / 2;
  }

  /**
   * Calculate overall profile strength
   * @param {Object} profile - Taste profile
   * @returns {number} - Profile strength score
   * @private
   */
  _calculateProfileStrength(profile) {
    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(this.aggregationWeights).forEach(([type, weight]) => {
      if (profile[type] && Object.keys(profile[type]).length > 0) {
        const typeScore = Object.values(profile[type]).reduce((sum, item) => sum + item.avgScore, 0) / Object.keys(profile[type]).length;
        totalScore += typeScore * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Enhance recommendations with insights data
   * @param {Array} recommendations - Original recommendations
   * @param {Object} tasteProfile - Taste profile from insights
   * @returns {Array} - Enhanced recommendations
   */
  enhanceRecommendations(recommendations, tasteProfile) {
    if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
      return recommendations;
    }

    if (!tasteProfile || !tasteProfile.tasteProfile) {
      logger.warn('No taste profile provided for recommendation enhancement');
      return recommendations;
    }

    logger.info('Enhancing recommendations with insights data', {
      recommendationCount: recommendations.length
    });

    return recommendations.map(recommendation => {
      const enhancedRecommendation = { ...recommendation };
      
      // Add insights-based scoring
      enhancedRecommendation.insightsScore = this._calculateInsightsScore(recommendation, tasteProfile.tasteProfile);
      
      // Add cross-type relevance
      enhancedRecommendation.crossTypeRelevance = this._calculateCrossTypeRelevance(recommendation, tasteProfile.tasteProfile);
      
      // Enhance description with insights context
      enhancedRecommendation.enhancedDescription = this._enhanceDescription(recommendation, tasteProfile.tasteProfile);
      
      // Add taste profile metadata
      enhancedRecommendation.tasteProfileMetadata = {
        profileStrength: tasteProfile.profileStrength,
        relevantPreferences: this._getRelevantPreferences(recommendation, tasteProfile.tasteProfile),
        relevantInterests: this._getRelevantInterests(recommendation, tasteProfile.tasteProfile)
      };

      return enhancedRecommendation;
    });
  }

  /**
   * Calculate insights-based score for a recommendation
   * @param {Object} recommendation - Recommendation object
   * @param {Object} tasteProfile - Taste profile
   * @returns {number} - Insights score
   * @private
   */
  _calculateInsightsScore(recommendation, tasteProfile) {
    let score = 0;
    let totalWeight = 0;

    // Check preferences alignment
    if (tasteProfile.preferences) {
      Object.entries(tasteProfile.preferences).forEach(([key, data]) => {
        if (this._isRelevantToRecommendation(recommendation, key, data)) {
          score += data.avgScore * this.aggregationWeights.preferences;
          totalWeight += this.aggregationWeights.preferences;
        }
      });
    }

    // Check interests alignment
    if (tasteProfile.interests) {
      Object.entries(tasteProfile.interests).forEach(([key, data]) => {
        if (this._isRelevantToRecommendation(recommendation, key, data)) {
          score += data.avgScore * this.aggregationWeights.interests;
          totalWeight += this.aggregationWeights.interests;
        }
      });
    }

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * Check if taste profile data is relevant to recommendation
   * @param {Object} recommendation - Recommendation object
   * @param {string} key - Profile key
   * @param {Object} data - Profile data
   * @returns {boolean} - Whether relevant
   * @private
   */
  _isRelevantToRecommendation(recommendation, key, data) {
    const recommendationText = [
      recommendation.name,
      recommendation.description,
      ...(recommendation.categories || [])
    ].join(' ').toLowerCase();

    const profileText = [
      key,
      ...data.values.map(v => v.value || '').filter(Boolean)
    ].join(' ').toLowerCase();

    // Simple keyword matching - could be enhanced with semantic similarity
    return profileText.split(' ').some(word => 
      recommendationText.includes(word) && word.length > 3
    );
  }

  /**
   * Calculate cross-type relevance score
   * @param {Object} recommendation - Recommendation object
   * @param {Object} tasteProfile - Taste profile
   * @returns {number} - Cross-type relevance score
   * @private
   */
  _calculateCrossTypeRelevance(recommendation, tasteProfile) {
    // This could be enhanced with more sophisticated cross-type analysis
    return Math.random() * 0.3 + 0.7; // Placeholder implementation
  }

  /**
   * Enhance recommendation description with insights context
   * @param {Object} recommendation - Recommendation object
   * @param {Object} tasteProfile - Taste profile
   * @returns {string} - Enhanced description
   * @private
   */
  _enhanceDescription(recommendation, tasteProfile) {
    const relevantPreferences = this._getRelevantPreferences(recommendation, tasteProfile);
    const relevantInterests = this._getRelevantInterests(recommendation, tasteProfile);

    let enhancement = recommendation.description || '';

    if (relevantPreferences.length > 0) {
      enhancement += ` Perfect for those who enjoy ${relevantPreferences.join(', ')}.`;
    }

    if (relevantInterests.length > 0) {
      enhancement += ` Ideal for ${relevantInterests.join(', ')} enthusiasts.`;
    }

    return enhancement;
  }

  /**
   * Get relevant preferences for a recommendation
   * @param {Object} recommendation - Recommendation object
   * @param {Object} tasteProfile - Taste profile
   * @returns {Array} - Relevant preferences
   * @private
   */
  _getRelevantPreferences(recommendation, tasteProfile) {
    if (!tasteProfile.preferences) return [];

    return Object.entries(tasteProfile.preferences)
      .filter(([key, data]) => this._isRelevantToRecommendation(recommendation, key, data))
      .map(([key, data]) => data.values[0]?.value || key)
      .slice(0, 3);
  }

  /**
   * Get relevant interests for a recommendation
   * @param {Object} recommendation - Recommendation object
   * @param {Object} tasteProfile - Taste profile
   * @returns {Array} - Relevant interests
   * @private
   */
  _getRelevantInterests(recommendation, tasteProfile) {
    if (!tasteProfile.interests) return [];

    return Object.entries(tasteProfile.interests)
      .filter(([key, data]) => this._isRelevantToRecommendation(recommendation, key, data))
      .map(([key, data]) => data.values[0]?.value || key)
      .slice(0, 3);
  }

  /**
   * Get default taste profile for fallback
   * @returns {Object} - Default taste profile
   * @private
   */
  _getDefaultTasteProfile() {
    return {
      tasteProfile: {
        preferences: {},
        demographics: {},
        interests: {},
        behaviors: {},
        affinities: {},
        crossTypeInsights: []
      },
      profileStrength: 0,
      metadata: {
        sourceEntities: [],
        entityCount: 0,
        aggregationTimestamp: new Date().toISOString()
      }
    };
  }
}

module.exports = InsightsAggregator; 