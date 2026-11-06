import express from "express";
import dotenv from "dotenv";
import { calculateIndicators } from "./indicators.js";
import { detectIntent, buildMarketDigest, buildNexusInstruction } from "./brain.js";
import { registerMembershipRoutes, consumeAiQuota } from "./membership.js";

dotenv.config();
const app = express();
app.use(express.json({ limit: "1mb", verify: (req, _res, buffer) => { req.rawBody = Buffer.from(buffer); } }));
registerMembershipRoutes(app);

const ASSETS = [
  { id: "bitcoin", symbol: "btc", name: "Bitcoin", binance: "BTCUSDT" },
  { id: "ethereum", symbol: "eth", name: "Ethereum", binance: "ETHUSDT" },
  { id: "solana", symbol: "sol", name: "Solana", binance: "SOLUSDT" },
  { id: "ripple", symbol: "xrp", name: "XRP", coincap: "xrp", binance: "XRPUSDT" },
  { id: "dogecoin", symbol: "doge", name: "Dogecoin", binance: "DOGEUSDT" },
  { id: "binancecoin", symbol: "bnb", name: "BNB", coincap: "binance-coin", binance: "BNBUSDT" },
  { id: "cardano", symbol: "ada", name: "Cardano", binance: "ADAUSDT" },
  { id: "avalanche-2", symbol: "avax", name: "Avalanche", coincap: "avalanche", binance: "AVAXUSDT" },
  { id: "chainlink", symbol: "link", name: "Chainlink", binance: "LINKUSDT" },
  { id: "tron", symbol: "trx", name: "TRON", binance: "TRXUSDT" }
];
const EXTRA_BINANCE_ASSETS = [
  ["sui","sui","Sui"],["the-open-network","ton","Toncoin"],["stellar","xlm","Stellar"],["hedera-hashgraph","hbar","Hedera"],["shiba-inu","shib","Shiba Inu"],["polkadot","dot","Polkadot"],["litecoin","ltc","Litecoin"],["bitcoin-cash","bch","Bitcoin Cash"],["uniswap","uni","Uniswap"],["near","near","NEAR Protocol"],["aptos","apt","Aptos"],["arbitrum","arb","Arbitrum"],["optimism","op","Optimism"],["internet-computer","icp","Internet Computer"],["ethereum-classic","etc","Ethereum Classic"],["filecoin","fil","Filecoin"],["cosmos","atom","Cosmos"],["aave","aave","Aave"],["maker","mkr","Maker"],["render-token","render","Render"],["injective-protocol","inj","Injective"],["sei-network","sei","Sei"],["celestia","tia","Celestia"],["ondo-finance","ondo","Ondo"],["mantle","mnt","Mantle"],["ethena","ena","Ethena"],["jupiter-exchange-solana","jup","Jupiter"],["bonk","bonk","Bonk"],["pepe","pepe","Pepe"],["floki","floki","FLOKI"],["fetch-ai","fet","Artificial Superintelligence Alliance"],["the-graph","grt","The Graph"],["algorand","algo","Algorand"],["vechain","vet","VeChain"],["quant-network","qnt","Quant"],["theta-token","theta","Theta Network"],["neo","neo","NEO"],["tezos","xtz","Tezos"],["eos","eos","EOS"],["iota","iota","IOTA"],["zcash","zec","Zcash"],["dash","dash","Dash"],["compound-governance-token","comp","Compound"],["curve-dao-token","crv","Curve DAO"],["synthetix-network-token","snx","Synthetix"],["pancakeswap-token","cake","PancakeSwap"],["lido-dao","ldo","Lido DAO"],["immutable-x","imx","Immutable"],["gala","gala","Gala"],["sandbox","sand","The Sandbox"],["decentraland","mana","Decentraland"],["axie-infinity","axs","Axie Infinity"],["enjincoin","enj","Enjin Coin"],["basic-attention-token","bat","Basic Attention Token"],["chiliz","chz","Chiliz"],["1inch","1inch","1inch"],["yearn-finance","yfi","yearn.finance"],["kusama","ksm","Kusama"],["elrond-erd-2","egld","MultiversX"],["mina-protocol","mina","Mina"],["stacks","stx","Stacks"],["kaspa","kas","Kaspa"],["thorchain","rune","THORChain"],["pax-gold","paxg","PAX Gold"],["wrapped-bitcoin","wbtc","Wrapped Bitcoin"],["wrapped-eeth","weeth","Wrapped eETH"],["first-digital-usd","fdusd","First Digital USD"],["true-usd","tusd","TrueUSD"],["paypal-usd","pyusd","PayPal USD"]
].filter(([id]) => id.trim());
const BINANCE_ASSET_MAP = new Map([...ASSETS, ...EXTRA_BINANCE_ASSETS.map(([id,symbol,name]) => ({id,symbol,name,binance:`${symbol.toUpperCase()}USDT`}))].map(asset => [asset.binance, asset]));
const CACHE_MS = 55_000;
const HISTORY_CACHE_MS = 5 * 60_000;
let marketCache = { at: 0, historyAt: 0, assets: [], history: {}, source: null, historySource: null, historyAttemptAt: 0, warnings: [] };
let coinGeckoBlockedUntil = 0;
let lastProviderError = null;
const chatRequests = new Map();

