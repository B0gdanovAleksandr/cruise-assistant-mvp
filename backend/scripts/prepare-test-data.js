#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const logger = require('../src/utils/logger');

/**
 * Script to prepare test data for real RAG testing
 * Generates sample events and user preferences
 */

class TestDataPreparer {
  constructor() {
    this.eventsFile = path.join(__dirname, '../src/mock/events.json');
    this.userPrefsFile = path.join(__dirname, '../src/mock/userPrefs.json');
  }

  /**
   * Generate comprehensive test events
   */
  generateTestEvents() {
    const events = [
      // Cultural Events
      {
        id: 'event_001',
        title: 'Mediterranean Cultural Tour',
        type: 'excursion',
        description: 'Explore ancient ruins and local culture. Visit historical sites and learn about the rich history of the Mediterranean region. Experience guided tours through ancient cities and archaeological sites.',
        tags: ['culture', 'history', 'mediterranean', 'guided'],
        experienceAffinity: 0.8,
        location: 'Mediterranean',
        duration: '4 hours',
        price: '$89'
      },
      {
        id: 'event_002',
        title: 'Greek Mythology Walking Tour',
        type: 'excursion',
        description: 'Discover the fascinating world of Greek mythology through interactive storytelling. Visit temples and monuments while learning about ancient gods and heroes.',
        tags: ['culture', 'mythology', 'greece', 'walking'],
        experienceAffinity: 0.9,
        location: 'Greece',
        duration: '3 hours',
        price: '$65'
      },
      {
        id: 'event_003',
        title: 'Roman Colosseum Experience',
        type: 'excursion',
        description: 'Step back in time at the iconic Colosseum. Learn about gladiatorial games and Roman history with expert guides.',
        tags: ['culture', 'history', 'rome', 'colosseum'],
        experienceAffinity: 0.95,
        location: 'Italy',
        duration: '2.5 hours',
        price: '$75'
      },

      // Wellness Events
      {
        id: 'event_004',
        title: 'Luxury Spa Retreat',
        type: 'wellness',
        description: 'Indulge in a complete wellness experience with therapeutic massages, aromatherapy, and relaxation treatments.',
        tags: ['wellness', 'spa', 'relaxation', 'luxury'],
        experienceAffinity: 0.7,
        location: 'Caribbean',
        duration: '3 hours',
        price: '$150'
      },
      {
        id: 'event_005',
        title: 'Yoga by the Sea',
        type: 'wellness',
        description: 'Practice yoga with ocean views. Morning and sunset sessions available for all skill levels.',
        tags: ['wellness', 'yoga', 'ocean', 'meditation'],
        experienceAffinity: 0.6,
        location: 'Hawaii',
        duration: '1.5 hours',
        price: '$45'
      },
      {
        id: 'event_006',
        title: 'Thermal Baths Experience',
        type: 'wellness',
        description: 'Relax in natural thermal springs with mineral-rich waters. Includes sauna and steam room access.',
        tags: ['wellness', 'thermal', 'baths', 'natural'],
        experienceAffinity: 0.8,
        location: 'Iceland',
        duration: '4 hours',
        price: '$120'
      },

      // Adventure Events
      {
        id: 'event_007',
        title: 'Snorkeling Adventure',
        type: 'activity',
        description: 'Explore vibrant coral reefs and marine life. Professional guides and equipment provided.',
        tags: ['adventure', 'snorkeling', 'marine', 'ocean'],
        experienceAffinity: 0.9,
        location: 'Great Barrier Reef',
        duration: '3 hours',
        price: '$95'
      },
      {
        id: 'event_008',
        title: 'Mountain Hiking Expedition',
        type: 'activity',
        description: 'Challenge yourself with guided mountain hiking. Breathtaking views and wildlife encounters.',
        tags: ['adventure', 'hiking', 'mountain', 'nature'],
        experienceAffinity: 0.85,
        location: 'Swiss Alps',
        duration: '6 hours',
        price: '$110'
      },
      {
        id: 'event_009',
        title: 'Zip Line Adventure',
        type: 'activity',
        description: 'Soar through the treetops on thrilling zip lines. Multiple courses for different skill levels.',
        tags: ['adventure', 'zipline', 'thrilling', 'forest'],
        experienceAffinity: 0.75,
        location: 'Costa Rica',
        duration: '2 hours',
        price: '$85'
      },

      // Food & Dining Events
      {
        id: 'event_010',
        title: 'Wine Tasting Experience',
        type: 'dining',
        description: 'Sample premium wines from local vineyards. Learn about wine making and pairing.',
        tags: ['food', 'wine', 'tasting', 'luxury'],
        experienceAffinity: 0.8,
        location: 'Tuscany',
        duration: '2.5 hours',
        price: '$125'
      },
      {
        id: 'event_011',
        title: 'Cooking Class with Chef',
        type: 'dining',
        description: 'Learn to cook authentic local dishes with professional chefs. Take home recipes and skills.',
        tags: ['food', 'cooking', 'chef', 'learning'],
        experienceAffinity: 0.7,
        location: 'Thailand',
        duration: '4 hours',
        price: '$95'
      },
      {
        id: 'event_012',
        title: 'Street Food Tour',
        type: 'dining',
        description: 'Explore local street food culture. Taste authentic dishes from hidden gems.',
        tags: ['food', 'street', 'local', 'authentic'],
        experienceAffinity: 0.65,
        location: 'Singapore',
        duration: '3 hours',
        price: '$55'
      },

      // Family Events
      {
        id: 'event_013',
        title: 'Family Beach Day',
        type: 'family',
        description: 'Perfect family outing with beach activities, games, and water sports for all ages.',
        tags: ['family', 'beach', 'kids', 'fun'],
        experienceAffinity: 0.6,
        location: 'Maldives',
        duration: '6 hours',
        price: '$75'
      },
      {
        id: 'event_014',
        title: 'Aquarium Adventure',
        type: 'family',
        description: 'Explore marine life in interactive aquariums. Educational and entertaining for children.',
        tags: ['family', 'aquarium', 'marine', 'education'],
        experienceAffinity: 0.7,
        location: 'Dubai',
        duration: '3 hours',
        price: '$60'
      },
      {
        id: 'event_015',
        title: 'Theme Park Day',
        type: 'family',
        description: 'Thrilling rides and entertainment for the whole family. Multiple attractions and shows.',
        tags: ['family', 'theme park', 'rides', 'entertainment'],
        experienceAffinity: 0.8,
        location: 'Orlando',
        duration: '8 hours',
        price: '$120'
      },

      // Entertainment Events
      {
        id: 'event_016',
        title: 'Broadway Show',
        type: 'entertainment',
        description: 'Experience world-class theater performances. Premium seating and backstage tours available.',
        tags: ['entertainment', 'broadway', 'theater', 'culture'],
        experienceAffinity: 0.85,
        location: 'New York',
        duration: '3 hours',
        price: '$200'
      },
      {
        id: 'event_017',
        title: 'Jazz Night',
        type: 'entertainment',
        description: 'Enjoy live jazz music in intimate venues. Dinner and drinks included.',
        tags: ['entertainment', 'jazz', 'music', 'dinner'],
        experienceAffinity: 0.7,
        location: 'New Orleans',
        duration: '4 hours',
        price: '$90'
      },
      {
        id: 'event_018',
        title: 'Comedy Club Night',
        type: 'entertainment',
        description: 'Laugh the night away with top comedians. Interactive and engaging performances.',
        tags: ['entertainment', 'comedy', 'fun', 'nightlife'],
        experienceAffinity: 0.65,
        location: 'Los Angeles',
        duration: '2 hours',
        price: '$45'
      }
    ];

    return events;
  }

