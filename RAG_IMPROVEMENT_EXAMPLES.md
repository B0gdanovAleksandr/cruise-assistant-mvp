# 🚀 Практические улучшения RAG-системы Cruise Assistant

## 📋 Примеры реализации ключевых улучшений

---

## 1. 🔄 Обновление Embedding Model

### Текущая реализация:
```javascript
// backend/src/services/vectorStore.js
async generateEmbedding(text) {
  const response = await this.openai.embeddings.create({
    model: 'text-embedding-ada-002', // Устаревшая модель
    input: text,
  });
  return response.data[0].embedding;
}
```

### Улучшенная реализация:
```javascript
// backend/src/services/enhancedVectorStore.js
class EnhancedVectorStore extends VectorStore {
  constructor() {
    super();
    this.embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-large';
    this.dimensions = this.embeddingModel.includes('large') ? 3072 : 1536;
  }

  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
        encoding_format: 'float'
      });
      
      logger.info(`Generated embedding with ${this.embeddingModel}`, {
        textLength: text.length,
        embeddingDimensions: response.data[0].embedding.length
      });
      
      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  async generateEmbeddingsBatch(texts) {
    const embeddings = [];
    const batchSize = 100; // OpenAI batch limit
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: batch
      });
      embeddings.push(...response.data.map(item => item.embedding));
    }
    
    return embeddings;
  }
}
```

---

## 2. 📝 Улучшенный Prompt Engineering

### Текущий prompt:
```javascript
// backend/src/services/promptGenerator.js
getRecommendationInstruction() {
  return 'Recommend experiences with personalized advice, timing suggestions, and cite origin of each recommendation.';
}
```

### Улучшенный prompt с faithfulness requirements:
```javascript
// backend/src/services/enhancedPromptGenerator.js
class EnhancedPromptGenerator extends PromptGenerator {
  constructor() {
    super();
    this.maxTokens = 800; // Увеличить лимит
  }

  generateRecommendationPrompt(retrievedEvents, userPrefs) {
    const eventsList = this.formatEventsWithMetadata(retrievedEvents);
    const userProfile = this.formatDetailedUserProfile(userPrefs);
    const instruction = this.getEnhancedInstruction();
    const validationRules = this.getValidationRules();

    return `${eventsList}\n\n${userProfile}\n\n${instruction}\n\n${validationRules}`;
  }

  formatEventsWithMetadata(events) {
    return events.map((event, index) => `
Event ${index + 1} (ID: ${event.id}):
- Title: ${event.title}
- Type: ${event.type}
- Description: ${event.description}
- Tags: ${event.tags.join(', ')}
- Experience Affinity: ${event.experienceAffinity}
- Relevance Score: ${event.score?.toFixed(3) || 'N/A'}
`).join('\n');
  }

  formatDetailedUserProfile(userPrefs) {
    const interests = Array.isArray(userPrefs.interests) 
      ? userPrefs.interests.join(', ') 
      : userPrefs.interests;
    
    return `**User Profile:**
- Primary Interests: ${interests}
- Preferred Location: ${userPrefs.location || 'cruise'}
- Budget Level: ${userPrefs.budget || 'moderate'}
- Travel Style: ${userPrefs.travelStyle || 'balanced'}
- Group Size: ${userPrefs.groupSize || 'individual'}
- Accessibility Needs: ${userPrefs.accessibility || 'none'}`;
  }

  getEnhancedInstruction() {
    return `**CRITICAL INSTRUCTIONS:**

You are an expert cruise travel assistant. Generate personalized recommendations based ONLY on the provided events.

