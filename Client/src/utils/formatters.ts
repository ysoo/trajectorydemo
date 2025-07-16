export const formatPrice = (price: number): string => {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const formatChange = (change: number): string => {
  const prefix = change >= 0 ? '+' : '';
  return `${prefix}${change.toFixed(2)}`;
};

export const formatPercentage = (percent: number): string => {
  const prefix = percent >= 0 ? '+' : '';
  return `${prefix}${percent.toFixed(2)}%`;
};

export const formatTime = (): string => {
  return new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const formatVolume = (volume: string): string => {
  return volume;
};