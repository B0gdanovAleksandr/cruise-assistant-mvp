const llmClient = require('./llmClient');
const logger = require('../utils/logger');

class HallucinationDetector {
  constructor() {
    this.llmClient = llmClient;
  }

  /**
   * Detects hallucinations in RAG response using LLM-as-a-Judge
   * @param {Object} response - generated response
   * @param {Array} retrievedEvents - original retrieved events
   * @returns {Object} hallucination detection results
   */
  async detectHallucinations(response, retrievedEvents) {
    try {
      const judgePrompt = `
Analyze this recommendation response for hallucinations and faithfulness to the provided events.

**Retrieved Events:**
${JSON.stringify(retrievedEvents, null, 2)}

**Generated Response:**
${JSON.stringify(response, null, 2)}

**Evaluation Criteria:**
1. Are all claims supported by retrieved events?
2. Are all recommendations properly cited?
3. Is there any information not present in events?
4. Are all factual statements grounded in provided data?
5. Are there any unsupported assertions or recommendations?

**Response Format:**
{
  "hallucination_score": 0.0-1.0,
  "unsupported_claims": ["claim1", "claim2"],
  "missing_citations": ["rec1", "rec2"],
  "faithfulness_score": 0.0-1.0,
  "recommendations": [
    {
      "recommendation_id": "rec_1",
      "is_grounded": true,
      "supporting_events": ["event_001"],
      "unsupported_claims": []
    }
  ]
}`;

      const validation = await this.llmClient.generateResponse({
        systemPrompt: "You are an expert fact-checker for RAG systems. Be strict and thorough in your analysis. Focus on identifying any information that is not directly supported by the provided events.",
        userPrompt: judgePrompt,
        temperature: 0.1,
        maxTokens: 1000
      });

      return JSON.parse(validation);
    } catch (error) {
      logger.error('Error in hallucination detection:', error);
      return {
        hallucination_score: 0.5,
        faithfulness_score: 0.5,
        unsupported_claims: [],
        missing_citations: []
      };
    }
  }

  /**
   * Validates citations in recommendations
   * @param {Array} recommendations - recommendations array
   * @param {Array} retrievedEvents - original retrieved events
   * @returns {Object} citation validation results
   */
  validateCitations(recommendations, retrievedEvents) {
    const eventIds = new Set(retrievedEvents.map(e => e.id));
    
    const citationResults = recommendations.map(rec => ({
      recommendationId: rec.id,
      hasCitation: !!rec.originEventId,
      validCitation: rec.originEventId && eventIds.has(rec.originEventId),
      citationId: rec.originEventId
    }));

    return {
      results: citationResults,
      coverage: citationResults.filter(r => r.validCitation).length / citationResults.length,
      missingCitations: citationResults.filter(r => !r.hasCitation).map(r => r.recommendationId)
    };
  }

  /**
   * Extracts claims from recommendations for validation
   * @param {Array} recommendations - recommendations array
   * @returns {Array} extracted claims
   */
  extractClaims(recommendations) {
    return recommendations.flatMap(rec => [
      { text: rec.description, source: rec.id, type: 'description' },
      { text: rec.personalizedAdvice, source: rec.id, type: 'advice' },
      { text: rec.timing, source: rec.id, type: 'timing' }
    ]);
  }

  /**
   * Validates claims against retrieved events
   * @param {Array} claims - extracted claims
   * @param {Array} retrievedEvents - original retrieved events
   * @returns {Object} claim validation results
   */
  async validateClaims(claims, retrievedEvents) {
    const claimValidation = await Promise.all(
      claims.map(claim => this.validateSingleClaim(claim, retrievedEvents))
    );

    return {
      results: claimValidation,
      supportedClaims: claimValidation.filter(c => c.supported).length,
      totalClaims: claimValidation.length,
      supportRate: claimValidation.filter(c => c.supported).length / claimValidation.length
    };
  }

  /**
   * Validates a single claim against retrieved events
   * @param {Object} claim - claim object
   * @param {Array} retrievedEvents - original retrieved events
   * @returns {Object} validation result for single claim
   */
  async validateSingleClaim(claim, retrievedEvents) {
    // Check if claim text contains information from any retrieved event
    const supportingEvents = retrievedEvents.filter(event => 
      claim.text.toLowerCase().includes(event.title.toLowerCase()) ||
      event.tags.some(tag => claim.text.toLowerCase().includes(tag.toLowerCase())) ||
      claim.text.toLowerCase().includes(event.type.toLowerCase())
    );

    return {
      claim: claim.text,
      source: claim.source,
      type: claim.type,
      supported: supportingEvents.length > 0,
      supportingEvents: supportingEvents.map(e => e.id)
    };
  }

