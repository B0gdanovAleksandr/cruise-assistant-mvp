const fs = require('fs');
const path = require('path');

class MockVectorStore {
    constructor() {
        this.events = [];
        this.loadEvents();
    }

    loadEvents() {
        try {
            const eventsPath = path.join(__dirname, '../mock/events.json');
            this.events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
            console.log(`📊 Loaded ${this.events.length} events for mock vector store`);
        } catch (error) {
            console.error('Error loading events:', error.message);
            this.events = [];
        }
    }

    async search(query, options = {}) {
        const { topK = 5, filter } = options;
        
        // Simple text-based search for testing
        const queryLower = query.toLowerCase();
        const results = this.events
            .filter(event => {
                const text = `${event.title} ${event.description} ${event.tags.join(' ')}`.toLowerCase();
                return text.includes(queryLower);
            })
            .map(event => ({
                id: event.id,
                score: this.calculateScore(event, queryLower),
                metadata: {
                    title: event.title,
                    type: event.type,
                    description: event.description,
                    tags: event.tags,
                    location: event.location,
                    duration: event.duration,
                    price: event.price,
                    experienceAffinity: event.experienceAffinity
                }
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);

        return results;
    }

    calculateScore(event, query) {
        let score = 0;
        const text = `${event.title} ${event.description} ${event.tags.join(' ')}`.toLowerCase();
        
        // Title match gets highest score
        if (event.title.toLowerCase().includes(query)) score += 10;
        
        // Description match
        if (event.description.toLowerCase().includes(query)) score += 5;
        
        // Tag match
        const tagMatches = event.tags.filter(tag => tag.toLowerCase().includes(query)).length;
        score += tagMatches * 3;
        
        // Location match
        if (event.location.toLowerCase().includes(query)) score += 4;
        
        // Experience affinity bonus
        score += event.experienceAffinity * 2;
        
        return score;
    }

    async upsert(vectors) {
        console.log(`📝 Mock upsert: ${vectors.length} vectors`);
        return { upsertedCount: vectors.length };
    }

    async delete(ids) {
        console.log(`🗑️ Mock delete: ${ids.length} vectors`);
        return { deletedCount: ids.length };
    }
}

module.exports = MockVectorStore; 