**REQUIRED OUTPUT FORMAT:**
{
  "recommendations": [
    {
      "id": "rec_1",
      "title": "Recommendation title",
      "description": "Detailed description based on event data",
      "originEventId": "event_001", // REQUIRED - must reference actual event
      "personalizedAdvice": "Specific advice for this user",
      "timing": "Best time based on event details",
      "confidence": "high|medium|low",
      "grounding": ["event_001"], // Supporting event IDs
      "userRelevance": "Why this matches user interests"
    }
  ],
  "aiInsights": [
    {
      "id": "insight_1",
      "type": "timing|location|combination|personal",
      "title": "Insight title",
      "description": "Insight based on events and user profile",
      "supportingEvents": ["event_001", "event_002"],
      "relevance": "high|medium|low"
    }
  ],
  "faithfulness_score": 0.95, // Self-assessment (0.0-1.0)
  "grounding_validation": {
    "all_claims_supported": true,
    "citation_coverage": 1.0,
    "fact_check_passed": true
  }
}`;
  }

  getValidationRules() {
    return `**VALIDATION RULES (MUST FOLLOW):**

1. **Faithfulness**: Every recommendation MUST cite a specific event ID
2. **Grounding**: All claims must be supported by provided events
3. **No Hallucination**: Do not add information not present in events
4. **Personalization**: Tailor advice to user's specific interests
5. **Citation**: Include originEventId for every recommendation
6. **Self-Assessment**: Provide faithfulness_score and grounding_validation

**PROHIBITED:**
- Recommendations without event citations
- Claims not supported by event data
- Generic advice not tailored to user
- Information not present in provided events`;
  }
}
```

---

## 3. 🔍 Hallucination Detection System

### Система валидации faithfulness:
```javascript
// backend/src/services/faithfulnessValidator.js
class FaithfulnessValidator {
  constructor() {
    this.llmClient = require('./llmClient');
  }

  async validateResponse(response, retrievedEvents) {
    const validation = {
      citations: this.validateCitations(response, retrievedEvents),
      claims: await this.validateClaims(response, retrievedEvents),
      hallucination: await this.detectHallucinations(response, retrievedEvents),
      overall: {}
    };

    validation.overall = this.calculateOverallScore(validation);
    return validation;
  }

  validateCitations(response, retrievedEvents) {
    const eventIds = new Set(retrievedEvents.map(e => e.id));
    const recommendations = response.recommendations || [];
    
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

  async validateClaims(response, retrievedEvents) {
    const recommendations = response.recommendations || [];
    const claims = this.extractClaims(recommendations);
    
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

  extractClaims(recommendations) {
    return recommendations.flatMap(rec => [
      { text: rec.description, source: rec.id, type: 'description' },
      { text: rec.personalizedAdvice, source: rec.id, type: 'advice' },
      { text: rec.timing, source: rec.id, type: 'timing' }
    ].filter(claim => claim.text && claim.text.trim()));
  }

  async validateSingleClaim(claim, retrievedEvents) {
    // Проверяем, поддерживается ли утверждение данными событий
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
      supportingEvents: supportingEvents.map(e => e.id),
      confidence: supportingEvents.length / retrievedEvents.length
    };
  }

  async detectHallucinations(response, retrievedEvents) {
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
    4. Are recommendations grounded in actual event data?
    
    **Response Format:**
    {
      "hallucination_score": 0.0-1.0,
      "faithfulness_score": 0.0-1.0,
      "unsupported_claims": ["claim1", "claim2"],
      "missing_citations": ["rec1", "rec2"],
      "grounding_issues": ["issue1", "issue2"],
      "recommendations": [
        {
          "recommendation_id": "rec_1",
          "is_grounded": true,
          "supporting_events": ["event_001"],
          "unsupported_claims": [],
          "confidence": 0.95
        }
      ],
      "overall_assessment": "excellent|good|fair|poor"
    }
    `;

    try {
      const validation = await this.llmClient.generateResponse({
        systemPrompt: "You are an expert fact-checker for RAG systems. Analyze responses for faithfulness and grounding.",
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
        error: error.message
      };
    }
  }

  calculateOverallScore(validation) {
    const citationScore = validation.citations.coverage;
    const claimScore = validation.claims.supportRate;
    const hallucinationScore = 1 - (validation.hallucination.hallucination_score || 0.5);
    const faithfulnessScore = validation.hallucination.faithfulness_score || 0.5;

    return {
      overall_faithfulness: (citationScore + claimScore + hallucinationScore + faithfulnessScore) / 4,
      citation_score: citationScore,
      claim_support_score: claimScore,
      hallucination_score: hallucinationScore,
      llm_faithfulness_score: faithfulnessScore
    };
  }
}
```

---

## 4. 📊 Enhanced Retrieval с Reranking

### Улучшенный EventRetriever:
```javascript
// backend/src/services/enhancedEventRetriever.js
class EnhancedEventRetriever extends EventRetriever {
  constructor(vectorStore = null) {
    super(vectorStore);
    this.reranker = new Reranker();
    this.queryExpander = new QueryExpander();
  }