async function getJson(url, timeout = 10_000) {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "NEXUS-AI/1.1" },
    signal: AbortSignal.timeout(timeout)
  });
  let payload;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok) {
    const error = new Error(payload?.status?.error_message || payload?.error?.message || payload?.message || `Fournisseur indisponible (HTTP ${response.status}).`);
    error.status = response.status;
    if (response.status === 429) error.rateLimited = true;
    throw error;
  }
  return payload;
}

function normalizeAsset(asset, price, change, history = []) {
  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) return null;
  const parsedChange = change == null || change === "" ? null : Number(change);
  return {
    id: asset.id, symbol: asset.symbol, name: asset.name,
    ...(asset.binance ? { binance: asset.binance } : {}),
    current_price: parsedPrice,
    price_change_percentage_24h: Number.isFinite(parsedChange) ? parsedChange : null,
    history_prices: Array.isArray(history) ? history.filter((n) => Number.isFinite(n) && n > 0) : []
  };
}

async function fetchCoinGecko() {
  if (Date.now() < coinGeckoBlockedUntil) throw new Error("CoinGecko temporairement mis en pause après une limitation de débit.");
  // Quatre pages de 250 actifs : jusqu'à 1 000 cryptos classées par capitalisation.
  const pages = await Promise.all([1, 2, 3, 4].map((page) => getJson(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&sparkline=true&price_change_percentage=24h`, 15_000
  )));
  const data = pages.flat();
  if (!data.length) throw new Error("CoinGecko n'a renvoyé aucun actif.");
  const assets = data.filter((coin) => Number.isFinite(coin.current_price)).map((coin) => normalizeAsset(
    { id: coin.id, symbol: coin.symbol, name: coin.name }, coin.current_price, coin.price_change_percentage_24h,
    Array.isArray(coin.sparkline_in_7d?.price) ? coin.sparkline_in_7d.price.map(Number) : []
  )).filter(Boolean);
  return { assets, source: `CoinGecko · ${assets.length} cryptos`, warnings: [] };
}

async function fetchCoinCap() {
  const payload = await getJson("https://api.coincap.io/v2/assets?limit=500", 15_000);
  if (!Array.isArray(payload?.data) || !payload.data.length) throw new Error("CoinCap n'a renvoyé aucun actif.");
  const assets = payload.data.map((coin) => normalizeAsset(
    { id: coin.id, symbol: coin.symbol, name: coin.name }, Number(coin.priceUsd), Number(coin.changePercent24Hr)
  )).filter(Boolean);
  if (!assets.length) throw new Error("Aucun actif CoinCap exploitable.");
  return { assets, source: "CoinCap · top 500", warnings: ["Cours fournis par CoinCap en secours ; certains indicateurs historiques peuvent être incomplets."] };
}

async function fetchBinance() {
  // Le flux global permet un vrai catalogue de secours, au lieu des 10 actifs historiques.
  let rows, baseUsed = "api.binance.com";
  try { rows = await getJson("https://api.binance.com/api/v3/ticker/24hr", 15_000); }
  catch (firstError) {
    baseUsed = "data-api.binance.vision";
    rows = await getJson("https://data-api.binance.vision/api/v3/ticker/24hr", 15_000);
  }
  if (!Array.isArray(rows)) throw new Error("Binance n'a renvoyé aucun cours exploitable.");
  const assets = rows.filter(row => row.symbol?.endsWith("USDT") && BINANCE_ASSET_MAP.has(row.symbol)).map(row => {
    const asset = BINANCE_ASSET_MAP.get(row.symbol);
    return normalizeAsset(asset, Number(row.lastPrice), Number(row.priceChangePercent));
  }).filter(Boolean);
  if (!assets.length) throw new Error("Aucun cours Binance exploitable pour le catalogue connu.");
  return { assets, source: `Binance (${baseUsed}) · ${assets.length} cryptos`, warnings: ["Cours spot USDT convertis en référence USD approximative ; l'écart USDT/USD peut exister. Le catalogue de secours couvre les principales paires disponibles."] };
}

async function fetchHistory(source, assets) {
  const history = {};
  if (source === "CoinGecko") {
    const results = await Promise.allSettled(assets.map(async (asset) => {
      const response = await getJson(`https://api.coingecko.com/api/v3/coins/${asset.id}/market_chart?vs_currency=usd&days=7`, 12_000);
      if (!Array.isArray(response?.prices)) throw new Error(`Historique indisponible pour ${asset.symbol}`);
      return [asset.id, response.prices.map((point) => Number(point?.[1])).filter((price) => Number.isFinite(price) && price > 0)];
    }));
    for (const result of results) {
      if (result.status === "fulfilled" && result.value[1].length > 1) history[result.value[0]] = result.value[1];
      else if (result.status === "rejected" && result.reason?.rateLimited) coinGeckoBlockedUntil = Date.now() + 5 * 60_000;
    }
  } else if (source === "CoinCap") {
    const results = await Promise.allSettled(assets.map(async (asset) => {
      const capId = ASSETS.find((item) => item.id === asset.id)?.coincap || asset.id;
      const payload = await getJson(`https://api.coincap.io/v2/assets/${capId}/history?interval=h1`, 12_000);
      if (!Array.isArray(payload?.data)) throw new Error(`Historique indisponible pour ${asset.symbol}`);
      return [asset.id, payload.data.slice(-168).map((point) => Number(point.priceUsd)).filter((price) => Number.isFinite(price) && price > 0)];
    }));
    for (const result of results) if (result.status === "fulfilled" && result.value[1].length > 1) history[result.value[0]] = result.value[1];
  } else {
    // Binance public klines: 168 hourly closes per tracked asset, without an API key.
    const results = await Promise.allSettled(assets.map(async (asset) => {
      const symbol = asset.binance || ASSETS.find((item) => item.id === asset.id)?.binance;
      if (!symbol) throw new Error("Paire inconnue");
      const payload = await getJson(`https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=1h&limit=168`, 12_000);
      if (!Array.isArray(payload)) throw new Error(`Historique indisponible pour ${asset.symbol}`);
      return [asset.id, payload.map((candle) => Number(candle?.[4])).filter((price) => Number.isFinite(price) && price > 0)];
    }));
    for (const result of results) if (result.status === "fulfilled" && result.value[1].length > 1) history[result.value[0]] = result.value[1];
  }
  return history;
}

