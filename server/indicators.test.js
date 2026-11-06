import test from "node:test";
import assert from "node:assert/strict";
import { calculateIndicators } from "./indicators.js";

const asset = (prices, current, change24h = 0.5) => ({
  id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: current,
  price_change_percentage_24h: change24h, history_prices: prices
});

test("calculates SMA, RSI and a descriptive upward trend with sufficient rising data", () => {
  const prices = Array.from({ length: 168 }, (_, index) => 100 + index);
  const result = calculateIndicators(asset(prices, 270, 2));
  assert.equal(result.sma24, 255.5);
  assert.equal(result.rsi14, 100);
  assert.equal(result.aboveSma24, true);
  assert.equal(result.trend, "HAUSSIÈRE");
  assert.equal(result.sampleCount, 168);
});

test("does not invent indicators when historical data is missing", () => {
  const result = calculateIndicators(asset([], 100, null));
  assert.equal(result.sma24, null);
  assert.equal(result.rsi14, null);
  assert.equal(result.change7d, null);
  assert.equal(result.hourlyVolatility, null);
  assert.equal(result.trend, "MIXTE");
});

test("does not label a trend when the moving-average sample is incomplete", () => {
  const result = calculateIndicators(asset([10, 9, 8, 7], 6, -5));
  assert.equal(result.sma24, null);
  assert.equal(result.trend, "MIXTE");
});

test("calculates a declining RSI and non-zero recent volatility", () => {
  const prices = Array.from({ length: 40 }, (_, index) => 200 - index * 2 + (index % 3));
  const result = calculateIndicators(asset(prices, 120, -2));
  assert.ok(result.rsi14 < 50);
  assert.ok(result.hourlyVolatility > 0);
  assert.equal(result.trend, "BAISSIÈRE");
});


test("treats null, zero and invalid current prices as unavailable", () => {
  for (const current of [null, 0, undefined, NaN, "not-a-price"]) {
    const result = calculateIndicators(asset([10, 11, 12], current, null));
    assert.equal(result.currentPrice, null);
    assert.equal(result.change7d, null);
    assert.equal(result.dataQuality, "LIMITÉE");
  }
});

test("marks short history as limited and keeps unavailable metrics null", () => {
  const result = calculateIndicators(asset([100, 101, 99], 102));
  assert.equal(result.dataQuality, "LIMITÉE");
  assert.equal(result.sma24, null);
  assert.equal(result.rsi14, null);
});

test("marks a complete hourly history as sufficient", () => {
  const prices = Array.from({ length: 168 }, (_, index) => 100 + Math.sin(index / 4));
  const result = calculateIndicators(asset(prices, 100));
  assert.equal(result.dataQuality, "SUFFISANTE");
  assert.ok(result.rsi14 >= 0 && result.rsi14 <= 100);
});
