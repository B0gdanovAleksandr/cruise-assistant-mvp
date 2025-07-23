const RecommendationGenerator = require('../src/services/recommendationGenerator');

describe('RecommendationGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new RecommendationGenerator();
  });

  describe('generateRecommendations', () => {
    test('should generate recommendations for music, food, travel interests', () => {
      // Arrange
      const interests = ['music', 'food', 'travel'];
      const entities = [
        { id: 'entity1', name: 'Jazz Club', type: 'venue', score: 0.9 },
        { id: 'entity2', name: 'Italian Restaurant', type: 'restaurant', score: 0.8 }
      ];
      const recommendations = [
        { name: 'Live Music Venue', type: 'entertainment', score: 0.95 }
      ];

      // Act
      const result = generator.generateRecommendations(interests, entities, recommendations);

      // Assert
      expect(result.recommendations).toHaveLength(5);
      expect(result.recommendations[0]).toHaveProperty('title');
      expect(result.recommendations[0]).toHaveProperty('description');
      expect(result.recommendations[0]).toHaveProperty('emoji');
      expect(result.recommendations[0].description.length).toBeLessThanOrEqual(150);
      expect(result.metadata.generated).toBe(true);
      expect(result.metadata.interestCount).toBe(3);
    });

    test('should handle empty interests array', () => {
      // Arrange
      const interests = [];

      // Act
      const result = generator.generateRecommendations(interests);

      // Assert
      expect(result.recommendations).toHaveLength(3);
      expect(result.recommendations[0].interest).toBe('general');
    });

    test('should normalize different interest variations', () => {
      // Arrange
      const interests = ['jazz', 'cuisine', 'tourism'];

      // Act
      const result = generator.generateRecommendations(interests);

      // Assert
      expect(result.recommendations.length).toBeGreaterThanOrEqual(3);
      expect(result.metadata.interestCount).toBe(3);
    });

    test('should limit recommendations to maximum 5', () => {
      // Arrange
      const interests = ['music', 'food', 'travel', 'wellness', 'adventure', 'history'];

      // Act
      const result = generator.generateRecommendations(interests);

      // Assert
      expect(result.recommendations).toHaveLength(5);
      expect(result.metadata.recommendationCount).toBe(5);
    });

    test('should ensure minimum 3 recommendations', () => {
      // Arrange
      const interests = ['unknown_interest'];

      // Act
      const result = generator.generateRecommendations(interests);

      // Assert
      expect(result.recommendations).toHaveLength(3);
      expect(result.recommendations[0].interest).toBe('general');
    });

    test('should enhance descriptions with entity data', () => {
      // Arrange
      const interests = ['music'];
      const entities = [
        { id: 'entity1', name: 'Jazz Club', type: 'venue', score: 0.9 }
      ];

      // Act
      const result = generator.generateRecommendations(interests, entities);

      // Assert
      expect(result.recommendations[0].description).toContain('Jazz Club');
      expect(result.recommendations[0].description.length).toBeLessThanOrEqual(150);
    });

    test('should handle errors gracefully with fallback', () => {
      // Arrange
      const interests = null; // This will cause an error

      // Act
      const result = generator.generateRecommendations(interests);

      // Assert
      expect(result.recommendations).toHaveLength(3);
      expect(result.metadata.generated).toBe(false);
      expect(result.metadata.error).toBeDefined();
    });
  });

  describe('normalizeInterest', () => {
    test('should normalize music-related interests', () => {
      expect(generator.normalizeInterest('music')).toBe('music');
      expect(generator.normalizeInterest('jazz')).toBe('music');
      expect(generator.normalizeInterest('classical')).toBe('music');
    });

    test('should normalize food-related interests', () => {
      expect(generator.normalizeInterest('food')).toBe('food');
      expect(generator.normalizeInterest('cuisine')).toBe('food');
      expect(generator.normalizeInterest('cooking')).toBe('food');
    });

    test('should normalize travel-related interests', () => {
      expect(generator.normalizeInterest('travel')).toBe('travel');
      expect(generator.normalizeInterest('tourism')).toBe('travel');
      expect(generator.normalizeInterest('exploration')).toBe('travel');
    });

    test('should return general for unknown interests', () => {
      expect(generator.normalizeInterest('unknown')).toBe('general');
      expect(generator.normalizeInterest('xyz')).toBe('general');
    });

    test('should handle case and whitespace', () => {
      expect(generator.normalizeInterest('MUSIC')).toBe('music');
      expect(generator.normalizeInterest('  food  ')).toBe('food');
    });
  });

  describe('enhanceDescription', () => {
    test('should enhance description with entity name', () => {
      // Arrange
      const baseDescription = "Enjoy live music";
      const entities = [{ name: "Jazz Club", type: "venue" }];

      // Act
      const result = generator.enhanceDescription(baseDescription, entities);

      // Assert
      expect(result).toContain('Jazz Club');
      expect(result.length).toBeLessThanOrEqual(150);
    });

    test('should not enhance if description would be too long', () => {
      // Arrange
      const baseDescription = "This is a very long description that would exceed the character limit when combined with a very long entity name";
      const entities = [{ name: "Very Long Entity Name That Would Make Description Too Long", type: "venue" }];

      // Act
      const result = generator.enhanceDescription(baseDescription, entities);

      // Assert
      expect(result).toBe(baseDescription);
    });

    test('should handle empty entities array', () => {
      // Arrange
      const baseDescription = "Enjoy live music";
      const entities = [];

      // Act
      const result = generator.enhanceDescription(baseDescription, entities);

      // Assert
      expect(result).toBe(baseDescription);
    });
  });

  describe('getAvailableInterests', () => {
    test('should return list of supported interests', () => {
      // Act
      const interests = generator.getAvailableInterests();

      // Assert
      expect(interests).toContain('music');
      expect(interests).toContain('food');
      expect(interests).toContain('travel');
      expect(interests).toContain('wellness');
      expect(interests).toContain('adventure');
      expect(interests).toContain('history');
    });
  });

  describe('getTemplatesForInterest', () => {
    test('should return templates for valid interest', () => {
      // Act
      const templates = generator.getTemplatesForInterest('music');

      // Assert
      expect(templates).toHaveLength(3);
      expect(templates[0]).toHaveProperty('title');
      expect(templates[0]).toHaveProperty('description');
      expect(templates[0]).toHaveProperty('emoji');
    });

    test('should return empty array for unknown interest', () => {
      // Act
      const templates = generator.getTemplatesForInterest('unknown');

      // Assert
      expect(templates).toHaveLength(0);
    });
  });
}); 