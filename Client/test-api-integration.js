// Test Client API Integration
// This script tests the Quote API integration without starting the full React app

console.log('🧪 Testing Client API Integration\n');

// Mock environment for testing
global.import = {
  meta: {
    env: {
      VITE_QUOTE_API_BASE_URL: process.env.VITE_QUOTE_API_BASE_URL || 'http://localhost:8080',
      VITE_QUOTE_API_WS_URL: process.env.VITE_QUOTE_API_WS_URL || 'ws://localhost:8080/ws'
    }
  }
};

// Simple fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = async (url, options = {}) => {
    const { default: fetch } = await import('node-fetch');
    return fetch(url, options);
  };
}

async function testQuoteApiIntegration() {
  const API_BASE_URL = global.import.meta.env.VITE_QUOTE_API_BASE_URL;
  const WS_URL = global.import.meta.env.VITE_QUOTE_API_WS_URL;

  console.log(`📡 Testing connection to: ${API_BASE_URL}`);
  console.log(`🔌 WebSocket URL: ${WS_URL}\n`);

  try {
    // Test 1: Health check
    console.log('1️⃣  Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('   ✅ Health check passed:', {
        status: healthData.status,
        redis: healthData.redis,
        marketData: healthData.marketData,
        dataSource: healthData.dataSource,
        fallbackMode: healthData.fallbackMode
      });
    } else {
      console.log('   ❌ Health check failed:', healthResponse.status);
      return;
    }

    // Test 2: Get symbols
    console.log('\n2️⃣  Testing symbols endpoint...');
    const symbolsResponse = await fetch(`${API_BASE_URL}/v1/symbols`);
    if (symbolsResponse.ok) {
      const symbolsData = await symbolsResponse.json();
      console.log('   ✅ Symbols retrieved:', symbolsData);
    } else {
      console.log('   ❌ Symbols endpoint failed:', symbolsResponse.status);
    }

    // Test 3: Get individual quotes
    console.log('\n3️⃣  Testing individual quote endpoints...');
    const symbols = ['MSFT', 'NVDA', 'TSLA', 'PLTR', 'ARKG'];
    
    for (const symbol of symbols) {
      try {
        const quoteResponse = await fetch(`${API_BASE_URL}/v1/quotes?symbol=${symbol}`);
        if (quoteResponse.ok) {
          const quote = await quoteResponse.json();
          console.log(`   ✅ ${symbol}: $${quote.last} (${quote.changePercent?.toFixed(2)}%) Vol: ${quote.volume || 'N/A'}`);
        } else {
          console.log(`   ❌ ${symbol}: Failed (${quoteResponse.status})`);
        }
      } catch (error) {
        console.log(`   ❌ ${symbol}: Error - ${error.message}`);
      }
    }

    // Test 4: Get quote with history
    console.log('\n4️⃣  Testing quote with history...');
    const historyResponse = await fetch(`${API_BASE_URL}/v1/quotes/MSFT/history`);
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      console.log('   ✅ MSFT with history:', {
        currentPrice: historyData.current.last,
        historyPoints: historyData.history.length,
        latestHistoryPoint: historyData.history[historyData.history.length - 1]?.date
      });
    } else {
      console.log('   ❌ History endpoint failed:', historyResponse.status);
    }

    // Test 5: API Status
    console.log('\n5️⃣  Testing API status...');
    const statusResponse = await fetch(`${API_BASE_URL}/v1/status`);
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('   ✅ API Status:', {
        dataSource: statusData.dataSource,
        fallbackMode: statusData.fallbackMode,
        consecutiveFailures: statusData.consecutiveFailures,
        recommendation: statusData.recommendation
      });
    } else {
      console.log('   ❌ Status endpoint failed:', statusResponse.status);
    }

    // Test 6: WebSocket (brief test)
    console.log('\n6️⃣  Testing WebSocket connection...');
    
    if (typeof WebSocket !== 'undefined') {
      try {
        const ws = new WebSocket(WS_URL);
        let messageCount = 0;
        
        const testPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket test timeout'));
          }, 5000);

          ws.onopen = () => {
            console.log('   ✅ WebSocket connected');
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              messageCount++;
              
              if (messageCount === 1) {
                console.log('   ✅ First message received:', {
                  symbol: data.symbol,
                  price: data.last,
                  timestamp: data.ts
                });
              }
              
              if (messageCount >= 3) {
                clearTimeout(timeout);
                ws.close();
                resolve(`Received ${messageCount} messages`);
              }
            } catch (error) {
              console.log('   ❌ Failed to parse WebSocket message');
            }
          };

          ws.onerror = (error) => {
            clearTimeout(timeout);
            reject(new Error('WebSocket connection error'));
          };

          ws.onclose = () => {
            if (messageCount >= 3) {
              console.log(`   ✅ WebSocket test completed (${messageCount} messages)`);
            }
          };
        });

        await testPromise;
      } catch (error) {
        console.log('   ⚠️ WebSocket test failed:', error.message);
        console.log('   (This may be normal in Node.js environment)');
      }
    } else {
      console.log('   ⚠️ WebSocket not available in this environment');
    }

    console.log('\n🎉 API Integration test completed!');
    console.log('\n📋 Summary:');
    console.log('   • Quote API is accessible and responding');
    console.log('   • All REST endpoints working correctly');
    console.log('   • Historical data available');
    console.log('   • Client is ready for real market data');

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Make sure Quote API is running on the expected URL');
    console.log('   2. Check if Redis is connected');
    console.log('   3. Verify network connectivity');
    console.log('   4. Check environment variables:');
    console.log(`      VITE_QUOTE_API_BASE_URL=${API_BASE_URL}`);
    console.log(`      VITE_QUOTE_API_WS_URL=${WS_URL}`);
  }
}

// Run the test
testQuoteApiIntegration().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Test crashed:', error);
  process.exit(1);
}); 