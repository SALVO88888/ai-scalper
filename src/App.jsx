import { useState, useEffect, useRef } from "react";

const PAIRS = {
  "BTC/USDT": { base: 103241, vol: "2.1B", decimals: 2 },
  "ETH/USDT": { base: 3812, vol: "890M", decimals: 2 },
  "SOL/USDT": { base: 178.5, vol: "420M", decimals: 2 },
  "XRP/USDT": { base: 0.6124, vol: "310M", decimals: 4 },
};

function generateCandles(base, count = 30) {
  const candles = [];
  let price = base * 0.985;
  for (let i = 0; i < count; i++) {
    const open = price;
    const change = (Math.random() - 0.48) * base * 0.004;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * base * 0.002;
    const low = Math.min(open, close) - Math.random() * base * 0.002;
    const volume = Math.random() * 100 + 20;
    candles.push({ open, close, high, low, volume });
    price = close;
  }
  return candles;
}

function computeEMA(data, period) {
  const k = 2 / (period + 1);
  let ema = data[0];
  return data.map(v => { ema = v * k + ema * (1 - k); return ema; });
}

function computeRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
  }
  return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
}

function MiniChart({ candles, up }) {
  const closes = candles.map(c => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const w = 320, h = 70;
  const pts = closes.map((v, i) => {
    const x = (i / (closes.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  }).join(" ");
  const color = up ? "#1D9E75" : "#E24B4A";
  const fill = up ? "rgba(29,158,117,0.08)" : "rgba(226,75,74,0.08)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 70 }}>
      <defs>
        <linearGradient id="grd" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#grd)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function SignalBar({ buy, hold, sell }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      {[
        { label: "Compra", val: buy, color: "#3B6D11", bg: "#EAF3DE", border: "#97C459" },
        { label: "Attendi", val: hold, color: "var(--color-text-secondary)", bg: "var(--color-background-secondary)", border: "var(--color-border-tertiary)" },
        { label: "Vendi", val: sell, color: "#A32D2D", bg: "#FCEBEB", border: "#F09595" },
      ].map(s => (
        <div key={s.label} style={{ flex: 1, padding: "10px 6px", borderRadius: 8, textAlign: "center", background: s.bg, border: `0.5px solid ${s.border}` }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-text-secondary)", marginBottom: 4 }}>{s.label}</div>
          <div style={{ fontSize: 20, fontWeight: 500, color: s.color }}>{s.val}%</div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [pair, setPair] = useState("BTC/USDT");
  const [candles, setCandles] = useState(() => generateCandles(PAIRS["BTC/USDT"].base));
  const [loading, setLoading] = useState(false);
  const [signal, setSignal] = useState(null);
  const [trades, setTrades] = useState([]);
  const [capital, setCapital] = useState(10000);
  const [pnl, setPnl] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);
  const [wins, setWins] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const currentPrice = candles[candles.length - 1]?.close || PAIRS[pair].base;
  const opens = candles.map(c => c.open);
  const closes = candles.map(c => c.close);
  const ema9 = computeEMA(closes, 9);
  const ema21 = computeEMA(closes, 21);
  const rsi = computeRSI(closes);
  const lastEma9 = ema9[ema9.length - 1];
  const lastEma21 = ema21[ema21.length - 1];
  const priceChange = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;
  const up = priceChange >= 0;
  const high = Math.max(...candles.map(c => c.high));
  const low = Math.min(...candles.map(c => c.low));

  useEffect(() => {
    const newCandles = generateCandles(PAIRS[pair].base);
    setCandles(newCandles);
    setSignal(null);
  }, [pair]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCandles(prev => {
        const last = prev[prev.length - 1];
        const newPrice = last.close + (Math.random() - 0.49) * last.close * 0.0008;
        const newCandle = { open: last.close, close: newPrice, high: Math.max(last.close, newPrice) + Math.random() * last.close * 0.0003, low: Math.min(last.close, newPrice) - Math.random() * last.close * 0.0003, volume: Math.random() * 100 + 20 };
        return [...prev.slice(1), newCandle];
      });
    }, 3000);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function analyzeWithAI() {
    setLoading(true);
    setSignal(null);
    const closes5 = closes.slice(-5).map(v => v.toFixed(PAIRS[pair].decimals));
    const volumes = candles.slice(-5).map(c => c.volume.toFixed(1));
    const prompt = `Sei un trader esperto di crypto scalping. Analizza questi dati di mercato per ${pair} e fornisci un segnale di trading.

DATI ATTUALI:
- Prezzo attuale: ${currentPrice.toFixed(PAIRS[pair].decimals)} USDT
- Variazione: ${priceChange.toFixed(2)}%
- RSI(14): ${rsi.toFixed(1)}
- EMA9: ${lastEma9.toFixed(PAIRS[pair].decimals)}
- EMA21: ${lastEma21.toFixed(PAIRS[pair].decimals)}
- EMA9 ${lastEma9 > lastEma21 ? "SOPRA" : "SOTTO"} EMA21
- Ultimi 5 prezzi di chiusura: ${closes5.join(", ")}
- Volumi ultimi 5 candle: ${volumes.join(", ")}
- High 30 candle: ${high.toFixed(PAIRS[pair].decimals)}
- Low 30 candle: ${low.toFixed(PAIRS[pair].decimals)}

Rispondi SOLO in JSON, nessun testo fuori dal JSON:
{
  "signal": "BUY" | "SELL" | "HOLD",
  "buy_probability": numero 0-100,
  "sell_probability": numero 0-100,
  "hold_probability": numero 0-100,
  "reasoning": "spiegazione in italiano max 2 righe",
  "stop_loss": numero,
  "take_profit": numero,
  "confidence": "ALTA" | "MEDIA" | "BASSA"
}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setSignal(parsed);
      setLastUpdated(new Date());
    } catch (e) {
      setSignal({ signal: "ERRORE", buy_probability: 0, sell_probability: 0, hold_probability: 100, reasoning: "Errore nell'analisi AI. Riprova.", confidence: "BASSA", stop_loss: 0, take_profit: 0 });
    }
    setLoading(false);
  }

  function executeTrade() {
    if (!signal || signal.signal === "HOLD" || signal.signal === "ERRORE") return;
    const win = Math.random() > 0.38;
    const amount = parseFloat((Math.random() * 55 + 15).toFixed(2));
    const val = win ? amount : -amount;
    const now = new Date();
    const time = now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");
    setTrades(prev => [{
      side: signal.signal,
      price: currentPrice.toFixed(PAIRS[pair].decimals),
      pnl: val,
      time,
      pair
    }, ...prev].slice(0, 6));
    setPnl(prev => parseFloat((prev + val).toFixed(2)));
    setCapital(prev => parseFloat((prev + val).toFixed(2)));
    setTotalTrades(t => t + 1);
    if (win) setWins(w => w + 1);
  }

  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
  const fmt = (n, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

  const signalColor = signal?.signal === "BUY" ? "#1D9E75" : signal?.signal === "SELL" ? "#E24B4A" : "var(--color-text-secondary)";
  const signalBg = signal?.signal === "BUY" ? "#EAF3DE" : signal?.signal === "SELL" ? "#FCEBEB" : "var(--color-background-secondary)";

  return (
    <div style={{ fontFamily: "var(--font-sans)", padding: 16, maxWidth: 420 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: -0.3 }}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#639922", marginRight: 6, animation: "pulse 2s infinite" }} />
          AI Scalper
        </div>
        <span style={{ background: "#FAEEDA", color: "#854F0B", fontSize: 11, padding: "3px 8px", borderRadius: 4, fontWeight: 500 }}>PAPER</span>
      </div>

      {/* Pair selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {Object.keys(PAIRS).map(p => (
          <button key={p} onClick={() => setPair(p)} style={{ padding: "6px 14px", borderRadius: 20, border: `0.5px solid ${pair === p ? "#1D9E75" : "var(--color-border-secondary)"}`, background: pair === p ? "#1D9E75" : "var(--color-background-primary)", color: pair === p ? "#fff" : "var(--color-text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
            {p}
          </button>
        ))}
      </div>

      {/* Price card */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: -1 }}>${fmt(currentPrice, PAIRS[pair].decimals)}</div>
            <span style={{ fontSize: 13, padding: "2px 8px", borderRadius: 4, fontWeight: 500, background: up ? "#EAF3DE" : "#FCEBEB", color: up ? "#3B6D11" : "#A32D2D" }}>
              {up ? "+" : ""}{priceChange.toFixed(2)}%
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>24h Vol</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>${PAIRS[pair].vol}</div>
          </div>
        </div>
        <MiniChart candles={candles} up={up} />
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          {[["H", high], ["L", low], ["RSI", rsi]].map(([label, val]) => (
            <span key={label} style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              {label} <b style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{typeof val === "number" ? (label === "RSI" ? val.toFixed(1) : "$" + fmt(val, PAIRS[pair].decimals)) : val}</b>
            </span>
          ))}
        </div>
      </div>

      {/* Indicators */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[
          { label: "EMA 9", val: fmt(lastEma9, PAIRS[pair].decimals), color: "#1D9E75" },
          { label: "EMA 21", val: fmt(lastEma21, PAIRS[pair].decimals), color: "#E24B4A" },
          { label: "Trend", val: lastEma9 > lastEma21 ? "↑ Rialzo" : "↓ Ribasso", color: lastEma9 > lastEma21 ? "#3B6D11" : "#A32D2D" },
        ].map(ind => (
          <div key={ind.label} style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{ind.label}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: ind.color }}>{ind.val}</div>
          </div>
        ))}
      </div>

      {/* AI section */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-brain" style={{ fontSize: 16, color: "#1D9E75" }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Analisi AI (Claude)</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              {lastUpdated ? "Aggiornato " + lastUpdated.toLocaleTimeString("it-IT") : "Premi Analizza per iniziare"}
            </div>
          </div>
        </div>

        {signal && signal.signal !== "ERRORE" && (
          <>
            <SignalBar buy={signal.buy_probability} hold={signal.hold_probability} sell={signal.sell_probability} />
            <div style={{ padding: 12, background: signalBg, borderRadius: 8, marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: signalColor }}>
                  {signal.signal === "BUY" ? "📈 LONG" : signal.signal === "SELL" ? "📉 SHORT" : "⏸ HOLD"}
                </span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: signal.confidence === "ALTA" ? "#EAF3DE" : signal.confidence === "MEDIA" ? "#FAEEDA" : "#FCEBEB", color: signal.confidence === "ALTA" ? "#3B6D11" : signal.confidence === "MEDIA" ? "#854F0B" : "#A32D2D", fontWeight: 500 }}>
                  Confidenza {signal.confidence}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{signal.reasoning}</div>
              {signal.stop_loss > 0 && (
                <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>Stop <b style={{ color: "#A32D2D", fontWeight: 500 }}>${fmt(signal.stop_loss, PAIRS[pair].decimals)}</b></span>
                  <span style={{ color: "var(--color-text-secondary)" }}>Target <b style={{ color: "#3B6D11", fontWeight: 500 }}>${fmt(signal.take_profit, PAIRS[pair].decimals)}</b></span>
                </div>
              )}
            </div>
          </>
        )}

        {signal?.signal === "ERRORE" && (
          <div style={{ padding: 12, background: "#FCEBEB", borderRadius: 8, marginBottom: 12, fontSize: 13, color: "#A32D2D" }}>{signal.reasoning}</div>
        )}

        <button onClick={analyzeWithAI} disabled={loading} style={{ width: "100%", padding: 12, borderRadius: 8, border: "none", background: loading ? "var(--color-background-secondary)" : "#1D9E75", color: loading ? "var(--color-text-secondary)" : "#fff", fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", marginBottom: 8 }}>
          {loading ? "⏳ Claude sta analizzando..." : "🤖 Analizza con AI"}
        </button>

        {signal && signal.signal !== "HOLD" && signal.signal !== "ERRORE" && (
          <button onClick={executeTrade} style={{ width: "100%", padding: 12, borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            ▶ Esegui trade simulato
          </button>
        )}
      </div>

      {/* Portfolio */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginBottom: 12 }}>
        {[
          { label: "Capitale", val: "$" + fmt(capital), color: null },
          { label: "P&L totale", val: (pnl >= 0 ? "+" : "") + "$" + Math.abs(pnl).toFixed(2), color: pnl >= 0 ? "#3B6D11" : "#A32D2D" },
          { label: "Trade totali", val: totalTrades, color: null },
          { label: "Win rate", val: winRate + "%", color: winRate >= 50 ? "#3B6D11" : "#A32D2D" },
        ].map(m => (
          <div key={m.label} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: m.color || "var(--color-text-primary)" }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Trade history */}
      {trades.length > 0 && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Trade simulati</div>
          {trades.map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < trades.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
              <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 3, background: t.side === "BUY" ? "#EAF3DE" : "#FCEBEB", color: t.side === "BUY" ? "#3B6D11" : "#A32D2D" }}>{t.side}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>${t.price}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: t.pnl >= 0 ? "#3B6D11" : "#A32D2D" }}>{t.pnl >= 0 ? "+" : ""}${Math.abs(t.pnl).toFixed(2)}</span>
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{t.time}</span>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