  async retrieveRelevantEvents(userPrefs, topK = 5) {
    try {
      // 1. Query Expansion
      const expandedQuery = await this.queryExpander.expandQuery(userPrefs);
      
      // 2. Initial Retrieval (больше результатов для reranking)
      const initialResults = await this.performInitialRetrieval(expandedQuery, topK * 3);
      
      // 3. Reranking
      const rerankedResults = await this.reranker.rerank(initialResults, userPrefs);
      
      // 4. Final Filtering
      const finalResults = this.applyFinalFilters(rerankedResults, userPrefs, topK);
      
      return finalResults;
    } catch (error) {
      logger.error('Error in enhanced retrieval:', error);
      throw error;
    }
  }

  async performInitialRetrieval(expandedQuery, topK) {
    const embedding = await this.vectorStore.generateEmbedding(expandedQuery);
    const searchResults = await this.vectorStore.query(embedding, topK);
    return this.transformAndValidateResults(searchResults);
  }

  async applyFinalFilters(results, userPrefs, topK) {
    // Применяем дополнительные фильтры
    let filtered = results;

    // Фильтр по бюджету
    if (userPrefs.budget) {
      filtered = this.filterByBudget(filtered, userPrefs.budget);
    }

    // Фильтр по доступности
    filtered = this.filterByAvailability(filtered);

    // Фильтр по сезонности
    filtered = this.filterBySeasonality(filtered, userPrefs.location);

    return filtered.slice(0, topK);
  }

  filterByBudget(events, budget) {
    const budgetLevels = {
      'budget': 0.3,
      'moderate': 0.6,
      'luxury': 0.8
    };
    
    const threshold = budgetLevels[budget] || 0.5;
    return events.filter(event => event.score >= threshold);
  }

  filterByAvailability(events) {
    // Фильтр по доступности (если есть данные)
    return events.filter(event => !event.unavailable);
  }

  filterBySeasonality(events, location) {
    // Фильтр по сезонности
    const currentSeason = this.getCurrentSeason();
    return events.filter(event => 
      !event.seasonalRestrictions || 
      event.seasonalRestrictions.includes(currentSeason)
    );
  }

  getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }
}

// Reranker для вторичного ранжирования
class Reranker {
  async rerank(results, userPrefs) {
    const reranked = await Promise.all(
      results.map(async (result) => {
        const score = await this.calculateRerankScore(result, userPrefs);
        return { ...result, rerankScore: score };
      })
    );

    return reranked
      .sort((a, b) => b.rerankScore - a.rerankScore)
      .map(({ rerankScore, ...result }) => result);
  }

  async calculateRerankScore(result, userPrefs) {
    let score = result.score || 0;

    // Бонус за соответствие интересам
    const interestMatch = this.calculateInterestMatch(result, userPrefs.interests);
    score += interestMatch * 0.3;

    // Бонус за соответствие локации
    const locationMatch = this.calculateLocationMatch(result, userPrefs.location);
    score += locationMatch * 0.2;

    // Бонус за популярность/рейтинг
    const popularityBonus = result.popularity || 0;
    score += popularityBonus * 0.1;

    // Бонус за уникальность
    const uniquenessBonus = result.unique ? 0.1 : 0;
    score += uniquenessBonus;

    return Math.min(score, 1.0);
  }

