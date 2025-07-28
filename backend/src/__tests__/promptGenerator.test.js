const PromptGenerator = require('../services/promptGenerator');

describe('PromptGenerator', () => {
  let promptGenerator;
  let mockRetrievedEvents;
  let mockUserPrefs;

  beforeEach(() => {
    promptGenerator = new PromptGenerator();
    
    mockRetrievedEvents = [
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
      }
    ];

    mockUserPrefs = {
      interests: ['culture', 'wellness'],
      location: 'Mediterranean'
    };
  });

  describe('generateRecommendationPrompt', () => {
    it('should generate a valid recommendation prompt', () => {
      const prompt = promptGenerator.generateRecommendationPrompt(mockRetrievedEvents, mockUserPrefs);

      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);

      // Check that all required components are present
      expect(prompt).toContain('Available Events:');
      expect(prompt).toContain('User Profile:');
      expect(prompt).toContain('Recommend experiences with personalized advice');
      expect(prompt).toContain('Live Jazz Evening');
      expect(prompt).toContain('Sunset Yoga Class');
      expect(prompt).toContain('culture, wellness');
      expect(prompt).toContain('Mediterranean');
    });

    it('should include event affinity scores', () => {
      const prompt = promptGenerator.generateRecommendationPrompt(mockRetrievedEvents, mockUserPrefs);

      expect(prompt).toContain('(affinity: 0.85)');
      expect(prompt).toContain('(affinity: 0.75)');
      expect(prompt).toContain('(affinity: 0.65)');
    });

    it('should handle single interest', () => {
      const singleInterestPrefs = {
        interests: ['culture'],
        location: 'Mediterranean'
      };

      const prompt = promptGenerator.generateRecommendationPrompt(mockRetrievedEvents, singleInterestPrefs);

      expect(prompt).toContain('Interests: culture');
    });

    it('should handle missing location', () => {
      const noLocationPrefs = {
        interests: ['culture', 'wellness']
      };

      const prompt = promptGenerator.generateRecommendationPrompt(mockRetrievedEvents, noLocationPrefs);

      expect(prompt).toContain('Location: cruise');
    });

    it('should throw error for empty retrieved events', () => {
      expect(() => {
        promptGenerator.generateRecommendationPrompt([], mockUserPrefs);
      }).toThrow('Retrieved events must be a non-empty array');
    });

    it('should throw error for missing user preferences', () => {
      expect(() => {
        promptGenerator.generateRecommendationPrompt(mockRetrievedEvents, {});
      }).toThrow('User preferences must include interests');
    });

    it('should respect token limit', () => {
      // Create many events to test token limit
      const manyEvents = Array.from({ length: 20 }, (_, i) => ({
        id: `event_${i}`,
        title: `Very Long Event Title That Exceeds Normal Length ${i}`,
        type: 'entertainment',
        score: 0.8,
        experienceAffinity: 'relaxation',
        tags: ['very', 'long', 'tags', 'array']
      }));

      const prompt = promptGenerator.generateRecommendationPrompt(manyEvents, mockUserPrefs);
      const estimatedTokens = promptGenerator.estimateTokens(prompt);

      expect(estimatedTokens).toBeLessThanOrEqual(300);
    });
  });

  describe('generateCompactPrompt', () => {
    it('should generate a compact prompt', () => {
      const prompt = promptGenerator.generateCompactPrompt(mockRetrievedEvents, mockUserPrefs);

      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);

      // Check compact format
      expect(prompt).toContain('Events:');
      expect(prompt).toContain('User:');
      expect(prompt).toContain('Recommend with advice and timing');
      expect(prompt).toContain('Live Jazz Evening');
      expect(prompt).toContain('Sunset Yoga Class');
      expect(prompt).toContain('culture, wellness');
      expect(prompt).toContain('Mediterranean');
    });

    it('should limit to top 3 events', () => {
      const manyEvents = Array.from({ length: 10 }, (_, i) => ({
        id: `event_${i}`,
        title: `Event ${i}`,
        type: 'entertainment',
        score: 0.8
      }));

      const prompt = promptGenerator.generateCompactPrompt(manyEvents, mockUserPrefs);

      // Should only include first 3 events
      expect(prompt).toContain('Event 0');
      expect(prompt).toContain('Event 1');
      expect(prompt).toContain('Event 2');
      expect(prompt).not.toContain('Event 3');
    });
  });

  describe('generateDetailedPrompt', () => {
    it('should generate a detailed prompt with tags', () => {
      const prompt = promptGenerator.generateDetailedPrompt(mockRetrievedEvents, mockUserPrefs, {
        includeTags: true,
        includeAffinity: true
      });

      expect(prompt).toContain('Available Events:');
      expect(prompt).toContain('Live Jazz Evening');
      expect(prompt).toContain('(affinity: 0.85)');
      expect(prompt).toContain('[jazz, music, culture]');
    });

    it('should respect maxEvents option', () => {
      const prompt = promptGenerator.generateDetailedPrompt(mockRetrievedEvents, mockUserPrefs, {
        maxEvents: 2
      });

      expect(prompt).toContain('Live Jazz Evening');
      expect(prompt).toContain('Sunset Yoga Class');
      expect(prompt).not.toContain('Mediterranean History Lecture');
    });

    it('should exclude tags when includeTags is false', () => {
      const prompt = promptGenerator.generateDetailedPrompt(mockRetrievedEvents, mockUserPrefs, {
        includeTags: false,
        includeAffinity: true
      });

      expect(prompt).toContain('(affinity: 0.85)');
      expect(prompt).not.toContain('[jazz, music, culture]');
    });

    it('should exclude affinity when includeAffinity is false', () => {
      const prompt = promptGenerator.generateDetailedPrompt(mockRetrievedEvents, mockUserPrefs, {
        includeTags: true,
        includeAffinity: false
      });

      expect(prompt).not.toContain('(affinity: 0.85)');
      expect(prompt).toContain('[jazz, music, culture]');
    });
  });

  describe('token estimation', () => {
    it('should estimate tokens correctly', () => {
      const text = 'This is a test text with multiple words.';
      const estimatedTokens = promptGenerator.estimateTokens(text);

      expect(estimatedTokens).toBeGreaterThan(0);
      expect(typeof estimatedTokens).toBe('number');
    });

    it('should handle empty text', () => {
      const estimatedTokens = promptGenerator.estimateTokens('');
      expect(estimatedTokens).toBe(0);
    });
  });

  describe('formatting methods', () => {
    it('should format events list correctly', () => {
      const formatted = promptGenerator.formatEventsList(mockRetrievedEvents);

      expect(formatted).toContain('Available Events:');
      expect(formatted).toContain('1. Live Jazz Evening - entertainment (affinity: 0.85)');
      expect(formatted).toContain('2. Sunset Yoga Class - activity (affinity: 0.75)');
      expect(formatted).toContain('3. Mediterranean History Lecture - education (affinity: 0.65)');
    });

    it('should format user preferences correctly', () => {
      const formatted = promptGenerator.formatUserPrefs(mockUserPrefs);

      expect(formatted).toContain('User Profile:');
      expect(formatted).toContain('- Interests: culture, wellness');
      expect(formatted).toContain('- Location: Mediterranean');
    });

    it('should handle single interest in user preferences', () => {
      const singleInterestPrefs = {
        interests: ['culture'],
        location: 'Mediterranean'
      };

      const formatted = promptGenerator.formatUserPrefs(singleInterestPrefs);
      expect(formatted).toContain('- Interests: culture');
    });
  });

  describe('Specific test case: Mediterranean with culture and wellness', () => {
    it('should generate prompt for Mediterranean culture and wellness interests', () => {
      const prompt = promptGenerator.generateRecommendationPrompt(mockRetrievedEvents, mockUserPrefs);

      // Verify the specific requirements
      expect(prompt).toContain('Available Events:');
      expect(prompt).toContain('Live Jazz Evening');
      expect(prompt).toContain('Sunset Yoga Class');
      expect(prompt).toContain('User Profile:');
      expect(prompt).toContain('Interests: culture, wellness');
      expect(prompt).toContain('Location: Mediterranean');
      expect(prompt).toContain('Recommend experiences with personalized advice, timing suggestions, and cite origin of each recommendation.');

      // Check token limit
      const estimatedTokens = promptGenerator.estimateTokens(prompt);
      expect(estimatedTokens).toBeLessThanOrEqual(300);

      // Verify structure
      const lines = prompt.split('\n');
      expect(lines.length).toBeGreaterThan(5);
      
      // Check that events are numbered
      expect(prompt).toMatch(/1\. .*Live Jazz Evening/);
      expect(prompt).toMatch(/2\. .*Sunset Yoga Class/);
      expect(prompt).toMatch(/3\. .*Mediterranean History Lecture/);
    });
  });
}); 