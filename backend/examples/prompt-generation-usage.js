const PromptGenerator = require('../src/services/promptGenerator');
const EventRetriever = require('../src/services/eventRetriever');

async function demonstratePromptGeneration() {
  console.log('🚢 Cruise Assistant Prompt Generation Demo\n');
  
  try {
    const promptGenerator = new PromptGenerator();
    const eventRetriever = new EventRetriever();

    // Test user preferences
    const userPrefs = {
      interests: ['culture', 'wellness'],
      location: 'Mediterranean'
    };

    console.log('📋 User Preferences:');
    console.log(`  Interests: ${userPrefs.interests.join(', ')}`);
    console.log(`  Location: ${userPrefs.location}\n`);

    // Retrieve events first
    console.log('🔍 Retrieving relevant events...');
    const retrievedEvents = await eventRetriever.retrieveRelevantEventsWithMinAffinity(userPrefs, 0.4, 5);
    console.log(`✅ Retrieved ${retrievedEvents.length} events\n`);

    // 1. Standard prompt generation
    console.log('📝 1. Standard Prompt Generation:');
    const standardPrompt = promptGenerator.generateRecommendationPrompt(retrievedEvents, userPrefs);
    console.log(`Generated prompt (${promptGenerator.estimateTokens(standardPrompt)} tokens):`);
    console.log('─'.repeat(50));
    console.log(standardPrompt);
    console.log('─'.repeat(50));
    console.log('');

    // 2. Compact prompt generation
    console.log('📝 2. Compact Prompt Generation:');
    const compactPrompt = promptGenerator.generateCompactPrompt(retrievedEvents, userPrefs);
    console.log(`Generated compact prompt (${promptGenerator.estimateTokens(compactPrompt)} tokens):`);
    console.log('─'.repeat(50));
    console.log(compactPrompt);
    console.log('─'.repeat(50));
    console.log('');

    // 3. Detailed prompt generation
    console.log('📝 3. Detailed Prompt Generation:');
    const detailedPrompt = promptGenerator.generateDetailedPrompt(retrievedEvents, userPrefs, {
      includeTags: true,
      includeAffinity: true,
      maxEvents: 3
    });
    console.log(`Generated detailed prompt (${promptGenerator.estimateTokens(detailedPrompt)} tokens):`);
    console.log('─'.repeat(50));
    console.log(detailedPrompt);
    console.log('─'.repeat(50));
    console.log('');

    // 4. Token limit testing
    console.log('📊 4. Token Limit Testing:');
    const manyEvents = Array.from({ length: 15 }, (_, i) => ({
      id: `event_${i}`,
      title: `Very Long Event Title That Exceeds Normal Length For Testing Token Limits ${i}`,
      type: 'entertainment',
      score: 0.8,
      experienceAffinity: 'relaxation',
      tags: ['very', 'long', 'tags', 'array', 'for', 'testing']
    }));

    const longPrompt = promptGenerator.generateRecommendationPrompt(manyEvents, userPrefs);
    const tokenCount = promptGenerator.estimateTokens(longPrompt);
    console.log(`Generated prompt with ${tokenCount} tokens (limit: ${promptGenerator.maxTokens})`);
    console.log(`Within limit: ${tokenCount <= promptGenerator.maxTokens ? '✅' : '❌'}`);
    console.log('');

    // 5. Different user preferences
    console.log('👥 5. Different User Preferences:');
    const differentPrefs = [
      { interests: ['adventure'], location: 'Alaska' },
      { interests: ['relaxation', 'food'], location: 'Caribbean' },
      { interests: ['history'], location: 'Northern Europe' }
    ];

    for (const prefs of differentPrefs) {
      console.log(`\nUser: ${prefs.interests.join(', ')} in ${prefs.location}`);
      const events = await eventRetriever.retrieveRelevantEvents(prefs, 3);
      if (events.length > 0) {
        const prompt = promptGenerator.generateCompactPrompt(events, prefs);
        console.log(`Prompt (${promptGenerator.estimateTokens(prompt)} tokens): ${prompt.substring(0, 100)}...`);
      } else {
        console.log('No relevant events found');
      }
    }

    console.log('\n✅ Prompt Generation Demo completed successfully!');

  } catch (error) {
    console.error('❌ Error during prompt generation demo:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

async function demonstratePromptValidation() {
  console.log('\n🔍 Prompt Validation Examples\n');
  
  try {
    const promptGenerator = new PromptGenerator();

    // Test cases for validation
    const testCases = [
      {
        name: 'Empty events array',
        events: [],
        userPrefs: { interests: ['culture'] },
        shouldThrow: true
      },
      {
        name: 'Missing user preferences',
        events: [{ id: '1', title: 'Test', type: 'test', score: 0.8 }],
        userPrefs: {},
        shouldThrow: true
      },
      {
        name: 'Valid data',
        events: [{ id: '1', title: 'Test Event', type: 'entertainment', score: 0.8 }],
        userPrefs: { interests: ['culture'] },
        shouldThrow: false
      }
    ];

    for (const testCase of testCases) {
      console.log(`Testing: ${testCase.name}`);
      try {
        const prompt = promptGenerator.generateRecommendationPrompt(testCase.events, testCase.userPrefs);
        if (testCase.shouldThrow) {
          console.log('❌ Expected error but got success');
        } else {
          console.log(`✅ Success: ${promptGenerator.estimateTokens(prompt)} tokens`);
        }
      } catch (error) {
        if (testCase.shouldThrow) {
          console.log(`✅ Expected error: ${error.message}`);
        } else {
          console.log(`❌ Unexpected error: ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error during validation demo:', error.message);
  }
}

async function demonstrateTokenEstimation() {
  console.log('\n📊 Token Estimation Examples\n');
  
  try {
    const promptGenerator = new PromptGenerator();

    const testTexts = [
      'Short text',
      'This is a medium length text with multiple words.',
      'This is a very long text that contains many words and should give us a good idea of how the token estimation works with different lengths of content.',
      '🎵 Special characters and emojis: 🚢 ⚓ 🌊 🏖️',
      'Mixed content: 123 numbers, symbols @#$%, and words together.'
    ];

    for (const text of testTexts) {
      const estimatedTokens = promptGenerator.estimateTokens(text);
      console.log(`Text: "${text}"`);
      console.log(`Estimated tokens: ${estimatedTokens}`);
      console.log(`Character count: ${text.length}`);
      console.log(`Ratio (chars/tokens): ${(text.length / estimatedTokens).toFixed(2)}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error during token estimation demo:', error.message);
  }
}

if (require.main === module) {
  demonstratePromptGeneration()
    .then(() => demonstratePromptValidation())
    .then(() => demonstrateTokenEstimation())
    .then(() => {
      console.log('\n🎉 All prompt generation examples completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { 
  demonstratePromptGeneration, 
  demonstratePromptValidation, 
  demonstrateTokenEstimation 
}; 