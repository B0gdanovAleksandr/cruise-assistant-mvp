require('dotenv').config({ path: '../.env' });
const { Pinecone } = require('@pinecone-database/pinecone');
const fs = require('fs');
const path = require('path');

async function setupRAG() {
    console.log('🚀 Setting up RAG with Pinecone...');
    
    try {
        // Initialize Pinecone
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
            environment: process.env.PINECONE_ENVIRONMENT
        });
        
        console.log('✅ Pinecone initialized');
        
        // Get or create index
        const indexName = process.env.PINECONE_INDEX_NAME || 'cruise-events';
        let index;
        
        try {
            index = pinecone.index(indexName);
            console.log(`✅ Using existing index: ${indexName}`);
        } catch (error) {
            console.log(`❌ Index ${indexName} not found. Please create it in Pinecone console.`);
            return;
        }
        
        // Load test events
        const eventsPath = path.join(__dirname, '../src/mock/events.json');
        const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
        
        console.log(`📊 Found ${events.length} events to index`);
        
        // Prepare vectors for indexing
        const vectors = events.map((event, i) => ({
            id: event.id,
            values: generateMockEmbedding(event), // Mock embedding for now
            metadata: {
                title: event.title,
                type: event.type,
                description: event.description,
                tags: event.tags.join(','),
                location: event.location,
                duration: event.duration,
                price: event.price,
                experienceAffinity: event.experienceAffinity
            }
        }));
        
        // Index vectors in batches
        const batchSize = 100;
        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);
            await index.upsert(batch);
            console.log(`📝 Indexed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(vectors.length/batchSize)}`);
        }
        
        console.log('🎉 RAG setup complete!');
        console.log(`📊 Indexed ${vectors.length} events in Pinecone index: ${indexName}`);
        
    } catch (error) {
        console.error('❌ Error setting up RAG:', error.message);
        process.exit(1);
    }
}

// Generate mock embeddings (in real implementation, use OpenAI embeddings)
function generateMockEmbedding(event) {
    // Create a simple hash-based embedding for testing
    const text = `${event.title} ${event.description} ${event.tags.join(' ')}`.toLowerCase();
    const embedding = new Array(1536).fill(0);
    
    for (let i = 0; i < text.length && i < 1536; i++) {
        embedding[i] = (text.charCodeAt(i) % 100) / 100;
    }
    
    return embedding;
}

setupRAG(); 