  calculateInterestMatch(result, interests) {
    if (!interests || !Array.isArray(interests)) return 0;
    
    const resultTags = result.tags || [];
    const resultText = `${result.title} ${result.description}`.toLowerCase();
    
    let matches = 0;
    interests.forEach(interest => {
      if (resultTags.includes(interest) || resultText.includes(interest.toLowerCase())) {
        matches++;
      }
    });
    
    return matches / interests.length;
  }

  calculateLocationMatch(result, location) {
    if (!location || !result.location) return 0;
    
    const resultLocation = result.location.toLowerCase();
    const userLocation = location.toLowerCase();
    
    if (resultLocation === userLocation) return 1.0;
    if (resultLocation.includes(userLocation) || userLocation.includes(resultLocation)) return 0.7;
    if (resultLocation === 'various' || resultLocation === 'anywhere') return 0.5;
    
    return 0.0;
  }
}

// Query Expander для расширения запросов
class QueryExpander {
  async expandQuery(userPrefs) {
    const baseQuery = this.buildBaseQuery(userPrefs);
    const expandedTerms = await this.getExpandedTerms(userPrefs.interests);
    
    return `${baseQuery} ${expandedTerms.join(' ')}`.trim();
  }

  buildBaseQuery(userPrefs) {
    const interests = Array.isArray(userPrefs.interests) 
      ? userPrefs.interests.join(' ') 
      : userPrefs.interests;
    
    const location = userPrefs.location || '';
    return `${interests} ${location}`.trim();
  }

  async getExpandedTerms(interests) {
    const expansionMap = {
      'culture': ['art', 'history', 'museum', 'heritage', 'tradition'],
      'wellness': ['health', 'fitness', 'spa', 'relaxation', 'meditation'],
      'entertainment': ['music', 'show', 'performance', 'dance', 'theater'],
      'dining': ['food', 'cuisine', 'restaurant', 'gourmet', 'wine'],
      'adventure': ['sport', 'outdoor', 'exploration', 'thrill', 'activity']
    };

    const expanded = [];
    if (Array.isArray(interests)) {
      interests.forEach(interest => {
        const terms = expansionMap[interest.toLowerCase()] || [];
        expanded.push(...terms);
      });
    }

    return expanded;
  }
}
```

---

## 5. 📈 Continuous Monitoring System

### Система мониторинга:
```javascript
// backend/src/services/monitoringService.js
class MonitoringService {
  constructor() {
    this.metrics = {
      retrieval: new MetricsCollector('retrieval'),
      generation: new MetricsCollector('generation'),
      system: new MetricsCollector('system')
    };
    
    this.alertThresholds = {
      faithfulness_threshold: 0.8,
      response_time_threshold: 2000, // ms
      error_rate_threshold: 0.05
    };
  }

  async monitorRequest(request, response, startTime) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    const metrics = {
      retrieval: await this.calculateRetrievalMetrics(request, response),
      generation: await this.calculateGenerationMetrics(request, response),
      system: {
        response_time: responseTime,
        timestamp: new Date().toISOString(),
        success: response.success || false
      }
    };

    // Сохраняем метрики
    this.updateMetrics(metrics);

    // Проверяем аномалии
    await this.checkAnomalies(metrics);

