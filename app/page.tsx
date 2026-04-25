"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtRp = (n) => "Rp " + Math.abs(n).toLocaleString("id-ID");

// Hierarchical categories
const CAT_TREE = {
  "🍔 Makan & Minum": ["Makan Siang","Makan Malam","Sarapan","Kopi & Snack","Groceries","Delivery Makanan","Restoran","Warung"],
  "🚗 Transportasi": ["Bensin","Parkir","Ojek Online","Taksi","Angkutan Umum","Tol","Servis Kendaraan","Cicilan Motor/Mobil"],
  "🛒 Belanja": ["Supermarket","Online Shop","Pasar","Elektronik","Furnitur","Perlengkapan Rumah","Kosmetik","Aksesoris"],
  "👔 Pakaian": ["Baju","Celana","Sepatu","Tas","Pakaian Dalam","Jaket","Seragam"],
  "💊 Kesehatan": ["Dokter","Obat-obatan","Apotek","Rumah Sakit","Gym","Vitamin","Perawatan Gigi","Laboratorium"],
  "🎮 Hiburan": ["Streaming","Bioskop","Game","Konser","Wisata","Karaoke","Olahraga","Hobi"],
  "📚 Pendidikan": ["Kursus","Buku","Sekolah","Seminar","Pelatihan","Les Privat","Alat Tulis"],
  "🏠 Rumah & Properti": ["Sewa/Kos","Cicilan KPR","Renovasi","Furnitur","Kebersihan","Keamanan"],
  "🔌 Tagihan & Utilitas": ["Listrik","Air","Internet","Telepon","Gas","TV Kabel","Iuran"],
  "💰 Tabungan & Investasi": ["Tabungan","Reksa Dana","Saham","Emas","Kripto","Deposito","Asuransi"],
  "🤝 Sosial & Keluarga": ["Arisan","Sumbangan","Hadiah","Kondangan","Acara Keluarga","Donasi"],
  "💼 Bisnis": ["Modal Usaha","Operasional","Gaji Karyawan","Marketing","Peralatan","Pajak"],
  "🏦 Transfer Bank": ["Transfer BCA","Transfer BRI","Transfer BNI","Transfer Mandiri","Transfer BSI","Transfer Lainnya"],
  "💳 E-Wallet": ["GoPay","OVO","Dana","ShopeePay","LinkAja","Flip","Dompet Digital Lain"],
  "💵 Gaji / Pemasukan": ["Gaji","Bonus","THR","Lembur","Freelance","Komisi"],
  "📦 Pemasukan Lainnya": ["Penjualan","Sewa","Dividen","Hadiah Uang","Pengembalian Dana","Lainnya Masuk"],
  "⚙️ Lainnya": ["Denda","Biaya Admin","Tak Terduga","Lain-lain"],
};

const CATEGORIES = Object.entries(CAT_TREE).map(([k]) => {
  const parts = k.split(" "); const ico = parts[0]; const label = parts.slice(1).join(" ");
  return { ico, label };
});

const BANKS = ["BCA", "BRI", "BNI", "Mandiri", "BSI", "CIMB", "BTN", "Permata"];
const EWALLETS = ["GoPay", "OVO", "Dana", "ShopeePay", "LinkAja", "Flip"];

const AI_PROMPTS = [
  "📊 Analisis pengeluaran saya bulan ini",
  "📅 Pengeluaran bulan lalu vs bulan ini",
  "🔥 Kategori paling boros saya",
  "💡 Saran hemat berdasarkan transaksi saya",
  "📈 Tren pengeluaran 3 bulan terakhir",
  "🍔 Berapa habis untuk makan minggu ini?",
  "💸 Berapa boros saya bulan ini?",
  "🏦 Rekap transfer keluar bulan ini",
  "💰 Rata-rata pengeluaran harian saya?",
  "🎯 Berapa bisa menabung bulan ini?",
  "📋 Ringkasan keuangan lengkap",
  "🔄 Rekap transfer & e-wallet",
];

const STORAGE_KEY = "dkmymoney_v3";
const SESSION_KEY = "dkmymoney_session_v3";
const BIOMETRIC_KEY = "dkmymoney_biometric_v3";

const defaultData = {
  profile: { name: "DK", email: "dk@example.com", phone: "08xx-xxxx-xxxx" },
  pin: "1234",
  biometricRegistered: false,
  transactions: [
    { id: 1, type: "keluar", cat: "Makan & Minum", ico: "🍔", desc: "Makan Siang", amt: -35000, date: "2026-04-24", time: "12:30" },
    { id: 2, type: "keluar", cat: "Transportasi", ico: "🚗", desc: "Grab ke Kantor", amt: -16000, date: "2026-04-24", time: "08:15" },
    { id: 3, type: "masuk", cat: "Gaji / Pemasukan", ico: "💵", desc: "Gaji April", amt: 5000000, date: "2026-04-23", time: "09:00" },
    { id: 4, type: "transfer", cat: "Transfer Bank", ico: "🏦", desc: "Transfer BCA → BRI", amt: -500000, date: "2026-04-23", time: "14:45" },
    { id: 5, type: "transfer", cat: "E-Wallet", ico: "💳", desc: "Top Up GoPay", amt: -57000, date: "2026-04-22", time: "10:00" },
    { id: 6, type: "keluar", cat: "Belanja", ico: "🛒", desc: "Alfamart", amt: -39000, date: "2026-04-22", time: "19:30" },
  ],
};

// ── STORAGE helpers ──────────────────────────────────────────────────────────
function loadData() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : { ...defaultData }; }
  catch { return { ...defaultData }; }
}
function saveData(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }
function isSessionActive() { try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; } }
function setSession(v) { try { if (v) sessionStorage.setItem(SESSION_KEY, "1"); else sessionStorage.removeItem(SESSION_KEY); } catch {} }

// ── BIOMETRIC via WebAuthn (proper register → authenticate flow) ──────────────
function getRP_ID() { if (typeof window==="undefined") return "localhost"; return window.location.hostname||"localhost"; }
const RP_NAME = "Dk.myMoney";

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function rnd(n) { const b = new Uint8Array(n); crypto.getRandomValues(b); return b; }

async function registerBiometric() {
  if (!window.PublicKeyCredential) throw new Error("WebAuthn tidak didukung browser ini");
  const userId = rnd(16);
  const challenge = rnd(32);
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { id: getRP_ID(), name: RP_NAME },
      user: { id: userId, name: "dk_user", displayName: "DK" },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
      timeout: 60000,
    },
  });
  // store credential id for later auth
  const credId = b64url(cred.rawId);
  localStorage.setItem(BIOMETRIC_KEY, credId);
  return credId;
}

