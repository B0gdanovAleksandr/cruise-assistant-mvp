require('dotenv').config({ path: '../.env' });
const { Pinecone } = require('@pinecone-database/pinecone');

async function checkPinecone() {
    console.log('🔍 Checking Pinecone configuration...');
    
    try {
        // Test different environments
        const environments = [
            'gcp-starter',
            'us-west1-gcp', 
            'us-east1-gcp',
            'us-central1-gcp',
            'us-east-1-aws',
            'us-west-2-aws',
            'eu-west-1-aws'
        ];
        
        console.log('📋 Testing different environments:');
        
        for (const env of environments) {
            try {
                console.log(`\n🔧 Testing environment: ${env}`);
                
                const pinecone = new Pinecone({
                    apiKey: process.env.PINECONE_API_KEY,
                    environment: env
                });
                
                // Try to list indexes
                const indexes = await pinecone.listIndexes();
                console.log(`✅ ${env} - SUCCESS!`);
                console.log(`   Available indexes: ${indexes.map(i => i.name).join(', ') || 'None'}`);
                
                // If we found a working environment, save it
                if (env !== process.env.PINECONE_ENVIRONMENT) {
                    console.log(`💡 Found working environment: ${env}`);
                    console.log(`   Current environment: ${process.env.PINECONE_ENVIRONMENT}`);
                    console.log(`   Consider updating PINECONE_ENVIRONMENT to: ${env}`);
                }
                
                return env; // Found working environment
                
            } catch (error) {
                console.log(`❌ ${env} - FAILED: ${error.message}`);
            }
        }
        
        console.log('\n❌ No working environment found');
        return null;
        
    } catch (error) {
        console.error('❌ Error checking Pinecone:', error.message);
        return null;
    }
}

async function createIndexIfNeeded(environment) {
    if (!environment) {
        console.log('❌ No working environment found, cannot create index');
        return false;
    }
    
    try {
        console.log(`\n🚀 Creating index in environment: ${environment}`);
        
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
            environment: environment
        });
        
        const indexName = process.env.PINECONE_INDEX_NAME || 'cruise-events';
        
        // Check if index already exists
        const existingIndexes = await pinecone.listIndexes();
        const indexExists = existingIndexes.some(index => index.name === indexName);
        
        if (indexExists) {
            console.log(`✅ Index '${indexName}' already exists`);
            return true;
        }
        
        console.log(`📝 Creating index '${indexName}'...`);
        
        // Create index
        await pinecone.createIndex({
            name: indexName,
            dimension: 1536,
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
                return true;
            } catch (error) {
                attempts++;
                console.log(`⏳ Waiting... (${attempts}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.log('⚠️ Index creation may still be in progress');
        return false;
        
    } catch (error) {
        console.error('❌ Error creating index:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Pinecone Configuration Checker\n');
    
    // Check current configuration
    console.log('📋 Current configuration:');
    console.log(`   API Key: ${process.env.PINECONE_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`   Environment: ${process.env.PINECONE_ENVIRONMENT || '❌ Not set'}`);
    console.log(`   Index Name: ${process.env.PINECONE_INDEX_NAME || 'cruise-events (default)'}`);
    
    // Find working environment
    const workingEnv = await checkPinecone();
    
    if (workingEnv) {
        // Try to create index
        const indexCreated = await createIndexIfNeeded(workingEnv);
        
        if (indexCreated) {
            console.log('\n🎉 Pinecone is ready for use!');
            console.log(`   Environment: ${workingEnv}`);
            console.log(`   Index: ${process.env.PINECONE_INDEX_NAME || 'cruise-events'}`);
        }
    } else {
        console.log('\n❌ Pinecone configuration failed');
        console.log('💡 Please check your API key and try different environments');
    }
}

main(); 