function cachedResult(stale = false) {
  return {
    assets: marketCache.assets.map((asset) => ({ ...asset, history_prices: marketCache.history[asset.id] || asset.history_prices || [] })),
    source: marketCache.source, cached: true, stale, warnings: marketCache.warnings || []
  };
}

async function refreshMarkets(force = false) {
  if (!force && marketCache.assets.length && Date.now() - marketCache.at < CACHE_MS) return cachedResult(false);
  const providerErrors = [];
  let quote;
  const providers = [fetchCoinGecko, fetchCoinCap, fetchBinance];
  for (const provider of providers) {
    try {
      quote = await provider();
      break;
    } catch (error) {
      providerErrors.push(error.message);
      if (error.rateLimited || error.status === 429) coinGeckoBlockedUntil = Date.now() + 5 * 60_000;
    }
  }
  if (!quote) {
    lastProviderError = providerErrors.join(" | ") || "Aucun fournisseur de marché n'est disponible.";
    if (marketCache.assets.length) return { ...cachedResult(true), warnings: [lastProviderError] };
    const error = new Error(`Impossible de récupérer les cours auprès des fournisseurs disponibles. ${lastProviderError}`);
    error.status = 502;
    throw error;
  }

  let history = marketCache.history || {};
  let historyAt = marketCache.historyAt || 0;
  let historyAttemptAt = marketCache.historyAttemptAt || 0;
  let historyWarnings = [];
  let historySource = marketCache.historySource || null;

  // CoinGecko fournit directement une courbe 7 jours dans chaque ligne de marché.
  // On l'utilise pour TOUS les actifs (jusqu'à 1 000), sans lancer 1 000 appels séparés.
  if (quote.source.startsWith("CoinGecko")) {
    history = Object.fromEntries(quote.assets
      .filter(asset => Array.isArray(asset.history_prices) && asset.history_prices.length > 1)
      .map(asset => [asset.id, asset.history_prices]));
    historyAt = Date.now();
    historyAttemptAt = historyAt;
    historySource = "CoinGecko · graphiques 7 jours";
  } else if ((Date.now() - historyAt >= HISTORY_CACHE_MS || Object.keys(history).length === 0) && Date.now() - historyAttemptAt >= HISTORY_CACHE_MS) {
    // Les fournisseurs de secours ne proposent pas tous une mini-courbe dans leur catalogue.
    // On conserve alors le chargement limité et le graphique détaillé reste chargé à la demande.
    historyAttemptAt = Date.now();
    const historyProviders = [...new Set([quote.source, "Binance", "CoinCap", "CoinGecko"])];
    let historyReceived = false;
    for (const provider of historyProviders) {
      if (provider === "CoinGecko" && Date.now() < coinGeckoBlockedUntil) continue;
      try {
        const received = await fetchHistory(provider, quote.assets.slice(0, 30));
        if (Object.keys(received).length) {
          history = { ...history, ...received };
          historyAt = Date.now();
          historyAttemptAt = historyAt;
          historySource = provider;
          historyReceived = true;
          if (provider !== quote.source) historyWarnings.push(`Historique récupéré auprès du fournisseur de secours ${provider}.`);
          break;
        }
      } catch (error) {
        historyWarnings.push(`${provider} : ${error.message}`);
      }
    }
    if (!historyReceived && !Object.keys(history).length) historyWarnings.push("Historique temporairement indisponible ; les cours instantanés restent utilisables, mais les indicateurs historiques sont limités.");
  }
  const assets = quote.assets.map((asset) => ({ ...asset, history_prices: history[asset.id] || [] }));
  marketCache = {
    at: Date.now(), historyAt, historyAttemptAt, assets: quote.assets, history, source: quote.source, historySource,
    warnings: [...quote.warnings, ...historyWarnings]
  };
  lastProviderError = null;
  return { assets, source: quote.source, cached: false, stale: false, warnings: marketCache.warnings };
}

