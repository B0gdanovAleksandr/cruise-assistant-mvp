const PromptGenerator = require('../src/services/promptGenerator');

async function demonstratePromptGenerationMock() {
  console.log('🚢 Cruise Assistant Prompt Generation Demo (Mock Version)\n');
  
  try {
    const promptGenerator = new PromptGenerator();

    // Mock retrieved events
    const mockRetrievedEvents = [
      {
        id: 'event_001',
        title: 'Live Jazz Evening',
        type: 'entertainment',
        score: 0.85,
        experienceAffinity: 'relaxation',
        tags: ['jazz', 'music', 'culture', 'live music', 'evening']
      },
      {
        id: 'event_002',
        title: 'Sunset Yoga Class',
        type: 'activity',
        score: 0.75,
        experienceAffinity: 'wellness',
        tags: ['yoga', 'sunset', 'wellness', 'meditation']
      },
      {
        id: 'event_003',
        title: 'Mediterranean History Lecture',
        type: 'education',
        score: 0.65,
        experienceAffinity: 'learning',
        tags: ['history', 'culture', 'mediterranean', 'education']
      },
      {
        id: 'event_004',
        title: 'Mediterranean Spa Experience',
        type: 'wellness',
        score: 0.70,
        experienceAffinity: 'relaxation',
        tags: ['spa', 'wellness', 'mediterranean', 'relaxation']
      }
    ];

    // Test user preferences
    const userPrefs = {
      interests: ['culture', 'wellness'],
      location: 'Mediterranean'
    };

    console.log('📋 User Preferences:');
    console.log(`  Interests: ${userPrefs.interests.join(', ')}`);
    console.log(`  Location: ${userPrefs.location}\n`);

    console.log('🔍 Mock Retrieved Events:');
    mockRetrievedEvents.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.title} (${event.type}) - Score: ${event.score}`);
    });
    console.log('');

    // 1. Standard prompt generation
    console.log('📝 1. Standard Prompt Generation:');
    const standardPrompt = promptGenerator.generateRecommendationPrompt(mockRetrievedEvents, userPrefs);
    console.log(`Generated prompt (${promptGenerator.estimateTokens(standardPrompt)} tokens):`);
    console.log('─'.repeat(50));
    console.log(standardPrompt);
    console.log('─'.repeat(50));
    console.log('');

    // 2. Compact prompt generation
    console.log('📝 2. Compact Prompt Generation:');
    const compactPrompt = promptGenerator.generateCompactPrompt(mockRetrievedEvents, userPrefs);
    console.log(`Generated compact prompt (${promptGenerator.estimateTokens(compactPrompt)} tokens):`);
    console.log('─'.repeat(50));
    console.log(compactPrompt);
    console.log('─'.repeat(50));
    console.log('');

    // 3. Detailed prompt generation
    console.log('📝 3. Detailed Prompt Generation:');
    const detailedPrompt = promptGenerator.generateDetailedPrompt(mockRetrievedEvents, userPrefs, {
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

    const mockEventsForDifferentPrefs = [
      {
        id: 'event_alaska',
        title: 'Glacier Hiking Adventure',
        type: 'adventure',
        score: 0.9,
        experienceAffinity: 'adventure',
        tags: ['hiking', 'glacier', 'adventure', 'alaska']
      },
      {
        id: 'event_caribbean',
        title: 'Caribbean Cooking Class',
        type: 'food',
        score: 0.8,
        experienceAffinity: 'food',
        tags: ['cooking', 'caribbean', 'food', 'culture']
      },
      {
        id: 'event_europe',
        title: 'Viking History Tour',
        type: 'education',
        score: 0.85,
        experienceAffinity: 'learning',
        tags: ['history', 'viking', 'northern europe', 'culture']
      }
    ];

    for (let i = 0; i < differentPrefs.length; i++) {
      const prefs = differentPrefs[i];
      const events = [mockEventsForDifferentPrefs[i]];
      console.log(`\nUser: ${prefs.interests.join(', ')} in ${prefs.location}`);
      const prompt = promptGenerator.generateCompactPrompt(events, prefs);
      console.log(`Prompt (${promptGenerator.estimateTokens(prompt)} tokens): ${prompt}`);
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

async function demonstrateSpecificTestCase() {
  console.log('\n🎯 Specific Test Case: Mediterranean with culture and wellness\n');
  
  try {
    const promptGenerator = new PromptGenerator();

    const retrievedEvents = [
      {
        id: 'event_001',
        title: 'Live Jazz Evening',
        type: 'entertainment',
        score: 0.85,
        experienceAffinity: 'relaxation',
        tags: ['jazz', 'music', 'culture', 'live music', 'evening']
      },
      {
        id: 'event_002',
        title: 'Sunset Yoga Class',
        type: 'activity',
        score: 0.75,
        experienceAffinity: 'wellness',
        tags: ['yoga', 'sunset', 'wellness', 'meditation']
      }
    ];

    const userPrefs = {
      interests: ['culture', 'wellness'],
      location: 'Mediterranean'
    };

    const prompt = promptGenerator.generateRecommendationPrompt(retrievedEvents, userPrefs);
    const estimatedTokens = promptGenerator.estimateTokens(prompt);

    console.log('Generated prompt:');
    console.log('─'.repeat(50));
    console.log(prompt);
    console.log('─'.repeat(50));
    console.log(`\nToken count: ${estimatedTokens} (limit: ${promptGenerator.maxTokens})`);
    console.log(`Within limit: ${estimatedTokens <= promptGenerator.maxTokens ? '✅' : '❌'}`);

    // Verify specific requirements
    const hasLiveJazz = prompt.includes('Live Jazz Evening');
    const hasSunsetYoga = prompt.includes('Sunset Yoga Class');
    const hasCultureWellness = prompt.includes('culture, wellness');
    const hasMediterranean = prompt.includes('Mediterranean');
    const hasRecommendationInstruction = prompt.includes('Recommend experiences with personalized advice');

    console.log('\nRequirements check:');
    console.log(`✅ Includes "Live Jazz Evening": ${hasLiveJazz}`);
    console.log(`✅ Includes "Sunset Yoga Class": ${hasSunsetYoga}`);
    console.log(`✅ Includes user interests: ${hasCultureWellness}`);
    console.log(`✅ Includes location: ${hasMediterranean}`);
    console.log(`✅ Includes recommendation instruction: ${hasRecommendationInstruction}`);

  } catch (error) {
    console.error('❌ Error during specific test case:', error.message);
  }
}

if (require.main === module) {
  demonstratePromptGenerationMock()
    .then(() => demonstratePromptValidation())
    .then(() => demonstrateTokenEstimation())
    .then(() => demonstrateSpecificTestCase())
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
  demonstratePromptGenerationMock, 
  demonstratePromptValidation, 
  demonstrateTokenEstimation,
  demonstrateSpecificTestCase
}; 