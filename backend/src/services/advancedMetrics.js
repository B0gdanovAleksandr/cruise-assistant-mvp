const logger = require('../utils/logger');

/**
 * Advanced metrics service for RAG system evaluation
 * Calculates precision@k, recall@k, MRR, MAP, and other advanced metrics
 */
class AdvancedMetrics {
  constructor() {
    this.metrics = {
      precisionAtK: {},
      recallAtK: {},
      mrr: [],
      map: [],
      ndcg: [],
      diversity: [],
      novelty: []
    };
  }

  /**
   * Calculates Precision@k
   * @param {Array} retrievedItems - Retrieved items
   * @param {Array} relevantItems - Relevant items
   * @param {number} k - Number of top results
   * @returns {number} Precision@k score
   */
  calculatePrecisionAtK(retrievedItems, relevantItems, k) {
    if (retrievedItems.length === 0) return 0;

    const topKItems = retrievedItems.slice(0, k);
    const relevantIds = new Set(relevantItems.map(item => item.id));
    
    const relevantRetrieved = topKItems.filter(item => 
      relevantIds.has(item.id)
    );

    return relevantRetrieved.length / topKItems.length;
  }

  /**
   * Calculates Recall@k
   * @param {Array} retrievedItems - Retrieved items
   * @param {Array} relevantItems - Relevant items
   * @param {number} k - Number of top results
   * @returns {number} Recall@k score
   */
  calculateRecallAtK(retrievedItems, relevantItems, k) {
    if (relevantItems.length === 0) return 0;

    const topKItems = retrievedItems.slice(0, k);
    const relevantIds = new Set(relevantItems.map(item => item.id));
    
    const relevantRetrieved = topKItems.filter(item => 
      relevantIds.has(item.id)
    );

    return relevantRetrieved.length / relevantItems.length;
  }

  /**
   * Calculates Mean Reciprocal Rank (MRR)
   * @param {Array} retrievedItems - Retrieved items
   * @param {Array} relevantItems - Relevant items
   * @returns {number} MRR score
   */
  calculateMRR(retrievedItems, relevantItems) {
    if (relevantItems.length === 0) return 0;

    const relevantIds = new Set(relevantItems.map(item => item.id));
    
    for (let i = 0; i < retrievedItems.length; i++) {
      if (relevantIds.has(retrievedItems[i].id)) {
        return 1.0 / (i + 1);
      }
    }

    return 0;
  }

  /**
   * Calculates Mean Average Precision (MAP)
   * @param {Array} retrievedItems - Retrieved items
   * @param {Array} relevantItems - Relevant items
   * @returns {number} MAP score
   */
  calculateMAP(retrievedItems, relevantItems) {
    if (relevantItems.length === 0) return 0;

    const relevantIds = new Set(relevantItems.map(item => item.id));
    let relevantCount = 0;
    let precisionSum = 0;

    for (let i = 0; i < retrievedItems.length; i++) {
      if (relevantIds.has(retrievedItems[i].id)) {
        relevantCount++;
        const precision = relevantCount / (i + 1);
        precisionSum += precision;
      }
    }

    return precisionSum / relevantItems.length;
  }

  /**
   * Calculates Normalized Discounted Cumulative Gain (NDCG)
   * @param {Array} retrievedItems - Retrieved items with relevance scores
   * @param {Array} idealItems - Ideal ranking with relevance scores
   * @param {number} k - Number of top results
   * @returns {number} NDCG@k score
   */
  calculateNDCG(retrievedItems, idealItems, k) {
    const dcg = this.calculateDCG(retrievedItems, k);
    const idcg = this.calculateDCG(idealItems, k);
    
    return idcg > 0 ? dcg / idcg : 0;
  }

  /**
   * Calculates Discounted Cumulative Gain (DCG)
   * @param {Array} items - Items with relevance scores
   * @param {number} k - Number of top results
   * @returns {number} DCG@k score
   */
  calculateDCG(items, k) {
    const topKItems = items.slice(0, k);
    let dcg = 0;

    for (let i = 0; i < topKItems.length; i++) {
      const relevance = topKItems[i].relevance || topKItems[i].score || 0;
      dcg += relevance / Math.log2(i + 2);
    }

    return dcg;
  }

