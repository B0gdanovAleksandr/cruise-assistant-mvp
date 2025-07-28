const llmClient = require('./llmClient');
const logger = require('../utils/logger');

/**
 * Reranking system for improving search result quality
 * Uses LLM-based reranking to reorder initial retrieval results
 */
class Reranker {
  constructor() {
    this.llmClient = llmClient;
    this.rerankingModel = process.env.RERANKING_MODEL || 'gpt-4';
    this.maxRerankItems = 20; // Maximum items to rerank
  }

  /**
   * Reranks search results using LLM-based scoring
   * @param {Array} searchResults - Initial search results
   * @param {Object} userPrefs - User preferences
   * @param {number} topK - Number of results to return
   * @returns {Array} Reranked results
   */
  async rerankResults(searchResults, userPrefs, topK = 5) {
    try {
      if (!searchResults || searchResults.length === 0) {
        return [];
      }

      logger.info(`Reranking ${searchResults.length} search results`);

      // Limit items for reranking to avoid token limits
      const itemsToRerank = searchResults.slice(0, this.maxRerankItems);
      
      // Generate reranking scores
      const rerankedItems = await this.generateRerankingScores(itemsToRerank, userPrefs);
      
      // Sort by reranking score
      const sortedResults = rerankedItems.sort((a, b) => b.rerankScore - a.rerankScore);
      
      // Return top K results
      const finalResults = sortedResults.slice(0, topK);
      
      logger.info(`Reranking completed. Top result score: ${finalResults[0]?.rerankScore?.toFixed(3)}`);
      
      return finalResults;
    } catch (error) {
      logger.error('Error in reranking:', error);
      // Fallback to original results if reranking fails
      return searchResults.slice(0, topK);
    }
  }

  /**
   * Generates reranking scores for search results
   * @param {Array} items - Items to rerank
   * @param {Object} userPrefs - User preferences
   * @returns {Array} Items with reranking scores
   */
  async generateRerankingScores(items, userPrefs) {
    try {
      const rerankingPrompt = this.buildRerankingPrompt(items, userPrefs);
      
      const response = await this.llmClient.generateResponse({
        systemPrompt: "You are an expert cruise travel assistant. Your task is to score and rerank search results based on relevance to user preferences. Provide scores from 0.0 to 1.0, where 1.0 is most relevant.",
        userPrompt: rerankingPrompt,
        temperature: 0.1,
        maxTokens: 1000
      });

      const scores = this.parseRerankingResponse(response, items);
      
      // Apply scores to items
      return items.map((item, index) => ({
        ...item,
        rerankScore: scores[index] || item.score, // Fallback to original score
        originalScore: item.score
      }));
    } catch (error) {
      logger.error('Error generating reranking scores:', error);
      // Fallback: use original scores
      return items.map(item => ({
        ...item,
        rerankScore: item.score,
        originalScore: item.score
      }));
    }
  }

  /**
   * Builds reranking prompt
   * @param {Array} items - Items to rerank
   * @param {Object} userPrefs - User preferences
   * @returns {string} Reranking prompt
   */
  buildRerankingPrompt(items, userPrefs) {
    const userProfile = `User Profile:
- Interests: ${userPrefs.interests.join(', ')}
- Location: ${userPrefs.location || 'Any'}`;

    const itemsList = items.map((item, index) => 
      `${index + 1}. [ID: ${item.id}] ${item.title}
   Type: ${item.type}
   Description: ${item.description}
   Tags: ${item.tags.join(', ')}
   Original Score: ${item.score.toFixed(3)}
   Chunks: ${item.chunkCount || 0}`
    ).join('\n\n');

    return `${userProfile}

Please score each of the following cruise events based on relevance to the user's preferences. Consider:
1. Interest alignment (how well it matches user interests)
2. Location relevance (if specified)
3. Experience quality (based on description and tags)
4. Personalization potential

Rate each item from 0.0 to 1.0, where:
- 0.0: Completely irrelevant
- 0.3: Somewhat relevant
- 0.6: Relevant
- 0.8: Very relevant
- 1.0: Perfect match

Available Events:
${itemsList}

Respond with ONLY a JSON array of scores in the same order as the items:
[0.85, 0.72, 0.45, ...]`;
  }

