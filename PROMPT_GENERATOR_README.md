# Prompt Generator for Cruise Assistant

## Overview

The `PromptGenerator` service is designed to create GPT-4 compatible prompts from retrieved events and user preferences. It generates structured prompts that include event information, user preferences, and specific instructions for generating personalized recommendations.

## Features

- **Multiple Prompt Types**: Standard, compact, and detailed prompt generation
- **Token Limit Management**: Automatic truncation to stay within 300 token limit
- **Flexible Formatting**: Configurable inclusion of tags, affinity scores, and metadata
- **Validation**: Robust input validation for events and user preferences
- **Token Estimation**: Built-in token counting for prompt optimization

## API Endpoints

### POST `/prompts/generate`

Generates a GPT-4 compatible prompt from retrieved events and user preferences.

**Request Body:**
```json
{
  "userPrefs": {
    "interests": ["culture", "wellness"],
    "location": "Mediterranean"
  },
  "topK": 5,
  "minAffinity": 0.4,
  "promptType": "standard"
}
```

**Parameters:**
- `userPrefs.interests` (required): Array of user interests
- `userPrefs.location` (optional): User location/cruise region
- `topK` (optional): Number of events to retrieve (default: 5)
- `minAffinity` (optional): Minimum affinity score (default: 0.4)
- `promptType` (optional): Type of prompt to generate - "standard", "compact", or "detailed" (default: "standard")

**Response:**
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
  "prompt": {
    "type": "standard",
    "content": "Available Events:\n1. Live Jazz Evening - entertainment (affinity: 0.85)\n...",
    "estimatedTokens": 106,
    "maxTokens": 300
  },
  "count": 1,
  "minAffinity": 0.4,
  "timestamp": "2025-07-27T18:36:26.742Z"
}
```

## Prompt Types

### 1. Standard Prompt
The default prompt format that includes:
- Numbered list of events with titles, types, and affinity scores
- User profile with interests and location
- Recommendation instruction

**Example:**
```
Available Events:
1. Live Jazz Evening - entertainment (affinity: 0.85)
2. Sunset Yoga Class - activity (affinity: 0.75)

User Profile:
- Interests: culture, wellness
- Location: Mediterranean

Recommend experiences with personalized advice, timing suggestions, and cite origin of each recommendation.
```

### 2. Compact Prompt
A condensed format for quick recommendations:
- Limited to top 3 events
- Concise format with minimal details
- Optimized for token efficiency

**Example:**
```
Events: 1. Live Jazz Evening (entertainment); 2. Sunset Yoga Class (activity). User: culture, wellness in Mediterranean. Recommend with advice and timing.
```

### 3. Detailed Prompt
Enhanced format with additional context:
- Configurable inclusion of tags and affinity scores
- Customizable number of events
- Rich metadata for comprehensive recommendations

**Example:**
```
Available Events:
1. Live Jazz Evening - entertainment (affinity: 0.85) [jazz, music, culture]
2. Sunset Yoga Class - activity (affinity: 0.75) [yoga, sunset, wellness]

User Profile:
- Interests: culture, wellness
- Location: Mediterranean

Recommend experiences with personalized advice, timing suggestions, and cite origin of each recommendation.
```

## Usage Examples

### Basic Usage
```javascript
const PromptGenerator = require('./services/promptGenerator');

const promptGenerator = new PromptGenerator();
const retrievedEvents = [
  {
    id: 'event_001',
    title: 'Live Jazz Evening',
    type: 'entertainment',
    score: 0.85,
    experienceAffinity: 'relaxation',
    tags: ['jazz', 'music', 'culture']
  }
];

const userPrefs = {
  interests: ['culture', 'wellness'],
  location: 'Mediterranean'
};

const prompt = promptGenerator.generateRecommendationPrompt(retrievedEvents, userPrefs);
console.log(prompt);
```

### Compact Prompt
```javascript
const compactPrompt = promptGenerator.generateCompactPrompt(retrievedEvents, userPrefs);
```

### Detailed Prompt with Options
```javascript
const detailedPrompt = promptGenerator.generateDetailedPrompt(retrievedEvents, userPrefs, {
  includeTags: true,
  includeAffinity: true,
  maxEvents: 3
});
```

### Token Estimation
```javascript
const estimatedTokens = promptGenerator.estimateTokens(prompt);
console.log(`Prompt uses approximately ${estimatedTokens} tokens`);
```

## Configuration

### Token Limits
The default maximum token limit is 300. This can be modified in the constructor:

```javascript
const promptGenerator = new PromptGenerator();
promptGenerator.maxTokens = 500; // Custom token limit
```

### Token Estimation
The service uses a rough estimation of 1 token ≈ 4 characters for English text. This provides a reasonable approximation for token counting without requiring the actual OpenAI tokenizer.

## Error Handling

The service includes comprehensive error handling:

- **Empty Events Array**: Throws error if no events are provided
- **Missing User Preferences**: Throws error if interests are not specified
- **Token Limit Exceeded**: Automatically truncates prompts to fit within limits
- **Invalid Input**: Validates event structure and user preference format

## Testing

Run the test suite:
```bash
npm test -- --testPathPattern=promptGenerator
```

### Test Coverage
- Prompt generation for all types (standard, compact, detailed)
- Token estimation accuracy
- Input validation
- Error handling
- Token limit enforcement
- Specific test case for Mediterranean culture/wellness scenario

## Integration with Event Retrieval

The prompt generator is designed to work seamlessly with the `EventRetriever` service:

```javascript
const EventRetriever = require('./services/eventRetriever');
const PromptGenerator = require('./services/promptGenerator');

const eventRetriever = new EventRetriever();
const promptGenerator = new PromptGenerator();

// Retrieve events based on user preferences
const retrievedEvents = await eventRetriever.retrieveRelevantEventsWithMinAffinity(
  userPrefs, 
  0.4, 
  5
);

// Generate prompt from retrieved events
const prompt = promptGenerator.generateRecommendationPrompt(retrievedEvents, userPrefs);
```

## Examples

### Running the Demo
```bash
# Mock version (no API keys required)
node examples/prompt-generation-mock.js

# Full version (requires API keys)
node examples/prompt-generation-usage.js
```

### API Usage
```bash
curl -X POST http://localhost:3001/prompts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userPrefs": {
      "interests": ["culture", "wellness"],
      "location": "Mediterranean"
    },
    "promptType": "standard"
  }'
```

## Best Practices

1. **Token Management**: Always check estimated tokens before sending to GPT-4
2. **Event Quality**: Ensure retrieved events have high affinity scores for better recommendations
3. **User Preferences**: Provide specific interests and location for more targeted prompts
4. **Prompt Type Selection**: Use compact prompts for quick responses, detailed for comprehensive recommendations
5. **Error Handling**: Always handle potential errors from the service

## Architecture

The `PromptGenerator` is part of the larger Cruise Assistant RAG pipeline:

1. **Event Retrieval**: `EventRetriever` finds relevant events based on user preferences
2. **Prompt Generation**: `PromptGenerator` creates structured prompts from retrieved events
3. **LLM Processing**: Generated prompts are sent to GPT-4 for personalized recommendations
4. **Response Delivery**: Structured recommendations are returned to the user

This architecture ensures that recommendations are based on actual available events while maintaining context about user preferences and cruise location. 