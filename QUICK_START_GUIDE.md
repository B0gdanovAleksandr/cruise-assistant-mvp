# 🚀 Quick Start Guide - Entity Resolution & Insights API

## Quick start with new endpoints

### 1. EntityResolver - Basic Usage

#### Simple call
```javascript
const entityResolver = require('./services/entityResolver');

// Basic call
const result = await entityResolver.resolveEntities([
  "Jazz Music", 
  "Fine Dining", 
  "Mediterranean Culture"
]);

console.log(`Resolved ${result.entities.length} entities`);
console.log(`Confidence: ${result.metadata.confidence}`);
console.log(`Fallback used: ${result.metadata.fallback}`);
```

#### With configuration
```javascript
const result = await entityResolver.resolveEntities(
  ["Jazz Music", "Fine Dining"],
  {
    confidenceThreshold: 0.6,  // Medium threshold
    limit: 15,                 // Up to 15 entities
    types: ["brand", "place", "tag", "audience"]
  }
);
```

### 2. Insights API - Get taste profile

#### Basic call
```javascript
const qlooClient = require('./services/qlooClient').instance;

// Get insights for entities
const insights = await qlooClient.getInsights([
  "urn:brand:music:jazz_legends",
  "urn:place:restaurant:fine_dining"
]);

console.log(`Profile strength: ${insights.metadata.profileStrength}`);
console.log(`Insights count: ${insights.insights.length}`);
```

#### Handle fallback
```javascript
const insights = await qlooClient.getInsights(entityIds);

if (insights.metadata.fallback) {
  console.log('Using fallback insights:', insights.metadata.source);
}

// Check profile quality
if (insights.metadata.profileStrength < 0.5) {
  console.warn('Low profile strength, consider more entities');
}
```

### 3. Complete pipeline

#### Integrated workflow
```javascript
const completeWorkflow = async (interests, location, budget) => {
  // 1. Entity Resolution
  const entityResult = await entityResolver.resolveEntities(interests, {
    confidenceThreshold: 0.6,
    limit: 15
  });
  
  // 2. Extract high-confidence entities
  const entityIds = entityResult.entities
    .filter(e => e.confidence >= 0.6)
    .map(e => e.urn || e.entity_id);
  
  // 3. Get Insights
  const insights = await qlooClient.getInsights(entityIds);
  
  // 4. Get Recommendations
  const recommendations = await qlooClient.getRecommendations(entityIds);
  
  // 5. Enhance with LLM
  const enhanced = await llmClient.enhanceRecommendations(
    recommendations,
    { interests, location, budget },
    insights
  );
  
  return {
    entities: entityResult.entities,
    insights: insights,
    recommendations: enhanced,
    quality: {
      entityConfidence: entityResult.metadata.confidence,
      profileStrength: insights.metadata.profileStrength,
      fallbackUsed: entityResult.metadata.fallback || insights.metadata.fallback
    }
  };
};
```

### 4. Error handling

#### Robust error handling
```javascript
const safeEntityResolution = async (interests) => {
  try {
    const result = await entityResolver.resolveEntities(interests);
    
    // Check result quality
    if (result.metadata.confidence < 0.4) {
      console.warn('Low confidence resolution');
    }
    
    if (result.metadata.fallback) {
      console.warn('Using fallback resolution');
    }
    
    return result.entities;
  } catch (error) {
    console.error('Entity resolution failed:', error.message);
    
    // Emergency fallback
    return interests.map(interest => ({
      urn: `urn:tag:emergency:${interest.toLowerCase().replace(/\s+/g, '_')}`,
      name: interest,
      type: 'tag',
      confidence: 0.3,
      source: 'emergency'
    }));
  }
};
```

### 5. Monitoring and metrics

#### Key metrics to track
```javascript
const metrics = {
  // Entity Resolution
  entityResolutionTime: 0,
  entityConfidence: 0,
  fallbackUsageRate: 0,
  
  // Insights
  insightsProcessingTime: 0,
  profileStrength: 0,
  crossTypeInsightsCount: 0,
  
  // Quality
  averageConfidence: 0,
  successfulResolutions: 0,
  errorRate: 0
};

// Example metric collection
const collectMetrics = async (interests) => {
  const startTime = Date.now();
  
  try {
    const result = await entityResolver.resolveEntities(interests);
    
    metrics.entityResolutionTime = Date.now() - startTime;
    metrics.entityConfidence = result.metadata.confidence;
    metrics.fallbackUsageRate = result.metadata.fallback ? 1 : 0;
    metrics.successfulResolutions++;
    
    return result;
  } catch (error) {
    metrics.errorRate++;
    throw error;
  }
};
```

