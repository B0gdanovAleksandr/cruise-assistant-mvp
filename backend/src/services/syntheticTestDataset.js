const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Synthetic test dataset for automatic RAG evaluation
 * Generates test queries and expected responses for evaluation
 */
class SyntheticTestDataset {
  constructor() {
    this.testCases = [];
    this.evaluationMetrics = {
      precision: [],
      recall: [],
      faithfulness: [],
      relevance: [],
      responseTime: []
    };
  }

  /**
   * Generates synthetic test cases
   * @param {Array} events - Available events for testing
   * @returns {Array} Generated test cases
   */
  generateTestCases(events) {
    logger.info(`Generating synthetic test cases for ${events.length} events`);

    const testCases = [];

    // Test case 1: Cultural interests
    testCases.push({
      id: 'test_cultural_001',
      query: 'I love cultural experiences and history. What can I do on a Mediterranean cruise?',
      userPrefs: {
        interests: ['culture', 'history'],
        location: 'Mediterranean'
      },
      expectedEvents: events.filter(e => 
        e.tags.some(tag => ['culture', 'history'].includes(tag)) &&
        e.type === 'excursion'
      ).slice(0, 3),
      expectedKeywords: ['cultural', 'history', 'mediterranean', 'ancient', 'ruins'],
      category: 'cultural'
    });

    // Test case 2: Wellness interests
    testCases.push({
      id: 'test_wellness_001',
      query: 'I want to relax and focus on wellness during my cruise. Any spa or wellness activities?',
      userPrefs: {
        interests: ['wellness', 'relaxation'],
        location: 'Any'
      },
      expectedEvents: events.filter(e => 
        e.tags.some(tag => ['wellness', 'spa', 'relaxation'].includes(tag)) &&
        e.type === 'wellness'
      ).slice(0, 3),
      expectedKeywords: ['wellness', 'spa', 'relaxation', 'massage', 'yoga'],
      category: 'wellness'
    });

    // Test case 3: Adventure interests
    testCases.push({
      id: 'test_adventure_001',
      query: 'I\'m looking for adventure and outdoor activities. What exciting options are available?',
      userPrefs: {
        interests: ['adventure', 'outdoor'],
        location: 'Any'
      },
      expectedEvents: events.filter(e => 
        e.tags.some(tag => ['adventure', 'outdoor', 'sports'].includes(tag)) &&
        e.type === 'activity'
      ).slice(0, 3),
      expectedKeywords: ['adventure', 'outdoor', 'exciting', 'sports', 'active'],
      category: 'adventure'
    });

    // Test case 4: Family activities
    testCases.push({
      id: 'test_family_001',
      query: 'I\'m traveling with my family including kids. What family-friendly activities do you recommend?',
      userPrefs: {
        interests: ['family', 'kids'],
        location: 'Any'
      },
      expectedEvents: events.filter(e => 
        e.tags.some(tag => ['family', 'kids', 'children'].includes(tag)) &&
        e.type === 'entertainment'
      ).slice(0, 3),
      expectedKeywords: ['family', 'kids', 'children', 'fun', 'entertainment'],
      category: 'family'
    });

    // Test case 5: Food and dining
    testCases.push({
      id: 'test_food_001',
      query: 'I\'m a foodie and love trying local cuisine. What dining experiences should I look for?',
      userPrefs: {
        interests: ['food', 'dining', 'cuisine'],
        location: 'Any'
      },
      expectedEvents: events.filter(e => 
        e.tags.some(tag => ['food', 'dining', 'cuisine', 'restaurant'].includes(tag)) &&
        e.type === 'dining'
      ).slice(0, 3),
      expectedKeywords: ['food', 'dining', 'cuisine', 'restaurant', 'local'],
      category: 'food'
    });

    this.testCases = testCases;
    logger.info(`Generated ${testCases.length} synthetic test cases`);
    
    return testCases;
  }