    return metrics;
  }

  async calculateRetrievalMetrics(request, response) {
    const retrievedEvents = response.retrievedEvents || [];
    const userPrefs = request.userPrefs || {};

    return {
      events_retrieved: retrievedEvents.length,
      avg_relevance_score: this.calculateAverageScore(retrievedEvents),
      min_affinity_threshold: response.minAffinity || 0.4,
      query_complexity: this.calculateQueryComplexity(userPrefs),
      retrieval_success: retrievedEvents.length > 0
    };
  }

  async calculateGenerationMetrics(request, response) {
    const recommendations = response.recommendations || [];
    const ragSources = response.ragSources || [];

    // Используем faithfulness validator если доступен
    let faithfulnessScore = 0.7; // Default
    if (response.faithfulness_score) {
      faithfulnessScore = response.faithfulness_score;
    }

    return {
      recommendations_generated: recommendations.length,
      rag_sources_used: ragSources.length,
      faithfulness_score: faithfulnessScore,
      citation_coverage: this.calculateCitationCoverage(recommendations, ragSources),
      response_quality: this.assessResponseQuality(response)
    };
  }

  calculateAverageScore(events) {
    if (events.length === 0) return 0;
    const scores = events.map(e => e.score || 0);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  calculateQueryComplexity(userPrefs) {
    let complexity = 1;
    if (userPrefs.interests && Array.isArray(userPrefs.interests)) {
      complexity += userPrefs.interests.length * 0.2;
    }
    if (userPrefs.location) complexity += 0.3;
    if (userPrefs.budget) complexity += 0.2;
    return Math.min(complexity, 3.0);
  }

  calculateCitationCoverage(recommendations, ragSources) {
    if (recommendations.length === 0) return 0;
    
    const citedRecommendations = recommendations.filter(rec => 
      rec.originEventId && ragSources.some(source => source.id === rec.originEventId)
    );
    
    return citedRecommendations.length / recommendations.length;
  }

  assessResponseQuality(response) {
    let quality = 0.5; // Base quality
    
    if (response.recommendations && response.recommendations.length > 0) quality += 0.2;
    if (response.aiInsights && response.aiInsights.length > 0) quality += 0.1;
    if (response.ragSources && response.ragSources.length > 0) quality += 0.1;
    if (response.faithfulness_score && response.faithfulness_score > 0.8) quality += 0.1;
    
    return Math.min(quality, 1.0);
  }

  async checkAnomalies(metrics) {
    const anomalies = [];

    // Проверяем faithfulness
    if (metrics.generation.faithfulness_score < this.alertThresholds.faithfulness_threshold) {
      anomalies.push({
        type: 'low_faithfulness',
        value: metrics.generation.faithfulness_score,
        threshold: this.alertThresholds.faithfulness_threshold
      });
    }

    // Проверяем response time
    if (metrics.system.response_time > this.alertThresholds.response_time_threshold) {
      anomalies.push({
        type: 'high_response_time',
        value: metrics.system.response_time,
        threshold: this.alertThresholds.response_time_threshold
      });
    }

    // Проверяем error rate
    if (!metrics.system.success) {
      anomalies.push({
        type: 'request_failure',
        value: 0,
        threshold: 1
      });
    }

    if (anomalies.length > 0) {
      await this.sendAlert(anomalies, metrics);
    }
  }

  async sendAlert(anomalies, metrics) {
    const alert = {
      timestamp: new Date().toISOString(),
      anomalies: anomalies,
      metrics: metrics,
      severity: this.calculateSeverity(anomalies)
    };

    logger.error('RAG System Anomalies Detected:', alert);
    
    // Здесь можно добавить отправку в Slack, email, etc.
    // await this.sendToSlack(alert);
    // await this.sendToEmail(alert);
  }

  calculateSeverity(anomalies) {
    const criticalAnomalies = anomalies.filter(a => 
      a.type === 'low_faithfulness' || a.type === 'request_failure'
    );
    
    if (criticalAnomalies.length > 0) return 'critical';
    if (anomalies.length > 2) return 'warning';
    return 'info';
  }

  updateMetrics(newMetrics) {
    Object.keys(newMetrics).forEach(category => {
      this.metrics[category].add(newMetrics[category]);
    });
  }

  getMetricsSummary() {
    const summary = {};
    Object.keys(this.metrics).forEach(category => {
      summary[category] = this.metrics[category].getSummary();
    });
    return summary;
  }
}

// Коллектор метрик
class MetricsCollector {
  constructor(name) {
    this.name = name;
    this.data = [];
    this.maxDataPoints = 1000; // Ограничиваем количество точек данных
  }

  add(metrics) {
    this.data.push({
      ...metrics,
      timestamp: new Date().toISOString()
    });

    // Ограничиваем размер данных
    if (this.data.length > this.maxDataPoints) {
      this.data = this.data.slice(-this.maxDataPoints);
    }
  }

