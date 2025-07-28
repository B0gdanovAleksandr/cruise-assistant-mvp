const RAGRecommendationService = require('../src/services/ragRecommendationService');

async function demonstrateRAGRecommendations() {
  console.log('🚢 Cruise Assistant RAG Recommendations Demo\n');
  
  try {
    const ragService = new RAGRecommendationService();

    // Test user preferences
    const userPrefs = {
      interests: ['culture', 'wellness'],
      location: 'Mediterranean'
    };

    console.log('📋 User Preferences:');
    console.log(`  Interests: ${userPrefs.interests.join(', ')}`);
    console.log(`  Location: ${userPrefs.location}\n`);

    // Generate RAG recommendations
    console.log('🔍 Generating RAG recommendations...');
    const response = await ragService.generateRecommendations(userPrefs, {
      topK: 5,
      minAffinity: 0.4,
      promptType: 'standard',
      maxTokens: 1000
    });

    if (response.success) {
      console.log('✅ RAG recommendations generated successfully!\n');

      // Display retrieved events
      console.log('📊 Retrieved Events:');
      response.retrievedEvents.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.title} (${event.type}) - Score: ${event.score}`);
      });
      console.log('');

      // Display recommendations
      console.log('🎯 AI Recommendations:');
      response.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.title}`);
        console.log(`     Description: ${rec.description}`);
        console.log(`     Timing: ${rec.timing}`);
        console.log(`     Advice: ${rec.personalizedAdvice}`);
        console.log(`     Origin Event: ${rec.originEventId}`);
        console.log('');
      });

      // Display AI insights
      console.log('💡 AI Insights:');
      response.aiInsights.forEach((insight, index) => {
        console.log(`  ${index + 1}. ${insight.title} (${insight.type})`);
        console.log(`     Description: ${insight.description}`);
        console.log(`     Relevance: ${insight.relevance}`);
        console.log('');
      });

      // Display RAG sources
      console.log('📚 RAG Sources:');
      response.ragSources.forEach((source, index) => {
        console.log(`  ${index + 1}. ${source.title} (${source.type})`);
        console.log(`     Affinity: ${source.experienceAffinity}`);
        console.log(`     Score: ${source.score}`);
        console.log(`     Tags: ${source.tags.join(', ')}`);
        console.log('');
      });

      // Display prompt information
      console.log('📝 Prompt Information:');
      console.log(`  Type: ${response.prompt.type}`);
      console.log(`  Estimated Tokens: ${response.prompt.estimatedTokens}`);
      console.log(`  Max Tokens: ${response.prompt.maxTokens}`);
      console.log('');

      // Display statistics
      console.log('📈 Statistics:');
      console.log(`  Total Events Retrieved: ${response.count}`);
      console.log(`  Recommendations Generated: ${response.recommendations.length}`);
      console.log(`  AI Insights Generated: ${response.aiInsights.length}`);
      console.log(`  RAG Sources Used: ${response.ragSources.length}`);
      console.log(`  Min Affinity Threshold: ${response.minAffinity}`);

    } else {
      console.log('❌ Failed to generate recommendations:');
      console.log(`  Error: ${response.error}`);
    }

  } catch (error) {
    console.error('❌ Error during RAG recommendations demo:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

async function demonstrateDifferentUserPreferences() {
  console.log('\n👥 Different User Preferences Examples\n');
  
  try {
    const ragService = new RAGRecommendationService();

    const differentPrefs = [
      {
        name: 'Adventure Seeker',
        prefs: { interests: ['adventure'], location: 'Alaska' }
      },
      {
        name: 'Relaxation Lover',
        prefs: { interests: ['relaxation', 'food'], location: 'Caribbean' }
      },
      {
        name: 'History Enthusiast',
        prefs: { interests: ['history'], location: 'Northern Europe' }
      }
    ];

    for (const user of differentPrefs) {
      console.log(`\n🎯 ${user.name}:`);
      console.log(`  Interests: ${user.prefs.interests.join(', ')}`);
      console.log(`  Location: ${user.prefs.location}`);

      try {
        const response = await ragService.generateRecommendations(user.prefs, {
          topK: 3,
          minAffinity: 0.4
        });

        if (response.success) {
          console.log(`  ✅ Generated ${response.recommendations.length} recommendations`);
          console.log(`  📚 Used ${response.ragSources.length} RAG sources`);
          console.log(`  💡 Generated ${response.aiInsights.length} insights`);
        } else {
          console.log(`  ❌ No recommendations: ${response.error}`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error in different preferences demo:', error.message);
  }
}

async function demonstrateResponseValidation() {
  console.log('\n🔍 Response Validation Examples\n');
  
  try {
    const ragService = new RAGRecommendationService();

    // Test valid response
    const validResponse = {
      success: true,
      recommendations: [
        {
          id: 'rec_1',
          title: 'Test Recommendation',
          originEventId: 'event_001'
        }
      ],
      ragSources: [
        {
          id: 'event_001',
          title: 'Test Event',
          type: 'entertainment'
        }
      ]
    };

    console.log('✅ Valid Response:');
    console.log(`  Validation Result: ${ragService.validateResponse(validResponse)}`);

    // Test invalid responses
    const invalidResponses = [
      {
        name: 'Missing success field',
        response: {
          recommendations: [],
          ragSources: []
        }
      },
      {
        name: 'Missing recommendations array',
        response: {
          success: true,
          ragSources: []
        }
      },
      {
        name: 'Missing RAG sources array',
        response: {
          success: true,
          recommendations: []
        }
      },
      {
        name: 'Invalid recommendation structure',
        response: {
          success: true,
          recommendations: [{ id: 'rec_1' }], // Missing title and originEventId
          ragSources: [{ id: 'event_001' }]
        }
      }
    ];

    console.log('\n❌ Invalid Responses:');
    for (const test of invalidResponses) {
      const isValid = ragService.validateResponse(test.response);
      console.log(`  ${test.name}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    }

  } catch (error) {
    console.error('❌ Error in validation demo:', error.message);
  }
}

async function demonstrateErrorHandling() {
  console.log('\n🚨 Error Handling Examples\n');
  
  try {
    const ragService = new RAGRecommendationService();

    // Test cases for error handling
    const errorTestCases = [
      {
        name: 'Missing user preferences',
        test: () => ragService.generateRecommendations({})
      },
      {
        name: 'Missing interests',
        test: () => ragService.generateRecommendations({ location: 'Mediterranean' })
      },
      {
        name: 'Null user preferences',
        test: () => ragService.generateRecommendations(null)
      }
    ];

    for (const testCase of errorTestCases) {
      console.log(`Testing: ${testCase.name}`);
      try {
        await testCase.test();
        console.log('  ❌ Expected error but got success');
      } catch (error) {
        console.log(`  ✅ Expected error: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error in error handling demo:', error.message);
  }
}

if (require.main === module) {
  demonstrateRAGRecommendations()
    .then(() => demonstrateDifferentUserPreferences())
    .then(() => demonstrateResponseValidation())
    .then(() => demonstrateErrorHandling())
    .then(() => {
      console.log('\n🎉 All RAG recommendations examples completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { 
  demonstrateRAGRecommendations, 
  demonstrateDifferentUserPreferences, 
  demonstrateResponseValidation,
  demonstrateErrorHandling
}; 