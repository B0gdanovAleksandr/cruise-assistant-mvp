# RAG (Retrieval-Augmented Generation) for Cruise Assistant

This module implements a RAG system for indexing and searching onboard cruise events.

## Architecture

### Components

1. **VectorStore** (`src/services/vectorStore.js`) - Abstract class for working with vector databases
2. **PineconeStore** - Implementation for Pinecone
3. **EventIndexer** (`src/services/eventIndexer.js`) - Service for loading and indexing events
4. **API Endpoints** - REST API for working with events

### Event Data Format

Events are stored in a JSON file with the following structure:

```json
[
  {
    "id": "event_001",
    "type": "entertainment",
    "title": "Evening Jazz in the Main Salon",
    "description": "Enjoy live jazz music in the elegant atmosphere of the main salon.",
    "tags": ["music", "jazz", "evening", "live music", "salon"],
    "experienceAffinity": "relaxation"
  }
]
```

**Required fields:**
- `id` - unique event identifier
- `type` - event type (entertainment, activity, dining, education, wellness)
- `title` - event title
- `description` - event description
- `tags` - array of tags for search
- `experienceAffinity` - experience type (relaxation, wellness, luxury, learning, social, competition, entertainment)

## Installation and Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=cruise-events
```

### 3. Create Pinecone Index

1. Register at [Pinecone](https://www.pinecone.io/)
2. Create a new index named `cruise-events`
3. Choose dimension 1536 (for text-embedding-ada-002)
4. Copy the API key to environment variable

### 4. Run Tests

```bash
npm test
```

## API Endpoints

### POST /events/index

Indexes events from JSON file into vector database.

**Request:**
```json
{
  "filePath": "/path/to/events.json"  // optional, defaults to src/mock/events.json
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully loaded and indexed 8 events",
  "loadedCount": 8,
  "indexedCount": 8,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### POST /events/search

Search events by text query.

**Request:**
```json
{
  "query": "jazz music evening",
  "topK": 5  // optional, defaults to 5
}
```

**Response:**
```json
{
  "success": true,
  "query": "jazz music evening",
  "results": [
    {
      "id": "event_001",
      "score": 0.95,
      "metadata": {
        "type": "entertainment",
        "title": "Evening Jazz in the Main Salon",
        "description": "Enjoy live jazz music...",
        "tags": ["music", "jazz", "evening", "live music", "salon"],
        "experienceAffinity": "relaxation"
      }
    }
  ],
  "count": 1,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /events/status

Checks event indexing status.

**Response:**
```json
{
  "success": true,
  "eventsCount": 8,
  "status": "indexed",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Usage

### 1. Index Events

```bash
curl -X POST http://localhost:3001/events/index \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 2. Search Events

```bash
curl -X POST http://localhost:3001/events/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "relaxing activities",
    "topK": 3
  }'
```

### 3. Check Status

```bash
curl http://localhost:3001/events/status
```

## Testing

### Unit Tests

```bash
npm test
```

Tests verify:
- Loading events from JSON file
- Data structure validation
- Error handling
- Event indexing
- Event search

### Integration Tests

```bash
npm test -- --testPathPattern=integration
```

Integration tests verify the complete loading and indexing cycle.

## Monitoring and Logging

All operations are logged using Winston. Logs include:
- Event loading
- Indexing process
- Search queries
- Errors and exceptions

## Performance

- **Embedding model**: text-embedding-ada-002 (1536 dimensions)
- **Vector database**: Pinecone
- **Index size**: depends on number of events
- **Search time**: ~100-500ms depending on index size

## Extending Functionality

### Adding New Vector Database

1. Create a new class inheriting from `VectorStore`
2. Implement `upsert`, `query`, `delete` methods
3. Update `EventIndexer` to use the new database

### Adding New Event Fields

1. Update validation schema in `validateEvents`
2. Add new fields to metadata during indexing
3. Update tests

## Troubleshooting

### Error "OpenAI API key not configured"
- Check `OPENAI_API_KEY` environment variable
- Ensure API key is valid

### Error "Pinecone index not found"
- Check `PINECONE_INDEX_NAME` environment variable
- Ensure index exists in Pinecone

### Error "Invalid event structure"
- Check JSON file format
- Ensure all required fields are present
- Check that `tags` is an array

### Slow Search
- Check index size
- Consider query optimization
- Check network connection to Pinecone 