  /**
   * Generate diverse user preferences
   */
  generateUserPreferences() {
    const userPrefs = [
      // Cultural enthusiasts
      {
        id: 'user_001',
        interests: ['culture', 'history', 'art'],
        location: 'Mediterranean',
        budget: 'medium',
        groupSize: 2,
        preferredDuration: '3-5 hours',
        accessibility: false
      },
      {
        id: 'user_002',
        interests: ['culture', 'mythology', 'architecture'],
        location: 'Europe',
        budget: 'high',
        groupSize: 1,
        preferredDuration: '2-4 hours',
        accessibility: true
      },

      // Wellness seekers
      {
        id: 'user_003',
        interests: ['wellness', 'spa', 'relaxation'],
        location: 'Caribbean',
        budget: 'high',
        groupSize: 2,
        preferredDuration: '2-3 hours',
        accessibility: false
      },
      {
        id: 'user_004',
        interests: ['wellness', 'yoga', 'meditation'],
        location: 'Asia',
        budget: 'medium',
        groupSize: 1,
        preferredDuration: '1-2 hours',
        accessibility: true
      },

      // Adventure lovers
      {
        id: 'user_005',
        interests: ['adventure', 'outdoor', 'thrilling'],
        location: 'Any',
        budget: 'medium',
        groupSize: 4,
        preferredDuration: '4-6 hours',
        accessibility: false
      },
      {
        id: 'user_006',
        interests: ['adventure', 'water sports', 'marine'],
        location: 'Tropical',
        budget: 'high',
        groupSize: 2,
        preferredDuration: '3-4 hours',
        accessibility: false
      },

      // Food enthusiasts
      {
        id: 'user_007',
        interests: ['food', 'wine', 'cooking'],
        location: 'Europe',
        budget: 'high',
        groupSize: 2,
        preferredDuration: '2-4 hours',
        accessibility: false
      },
      {
        id: 'user_008',
        interests: ['food', 'local', 'authentic'],
        location: 'Asia',
        budget: 'medium',
        groupSize: 3,
        preferredDuration: '2-3 hours',
        accessibility: true
      },

      // Family travelers
      {
        id: 'user_009',
        interests: ['family', 'kids', 'entertainment'],
        location: 'Any',
        budget: 'medium',
        groupSize: 4,
        preferredDuration: '4-8 hours',
        accessibility: true
      },
      {
        id: 'user_010',
        interests: ['family', 'education', 'fun'],
        location: 'Any',
        budget: 'low',
        groupSize: 5,
        preferredDuration: '2-4 hours',
        accessibility: true
      },

      // Entertainment seekers
      {
        id: 'user_011',
        interests: ['entertainment', 'music', 'nightlife'],
        location: 'Urban',
        budget: 'medium',
        groupSize: 2,
        preferredDuration: '2-4 hours',
        accessibility: false
      },
      {
        id: 'user_012',
        interests: ['entertainment', 'theater', 'culture'],
        location: 'Major Cities',
        budget: 'high',
        groupSize: 2,
        preferredDuration: '3-4 hours',
        accessibility: true
      },

      // Mixed interests
      {
        id: 'user_013',
        interests: ['culture', 'wellness', 'food'],
        location: 'Mediterranean',
        budget: 'high',
        groupSize: 2,
        preferredDuration: '3-5 hours',
        accessibility: false
      },
      {
        id: 'user_014',
        interests: ['adventure', 'family', 'entertainment'],
        location: 'Tropical',
        budget: 'medium',
        groupSize: 4,
        preferredDuration: '4-6 hours',
        accessibility: true
      },
      {
        id: 'user_015',
        interests: ['culture', 'food', 'entertainment'],
        location: 'Europe',
        budget: 'medium',
        groupSize: 3,
        preferredDuration: '2-4 hours',
        accessibility: false
      }
    ];

    return userPrefs;
  }