async function authenticateBiometric() {
  if (!window.PublicKeyCredential) throw new Error("WebAuthn tidak didukung");
  const credId = localStorage.getItem(BIOMETRIC_KEY);
  if (!credId) throw new Error("BELUM_DAFTAR");
  const challenge = rnd(32);
  // decode stored id
  const rawId = Uint8Array.from(atob(credId.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: getRP_ID(),
      allowCredentials: [{ type: "public-key", id: rawId }],
      userVerification: "required",
      timeout: 60000,
    },
  });
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(loadData);
  const [loggedIn, setLoggedIn] = useState(isSessionActive);
  const [screen, setScreen] = useState("home");
  const [toast, setToast] = useState(null);

  useEffect(() => { saveData(data); }, [data]);

  const showToast = useCallback((msg, color = "#2ecc71") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const login = () => { setSession(true); setLoggedIn(true); showToast("✅ Login berhasil!"); };
  const logout = () => { setSession(false); setLoggedIn(false); setScreen("home"); };

  const updateData = useCallback((fn) => setData((d) => { const nd = fn(d); saveData(nd); return nd; }), []);

  if (!loggedIn) {
    return (
      <LoginScreen
        pin={data.pin}
        biometricRegistered={data.biometricRegistered}
        onLogin={login}
        onRegisterBiometric={async () => {
          try {
            await registerBiometric();
            updateData((d) => ({ ...d, biometricRegistered: true }));
            showToast("✅ Sidik jari berhasil didaftarkan!");
          } catch (e) {
            if (e.message === "BELUM_DAFTAR") showToast("⚠️ Daftar dulu sidik jari", "#f5a623");
            else if (e.name === "NotAllowedError") showToast("❌ Dibatalkan", "#e74c3c");
            else showToast("❌ " + e.message, "#e74c3c");
          }
        }}
        toast={toast}
        showToast={showToast}
      />
    );
  }

  return (
    <div style={S.wrap}>
      {toast && <Toast msg={toast.msg} color={toast.color} />}
      {screen === "home" && <HomeScreen data={data} onNav={setScreen} />}
      {screen === "add" && <AddScreen onSave={(tx) => { updateData((d) => ({ ...d, transactions: [{ ...tx, id: Date.now() }, ...d.transactions] })); showToast("✅ Transaksi disimpan!"); setScreen("home"); }} onBack={() => setScreen("home")} showToast={showToast} />}
      {screen === "history" && <HistoryScreen transactions={data.transactions} onEdit={(tx) => updateData((d) => ({ ...d, transactions: d.transactions.map((t) => t.id === tx.id ? tx : t) }))} onDelete={(id) => { updateData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) })); showToast("🗑️ Dihapus!", "#e74c3c"); }} onBack={() => setScreen("home")} showToast={showToast} />}
      {screen === "ai" && <AIScreen transactions={data.transactions} onBack={() => setScreen("home")} />}
      {screen === "profile" && <ProfileScreen data={data} onSaveProfile={(p) => { updateData((d) => ({ ...d, profile: p })); showToast("✅ Profil disimpan!"); }} onSavePin={(pin) => { updateData((d) => ({ ...d, pin })); showToast("🔒 PIN diperbarui!"); }} onLogout={logout} onBack={() => setScreen("home")} showToast={showToast} />}
      <NavBar screen={screen} onNav={setScreen} />
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({ pin, biometricRegistered, onLogin, onRegisterBiometric, toast, showToast }) {
  const [mode, setMode] = useState("bio");
  const [pinInput, setPinInput] = useState("");
  const [err, setErr] = useState("");
  const [bioLoading, setBioLoading] = useState(false);

  const doPin = () => {
    if (pinInput === pin) { setErr(""); onLogin(); }
    else { setErr("PIN salah. Coba lagi."); setPinInput(""); }
  };

  const doBiometric = async () => {
    if (!biometricRegistered) {
      // guide user to register first
      setErr("Sidik jari belum didaftarkan. Tap 'Daftar Sidik Jari' di bawah.");
      return;
    }
    setBioLoading(true); setErr("");
    try {
      await authenticateBiometric();
      onLogin();
    } catch (e) {
      if (e.name === "NotAllowedError") setErr("Dibatalkan atau sidik jari tidak cocok.");
      else setErr("Gagal: " + e.message);
    }
    setBioLoading(false);
  };

  const doRegister = async () => {
    setBioLoading(true); setErr("");
    try { await onRegisterBiometric(); }
    catch {}
    setBioLoading(false);
  };

  const append = (d) => { if (pinInput.length < 6) setPinInput((p) => p + d); };
  const back = () => setPinInput((p) => p.slice(0, -1));

  return (
    <div style={{ background: "#050e1f", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      {toast && <Toast msg={toast.msg} color={toast.color} />}

      <div style={{ background: "#0f2340", borderRadius: 24, padding: 28, width: "100%", maxWidth: 340, border: "1px solid #1e3a5f" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, background: "#f5a623", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#0a1628", margin: "0 auto 10px" }}>DK</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>Dk.<span style={{ color: "#f5a623" }}>my</span>Money</div>
          <div style={{ fontSize: 13, color: "#8ab", marginTop: 4 }}>Login ke akun Anda untuk melanjutkan</div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", background: "#0a1628", borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
          {[["bio", "☝️ Sidik Jari"], ["pin", "🔢 PIN"]].map(([m, l]) => (
            <button key={m} onClick={() => { setMode(m); setErr(""); setPinInput(""); }}
              style={{ flex: 1, background: mode === m ? "#1e4a8a" : "none", border: "none", color: mode === m ? "#4da6ff" : "#8ab", borderRadius: 9, padding: "8px 4px", fontSize: 12, cursor: "pointer", fontWeight: mode === m ? 600 : 400 }}>
              {l}
            </button>
          ))}
        </div>

        {mode === "bio" ? (
          <>
            {/* Fingerprint UI */}
            <div onClick={!bioLoading ? doBiometric : undefined}
              style={{ width: 90, height: 90, border: `2px solid ${bioLoading ? "#4da6ff" : biometricRegistered ? "#2ecc71" : "#1e3a5f"}`, borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", animation: bioLoading ? "pulse 1s infinite" : "none", transition: "border-color 0.3s" }}>
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <ellipse cx="22" cy="22" rx="13" ry="17" stroke={bioLoading ? "#4da6ff" : biometricRegistered ? "#2ecc71" : "#8ab"} strokeWidth="2" fill="none" />
                <path d="M15 22c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke={bioLoading ? "#4da6ff" : biometricRegistered ? "#2ecc71" : "#8ab"} strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M18 26c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke={bioLoading ? "#4da6ff" : biometricRegistered ? "#2ecc71" : "#8ab"} strokeWidth="2" strokeLinecap="round" fill="none" />
                <circle cx="22" cy="30" r="2" fill={bioLoading ? "#4da6ff" : biometricRegistered ? "#2ecc71" : "#8ab"} />
                {biometricRegistered && !bioLoading && (
                  <circle cx="34" cy="10" r="6" fill="#2ecc71" />
                )}
              </svg>
            </div>

            <div style={{ textAlign: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
                {bioLoading ? "Memindai..." : biometricRegistered ? "Tap untuk login sidik jari" : "Sidik jari belum didaftarkan"}
              </div>
              <div style={{ fontSize: 12, color: "#8ab", marginTop: 4 }}>
                {biometricRegistered ? "Tempelkan jari Anda pada sensor" : "Daftar dulu agar bisa login dengan jari"}
              </div>
            </div>

            {err && <div style={{ color: "#e74c3c", fontSize: 12, textAlign: "center", margin: "8px 0" }}>{err}</div>}

            <button onClick={doBiometric} disabled={bioLoading || !biometricRegistered}
              style={{ ...S.btnPrimary, width: "100%", marginBottom: 8, opacity: !biometricRegistered ? 0.4 : 1 }}>
              {bioLoading ? "⏳ Memindai..." : "☝️ Login Sidik Jari"}
            </button>

            {!biometricRegistered && (
              <button onClick={doRegister} disabled={bioLoading}
                style={{ ...S.btnSuccess, width: "100%", marginBottom: 8 }}>
                {bioLoading ? "⏳ Mendaftarkan..." : "➕ Daftar Sidik Jari"}
              </button>
            )}

            <button onClick={() => { setMode("pin"); setErr(""); }}
              style={{ ...S.btnOutline, width: "100%" }}>
              Gunakan PIN sebagai gantinya
            </button>

            {/* Info box */}
            <div style={{ background: "#0a1628", borderRadius: 10, padding: 10, marginTop: 12, fontSize: 11, color: "#8ab", lineHeight: 1.6 }}>
              ℹ️ <b style={{ color: "#4da6ff" }}>Cara pakai sidik jari:</b><br />
              1. Tap "Daftar Sidik Jari" → ikuti instruksi Android<br />
              2. Setelah terdaftar, tap ikon sidik jari untuk login
            </div>
          </>
        ) : (
          <>
            {/* PIN hint */}
            <div style={{ background: "#0a1628", borderRadius: 10, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#8ab", textAlign: "center" }}>
              PIN default: <b style={{ color: "#f5a623", letterSpacing: 4 }}>1234</b>
              <br /><span style={{ fontSize: 11 }}>Ganti PIN di menu Profil setelah login</span>
            </div>

            {/* Dots */}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: pinInput.length > i ? "#4da6ff" : "#1e3a5f", border: "1.5px solid #4da6ff", transition: "background 0.2s" }} />
              ))}
            </div>

            {/* Numpad */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "⌫"].map((d, i) => (
                <button key={i} onClick={() => d === "⌫" ? back() : d !== null ? append(String(d)) : null}
                  style={{ background: d === null ? "none" : "#0a1628", border: d === null ? "none" : "1px solid #1e3a5f", borderRadius: 14, padding: "15px 0", fontSize: 20, color: d === "⌫" ? "#4da6ff" : "#fff", cursor: d === null ? "default" : "pointer", fontWeight: 500 }}>
                  {d === null ? "" : d}
                </button>
              ))}
            </div>

            {err && <div style={{ color: "#e74c3c", fontSize: 12, textAlign: "center", marginBottom: 10 }}>{err}</div>}

            <button onClick={doPin} style={{ ...S.btnPrimary, width: "100%", marginBottom: 8, fontSize: 15 }}>Masuk</button>
            <button onClick={() => { setMode("bio"); setErr(""); setPinInput(""); }} style={{ ...S.btnOutline, width: "100%" }}>Gunakan Sidik Jari</button>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(77,166,255,0.5)} 50%{box-shadow:0 0 0 14px rgba(77,166,255,0)} }
      `}</style>
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function HomeScreen({ data, onNav }) {
  const txs = data.transactions;
  const totalMasuk = txs.filter((t) => t.amt > 0).reduce((s, t) => s + t.amt, 0);
  const totalKeluar = txs.filter((t) => t.amt < 0).reduce((s, t) => s + Math.abs(t.amt), 0);
  const saldo = totalMasuk - totalKeluar;
  const catMap = {};
  txs.filter((t) => t.amt < 0).forEach((t) => { catMap[t.cat] = (catMap[t.cat] || 0) + Math.abs(t.amt); });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maxVal = topCats[0]?.[1] || 1;

  return (
    <div style={S.screen}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 14px 0" }}>
        <div>
          <div style={{ fontSize: 11, color: "#8ab" }}>Smart Money Tracker</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Dk.<span style={{ color: "#f5a623" }}>my</span>Money</div>
        </div>
        <button style={S.badgeBtn}>📄 E-Statement</button>
      </div>

      {/* Balance */}
      <div style={{ margin: "12px 14px", background: "linear-gradient(135deg,#1a3a6e,#0f2340)", borderRadius: 20, padding: 18, border: "1px solid #1e3a5f" }}>
        <div style={{ fontSize: 11, color: "#8ab", marginBottom: 4 }}>SALDO TERSEDIA</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 14 }}>{fmtRp(saldo)}</div>
        <div style={{ display: "flex", gap: 24 }}>
          <div><div style={{ color: "#2ecc71", fontSize: 13, fontWeight: 600 }}>↑ {fmtRp(totalMasuk)}</div><div style={{ fontSize: 10, color: "#8ab" }}>Masuk</div></div>
          <div><div style={{ color: "#e74c3c", fontSize: 13, fontWeight: 600 }}>↓ {fmtRp(totalKeluar)}</div><div style={{ fontSize: 10, color: "#8ab" }}>Keluar</div></div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, margin: "0 14px 12px" }}>
        {[{ ico: "➖", label: "Pengeluaran" }, { ico: "➕", label: "Pemasukan" }, { ico: "🔄", label: "Transfer" }, { label: "MoneyAI", ai: true }].map((item) => (
          <div key={item.label} onClick={() => onNav(item.ai ? "ai" : "add")}
            style={{ background: "#0f2340", borderRadius: 14, padding: "10px 4px", textAlign: "center", cursor: "pointer", border: "1px solid #1e3a5f" }}>
            {item.ai ? <MoneyAIIcon size={26} /> : <div style={{ fontSize: 20, marginBottom: 3 }}>{item.ico}</div>}
            <div style={{ fontSize: 10, color: item.ai ? "#4da6ff" : "#8ab", marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* AI Banner */}
      <div onClick={() => onNav("ai")} style={{ margin: "0 14px 12px", background: "#0f2340", borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", border: "1px solid #1e3a5f" }}>
        <MoneyAIIcon size={36} boxed />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Tanya MoneyAI</div>
          <div style={{ fontSize: 11, color: "#8ab" }}>"Berapa boros saya bulan ini?"</div>
        </div>
        <div style={{ color: "#4da6ff" }}>→</div>
      </div>

      {/* Top Spending */}
      <div style={{ margin: "0 14px 12px", background: "#0f2340", borderRadius: 16, padding: 14, border: "1px solid #1e3a5f" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 12 }}>📊 Pengeluaran Teratas</div>
        {topCats.map(([cat, val]) => {
          const c = CATEGORIES.find((x) => x.label === cat) || { ico: "⚙️" };
          return (
            <div key={cat} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: "#d0e8ff" }}>{c.ico} {cat}</span>
                <span style={{ color: "#fff", fontWeight: 600 }}>{fmtRp(val)}</span>
              </div>
              <div style={{ height: 3, background: "#1e3a5f", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${Math.round((val / maxVal) * 100)}%`, background: "linear-gradient(90deg,#4da6ff,#2d7de8)", borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent */}
      <div style={{ margin: "0 14px 4px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>🕐 Transaksi Terbaru</span>
        <span onClick={() => onNav("history")} style={{ fontSize: 12, color: "#4da6ff", cursor: "pointer" }}>Semua →</span>
      </div>
      {txs.slice(0, 4).map((t) => <TxRow key={t.id} tx={t} />)}
      <div style={{ height: 80 }} />
    </div>
  );
}

// ── MoneyAI Icon ──────────────────────────────────────────────────────────────
function MoneyAIIcon({ size = 24, boxed = false }) {
  const svg = (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="4" y="8" width="24" height="18" rx="4" stroke="#4da6ff" strokeWidth="2" fill="none" />
      <circle cx="11" cy="17" r="2" fill="#4da6ff" />
      <circle cx="21" cy="17" r="2" fill="#4da6ff" />
      <path d="M13 21s1 2 3 2 3-2 3-2" stroke="#4da6ff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M12 8V6M20 8V6" stroke="#4da6ff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
  if (!boxed) return svg;
  return <div style={{ width: size, height: size, background: "#1e4a8a", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{svg}</div>;
}

// ── ADD ───────────────────────────────────────────────────────────────────────

// ── HIERARCHICAL CATEGORY PICKER ─────────────────────────────────────────────
function HierarchicalCategoryPicker({ type, selected, onSelect }) {
  const [openGroup, setOpenGroup] = useState(null);
  const excludeForMasuk = ["Transfer Bank","E-Wallet","Makan & Minum","Transportasi","Belanja","Pakaian","Kesehatan","Hiburan","Pendidikan","Rumah & Properti","Tagihan & Utilitas","Tabungan & Investasi","Sosial & Keluarga","Bisnis","Lainnya"];
  const excludeForKeluar = ["Gaji / Pemasukan","Pemasukan Lainnya","Transfer Bank","E-Wallet"];
  const filteredTree = Object.entries(CAT_TREE).filter(([k]) => {
    const label = k.split(" ").slice(1).join(" ");
    if (type === "masuk") return !excludeForMasuk.includes(label);
    if (type === "keluar") return !excludeForKeluar.includes(label);
    return true;
  });
  return (
    <div style={{ padding:"0 14px 10px" }}>
      <div style={{ fontSize:11, color:"#8ab", marginBottom:6 }}>KATEGORI</div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {filteredTree.map(([k, subs]) => {
          const parts = k.split(" "); const ico = parts[0]; const label = parts.slice(1).join(" ");
          const isOpen = openGroup === k; const isSelected = selected && subs.includes(selected);
          return (
            <div key={k}>
              <div onClick={() => setOpenGroup(isOpen ? null : k)}
                style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", borderRadius:10,
                  background:isSelected?"#1e3a5f":"#0f1e35", border:`1px solid ${isSelected?"#4da6ff":isOpen?"#2d4a7a":"#1e3a5f"}`, cursor:"pointer" }}>
                <span style={{ fontSize:18 }}>{ico}</span>
                <span style={{ flex:1, fontSize:13, color:isSelected?"#4da6ff":"#fff" }}>{label}</span>
                {isSelected && <span style={{ fontSize:11, color:"#4da6ff" }}>✓ {selected}</span>}
                <span style={{ color:"#8ab", fontSize:12 }}>{isOpen?"▲":"▼"}</span>
              </div>
              {isOpen && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, padding:"8px 4px 4px 28px" }}>
                  {subs.map(sub => (
                    <div key={sub} onClick={() => { onSelect(sub); setOpenGroup(null); }}
                      style={{ padding:"5px 12px", borderRadius:20, fontSize:12, cursor:"pointer",
                        background:selected===sub?"#4da6ff":"#1e3a5f", color:selected===sub?"#fff":"#93c5fd",
                        border:`1px solid ${selected===sub?"#4da6ff":"#2d4a7a"}` }}>
                      {sub}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddScreen({ onSave, onBack, showToast }) {
  const now = new Date();
  const [type, setType] = useState("keluar");
  const [sub, setSub] = useState("bank");
  const [bankName, setBankName] = useState("BCA");
  const [ewalletName, setEwalletName] = useState("GoPay");
  const [amt, setAmt] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(now.toISOString().split("T")[0]);
  const [time, setTime] = useState(now.toTimeString().slice(0, 5));
  const [cat, setCat] = useState(null);
  const [showVoice, setShowVoice] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef(null);

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast("⚠️ Browser tidak mendukung voice input", "#f5a623"); return; }
    const rec = new SR();
    rec.lang = "id-ID"; rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      const numMatch = text.match(/(\d[\d.]*)\s*(ribu|rb|ratus|juta)?/i);
      if (numMatch) {
        let val = parseFloat(numMatch[1].replace(/\./g, ""));
        if (/juta/i.test(numMatch[2])) val *= 1000000;
        else if (/ribu|rb/i.test(numMatch[2])) val *= 1000;
        setAmt(String(Math.round(val)));
      }
      const d = text.replace(/(\d[\d.]*\s*(ribu|rb|ratus|juta)?)/gi, "").replace(/\s+/g, " ").trim();
      if (d) setDesc(d.charAt(0).toUpperCase() + d.slice(1));
      setListening(false);
      showToast("🎤 Suara dikenali!");
    };
    rec.onerror = () => { setListening(false); showToast("❌ Gagal mengenali suara", "#e74c3c"); };
    rec.onend = () => setListening(false);
    recRef.current = rec; rec.start(); setListening(true); setTranscript("");
  };

  const resolvedCat = cat || (type === "transfer" ? (sub === "bank" ? "Transfer Bank" : "E-Wallet") : type === "masuk" ? "Gaji / Pemasukan" : null);
  const resolvedIco = CATEGORIES.find((c) => c.label === resolvedCat)?.ico || "⚙️";
  const finalAmt = type === "masuk" ? Math.abs(Number(amt)) : -Math.abs(Number(amt));

  const save = () => {
    if (!amt || isNaN(Number(amt)) || Number(amt) <= 0) { showToast("⚠️ Masukkan nominal yang valid", "#f5a623"); return; }
    if (!resolvedCat) { showToast("⚠️ Pilih kategori", "#f5a623"); return; }
    const d = desc || (type === "transfer" ? (sub === "bank" ? `Transfer ${bankName}` : `Top Up ${ewalletName}`) : "");
    onSave({ type, cat: resolvedCat, ico: resolvedIco, desc: d, amt: finalAmt, date, time });
  };

  const catFilter = type === "masuk"
    ? CATEGORIES.filter((c) => ["Gaji / Pemasukan", "Hadiah", "Bisnis", "Lainnya"].includes(c.label))
    : type === "transfer" ? []
    : CATEGORIES.filter((c) => !["Gaji / Pemasukan", "Transfer Bank", "E-Wallet"].includes(c.label));

  return (
    <div style={S.screen}>
      <div style={S.hdr}><span onClick={onBack} style={S.back}>←</span><span style={S.hdrT}>Tambah Transaksi</span></div>

      {/* Type */}
      <div style={{ display: "flex", gap: 6, padding: "12px 14px 8px" }}>
        {[["keluar","Pengeluaran"],["masuk","Pemasukan"],["transfer","Transfer"]].map(([v,l]) => (
          <button key={v} onClick={() => { setType(v); setCat(null); }}
            style={{ flex:1, background: type===v?"#1e4a8a":"none", border:`1px solid ${type===v?"#4da6ff":"#1e3a5f"}`, color:type===v?"#4da6ff":"#8ab", borderRadius:12, padding:"8px 0", fontSize:11, cursor:"pointer" }}>
            {l}
          </button>
        ))}
      </div>

      {/* Transfer sub */}
      {type === "transfer" && (
        <div style={{ padding: "0 14px 8px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[["bank","🏦 Bank"],["ewallet","💳 E-Wallet"]].map(([v,l]) => (
              <div key={v} onClick={() => setSub(v)} style={{ ...S.chip, ...(sub===v?S.chipOn:{}) }}>{l}</div>
            ))}
          </div>
          <div style={S.irow}>
            {sub === "bank"
              ? <select value={bankName} onChange={(e) => setBankName(e.target.value)} style={S.sel}>{BANKS.map((b) => <option key={b}>{b}</option>)}</select>
              : <select value={ewalletName} onChange={(e) => setEwalletName(e.target.value)} style={S.sel}>{EWALLETS.map((b) => <option key={b}>{b}</option>)}</select>}
          </div>
        </div>
      )}

      {/* Amount */}
      <div style={{ ...S.irow, margin: "0 14px 8px" }}>
        <span style={{ color:"#8ab", fontSize:13 }}>Rp</span>
        <input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0" style={{ ...S.inp, fontSize:20, fontWeight:700 }} />
      </div>

      {/* Desc */}
      <div style={{ ...S.irow, margin:"0 14px 8px" }}>
        <span>📝</span>
        <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Keterangan" style={S.inp} />
      </div>

      {/* Date & time */}
      <div style={{ display:"flex", gap:6, margin:"0 14px 8px" }}>
        <div style={{ ...S.irow, margin:0, flex:1 }}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...S.inp, fontSize:12 }} /></div>
        <div style={{ ...S.irow, margin:0, flex:1 }}><input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...S.inp, fontSize:12 }} /></div>
      </div>

      {/* Category - Hierarchical */}
      {catFilter.length > 0 && (
        <HierarchicalCategoryPicker
          type={type}
          selected={cat}
          onSelect={(c) => setCat(c)}
        />
      )}

      {/* Transcript */}
      {transcript && <div style={{ margin:"0 14px 8px", background:"#0a1628", borderRadius:10, padding:"8px 12px", fontSize:12, color:"#4da6ff" }}>🎤 "{transcript}"</div>}

      {/* Input via */}
      <div style={{ padding:"4px 14px", fontSize:11, color:"#8ab" }}>INPUT VIA</div>
      <div style={{ display:"flex", gap:8, padding:"4px 14px 12px" }}>
        <button onClick={() => { setShowVoice(true); startVoice(); }} style={S.iconBtn} title="Voice Note">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4da6ff" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </button>
        <button onClick={() => setShowCamera(true)} style={S.iconBtn} title="Foto Struk">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4da6ff" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </button>
        <button onClick={save} style={{ ...S.btnPrimary, flex:1 }}>Simpan Transaksi</button>
      </div>

      {/* Voice modal */}
      {showVoice && (
        <div style={S.overlay}>
          <div style={S.sheet}>
            <div style={{ textAlign:"center", paddingBottom:16 }}>
              <div style={{ width:64, height:64, borderRadius:"50%", background:"#1e4a8a", margin:"0 auto 12px", display:"flex", alignItems:"center", justifyContent:"center", animation:listening?"pulse 1s infinite":"none" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4da6ff" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
              </div>
              <div style={{ color:"#fff", fontSize:14, fontWeight:500 }}>{listening?"Bicara sekarang...":"Siap merekam"}</div>
              <div style={{ color:"#8ab", fontSize:12, marginTop:4 }}>Contoh: "Makan siang 35 ribu" atau "Gaji 5 juta"</div>
              {transcript && <div style={{ color:"#4da6ff", fontSize:12, marginTop:8 }}>"{transcript}"</div>}
              <div style={{ display:"flex", gap:6, justifyContent:"center", marginTop:12 }}>
                {[20,30,15,25,10].map((h,i) => (
                  <div key={i} style={{ width:4, background:"#4da6ff", borderRadius:2, height:listening?h:6, transition:"height 0.3s" }} />
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => { recRef.current?.stop(); setShowVoice(false); }} style={{ ...S.btnOutline, flex:1 }}>Batal</button>
              <button onClick={() => setShowVoice(false)} style={{ ...S.btnPrimary, flex:1 }}>Selesai</button>
            </div>
          </div>
        </div>
      )}

      {/* Camera modal */}
      {showCamera && (
        <div style={S.overlay}>
          <div style={S.sheet}>
            <div style={{ textAlign:"center", paddingBottom:16 }}>
              <div style={{ width:100, height:130, border:"2px dashed #4da6ff", borderRadius:12, margin:"0 auto 12px", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4da6ff" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="3,9 21,9"/><line x1="9" y1="3" x2="9" y2="9"/></svg>
                <div style={{ fontSize:10, color:"#8ab" }}>Struk belanja</div>
              </div>
              <div style={{ color:"#fff", fontSize:14, fontWeight:500 }}>Foto Struk Belanja</div>
              <div style={{ color:"#8ab", fontSize:12, marginTop:4 }}>AI akan membaca total & detail transaksi</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setShowCamera(false)} style={{ ...S.btnOutline, flex:1 }}>Batal</button>
              <label style={{ ...S.btnPrimary, flex:1, textAlign:"center", cursor:"pointer" }}>
                📷 Ambil Foto
                <input type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={(e) => {
                  if (e.target.files[0]) {
                    showToast("📷 AI sedang memproses struk...", "#f5a623");
                    setShowCamera(false); showToast("📸 Foto struk diupload! Isi nominal secara manual ya.");
                  }
                }} />
              </label>
            </div>
          </div>
        </div>
      )}

      <div style={{ height:80 }} />
      <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(77,166,255,0.4)}50%{box-shadow:0 0 0 12px rgba(77,166,255,0)}}`}</style>
    </div>
  );
}

// ── HISTORY ───────────────────────────────────────────────────────────────────
function HistoryScreen({ transactions, onEdit, onDelete, onBack, showToast }) {
  const [filter, setFilter] = useState("all");
  const [editTx, setEditTx] = useState(null);
  const filtered = transactions.filter((t) =>
    filter === "all" ? true : filter === "masuk" ? t.amt > 0 : filter === "keluar" ? t.type === "keluar" : t.type === "transfer"
  );

  return (
    <div style={S.screen}>
      <div style={S.hdr}><span onClick={onBack} style={S.back}>←</span><span style={S.hdrT}>Riwayat Transaksi</span></div>
      <div style={{ display:"flex", gap:6, padding:"10px 14px 6px", overflowX:"auto" }}>
        {[["all","Semua"],["keluar","Pengeluaran"],["masuk","Pemasukan"],["transfer","Transfer"]].map(([v,l]) => (
          <div key={v} onClick={() => setFilter(v)} style={{ ...S.chip, ...(filter===v?S.chipOn:{}), whiteSpace:"nowrap" }}>{l}</div>
        ))}
      </div>

      {filtered.length === 0 && <div style={{ textAlign:"center", color:"#8ab", padding:40, fontSize:13 }}>Tidak ada transaksi</div>}

      {filtered.map((t) => (
        <div key={t.id} style={{ padding:"10px 14px", borderBottom:"1px solid #0f2340", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"#0f2340", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{t.ico}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:500, color:"#fff" }}>{t.desc || t.cat}</div>
            <div style={{ fontSize:10, color:"#8ab" }}>{t.cat} • {t.date} <b style={{ color:"#4da6ff" }}>{t.time}</b></div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:13, fontWeight:600, color:t.amt>0?"#2ecc71":"#e74c3c" }}>{t.amt>0?"+":""}{fmtRp(t.amt)}</div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
              <span onClick={() => setEditTx({ ...t })} style={{ fontSize:11, color:"#4da6ff", cursor:"pointer" }}>✏️ Edit</span>
              <span onClick={() => { if (window.confirm("Hapus transaksi ini?")) onDelete(t.id); }} style={{ fontSize:11, color:"#e74c3c", cursor:"pointer" }}>🗑️</span>
            </div>
          </div>
        </div>
      ))}

      {editTx && (
        <div style={S.overlay}>
          <div style={S.sheet}>
            <div style={{ fontSize:14, fontWeight:600, color:"#fff", marginBottom:12 }}>✏️ Edit Transaksi</div>
            <div style={{ ...S.irow, margin:"0 0 8px" }}>
              <span style={{ color:"#8ab", fontSize:12 }}>Rp</span>
              <input type="number" value={Math.abs(editTx.amt)} onChange={(e) => setEditTx((t) => ({ ...t, amt:t.amt<0?-Number(e.target.value):Number(e.target.value) }))} style={{ ...S.inp, fontSize:16 }} />
            </div>
            <div style={{ ...S.irow, margin:"0 0 8px" }}>
              <span>📝</span>
              <input type="text" value={editTx.desc} onChange={(e) => setEditTx((t) => ({ ...t, desc:e.target.value }))} style={S.inp} />
            </div>
            <div style={{ display:"flex", gap:6, marginBottom:12 }}>
              <div style={{ ...S.irow, margin:0, flex:1 }}><input type="date" value={editTx.date} onChange={(e) => setEditTx((t) => ({ ...t, date:e.target.value }))} style={{ ...S.inp, fontSize:12 }} /></div>
              <div style={{ ...S.irow, margin:0, flex:1 }}><input type="time" value={editTx.time} onChange={(e) => setEditTx((t) => ({ ...t, time:e.target.value }))} style={{ ...S.inp, fontSize:12 }} /></div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setEditTx(null)} style={{ ...S.btnOutline, flex:1 }}>Batal</button>
              <button onClick={() => { onEdit(editTx); setEditTx(null); showToast("✏️ Transaksi diperbarui!"); }} style={{ ...S.btnPrimary, flex:1 }}>Simpan</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ height:80 }} />
    </div>
  );
}

// ── AI ────────────────────────────────────────────────────────────────────────
function AIScreen({ transactions, onBack }) {
  const [messages, setMessages] = useState([{ role:"ai", text:"Halo! Saya MoneyAI 👋\nAsisten keuangan pribadi kamu di Dk.myMoney. Tanya apa saja tentang transaksi, analisis pengeluaran, atau saran menabung ya!" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const ctx = () => {
    const masuk = transactions.filter((t) => t.amt > 0).reduce((s, t) => s + t.amt, 0);
    const keluar = transactions.filter((t) => t.amt < 0).reduce((s, t) => s + Math.abs(t.amt), 0);
    const cats = {};
    transactions.filter((t) => t.amt < 0).forEach((t) => { cats[t.cat] = (cats[t.cat] || 0) + Math.abs(t.amt); });
    const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
    return `Data keuangan user: Saldo ${fmtRp(masuk - keluar)}, Pemasukan ${fmtRp(masuk)}, Pengeluaran ${fmtRp(keluar)}, Kategori terboros: ${top?.[0]} (${fmtRp(top?.[1] || 0)}), Total ${transactions.length} transaksi.`;
  };

  const analyzeOffline = (q, txs) => {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0,7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().slice(0,7);
    const thisWeek = txs.filter(t => { const d = new Date(t.date); const diff = (now-d)/(1000*60*60*24); return diff<=7; });
    const monthTx = txs.filter(t => t.date?.startsWith(thisMonth));
    const lastMonthTx = txs.filter(t => t.date?.startsWith(lastMonth));
    const masuk = txs.filter(t=>t.amt>0).reduce((s,t)=>s+t.amt,0);
    const keluar = txs.filter(t=>t.amt<0).reduce((s,t)=>s+Math.abs(t.amt),0);
    const saldo = masuk - keluar;
    const monthKeluar = monthTx.filter(t=>t.amt<0).reduce((s,t)=>s+Math.abs(t.amt),0);
    const monthMasuk = monthTx.filter(t=>t.amt>0).reduce((s,t)=>s+t.amt,0);
    const lastMonthKeluar = lastMonthTx.filter(t=>t.amt<0).reduce((s,t)=>s+Math.abs(t.amt),0);
    const cats = {}; txs.filter(t=>t.amt<0).forEach(t=>{cats[t.cat]=(cats[t.cat]||0)+Math.abs(t.amt);});
    const topCat = Object.entries(cats).sort((a,b)=>b[1]-a[1]);
    const weekKeluar = thisWeek.filter(t=>t.amt<0).reduce((s,t)=>s+Math.abs(t.amt),0);
    const makanCat = txs.filter(t=>t.amt<0&&(t.cat?.includes("Makan")||t.cat?.includes("Minum"))).reduce((s,t)=>s+Math.abs(t.amt),0);
    const avgHarian = txs.length>0 ? keluar/30 : 0;
    const q2 = q.toLowerCase();

    if (q2.includes("analisis") || q2.includes("pengeluaran bulan ini")) {
      return `📊 *Analisis Bulan ${now.toLocaleString("id-ID",{month:"long"})}*

💸 Total pengeluaran: ${fmtRp(monthKeluar)}
💰 Total pemasukan: ${fmtRp(monthMasuk)}
📈 Saldo bulan ini: ${fmtRp(monthMasuk-monthKeluar)}

🔥 Kategori terbesar:
${topCat.slice(0,3).map((c,i)=>`${i+1}. ${c[0]}: ${fmtRp(c[1])}`).join("
")}

${monthKeluar>monthMasuk?"⚠️ Pengeluaran melebihi pemasukan bulan ini! Perlu dikurangi.":"✅ Keuangan bulan ini masih terkendali."}`;
    }
    if (q2.includes("bulan lalu vs") || q2.includes("bulan lalu")) {
      const selisih = monthKeluar - lastMonthKeluar;
      return `📅 *Perbandingan Pengeluaran*

Bulan ini: ${fmtRp(monthKeluar)}
Bulan lalu: ${fmtRp(lastMonthKeluar)}

${selisih>0?`📈 Naik ${fmtRp(selisih)} (${lastMonthKeluar>0?Math.round(selisih/lastMonthKeluar*100):0}%) dari bulan lalu`:`📉 Turun ${fmtRp(Math.abs(selisih))} dari bulan lalu — Bagus!`}`;
    }
    if (q2.includes("boros") || q2.includes("terboros")) {
      return `🔥 *Kategori Terboros*

${topCat.slice(0,5).map((c,i)=>`${["🥇","🥈","🥉","4️⃣","5️⃣"][i]} ${c[0]}: ${fmtRp(c[1])}`).join("
")}

💡 Coba kurangi pengeluaran di kategori teratas untuk menghemat lebih banyak.`;
    }
    if (q2.includes("saran") || q2.includes("hemat")) {
      const potensialHemat = topCat[0]?.[1]*0.2||0;
      return `💡 *Saran Hemat MoneyAI*

1. Kurangi ${topCat[0]?.[0]||"pengeluaran terbesar"} 20% → hemat ${fmtRp(potensialHemat)}/bulan
2. Siapkan anggaran harian: ${fmtRp(avgHarian)}
3. Catat semua transaksi rutin agar mudah dikontrol
4. Target tabungan minimal 10% dari pemasukan: ${fmtRp(monthMasuk*0.1)}
5. Review pengeluaran setiap minggu`;
    }
    if (q2.includes("menabung") || q2.includes("tabungan")) {
      const bisa = monthMasuk - monthKeluar;
      return `🎯 *Potensi Tabungan*

Pemasukan: ${fmtRp(monthMasuk)}
Pengeluaran: ${fmtRp(monthKeluar)}

${bisa>0?`✅ Kamu bisa menabung ${fmtRp(bisa)} bulan ini!

💰 Saran:
- Tabungan darurat: ${fmtRp(bisa*0.5)}
- Investasi: ${fmtRp(bisa*0.3)}
- Bebas pakai: ${fmtRp(bisa*0.2)}`:"⚠️ Bulan ini pengeluaran melebihi pemasukan. Perlu dikurangi dulu sebelum bisa menabung."}`;
    }
    if (q2.includes("minggu") || q2.includes("minggu ini")) {
      return `📆 *Pengeluaran 7 Hari Terakhir*

Total: ${fmtRp(weekKeluar)}
Rata-rata/hari: ${fmtRp(weekKeluar/7)}

${thisWeek.filter(t=>t.amt<0).slice(0,5).map(t=>`• ${t.desc||t.cat}: ${fmtRp(Math.abs(t.amt))}`).join("
")||"Belum ada transaksi minggu ini."}`;
    }
    if (q2.includes("makan")) {
      return `🍔 *Pengeluaran Makan & Minum*

Total keseluruhan: ${fmtRp(makanCat)}
Bulan ini: ${fmtRp(monthTx.filter(t=>t.amt<0&&t.cat?.includes("Makan")).reduce((s,t)=>s+Math.abs(t.amt),0))}

💡 Rata-rata makan per hari: ${fmtRp(makanCat/30)}`;
    }
    if (q2.includes("rata-rata") || q2.includes("harian")) {
      return `📊 *Rata-rata Pengeluaran Harian*

Rata-rata: ${fmtRp(avgHarian)}/hari
Total pengeluaran: ${fmtRp(keluar)}
Total transaksi: ${txs.filter(t=>t.amt<0).length} transaksi

${avgHarian>100000?"💡 Cukup tinggi. Coba buat anggaran harian maksimal.":"✅ Masih dalam batas wajar."}`;
    }
    if (q2.includes("tren") || q2.includes("3 bulan")) {
      return `📈 *Tren Pengeluaran*

Bulan ini: ${fmtRp(monthKeluar)}
Bulan lalu: ${fmtRp(lastMonthKeluar)}
Total keseluruhan: ${fmtRp(keluar)}

${monthKeluar>lastMonthKeluar?"📈 Tren naik — perlu diwaspadai":"📉 Tren turun — pertahankan!"}`;
    }
    if (q2.includes("ringkasan") || q2.includes("rekap")) {
      return `📋 *Ringkasan Keuangan*

💰 Saldo: ${fmtRp(saldo)}
📥 Total Masuk: ${fmtRp(masuk)}
📤 Total Keluar: ${fmtRp(keluar)}
📊 Transaksi: ${txs.length}

🏆 Top kategori:
${topCat.slice(0,3).map((c,i)=>`${i+1}. ${c[0]}: ${fmtRp(c[1])}`).join("
")}`;
    }
    if (q2.includes("transfer")) {
      const transfers = txs.filter(t=>t.cat?.includes("Transfer")||t.cat?.includes("E-Wallet"));
      return `🏦 *Rekap Transfer*

Total transfer: ${fmtRp(transfers.filter(t=>t.amt<0).reduce((s,t)=>s+Math.abs(t.amt),0))}
Jumlah transaksi: ${transfers.length}

${transfers.slice(0,5).map(t=>`• ${t.desc||t.cat}: ${fmtRp(Math.abs(t.amt))}`).join("
")||"Belum ada transfer."}`;
    }
    return `🤖 *MoneyAI*

Saldo kamu saat ini: ${fmtRp(saldo)}
Total pengeluaran bulan ini: ${fmtRp(monthKeluar)}

Coba tanya:
• "Analisis pengeluaran saya"
• "Kategori terboros"
• "Saran hemat"
• "Berapa bisa menabung?"
• "Pengeluaran minggu ini"`;
  };

  const send = async (text) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role:"user", text }]);
    setInput(""); setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const reply = analyzeOffline(text, transactions);
    setMessages((m) => [...m, { role:"ai", text: reply }]);
    setLoading(false);
  };

  return (
    <div style={{ ...S.screen, display:"flex", flexDirection:"column" }}>
      <div style={S.hdr}>
        <span onClick={onBack} style={S.back}>←</span>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}><MoneyAIIcon size={22} /><span style={S.hdrT}>MoneyAI</span></div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"8px 14px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom:10, display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            <div style={{ background:m.role==="user"?"#1e4a8a":"#0f2340", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", padding:"10px 14px", maxWidth:"80%", fontSize:13, color:"#fff", lineHeight:1.6, border:"1px solid #1e3a5f", whiteSpace:"pre-wrap" }}>{m.text}</div>
          </div>
        ))}
        {loading && <div style={{ display:"flex", gap:4, padding:12 }}>{[0,1,2].map((i) => <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"#4da6ff", animation:`bounce 0.8s ${i*0.2}s infinite` }} />)}</div>}
        <div ref={endRef} />
      </div>

      <div style={{ display:"flex", gap:6, padding:"6px 14px", overflowX:"auto" }}>
        {AI_PROMPTS.map((p) => <div key={p} onClick={() => send(p)} style={{ ...S.chip, whiteSpace:"nowrap", fontSize:11 }}>{p}</div>)}
      </div>

      <div style={{ display:"flex", gap:8, padding:"8px 14px 12px" }}>
        <div style={{ ...S.irow, margin:0, flex:1, borderRadius:24 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key==="Enter"&&send(input)} placeholder="Tanya MoneyAI..." style={{ ...S.inp, fontSize:13 }} />
        </div>
        <button onClick={() => send(input)} style={{ ...S.btnPrimary, padding:"0 16px" }}>→</button>
      </div>
      <div style={{ height:70 }} />
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
function ProfileScreen({ data, onSaveProfile, onSavePin, onLogout, onBack, showToast }) {
  const [ep, setEp] = useState({ ...data.profile });
  const [showPin, setShowPin] = useState(false);
  const [oldPin, setOldPin] = useState(""); const [newPin, setNewPin] = useState(""); const [confPin, setConfPin] = useState("");
  const [bioRegistered, setBioRegistered] = useState(!!localStorage.getItem(BIOMETRIC_KEY));

  const savePin = () => {
    if (oldPin !== data.pin) { showToast("❌ PIN lama salah", "#e74c3c"); return; }
    if (newPin.length < 4) { showToast("⚠️ PIN minimal 4 digit", "#f5a623"); return; }
    if (newPin !== confPin) { showToast("❌ Konfirmasi tidak cocok", "#e74c3c"); return; }
    onSavePin(newPin); setShowPin(false); setOldPin(""); setNewPin(""); setConfPin("");
  };

  const doRegisterBio = async () => {
    try { await registerBiometric(); setBioRegistered(true); showToast("✅ Sidik jari berhasil didaftarkan!"); }
    catch (e) { showToast("❌ " + (e.name === "NotAllowedError" ? "Dibatalkan" : e.message), "#e74c3c"); }
  };

  const doRemoveBio = () => { localStorage.removeItem(BIOMETRIC_KEY); setBioRegistered(false); showToast("🗑️ Sidik jari dihapus", "#f5a623"); };

  return (
    <div style={S.screen}>
      <div style={S.hdr}><span onClick={onBack} style={S.back}>←</span><span style={S.hdrT}>Profil Akun</span></div>

      <div style={{ textAlign:"center", padding:"20px 14px 10px" }}>
        <div style={{ width:72, height:72, background:"#f5a623", borderRadius:18, margin:"0 auto 10px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:700, color:"#0a1628" }}>
          {ep.name.slice(0,2).toUpperCase()}
        </div>
        <div style={{ fontSize:16, fontWeight:600, color:"#fff" }}>{ep.name}</div>
        <div style={{ fontSize:12, color:"#8ab" }}>{ep.email}</div>
      </div>

      {/* Profile edit */}
      <div style={{ margin:"0 14px 12px", background:"#0f2340", borderRadius:16, padding:14, border:"1px solid #1e3a5f" }}>
        <div style={{ fontSize:12, color:"#4da6ff", marginBottom:10, fontWeight:600 }}>INFORMASI AKUN</div>
        {[["👤 Nama","name","text"],["📧 Email","email","email"],["📱 Telepon","phone","tel"]].map(([label,key,type]) => (
          <div key={key} style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, color:"#8ab", marginBottom:4 }}>{label}</div>
            <div style={S.irow}>
              <input type={type} value={ep[key]} onChange={(e) => setEp((p) => ({ ...p, [key]:e.target.value }))} style={S.inp} />
            </div>
          </div>
        ))}
        <button onClick={() => onSaveProfile(ep)} style={{ ...S.btnPrimary, width:"100%" }}>Simpan Profil</button>
      </div>

      {/* Security */}
      <div style={{ margin:"0 14px 12px", background:"#0f2340", borderRadius:16, padding:14, border:"1px solid #1e3a5f" }}>
        <div style={{ fontSize:12, color:"#4da6ff", marginBottom:10, fontWeight:600 }}>KEAMANAN</div>

        {/* PIN */}
        <div onClick={() => setShowPin(!showPin)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", padding:"8px 0", borderBottom:"1px solid #1e3a5f" }}>
          <div style={{ fontSize:13, color:"#fff" }}>🔢 Ganti PIN</div>
          <div style={{ color:"#8ab" }}>{showPin?"▲":"▼"}</div>
        </div>
        {showPin && (
          <div style={{ paddingTop:10 }}>
            {[["PIN Lama",oldPin,setOldPin],["PIN Baru (min. 4 digit)",newPin,setNewPin],["Konfirmasi PIN Baru",confPin,setConfPin]].map(([label,val,setter]) => (
              <div key={label} style={{ marginBottom:8 }}>
                <div style={{ fontSize:11, color:"#8ab", marginBottom:4 }}>{label}</div>
                <div style={S.irow}><input type="password" value={val} onChange={(e) => setter(e.target.value)} placeholder="••••••" maxLength={6} style={S.inp} /></div>
              </div>
            ))}
            <button onClick={savePin} style={{ ...S.btnPrimary, width:"100%" }}>Simpan PIN Baru</button>
          </div>
        )}

        {/* Biometric */}
        <div style={{ paddingTop:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div>
              <div style={{ fontSize:13, color:"#fff" }}>☝️ Sidik Jari</div>
              <div style={{ fontSize:11, color: bioRegistered?"#2ecc71":"#e74c3c" }}>{bioRegistered?"✅ Terdaftar":"❌ Belum terdaftar"}</div>
            </div>
            {bioRegistered
              ? <button onClick={doRemoveBio} style={{ ...S.btnOutline, fontSize:12, padding:"6px 12px", color:"#e74c3c", borderColor:"#e74c3c" }}>Hapus</button>
              : <button onClick={doRegisterBio} style={{ ...S.btnSuccess, fontSize:12, padding:"6px 12px" }}>Daftar</button>}
          </div>
          <div style={{ background:"#0a1628", borderRadius:8, padding:"8px 10px", fontSize:11, color:"#8ab", lineHeight:1.6 }}>
            ℹ️ Setelah mendaftar sidik jari, kamu bisa login tanpa PIN. Sensor sidik jari harus sudah dikonfigurasi di pengaturan Android.
          </div>
        </div>
      </div>

      <div style={{ padding:"0 14px 16px" }}>
        <button onClick={onLogout} style={{ ...S.btnOutline, width:"100%", color:"#e74c3c", borderColor:"#e74c3c" }}>🚪 Logout</button>
      </div>
      <div style={{ height:80 }} />
    </div>
  );
}

// ── SHARED ────────────────────────────────────────────────────────────────────
function TxRow({ tx }) {
  return (
    <div style={{ padding:"10px 14px", borderBottom:"1px solid #0f2340", display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ width:36, height:36, borderRadius:10, background:"#0f2340", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{tx.ico}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:500, color:"#fff" }}>{tx.desc||tx.cat}</div>
        <div style={{ fontSize:10, color:"#8ab" }}>{tx.cat} • {tx.date} <b style={{ color:"#4da6ff" }}>{tx.time}</b></div>
      </div>
      <div style={{ fontSize:13, fontWeight:600, color:tx.amt>0?"#2ecc71":"#e74c3c" }}>{tx.amt>0?"+":""}{fmtRp(tx.amt)}</div>
    </div>
  );
}

function NavBar({ screen, onNav }) {
  const items = [
    { id:"home", label:"Home", icon:(a) => <svg width="20" height="20" viewBox="0 0 24 24" fill={a?"#4da6ff":"none"} stroke={a?"#4da6ff":"#8ab"} strokeWidth="2"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><polyline points="9 21 9 12 15 12 15 21"/></svg> },
    { id:"history", label:"Riwayat", icon:(a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"#4da6ff":"#8ab"} strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    { id:"add", label:"", icon:() => <div style={{ width:48, height:48, background:"#1e4a8a", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", marginTop:-16, border:"3px solid #0a1628" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4da6ff" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div> },
    { id:"ai", label:"MoneyAI", icon:() => <MoneyAIIcon size={22} /> },
    { id:"profile", label:"Profil", icon:(a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"#4da6ff":"#8ab"} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
  ];
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, maxWidth:480, margin:"0 auto", background:"#0a1628", borderTop:"1px solid #1e3a5f", display:"flex", padding:"8px 0 6px", zIndex:100 }}>
      {items.map((item) => (
        <button key={item.id} onClick={() => onNav(item.id)} style={{ flex:1, background:"none", border:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:"pointer", padding:"2px 0" }}>
          {item.icon(screen === item.id)}
          {item.label && <span style={{ fontSize:10, color:screen===item.id?"#4da6ff":"#8ab" }}>{item.label}</span>}
        </button>
      ))}
    </div>
  );
}

function Toast({ msg, color }) {
  return (
    <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:color||"#2ecc71", color:"#fff", padding:"10px 20px", borderRadius:24, fontSize:13, fontWeight:500, zIndex:9999, whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,0.4)", maxWidth:"90vw", textAlign:"center" }}>
      {msg}
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const S = {
  wrap:{ background:"#0a1628", minHeight:"100vh", maxWidth:480, margin:"0 auto", color:"#fff", position:"relative" },
  screen:{ background:"#0a1628", minHeight:"100vh", overflowY:"auto" },
  hdr:{ display:"flex", alignItems:"center", gap:10, padding:"14px 14px 0" },
  hdrT:{ fontSize:16, fontWeight:600, color:"#fff" },
  back:{ color:"#4da6ff", cursor:"pointer", fontSize:20 },
  irow:{ background:"#0f2340", borderRadius:12, padding:"10px 12px", display:"flex", alignItems:"center", gap:8, border:"1px solid #1e3a5f" },
  inp:{ background:"none", border:"none", color:"#fff", fontSize:14, flex:1, outline:"none" },
  sel:{ background:"none", border:"none", color:"#fff", fontSize:13, flex:1, outline:"none" },
  chip:{ background:"#0f2340", border:"1px solid #1e3a5f", borderRadius:20, padding:"6px 12px", fontSize:12, color:"#8ab", cursor:"pointer" },
  chipOn:{ background:"#1e4a8a", borderColor:"#4da6ff", color:"#4da6ff" },
  btnPrimary:{ background:"#1e4a8a", border:"none", color:"#4da6ff", borderRadius:12, padding:"11px 16px", fontSize:13, cursor:"pointer", fontWeight:500 },
  btnOutline:{ background:"none", border:"1px solid #1e3a5f", color:"#8ab", borderRadius:12, padding:"11px 16px", fontSize:13, cursor:"pointer" },
  btnSuccess:{ background:"#0f4a2a", border:"none", color:"#2ecc71", borderRadius:12, padding:"11px 16px", fontSize:13, cursor:"pointer", fontWeight:500 },
  badgeBtn:{ background:"#1e4a8a", border:"none", borderRadius:10, padding:"6px 12px", fontSize:12, color:"#4da6ff", cursor:"pointer" },
  iconBtn:{ width:44, height:44, borderRadius:"50%", background:"#1e3a5f", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 },
  overlay:{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"flex-end", zIndex:200 },
  sheet:{ background:"#0f2340", borderRadius:"20px 20px 0 0", padding:20, width:"100%", maxWidth:480, margin:"0 auto", border:"1px solid #1e3a5f" },
};
