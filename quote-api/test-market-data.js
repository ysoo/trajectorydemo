import { marketDataProvider } from './dist/marketDataProvider.js';

console.log('🧪 Testing Real Market Data Integration\n');

async function testMarketData() {
  try {
    console.log('📊 Testing quote fetching...');
    
    // Test single quote
    const msftQuote = await marketDataProvider.getQuote('MSFT');
    console.log(`✅ MSFT Quote:`, {
      symbol: msftQuote?.symbol,
      price: msftQuote?.last,
      change: msftQuote?.change,
      changePercent: msftQuote?.changePercent,
      volume: msftQuote?.volume
    });
    
    console.log('\n📈 Testing historical data...');
    
    // Test historical data
    const msftHistory = await marketDataProvider.getHistoricalData('MSFT');
    console.log(`✅ MSFT Historical Data: ${msftHistory.length} points`);
    if (msftHistory.length > 0) {
      console.log('   Latest:', {
        date: msftHistory[msftHistory.length - 1].date,
        close: msftHistory[msftHistory.length - 1].close
      });
    }
    
    console.log('\n🔄 Testing quote with history...');
    
    // Test combined data
    const nvdaData = await marketDataProvider.getQuoteWithHistory('NVDA');
    console.log(`✅ NVDA Combined Data:`, {
      currentPrice: nvdaData?.current.last,
      historyPoints: nvdaData?.history.length
    });
    
    console.log('\n📋 Testing provider status...');
    
    // Test provider status
    const status = marketDataProvider.getStatus();
    console.log('✅ Provider Status:', {
      fallbackMode: status.fallbackMode,
      consecutiveFailures: status.consecutiveFailures,
      cacheSize: status.cacheSize,
      supportedSymbols: status.supportedSymbols
    });
    
    console.log('\n🔍 Testing all symbols...');
    
    // Test all symbols
    const allQuotes = await marketDataProvider.getAllQuotes();
    console.log(`✅ All Quotes: ${allQuotes.length} symbols fetched`);
    allQuotes.forEach(quote => {
      console.log(`   ${quote.symbol}: $${quote.last} (${quote.changePercent?.toFixed(2)}%)`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMarketData().then(() => {
  console.log('\n🎉 Market data test completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
}); 