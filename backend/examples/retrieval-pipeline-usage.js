const EventRetriever = require('../src/services/eventRetriever');

/**
 * Example of using the Retrieval Pipeline for Cruise Assistant
 */
async function demonstrateRetrievalPipeline() {
  console.log('🚢 Cruise Assistant Retrieval Pipeline Demo\n');

  try {
    // Create EventRetriever instance
    const eventRetriever = new EventRetriever();
    
    // 1. Basic retrieval with user preferences
    console.log('📋 1. Basic Event Retrieval');
    const userPrefs1 = {
      interests: ['culture', 'wellness'],
      location: 'Mediterranean'
    };
    
    const results1 = await eventRetriever.retrieveRelevantEvents(userPrefs1, 5);
    console.log(`✅ Retrieved ${results1.length} events for culture + wellness in Mediterranean`);
    
    results1.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.title} (Score: ${event.score.toFixed(3)})`);
      console.log(`     Type: ${event.type}, Affinity: ${event.experienceAffinity}`);
      console.log(`     Tags: ${event.tags.join(', ')}`);
    });
    
    // 2. Retrieval with minimum affinity score
    console.log('\n🎯 2. Retrieval with Minimum Affinity Score (0.4)');
    const results2 = await eventRetriever.retrieveRelevantEventsWithMinAffinity(userPrefs1, 0.4, 5);
    console.log(`✅ Retrieved ${results2.length} events with affinity >= 0.4`);
    
    results2.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.title} (Score: ${event.score.toFixed(3)})`);
    });
    
    // 3. Different interest combinations
    console.log('\n🎨 3. Different Interest Combinations');
    
    const testCases = [
      {
        interests: ['music', 'entertainment'],
        location: 'Mediterranean',
        description: 'Music and Entertainment'
      },
      {
        interests: ['wellness', 'health'],
        location: 'Mediterranean',
        description: 'Wellness and Health'
      },
      {
        interests: ['education', 'culture'],
        location: 'Mediterranean',
        description: 'Education and Culture'
      },
      {
        interests: ['relaxation'],
        location: 'Mediterranean',
        description: 'Relaxation Only'
      }
    ];
    
    for (const testCase of testCases) {
      const userPrefs = {
        interests: testCase.interests,
        location: testCase.location
      };
      
      const results = await eventRetriever.retrieveRelevantEvents(userPrefs, 3);
      console.log(`\n📋 ${testCase.description}:`);
      results.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.title} (Score: ${event.score.toFixed(3)})`);
      });
    }
    
    // 4. Specific test case: Mediterranean with culture and wellness
    console.log('\n🎯 4. Specific Test Case: Mediterranean with Culture and Wellness');
    const specificUserPrefs = {
      interests: ['culture', 'wellness'],
      location: 'Mediterranean'
    };
    
    const specificResults = await eventRetriever.retrieveRelevantEventsWithMinAffinity(specificUserPrefs, 0.4, 5);
    
    console.log(`✅ Retrieved ${specificResults.length} events with affinity >= 0.4`);
    
    // Check for specific required events
    const eventTitles = specificResults.map(event => event.title);
    const hasLiveJazz = eventTitles.includes('Live Jazz Evening');
    const hasSunsetYoga = eventTitles.includes('Sunset Yoga Class');
    
    console.log(`🎵 "Live Jazz Evening" found: ${hasLiveJazz ? '✅' : '❌'}`);
    console.log(`🧘 "Sunset Yoga Class" found: ${hasSunsetYoga ? '✅' : '❌'}`);
    
    if (hasLiveJazz && hasSunsetYoga) {
      console.log('🎉 All required events found!');
      
      // Verify affinity scores
      const liveJazzEvent = specificResults.find(event => event.title === 'Live Jazz Evening');
      const sunsetYogaEvent = specificResults.find(event => event.title === 'Sunset Yoga Class');
      
      console.log(`🎵 Live Jazz Evening affinity: ${liveJazzEvent.score.toFixed(3)} (>= 0.4: ${liveJazzEvent.score >= 0.4 ? '✅' : '❌'})`);
      console.log(`🧘 Sunset Yoga Class affinity: ${sunsetYogaEvent.score.toFixed(3)} (>= 0.4: ${sunsetYogaEvent.score >= 0.4 ? '✅' : '❌'})`);
    }
    
    // 5. Edge cases
    console.log('\n🔍 5. Edge Cases Testing');
    
    // Test with single interest
    const singleInterestPrefs = {
      interests: ['culture'],
      location: 'Mediterranean'
    };
    
    const singleResults = await eventRetriever.retrieveRelevantEvents(singleInterestPrefs, 3);
    console.log(`✅ Single interest (culture): ${singleResults.length} events`);
    
    // Test with empty location
    const emptyLocationPrefs = {
      interests: ['wellness'],
      location: ''
    };
    
    const emptyLocationResults = await eventRetriever.retrieveRelevantEvents(emptyLocationPrefs, 3);
    console.log(`✅ Empty location: ${emptyLocationResults.length} events`);
    
    // Test error handling
    console.log('\n⚠️  Testing Error Handling:');
    try {
      await eventRetriever.retrieveRelevantEvents({});
      console.log('❌ Should have thrown error for empty preferences');
    } catch (error) {
      console.log(`✅ Correctly handled error: ${error.message}`);
    }
    
    console.log('\n✅ Retrieval Pipeline Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during retrieval pipeline demo:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Example of using the retrieval pipeline with different locations
 */
async function demonstrateLocationBasedRetrieval() {
  console.log('\n🌍 Location-Based Retrieval Examples\n');
  
  try {
    const eventRetriever = new EventRetriever();
    
    const locations = [
      'Mediterranean',
      'Caribbean',
      'Alaska',
      'Northern Europe'
    ];
    
    for (const location of locations) {
      console.log(`📍 ${location}:`);
      
      const userPrefs = {
        interests: ['culture', 'wellness'],
        location: location
      };
      
      const results = await eventRetriever.retrieveRelevantEvents(userPrefs, 3);
      
      if (results.length > 0) {
        results.forEach((event, index) => {
          console.log(`  ${index + 1}. ${event.title} (Score: ${event.score.toFixed(3)})`);
        });
      } else {
        console.log('  No relevant events found');
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error in location-based retrieval:', error.message);
  }
}

// Run demonstration
if (require.main === module) {
  demonstrateRetrievalPipeline()
    .then(() => demonstrateLocationBasedRetrieval())
    .then(() => {
      console.log('\n🎉 All retrieval pipeline examples completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  demonstrateRetrievalPipeline,
  demonstrateLocationBasedRetrieval
}; 