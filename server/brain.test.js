import test from "node:test";
import assert from "node:assert/strict";
import { detectIntent, buildMarketDigest, buildNexusInstruction } from "./brain.js";

test("routes common requests to useful specialist modes", () => {
  assert.equal(detectIntent("Analyse le RSI de Bitcoin"), "CRYPTO");
  assert.equal(detectIntent("Corrige ce bug JavaScript"), "CODE");
  assert.equal(detectIntent("Compare ces deux solutions"), "COMPARAISON");
  assert.equal(detectIntent("Explique-moi les moyennes mobiles"), "CRYPTO");
  assert.equal(detectIntent("Organise mon projet en étapes"), "PLANIFICATION");
});

test("market digest only uses supplied finite values", () => {
  const digest = buildMarketDigest([
    { symbol: "BTC", currentPrice: 100, change24h: 2 },
    { symbol: "ETH", currentPrice: 50, change24h: -1 },
    { symbol: "BAD", currentPrice: null, change24h: 99 }
  ]);
  assert.match(digest, /1 actif\(s\) en hausse et 1 en baisse sur 24 h, sur 2 actifs/);
  assert.match(digest, /BTC 2\.00%/);
  assert.doesNotMatch(digest, /BAD/);
});

test("instruction declares capability limits and task focus", () => {
  const prompt = buildNexusInstruction({ intent: "CODE", marketContext: "Aucune donnée." });
  assert.match(prompt, /Priorité programmation/);
  assert.match(prompt, /Ne prétends jamais avoir exécuté du code/);
  assert.match(prompt, /N'invente aucun cours/);
});
