const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
const logger = require('../utils/logger');

class VectorStore {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateEmbedding(text) {
    try {
      const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-large';
      const dimensions = embeddingModel.includes('large') ? 3072 : 1536;
      
      const response = await this.openai.embeddings.create({
        model: embeddingModel,
        input: text,
        encoding_format: 'float',
        dimensions: dimensions // Trade-off между размером и точностью
      });
      
      logger.info(`Generated embedding with ${embeddingModel}`, {
        textLength: text.length,
        embeddingDimensions: response.data[0].embedding.length,
        model: embeddingModel,
        dimensions: dimensions
      });
      
      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  async upsert(documents) {
    throw new Error('upsert method must be implemented by subclass');
  }

  async query(vector, topK = 5) {
    throw new Error('query method must be implemented by subclass');
  }

  async delete(ids) {
    throw new Error('delete method must be implemented by subclass');
  }

  async generateEmbeddingsBatch(texts) {
    const embeddings = [];
    const batchSize = 100; // OpenAI batch limit
    const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-large';
    const dimensions = embeddingModel.includes('large') ? 3072 : 1536;
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await this.openai.embeddings.create({
        model: embeddingModel,
        input: batch,
        encoding_format: 'float',
        dimensions: dimensions
      });
      embeddings.push(...response.data.map(item => item.embedding));
    }
    
    logger.info(`Generated ${embeddings.length} embeddings in batch mode with ${embeddingModel}`);
    return embeddings;
  }

  async upsertChunks(chunks) {
    throw new Error('upsertChunks method must be implemented by subclass');
  }
}

class PineconeStore extends VectorStore {
  constructor() {
    super();
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT || 'gcp-starter'
    });
    this.indexName = process.env.PINECONE_INDEX_NAME || 'cruise-events';
    this.index = this.pinecone.index(this.indexName);
  }

  async upsert(documents) {
    try {
      const vectors = [];
      
      for (const doc of documents) {
        const text = `${doc.title} ${doc.description} ${doc.tags.join(' ')}`;
        const embedding = await this.generateEmbedding(text);
        
        vectors.push({
          id: doc.id,
          values: embedding,
          metadata: {
            type: doc.type,
            title: doc.title,
            description: doc.description,
            tags: doc.tags,
            experienceAffinity: doc.experienceAffinity,
            text: text
          }
        });
      }

      const result = await this.index.upsert(vectors);
      logger.info(`Successfully upserted ${vectors.length} documents to Pinecone`);
      return {
        status: 'OK',
        upsertedCount: vectors.length,
        result
      };
    } catch (error) {
      logger.error('Error upserting to Pinecone:', error);
      throw error;
    }
  }

  async upsertChunks(chunks) {
    try {
      const vectors = [];
      
      // Generate embeddings for all chunks in batch
      const texts = chunks.map(chunk => chunk.text);
      const embeddings = await this.generateEmbeddingsBatch(texts);
      
      // Create vectors with embeddings
      for (let i = 0; i < chunks.length; i++) {
        vectors.push({
          id: chunks[i].id,
          values: embeddings[i],
          metadata: chunks[i].metadata
        });
      }

      // Upsert in batches to avoid rate limits
      const batchSize = 100;
      let upsertedCount = 0;
      
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await this.index.upsert(batch);
        upsertedCount += batch.length;
      }

      logger.info(`Upserted ${upsertedCount} chunk vectors to Pinecone`);
      return { upsertedCount };
    } catch (error) {
      logger.error('Error upserting chunks to Pinecone:', error);
      throw error;
    }
  }

  async query(vector, topK = 5) {
    try {
      const queryResponse = await this.index.query({
        vector: vector,
        topK: topK,
        includeMetadata: true
      });
      
      return queryResponse.matches;
    } catch (error) {
      logger.error('Error querying Pinecone:', error);
      throw error;
    }
  }

  async delete(ids) {
    try {
      const result = await this.index.deleteMany(ids);
      logger.info(`Successfully deleted ${ids.length} documents from Pinecone`);
      return result;
    } catch (error) {
      logger.error('Error deleting from Pinecone:', error);
      throw error;
    }
  }
}

module.exports = {
  VectorStore,
  PineconeStore
}; 