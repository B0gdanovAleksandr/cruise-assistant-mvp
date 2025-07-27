const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from the correct path
const envPath = path.join(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

async function testApiKey() {
  const apiKey = process.env.QLOO_API_KEY;
  const baseURL = process.env.QLOO_API_URL || 'https://hackathon.api.qloo.com';
  
  console.log('=== API Key Test ===');
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
  console.log('API Key Length:', apiKey ? apiKey.length : 0);
  console.log('Base URL:', baseURL);
  
  if (!apiKey) {
    console.error('No API key found!');
    return;
  }
  
  // Test different auth header formats
  const authFormats = [
    { name: 'X-API-Key', headers: { 'X-API-Key': apiKey } },
    { name: 'Authorization Bearer', headers: { 'Authorization': `Bearer ${apiKey}` } },
    { name: 'api-key', headers: { 'api-key': apiKey } },
    { name: 'All headers', headers: { 
      'X-API-Key': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'api-key': apiKey
    }}
  ];
  
  for (const format of authFormats) {
    console.log(`\n--- Testing ${format.name} ---`);
    
    try {
      const response = await axios.get(`${baseURL}/search?query=test`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...format.headers
        },
        timeout: 5000
      });
      
      console.log('✅ SUCCESS:', response.status, response.statusText);
      console.log('Response data keys:', Object.keys(response.data || {}));
      
    } catch (error) {
      console.log('❌ FAILED:', error.response?.status, error.response?.statusText);
      console.log('Error message:', error.message);
      
      if (error.response?.data) {
        console.log('Error data:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

testApiKey().catch(console.error); 