### 6. Configuration for different environments

#### Development
```javascript
const devConfig = {
  confidenceThreshold: 0.4,  // Lower threshold for more entities
  limit: 20,                 // More entities for testing
  types: ["tag", "audience"], // Simplified types
  useMock: true              // Use mock data
};
```

#### Production
```javascript
const prodConfig = {
  confidenceThreshold: 0.6,  // High threshold for quality
  limit: 15,                 // Optimal number
  types: ["brand", "place", "tag", "audience"], // All types
  useMock: false             // Only real data
};
```

#### Testing
```javascript
const testConfig = {
  confidenceThreshold: 0.5,  // Medium threshold
  limit: 10,                 // Limited number
  types: ["tag"],            // Only one type
  useMock: true              // Mock data for tests
};
```

### 7. Usage examples

#### Example 1: Music interests
```javascript
const musicInterests = ["Jazz Music", "Classical Music", "Live Performances"];

const result = await entityResolver.resolveEntities(musicInterests, {
  confidenceThreshold: 0.7,  // High threshold for music
  types: ["brand", "tag"]    // Focus on brands and tags
});

// Expected entities:
// - urn:brand:music:jazz_legends
// - urn:tag:genre:classical
// - urn:tag:activity:live_music
```

#### Example 2: Culinary interests
```javascript
const foodInterests = ["Fine Dining", "Mediterranean Cuisine", "Wine Tasting"];

const result = await entityResolver.resolveEntities(foodInterests, {
  confidenceThreshold: 0.6,
  types: ["place", "tag", "brand"]
});

// Expected entities:
// - urn:place:restaurant:fine_dining
// - urn:tag:cuisine:mediterranean
// - urn:tag:activity:wine_tasting
```

#### Example 3: Travel interests
```javascript
const travelInterests = ["Mediterranean Culture", "Historical Sites", "Adventure"];

const result = await entityResolver.resolveEntities(travelInterests, {
  confidenceThreshold: 0.5,  // Lower threshold for diversity
  types: ["place", "tag", "audience"]
});

// Expected entities:
// - urn:place:region:mediterranean
// - urn:tag:activity:historical_tourism
// - urn:tag:activity:adventure
```

### 8. Troubleshooting

#### Common problems and solutions

**Problem**: Low confidence score
```javascript
// Solution: Lower threshold
const result = await entityResolver.resolveEntities(interests, {
  confidenceThreshold: 0.4  // Instead of 0.6
});
```

**Problem**: Fallback used too often
```javascript
// Solution: Check API key and connectivity
console.log('API Key available:', !!process.env.QLOO_API_KEY);
console.log('API URL:', process.env.QLOO_API_URL);
```

**Problem**: Slow processing
```javascript
// Solution: Reduce number of entities
const result = await entityResolver.resolveEntities(interests, {
  limit: 10  // Instead of 15
});
```

**Problem**: Empty insights
```javascript
// Solution: Check entity IDs
const insights = await qlooClient.getInsights(entityIds);
if (insights.metadata.totalInsights === 0) {
  console.warn('No insights extracted, check entity IDs');
}
```

### 9. Best practices summary

#### ✅ Recommended
- Use confidence threshold 0.6 for production
- Handle fallback scenarios
- Monitor result quality
- Cache entity resolution results
- Use batch processing for multiple requests

#### ❌ Not recommended
- Use too low confidence threshold (< 0.3)
- Ignore fallback indicators
- Send too many interests (> 10)
- Don't handle API errors
- Use mock data in production

### 10. Next steps

1. **Test** basic calls with different interests
2. **Configure** confidence thresholds for your use case
3. **Implement** error handling and fallback logic
4. **Add** monitoring and metrics
5. **Optimize** performance with caching
6. **Integrate** into production pipeline

For detailed information, refer to the full technical documentation in `TECHNICAL_DOCUMENTATION.md`. 