  /**
   * Comprehensive validation of RAG response
   * @param {Object} response - generated response
   * @param {Array} retrievedEvents - original retrieved events
   * @returns {Object} comprehensive validation results
   */
  async validateResponse(response, retrievedEvents) {
    try {
      const validation = {
        citations: this.validateCitations(response.recommendations || [], retrievedEvents),
        claims: await this.validateClaims(
          this.extractClaims(response.recommendations || []), 
          retrievedEvents
        ),
        hallucination: await this.detectHallucinations(response, retrievedEvents)
      };

      validation.overall = this.calculateOverallScore(validation);
      return validation;
    } catch (error) {
      logger.error('Error in comprehensive validation:', error);
      return {
        citations: { coverage: 0, missingCitations: [] },
        claims: { supportRate: 0, totalClaims: 0 },
        hallucination: { hallucination_score: 0.5, faithfulness_score: 0.5 },
        overall: 0.5
      };
    }
  }

  /**
   * Calculates overall validation score
   * @param {Object} validation - validation results
   * @returns {number} overall score
   */
  calculateOverallScore(validation) {
    const citationScore = validation.citations.coverage;
    const claimScore = validation.claims.supportRate;
    const hallucinationScore = 1 - (validation.hallucination.hallucination_score || 0.5);
    const faithfulnessScore = validation.hallucination.faithfulness_score || 0.5;

    return (citationScore + claimScore + hallucinationScore + faithfulnessScore) / 4;
  }

  /**
   * Generates validation report
   * @param {Object} validation - validation results
   * @returns {Object} formatted validation report
   */
  generateValidationReport(validation) {
    return {
      summary: {
        overall_score: validation.overall,
        citation_coverage: validation.citations.coverage,
        claim_support_rate: validation.claims.supportRate,
        hallucination_score: validation.hallucination.hallucination_score,
        faithfulness_score: validation.hallucination.faithfulness_score
      },
      details: {
        missing_citations: validation.citations.missingCitations,
        unsupported_claims: validation.hallucination.unsupported_claims || [],
        claim_validation: validation.claims.results
      },
      recommendations: this.generateRecommendations(validation)
    };
  }

  /**
   * Generates recommendations based on validation results
   * @param {Object} validation - validation results
   * @returns {Array} recommendations for improvement
   */
  generateRecommendations(validation) {
    const recommendations = [];

    if (validation.citations.coverage < 0.8) {
      recommendations.push('Improve citation coverage by ensuring all recommendations reference specific event IDs');
    }

    if (validation.claims.supportRate < 0.8) {
      recommendations.push('Ensure all claims are supported by retrieved events');
    }

    if (validation.hallucination.hallucination_score > 0.3) {
      recommendations.push('Reduce hallucination by improving prompt engineering and fact-checking');
    }

    if (validation.overall < 0.7) {
      recommendations.push('Overall response quality needs improvement - review prompt and retrieval strategy');
    }

    return recommendations;
  }

  /**
   * Checks if response meets quality thresholds
   * @param {Object} validation - validation results
   * @param {Object} thresholds - quality thresholds
   * @returns {Object} quality check results
   */
  checkQualityThresholds(validation, thresholds = {}) {
    const defaultThresholds = {
      overall_score: 0.7,
      citation_coverage: 0.8,
      claim_support_rate: 0.8,
      hallucination_score: 0.3,
      faithfulness_score: 0.7
    };

    const finalThresholds = { ...defaultThresholds, ...thresholds };

    return {
      passes_overall: validation.overall >= finalThresholds.overall_score,
      passes_citations: validation.citations.coverage >= finalThresholds.citation_coverage,
      passes_claims: validation.claims.supportRate >= finalThresholds.claim_support_rate,
      passes_hallucination: validation.hallucination.hallucination_score <= finalThresholds.hallucination_score,
      passes_faithfulness: validation.hallucination.faithfulness_score >= finalThresholds.faithfulness_score,
      overall_passes: Object.values({
        citations: validation.citations.coverage >= finalThresholds.citation_coverage,
        claims: validation.claims.supportRate >= finalThresholds.claim_support_rate,
        hallucination: validation.hallucination.hallucination_score <= finalThresholds.hallucination_score,
        faithfulness: validation.hallucination.faithfulness_score >= finalThresholds.faithfulness_score
      }).every(Boolean)
    };
  }
}

module.exports = HallucinationDetector; 