  getSummary() {
    if (this.data.length === 0) return {};

    const numericFields = this.getNumericFields();
    const summary = {};

    numericFields.forEach(field => {
      const values = this.data
        .map(d => d[field])
        .filter(v => typeof v === 'number' && !isNaN(v));
      
      if (values.length > 0) {
        summary[field] = {
          avg: values.reduce((sum, v) => sum + v, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    });

    return summary;
  }

  getNumericFields() {
    const fields = new Set();
    this.data.forEach(d => {
      Object.keys(d).forEach(key => {
        if (typeof d[key] === 'number' && !isNaN(d[key])) {
          fields.add(key);
        }
      });
    });
    return Array.from(fields);
  }
}
```

---

## 6. 🧪 Synthetic Test Dataset

### Создание тестового датасета:
```javascript
// backend/src/tests/syntheticTestDataset.js
class SyntheticTestDataset {
  constructor() {
    this.testCases = this.generateTestCases();
  }

  generateTestCases() {
    return [
      {
        id: "test_001",
        name: "Mediterranean Culture & Wellness",
        userPrefs: {
          interests: ["culture", "wellness"],
          location: "Mediterranean",
          budget: "moderate"
        },
        expected: {
          events: ["event_009", "event_010", "event_011", "event_012"],
          recommendations: 3,
          faithfulness: 0.95,
          responseTime: 2000
        }
      },
      {
        id: "test_002",
        name: "Caribbean Entertainment & Dining",
        userPrefs: {
          interests: ["entertainment", "dining"],
          location: "Caribbean",
          budget: "luxury"
        },
        expected: {
          events: ["event_001", "event_003", "event_008"],
          recommendations: 3,
          faithfulness: 0.95,
          responseTime: 2000
        }
      },
      {
        id: "test_003",
        name: "Adventure & Education",
        userPrefs: {
          interests: ["adventure", "education"],
          location: "Alaska",
          budget: "budget"
        },
        expected: {
          events: ["event_004", "event_006"],
          recommendations: 2,
          faithfulness: 0.95,
          responseTime: 2000
        }
      }
    ];
  }

  async runAllTests(ragService) {
    const results = [];
    
    for (const testCase of this.testCases) {
      const result = await this.runTest(ragService, testCase);
      results.push(result);
    }
    
    return this.analyzeResults(results);
  }

  async runTest(ragService, testCase) {
    const startTime = Date.now();
    
    try {
      const response = await ragService.generateRecommendations(
        testCase.userPrefs,
        { topK: 5, minAffinity: 0.4 }
      );
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        testCase: testCase,
        response: response,
        responseTime: responseTime,
        metrics: this.calculateTestMetrics(response, testCase, responseTime)
      };
    } catch (error) {
      return {
        testCase: testCase,
        error: error.message,
        responseTime: Date.now() - startTime,
        metrics: {
          success: false,
          error: error.message
        }
      };
    }
  }

  calculateTestMetrics(response, testCase, responseTime) {
    if (!response.success) {
      return {
        success: false,
        error: response.error
      };
    }

    const retrievedEvents = response.retrievedEvents || [];
    const recommendations = response.recommendations || [];
    const ragSources = response.ragSources || [];

    return {
      success: true,
      retrieval: {
        eventsRetrieved: retrievedEvents.length,
        expectedEvents: testCase.expected.events.length,
        retrievalAccuracy: this.calculateRetrievalAccuracy(retrievedEvents, testCase.expected.events)
      },
      generation: {
        recommendationsGenerated: recommendations.length,
        expectedRecommendations: testCase.expected.recommendations,
        citationCoverage: this.calculateCitationCoverage(recommendations, ragSources),
        faithfulness: response.faithfulness_score || 0.7
      },
      performance: {
        responseTime: responseTime,
        expectedResponseTime: testCase.expected.responseTime,
        withinTimeLimit: responseTime <= testCase.expected.responseTime
      },
      overall: {
        testPassed: this.evaluateTestPass(response, testCase, responseTime),
        score: this.calculateOverallScore(response, testCase, responseTime)
      }
    };
  }

  calculateRetrievalAccuracy(retrievedEvents, expectedEventIds) {
    if (retrievedEvents.length === 0) return 0;
    
    const retrievedIds = new Set(retrievedEvents.map(e => e.id));
    const expectedIds = new Set(expectedEventIds);
    
    const correctRetrievals = expectedEventIds.filter(id => retrievedIds.has(id));
    return correctRetrievals.length / expectedEventIds.length;
  }

  calculateCitationCoverage(recommendations, ragSources) {
    if (recommendations.length === 0) return 0;
    
    const ragSourceIds = new Set(ragSources.map(s => s.id));
    const citedRecommendations = recommendations.filter(rec => 
      rec.originEventId && ragSourceIds.has(rec.originEventId)
    );
    
    return citedRecommendations.length / recommendations.length;
  }

  evaluateTestPass(response, testCase, responseTime) {
    if (!response.success) return false;
    
    const recommendations = response.recommendations || [];
    const faithfulness = response.faithfulness_score || 0.7;
    
    return (
      recommendations.length >= testCase.expected.recommendations &&
      faithfulness >= testCase.expected.faithfulness &&
      responseTime <= testCase.expected.responseTime
    );
  }

  calculateOverallScore(response, testCase, responseTime) {
    if (!response.success) return 0;
    
    const retrievalAccuracy = this.calculateRetrievalAccuracy(
      response.retrievedEvents || [], 
      testCase.expected.events
    );
    
    const citationCoverage = this.calculateCitationCoverage(
      response.recommendations || [], 
      response.ragSources || []
    );
    
    const faithfulness = response.faithfulness_score || 0.7;
    const timeScore = responseTime <= testCase.expected.responseTime ? 1.0 : 0.5;
    
    return (retrievalAccuracy + citationCoverage + faithfulness + timeScore) / 4;
  }

  analyzeResults(results) {
    const summary = {
      totalTests: results.length,
      passedTests: results.filter(r => r.metrics.overall?.testPassed).length,
      failedTests: results.filter(r => !r.metrics.overall?.testPassed).length,
      averageScore: 0,
      performance: {
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity
      },
      metrics: {
        averageRetrievalAccuracy: 0,
        averageCitationCoverage: 0,
        averageFaithfulness: 0
      }
    };

    const successfulResults = results.filter(r => r.metrics.success);
    
    if (successfulResults.length > 0) {
      summary.averageScore = successfulResults.reduce((sum, r) => 
        sum + (r.metrics.overall?.score || 0), 0) / successfulResults.length;
      
      summary.performance.averageResponseTime = successfulResults.reduce((sum, r) => 
        sum + r.responseTime, 0) / successfulResults.length;
      
      summary.performance.maxResponseTime = Math.max(...successfulResults.map(r => r.responseTime));
      summary.performance.minResponseTime = Math.min(...successfulResults.map(r => r.responseTime));
      
      summary.metrics.averageRetrievalAccuracy = successfulResults.reduce((sum, r) => 
        sum + (r.metrics.retrieval?.retrievalAccuracy || 0), 0) / successfulResults.length;
      
      summary.metrics.averageCitationCoverage = successfulResults.reduce((sum, r) => 
        sum + (r.metrics.generation?.citationCoverage || 0), 0) / successfulResults.length;
      
      summary.metrics.averageFaithfulness = successfulResults.reduce((sum, r) => 
        sum + (r.metrics.generation?.faithfulness || 0), 0) / successfulResults.length;
    }

    return {
      summary: summary,
      detailedResults: results
    };
  }
}
```

---

## 🎯 Заключение

Эти практические примеры демонстрируют конкретные способы улучшения RAG-системы:

1. **Обновление embedding модели** - критично для качества retrieval
2. **Улучшенный prompt engineering** - предотвращает hallucination
3. **Faithfulness validation** - обеспечивает groundedness
4. **Enhanced retrieval** - улучшает качество результатов
5. **Continuous monitoring** - отслеживает деградацию
6. **Synthetic testing** - обеспечивает стабильность

Внедрение этих улучшений должно значительно повысить качество и надёжность RAG-системы Cruise Assistant. 