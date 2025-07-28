#!/usr/bin/env node

require('dotenv').config();
const path = require('path');
const EventIndexer = require('../src/services/eventIndexer');
const logger = require('../src/utils/logger');

/**
 * Script to index test events into Pinecone for real RAG testing
 */

class TestEventIndexer {
  constructor() {
    this.eventsFile = path.join(__dirname, '../src/mock/events.json');
    this.indexer = new EventIndexer();
  }

  /**
   * Load test events from file
   */
  async loadTestEvents() {
    try {
      const fs = require('fs').promises;
      const eventsData = await fs.readFile(this.eventsFile, 'utf8');
      const events = JSON.parse(eventsData);
      
      console.log(`📂 Loaded ${events.length} test events from ${this.eventsFile}`);
      return events;
    } catch (error) {
      console.error('❌ Error loading test events:', error);
      throw error;
    }
  }

  /**
   * Index events with progress tracking
   */
  async indexTestEvents() {
    try {
      console.log('🚀 Starting test events indexing...');
      
      // Load events
      const events = await this.loadTestEvents();
      
      // Validate events
      this.validateEvents(events);
      
      // Index events
      console.log(`📊 Indexing ${events.length} events...`);
      const startTime = Date.now();
      
      const result = await this.indexer.indexEvents(events);
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`✅ Indexing completed in ${duration.toFixed(2)}s`);
      console.log(`📈 Indexed ${result.indexedCount} events successfully`);
      
      if (result.errors && result.errors.length > 0) {
        console.log(`⚠️ ${result.errors.length} errors occurred:`);
        result.errors.forEach(error => {
          console.log(`   - ${error}`);
        });
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Error indexing test events:', error);
      throw error;
    }
  }

  /**
   * Validate events before indexing
   */
  validateEvents(events) {
    console.log('🔍 Validating events...');
    
    const validation = {
      total: events.length,
      valid: 0,
      invalid: 0,
      errors: []
    };

    events.forEach((event, index) => {
      try {
        // Check required fields
        if (!event.id) {
          throw new Error(`Event ${index}: Missing id`);
        }
        if (!event.title) {
          throw new Error(`Event ${index}: Missing title`);
        }
        if (!event.description) {
          throw new Error(`Event ${index}: Missing description`);
        }
        if (!event.type) {
          throw new Error(`Event ${index}: Missing type`);
        }
        if (!event.tags || !Array.isArray(event.tags)) {
          throw new Error(`Event ${index}: Missing or invalid tags`);
        }
        if (typeof event.experienceAffinity !== 'number') {
          throw new Error(`Event ${index}: Missing or invalid experienceAffinity`);
        }

        // Check data quality
        if (event.description.length < 10) {
          throw new Error(`Event ${index}: Description too short`);
        }
        if (event.tags.length === 0) {
          throw new Error(`Event ${index}: No tags provided`);
        }
        if (event.experienceAffinity < 0 || event.experienceAffinity > 1) {
          throw new Error(`Event ${index}: experienceAffinity out of range [0,1]`);
        }

        validation.valid++;
      } catch (error) {
        validation.invalid++;
        validation.errors.push(error.message);
      }
    });

    console.log(`✅ Validation complete: ${validation.valid}/${validation.total} events valid`);
    
    if (validation.invalid > 0) {
      console.log(`⚠️ ${validation.invalid} invalid events found:`);
      validation.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
      
      if (validation.invalid > validation.valid * 0.2) {
        throw new Error('Too many invalid events (>20%). Please fix data quality issues.');
      }
    }

    return validation;
  }

