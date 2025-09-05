// Test script for Vercel deployment
// Run with: node test-vercel.js

const https = require('https');

// Replace with your actual Vercel URL
const VERCEL_URL = 'https://your-app-name.vercel.app';

// Test health endpoint
async function testHealth() {
  console.log('🏥 Testing Health Check...');
  try {
    const response = await makeRequest(`${VERCEL_URL}/health`);
    console.log('✅ Health Check:', response);
  } catch (error) {
    console.log('❌ Health Check Failed:', error.message);
  }
}

// Test API documentation
async function testApiDocs() {
  console.log('\n📚 Testing API Documentation...');
  try {
    const response = await makeRequest(`${VERCEL_URL}/api`);
    console.log('✅ API Documentation:', response.message);
  } catch (error) {
    console.log('❌ API Documentation Failed:', error.message);
  }
}

// Test user registration
async function testRegister() {
  console.log('\n👤 Testing User Registration...');
  try {
    const response = await makeRequest(`${VERCEL_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Vercel Test User',
        email: `test${Date.now()}@example.com`,
        password: 'TestPass123!'
      })
    });
    console.log('✅ Registration:', response.message);
    return response.data?.tokens?.accessToken;
  } catch (error) {
    console.log('❌ Registration Failed:', error.message);
    return null;
  }
}

// Test user login
async function testLogin() {
  console.log('\n🔐 Testing User Login...');
  try {
    const response = await makeRequest(`${VERCEL_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPass123!'
      })
    });
    console.log('✅ Login:', response.message);
    return response.data?.tokens?.accessToken;
  } catch (error) {
    console.log('❌ Login Failed:', error.message);
    return null;
  }
}

// Test protected route
async function testProtectedRoute(accessToken) {
  if (!accessToken) {
    console.log('\n🚫 Skipping Protected Route Test (no access token)');
    return;
  }
  
  console.log('\n🔒 Testing Protected Route...');
  try {
    const response = await makeRequest(`${VERCEL_URL}/api/user/profile`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Protected Route:', response.message);
  } catch (error) {
    console.log('❌ Protected Route Failed:', error.message);
  }
}

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonData);
          } else {
            reject(new Error(jsonData.error || `HTTP ${res.statusCode}`));
          }
        } catch (error) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Run all tests
async function runTests() {
  console.log('🚀 Testing Vercel Deployment...\n');
  console.log(`📍 Vercel URL: ${VERCEL_URL}\n`);
  
  await testHealth();
  await testApiDocs();
  
  // Test registration and login
  const registerToken = await testRegister();
  const loginToken = await testLogin();
  
  // Test protected route with login token
  await testProtectedRoute(loginToken);
  
  console.log('\n✨ Test completed!');
}

// Update the VERCEL_URL before running
console.log('⚠️  Please update the VERCEL_URL variable with your actual Vercel URL before running this test.');
console.log('📝 Usage: node test-vercel.js\n');

// Uncomment the line below after updating VERCEL_URL
// runTests();
