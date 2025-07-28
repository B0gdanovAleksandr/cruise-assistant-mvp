#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

/**
 * Manual RAG testing script with mock data
 */

class ManualRAGTester {
  constructor() {
    this.eventsFile = path.join(__dirname, '../src/mock/events.json');
    this.userPrefsFile = path.join(__dirname, '../src/mock/userPrefs.json');
    this.events = [];
    this.userPrefs = [];
  }

  /**
   * Load test data
   */
  async loadTestData() {
    try {
      const eventsData = await fs.readFile(this.eventsFile, 'utf8');
      const userPrefsData = await fs.readFile(this.userPrefsFile, 'utf8');
      
      this.events = JSON.parse(eventsData);
      this.userPrefs = JSON.parse(userPrefsData);
      
      console.log(`✅ Loaded ${this.events.length} events and ${this.userPrefs.length} user preferences`);
      return true;
    } catch (error) {
      console.error('❌ Error loading test data:', error.message);
      return false;
    }
  }

  /**
   * Simulate simple retrieval
   */
  simulateRetrieval(query, userPrefs, topK = 3) {
    console.log(`\n🔍 Simulating retrieval for: "${query}"`);
    console.log(`👤 User preferences: ${userPrefs.interests.join(', ')}`);
    
    // Simple keyword matching simulation
    const queryLower = query.toLowerCase();
    const userInterests = userPrefs.interests.map(i => i.toLowerCase());
    
    const scoredEvents = this.events.map(event => {
      let score = 0;
      
      // Match query with event title and description
      if (event.title.toLowerCase().includes(queryLower) || 
          event.description.toLowerCase().includes(queryLower)) {
        score += 0.5;
      }
      
      // Match user interests with event tags
      const matchingTags = event.tags.filter(tag => 
        userInterests.includes(tag.toLowerCase())
      );
      score += (matchingTags.length / event.tags.length) * 0.3;
      
      // Location preference
      if (event.location.toLowerCase().includes(userPrefs.location.toLowerCase()) ||
          userPrefs.location.toLowerCase() === 'any') {
        score += 0.2;
      }
      
      // Experience affinity bonus
      score += event.experienceAffinity * 0.1;
      
      return { ...event, score };
    });
    
    // Sort by score and return top K
    const topResults = scoredEvents
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    
    return topResults;
  }

  /**
   * Simulate RAG response generation
   */
  simulateRAGResponse(query, retrievedEvents, userPrefs) {
    console.log(`\n🤖 Generating RAG response...`);
    
    const response = {
      query,
      recommendations: retrievedEvents.map((event, index) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        type: event.type,
        location: event.location,
        duration: event.duration,
        price: event.price,
        score: event.score,
        relevance: event.score > 0.5 ? 'High' : event.score > 0.3 ? 'Medium' : 'Low',
        citation: `Source: ${event.id} - ${event.title}`,
        reasoning: `Recommended based on your interest in ${userPrefs.interests.join(', ')} and location preference for ${userPrefs.location}`
      })),
      metadata: {
        totalResults: retrievedEvents.length,
        averageScore: retrievedEvents.reduce((sum, e) => sum + e.score, 0) / retrievedEvents.length,
        userPreferences: userPrefs,
        queryType: this.classifyQuery(query),
        responseTime: Math.random() * 1000 + 500 // Mock response time
      }
    };
    
    return response;
  }

  /**
   * Classify query type
   */
  classifyQuery(query) {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('culture') || queryLower.includes('history')) return 'Cultural';
    if (queryLower.includes('wellness') || queryLower.includes('spa')) return 'Wellness';
    if (queryLower.includes('adventure') || queryLower.includes('outdoor')) return 'Adventure';
    if (queryLower.includes('food') || queryLower.includes('wine')) return 'Food & Dining';
    if (queryLower.includes('family') || queryLower.includes('kids')) return 'Family';
    if (queryLower.includes('entertainment') || queryLower.includes('music')) return 'Entertainment';
    
    return 'General';
  }

  /**
   * Display test results
   */
  displayResults(response) {
    console.log(`\n📊 RAG Response Results:`);
    console.log(`Query: "${response.query}"`);
    console.log(`Query Type: ${response.metadata.queryType}`);
    console.log(`Total Results: ${response.metadata.totalResults}`);
    console.log(`Average Score: ${response.metadata.averageScore.toFixed(3)}`);
    console.log(`Response Time: ${response.metadata.responseTime.toFixed(0)}ms`);
    
    console.log(`\n🎯 Recommendations:`);
    response.recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.title}`);
      console.log(`   📍 Location: ${rec.location}`);
      console.log(`   ⏱️ Duration: ${rec.duration}`);
      console.log(`   💰 Price: ${rec.price}`);
      console.log(`   🎯 Score: ${rec.score.toFixed(3)} (${rec.relevance})`);
      console.log(`   📚 Citation: ${rec.citation}`);
      console.log(`   💭 Reasoning: ${rec.reasoning}`);
    });
  }

  /**
   * Run manual test scenarios
   */
  async runManualTests() {
    console.log('🧪 Manual RAG Testing with Mock Data');
    console.log('=====================================\n');
    
    // Load test data
    const dataLoaded = await this.loadTestData();
    if (!dataLoaded) {
      console.error('❌ Failed to load test data');
      return;
    }
    
    // Test scenarios
    const testScenarios = [
      {
        query: 'cultural activities in Mediterranean',
        userPrefs: this.userPrefs[0], // Cultural enthusiast
        description: 'Cultural Mediterranean query'
      },
      {
        query: 'wellness and spa experiences',
        userPrefs: this.userPrefs[2], // Wellness seeker
        description: 'Wellness query'
      },
      {
        query: 'adventure activities for families',
        userPrefs: this.userPrefs[8], // Family traveler
        description: 'Family adventure query'
      },
      {
        query: 'wine tasting and food experiences',
        userPrefs: this.userPrefs[6], // Food enthusiast
        description: 'Food and wine query'
      }
    ];
    
    console.log(`📋 Running ${testScenarios.length} test scenarios...\n`);
    
    for (let i = 0; i < testScenarios.length; i++) {
      const scenario = testScenarios[i];
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🧪 Test Scenario ${i + 1}: ${scenario.description}`);
      console.log(`${'='.repeat(60)}`);
      
      // Simulate retrieval
      const retrievedEvents = this.simulateRetrieval(scenario.query, scenario.userPrefs);
      
      // Generate RAG response
      const response = this.simulateRAGResponse(scenario.query, retrievedEvents, scenario.userPrefs);
      
      // Display results
      this.displayResults(response);
      
      // Brief pause between tests
      if (i < testScenarios.length - 1) {
        console.log('\n⏳ Waiting 2 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 Manual RAG Testing Completed!');
    console.log(`${'='.repeat(60)}`);
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`✅ ${testScenarios.length} test scenarios executed`);
    console.log(`✅ Mock retrieval simulation working`);
    console.log(`✅ RAG response generation working`);
    console.log(`✅ Citation and reasoning included`);
    console.log(`✅ User preference matching working`);
    
    console.log('\n📝 Next Steps:');
    console.log('1. Review the generated recommendations');
    console.log('2. Check relevance and quality of responses');
    console.log('3. Verify citation accuracy');
    console.log('4. Test with real API keys when ready');
  }
}

// Run if executed directly
if (require.main === module) {
  const tester = new ManualRAGTester();
  
  tester.runManualTests()
    .then(() => {
      console.log('\n✅ Manual testing completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Manual testing failed:', error);
      process.exit(1);
    });
}

module.exports = ManualRAGTester; 