let marketRefreshInFlight = null;
async function fetchMarkets(force = false) {
  if (marketRefreshInFlight) return marketRefreshInFlight;
  marketRefreshInFlight = refreshMarkets(force);
  try { return await marketRefreshInFlight; }
  finally { marketRefreshInFlight = null; }
}

app.get("/api/status", (_req, res) => {
  res.json({
    online: true,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "COLLE_TA_CLE_ICI"),
    model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
    marketSource: marketCache.source,
    marketAvailable: marketCache.assets.length > 0,
    marketAgeSeconds: marketCache.at ? Math.max(0, Math.floor((Date.now() - marketCache.at) / 1000)) : null,
    historyAvailable: Object.keys(marketCache.history || {}).length > 0,
    historySource: marketCache.historySource,
    historyAgeSeconds: marketCache.historyAt ? Math.max(0, Math.floor((Date.now() - marketCache.historyAt) / 1000)) : null,
    lastProviderError,
    brainModules: ["raisonnement structuré", "routage intelligent", "analyse crypto", "aide au code", "pédagogie", "planification"]
  });
});

const detailedChartCache = new Map();
app.get("/api/chart/:id", async (req, res) => {
  const id = String(req.params.id || "");
  const days = String(req.query.days || "7");
  if (!/^[a-z0-9-]{1,100}$/i.test(id) || !["1", "7", "30", "90", "365"].includes(days)) {
    return res.status(400).json({ error: "Actif ou période invalide." });
  }
  const cacheKey = `${id}:${days}`;
  const cached = detailedChartCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 60_000) return res.json({ ...cached.data, cached: true });
  try {
    if (Date.now() < coinGeckoBlockedUntil) throw new Error("CoinGecko est temporairement limité. Réessaie dans quelques minutes.");
    const payload = await getJson(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`, 15_000);
    if (!Array.isArray(payload?.prices) || payload.prices.length < 2) throw new Error("Historique graphique indisponible pour cette crypto.");
    const data = {
      id, days, source: "CoinGecko", points: payload.prices
        .filter(point => Array.isArray(point) && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1])) && Number(point[1]) > 0)
        .map(point => ({ time: Number(point[0]), price: Number(point[1]) }))
    };
    if (data.points.length < 2) throw new Error("Historique graphique insuffisant.");
    detailedChartCache.set(cacheKey, { at: Date.now(), data });
    if (detailedChartCache.size > 100) detailedChartCache.delete(detailedChartCache.keys().next().value);
    res.json({ ...data, cached: false });
  } catch (error) {
    if (error.rateLimited || error.status === 429) coinGeckoBlockedUntil = Date.now() + 5 * 60_000;
    res.status(error.status || 503).json({ error: error.message || "Impossible de charger ce graphique." });
  }
});

app.get("/api/markets", async (req, res) => {
  try {
    const result = await fetchMarkets(req.query.refresh === "1");
    const analysis = result.assets.map(calculateIndicators);
    res.json({
      assets: result.assets, analysis, source: result.source, cached: result.cached, stale: Boolean(result.stale),
      updatedAt: marketCache.at, historyUpdatedAt: marketCache.historyAt, historySource: marketCache.historySource,
      ageSeconds: Math.max(0, Math.floor((Date.now() - marketCache.at) / 1000)),
      warnings: result.warnings || []
    });
  } catch (error) {
    console.error("Erreur flux marché:", error);
    res.status(error.status || 502).json({ error: error.message || "Impossible de récupérer les cours. Réessaie dans quelques instants." });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const now = Date.now();
    const clientKey = req.ip || "local";
    const recent = (chatRequests.get(clientKey) || []).filter((time) => now - time < 60_000);
    if (recent.length >= 12) return res.status(429).json({ error: "Trop de messages en une minute. Attends un instant avant de réessayer." });
    recent.push(now); chatRequests.set(clientKey, recent);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "COLLE_TA_CLE_ICI") return res.status(503).json({ error: "Le cerveau IA n'est pas encore connecté. Ajoute ta clé Gemini dans le fichier .env." });
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) return res.status(400).json({ error: "Aucun message à envoyer." });
    const contents = messages.slice(-20).filter((message) => message && ["assistant", "user"].includes(message.role) && String(message.content || "").trim()).map((message) => ({
      role: message.role === "assistant" ? "model" : "user", parts: [{ text: String(message.content).slice(0, 6000) }]
    }));
    if (!contents.length) return res.status(400).json({ error: "Le message est vide." });
    const quota = consumeAiQuota(req);
    if (!quota.ok) return res.status(429).json({ error: quota.error });
    let marketContext = "Les données de marché ne sont pas disponibles actuellement. N'invente aucun cours ni indicateur.";
    let marketAnalysisForBrain = [];
    try {
      const market = await fetchMarkets();
      marketAnalysisForBrain = market.assets.map(calculateIndicators);
      marketContext = `DONNÉES DE MARCHÉ (${market.source}, USD, cours récupérés le ${new Date(marketCache.at).toISOString()}, historique mis à jour le ${marketCache.historyAt ? new Date(marketCache.historyAt).toISOString() : "indisponible"})\n` +
        marketAnalysisForBrain.map((item) => `${item.name} (${item.symbol}) : prix ${item.currentPrice}; variation 24h ${item.change24h ?? "indisponible"}%; variation 7j ${item.change7d?.toFixed(2) ?? "indisponible"}%; RSI 14 points horaires ${item.rsi14?.toFixed(1) ?? "indisponible"}; moyenne mobile 24h ${item.sma24?.toFixed(4) ?? "indisponible"}; au-dessus MM24 ${item.aboveSma24 ?? "indisponible"}; volatilité horaire récente ${item.hourlyVolatility?.toFixed(3) ?? "indisponible"}%; tendance ${item.trend}.`).join("\n");
    } catch (error) { console.warn("Contexte marché indisponible pour l'IA:", error.message); }
    const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildNexusInstruction({
          intent: detectIntent(contents.filter((item) => item.role === "user").at(-1)?.parts?.[0]?.text || ""),
          marketContext, marketDigest: buildMarketDigest(marketAnalysisForBrain)
        }) }] },
        contents, generationConfig: { temperature: 0.35, maxOutputTokens: 1800 }
      }), signal: AbortSignal.timeout(30_000)
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "Le service IA a refusé la demande." });
    const answer = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!answer) return res.status(502).json({ error: "L'IA n'a pas renvoyé de réponse. Réessaie." });
    res.json({ answer, model, marketSource: marketCache.source, marketAssets: marketAnalysisForBrain.length, remainingAiToday: quota.remaining });
  } catch (error) {
    console.error("Erreur API:", error);
    res.status(500).json({ error: "Impossible de joindre le moteur IA pour le moment." });
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, "0.0.0.0", () => console.log(`NEXUS AI API disponible sur http://localhost:${port}`));