  /**
   * Calculates diversity of results
   * @param {Array} retrievedItems - Retrieved items
   * @returns {number} Diversity score
   */
  calculateDiversity(retrievedItems) {
    if (retrievedItems.length < 2) return 0;

    const types = new Set();
    const tags = new Set();
    let totalSimilarity = 0;
    let comparisons = 0;

    // Calculate type diversity
    retrievedItems.forEach(item => {
      if (item.type) types.add(item.type);
      if (item.tags) {
        item.tags.forEach(tag => tags.add(tag));
      }
    });

    // Calculate content similarity
    for (let i = 0; i < retrievedItems.length; i++) {
      for (let j = i + 1; j < retrievedItems.length; j++) {
        const similarity = this.calculateItemSimilarity(
          retrievedItems[i], 
          retrievedItems[j]
        );
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;
    const typeDiversity = types.size / retrievedItems.length;
    const tagDiversity = tags.size / (retrievedItems.length * 3); // Assume avg 3 tags per item

    return (typeDiversity + tagDiversity + (1 - avgSimilarity)) / 3;
  }

  /**
   * Calculates similarity between two items
   * @param {Object} item1 - First item
   * @param {Object} item2 - Second item
   * @returns {number} Similarity score (0-1)
   */
  calculateItemSimilarity(item1, item2) {
    let similarity = 0;
    let factors = 0;

    // Type similarity
    if (item1.type && item2.type) {
      similarity += item1.type === item2.type ? 1 : 0;
      factors++;
    }

    // Tag similarity
    if (item1.tags && item2.tags) {
      const commonTags = item1.tags.filter(tag => item2.tags.includes(tag));
      const tagSimilarity = commonTags.length / Math.max(item1.tags.length, item2.tags.length);
      similarity += tagSimilarity;
      factors++;
    }

    // Title similarity (simple word overlap)
    if (item1.title && item2.title) {
      const words1 = item1.title.toLowerCase().split(' ');
      const words2 = item2.title.toLowerCase().split(' ');
      const commonWords = words1.filter(word => words2.includes(word));
      const titleSimilarity = commonWords.length / Math.max(words1.length, words2.length);
      similarity += titleSimilarity;
      factors++;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Calculates novelty of results
   * @param {Array} retrievedItems - Retrieved items
   * @param {Array} userHistory - User's previous interactions
   * @returns {number} Novelty score
   */
  calculateNovelty(retrievedItems, userHistory = []) {
    if (retrievedItems.length === 0) return 0;

    const userSeenIds = new Set(userHistory.map(item => item.id));
    const userSeenTypes = new Set(userHistory.map(item => item.type));
    const userSeenTags = new Set(userHistory.flatMap(item => item.tags || []));

    let noveltyScore = 0;
    let factors = 0;

    retrievedItems.forEach(item => {
      let itemNovelty = 0;
      let itemFactors = 0;

      // ID novelty
      if (!userSeenIds.has(item.id)) {
        itemNovelty += 1;
      }
      itemFactors++;

      // Type novelty
      if (!userSeenTypes.has(item.type)) {
        itemNovelty += 1;
      }
      itemFactors++;

      // Tag novelty
      if (item.tags) {
        const newTags = item.tags.filter(tag => !userSeenTags.has(tag));
        const tagNovelty = newTags.length / item.tags.length;
        itemNovelty += tagNovelty;
        itemFactors++;
      }

      noveltyScore += itemFactors > 0 ? itemNovelty / itemFactors : 0;
      factors++;
    });

    return factors > 0 ? noveltyScore / factors : 0;
  }

  /**
   * Evaluates a complete RAG response
   * @param {Object} response - RAG response
   * @param {Array} expectedItems - Expected relevant items
   * @param {Object} userHistory - User's previous interactions
   * @returns {Object} Complete evaluation metrics
   */
  evaluateRAGResponse(response, expectedItems, userHistory = []) {
    const retrievedItems = response.retrievedEvents || [];
    const recommendations = response.recommendations || [];

    const evaluation = {
      retrieval: {
        precisionAt1: this.calculatePrecisionAtK(retrievedItems, expectedItems, 1),
        precisionAt3: this.calculatePrecisionAtK(retrievedItems, expectedItems, 3),
        precisionAt5: this.calculatePrecisionAtK(retrievedItems, expectedItems, 5),
        recallAt1: this.calculateRecallAtK(retrievedItems, expectedItems, 1),
        recallAt3: this.calculateRecallAtK(retrievedItems, expectedItems, 3),
        recallAt5: this.calculateRecallAtK(retrievedItems, expectedItems, 5),
        mrr: this.calculateMRR(retrievedItems, expectedItems),
        map: this.calculateMAP(retrievedItems, expectedItems)
      },
      quality: {
        diversity: this.calculateDiversity(retrievedItems),
        novelty: this.calculateNovelty(retrievedItems, userHistory)
      },
      generation: {
        faithfulness: response.validation?.faithfulness_score || 0,
        relevance: response.validation?.relevance_score || 0,
        hallucinationRate: response.validation?.hallucination_score || 0
      },
      system: {
        responseTime: response.responseTime || 0,
        tokenUsage: response.tokenUsage || 0,
        cost: response.cost || 0
      }
    };

    // Calculate NDCG if relevance scores are available
    if (expectedItems.some(item => item.relevance !== undefined)) {
      const idealItems = [...expectedItems].sort((a, b) => 
        (b.relevance || 0) - (a.relevance || 0)
      );
      evaluation.retrieval.ndcgAt5 = this.calculateNDCG(retrievedItems, idealItems, 5);
    }

    return evaluation;
  }

  /**
   * Aggregates metrics across multiple evaluations
   * @param {Array} evaluations - Array of evaluation results
   * @returns {Object} Aggregated metrics
   */
  aggregateMetrics(evaluations) {
    if (evaluations.length === 0) return {};

    const aggregated = {
      retrieval: {},
      quality: {},
      generation: {},
      system: {}
    };

    // Aggregate retrieval metrics
    const retrievalMetrics = ['precisionAt1', 'precisionAt3', 'precisionAt5', 
                             'recallAt1', 'recallAt3', 'recallAt5', 'mrr', 'map'];
    
    retrievalMetrics.forEach(metric => {
      const values = evaluations.map(e => e.retrieval[metric]).filter(v => v !== undefined);
      if (values.length > 0) {
        aggregated.retrieval[metric] = {
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          median: this.calculateMedian(values),
          std: this.calculateStd(values)
        };
      }
    });

    // Aggregate quality metrics
    ['diversity', 'novelty'].forEach(metric => {
      const values = evaluations.map(e => e.quality[metric]).filter(v => v !== undefined);
      if (values.length > 0) {
        aggregated.quality[metric] = {
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          median: this.calculateMedian(values),
          std: this.calculateStd(values)
        };
      }
    });

    // Aggregate generation metrics
    ['faithfulness', 'relevance', 'hallucinationRate'].forEach(metric => {
      const values = evaluations.map(e => e.generation[metric]).filter(v => v !== undefined);
      if (values.length > 0) {
        aggregated.generation[metric] = {
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          median: this.calculateMedian(values),
          std: this.calculateStd(values)
        };
      }
    });

    // Aggregate system metrics
    ['responseTime', 'tokenUsage', 'cost'].forEach(metric => {
      const values = evaluations.map(e => e.system[metric]).filter(v => v !== undefined);
      if (values.length > 0) {
        aggregated.system[metric] = {
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          median: this.calculateMedian(values),
          std: this.calculateStd(values)
        };
      }
    });

    return aggregated;
  }

  /**
   * Calculates median of values
   * @param {Array} values - Array of values
   * @returns {number} Median value
   */
  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }

  /**
   * Calculates standard deviation
   * @param {Array} values - Array of values
   * @returns {number} Standard deviation
   */
  calculateStd(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Generates comprehensive evaluation report
   * @param {Object} aggregatedMetrics - Aggregated metrics
   * @returns {string} Formatted report
   */
  generateEvaluationReport(aggregatedMetrics) {
    let report = '📊 Advanced RAG Metrics Report\n';
    report += '==============================\n\n';

    // Retrieval metrics
    report += '🎯 Retrieval Performance:\n';
    Object.entries(aggregatedMetrics.retrieval || {}).forEach(([metric, stats]) => {
      report += `- ${metric}: ${(stats.mean * 100).toFixed(1)}% (std: ${(stats.std * 100).toFixed(1)}%)\n`;
    });

    // Quality metrics
    report += '\n🌟 Quality Metrics:\n';
    Object.entries(aggregatedMetrics.quality || {}).forEach(([metric, stats]) => {
      report += `- ${metric}: ${(stats.mean * 100).toFixed(1)}% (std: ${(stats.std * 100).toFixed(1)}%)\n`;
    });

    // Generation metrics
    report += '\n🤖 Generation Quality:\n';
    Object.entries(aggregatedMetrics.generation || {}).forEach(([metric, stats]) => {
      report += `- ${metric}: ${(stats.mean * 100).toFixed(1)}% (std: ${(stats.std * 100).toFixed(1)}%)\n`;
    });

    // System metrics
    report += '\n⚙️ System Performance:\n';
    Object.entries(aggregatedMetrics.system || {}).forEach(([metric, stats]) => {
      const unit = metric === 'responseTime' ? 's' : metric === 'cost' ? '$' : '';
      report += `- ${metric}: ${stats.mean.toFixed(2)}${unit} (std: ${stats.std.toFixed(2)}${unit})\n`;
    });

    return report;
  }
}

module.exports = AdvancedMetrics; 