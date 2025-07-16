import type { Quote } from "./types.js";

const symbols = ["MSFT", "NVDA", "TSLA", "PLTR", "ARKG"];

/** Generate next random quote using small random walk. */
export function nextQuote(prev?: Quote): Quote {
  const symbol = prev?.symbol ?? symbols[Math.floor(Math.random() * symbols.length)];
  const base = prev?.last ?? 100 + Math.random() * 50;
  const delta = (Math.random() - 0.5) * 0.8; // ±0.4%
  const last = +(base + delta).toFixed(2);
  return {
    symbol,
    last,
    bid: +(last - 0.05).toFixed(2),
    ask: +(last + 0.05).toFixed(2),
    ts: Date.now()
  };
}
