/**
 * Indicateurs descriptifs calculés sur les points horaires renvoyés par CoinGecko.
 * Le RSI est une approximation simple sur 14 variations, pas le RSI journalier standard.
 */
export function calculateIndicators(asset) {
  const prices = (asset.history_prices || []).filter((value) => Number.isFinite(value) && value > 0);
  const rawCurrent = asset?.current_price;
  const current = Number.isFinite(rawCurrent) && rawCurrent > 0 ? rawCurrent : null;
  const change24h = Number.isFinite(asset.price_change_percentage_24h) ? Number(asset.price_change_percentage_24h) : null;
  const last24 = prices.slice(-24);
  const sma24 = last24.length === 24 ? last24.reduce((sum, value) => sum + value, 0) / last24.length : null;

  const changes = [];
  for (let i = Math.max(1, prices.length - 14); i < prices.length; i += 1) changes.push(prices[i] - prices[i - 1]);
  let rsi14 = null;
  if (changes.length === 14) {
    const avgGain = changes.reduce((sum, value) => sum + Math.max(value, 0), 0) / 14;
    const avgLoss = changes.reduce((sum, value) => sum + Math.max(-value, 0), 0) / 14;
    rsi14 = avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : 100 - (100 / (1 + avgGain / avgLoss));
  }

  const hourlyReturns = [];
  for (let i = Math.max(1, prices.length - 24); i < prices.length; i += 1) {
    hourlyReturns.push((prices[i] - prices[i - 1]) / prices[i - 1] * 100);
  }
  const meanReturn = hourlyReturns.length ? hourlyReturns.reduce((sum, value) => sum + value, 0) / hourlyReturns.length : 0;
  const hourlyVolatility = hourlyReturns.length > 1
    ? Math.sqrt(hourlyReturns.reduce((sum, value) => sum + ((value - meanReturn) ** 2), 0) / (hourlyReturns.length - 1))
    : null;
  const change7d = prices.length > 1 && current !== null ? ((current - prices[0]) / prices[0]) * 100 : null;
  const aboveAverage = sma24 !== null && current > sma24;
  const trend = change24h === null || sma24 === null ? "MIXTE" : aboveAverage && change24h > 0 ? "HAUSSIÈRE" : !aboveAverage && change24h < 0 ? "BAISSIÈRE" : "MIXTE";

  return {
    id: asset.id,
    symbol: String(asset.symbol || "").toUpperCase(),
    name: asset.name,
    currentPrice: current,
    dataQuality: prices.length >= 24 && current !== null ? "SUFFISANTE" : "LIMITÉE",
    change24h,
    change7d,
    sma24,
    aboveSma24: sma24 === null ? null : aboveAverage,
    rsi14,
    hourlyVolatility,
    trend,
    sampleCount: prices.length
  };
}
