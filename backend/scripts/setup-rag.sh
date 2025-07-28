#!/bin/bash

echo "🚀 Setting up RAG with Pinecone..."

# Load environment variables
source ../.env

# Check if Pinecone variables are set
if [ -z "$PINECONE_API_KEY" ] || [ -z "$PINECONE_INDEX_NAME" ] || [ -z "$PINECONE_ENVIRONMENT" ]; then
    echo "❌ Missing Pinecone configuration. Please check your .env file."
    exit 1
fi

echo "✅ Pinecone configuration found:"
echo "   Environment: $PINECONE_ENVIRONMENT"
echo "   Index: $PINECONE_INDEX_NAME"

# Run the setup script
node setup-rag.js

echo "🎉 RAG setup complete!" 