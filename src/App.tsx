import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Activity, ArrowUpRight, BrainCircuit, ChevronDown, CircleHelp,
  Command, Cpu, Layers3, Menu, MessageSquare, Radio, Settings2,
  ShieldCheck, Sparkles, Terminal, X, Zap, Search, Star, RefreshCw, TrendingUp, Upload, Trash2, FileText, Code2, BellRing, UserRound, Crown, LogIn, LogOut
} from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };
type Status = { online: boolean; aiConfigured: boolean; model: string; marketSource?: string | null; marketAvailable?: boolean; marketAgeSeconds?: number | null; historyAvailable?: boolean; historySource?: string | null; historyAgeSeconds?: number | null; lastProviderError?: string | null };
type MarketAsset = { id: string; symbol: string; name: string; current_price: number; price_change_percentage_24h: number | null; history_prices?: number[] };
type PriceAlert = { id: string; assetId: string; direction: "above" | "below"; target: number; triggered: boolean };
type LocalDocument = { name: string; content: string; size: number };
type MarketAnalysis = { id: string; symbol: string; name: string; currentPrice: number | null; dataQuality: "SUFFISANTE" | "LIMITÉE"; change24h: number | null; change7d: number | null; sma24: number | null; aboveSma24: boolean | null; rsi14: number | null; hourlyVolatility: number | null; trend: "HAUSSIÈRE" | "BAISSIÈRE" | "MIXTE"; sampleCount: number };
function formatPrice(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 5 : 2 }).format(value);
}
const logs = [
  ["20:41:08", "CORE", "Analyse des signaux terminée", "ok"],
  ["20:40:52", "RISK", "Exposition simulée dans les limites", "ok"],
  ["20:40:31", "SCAN", "5 actifs ajoutés à la surveillance", "info"],
  ["20:39:47", "NEXUS", "Modèle de tendance actualisé", "pink"],
  ["20:39:12", "SYS", "Tous les modules opérationnels", "ok"]
];
const sparks = ["M2 22 L12 18 L22 20 L32 10 L42 14 L52 6 L62 12 L72 4 L82 8 L92 2", "M2 18 L12 12 L22 16 L32 8 L42 11 L52 5 L62 9 L72 3 L82 7 L92 2", "M2 14 L12 16 L22 8 L32 12 L42 5 L52 9 L62 4 L72 7 L82 2 L92 5"];
function sectionLabel(id: string) { return ({
  "AI CONSOLE": "CHAT IA", "NEURAL MAP": "CERVEAU IA",
  "MARKET SCAN": "MARCHÉS CRYPTO", "RISK ENGINE": "PORTEFEUILLE",
  OVERVIEW: "VUE D’ENSEMBLE", ALERTS: "ALERTES",
  DOCUMENTS: "DOCUMENTS", CODE: "PROGRAMMATION", MEMBERSHIP: "MONÉTISATION"
} as Record<string, string>)[id] || id; }
function readSaved(): Message[] { try { const v = localStorage.getItem("nexus-messages"); return v ? JSON.parse(v) : []; } catch { return []; } }
function Sparkline({ index = 0, positive = true }: { index?: number; positive?: boolean }) { return <svg className={`sparkline ${positive ? "up" : "down"}`} viewBox="0 0 96 28" preserveAspectRatio="none"><path d={sparks[index % sparks.length]} /></svg>; }
function MarketSparkline({ prices, positive }: { prices: number[]; positive: boolean }) {
  if (!prices?.length) return <Sparkline positive={positive}/>;
  const min = Math.min(...prices), max = Math.max(...prices), span = max - min || 1;
  const d = prices.map((price, i) => `${i ? "L" : "M"}${(i / Math.max(1, prices.length - 1) * 96).toFixed(1)} ${(25 - (price - min) / span * 22).toFixed(1)}`).join(" ");
  return <svg className={`sparkline ${positive ? "up" : "down"}`} viewBox="0 0 96 28" preserveAspectRatio="none"><path d={d}/></svg>;
}
function EnergyCore({ aiReady, marketReady, moduleCount }: { aiReady: boolean; marketReady: boolean; moduleCount: number }) {
  return <div className="neural-visual-wrap">
    <div className="energy-stage neural-stage"><div className="energy-grid"/><div className="energy-orbit orbit-a"/><div className="energy-orbit orbit-b"/><div className="energy-orbit orbit-c"/>
      <svg className="neural-links" viewBox="0 0 600 420" aria-hidden="true"><path d="M300 210 L115 95 L70 210 L130 330 L300 210 L485 95 L530 210 L470 330 L300 210 M115 95 L485 95 M70 210 L530 210 M130 330 L470 330"/><path d="M300 210 L300 28 M300 210 L300 392 M115 95 L130 330 M485 95 L470 330"/></svg>
      <div className="energy-core"><div className="core-cloud cloud-a"/><div className="core-cloud cloud-b"/><div className="core-flare"/><div className="core-center"><BrainCircuit size={39}/><small>NEXUS CORE</small></div></div>
      <div className="neural-node n1"><Cpu size={14}/><span>THINK</span><b>{aiReady ? "READY" : "OFF"}</b></div><div className="neural-node n2"><Activity size={14}/><span>MARKET</span><b>{marketReady ? "LIVE" : "WAIT"}</b></div><div className="neural-node n3"><Layers3 size={14}/><span>MEMORY</span><b>LOCAL</b></div><div className="neural-node n4"><ShieldCheck size={14}/><span>GUARD</span><b>LOCAL</b></div>
      <div className="core-tag tag-left">COGNITIVE NETWORK</div><div className="core-tag tag-right">LIVE SYSTEM MAP</div><div className="core-tag tag-bottom">{moduleCount} MODULES TRACKED</div>
    </div>
    <div className="neural-visual-caption"><span><i className="pulse-dot"/> NOYAU EN OBSERVATION</span><span>VISUALISATION DES CONNEXIONS LOGIQUES · PAS UNE MESURE MATÉRIELLE</span></div>
  </div>;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>(readSaved);
  const [input, setInput] = useState(""); const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null); const [menuOpen, setMenuOpen] = useState(false);
  const [market, setMarket] = useState<MarketAsset[]>([]); const [analysis, setAnalysis] = useState<MarketAnalysis[]>([]);
  const [marketError, setMarketError] = useState("");
  const [marketUpdated, setMarketUpdated] = useState("");
  const [historyUpdated, setHistoryUpdated] = useState("");
  const [marketStale, setMarketStale] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [watchQuery, setWatchQuery] = useState("");
  const [watchSort, setWatchSort] = useState<"market-cap" | "gainers" | "losers" | "name">("market-cap");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("nexus-favorites") || "[]"); } catch { return []; }
  });
  const [selectedAsset, setSelectedAsset] = useState("bitcoin");
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [detailRange, setDetailRange] = useState<"1" | "7" | "30" | "90" | "365">("7");
  const [detailPoints, setDetailPoints] = useState<{time:number;price:number}[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [chartRange, setChartRange] = useState<"24H" | "7J">("7J");
  const [active, setActive] = useState("AI CONSOLE"); const [showChat, setShowChat] = useState(true);
  const [infoModal, setInfoModal] = useState<"settings" | "help" | null>(null);
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => { try { return JSON.parse(localStorage.getItem("nexus-alerts") || "[]"); } catch { return []; } });
  const [alertAsset, setAlertAsset] = useState("bitcoin");
  const [alertDirection, setAlertDirection] = useState<"above" | "below">("above");
  const [alertTarget, setAlertTarget] = useState("");
  const [alertNotice, setAlertNotice] = useState("");
  const [documentFile, setDocumentFile] = useState<LocalDocument | null>(null);
  const [documentError, setDocumentError] = useState("");
  const [codeText, setCodeText] = useState("// Écris ou colle ton code ici\nfunction hello() {\n  console.log('Hello NEXUS');\n}\n\nhello();");
  const [codeLanguage, setCodeLanguage] = useState("JavaScript");
  const [member, setMember] = useState<{id:string;email:string;plan:string;planName:string;subscriptionStatus:string;adsEnabled:boolean;dailyAiLimit:number;usageToday:number} | null>(null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("nexus-auth-token") || "");
  const [authMode, setAuthMode] = useState<"login"|"register">("register");
  const [authEmail, setAuthEmail] = useState(""); const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState(""); const [authBusy, setAuthBusy] = useState(false);
  const [partnerConfig, setPartnerConfig] = useState<{partnerName:string;partnerUrl:string;adsEnabled:boolean} | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null); const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { localStorage.setItem("nexus-alerts", JSON.stringify(alerts)); }, [alerts]);
  useEffect(() => {
    if (!market.length || !alerts.some((alert) => !alert.triggered)) return;
    const hits = alerts.filter((alert) => {
      if (alert.triggered) return false;
      const asset = market.find((item) => item.id === alert.assetId);
      return Boolean(asset && (alert.direction === "above" ? asset.current_price >= alert.target : asset.current_price <= alert.target));
    });
    if (!hits.length) return;
    const first = hits[0]; const asset = market.find((item) => item.id === first.assetId);
    if (asset) setAlertNotice(`${asset.symbol.toUpperCase()} a atteint ${formatPrice(asset.current_price)} (seuil ${formatPrice(first.target)}).`);
    setAlerts((current) => current.map((alert) => hits.some((hit) => hit.id === alert.id) ? { ...alert, triggered: true } : alert));
  }, [market, alerts]);
  useEffect(() => { localStorage.setItem("nexus-messages", JSON.stringify(messages)); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => { fetch("/api/status").then(r => r.json()).then(setStatus).catch(() => setStatus(null)); }, []);
  useEffect(() => { fetch("/api/monetization/config").then(r => r.json()).then(setPartnerConfig).catch(() => setPartnerConfig(null)); }, []);
  useEffect(() => { if (!authToken) { setMember(null); return; } fetch("/api/auth/me", { headers: { Authorization: `Bearer ${authToken}` } }).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "Session expirée"); setMember(data.user); }).catch(() => { localStorage.removeItem("nexus-auth-token"); setAuthToken(""); setMember(null); }); }, [authToken]);

  useEffect(() => {
    if (!chartModalOpen) return;
    const timer = window.setInterval(() => setDetailRefresh(value => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, [chartModalOpen]);
  useEffect(() => {
    if (!chartModalOpen || !selectedAsset) return;
    let alive = true;
    setDetailLoading(true); setDetailError("");
    fetch(`/api/chart/${encodeURIComponent(selectedAsset)}?days=${detailRange}`)
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Graphique indisponible."); return data; })
      .then(data => { if (alive) setDetailPoints(data.points || []); })
      .catch(error => { if (alive) { setDetailPoints([]); setDetailError(error instanceof Error ? error.message : "Graphique indisponible."); } })
      .finally(() => { if (alive) setDetailLoading(false); });
    return () => { alive = false; };
  }, [chartModalOpen, selectedAsset, detailRange, detailRefresh]);
  useEffect(() => {
    let alive = true;
    async function loadMarket() {
      if (alive) setRefreshing(true);
      try {
        const response = await fetch("/api/markets?refresh=1");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Flux de marché indisponible.");
        if (alive) {
          setMarket(data.assets || []);
          setAnalysis(data.analysis || []);
          setMarketStale(Boolean(data.stale));
          setMarketUpdated(data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
          setHistoryUpdated(data.historyUpdatedAt ? new Date(data.historyUpdatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—");
          setMarketError(data.stale ? `Fournisseurs indisponibles : affichage du dernier instantané (${data.source || "source inconnue"}).` : (data.warnings || []).join(" "));
          fetch("/api/status").then(r => r.json()).then(setStatus).catch(() => undefined);
        }
      } catch (error) {
        if (alive) {
          setMarketStale(market.length > 0);
          setMarketError(error instanceof Error ? error.message : "Flux indisponible.");
          fetch("/api/status").then(r => r.json()).then(setStatus).catch(() => undefined);
        }
      } finally {
        if (alive) setRefreshing(false);
      }
    }
    void loadMarket();
    const timer = window.setInterval(loadMarket, 60_000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [refreshNonce]);
  const watch = market.map((asset) => ({
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol.toUpperCase(),
    label: `${asset.symbol.toUpperCase()} / USD`,
    price: formatPrice(asset.current_price),
    change: asset.price_change_percentage_24h === null ? "—" : `${asset.price_change_percentage_24h >= 0 ? "+" : ""}${asset.price_change_percentage_24h.toFixed(2)}%`,
    positive: (asset.price_change_percentage_24h ?? 0) >= 0,
    prices: asset.history_prices || []
  }));
  const filteredWatch = watch.filter((item) => {
    const matchesText = `${item.name} ${item.symbol}`.toLowerCase().includes(watchQuery.trim().toLowerCase());
    return matchesText && (!favoritesOnly || favorites.includes(item.id));
  }).sort((a, b) => {
    const changeA = market.find(asset => asset.id === a.id)?.price_change_percentage_24h ?? 0;
    const changeB = market.find(asset => asset.id === b.id)?.price_change_percentage_24h ?? 0;
    if (watchSort === "gainers") return changeB - changeA;
    if (watchSort === "losers") return changeA - changeB;
    if (watchSort === "name") return a.name.localeCompare(b.name, "fr");
    return market.findIndex(asset => asset.id === a.id) - market.findIndex(asset => asset.id === b.id);
  });
  function toggleFavorite(id: string) {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      localStorage.setItem("nexus-favorites", JSON.stringify(next));
      return next;
    });
  }
  const greeting = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const chartAsset = market.find((asset) => asset.id === selectedAsset) || market[0];
  const chartPrices = chartAsset?.history_prices?.filter((price) => Number.isFinite(price) && price > 0) || [];
  const visibleChartPrices = chartRange === "24H" ? chartPrices.slice(-24) : chartPrices;
  const chartMin = visibleChartPrices.length ? Math.min(...visibleChartPrices) : 0;
  const chartMax = visibleChartPrices.length ? Math.max(...visibleChartPrices) : 0;
  const chartPath = visibleChartPrices.map((price, index) => `${index ? "L" : "M"}${(index / Math.max(1, visibleChartPrices.length - 1) * 1000).toFixed(1)} ${(180 - ((price - chartMin) / (chartMax - chartMin || 1)) * 150).toFixed(1)}`).join(" ");
  const selectedAnalysis = analysis.find((item) => item.id === (chartAsset?.id || selectedAsset));
  const validChanges = market.filter((asset) => Number.isFinite(asset.price_change_percentage_24h));
  const risingCount = validChanges.filter((asset) => (asset.price_change_percentage_24h ?? 0) > 0).length;
  const fallingCount = validChanges.filter((asset) => (asset.price_change_percentage_24h ?? 0) < 0).length;
  const strongestAsset = validChanges.reduce<MarketAsset | null>((best, asset) => !best || (asset.price_change_percentage_24h ?? -Infinity) > (best.price_change_percentage_24h ?? -Infinity) ? asset : best, null);
  const weakestAsset = validChanges.reduce<MarketAsset | null>((worst, asset) => !worst || (asset.price_change_percentage_24h ?? Infinity) < (worst.price_change_percentage_24h ?? Infinity) ? asset : worst, null);
  const marketBreadth = risingCount > fallingCount ? "MAJORITÉ EN HAUSSE" : fallingCount > risingCount ? "MAJORITÉ EN BAISSE" : "MARCHÉ PARTAGÉ";
  const validRsi = analysis.map(item => item.rsi14).filter((value): value is number => value !== null && Number.isFinite(value));
  const validVolatility = analysis.map(item => item.hourlyVolatility).filter((value): value is number => value !== null && Number.isFinite(value));
  const avgRsi = validRsi.length ? validRsi.reduce((sum, value) => sum + value, 0) / validRsi.length : null;
  const avgVolatility = validVolatility.length ? validVolatility.reduce((sum, value) => sum + value, 0) / validVolatility.length : null;
  const historyCoverage = market.length ? Math.round(market.filter(asset => (asset.history_prices?.length || 0) >= 24).length / market.length * 100) : 0;
  const bullishCount = analysis.filter(item => item.trend === "HAUSSIÈRE").length;
  const bearishCount = analysis.filter(item => item.trend === "BAISSIÈRE").length;
  const mixedCount = analysis.filter(item => item.trend === "MIXTE").length;
  const activeAlerts = alerts.filter(alert => !alert.triggered).length;
  const neuralModules = [
    { name: "Moteur cognitif Gemini", detail: status?.model || "Modèle non détecté", state: status?.aiConfigured ? "OPÉRATIONNEL" : "CLÉ API MANQUANTE", ready: Boolean(status?.aiConfigured), icon: BrainCircuit },
    { name: "Analyse des marchés", detail: `${market.length} actifs · ${analysis.length} analyses`, state: market.length ? "DONNÉES REÇUES" : "EN ATTENTE", ready: market.length > 0, icon: Activity },
    { name: "Mémoire de session", detail: `${messages.length} messages dans cette conversation`, state: "STOCKAGE LOCAL", ready: true, icon: Layers3 },
    { name: "Surveillance des alertes", detail: `${activeAlerts} seuil(s) en attente · ${alerts.length - activeAlerts} déclenchée(s)`, state: activeAlerts ? "SURVEILLANCE LOCALE" : "AUCUN SEUIL ACTIF", ready: true, icon: BellRing },
    { name: "Atelier documentaire", detail: documentFile ? `${documentFile.name} chargé` : "Aucun document chargé", state: documentFile ? "FICHIER PRÊT" : "EN ATTENTE", ready: Boolean(documentFile), icon: FileText },
    { name: "Atelier de programmation", detail: `${codeText.length.toLocaleString("fr-FR")} caractères dans l’éditeur`, state: "ÉDITEUR DISPONIBLE", ready: true, icon: Code2 }
  ];
  async function sendMessage(text: string) {
    const clean = text.trim(); if (!clean || busy) return;
    const next = [...messages, { role: "user" as const, content: clean }]; setMessages(next); setInput(""); setBusy(true); setShowChat(true);
    try { const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }, body: JSON.stringify({ messages: next }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Erreur inconnue."); setMessages([...next, { role: "assistant", content: data.answer }]); }
    catch (error) { const reason = error instanceof Error ? error.message : "Erreur inconnue"; setMessages([...next, { role: "assistant", content: `Connexion impossible : ${reason}\nVérifie la clé API dans le fichier .env puis redémarre NEXUS.` }]); }
    finally { setBusy(false); inputRef.current?.focus(); }
  }
  async function submitAuth(e: FormEvent) {
    e.preventDefault(); setAuthBusy(true); setAuthError("");
    try { const response = await fetch(`/api/auth/${authMode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authEmail, password: authPassword }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Connexion impossible."); localStorage.setItem("nexus-auth-token", data.token); setAuthToken(data.token); setMember(data.user); setAuthPassword(""); }
    catch (error) { setAuthError(error instanceof Error ? error.message : "Une erreur est survenue."); }
    finally { setAuthBusy(false); }
  }
  function trackPartnerClick() {
    void fetch("/api/monetization/click", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partner: partnerConfig?.partnerName || "default" }) }).catch(() => {});
  }
  function logout() { localStorage.removeItem("nexus-auth-token"); setAuthToken(""); setMember(null); setAuthError(""); }
  function submit(e: FormEvent) { e.preventDefault(); void sendMessage(input); }
  function createAlert(e: FormEvent) {
    e.preventDefault(); const target = Number(alertTarget);
    if (!Number.isFinite(target) || target <= 0) return;
    setAlerts((current) => [{ id: crypto.randomUUID(), assetId: alertAsset, direction: alertDirection, target, triggered: false }, ...current]);
    setAlertTarget(""); setAlertNotice("Alerte enregistrée. Elle sera surveillée tant que NEXUS reste ouvert.");
  }
  async function readDocument(file?: File) {
    setDocumentError(""); setDocumentFile(null); if (!file) return;
    if (file.size > 500_000) { setDocumentError("Fichier trop volumineux : limite de 500 Ko pour cette version."); return; }
    const allowed = /\.(txt|md|csv|json|js|ts|tsx|jsx|html|css|py|log)$/i;
    if (!allowed.test(file.name)) { setDocumentError("Format non pris en charge. Utilise TXT, MD, CSV, JSON, JS, TS, HTML, CSS, PY ou LOG."); return; }
    try { const content = await file.text(); setDocumentFile({ name: file.name, content, size: file.size }); }
    catch { setDocumentError("Impossible de lire ce fichier."); }
  }
  function analyseDocument() {
    if (!documentFile) return;
    nav("AI CONSOLE"); void sendMessage(`Analyse ce document local. Explique son contenu, résume les points importants et signale les erreurs ou zones ambiguës.\n\nFichier : ${documentFile.name}\n\n--- CONTENU ---\n${documentFile.content.slice(0, 18000)}`);
  }
  function askCode(action: "explain" | "debug" | "improve") {
    const instruction = action === "explain" ? "Explique ce code étape par étape, simplement." : action === "debug" ? "Recherche les bugs, explique leur cause et propose une version corrigée." : "Améliore ce code sans changer son objectif. Explique les changements et donne le code complet.";
    nav("AI CONSOLE"); void sendMessage(`${instruction} Langage : ${codeLanguage}.\n\n\`\`\`${codeLanguage.toLowerCase()}\n${codeText.slice(0, 16000)}\n\`\`\``);
  }
  function nav(id: string) {
    setActive(id);
    setShowChat(id === "AI CONSOLE");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return <div className="terminal-shell">
    <aside className={`rail ${menuOpen ? "rail-open" : ""}`}>
      <div className="brand"><div className="brand-symbol"><BrainCircuit size={21}/></div><div><b>NEXUS<span> //</span></b><small>NEURAL TRADING DESK</small></div><button className="rail-close" onClick={() => setMenuOpen(false)}><X size={17}/></button></div>
      <div className="rail-status"><i/> {status?.online ? "SYSTÈME EN LIGNE" : "SERVEUR EN ATTENTE"} <span>V 1.4.0</span></div>
      <div className="rail-label">NAVIGATION</div>
      <nav>{[["AI CONSOLE", <MessageSquare size={16}/>],["NEURAL MAP", <BrainCircuit size={16}/>],["MARKET SCAN", <Activity size={16}/>],["RISK ENGINE", <ShieldCheck size={16}/>],["OVERVIEW", <Layers3 size={16}/>],["ALERTS", <Zap size={16}/>],["DOCUMENTS", <Layers3 size={16}/>],["CODE", <Command size={16}/>],["MEMBERSHIP", <Crown size={16}/>]].map(([name, icon]) => <button key={String(name)} onClick={() => nav(String(name))} className={`rail-link ${active === name ? "selected" : ""}`}>{icon}<span>{sectionLabel(String(name))}</span>{active === name && <i/>}</button>)}</nav>
      <div className="rail-label second-label">SYSTÈME</div><nav><button className="rail-link" onClick={() => setInfoModal("settings")}><Settings2 size={16}/><span>PARAMÈTRES</span></button><button className="rail-link" onClick={() => setInfoModal("help")}><CircleHelp size={16}/><span>AIDE</span></button></nav>
      <div className="rail-bottom"><div className="cpu-card"><div className="cpu-head"><Cpu size={14}/> CHARGE DU CŒUR <b>DÉMO</b></div><div className="cpu-track"><i/></div><div className="cpu-foot"><span>MEM —</span><span>TEMP —</span></div></div><div className="user-mini"><div className="user-glyph">N</div><div><b>UTILISATEUR</b><small>SESSION LOCALE</small></div><ChevronDown size={14}/></div></div>
    </aside>
    {menuOpen && <button className="veil" onClick={() => setMenuOpen(false)}/>}
    <main className="desk" id="top" data-page={active}>
      <header className="desk-top"><div className="top-left"><button className="mobile-toggle" onClick={() => setMenuOpen(true)}><Menu size={18}/></button><span className="crumb">NEXUS <b>/</b> {sectionLabel(active)}</span></div><div className="top-right"><span className="market-state"><i/> {market.length ? "FLUX CRYPTO ACTIF" : "CONNEXION AU MARCHÉ"}</span><span className="top-clock">{greeting} HEURE LOCALE</span><button className="top-icon" onClick={() => setShowChat(!showChat)} title="Ouvrir la console IA"><MessageSquare size={16}/></button><div className="operator-icon">N</div></div></header>
      <div className="dashboard-head"><div><div className="micro-kicker"><span/> INTERFACE DE CONTRÔLE NEXUS <span className="muted">/ SESSION 08-AF3</span></div><h1>{active === "AI CONSOLE" ? "VOTRE ASSISTANT PERSONNEL" : active === "NEURAL MAP" ? "CENTRE NEURAL" : active === "MARKET SCAN" ? "EXPLORATEUR DE MARCHÉ" : active === "RISK ENGINE" ? "ESPACE PORTEFEUILLE" : sectionLabel(active)}</h1><p>Cours crypto réels · Indicateurs expliqués · Actualisation chaque minute</p></div><div className="head-actions"><button className="outline-action" onClick={() => setRefreshNonce((n) => n + 1)} disabled={refreshing}><RefreshCw size={13} className={refreshing ? "spin-icon" : ""}/> {refreshing ? "ACTUALISATION…" : "ACTUALISER"}</button><button className="pink-action" onClick={() => {setShowChat(true);setActive("AI CONSOLE");}}><Sparkles size={14}/> OUVRIR NEXUS IA</button></div></div>
      {active === "MEMBERSHIP" && <section className="membership-page">
        <div className="membership-intro panel"><div><span className="panel-index">NEXUS / MODÈLE GRATUIT</span><h2>TOUT EST GRATUIT</h2><p>Aucun abonnement, aucun paiement obligatoire. Toutes les fonctionnalités sont accessibles gratuitement.</p></div><div className="membership-current"><span>TON ACCÈS</span><b>GRATUIT</b><small>{member ? `${member.usageToday}/${member.dailyAiLimit} messages IA aujourd’hui` : "5 messages IA par jour sans compte"}</small></div></div>
        <div className="membership-plans">
          <article className="membership-plan panel featured"><span className="plan-label">ACCÈS COMPLET</span><h3> NEXUS GRATUIT</h3><div className="plan-price">0 € <small>pour toujours</small></div><p>Les outils NEXUS sans abonnement.</p><ul><li>Cours crypto et graphiques</li><li>Recherche et favoris</li><li>Indicateurs et alertes</li><li>Assistant IA gratuit avec limite raisonnable</li><li>Tous les modules accessibles</li></ul><button className="pink-action" onClick={() => nav("MARKET SCAN")}>UTILISER NEXUS <ArrowUpRight size={14}/></button></article>
        </div>
        <div className="membership-account panel"><div className="panel-heading"><div><span className="panel-index">COMPTE / ACCÈS</span> {member ? "TON COMPTE NEXUS" : "COMPTE GRATUIT"}</div><UserRound size={17}/></div>
          {member ? <div className="membership-signed"><div><b>{member.email}</b><span>Accès gratuit · aucune facturation</span></div><div className="membership-actions"><button className="outline-action" onClick={logout}><LogOut size={14}/> DÉCONNEXION</button></div></div> : <form className="membership-auth" onSubmit={submitAuth}><div className="auth-tabs"><button type="button" className={authMode === "register" ? "active" : ""} onClick={() => {setAuthMode("register");setAuthError("");}}>CRÉER UN COMPTE GRATUIT</button><button type="button" className={authMode === "login" ? "active" : ""} onClick={() => {setAuthMode("login");setAuthError("");}}>SE CONNECTER</button></div><label>ADRESSE E-MAIL<input type="email" required autoComplete="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="toi@exemple.fr"/></label><label>MOT DE PASSE<input type="password" required minLength={authMode === "register" ? 10 : 1} autoComplete={authMode === "register" ? "new-password" : "current-password"} value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder={authMode === "register" ? "10 caractères minimum" : "Ton mot de passe"}/></label><button className="pink-action" disabled={authBusy}>{authBusy ? "EN COURS…" : authMode === "register" ? "CRÉER MON COMPTE GRATUIT" : "SE CONNECTER"} <LogIn size={14}/></button></form>}
        </div>
        <div className="partner-slot panel"><small>PUBLICITÉ / PARTENARIAT</small><b>{partnerConfig?.partnerName || "Partenaires NEXUS"}</b><span>{partnerConfig?.partnerUrl ? "Une offre partenaire peut aider à financer NEXUS. Si tu passes par ce lien, NEXUS peut recevoir une commission, sans coût supplémentaire annoncé pour toi." : "Cet emplacement accueillera des publicités ou des offres partenaires clairement signalées. Il ne génère pas encore de revenu tant qu'aucun partenaire ou réseau publicitaire n'est connecté."}</span>{partnerConfig?.partnerUrl && <a className="outline-action" href={partnerConfig.partnerUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={trackPartnerClick}>DÉCOUVRIR L’OFFRE PARTENAIRE <ArrowUpRight size={14}/></a>}</div>
        <p className="membership-legal">NEXUS est gratuit. Les revenus peuvent provenir de publicités et de commissions d'affiliation sur les liens partenaires ; ils ne sont pas garantis. Les partenariats sont signalés. Les limites quotidiennes de l'assistant IA servent à maîtriser les coûts techniques et se réinitialisent chaque jour. Les contenus crypto sont informatifs et ne constituent pas un conseil en investissement.</p>
      </section>}
      <section className="market-overview panel" aria-label="Synthèse du marché">
        <div className="overview-heading"><span className="panel-index">MARCHÉ / SYNTHÈSE</span><b>{market.length ? marketBreadth : "EN ATTENTE DES DONNÉES"}</b></div>
        <div className="overview-grid">
          <div><small>ACTIFS EN HAUSSE · 24 H</small><strong className="positive">{validChanges.length ? `${risingCount} / ${validChanges.length}` : "—"}</strong></div>
          <div><small>ACTIFS EN BAISSE · 24 H</small><strong className="negative">{validChanges.length ? `${fallingCount} / ${validChanges.length}` : "—"}</strong></div>
          <div><small>MEILLEURE PERFORMANCE</small><strong>{strongestAsset ? `${strongestAsset.symbol.toUpperCase()} ${(strongestAsset.price_change_percentage_24h ?? 0) >= 0 ? "+" : ""}${(strongestAsset.price_change_percentage_24h ?? 0).toFixed(2)}%` : "—"}</strong></div>
          <div><small>PLUS FAIBLE PERFORMANCE</small><strong>{weakestAsset ? `${weakestAsset.symbol.toUpperCase()} ${(weakestAsset.price_change_percentage_24h ?? 0) >= 0 ? "+" : ""}${(weakestAsset.price_change_percentage_24h ?? 0).toFixed(2)}%` : "—"}</strong></div>
        </div>
        <p>Lecture descriptive calculée uniquement sur les actifs reçus. Cette synthèse mesure l'étendue du mouvement sur 24 h, pas la direction future du marché.</p>
      </section>
      <section className="chart-panel panel" id="market-scan">
        <div className="chart-topline"><div><span className="panel-index">00 /</span> GRAPHIQUE DE MARCHÉ <small>· HISTORIQUE FOURNI PAR {status?.marketSource || "SOURCE EN DÉTECTION"}</small></div><div className="chart-controls"><select aria-label="Cryptomonnaie affichée" value={chartAsset?.id || selectedAsset} onChange={(event) => setSelectedAsset(event.target.value)}>{market.map((asset) => <option key={asset.id} value={asset.id}>{asset.symbol.toUpperCase()} / USD</option>)}</select><button className={chartRange === "24H" ? "chart-range active" : "chart-range"} onClick={() => setChartRange("24H")}>24 H</button><button className={chartRange === "7J" ? "chart-range active" : "chart-range"} onClick={() => setChartRange("7J")}>7 J</button></div></div>
        {active === "MARKET SCAN" && <div className="market-search-bar"><label className="market-search-input"><Search size={16}/><input value={watchQuery} onChange={(event) => setWatchQuery(event.target.value)} placeholder="Rechercher une crypto : Bitcoin, BTC, Ethereum…" aria-label="Rechercher une cryptomonnaie par nom ou symbole"/><span>{filteredWatch.length} / {market.length}</span></label>{watchQuery && <button className="market-search-clear" onClick={() => setWatchQuery("")} aria-label="Effacer la recherche">EFFACER <X size={13}/></button>}</div>}
        {chartAsset && visibleChartPrices.length > 1 ? <><div className="chart-summary"><div><b>{chartAsset.symbol.toUpperCase()}</b><strong>{formatPrice(chartAsset.current_price)}</strong></div><span className={(chartAsset.price_change_percentage_24h ?? 0) >= 0 ? "positive" : "negative"}>{chartAsset.price_change_percentage_24h == null ? "Variation 24 h indisponible" : `${chartAsset.price_change_percentage_24h >= 0 ? "+" : ""}${chartAsset.price_change_percentage_24h.toFixed(2)} % sur 24 h`}</span></div><svg className="market-chart" viewBox="0 0 1000 205" preserveAspectRatio="none" role="img" aria-label={`Historique ${chartRange} du ${chartAsset.name}`}><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#ec55b0" stopOpacity=".28"/><stop offset="100%" stopColor="#ec55b0" stopOpacity="0"/></linearGradient></defs><path d={`${chartPath} L1000 200 L0 200 Z`} fill="url(#chartFill)"/><path d={chartPath} fill="none" stroke="#ed69bd" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg><div className="chart-axis"><span>{chartRange === "24H" ? "Il y a environ 24 heures" : "Il y a 7 jours"}</span><span>"Dernier point reçu"</span></div><div className="chart-footnote">{selectedAnalysis ? `RSI 14 : ${selectedAnalysis.rsi14 == null ? "indisponible" : selectedAnalysis.rsi14.toFixed(1)} · MM 24 h : ${selectedAnalysis.sma24 == null ? "indisponible" : formatPrice(selectedAnalysis.sma24)} · Volatilité horaire : ${selectedAnalysis.hourlyVolatility == null ? "indisponible" : `${selectedAnalysis.hourlyVolatility.toFixed(3)} %`}` : "Les indicateurs seront affichés après réception des données."}</div></> : <div className="chart-empty">{marketError || "En attente de l'historique réel du fournisseur actif…"}</div>}
      </section>
      <section className="dashboard-grid">
        <div className="panel central-panel neural-panel" id="neural-map">
          <div className="panel-heading"><div><span className="panel-index">01 /</span> CARTOGRAPHIE DU CERVEAU</div><span className="live-label"><i/> {status?.online ? "SERVEUR EN LIGNE" : "ÉTAT SERVEUR INCONNU"}</span></div>
          <div className="neural-hero"><div className="neural-core-column"><EnergyCore aiReady={Boolean(status?.aiConfigured)} marketReady={market.length > 0} moduleCount={neuralModules.length}/><div className="neural-core-foot"><span>IDENTITÉ : NEXUS AI</span><span>MODE : {status?.aiConfigured ? "IA CONNECTÉE" : "MODE LIMITÉ"}</span><span>BUILD : 1.4.0</span></div></div>
            <div className="neural-side-column"><div className="neural-section-title">ÉTAT DU CERVEAU <small>DIAGNOSTIC EN DIRECT</small></div><div className="neural-health-grid">
              <div className="neural-health-card"><small>IA GÉNÉRATIVE</small><b className={status?.aiConfigured ? "positive" : "negative"}>{status?.aiConfigured ? "CONNECTÉE" : "DÉCONNECTÉE"}</b><span>{status?.model || "Modèle non communiqué"}</span></div>
              <div className="neural-health-card"><small>DONNÉES MARCHÉ</small><b className={market.length ? "positive" : "negative"}>{market.length ? (marketStale ? "CACHE DE SECOURS" : "RÉCEPTION OK") : "INDISPONIBLE"}</b><span>{market.length} actifs · {status?.marketSource || "source en détection"} · {marketStale ? "dernier instantané" : "flux courant"}</span></div>
              <div className="neural-health-card"><small>QUALITÉ HISTORIQUE</small><b>{market.length ? `${historyCoverage}%` : "—"}</b><span>{market.length ? `Actifs avec au moins 24 points · source ${status?.historySource || "—"}` : "En attente des cours"}</span></div>
              <div className="neural-health-card"><small>ACTUALISATION</small><b>{refreshing ? "EN COURS" : marketUpdated || "—"}</b><span>{marketError ? "Attention : données partielles ou secours" : `Dernier relevé · ${status?.marketAgeSeconds ?? 0}s`}</span></div>
            </div>
            <div className="neural-section-title neural-module-title">MODULES ET SOUS-SYSTÈMES <small>{neuralModules.filter(m => m.ready).length}/{neuralModules.length} DISPONIBLES</small></div>
            <div className="neural-module-list">{neuralModules.map((module) => { const Icon = module.icon; return <div className="neural-module-row" key={module.name}><div className="neural-module-icon"><Icon size={15}/></div><div className="neural-module-copy"><b>{module.name}</b><span>{module.detail}</span></div><span className={module.ready ? "module-state ready" : "module-state"}><i/>{module.state}</span></div>; })}</div>
            </div>
          </div>
          <div className="neural-section-title neural-data-title">TÉLÉMÉTRIE ET INTELLIGENCE DE MARCHÉ <small>CALCULS À PARTIR DES DONNÉES REÇUES</small></div>
          <div className="neural-metric-grid">
            <div className="neural-metric"><small>ACTIFS SUIVIS</small><strong>{market.length || "—"}</strong><span>Univers chargé</span></div>
            <div className="neural-metric"><small>HAUSSE / BAISSE</small><strong>{validChanges.length ? `${risingCount} / ${fallingCount}` : "—"}</strong><span>{marketBreadth}</span></div>
            <div className="neural-metric"><small>RSI MOYEN</small><strong>{avgRsi === null ? "—" : avgRsi.toFixed(1)}</strong><span>{validRsi.length} actifs calculables · sur 100</span></div>
            <div className="neural-metric"><small>VOLATILITÉ HORAIRE MOY.</small><strong>{avgVolatility === null ? "—" : `${avgVolatility.toFixed(3)}%`}</strong><span>{validVolatility.length} séries disponibles</span></div>
            <div className="neural-metric"><small>ALERTES ACTIVES</small><strong>{activeAlerts}</strong><span>{alerts.length} au total</span></div>
            <div className="neural-metric"><small>ACTIVITÉ CONVERSATION</small><strong>{messages.length}</strong><span>Messages conservés localement</span></div>
          </div>
          <div className="neural-bottom-grid"><div className="neural-insight-card"><div className="neural-section-title">RÉPARTITION DES TENDANCES <small>{analysis.length} ACTIFS ANALYSÉS</small></div><div className="trend-stack"><span className="trend-up" style={{width:`${analysis.length ? bullishCount / analysis.length * 100 : 0}%`}}/><span className="trend-down" style={{width:`${analysis.length ? bearishCount / analysis.length * 100 : 0}%`}}/><span className="trend-mixed" style={{width:`${analysis.length ? mixedCount / analysis.length * 100 : 0}%`}}/></div><div className="trend-legend"><span><i className="trend-up"/> Hausse <b>{bullishCount}</b></span><span><i className="trend-down"/> Baisse <b>{bearishCount}</b></span><span><i className="trend-mixed"/> Mixte <b>{mixedCount}</b></span></div></div>
            <div className="neural-insight-card"><div className="neural-section-title">DERNIER DIAGNOSTIC <small>LECTURE AUTOMATIQUE</small></div><p>{!market.length ? "Le moteur attend les données du fournisseur de marché pour établir un diagnostic." : marketStale ? "Les données affichées proviennent du cache : prudence, elles peuvent ne plus refléter le marché actuel." : analysis.length === 0 ? "Les cours sont reçus, mais les indicateurs historiques ne sont pas encore disponibles." : `${marketBreadth.toLowerCase()}. ${bullishCount} tendance(s) haussière(s), ${bearishCount} baissière(s) et ${mixedCount} mixte(s) selon les indicateurs calculés.`}</p><small>Ce diagnostic décrit les données observées. Il ne prédit pas les prix et ne constitue pas un conseil financier.</small></div>
          </div>
          {marketError && <div className="neural-warning"><ShieldCheck size={15}/>{marketError}</div>}
        </div>
        {active === "MARKET SCAN" && <div className="panel watch-panel"><div className="panel-heading"><div><span className="panel-index">02 /</span> EXPLORATEUR DE MARCHÉ · TOUTES LES CRYPTOS REÇUES</div><span className="tiny-count">{market.length ? `${market.length} CRYPTOS DISPONIBLES` : "EN ATTENTE"}</span></div><div className="watch-tools"><select className="watch-sort" aria-label="Trier les cryptomonnaies" value={watchSort} onChange={event => setWatchSort(event.target.value as typeof watchSort)}><option value="market-cap">Classement</option><option value="gainers">Plus fortes hausses</option><option value="losers">Plus fortes baisses</option><option value="name">Nom A–Z</option></select><button className={favoritesOnly ? "filter-fav active" : "filter-fav"} onClick={() => setFavoritesOnly(!favoritesOnly)} title="Afficher les favoris"><Star size={13}/><span>FAVORIS</span></button></div><div className="watch-results-count">{filteredWatch.length} résultat{filteredWatch.length > 1 ? "s" : ""} · recherche par nom ou symbole</div><div className="watch-list">{filteredWatch.map((item) => <div className="watch-row" key={item.label}><div className="asset-icon">{item.symbol.slice(0,1)}</div><div className="asset-name"><b>{item.label}</b><small>{item.name.toUpperCase()} · 24 H</small></div><MarketSparkline prices={item.prices} positive={item.positive}/><div className="asset-price"><b>{item.price}</b><small className={item.positive ? "positive" : "negative"}>{item.change}</small></div><button className="chart-open-button" onClick={() => { setSelectedAsset(item.id); setDetailRange("7"); setChartModalOpen(true); }} title={`Ouvrir le graphique de ${item.name}`} aria-label={`Ouvrir le graphique de ${item.name}`}>GRAPHIQUE</button><button className={favorites.includes(item.id) ? "favorite-star active" : "favorite-star"} onClick={() => toggleFavorite(item.id)} aria-label={favorites.includes(item.id) ? `Retirer ${item.name} des favoris` : `Ajouter ${item.name} aux favoris`}><Star size={13} fill={favorites.includes(item.id) ? "currentColor" : "none"}/></button></div>)}{market.length === 0 && <div className="market-empty">{marketError || "Récupération des cours réels…"}</div>}{market.length > 0 && filteredWatch.length === 0 && <div className="market-empty">{favoritesOnly ? "Aucun favori pour le moment. Ajoute-en avec l’étoile." : "Aucun actif ne correspond à ta recherche."}</div>}</div><div className="panel-foot">{marketError ? (marketStale ? "DERNIÈRE DONNÉE EN CACHE" : "ERREUR DU FLUX") : <>SOURCE : {status?.marketSource || "FOURNISSEUR EN DÉTECTION"}</>} <span>{marketUpdated ? `MIS À JOUR ${marketUpdated}` : "EN ATTENTE"}</span></div></div>}
        <div className="panel matrix-panel"><div className="panel-heading"><div><span className="panel-index">03 /</span> ANALYSE DU MARCHÉ</div><span className="tiny-count">CALCULÉ</span></div><div className="analysis-list">{analysis.map((item) => <div className="analysis-row" key={item.id}><div className="analysis-title"><b>{item.symbol}</b><span className={item.trend === "HAUSSIÈRE" ? "positive" : item.trend === "BAISSIÈRE" ? "negative" : "neutral"}>{item.trend}</span></div><div className="analysis-metrics"><span>RSI 14 <b>{item.rsi14 === null ? "—" : item.rsi14.toFixed(0)}</b></span><span>7 J <b className={(item.change7d ?? 0) >= 0 ? "positive" : "negative"}>{item.change7d === null ? "—" : `${item.change7d >= 0 ? "+" : ""}${item.change7d.toFixed(1)}%`}</b></span><span>MM 24H <b>{item.aboveSma24 === null ? "—" : item.aboveSma24 ? "AU-DESSUS" : "EN-DESSOUS"}</b></span></div><div className="analysis-note">{item.dataQuality === "LIMITÉE" ? "Historique incomplet · lecture limitée" : item.rsi14 === null ? "RSI indisponible" : item.rsi14 >= 70 ? "RSI élevé · zone dite de surachat" : item.rsi14 <= 30 ? "RSI bas · zone dite de survente" : "RSI dans une zone intermédiaire"}</div></div>)}{analysis.length === 0 && <div className="market-empty">Les indicateurs apparaîtront avec les données du fournisseur.</div>}</div><div className="analysis-legend">RSI 14 : momentum sur 14 heures (au-dessus de 70 = zone souvent dite de surachat ; sous 30 = survente). MM 24H : moyenne des 24 derniers points horaires. 7 J : évolution sur 7 jours. La volatilité mesure l’amplitude, pas la direction. Ces mesures décrivent le passé et ne prédisent pas le prix. Historique rafraîchi à {historyUpdated}.</div></div>
        <div className="panel risk-panel" id="risk-engine"><div className="panel-heading"><div><span className="panel-index">04 /</span> RISQUE DU PORTEFEUILLE</div><span className="tiny-count">NON CALCULÉ</span></div><div className="gauge-wrap"><svg viewBox="0 0 220 130"><path d="M24 112 A86 86 0 0 1 196 112" fill="none" stroke="#332033" strokeWidth="12" strokeLinecap="round"/><path d="M24 112 A86 86 0 0 1 112 26" fill="none" stroke="#ed3b9d" strokeWidth="12" strokeLinecap="round"/><path d="M110 108 L145 52" stroke="#f7c7eb" strokeWidth="2"/><circle cx="110" cy="108" r="5" fill="#f7c7eb"/></svg><div className="gauge-value"><b>—</b><small>AUCUNE DONNÉE PORTEFEUILLE</small></div></div><div className="risk-details"><span>Exposition</span><b>—</b><span>Limite de perte</span><b>—</b><span>Mode</span><b className="neutral">NON CALCULÉ</b></div></div>
        <div className="panel logs-panel"><div className="panel-heading"><div><span className="panel-index">05 /</span> JOURNAL DU SYSTÈME</div><span className="tiny-count">ÉVÉNEMENTS EXEMPLE</span></div><div className="event-list">{logs.map((log, i) => <div className="event-row" key={i}><time>{log[0]}</time><b className={log[3]}>{log[1]}</b><span>{log[2]}</span><i/></div>)}</div></div>
        <div className={`panel console-panel ${showChat ? "console-expanded" : ""}`} id="ai-console"><div className="panel-heading"><div><span className="panel-index">01 /</span> CHAT NEXUS</div><div className="chat-head-actions"><span className="chat-model">{status?.model || "GEMINI"}</span><button className="console-toggle" onClick={() => { setMessages([]); localStorage.removeItem("nexus-messages"); }}>NOUVEAU CHAT <Sparkles size={12}/></button></div></div>{showChat ? <><div className="chat-messages">{messages.length === 0 && <div className="console-empty"><BrainCircuit size={25}/><b>Assistant NEXUS prêt.</b><span>Pose une question à NEXUS.</span><div className="quick-prompts"><button onClick={() => setInput("Fais une synthèse du marché à partir des données disponibles, avec les limites.")}><TrendingUp size={12}/> SYNTHÈSE MARCHÉ</button><button onClick={() => setInput("Compare BTC, ETH et SOL avec leurs indicateurs réels.")}>COMPARER BTC / ETH / SOL</button><button onClick={() => setInput("Explique-moi le RSI, la moyenne mobile et la volatilité simplement.")}>EXPLIQUER LES INDICATEURS</button><button onClick={() => setInput("Construis deux scénarios conditionnels haussier et baissier sans prédire le prix.")}>SCÉNARIOS DE MARCHÉ</button></div></div>}{messages.map((m, i) => <div className={`console-message ${m.role}`} key={i}><b>{m.role === "user" ? "OPERATOR" : "NEXUS"}</b><p>{m.content}</p></div>)}{busy && <div className="console-message assistant"><b>NEXUS</b><p className="thinking">ANALYSE EN COURS…</p></div>}<div ref={bottomRef}/></div><form className="console-input" onSubmit={submit}><textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {if(e.key === "Enter" && !e.shiftKey){e.preventDefault();void sendMessage(input);}}} rows={1} placeholder="Écris ta question à NEXUS…"/><button disabled={!input.trim() || busy}><ArrowUpRight size={17}/></button></form></> : <button className="console-launch" onClick={() => setShowChat(true)}><span><BrainCircuit size={17}/> DÉMARRER UNE CONVERSATION AVEC NEXUS</span><ArrowUpRight size={16}/></button>}<div className="console-foot"><span><i/> {status?.aiConfigured ? "MOTEUR IA CONNECTÉ" : "CLÉ API IA EN ATTENTE"}</span><span>{status?.model || "GEMINI / CONFIG REQUIRED"}</span></div></div>
      </section>
      {active === "ALERTS" && <section className="workspace-grid">
        <div className="workspace-card panel"><div className="panel-heading"><div><span className="panel-index">01 /</span> NOUVELLE ALERTE DE PRIX</div><BellRing size={16}/></div><p className="workspace-help">Crée un seuil sur un actif suivi. Les alertes sont vérifiées à chaque actualisation du marché tant que le site reste ouvert.</p><form className="workspace-form" onSubmit={createAlert}><label>ACTIF<select value={alertAsset} onChange={e => setAlertAsset(e.target.value)}>{market.map(a => <option key={a.id} value={a.id}>{a.symbol.toUpperCase()} — {a.name}</option>)}</select></label><label>CONDITION<select value={alertDirection} onChange={e => setAlertDirection(e.target.value as "above" | "below")}><option value="above">Le prix passe au-dessus de</option><option value="below">Le prix passe en-dessous de</option></select></label><label>SEUIL EN USD<input type="number" min="0.00000001" step="any" required value={alertTarget} onChange={e => setAlertTarget(e.target.value)} placeholder="Ex. 70000"/></label><button className="pink-action" type="submit" disabled={!market.length}>CRÉER L’ALERTE <ArrowUpRight size={14}/></button></form>{alertNotice && <p className="workspace-notice">{alertNotice}</p>}</div>
        <div className="workspace-card panel"><div className="panel-heading"><div><span className="panel-index">02 /</span> MES ALERTES</div><span className="tiny-count">{alerts.length} CONFIGURÉE(S)</span></div><div className="workspace-list">{alerts.map(alert => { const asset = market.find(a => a.id === alert.assetId); return <div className="workspace-list-row" key={alert.id}><div><b>{asset?.symbol.toUpperCase() || alert.assetId}</b><small>{alert.direction === "above" ? "Au-dessus de" : "En-dessous de"} {formatPrice(alert.target)}</small></div><span className={alert.triggered ? "alert-hit" : "alert-wait"}>{alert.triggered ? "DÉCLENCHÉE" : "EN SURVEILLANCE"}</span><button className="icon-danger" onClick={() => setAlerts(items => items.filter(item => item.id !== alert.id))} aria-label="Supprimer l’alerte"><Trash2 size={15}/></button></div>})}{alerts.length === 0 && <div className="workspace-empty">Aucune alerte pour le moment. Crée un seuil pour commencer.</div>}</div><p className="workspace-footnote">Pas de notification garantie lorsque le navigateur est fermé. Les prix proviennent de CoinGecko et peuvent être retardés.</p></div>
      </section>}
      {active === "DOCUMENTS" && <section className="workspace-grid"><div className="workspace-card panel"><div className="panel-heading"><div><span className="panel-index">01 /</span> IMPORTER UN DOCUMENT</div><Upload size={16}/></div><p className="workspace-help">Ajoute un fichier texte pour demander à NEXUS de le résumer, l’expliquer ou l’analyser. Le contenu est lu localement puis envoyé au chat Gemini uniquement si tu lances l’analyse.</p><label className="upload-zone"><Upload size={25}/><b>Choisir un fichier</b><span>TXT · MD · CSV · JSON · JS · TS · HTML · CSS · PY · LOG · 500 Ko max</span><input type="file" accept=".txt,.md,.csv,.json,.js,.ts,.tsx,.jsx,.html,.css,.py,.log" onChange={e => void readDocument(e.target.files?.[0])}/></label>{documentError && <p className="workspace-error">{documentError}</p>}{documentFile && <div className="document-preview"><FileText size={19}/><div><b>{documentFile.name}</b><small>{(documentFile.size / 1024).toFixed(1)} Ko · {documentFile.content.length.toLocaleString("fr-FR")} caractères</small></div><button className="icon-danger" onClick={() => setDocumentFile(null)} aria-label="Retirer le document"><Trash2 size={15}/></button></div>}<button className="pink-action" disabled={!documentFile || !status?.aiConfigured || busy} onClick={analyseDocument}>ANALYSER AVEC NEXUS <ArrowUpRight size={14}/></button>{!status?.aiConfigured && <p className="workspace-footnote">Configure ta clé Gemini dans .env pour activer l’analyse IA.</p>}</div><div className="workspace-card panel"><div className="panel-heading"><div><span className="panel-index">02 /</span> CONFIDENTIALITÉ</div><ShieldCheck size={16}/></div><div className="privacy-points"><p><b>Lecture locale</b><span>Le fichier n’est pas enregistré sur un serveur par cette interface.</span></p><p><b>Envoi contrôlé</b><span>Le contenu est transmis à Gemini seulement lorsque tu cliques sur « Analyser avec NEXUS ».</span></p><p><b>Formats pris en charge</b><span>Cette version lit les fichiers texte. Les PDF, Word et images ne sont pas encore pris en charge.</span></p></div></div></section>}
      {active === "CODE" && <section className="workspace-card panel code-workspace"><div className="panel-heading"><div><span className="panel-index">01 /</span> ATELIER DE PROGRAMMATION</div><Code2 size={16}/></div><p className="workspace-help">Colle ton code ou écris un extrait, puis demande à NEXUS de l’expliquer, de trouver les erreurs ou de l’améliorer.</p><div className="code-toolbar"><label>LANGAGE<select value={codeLanguage} onChange={e => setCodeLanguage(e.target.value)}>{["JavaScript","TypeScript","Python","HTML","CSS","JSON","Bash","Lua / Roblox"].map(x => <option key={x}>{x}</option>)}</select></label><span>{codeText.length.toLocaleString("fr-FR")} caractères</span></div><textarea className="code-editor" spellCheck={false} value={codeText} onChange={e => setCodeText(e.target.value)} aria-label="Éditeur de code"/><div className="code-actions"><button className="outline-action" onClick={() => askCode("explain")} disabled={!codeText.trim() || busy || !status?.aiConfigured}>EXPLIQUER</button><button className="outline-action" onClick={() => askCode("debug")} disabled={!codeText.trim() || busy || !status?.aiConfigured}>TROUVER LES BUGS</button><button className="pink-action" onClick={() => askCode("improve")} disabled={!codeText.trim() || busy || !status?.aiConfigured}>AMÉLIORER LE CODE <ArrowUpRight size={14}/></button></div>{!status?.aiConfigured && <p className="workspace-footnote">Configure ta clé Gemini dans .env pour utiliser l’atelier IA.</p>}</section>}
      {partnerConfig?.partnerUrl && active !== "MEMBERSHIP" && <div className="partner-slot panel"><small>OFFRE PARTENAIRE · LIEN AFFILIÉ</small><b>{partnerConfig.partnerName}</b><span>Une offre partenaire peut contribuer au financement de NEXUS. Une commission peut être versée à NEXUS si tu utilises ce lien.</span><a className="outline-action" href={partnerConfig.partnerUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={trackPartnerClick}>VOIR L’OFFRE <ArrowUpRight size={14}/></a></div>}
      <footer className="desk-footer"><span><Radio size={12}/> SYSTÈME NEXUS <b>● EN LIGNE</b></span><span>COURS {status?.marketSource || "MULTI-SOURCES"} · INFORMATIONS ÉDUCATIVES, PAS UN CONSEIL FINANCIER</span><span><Terminal size={12}/> BUILD 1.5.0</span></footer>
      {chartModalOpen && active === "MARKET SCAN" && <div className="modal-backdrop chart-modal-backdrop" onClick={() => setChartModalOpen(false)}><section className="chart-detail-modal panel" role="dialog" aria-modal="true" aria-label="Graphique détaillé de la cryptomonnaie" onClick={event => event.stopPropagation()}><div className="panel-heading"><div><span className="panel-index">GRAPHIQUE / ACTUALISÉ</span> {market.find(asset => asset.id === selectedAsset)?.name || selectedAsset}</div><button className="console-toggle" onClick={() => setChartModalOpen(false)}>FERMER <X size={13}/></button></div><div className="detail-chart-toolbar"><div className="detail-chart-price"><b>{market.find(asset => asset.id === selectedAsset)?.symbol.toUpperCase()}</b><strong>{market.find(asset => asset.id === selectedAsset) ? formatPrice(market.find(asset => asset.id === selectedAsset)!.current_price) : "—"}</strong><span>COURS ACTUEL · {marketUpdated || "EN ATTENTE"}</span></div><div className="detail-range-buttons">{([{v:"1",label:"24 H"},{v:"7",label:"7 J"},{v:"30",label:"30 J"},{v:"90",label:"90 J"},{v:"365",label:"1 AN"}] as const).map(range => <button key={range.v} className={detailRange === range.v ? "chart-range active" : "chart-range"} onClick={() => setDetailRange(range.v)}>{range.label}</button>)}</div></div>{detailLoading ? <div className="chart-empty">CHARGEMENT DE L’HISTORIQUE…</div> : detailPoints.length > 1 ? <><div className="detail-chart-stats"><span>MIN. <b>{formatPrice(Math.min(...detailPoints.map(point => point.price)))}</b></span><span>MAX. <b>{formatPrice(Math.max(...detailPoints.map(point => point.price)))}</b></span><span>POINTS <b>{detailPoints.length}</b></span></div><svg className="market-chart detail-market-chart" viewBox="0 0 1000 260" preserveAspectRatio="none" role="img" aria-label={`Graphique historique ${detailRange} jours de ${selectedAsset}`}><defs><linearGradient id="detailChartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#ec55b0" stopOpacity=".32"/><stop offset="100%" stopColor="#ec55b0" stopOpacity="0"/></linearGradient></defs><path d={`${detailPoints.map((point,index) => `${index ? "L" : "M"}${(index/Math.max(1,detailPoints.length-1)*1000).toFixed(1)} ${(235-(point.price-Math.min(...detailPoints.map(p=>p.price)))/(Math.max(...detailPoints.map(p=>p.price))-Math.min(...detailPoints.map(p=>p.price))||1)*205).toFixed(1)}`).join(" ")} L1000 250 L0 250 Z`} fill="url(#detailChartFill)"/><path d={detailPoints.map((point,index) => `${index ? "L" : "M"}${(index/Math.max(1,detailPoints.length-1)*1000).toFixed(1)} ${(235-(point.price-Math.min(...detailPoints.map(p=>p.price)))/(Math.max(...detailPoints.map(p=>p.price))-Math.min(...detailPoints.map(p=>p.price))||1)*205).toFixed(1)}`).join(" ")} fill="none" stroke="#ed69bd" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg><div className="detail-chart-axis"><span>{new Date(detailPoints[0].time).toLocaleDateString("fr-FR")}</span><span>{new Date(detailPoints[detailPoints.length-1].time).toLocaleDateString("fr-FR")}</span></div><p className="detail-chart-note">Historique de prix fourni par CoinGecko. Le cours instantané se rafraîchit environ chaque minute. L’historique est rechargé automatiquement chaque minute ; ce n’est pas un flux tick par tick. Les données peuvent être retardées ou limitées par le fournisseur.</p></> : <div className="chart-empty">{detailError || "Aucun historique disponible pour cette crypto."}</div>}</section></div>}
      {infoModal && <div className="modal-backdrop" onClick={() => setInfoModal(null)}><section className="info-modal panel" role="dialog" aria-modal="true" aria-labelledby="info-modal-title" onClick={(event) => event.stopPropagation()}><div className="panel-heading"><b id="info-modal-title">{infoModal === "settings" ? "PARAMÈTRES NEXUS" : "AIDE & DOCUMENTATION"}</b><button className="console-toggle" onClick={() => setInfoModal(null)}>FERMER <X size={13}/></button></div>{infoModal === "settings" ? <div className="modal-content"><p><b>Flux de marché</b><span>CoinGecko en priorité, CoinCap puis Binance en secours · actualisation environ chaque minute. Source actuelle : {status?.marketSource || "en attente"}.</span></p><p><b>Historique et indicateurs</b><span>Historique horaire multi-sources · cache de 5 minutes. Disponibilité : {status?.historyAvailable ? `reçu via ${status.historySource || "source secondaire"}` : "en attente"}.</span></p><p><b>Assistant IA</b><span>{status?.aiConfigured ? `Connecté · ${status.model}` : "Non connecté · ajoute une clé Gemini dans le fichier .env"}</span></p><p><b>Confidentialité</b><span>Les messages sont conservés dans le stockage local de ce navigateur. La clé API reste côté serveur.</span></p><button className="outline-action" onClick={() => { setMessages([]); localStorage.removeItem("nexus-messages"); setInfoModal(null); }}>EFFACER L’HISTORIQUE DU CHAT</button></div> : <div className="modal-content"><p><b>Démarrer NEXUS</b><span>Sur Mac : ouvre le dossier dans un terminal, exécute npm install puis npm run dev et visite http://localhost:5173.</span></p><p><b>Activer l’assistant IA</b><span>Copie .env.example en .env, ajoute ta clé Google AI Studio dans GEMINI_API_KEY puis redémarre le serveur.</span></p><p><b>Sur iPhone</b><span>Mac et iPhone sur le même Wi-Fi ; ouvre l’adresse IP locale du Mac suivie de :5173 dans Safari, puis Partager → Sur l’écran d’accueil.</span></p><p><b>Indicateurs</b><span>RSI et moyennes mobiles décrivent l’historique. Ils ne prédisent pas le marché et ne constituent pas des ordres.</span></p><p><b>Limites</b><span>Le portefeuille et le risque personnel ne sont pas calculés. Aucun ordre n’est exécuté. Les panneaux marqués DÉMO sont illustratifs.</span></p></div>}</section></div>}
    </main>
  </div>;
}
