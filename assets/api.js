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
  return { ready, rpc, device, esc, date };
})();
