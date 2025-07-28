const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
const logger = require('../utils/logger');

class EnhancedVectorStore {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-large';
    this.dimensions = this.embeddingModel.includes('large') ? 3072 : 1536;
  }

  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
        encoding_format: 'float',
        dimensions: this.dimensions // Trade-off между размером и точностью
      });
      
      logger.info(`Generated embedding with ${this.embeddingModel}`, {
        textLength: text.length,
        embeddingDimensions: response.data[0].embedding.length,
        model: this.embeddingModel,
        dimensions: this.dimensions
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
        input: batch,
        encoding_format: 'float',
        dimensions: this.dimensions
      });
      embeddings.push(...response.data.map(item => item.embedding));
    }
    
    logger.info(`Generated ${embeddings.length} embeddings in batch mode`);
    return embeddings;
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
}

class EnhancedPineconeStore extends EnhancedVectorStore {
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
      logger.info(`Successfully upserted ${vectors.length} documents to Pinecone with ${this.embeddingModel}`);
      return {
        status: 'OK',
        upsertedCount: vectors.length,
        result,
        embeddingModel: this.embeddingModel,
        dimensions: this.dimensions
      };
    } catch (error) {
      logger.error('Error upserting to Pinecone:', error);
      throw error;
    }
  }

  async upsertChunks(chunks) {
    try {
      const vectors = [];
      
      for (const chunk of chunks) {
        const embedding = await this.generateEmbedding(chunk.text);
        
        vectors.push({
          id: chunk.id,
          values: embedding,
          metadata: {
            ...chunk.metadata,
            text: chunk.text,
            chunkIndex: chunk.metadata.chunkIndex,
            totalChunks: chunk.metadata.totalChunks
          }
        });
      }

      const result = await this.index.upsert(vectors);
      logger.info(`Successfully upserted ${vectors.length} chunks to Pinecone with ${this.embeddingModel}`);
      return {
        status: 'OK',
        upsertedCount: vectors.length,
        result,
        embeddingModel: this.embeddingModel,
        dimensions: this.dimensions
      };
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
      
      logger.info(`Queried Pinecone with ${this.embeddingModel}, returned ${queryResponse.matches.length} results`);
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
  EnhancedVectorStore,
  EnhancedPineconeStore
}; 