  /**
   * Test retrieval after indexing
   */
  async testRetrieval() {
    try {
      console.log('\n🧪 Testing retrieval after indexing...');
      
      const EventRetriever = require('../src/services/eventRetriever');
      const retriever = new EventRetriever();
      
      // Test queries
      const testQueries = [
        {
          query: 'cultural activities in Mediterranean',
          expectedTags: ['culture', 'mediterranean'],
          description: 'Cultural Mediterranean query'
        },
        {
          query: 'wellness and spa experiences',
          expectedTags: ['wellness', 'spa'],
          description: 'Wellness query'
        },
        {
          query: 'adventure activities for families',
          expectedTags: ['adventure', 'family'],
          description: 'Family adventure query'
        },
        {
          query: 'wine tasting and food experiences',
          expectedTags: ['food', 'wine'],
          description: 'Food and wine query'
        }
      ];

      const results = [];

      for (const testQuery of testQueries) {
        console.log(`\n🔍 Testing: ${testQuery.description}`);
        
        const startTime = Date.now();
        const retrievedEvents = await retriever.retrieveRelevantEvents(
          testQuery.query,
          5,
          testQuery.expectedTags
        );
        const endTime = Date.now();
        
        const result = {
          query: testQuery.description,
          retrievedCount: retrievedEvents.length,
          responseTime: endTime - startTime,
          topResults: retrievedEvents.slice(0, 3).map(event => ({
            id: event.id,
            title: event.title,
            score: event.score,
            tags: event.tags
          }))
        };
        
        results.push(result);
        
        console.log(`   ✅ Retrieved ${result.retrievedCount} events in ${result.responseTime}ms`);
        console.log(`   📋 Top result: ${result.topResults[0]?.title} (score: ${result.topResults[0]?.score?.toFixed(3)})`);
      }

      return results;
      
    } catch (error) {
      console.error('❌ Error testing retrieval:', error);
      throw error;
    }
  }

  /**
   * Generate indexing report
   */
  generateReport(indexingResult, retrievalResults) {
    console.log('\n📊 Indexing Report');
    console.log('==================');
    
    console.log(`\n📈 Indexing Statistics:`);
    console.log(`   - Total events processed: ${indexingResult.indexedCount}`);
    console.log(`   - Processing time: ${indexingResult.processingTime || 'N/A'}ms`);
    console.log(`   - Success rate: ${((indexingResult.indexedCount / indexingResult.totalCount) * 100).toFixed(1)}%`);
    
    if (indexingResult.chunkingStats) {
      console.log(`\n🔧 Chunking Statistics:`);
      console.log(`   - Total chunks created: ${indexingResult.chunkingStats.totalChunks}`);
      console.log(`   - Average chunks per event: ${(indexingResult.chunkingStats.totalChunks / indexingResult.indexedCount).toFixed(1)}`);
      console.log(`   - Chunk size: ${indexingResult.chunkingStats.chunkSize} tokens`);
      console.log(`   - Chunk overlap: ${indexingResult.chunkingStats.chunkOverlap} tokens`);
    }
    
    console.log(`\n🧪 Retrieval Test Results:`);
    retrievalResults.forEach(result => {
      console.log(`   - ${result.query}: ${result.retrievedCount} results in ${result.responseTime}ms`);
    });
    
    const avgResponseTime = retrievalResults.reduce((sum, r) => sum + r.responseTime, 0) / retrievalResults.length;
    console.log(`   - Average response time: ${avgResponseTime.toFixed(0)}ms`);
    
    console.log(`\n✅ Indexing and testing completed successfully!`);
    console.log(`\n📝 Next steps:`);
    console.log(`1. Review the indexing results`);
    console.log(`2. Run real RAG tests with the indexed data`);
    console.log(`3. Monitor performance and quality metrics`);
  }
}

// Run if executed directly
if (require.main === module) {
  const indexer = new TestEventIndexer();
  
  async function runIndexing() {
    try {
      // Check environment
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }
      if (!process.env.PINECONE_API_KEY) {
        throw new Error('PINECONE_API_KEY environment variable is required');
      }
      if (!process.env.PINECONE_INDEX_NAME) {
        throw new Error('PINECONE_INDEX_NAME environment variable is required');
      }
      
      console.log('🔧 Environment check passed');
      
      // Index events
      const indexingResult = await indexer.indexTestEvents();
      
      // Test retrieval
      const retrievalResults = await indexer.testRetrieval();
      
      // Generate report
      indexer.generateReport(indexingResult, retrievalResults);
      
      process.exit(0);
      
    } catch (error) {
      console.error('\n💥 Indexing failed:', error.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check that all environment variables are set');
      console.log('2. Verify Pinecone index exists and is accessible');
      console.log('3. Ensure OpenAI API key is valid');
      console.log('4. Check network connectivity');
      process.exit(1);
    }
  }
  
  runIndexing();
}

module.exports = TestEventIndexer; 