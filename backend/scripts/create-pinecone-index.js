require('dotenv').config({ path: '../.env' });
const { Pinecone } = require('@pinecone-database/pinecone');

async function createPineconeIndex() {
    console.log('🚀 Creating Pinecone index...');
    
    try {
        // Initialize Pinecone
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
            environment: process.env.PINECONE_ENVIRONMENT
        });
        
        console.log('✅ Pinecone initialized');
        console.log(`Environment: ${process.env.PINECONE_ENVIRONMENT}`);
        
        const indexName = process.env.PINECONE_INDEX_NAME || 'cruise-events';
        
        // Check if index already exists
        const existingIndexes = await pinecone.listIndexes();
        const indexExists = existingIndexes.some(index => index.name === indexName);
        
        if (indexExists) {
            console.log(`✅ Index '${indexName}' already exists`);
            return;
        }
        
        console.log(`📝 Creating index '${indexName}'...`);
        
        // Create index with proper configuration
        await pinecone.createIndex({
            name: indexName,
            dimension: 1536, // OpenAI embedding dimension
            metric: 'cosine'
        });
        
        console.log(`🎉 Index '${indexName}' created successfully!`);
        console.log('⏳ Waiting for index to be ready...');
        
        // Wait for index to be ready
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
            try {
                const index = pinecone.index(indexName);
                await index.describeIndexStats();
                console.log('✅ Index is ready for use!');
                break;
            } catch (error) {
                attempts++;
                console.log(`⏳ Waiting... (${attempts}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        if (attempts >= maxAttempts) {
            console.log('⚠️ Index creation may still be in progress. Please check Pinecone console.');
        }
        
    } catch (error) {
        console.error('❌ Error creating Pinecone index:', error.message);
        if (error.message.includes('already exists')) {
            console.log('✅ Index already exists, continuing...');
        } else {
            process.exit(1);
        }
    }
}

createPineconeIndex(); 