  /**
   * Evaluates RAG system performance using test cases
   * @param {Function} ragFunction - RAG function to test
   * @param {Array} events - Available events
   * @returns {Object} Evaluation results
   */
  async evaluateRAGSystem(ragFunction, events) {
    logger.info('Starting RAG system evaluation with synthetic test dataset');

    if (this.testCases.length === 0) {
      this.generateTestCases(events);
    }

    const results = {
      testCases: [],
      overallMetrics: {
        precision: 0,
        recall: 0,
        faithfulness: 0,
        relevance: 0,
        responseTime: 0
      },
      categoryMetrics: {}
    };

    for (const testCase of this.testCases) {
      const startTime = Date.now();
      
      try {
        // Run RAG function
        const ragResponse = await ragFunction(testCase.userPrefs);
        const responseTime = Date.now() - startTime;

        // Evaluate results
        const evaluation = this.evaluateTestCase(testCase, ragResponse, responseTime);
        
        results.testCases.push({
          testCase: testCase,
          response: ragResponse,
          evaluation: evaluation,
          responseTime: responseTime
        });

        // Update overall metrics
        this.updateOverallMetrics(results.overallMetrics, evaluation);
        
        // Update category metrics
        if (!results.categoryMetrics[testCase.category]) {
          results.categoryMetrics[testCase.category] = {
            precision: [],
            recall: [],
            faithfulness: [],
            relevance: [],
            responseTime: []
          };
        }
        this.updateCategoryMetrics(results.categoryMetrics[testCase.category], evaluation);

        logger.info(`Test case ${testCase.id} completed: Precision=${evaluation.precision.toFixed(3)}, Recall=${evaluation.recall.toFixed(3)}`);

      } catch (error) {
        logger.error(`Error evaluating test case ${testCase.id}:`, error);
        results.testCases.push({
          testCase: testCase,
          error: error.message,
          evaluation: {
            precision: 0,
            recall: 0,
            faithfulness: 0,
            relevance: 0,
            responseTime: 0
          }
        });
      }
    }

    // Calculate averages
    this.calculateAverages(results);
    
    logger.info('RAG system evaluation completed');
    return results;
  }

  /**
   * Evaluates a single test case
   * @param {Object} testCase - Test case
   * @param {Object} ragResponse - RAG response
   * @param {number} responseTime - Response time in ms
   * @returns {Object} Evaluation metrics
   */
  evaluateTestCase(testCase, ragResponse, responseTime) {
    const retrievedEvents = ragResponse.retrievedEvents || [];
    const recommendations = ragResponse.recommendations || [];

    // Calculate precision and recall
    const precision = this.calculatePrecision(testCase.expectedEvents, retrievedEvents);
    const recall = this.calculateRecall(testCase.expectedEvents, retrievedEvents);

    // Calculate relevance
    const relevance = this.calculateRelevance(testCase, recommendations);

    // Calculate faithfulness
    const faithfulness = this.calculateFaithfulness(testCase, recommendations);

    return {
      precision,
      recall,
      relevance,
      faithfulness,
      responseTime: responseTime / 1000, // Convert to seconds
      retrievedCount: retrievedEvents.length,
      expectedCount: testCase.expectedEvents.length,
      recommendationsCount: recommendations.length
    };
  }

  /**
   * Calculates precision (how many retrieved events are relevant)
   * @param {Array} expectedEvents - Expected events
   * @param {Array} retrievedEvents - Retrieved events
   * @returns {number} Precision score
   */
  calculatePrecision(expectedEvents, retrievedEvents) {
    if (retrievedEvents.length === 0) return 0;

    const expectedIds = new Set(expectedEvents.map(e => e.id));
    const relevantRetrieved = retrievedEvents.filter(e => expectedIds.has(e.id));
    
    return relevantRetrieved.length / retrievedEvents.length;
  }

  /**
   * Calculates recall (how many expected events were retrieved)
   * @param {Array} expectedEvents - Expected events
   * @param {Array} retrievedEvents - Retrieved events
   * @returns {number} Recall score
   */
  calculateRecall(expectedEvents, retrievedEvents) {
    if (expectedEvents.length === 0) return 0;

    const retrievedIds = new Set(retrievedEvents.map(e => e.id));
    const retrievedExpected = expectedEvents.filter(e => retrievedIds.has(e.id));
    
    return retrievedExpected.length / expectedEvents.length;
  }

  /**
   * Calculates relevance score for recommendations
   * @param {Object} testCase - Test case
   * @param {Array} recommendations - Generated recommendations
   * @returns {number} Relevance score
   */
  calculateRelevance(testCase, recommendations) {
    if (recommendations.length === 0) return 0;

    let totalRelevance = 0;
    
    for (const rec of recommendations) {
      let relevance = 0;
      
      // Check if recommendation contains expected keywords
      const recText = `${rec.title} ${rec.description} ${rec.personalizedAdvice}`.toLowerCase();
      const keywordMatches = testCase.expectedKeywords.filter(keyword => 
        recText.includes(keyword.toLowerCase())
      );
      
      relevance += keywordMatches.length / testCase.expectedKeywords.length;
      
      // Check if recommendation cites expected events
      if (rec.originEventId) {
        const expectedIds = testCase.expectedEvents.map(e => e.id);
        if (expectedIds.includes(rec.originEventId)) {
          relevance += 0.5;
        }
      }
      
      totalRelevance += Math.min(relevance, 1.0);
    }
    
    return totalRelevance / recommendations.length;
  }

