# RAG Recommendations System

## Overview

The RAG (Retrieval-Augmented Generation) Recommendations System is a comprehensive solution that combines vector search, prompt generation, and GPT-4 integration to provide personalized cruise recommendations based on user preferences.

## Architecture

The system consists of several key components:

1. **EventRetriever** - Retrieves relevant events based on user preferences
2. **PromptGenerator** - Generates GPT-4 compatible prompts
3. **RAGRecommendationService** - Orchestrates the entire RAG pipeline
4. **LLM Integration** - Calls GPT-4 for personalized recommendations

## API Endpoints

### POST /recommendRAG

Generates personalized RAG-based recommendations using GPT-4.

#### Request Body

```json
{
  "userPrefs": {
    "interests": ["culture", "wellness"],
    "location": "Mediterranean"
  },
  "options": {
    "topK": 5,
    "minAffinity": 0.4,
    "promptType": "standard",
    "maxTokens": 1000
  }
}
```

#### Response Structure

```json
{
  "success": true,
  "userPrefs": {
    "interests": ["culture", "wellness"],
    "location": "Mediterranean"
  },
  "retrievedEvents": [
    {
      "id": "event_001",
      "title": "Live Jazz Evening",
      "type": "entertainment",
      "score": 0.85,
      "experienceAffinity": "relaxation"
    }
  ],
  "recommendations": [
    {
      "id": "rec_1",
      "title": "Evening Jazz Experience",
      "description": "Perfect for culture enthusiasts",
      "timing": "7:00 PM - 9:00 PM",
      "originEventId": "event_001",
      "personalizedAdvice": "Arrive early to secure the best seats"
    }
  ],
  "aiInsights": [
    {
      "id": "insight_1",
      "type": "timing",
      "title": "Optimal Evening Schedule",
      "description": "Combine yoga and jazz for a perfect evening",
      "relevance": "high"
    }
  ],
  "ragSources": [
    {
      "id": "event_001",
      "title": "Live Jazz Evening",
      "type": "entertainment",
      "experienceAffinity": "relaxation",
      "score": 0.85,
      "tags": ["jazz", "music", "culture"]
    }
  ],
  "prompt": {
    "type": "standard",
    "content": "Generated prompt content...",
    "estimatedTokens": 150,
    "maxTokens": 300
  },
  "count": 1,
  "minAffinity": 0.4,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Features

### 1. Intelligent Event Retrieval
- Vector-based search using user interests and location
- Affinity scoring to ensure relevance
- Configurable top-K results

### 2. GPT-4 Integration
- Structured prompt generation
- JSON response parsing
- Error handling for malformed responses
- Token limit management

### 3. Personalized Recommendations
- Context-aware suggestions
- Timing recommendations
- Personalized advice
- Origin tracking for transparency

### 4. AI Insights
- Timing insights
- Location-based recommendations
- Combination suggestions
- Personalization tips

### 5. RAG Source Tracking
- Transparent source attribution
- Event metadata preservation
- Affinity score tracking
- Tag-based categorization

## Configuration Options

### User Preferences
- **interests** (required): Array of user interests
- **location** (optional): Cruise region or location

### Service Options
- **topK** (default: 5): Number of events to retrieve
- **minAffinity** (default: 0.4): Minimum affinity score threshold
- **promptType** (default: "standard"): Prompt generation type
- **maxTokens** (default: 1000): Maximum tokens for GPT-4 response

## Error Handling

The system handles various error scenarios:

1. **Missing User Preferences**: Returns 400 error for missing interests
2. **No Relevant Events**: Returns 200 with empty recommendations
3. **GPT Response Errors**: Gracefully handles malformed responses
4. **Service Errors**: Returns 500 with detailed error information
5. **Validation Errors**: Ensures response structure integrity

## Testing

### Unit Tests
- `RAGRecommendationService` functionality
- Response parsing and normalization
- Error handling scenarios
- Validation logic

### Integration Tests
- End-to-end API testing
- Mock-based testing without API keys
- Response structure validation
- Error scenario coverage

## Usage Examples

### Basic Usage

```javascript
const RAGRecommendationService = require('./services/ragRecommendationService');

const ragService = new RAGRecommendationService();
const userPrefs = {
  interests: ['culture', 'wellness'],
  location: 'Mediterranean'
};

const response = await ragService.generateRecommendations(userPrefs);
```

### Advanced Usage

```javascript
const response = await ragService.generateRecommendations(userPrefs, {
  topK: 10,
  minAffinity: 0.6,
  promptType: 'detailed',
  maxTokens: 1500
});
```

### API Usage

```bash
curl -X POST http://localhost:3000/recommendRAG \
  -H "Content-Type: application/json" \
  -d '{
    "userPrefs": {
      "interests": ["culture", "wellness"],
      "location": "Mediterranean"
    },
    "options": {
      "topK": 5,
      "minAffinity": 0.4
    }
  }'
```

## Response Validation

The system validates all responses to ensure:

1. **Required Fields**: All mandatory fields are present
2. **Data Types**: Arrays and objects have correct structure
3. **Content Integrity**: Recommendations reference valid events
4. **Source Attribution**: RAG sources are properly tracked

## Performance Considerations

1. **Token Management**: Automatic prompt truncation to stay within limits
2. **Caching**: Consider implementing response caching for similar queries
3. **Rate Limiting**: Implement rate limiting for GPT-4 API calls
4. **Monitoring**: Track response times and success rates

## Security

1. **Input Validation**: All user inputs are validated
2. **Error Sanitization**: Sensitive information is not exposed in errors
3. **API Key Management**: Secure handling of OpenAI API keys
4. **Request Logging**: Comprehensive logging for debugging

## Future Enhancements

1. **Multi-Modal Support**: Integration with image and video content
2. **Real-Time Updates**: Dynamic event availability updates
3. **User Feedback**: Learning from user interactions
4. **Advanced Filtering**: More sophisticated preference matching
5. **Performance Optimization**: Caching and query optimization

## Dependencies

- OpenAI GPT-4 API
- Vector database (Pinecone/Chroma)
- Node.js runtime
- Express.js framework

## Setup

1. Install dependencies: `npm install`
2. Configure environment variables
3. Set up vector database
4. Configure OpenAI API key
5. Run tests: `npm test`
6. Start server: `npm start`

## Monitoring

Monitor the following metrics:

- Response times
- Success rates
- Token usage
- Error rates
- User satisfaction scores

## Support

For issues and questions:

1. Check the test suite for examples
2. Review error logs
3. Validate input data
4. Check API key configuration
5. Verify vector database connectivity 