  /**
   * Save data to files
   */
  async saveTestData() {
    try {
      const events = this.generateTestEvents();
      const userPrefs = this.generateUserPreferences();

      // Save events
      await fs.writeFile(this.eventsFile, JSON.stringify(events, null, 2));
      console.log(`✅ Saved ${events.length} test events to ${this.eventsFile}`);

      // Save user preferences
      await fs.writeFile(this.userPrefsFile, JSON.stringify(userPrefs, null, 2));
      console.log(`✅ Saved ${userPrefs.length} user preferences to ${this.userPrefsFile}`);

      // Generate summary
      this.generateDataSummary(events, userPrefs);

    } catch (error) {
      console.error('❌ Error saving test data:', error);
      throw error;
    }
  }

  /**
   * Generate data summary
   */
  generateDataSummary(events, userPrefs) {
    console.log('\n📊 Test Data Summary:');
    console.log('=====================');

    // Events summary
    const eventTypes = {};
    const eventLocations = {};
    const eventTags = {};

    events.forEach(event => {
      // Count types
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
      
      // Count locations
      eventLocations[event.location] = (eventLocations[event.location] || 0) + 1;
      
      // Count tags
      event.tags.forEach(tag => {
        eventTags[tag] = (eventTags[tag] || 0) + 1;
      });
    });

    console.log(`\n📅 Events (${events.length} total):`);
    Object.entries(eventTypes).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });

    console.log(`\n🌍 Locations:`);
    Object.entries(eventLocations).forEach(([location, count]) => {
      console.log(`   - ${location}: ${count}`);
    });

    console.log(`\n🏷️ Top Tags:`);
    Object.entries(eventTags)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([tag, count]) => {
        console.log(`   - ${tag}: ${count}`);
      });

    // User preferences summary
    const interestCounts = {};
    const locationCounts = {};
    const budgetCounts = {};

    userPrefs.forEach(user => {
      // Count interests
      user.interests.forEach(interest => {
        interestCounts[interest] = (interestCounts[interest] || 0) + 1;
      });
      
      // Count locations
      locationCounts[user.location] = (locationCounts[user.location] || 0) + 1;
      
      // Count budgets
      budgetCounts[user.budget] = (budgetCounts[user.budget] || 0) + 1;
    });

    console.log(`\n👥 User Preferences (${userPrefs.length} total):`);
    console.log(`\n🎯 Top Interests:`);
    Object.entries(interestCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .forEach(([interest, count]) => {
        console.log(`   - ${interest}: ${count}`);
      });

    console.log(`\n🌍 Preferred Locations:`);
    Object.entries(locationCounts).forEach(([location, count]) => {
      console.log(`   - ${location}: ${count}`);
    });

    console.log(`\n💰 Budget Distribution:`);
    Object.entries(budgetCounts).forEach(([budget, count]) => {
      console.log(`   - ${budget}: ${count}`);
    });
  }

  /**
   * Validate test data
   */
  validateTestData(events, userPrefs) {
    console.log('\n🔍 Validating test data...');

    // Validate events
    const eventValidation = {
      total: events.length,
      hasRequiredFields: 0,
      hasValidTags: 0,
      hasValidAffinity: 0
    };

    events.forEach(event => {
      if (event.id && event.title && event.type && event.description) {
        eventValidation.hasRequiredFields++;
      }
      if (event.tags && Array.isArray(event.tags) && event.tags.length > 0) {
        eventValidation.hasValidTags++;
      }
      if (event.experienceAffinity >= 0 && event.experienceAffinity <= 1) {
        eventValidation.hasValidAffinity++;
      }
    });

    // Validate user preferences
    const userValidation = {
      total: userPrefs.length,
      hasRequiredFields: 0,
      hasValidInterests: 0,
      hasValidBudget: 0
    };

    userPrefs.forEach(user => {
      if (user.id && user.interests && user.location) {
        userValidation.hasRequiredFields++;
      }
      if (user.interests && Array.isArray(user.interests) && user.interests.length > 0) {
        userValidation.hasValidInterests++;
      }
      if (['low', 'medium', 'high'].includes(user.budget)) {
        userValidation.hasValidBudget++;
      }
    });

    console.log(`✅ Events validation: ${eventValidation.hasRequiredFields}/${eventValidation.total} valid`);
    console.log(`✅ User preferences validation: ${userValidation.hasRequiredFields}/${userValidation.total} valid`);

    return eventValidation.hasRequiredFields === eventValidation.total && 
           userValidation.hasRequiredFields === userValidation.total;
  }
}

// Run if executed directly
if (require.main === module) {
  const preparer = new TestDataPreparer();
  
  preparer.saveTestData()
    .then(() => {
      console.log('\n🎉 Test data preparation completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('1. Review the generated data');
      console.log('2. Customize if needed');
      console.log('3. Run real tests with the data');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test data preparation failed:', error);
      process.exit(1);
    });
}

module.exports = TestDataPreparer; 