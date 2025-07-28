const EventIndexer = require('../src/services/eventIndexer');
const path = require('path');

/**
 * Example of using RAG functionality for Cruise Assistant
 */
async function demonstrateRAGUsage() {
  console.log('🚢 Cruise Assistant RAG Demo\n');

  try {
    // Create EventIndexer instance
    const eventIndexer = new EventIndexer();
    
    // 1. Load events from JSON file
    console.log('📖 Loading events from JSON file...');
    const events = await eventIndexer.loadEvents();
    console.log(`✅ Loaded ${events.length} events successfully\n`);
    
    // 2. Index events in vector database
    console.log('🔍 Indexing events in vector database...');
    const indexResult = await eventIndexer.loadAndIndex();
    
    if (indexResult.status === 'OK') {
      console.log(`✅ Successfully indexed ${indexResult.indexedCount} events`);
      console.log(`📊 Status: ${indexResult.message}\n`);
    } else {
      console.log(`❌ Indexing failed: ${indexResult.error}\n`);
      return;
    }
    
    // 3. Search for events
    console.log('🔎 Searching for events...');
    
    const searchQueries = [
      'relaxing activities',
      'jazz music evening',
      'wellness and health',
      'gourmet dining experience',
      'educational lectures'
    ];
    
    for (const query of searchQueries) {
      console.log(`\n🔍 Searching for: "${query}"`);
      const results = await eventIndexer.searchEvents(query, 3);
      
      if (results.length > 0) {
        console.log(`📋 Found ${results.length} relevant events:`);
        results.forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.metadata.title} (Score: ${result.score.toFixed(3)})`);
          console.log(`     Type: ${result.metadata.type}`);
          console.log(`     Experience: ${result.metadata.experienceAffinity}`);
          console.log(`     Tags: ${result.metadata.tags.join(', ')}`);
        });
      } else {
        console.log('❌ No relevant events found');
      }
    }
    
    // 4. Demonstrate different types of search
    console.log('\n🎯 Advanced Search Examples:');
    
    // Search by experience type
    console.log('\n🔍 Searching for luxury experiences...');
    const luxuryResults = await eventIndexer.searchEvents('luxury premium exclusive', 2);
    luxuryResults.forEach(result => {
      console.log(`  - ${result.metadata.title} (${result.metadata.experienceAffinity})`);
    });
    
    // Search by activity
    console.log('\n🔍 Searching for active experiences...');
    const activeResults = await eventIndexer.searchEvents('sport activity fitness', 2);
    activeResults.forEach(result => {
      console.log(`  - ${result.metadata.title} (${result.metadata.type})`);
    });
    
    // Search by time of day
    console.log('\n🔍 Searching for morning activities...');
    const morningResults = await eventIndexer.searchEvents('morning sunrise early', 2);
    morningResults.forEach(result => {
      console.log(`  - ${result.metadata.title}`);
    });
    
    console.log('\n✅ RAG Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during RAG demo:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Example of creating custom events
 */
async function createCustomEvents() {
  console.log('\n🎨 Creating custom events example...\n');
  
  const customEvents = [
    {
      id: 'custom_001',
      type: 'entertainment',
      title: 'Space Party',
      description: 'Unique party in space theme with neon lights and space music',
      tags: ['space', 'party', 'neon', 'music', 'unique'],
      experienceAffinity: 'entertainment'
    },
    {
      id: 'custom_002',
      type: 'wellness',
      title: 'Stargazing Meditation',
      description: 'Deep meditation on the open deck under the starry sky with a professional instructor',
      tags: ['meditation', 'stars', 'deck', 'relaxation', 'evening'],
      experienceAffinity: 'relaxation'
    }
  ];
  
  // Save to temporary file
  const fs = require('fs').promises;
  const tempPath = path.join(__dirname, 'temp-custom-events.json');
  
  try {
    await fs.writeFile(tempPath, JSON.stringify(customEvents, null, 2));
    
    const eventIndexer = new EventIndexer();
    const result = await eventIndexer.loadAndIndex(tempPath);
    
    if (result.status === 'OK') {
      console.log(`✅ Custom events indexed successfully: ${result.indexedCount} events`);
      
      // Search for custom events
      const searchResults = await eventIndexer.searchEvents('space party', 2);
      console.log(`🔍 Found ${searchResults.length} custom events in search`);
      
    } else {
      console.log(`❌ Failed to index custom events: ${result.error}`);
    }
    
    // Delete temporary file
    await fs.unlink(tempPath);
    
  } catch (error) {
    console.error('❌ Error with custom events:', error.message);
  }
}

// Run demonstration
if (require.main === module) {
  demonstrateRAGUsage()
    .then(() => createCustomEvents())
    .then(() => {
      console.log('\n🎉 All examples completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  demonstrateRAGUsage,
  createCustomEvents
}; 