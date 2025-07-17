import type { 
  QuoteApiResponse, 
  HistoricalQuoteApiResponse, 
  Stock, 
  PricePoint 
} from '../types/stock';

/**
 * Convert API historical data to chart-friendly format
 */
export function convertHistoricalToChartData(histData: HistoricalQuoteApiResponse[]): PricePoint[] {
  return histData.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }),
    price: item.close,
    timestamp: item.timestamp
  })).sort((a, b) => a.timestamp - b.timestamp); // Ensure chronological order
}

/**
 * Add a new price point to existing history (for real-time updates)
 */
export function addPricePointToHistory(
  currentHistory: PricePoint[] = [], 
  newPrice: number, 
  maxPoints: number = 50
): PricePoint[] {
  const newPoint: PricePoint = {
    time: new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }),
    price: newPrice,
    timestamp: Date.now()
  };

  // Add new point and keep only the latest maxPoints
  return [...currentHistory, newPoint].slice(-maxPoints);
}

/**
 * Format volume numbers to human-readable format
 */
export function formatVolume(volume?: number): string {
  if (!volume || volume === 0) return 'N/A';
  
  if (volume >= 1000000000) {
    return `${(volume / 1000000000).toFixed(1)}B`;
  } else if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  
  return volume.toLocaleString();
}

/**
 * Calculate price change and percentage from open to current
 */
export function calculatePriceChange(current: number, open: number): { change: number; changePercent: number } {
  const change = current - open;
  const changePercent = open > 0 ? (change / open) * 100 : 0;
  
  return {
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100
  };
}

/**
 * Determine if a stock price trend is positive or negative
 */
export function isPriceTrendPositive(stock: Stock): boolean {
  return stock.change >= 0;
}

/**
 * Get the appropriate color class for price change
 */
export function getPriceChangeColor(change: number): string {
  return change >= 0 ? 'text-green-400' : 'text-red-400';
}

/**
 * Get the appropriate border color for stock ticker
 */
export function getStockBorderColor(change: number): string {
  return change >= 0 ? 'border-green-400' : 'border-red-400';
}

/**
 * Check if market data appears to be real or simulated
 */
export function isDataSourceReal(dataSource?: string): boolean {
  return dataSource === 'yahoo-finance' || dataSource === 'api';
}

/**
 * Get data source display name
 */
export function getDataSourceDisplayName(dataSource?: string): string {
  switch (dataSource) {
    case 'yahoo-finance':
      return 'Live Market';
    case 'simulated':
    case 'fallback':
      return 'Simulated';
    case 'websocket':
      return 'Real-time';
    default:
      return 'Unknown';
  }
}

/**
 * Validate that stock data is complete and valid
 */
export function validateStockData(stock: Partial<Stock>): stock is Stock {
  return !!(
    stock.symbol &&
    typeof stock.price === 'number' &&
    typeof stock.change === 'number' &&
    typeof stock.changePercent === 'number' &&
    stock.name &&
    stock.volume !== undefined &&
    stock.marketCap !== undefined
  );
} 