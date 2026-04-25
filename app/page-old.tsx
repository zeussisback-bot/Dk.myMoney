"use client";
import { useState, useRef, useEffect } from "react";

const CATS = {
  income: ["Gaji", "Freelance", "Investasi", "Bisnis", "Transfer Masuk", "Bonus", "Lainnya"],
  expense: ["Makan & Minum", "Transportasi", "Belanja", "Hiburan", "Kesehatan", "Tagihan", "Pendidikan", "Transfer Keluar", "Lainnya"],
};
const CAT_ICON = {
  "Gaji": "💼", "Freelance": "💻", "Investasi": "📈", "Bisnis": "🏢", "Transfer Masuk": "📥", "Bonus": "🎁",
  "Makan & Minum": "🍜", "Transportasi": "🚗", "Belanja": "🛍️", "Hiburan": "🎮", "Kesehatan": "💊",
  "Tagihan": "📄", "Pendidikan": "📚", "Transfer Keluar": "📤", "Lainnya": "📦",
};

const rupiah = (n) => "Rp " + Math.abs(n).toLocaleString("id-ID");
const fmtDate = (d) => new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

export default function DkMyMoney() {
  const [txns, setTxns] = useState(() => {
    try { const s = localStorage.getItem("dkmymoney"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [view, setView] = useState("home");
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("all");
  const [aiMsgs, setAiMsgs] = useState([{ role: "assistant", content: "Halo! Saya MoneyAI 👋\n\nAsisten keuangan pribadi kamu di Dk.myMoney. Tanya apa saja tentang transaksi, analisis pengeluaran, atau saran menabung ya!" }]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const chatEnd = useRef(null);

  const income = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const expByCat = txns.filter(t => t.type === "expense").reduce((a, t) => { a[t.category] = (a[t.category] || 0) + t.amount; return a }, {});
  const topExp = Object.entries(expByCat).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxExp = topExp[0]?.[1] || 1;
  const recent = [...txns].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  const filtered = [...txns].filter(t => filter === "all" || t.type === filter).sort((a, b) => new Date(b.date) - new Date(a.date));

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMsgs]);

  useEffect(() => {
    try { localStorage.setItem("dkmymoney", JSON.stringify(txns)); } catch { }
  }, [txns]);

  const showToast = (msg, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 2800);
  };

  function addTxn() {
    if (!amount || !category || !date) { showToast("Lengkapi data transaksi!", true); return; }
    setTxns(p => [{ id: Date.now(), type, amount: parseFloat(amount), category, note, date }, ...p]);
    setAmount(""); setCategory(""); setNote("");
    showToast("Transaksi berhasil disimpan!");
    setView("home");
  }

  function delTxn(id) {
    setTxns(p => p.filter(t => t.id !== id));
    showToast("Transaksi dihapus", true);
  }

  function smartReply(m) {
    const q = m.toLowerCase();
    const expByCatLocal = txns.filter(t => t.type === "expense").reduce((a, t) => { a[t.category] = (a[t.category] || 0) + t.amount; return a }, {});
    const topLocal = Object.entries(expByCatLocal).sort((a, b) => b[1] - a[1]);
    if (q.includes("saldo") || q.includes("berapa uang")) return `Saldo kamu: **${rupiah(balance)}** 💰\n\nPemasukan: ${rupiah(income)}\nPengeluaran: ${rupiah(expense)}`;
    if (q.includes("pengeluaran") || q.includes("boros") || q.includes("analisis")) {
      if (!topLocal.length) return "Belum ada pengeluaran tercatat. Yuk tambah transaksi dulu! 😊";
      return `Analisis pengeluaran kamu:\n\n${topLocal.slice(0, 3).map(([c, a], i) => `${i + 1}. ${CAT_ICON[c] || ""} ${c}: **${rupiah(a)}**`).join("\n")}\n\nTotal: **${rupiah(expense)}** 📊`;
    }
    if (q.includes("terboros") || q.includes("terbesar") || q.includes("kategori")) {
      if (!topLocal.length) return "Belum ada pengeluaran tercatat. 📝";
      return `Kategori terboros: **${topLocal[0][0]}** sebesar **${rupiah(topLocal[0][1])}** ${CAT_ICON[topLocal[0][0]] || ""}`;
    }
    if (q.includes("hemat") || q.includes("saran") || q.includes("tips")) {
      if (!topLocal.length) return "Rajin mencatat adalah langkah pertama! Terus catat setiap transaksi ya 💪";
      return `Saran hemat 💡\n\nPengeluaran terbesar di **${topLocal[0][0]}** (${rupiah(topLocal[0][1])}). Kurangi 20% = hemat **${rupiah(topLocal[0][1] * 0.2)}** per bulan!`;
    }
    if (q.includes("transaksi")) return `Kamu sudah mencatat **${txns.length} transaksi** 📋\nPemasukan: ${txns.filter(t => t.type === "income").length}\nPengeluaran: ${txns.filter(t => t.type === "expense").length}`;
    if (q.includes("pemasukan") || q.includes("gaji") || q.includes("masuk")) return `Total pemasukan: **${rupiah(income)}** 📈`;
    return `Hai! Kamu bisa tanya:\n• "Berapa saldo saya?"\n• "Analisis pengeluaran"\n• "Kategori terboros?"\n• "Saran hemat"\n• "Berapa transaksi saya?" 😊`;
  }

  function sendAI(msg) {
    if (aiLoading) return;
    const m = msg || aiInput.trim();
    if (!m) return;
    setAiInput("");
    setAiMsgs(p => [...p, { role: "user", content: m }]);
    setAiLoading(true);
    setTimeout(() => {
      setAiMsgs(p => [...p, { role: "assistant", content: smartReply(m) }]);
      setAiLoading(false);
    }, 700);
  }

  function downloadStatement() {
    const sorted = [...txns].sort((a, b) => new Date(a.date) - new Date(b.date));
    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const rows = sorted.map((t, i) => `<tr style="background:${i % 2 === 0 ? "#f8faff" : "#fff"}"><td style="padding:8px 10px;font-size:12px;border-bottom:1px solid #e2e8f0">${fmtDate(t.date)}</td><td style="padding:8px 10px;font-size:12px;border-bottom:1px solid #e2e8f0">${CAT_ICON[t.category] || ""} ${t.category}</td><td style="padding:8px 10px;font-size:12px;border-bottom:1px solid #e2e8f0">${t.note || "—"}</td><td style="padding:8px 10px;font-size:12px;text-align:right;border-bottom:1px solid #e2e8f0;font-weight:700;font-family:monospace;color:${t.type === "income" ? "#059669" : "#dc2626"}">${t.type === "income" ? "+" : "-"}${rupiah(t.amount)}</td></tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>E-Statement Dk.myMoney</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif}.page{max-width:720px;margin:0 auto;padding:40px 32px}.hdr{background:linear-gradient(135deg,#0a1833,#1a3f7c);padding:28px 32px;border-radius:16px;margin-bottom:28px;color:#fff;display:flex;justify-content:space-between;align-items:center}.logo{font-size:22px;font-weight:800}.logo span{color:#f0b429}.stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px}.stat{border-radius:12px;padding:14px 16px}.si{background:#f0fdf4;border:1px solid #bbf7d0}.se{background:#fff1f2;border:1px solid #fecdd3}.sb{background:#eff6ff;border:1px solid #bfdbfe}.sl{font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px}.sv{font-size:16px;font-weight:800;font-family:monospace}.si .sv{color:#059669}.se .sv{color:#dc2626}.sb .sv{color:#1d4ed8}table{width:100%;border-collapse:collapse;border:1px solid #e2e8f0}thead{background:#0a1833}thead th{padding:10px;text-align:left;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase}thead th:last-child{text-align:right}.footer{margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8}</style></head><body><div class="page"><div class="hdr"><div><div class="logo">Dk.<span>my</span>Money</div><div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:3px">Smart Money Tracker</div></div><div style="background:rgba(255,255,255,0.12);border-radius:8px;padding:8px 14px;text-align:right"><div style="font-size:10px;color:rgba(255,255,255,0.6)">Dicetak pada</div><div style="font-size:13px;font-weight:700;color:#fff">${dateStr}</div></div></div><h2 style="font-size:18px;font-weight:800;color:#0a1833;margin-bottom:4px">Laporan Keuangan (E-Statement)</h2><p style="font-size:12px;color:#64748b;margin-bottom:20px">Total ${txns.length} transaksi</p><div class="stats"><div class="stat si"><div class="sl">Total Pemasukan</div><div class="sv">${rupiah(income)}</div></div><div class="stat se"><div class="sl">Total Pengeluaran</div><div class="sv">${rupiah(expense)}</div></div><div class="stat sb"><div class="sl">Saldo Bersih</div><div class="sv">${rupiah(balance)}</div></div></div><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th style="text-align:right">Jumlah</th></tr></thead><tbody>${rows}</tbody></table><div class="footer"><span>Digenerate otomatis oleh Dk.myMoney</span><span>Untuk keperluan pribadi</span></div></div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `DkMyMoney_${now.toISOString().slice(0, 10)}.html`; a.click();
    URL.revokeObjectURL(url);
    showToast("E-Statement berhasil didownload!");
  }

  const DkAvatar = ({ size = 30 }) => (
    <div style={{ width: size, height: size, background: "linear-gradient(135deg,#1a3f7c,#3b6bbf)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.floor(size * 0.38), fontWeight: 900, color: "#f0b429", flexShrink: 0 }}>DK</div>
  );

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body,#root{background:#020917;min-height:100vh}
    ::-webkit-scrollbar{width:3px}
    ::-webkit-scrollbar-thumb{background:#1a3f7c;border-radius:4px}
    .shell{font-family:'Sora',sans-serif;background:#020917;min-height:100vh;max-width:430px;margin:0 auto;color:#e8edf8;position:relative}
    .hdr{display:flex;justify-content:space-between;align-items:center;padding:18px 20px 14px;border-bottom:1px solid #1a2d52;background:#050f24;position:sticky;top:0;z-index:50}
    .logo-wrap{display:flex;align-items:center;gap:10px}
    .logo-mark{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#1a3f7c,#3b6bbf);display:flex;align-items:center;justify-content:center;border:1px solid #2554a0;font-size:13px;font-weight:900;color:#f0b429}
    .app-name{font-size:16px;font-weight:800;color:#e8edf8;letter-spacing:-0.5px}
    .app-name span{color:#f0b429}
    .app-sub{font-size:10px;color:#7a90b8;margin-top:1px}
    .stmt-btn{padding:7px 12px;background:linear-gradient(135deg,#1a3f7c,#3b6bbf);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;font-family:'Sora',sans-serif}
    .content{padding:16px 16px 90px}
    .bal-card{background:linear-gradient(135deg,#0d2147 0%,#1a3f7c 50%,#2554a0 100%);border-radius:20px;padding:26px 22px;margin-bottom:14px;position:relative;overflow:hidden;border:1px solid #2554a0}
    .bal-label{font-size:11px;color:rgba(255,255,255,0.55);font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px}
    .bal-amount{font-size:28px;font-weight:800;color:#fff;letter-spacing:-1px;font-family:'JetBrains Mono';margin-bottom:16px}
    .bal-row{display:flex;gap:20px;align-items:center}
    .bal-stat{display:flex;align-items:center;gap:4px;font-family:'JetBrains Mono';font-size:13px}
    .bal-div{width:1px;background:rgba(255,255,255,0.12);height:28px}
    .deco1{position:absolute;top:-25px;right:-25px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.05);pointer-events:none}
    .deco2{position:absolute;bottom:-35px;right:40px;width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,0.03);pointer-events:none}
    .quick-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
    .quick-btn{background:#0a1833;border:1px solid #1a2d52;border-radius:14px;padding:12px 6px;display:flex;flex-direction:column;align-items:center;cursor:pointer;gap:4px;font-family:'Sora',sans-serif}
    .quick-btn:hover{transform:translateY(-2px);transition:transform 0.2s}
    .quick-lbl{font-size:11px;color:#7a90b8;font-weight:600}
    .ai-banner{background:#0a1833;border:1px solid #1a3f7c;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;margin-bottom:14px}
    .ai-banner:hover{transform:translateY(-1px);transition:transform 0.2s}
    .card{background:#0a1833;border:1px solid #1a2d52;border-radius:16px;padding:16px;margin-bottom:14px}
    .card-title{font-size:13px;font-weight:700;color:#e8edf8;margin-bottom:12px}
    .txn-row{display:flex;align-items:center;gap:10px;padding:9px 6px;border-bottom:1px solid #1a2d52;border-radius:8px}
    .txn-row:hover{background:rgba(79,142,247,0.06)}
    .txn-icon{width:36px;height:36px;background:#0d2147;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
    .bar-wrap{height:4px;background:#1a2d52;border-radius:99px;margin-top:5px}
    .bar-fill{height:4px;border-radius:99px;background:linear-gradient(90deg,#4f8ef7,#f0b429);transition:width 0.7s ease}
    .page-head{margin-bottom:14px}
    .back-btn{background:transparent;border:none;color:#7a90b8;cursor:pointer;font-size:13px;font-weight:600;padding:0 0 8px;font-family:'Sora',sans-serif}
    .page-title{font-size:20px;font-weight:800;color:#e8edf8;letter-spacing:-0.5px}
    .form-card{background:#0a1833;border:1px solid #1a2d52;border-radius:20px;padding:20px 18px}
    .toggle{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:18px;background:#0d2147;border-radius:12px;padding:4px}
    .tog-btn{padding:10px;border-radius:8px;border:none;background:transparent;color:#7a90b8;font-weight:600;font-size:13px;cursor:pointer;font-family:'Sora',sans-serif;transition:all 0.15s}
    .tog-exp{background:#1a060a;color:#ff5c6a;box-shadow:0 0 0 1px #ff5c6a}
    .tog-inc{background:#052e1a;color:#10d982;box-shadow:0 0 0 1px #10d982}
    .lbl{display:block;font-size:11px;color:#7a90b8;font-weight:700;margin-bottom:6px;margin-top:14px;letter-spacing:0.3px;text-transform:uppercase}
    .inp{width:100%;background:#0d2147;border:1px solid #1a2d52;border-radius:10px;padding:12px 14px;color:#e8edf8;font-size:14px;font-family:'Sora',sans-serif;outline:none}
    .inp:focus{border-color:#4f8ef7;box-shadow:0 0 0 3px rgba(79,142,247,0.15)}
    .btn-primary{width:100%;margin-top:20px;padding:14px;background:linear-gradient(135deg,#2554a0,#3b6bbf);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:'Sora',sans-serif}
    .btn-primary:hover{filter:brightness(1.1);transform:translateY(-1px)}
    .btn-cancel{width:100%;margin-top:8px;padding:12px;background:transparent;border:1px solid #1a2d52;border-radius:12px;color:#7a90b8;font-size:14px;font-weight:600;cursor:pointer;font-family:'Sora',sans-serif}
    .chat-wrap{display:flex;flex-direction:column;height:calc(100vh - 230px)}
    .chat-msgs{flex:1;overflow-y:auto;padding-bottom:8px}
    .msg-row{display:flex;margin-bottom:10px}
    .msg-user{justify-content:flex-end}
    .dk-avatar{width:30px;height:30px;background:linear-gradient(135deg,#1a3f7c,#3b6bbf);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#f0b429;flex-shrink:0;margin-right:6px;align-self:flex-end}
    .bub-ai{background:#0a1833;border:1px solid #1a2d52;border-radius:4px 14px 14px 14px;padding:10px 14px;max-width:78%;font-size:13px;color:#e8edf8;line-height:1.65}
    .bub-user{background:linear-gradient(135deg,#1a3f7c,#2554a0);border-radius:14px 4px 14px 14px;padding:10px 14px;max-width:78%;font-size:13px;color:#fff;line-height:1.65}
    .chip-row{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;padding-top:4px}
    .chip{padding:6px 12px;border-radius:99px;border:1px solid #1a2d52;background:transparent;color:#7a90b8;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:'Sora',sans-serif;flex-shrink:0}
    .chip:hover{background:rgba(79,142,247,0.15);color:#4f8ef7;border-color:#4f8ef7}
    .chat-row{display:flex;gap:8px;padding-top:8px;border-top:1px solid #1a2d52}
    .chat-inp{flex:1;background:#0a1833;border:1px solid #1a2d52;border-radius:12px;padding:12px 14px;color:#e8edf8;font-size:14px;font-family:'Sora',sans-serif;outline:none}
    .chat-inp:focus{border-color:#4f8ef7}
    .send-btn{width:46px;height:46px;background:linear-gradient(135deg,#2554a0,#3b6bbf);border:none;border-radius:12px;color:#fff;font-size:18px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center}
    .filter-row{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
    .filter-btn{padding:7px 14px;border-radius:99px;border:1px solid #1a2d52;background:transparent;color:#7a90b8;font-size:12px;font-weight:600;cursor:pointer;font-family:'Sora',sans-serif}
    .filter-btn.on{background:rgba(79,142,247,0.12);border-color:#4f8ef7;color:#4f8ef7}
    .sum-row{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
    .sum-chip{padding:6px 12px;border-radius:99px;border:1px solid #1a2d52;background:#0a1833;font-size:12px;font-weight:700;font-family:'JetBrains Mono';color:#e8edf8}
    .del-btn{background:transparent;border:none;cursor:pointer;font-size:14px;color:#7a90b8;padding:2px 6px;border-radius:6px}
    .del-btn:hover{color:#ff5c6a;background:rgba(255,92,106,0.1)}
    .nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:#050f24;border-top:1px solid #1a2d52;display:flex;justify-content:space-around;align-items:center;padding:8px 0 20px;z-index:100}
    .nav-item{display:flex;flex-direction:column;align-items:center;background:transparent;border:none;cursor:pointer;font-family:'Sora',sans-serif;font-weight:500;padding:6px 16px;border-radius:10px;color:#7a90b8;font-size:10px;gap:2px}
    .nav-item:hover{background:rgba(255,255,255,0.05)}
    .nav-item.on{color:#4f8ef7}
    .nav-add{width:50px;height:50px;background:linear-gradient(135deg,#2554a0,#3b6bbf);border:2px solid #3b6bbf;border-radius:16px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 18px rgba(37,84,160,0.5)}
    .toast{position:fixed;bottom:100px;left:50%;transform:translateX(-50%);padding:12px 18px;border-radius:12px;display:flex;align-items:center;gap:10px;z-index:999;box-shadow:0 8px 32px rgba(0,0,0,0.3);white-space:nowrap;font-size:13px;font-weight:500;color:#e8edf8;font-family:'Sora',sans-serif}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
    .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#4f8ef7;margin-right:4px;animation:blink 1.2s ease infinite}
    .dot2{animation-delay:0.2s}
    .dot3{animation-delay:0.4s}
    .empty{text-align:center;padding:40px 0;color:#7a90b8}
  `;

  return (
    <>
      <style>{css}</style>
      <div className="shell">

        {/* TOAST */}
        {toast && (
          <div className="toast" style={{ background: toast.err ? "rgba(26,6,10,0.95)" : "rgba(5,18,10,0.95)", border: `1px solid ${toast.err ? "#ff5c6a" : "#10d982"}` }}>
            {toast.err ? "❌" : "✅"} {toast.msg}
          </div>
        )}

        {/* HEADER */}
        <div className="hdr">
          <div className="logo-wrap">
            <div className="logo-mark">Dk</div>
            <div>
              <div className="app-name">Dk.<span>my</span>Money</div>
              <div className="app-sub">Smart Money Tracker</div>
            </div>
          </div>
          <button className="stmt-btn" onClick={downloadStatement}>📄 E-Statement</button>
        </div>

        <div className="content">

          {/* HOME */}
          {view === "home" && (
            <div>
              <div className="bal-card">
                <div className="deco1" /><div className="deco2" />
                <div className="bal-label">Saldo Tersedia</div>
                <div className="bal-amount">{rupiah(balance)}</div>
                <div className="bal-row">
                  <div className="bal-stat"><span style={{ color: "#10d982" }}>↑</span><span style={{ color: "#a7f3d0" }}>{rupiah(income)}</span><span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>Masuk</span></div>
                  <div className="bal-div" />
                  <div className="bal-stat"><span style={{ color: "#ff5c6a" }}>↓</span><span style={{ color: "#fecaca" }}>{rupiah(expense)}</span><span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>Keluar</span></div>
                </div>
              </div>

              <div className="quick-row">
                <button className="quick-btn" onClick={() => setView("add")}><span>➕</span><span className="quick-lbl">Tambah</span></button>
                <button className="quick-btn" onClick={() => setView("ai")}><DkAvatar size={32} /><span className="quick-lbl">MoneyAI</span></button>
                <button className="quick-btn" onClick={() => setView("history")}><span>☰</span><span className="quick-lbl">Riwayat</span></button>
                <button className="quick-btn" onClick={downloadStatement}><span>📄</span><span className="quick-lbl">Unduh</span></button>
              </div>

              <div className="ai-banner" onClick={() => setView("ai")}>
                <DkAvatar size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#e8edf8", fontSize: 14 }}>Tanya MoneyAI</div>
                  <div style={{ fontSize: 12, color: "#7a90b8", marginTop: 2 }}>"Berapa boros saya bulan ini?"</div>
                </div>
                <div style={{ color: "#4f8ef7", fontSize: 18, fontWeight: 700 }}>→</div>
              </div>

              {topExp.length > 0 && (
                <div className="card">
                  <div className="card-title">📊 Top Pengeluaran</div>
                  {topExp.map(([cat, amt]) => (
                    <div key={cat} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: "#7a90b8" }}>{CAT_ICON[cat] || "📦"} {cat}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#e8edf8", fontFamily: "JetBrains Mono" }}>{rupiah(amt)}</span>
                      </div>
                      <div className="bar-wrap"><div className="bar-fill" style={{ width: `${(amt / maxExp) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}

              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div className="card-title" style={{ marginBottom: 0 }}>🕐 Transaksi Terbaru</div>
                  <span style={{ fontSize: 12, color: "#4f8ef7", cursor: "pointer", fontWeight: 700 }} onClick={() => setView("history")}>Semua →</span>
                </div>
                {recent.length === 0 ? <div className="empty"><div style={{ fontSize: 36, marginBottom: 8 }}>📭</div><div>Belum ada transaksi</div></div>
                  : recent.map(t => (
                    <div key={t.id} className="txn-row">
                      <div className="txn-icon">{CAT_ICON[t.category] || "📦"}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#e8edf8" }}>{t.category}</div>
                        <div style={{ fontSize: 11, color: "#7a90b8", marginTop: 2 }}>{t.note || "—"} · {fmtDate(t.date)}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.type === "income" ? "#10d982" : "#ff5c6a", fontFamily: "JetBrains Mono", whiteSpace: "nowrap" }}>
                        {t.type === "income" ? "+" : "-"}{rupiah(t.amount)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ADD */}
          {view === "add" && (
            <div>
              <div className="page-head">
                <button className="back-btn" onClick={() => setView("home")}>← Kembali</button>
                <div className="page-title">Tambah Transaksi</div>
              </div>
              <div className="form-card">
                <div className="toggle">
                  <button className={`tog-btn ${type === "expense" ? "tog-exp" : ""}`} onClick={() => { setType("expense"); setCategory("") }}>💸 Pengeluaran</button>
                  <button className={`tog-btn ${type === "income" ? "tog-inc" : ""}`} onClick={() => { setType("income"); setCategory("") }}>💰 Pemasukan</button>
                </div>
                <label className="lbl">Jumlah (Rp)</label>
                <input className="inp" type="number" placeholder="Masukkan jumlah..." value={amount} onChange={e => setAmount(e.target.value)} />
                <label className="lbl">Kategori</label>
                <select className="inp" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">Pilih kategori...</option>
                  {CATS[type].map(c => <option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}
                </select>
                <label className="lbl">Tanggal</label>
                <input className="inp" type="date" value={date} onChange={e => setDate(e.target.value)} />
                <label className="lbl">Keterangan (opsional)</label>
                <input className="inp" type="text" placeholder="Tambahkan catatan..." value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === "Enter" && addTxn()} />
                <button className="btn-primary" onClick={addTxn}>💾 Simpan Transaksi</button>
                <button className="btn-cancel" onClick={() => setView("home")}>Batal</button>
              </div>
            </div>
          )}

          {/* AI */}
          {view === "ai" && (
            <div>
              <div className="page-head">
                <button className="back-btn" onClick={() => setView("home")}>← Kembali</button>
                <div className="page-title"><DkAvatar size={28} />MoneyAI</div>
              </div>
              <div className="chat-wrap">
                <div className="chat-msgs">
                  {aiMsgs.map((m, i) => (
                    <div key={i} className={`msg-row ${m.role === "user" ? "msg-user" : ""}`}>
                      {m.role === "assistant" && <DkAvatar size={28} />}
                      <div className={m.role === "user" ? "bub-user" : "bub-ai"}>
                        {m.content.split("\n").map((l, j) => <div key={j}>{l || "\u00A0"}</div>)}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="msg-row">
                      <DkAvatar size={28} />
                      <div className="bub-ai"><span className="dot" /><span className="dot dot2" /><span className="dot dot3" /></div>
                    </div>
                  )}
                  <div ref={chatEnd} />
                </div>
                <div className="chip-row">
                  {["Analisis pengeluaran saya", "Kategori terboros?", "Saran hemat bulan ini", "Berapa saldo saya?"].map(s => (
                    <button key={s} className="chip" onClick={() => sendAI(s)}>{s}</button>
                  ))}
                </div>
                <div className="chat-row">
                  <input className="chat-inp" placeholder="Tanya MoneyAI..." value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendAI()} />
                  <button className="send-btn" onClick={() => sendAI()}>↑</button>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY */}
          {view === "history" && (
            <div>
              <div className="page-head">
                <button className="back-btn" onClick={() => setView("home")}>← Kembali</button>
                <div className="page-title">Riwayat Transaksi</div>
              </div>
              <div className="sum-row">
                <div className="sum-chip" style={{ color: "#10d982" }}>+ {rupiah(income)}</div>
                <div className="sum-chip" style={{ color: "#ff5c6a" }}>- {rupiah(expense)}</div>
                <div className="sum-chip" style={{ color: "#4f8ef7" }}>{txns.length} transaksi</div>
              </div>
              <div className="filter-row">
                {["all", "income", "expense"].map(f => (
                  <button key={f} className={`filter-btn ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
                    {f === "all" ? "Semua" : f === "income" ? "💰 Masuk" : "💸 Keluar"}
                  </button>
                ))}
                <button className="stmt-btn" style={{ marginLeft: "auto" }} onClick={downloadStatement}>📄 Unduh</button>
              </div>
              {filtered.length === 0 ? <div className="empty"><div style={{ fontSize: 36, marginBottom: 8 }}>📭</div><div>Tidak ada transaksi</div></div>
                : filtered.map(t => (
                  <div key={t.id} className="txn-row" style={{ background: "#0a1833", borderRadius: 12, padding: "12px 14px", marginBottom: 6, border: "1px solid #1a2d52" }}>
                    <div className="txn-icon">{CAT_ICON[t.category] || "📦"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e8edf8" }}>{t.category}</div>
                      <div style={{ fontSize: 11, color: "#7a90b8", marginTop: 2 }}>{t.note || "—"}</div>
                      <div style={{ fontSize: 10, color: "#3b4f70", marginTop: 1 }}>{fmtDate(t.date)}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.type === "income" ? "#10d982" : "#ff5c6a", fontFamily: "JetBrains Mono" }}>
                        {t.type === "income" ? "+" : "-"}{rupiah(t.amount)}
                      </div>
                      <button className="del-btn" onClick={() => delTxn(t.id)}>🗑</button>
                    </div>
                  </div>
                ))}
            </div>
          )}

        </div>

        {/* NAV */}
        <div className="nav">
          <button className={`nav-item ${view === "home" ? "on" : ""}`} onClick={() => setView("home")}><span style={{ fontSize: 20 }}>🏠</span><span>Beranda</span></button>
          <button className="nav-add" onClick={() => setView("add")}>＋</button>
          <button className={`nav-item ${view === "ai" ? "on" : ""}`} onClick={() => setView("ai")}><DkAvatar size={24} /><span>MoneyAI</span></button>
          <button className={`nav-item ${view === "history" ? "on" : ""}`} onClick={() => setView("history")}><span style={{ fontSize: 20 }}>☰</span><span>Riwayat</span></button>
        </div>

      </div>
    </>
  );
}
