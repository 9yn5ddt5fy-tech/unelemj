// Үнэлэмж · tiny client for the Supabase ue_* functions (no library needed)
window.UE = (() => {
  const cfg = window.UE_API || {};
  const ready = !!(cfg.url && cfg.key);
  async function rpc(fn, args) {
    if (!ready) throw new Error("not_configured");
    const res = await fetch(cfg.url.replace(/\/$/, "") + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: cfg.key, Authorization: "Bearer " + cfg.key },
      body: JSON.stringify(args || {})
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) {
      const msg = (data && (data.message || data.hint)) || "error";
      const err = new Error(msg);
      err.code = msg;
      throw err;
    }
    return data;
  }
  function device() {
    let id = null;
    try { id = localStorage.getItem("ue-device"); } catch (e) {}
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now());
      try { localStorage.setItem("ue-device", id); } catch (e) {}
    }
    return id;
  }
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const date = s => { const d = new Date(s); return isNaN(d) ? "" : d.toISOString().slice(0, 10); };
  // Categories shown in the app (icon path in a 24×24 box)
  const CATS = {
    "Жуулчны бааз": "M12 4c5 0 9 3 9 6v1H3v-1c0-3 4-6 9-6zM4 12h16v8H4zm6 2v6h4v-6z",
    "Кафе": "M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zm13 1h2a2.5 2.5 0 0 1 0 5h-2v-2h2a.5.5 0 0 0 0-1h-2zM4 20h14v1.5H4z",
    "Хоол": "M7 2h1.5v7a2 2 0 0 1-1 1.7V22H6V10.7A2 2 0 0 1 5 9V2h1.5v6h.5zm9 0c2 0 3 2.5 3 6s-1 4-2 4.5V22h-1.5z",
    "Зочид буудал": "M3 20V6h2v8h6V9h7a3 3 0 0 1 3 3v8h-2v-3H5v3zm4-8a2 2 0 1 1 0-4 2 2 0 0 1 0 4z",
    "Эмнэлэг": "M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z",
    "Гоо сайхан": "M7 3a3 3 0 0 1 3 3c0 1-.5 2-1.3 2.5L12 12l3.3-3.5A3 3 0 1 1 17 9.8L13.4 13.5 19 21h-2.5L12 15l-4.5 6H5l5.6-7.5-3.6-3.7A3 3 0 0 1 7 3zm0 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm10 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
    "Дэлгүүр": "M5 7h14l-1 14H6zm3 0a4 4 0 0 1 8 0h-1.5a2.5 2.5 0 0 0-5 0z",
    "Төрийн үйлчилгээ": "M12 2 2 7v2h20V7zM4 10h3v8H4zm6.5 0h3v8h-3zM17 10h3v8h-3zM2 19h20v3H2z"
  };
  // What this device has done (no account yet): reviewed and saved places
  const mine = {
    get(k) { try { return JSON.parse(localStorage.getItem("ue-" + k) || "[]"); } catch (e) { return []; } },
    set(k, v) { try { localStorage.setItem("ue-" + k, JSON.stringify(v)); } catch (e) {} },
    add(k, item) { const l = mine.get(k).filter(x => (x.s || x) !== (item.s || item)); l.unshift(item); mine.set(k, l.slice(0, 200)); },
    // names of Google places this device saved or reviewed, so "Би" can list them without asking Google again
    name(k, n, c) { try { const m = JSON.parse(localStorage.getItem("ue-names") || "{}"); m[k] = { n, c }; localStorage.setItem("ue-names", JSON.stringify(m)); } catch (e) {} },
    names() { try { return JSON.parse(localStorage.getItem("ue-names") || "{}"); } catch (e) { return {}; } },
    toggle(k, s) { const l = mine.get(k); const has = l.includes(s); mine.set(k, has ? l.filter(x => x !== s) : [s, ...l]); return !has; }
  };
  return { ready, rpc, device, esc, date, CATS, mine };
})();
