const express = require('express');
const fs = require('fs').promises;
const path = require('path');

/**
 * Simple test RAG endpoint for browser demonstration
 */

class TestRAGEndpoint {
  constructor() {
    this.eventsFile = path.join(__dirname, 'mock/events.json');
    this.userPrefsFile = path.join(__dirname, 'mock/userPrefs.json');
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
   * Simulate RAG retrieval
   */
  simulateRAGRetrieval(query, userPrefs, topK = 5) {
    const queryLower = query.toLowerCase();
    const userInterests = userPrefs.interests.map(i => i.toLowerCase());
    
    const scoredEvents = this.events.map(event => {
      let score = 0;
      
      // Match query with event title and description
      if (event.title.toLowerCase().includes(queryLower) || 
          event.description.toLowerCase().includes(queryLower)) {
        score += 0.4;
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
    return scoredEvents
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Generate RAG response
   */
  generateRAGResponse(userPrefs, retrievedEvents) {
    const query = `${userPrefs.interests.join(' ')} activities in ${userPrefs.location}`;
    
    const recommendations = retrievedEvents.map((event, index) => ({
      id: `rec_${index + 1}`,
      title: event.title,
      description: event.description,
      type: event.type,
      location: event.location,
      duration: event.duration,
      price: event.price,
      score: event.score,
      relevance: event.score > 0.5 ? 'High' : event.score > 0.3 ? 'Medium' : 'Low',
      citation: `Source: ${event.id} - ${event.title}`,
      reasoning: `Recommended based on your interest in ${userPrefs.interests.join(', ')} and location preference for ${userPrefs.location}`,
      highlights: event.tags.slice(0, 3),
      categories: [event.type],
      rating: Math.floor(event.experienceAffinity * 5) + 1
    }));

    return {
      query,
      recommendations,
      ragSources: retrievedEvents.map(event => ({
        id: event.id,
        title: event.title,
        type: event.type,
        experienceAffinity: event.experienceAffinity
      })),
      aiInsights: {
        summary: `Based on your interests in ${userPrefs.interests.join(', ')}, I found ${retrievedEvents.length} highly relevant activities in ${userPrefs.location}. These recommendations are tailored to your preferences and budget level.`,
        personalizedAdvice: [
          `Consider booking ${retrievedEvents[0]?.title} early as it's very popular among ${userPrefs.interests[0]} enthusiasts`,
          `The ${userPrefs.location} region offers excellent opportunities for ${userPrefs.interests.join(' and ')} activities`,
          `Based on your ${userPrefs.budget} budget, these activities provide great value for money`
        ],
        budgetTips: [
          `Look for package deals that combine multiple ${userPrefs.interests[0]} activities`,
          `Consider visiting during off-peak seasons for better prices`,
          `Book activities in advance to secure better rates`
        ],
        bestTimes: [
          `Spring and fall are ideal for ${userPrefs.interests[0]} activities in ${userPrefs.location}`,
          `Weekday bookings often offer better availability and prices`,
          `Early morning sessions typically have fewer crowds`
        ]
      },
      metadata: {
        totalResults: retrievedEvents.length,
        averageScore: retrievedEvents.reduce((sum, e) => sum + e.score, 0) / retrievedEvents.length,
        userPreferences: userPrefs,
        queryType: this.classifyQuery(query),
        responseTime: Math.random() * 1000 + 500,
        systemVersion: 'RAG v3.3 - Optimized'
      }
    };
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
   * Create test endpoint
   */
  createTestEndpoint(app) {
    // Load test data when endpoint is created
    this.loadTestData().then(() => {
      console.log('✅ Test RAG endpoint ready');
    });

    // Test RAG endpoint
    app.post('/testRAG', async (req, res) => {
      try {
        const { userPrefs } = req.body;
        
        if (!userPrefs || !userPrefs.interests) {
          return res.status(400).json({
            success: false,
            error: 'User preferences must include interests'
          });
        }

        console.log('🧪 Test RAG request received:', userPrefs);

        // Simulate retrieval
        const query = `${userPrefs.interests.join(' ')} activities in ${userPrefs.location || 'any location'}`;
        const retrievedEvents = this.simulateRAGRetrieval(query, userPrefs, 5);

        if (retrievedEvents.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'No relevant events found for the given preferences'
          });
        }

        // Generate RAG response
        const response = this.generateRAGResponse(userPrefs, retrievedEvents);

        console.log(`✅ Test RAG response generated with ${retrievedEvents.length} recommendations`);

        res.json({
          success: true,
          recommendations: response,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Test RAG error:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error during test RAG generation',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Test endpoint info
    app.get('/testRAG/info', (req, res) => {
      res.json({
        status: 'ready',
        eventsCount: this.events.length,
        userPrefsCount: this.userPrefs.length,
        endpoints: {
          testRAG: 'POST /testRAG',
          info: 'GET /testRAG/info'
        },
        timestamp: new Date().toISOString()
      });
    });
  }
}

module.exports = TestRAGEndpoint; 