  /**
   * Parses reranking response
   * @param {string} response - LLM response
   * @param {Array} items - Original items
   * @returns {Array} Parsed scores
   */
  parseRerankingResponse(response, items) {
    try {
      // Extract JSON array from response
      const jsonMatch = response.match(/\[[\d.,\s]+\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const scores = JSON.parse(jsonMatch[0]);
      
      // Validate scores
      if (!Array.isArray(scores) || scores.length !== items.length) {
        throw new Error(`Invalid scores array: expected ${items.length} scores, got ${scores.length}`);
      }

      // Normalize scores to 0-1 range
      return scores.map(score => {
        const normalized = Math.max(0, Math.min(1, parseFloat(score)));
        return isNaN(normalized) ? 0.5 : normalized;
      });
    } catch (error) {
      logger.error('Error parsing reranking response:', error);
      // Fallback: return original scores
      return items.map(item => item.score);
    }
  }

  /**
   * Hybrid reranking combining vector similarity and LLM scoring
   * @param {Array} searchResults - Initial search results
   * @param {Object} userPrefs - User preferences
   * @param {number} topK - Number of results to return
   * @param {number} vectorWeight - Weight for vector similarity (0-1)
   * @returns {Array} Hybrid reranked results
   */
  async hybridRerank(searchResults, userPrefs, topK = 5, vectorWeight = 0.3) {
    try {
      logger.info(`Performing hybrid reranking with vector weight: ${vectorWeight}`);

      // Get LLM reranking scores
      const llmReranked = await this.rerankResults(searchResults, userPrefs, topK);
      
      // Combine scores
      const hybridResults = searchResults.map(item => {
        const llmItem = llmReranked.find(llm => llm.id === item.id);
        const llmScore = llmItem ? llmItem.rerankScore : item.score;
        
        // Hybrid score: weighted combination of vector and LLM scores
        const hybridScore = (vectorWeight * item.score) + ((1 - vectorWeight) * llmScore);
        
        return {
          ...item,
          vectorScore: item.score,
          llmScore: llmScore,
          hybridScore: hybridScore,
          rerankScore: hybridScore
        };
      });

      // Sort by hybrid score
      const sortedResults = hybridResults.sort((a, b) => b.hybridScore - a.hybridScore);
      
      logger.info(`Hybrid reranking completed. Top hybrid score: ${sortedResults[0]?.hybridScore?.toFixed(3)}`);
      
      return sortedResults.slice(0, topK);
    } catch (error) {
      logger.error('Error in hybrid reranking:', error);
      return searchResults.slice(0, topK);
    }
  }

  /**
   * Reranks with diversity boost to avoid similar results
   * @param {Array} searchResults - Initial search results
   * @param {Object} userPrefs - User preferences
   * @param {number} topK - Number of results to return
   * @returns {Array} Diverse reranked results
   */
  async diverseRerank(searchResults, userPrefs, topK = 5) {
    try {
      logger.info(`Performing diverse reranking for ${topK} results`);

      const reranked = await this.rerankResults(searchResults, userPrefs, topK * 2);
      
      // Apply diversity penalty for similar items
      const diverseResults = [];
      const selectedTypes = new Set();
      const selectedTags = new Set();

      for (const item of reranked) {
        if (diverseResults.length >= topK) break;

        // Calculate diversity penalty
        let diversityPenalty = 0;
        
        // Penalize same type
        if (selectedTypes.has(item.type)) {
          diversityPenalty += 0.2;
        }
        
        // Penalize overlapping tags
        const overlappingTags = item.tags.filter(tag => selectedTags.has(tag));
        diversityPenalty += overlappingTags.length * 0.1;

        // Apply penalty
        const diverseScore = item.rerankScore * (1 - diversityPenalty);
        
        diverseResults.push({
          ...item,
          diverseScore: diverseScore,
          diversityPenalty: diversityPenalty
        });

        // Update selected sets
        selectedTypes.add(item.type);
        item.tags.forEach(tag => selectedTags.add(tag));
      }

      // Sort by diverse score
      const sortedResults = diverseResults.sort((a, b) => b.diverseScore - a.diverseScore);
      
      logger.info(`Diverse reranking completed. Top diverse score: ${sortedResults[0]?.diverseScore?.toFixed(3)}`);
      
      return sortedResults.slice(0, topK);
    } catch (error) {
      logger.error('Error in diverse reranking:', error);
      return searchResults.slice(0, topK);
    }
  }
}

module.exports = Reranker; 