  /**
   * Calculates faithfulness score
   * @param {Object} testCase - Test case
   * @param {Array} recommendations - Generated recommendations
   * @returns {number} Faithfulness score
   */
  calculateFaithfulness(testCase, recommendations) {
    if (recommendations.length === 0) return 0;

    let totalFaithfulness = 0;
    
    for (const rec of recommendations) {
      let faithfulness = 0;
      
      // Check if recommendation has citation
      if (rec.originEventId) {
        faithfulness += 0.5;
      }
      
      // Check if recommendation is grounded in expected events
      const recText = `${rec.title} ${rec.description}`.toLowerCase();
      const hasExpectedContent = testCase.expectedKeywords.some(keyword => 
        recText.includes(keyword.toLowerCase())
      );
      
      if (hasExpectedContent) {
        faithfulness += 0.5;
      }
      
      totalFaithfulness += faithfulness;
    }
    
    return totalFaithfulness / recommendations.length;
  }

  /**
   * Updates overall metrics
   * @param {Object} overallMetrics - Overall metrics object
   * @param {Object} evaluation - Single evaluation
   */
  updateOverallMetrics(overallMetrics, evaluation) {
    overallMetrics.precision += evaluation.precision;
    overallMetrics.recall += evaluation.recall;
    overallMetrics.faithfulness += evaluation.faithfulness;
    overallMetrics.relevance += evaluation.relevance;
    overallMetrics.responseTime += evaluation.responseTime;
  }

  /**
   * Updates category metrics
   * @param {Object} categoryMetrics - Category metrics object
   * @param {Object} evaluation - Single evaluation
   */
  updateCategoryMetrics(categoryMetrics, evaluation) {
    categoryMetrics.precision.push(evaluation.precision);
    categoryMetrics.recall.push(evaluation.recall);
    categoryMetrics.faithfulness.push(evaluation.faithfulness);
    categoryMetrics.relevance.push(evaluation.relevance);
    categoryMetrics.responseTime.push(evaluation.responseTime);
  }

  /**
   * Calculates average metrics
   * @param {Object} results - Results object
   */
  calculateAverages(results) {
    const testCaseCount = results.testCases.length;
    
    if (testCaseCount > 0) {
      results.overallMetrics.precision /= testCaseCount;
      results.overallMetrics.recall /= testCaseCount;
      results.overallMetrics.faithfulness /= testCaseCount;
      results.overallMetrics.relevance /= testCaseCount;
      results.overallMetrics.responseTime /= testCaseCount;
    }

    // Calculate category averages
    for (const [category, metrics] of Object.entries(results.categoryMetrics)) {
      const count = metrics.precision.length;
      if (count > 0) {
        results.categoryMetrics[category] = {
          precision: metrics.precision.reduce((a, b) => a + b, 0) / count,
          recall: metrics.recall.reduce((a, b) => a + b, 0) / count,
          faithfulness: metrics.faithfulness.reduce((a, b) => a + b, 0) / count,
          relevance: metrics.relevance.reduce((a, b) => a + b, 0) / count,
          responseTime: metrics.responseTime.reduce((a, b) => a + b, 0) / count
        };
      }
    }
  }

  /**
   * Saves evaluation results to file
   * @param {Object} results - Evaluation results
   * @param {string} filename - Output filename
   */
  async saveEvaluationResults(results, filename = 'rag_evaluation_results.json') {
    try {
      const outputPath = path.join(__dirname, '../../logs', filename);
      await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
      logger.info(`Evaluation results saved to ${outputPath}`);
    } catch (error) {
      logger.error('Error saving evaluation results:', error);
    }
  }

  /**
   * Generates evaluation report
   * @param {Object} results - Evaluation results
   * @returns {string} Formatted report
   */
  generateEvaluationReport(results) {
    const { overallMetrics, categoryMetrics } = results;
    
    let report = '📊 RAG System Evaluation Report\n';
    report += '================================\n\n';
    
    report += '🎯 Overall Performance:\n';
    report += `- Precision: ${(overallMetrics.precision * 100).toFixed(1)}%\n`;
    report += `- Recall: ${(overallMetrics.recall * 100).toFixed(1)}%\n`;
    report += `- Faithfulness: ${(overallMetrics.faithfulness * 100).toFixed(1)}%\n`;
    report += `- Relevance: ${(overallMetrics.relevance * 100).toFixed(1)}%\n`;
    report += `- Avg Response Time: ${overallMetrics.responseTime.toFixed(2)}s\n\n`;
    
    report += '📈 Category Performance:\n';
    for (const [category, metrics] of Object.entries(categoryMetrics)) {
      report += `\n${category.toUpperCase()}:\n`;
      report += `- Precision: ${(metrics.precision * 100).toFixed(1)}%\n`;
      report += `- Recall: ${(metrics.recall * 100).toFixed(1)}%\n`;
      report += `- Faithfulness: ${(metrics.faithfulness * 100).toFixed(1)}%\n`;
      report += `- Relevance: ${(metrics.relevance * 100).toFixed(1)}%\n`;
    }
    
    return report;
  }
}

module.exports = SyntheticTestDataset; 