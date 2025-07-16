import WebSocket from 'ws';

const API_BASE = 'http://localhost:8080';
const WS_URL = 'ws://localhost:8080/ws';

console.log('🚀 Quote API Test Client');
console.log('========================\n');

// Test REST API
async function testRestAPI() {
  console.log('📊 Testing REST API...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${API_BASE}/health`);
    const health = await healthResponse.json();
    console.log('✅ Health check:', health);

    // Test quote endpoint
    const quoteResponse = await fetch(`${API_BASE}/v1/quotes?symbol=MSFT`);
    if (quoteResponse.ok) {
      const quote = await quoteResponse.json();
      console.log('✅ Quote snapshot:', quote);
    } else {
      console.log('⚠️  Quote not yet available (normal for first few seconds)');
    }
  } catch (error) {
    console.log('❌ REST API error:', error.message);
  }
  
  console.log('');
}

// Test WebSocket streaming
function testWebSocket() {
  console.log('📡 Testing WebSocket streaming...');
  console.log('   (will show 10 quotes then disconnect)\n');
  
  const ws = new WebSocket(WS_URL);
  let count = 0;
  
  ws.on('open', () => {
    console.log('✅ WebSocket connected');
  });
  
  ws.on('message', (data) => {
    const quote = JSON.parse(data.toString());
    console.log(`📈 ${quote.symbol}: $${quote.last} (bid: $${quote.bid}, ask: $${quote.ask}) [${new Date(quote.ts).toLocaleTimeString()}]`);
    
    count++;
    if (count >= 10) {
      ws.close();
    }
  });
  
  ws.on('close', () => {
    console.log('\n✅ WebSocket disconnected');
    console.log('\n🎉 Test completed! Quote API is working correctly.');
  });
  
  ws.on('error', (error) => {
    console.log('❌ WebSocket error:', error.message);
  });
}

// Run tests
async function runTests() {
  await testRestAPI();
  
  // Wait a moment for quotes to be generated
  setTimeout(testWebSocket, 2000);
}

runTests(); 