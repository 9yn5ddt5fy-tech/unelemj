// Үнэлэмж · the app shell on the home page: Нүүр, Хайх, Шилдэг, Би, Бизнес.
// Everything shown comes from real places (config.js) and real reviews (Supabase).
// Nothing here is invented: a section with no data says so instead of filling in.
(() => {
  const { esc, date, CATS, mine } = UE;
  const $ = id => document.getElementById(id);
  const PL = Object.entries(window.UE_PLACES || {}).map(([s, p]) => ({ s, ...p }));
  const NEG = ["Удаан хүлээлгэдэг", "Үнэтэй", "Цэвэрлэгээ дутуу", "Ус, цахилгаан тасалдсан"];
  const stats = {}, recent = [];
  let loaded = false, scat = "", stag = "", lbCat = "", region = "";
  try { region = localStorage.getItem("ue-region") || ""; } catch (e) {}

  const img = p => (p.g ? p.photo || "" : p.photos && p.photos[0] ? `${p.s}/${p.photos[0]}` : "");
  const href = p => (p.g ? `p/?g=${encodeURIComponent(p.g)}` : p.db ? `p/?id=${encodeURIComponent(p.s)}` : `${p.s}/`);
  const icon = c => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${CATS[c] || CATS["Дэлгүүр"]}"/></svg>`;
  const st = p => stats[p.s] || {};
  const fmt = n => (n ? Number(n).toFixed(1) : "–");
  const stars = n => "★".repeat(Math.round(n || 0)) + "☆".repeat(5 - Math.round(n || 0));
  // ranking: a Bayesian average, so one 5★ review cannot beat a well-reviewed place
  const mean = () => { let a = 0, n = 0; PL.forEach(p => { const d = st(p); if (d.count) { a += d.avg * d.count; n += d.count; } }); return n ? a / n : 4; };
  const score = (p, m) => { const d = st(p); return d.count ? (10 * m + d.avg * d.count) / (10 + d.count) : 0; };
  const ranked = (list) => { const m = mean(); return list.filter(p => st(p).count).sort((a, b) => score(b, m) - score(a, m)); };
  const rankIn = p => ranked(PL.filter(x => x.category === p.category)).indexOf(p) + 1;
  const rateLine = p => { const d = st(p); return d.count ? `<span class="r"><span class="st">★</span> ${fmt(d.avg)}</span> · ${d.count} үнэлгээ` : (loaded ? "Анхны үнэлгээг та өгөөрэй" : "…"); };

  // ---------- pieces
  const bigCard = p => { const r = rankIn(p);
    return `<a class="bc" href="${esc(href(p))}"><span class="im">${img(p) ? `<img src="${esc(img(p))}" alt="" loading="lazy">` : `<span class="ph">${icon(p.category)}</span>`}
      ${r ? `<span class="badge${r === 1 ? " no1" : ""}">#${r} ${esc(p.category)}</span>` : ""}</span>
      <span class="dot">${esc(p.category)}</span><b>${esc(p.name)}</b><span class="ln">${rateLine(p)} · ${esc(p.location || "")}</span></a>`; };
  const rowCard = (p, n) => `<a class="card pc" href="${esc(href(p))}"><span>${n ? `<span class="rk num">#${n}</span>` : `<span class="dot">${esc(p.category)}</span>`}<b>${esc(p.name)}</b>
      <span class="ln">${rateLine(p)}</span><span class="ln">${esc([p.location, p.region].filter(Boolean).join(" · "))}</span></span>
      ${img(p) ? `<img src="${esc(img(p))}" alt="" loading="lazy">` : `<span class="ph">${icon(p.category)}</span>`}</a>`;
  const empty = t => `<div class="card"><p class="empty">${t}</p></div>`;
  const sec = (t, sub, more, body) => `<section class="sec"><div class="sh"><div><h2>${t}</h2>${sub ? `<p>${sub}</p>` : ""}</div>${more || ""}</div>${body}</section>`;

  // ---------- Нүүр
  function home() {
    const top = ranked(PL)[0] || PL[0];
    if (top && img(top)) $("herobg").style.backgroundImage = `url("${img(top).replace(/"/g, "")}")`;
    const d = top ? st(top) : {};
    $("hero-in").innerHTML = top ? `<span class="label">Онцлох · ${esc(top.category)}</span><h1>${esc(top.name)}</h1><p class="sub">${esc([top.location, top.region].filter(Boolean).join(" · "))}</p>
      <div class="chips">${d.count ? `<span class="chip"><span class="st">★</span> <b class="num">${fmt(d.avg)}</b> · ${d.count} үнэлгээ</span>` : ""}${top.since ? `<span class="chip">${esc(top.since)} оноос</span>` : ""}</div>
      <a class="btn" href="${esc(top.s)}/">Үзэх, үнэлгээ өгөх</a>` : `<h1>Үнэлэмж</h1><p class="sub">Газар, үйлчилгээний бодит үнэлгээ</p>`;
    const regions = [...new Set(PL.map(p => p.region).filter(Boolean))];
    const near = ranked(PL.filter(p => !region || p.region === region)).concat(PL.filter(p => (!region || p.region === region) && !st(p).count && !p.db));
    const tagCounts = {};
    PL.forEach(p => Object.entries(st(p).tags || {}).forEach(([t, n]) => { if (!NEG.includes(t)) tagCounts[t] = (tagCounts[t] || 0) + n; }));
    const themes = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    $("v-home").innerHTML = `
      <div class="cats">${Object.keys(CATS).map(c => { const n = PL.filter(p => p.category === c && (!p.db || st(p).count)).length;
        return `<a class="cat${n ? "" : " off"}" href="#search" data-cat="${esc(c)}"><i>${icon(c)}</i><span>${esc(c)}</span><small>${n ? n + " газар" : "Удахгүй"}</small></a>`; }).join("")}</div>
      <a class="card adcard" href="#biz"><span><span class="label">Үнэлэмжийн зар</span><b>Таны бизнес энд харагдах уу?</b><span class="ln">Газраа үнэгүй бүртгүүлж, зочдын сэтгэгдэлд хариулаарай.</span></span><span class="arrow">→</span></a>
      ${sec("Шилдэг үнэлгээтэй", "Зочдын үнэлгээгээр", `<a class="more" href="#top">Бүх эрэмбэ</a>`, ranked(PL).length ? `<div class="shelf">${ranked(PL).slice(0, 8).map(bigCard).join("")}</div>` : empty(loaded ? "Одоогоор үнэлгээ алга." : "Ачааллаж байна…"))}
      ${sec("Ойролцоо", "Аймаг, дүүргээр", regions.length > 1 ? `<select id="region" aria-label="Байршил"><option value="">Бүх газар</option>${regions.map(r => `<option${r === region ? " selected" : ""}>${esc(r)}</option>`).join("")}</select>` : "",
        near.length ? `<div class="shelf">${near.map(bigCard).join("")}</div>` : empty("Энэ байршилд одоогоор газар алга."))}
      ${themes.length ? sec("Сэдвээр", "Зочдын хамгийн их онцолсон зүйлсээр", "", `<div class="tags">${themes.map(([t, n]) => `<a class="tg" href="#search" data-tag="${esc(t)}">${esc(t)} <b class="num">${n}</b></a>`).join("")}</div>`) : ""}
      ${sec("Сүүлийн сэтгэгдлүүд", "", "", recent.length ? `<div class="revs feed">${recent.slice(0, 6).map(({ r, p }) => { const nm = r.author || "Зочин";
        return `<div class="rv"><div class="who"><span class="av">${esc(nm[0])}</span><span><b>${esc(nm)}</b><small>${date(r.created_at)}</small></span></div>
        <a class="card" href="${esc(href(p))}"><span class="t"><span class="dot">${esc(p.name)}</span><span class="st">${stars(r.rating)}</span><p>${esc(r.body)}</p></span>${img(p) ? `<img src="${esc(img(p))}" alt="" loading="lazy">` : ""}</a></div>`; }).join("")}</div>` : empty(loaded ? "Сэтгэгдэл одоогоор алга." : "Ачааллаж байна…"))}`;
    const rs = $("region"); if (rs) rs.onchange = () => { region = rs.value; try { localStorage.setItem("ue-region", region); } catch (e) {} home(); };
  }

  // ---------- Хайх
  function search() {
    const raw = $("q").value.trim(), q = raw.toLowerCase();
    $("scats").innerHTML = ["", ...Object.keys(CATS)].map(c => `<button class="chip2${c === scat ? " on" : ""}" data-sc="${esc(c)}">${c ? esc(c) : "Бүгд"}</button>`).join("")
      + (stag ? `<button class="chip2 on" data-st="">${esc(stag)} ×</button>` : "");
    const l = PL.filter(p => (!scat || p.category === scat) && (!stag || (st(p).tags || {})[stag]) &&
      (!q || [p.name, p.category, p.location, p.region, p.about].join(" ").toLowerCase().includes(q)));
    const sorted = ranked(l).concat(l.filter(p => !st(p).count));
    $("sres").innerHTML = `<p class="cnt">Үнэлэмжид · ${sorted.length} газар</p><div class="revs">${sorted.map(p => rowCard(p)).join("")}</div>
      ${!sorted.length && !q ? empty(`“${esc(scat || stag)}” Үнэлэмжид одоогоор алга.`) : ""}
      <div id="gres"></div>`;
    gsearch(raw);
  }
  let gT, gQ = "";
  // OpenStreetMap search (free). Picking a result creates the place, then opens its page.
  function osearch(raw) {
    const box = $("gres");
    box.innerHTML = `<p class="cnt">Газрын зургаас хайж байна…</p>`;
    gT = setTimeout(async () => {
      gQ = raw;
      let res = [];
      try {
        const have = new Set(PL.map(p => p.osm).filter(Boolean));
        res = (await UEO.search(raw)).filter(r => !have.has(r.id) && (!scat || r.category === scat));
      } catch (e) { res = null; }
      if (gQ !== raw || !$("gres")) return;
      osmRes = res || [];
      $("gres").innerHTML = (res === null ? `<p class="cnt">Газрын зургаас хайж чадсангүй. Дахин оролдоно уу.</p>`
        : res.length ? `<p class="cnt">Газрын зургаас · ${res.length} газар</p><div class="revs">${res.map((r, i) => `<button class="card pc" data-osm="${i}" style="text-align:left;width:100%">
          <span><span class="dot">${esc(r.category)}</span><b>${esc(r.name)}</b><span class="ln">${esc(r.address)}</span><span class="ln gtag">Анхны үнэлгээг та өгөөрэй</span></span><span class="ph">${icon(r.category)}</span></button>`).join("")}</div>
          <p class="gattr">Газрын мэдээлэл: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-ийн хувь нэмэр оруулагчид</p>`
        : `<p class="cnt">Газрын зургаас олдсонгүй.</p>`) + addForm(raw);
    }, 450);
  }
  let osmRes = [];
  const addForm = raw => `<details class="card addp"${osmRes.length ? "" : " open"}><summary><b>Хайсан газар олдохгүй байна уу? Өөрөө нэмэх</b></summary>
    <form id="addf" class="addform"><label class="f">Нэр<input class="inp" id="an" maxlength="80" required value="${esc(raw)}"></label>
    <label class="f">Ангилал<select class="inp" id="ac">${[...Object.keys(CATS), "Бусад"].map(c => `<option${c === scat ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
    <label class="f">Байршил<input class="inp" id="al" maxlength="120" required placeholder="Жишээ нь: Баянзүрх дүүрэг, 13-р хороолол"></label>
    <p class="err" id="aerr"></p><button class="btn" type="submit">Нэмээд үнэлэх</button></form></details>`;
  async function pickOsm(i) {
    const r = osmRes[i]; if (!r) return;
    try { const s = await UE.rpc("ue_ensure_osm_place", { p_osm_id: r.id, p_name: r.name, p_category: r.category, p_location: r.address }); location.href = `p/?id=${encodeURIComponent(s)}#review`; }
    catch (e) { alertMsg("Газрыг нээж чадсангүй. Дахин оролдоно уу."); }
  }
  function alertMsg(m) { const t = document.createElement("p"); t.className = "cnt"; t.textContent = m; $("gres").prepend(t); }
  document.addEventListener("submit", async e => {
    if (e.target.id !== "addf") return;
    e.preventDefault();
    const err = $("aerr"); err.textContent = "";
    try { const s = await UE.rpc("ue_add_place", { p_name: $("an").value, p_category: $("ac").value, p_location: $("al").value }); location.href = `p/?id=${encodeURIComponent(s)}#review`; }
    catch (x) { err.textContent = { name: "Нэрээ 2-80 тэмдэгтээр бичнэ үү.", location: "Байршлаа бичнэ үү.", too_many: "Өнөөдөр хэт олон газар нэмсэн байна. Маргааш дахин оролдоно уу." }[x.code] || "Нэмж чадсангүй. Дахин оролдоно уу."; }
  });
  function gsearch(raw) {
    clearTimeout(gT);
    const box = $("gres"); if (!box) return;
    if (raw.length < 2) { box.innerHTML = ""; return; }
    if (!window.UEG || !UEG.ready) return osearch(raw);
    box.innerHTML = `<p class="cnt">Google Maps-ээс хайж байна…</p>`;
    gT = setTimeout(async () => {
      gQ = raw;
      try {
        const have = new Set(PL.map(p => p.g).filter(Boolean));
        const res = (await UEG.search(raw)).filter(r => !have.has(r.id) && (!scat || r.category === scat));
        if (gQ !== raw || !$("gres")) return;
        $("gres").innerHTML = res.length ? `<p class="cnt">Google Maps-ээс · ${res.length} газар</p><div class="revs">${res.map(r => `<a class="card pc" href="p/?g=${encodeURIComponent(r.id)}">
          <span><span class="dot">${esc(r.category)}</span><b>${esc(r.name)}</b><span class="ln">${esc(r.address)}</span><span class="ln gtag">Анхны үнэлгээг та өгөөрэй</span></span><span class="ph">${icon(r.category)}</span></a>`).join("")}</div>
          <p class="gattr">Хайлтын үр дүн: Google Maps</p>` : `<p class="cnt">Google Maps-ээс олдсонгүй.</p>`;
      } catch (e) { if ($("gres")) $("gres").innerHTML = `<p class="cnt">Google-ээс хайж чадсангүй. Дахин оролдоно уу.</p>`; }
    }, 450);
  }

  // ---------- Шилдэг
  function top() {
    const cats = Object.keys(CATS).filter(c => PL.some(p => p.category === c));
    if (!lbCat || !cats.includes(lbCat)) lbCat = cats[0] || "";
    $("v-top").innerHTML = `<div class="ttl"><h1>Шилдэг</h1><p>Ангилал бүр дотор зочдын үнэлгээгээр</p></div>
      <div class="chipsrow">${cats.map(c => `<button class="chip2${c === lbCat ? " on" : ""}" data-lb="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      <div class="revs">${ranked(PL.filter(p => p.category === lbCat)).map((p, i) => rowCard(p, i + 1)).join("") || empty(loaded ? "Энэ ангилалд үнэлгээтэй газар алга." : "Ачааллаж байна…")}</div>
      <p class="note" style="text-align:left">Эрэмбэ зөвхөн нэг ангилал дотор тооцогдоно. Цөөн үнэлгээтэй газар ганц 5 одоор тэргүүлж чадахгүй: үнэлгээний тоо, дундаж хоёулаа нөлөөлнө. Төлбөр эрэмбэд нөлөөлөхгүй.</p>`;
  }

  // ---------- Би
  function me() {
    const rv = mine.get("reviewed"), sv = mine.get("saved");
    let name = ""; try { name = localStorage.getItem("ue-name") || ""; } catch (e) {}
    const names = mine.names();
    const by = k => PL.find(p => p.s === k || "g:" + p.g === k || "id:" + p.s === k)
      || (k.startsWith("g:") ? { s: k, g: k.slice(2), name: (names[k] || {}).n || "Google-ийн газар", category: (names[k] || {}).c || "Бусад" }
      : k.startsWith("id:") ? { s: k.slice(3), db: true, name: (names[k] || {}).n || "Газар", category: (names[k] || {}).c || "Бусад" } : null);
    const cats = new Set(rv.map(x => (by(x.s) || {}).category).filter(Boolean));
    const badges = [["Анхны алхам", "1 үнэлгээ", "1", rv.length >= 1], ["Идэвхтэн", "5 үнэлгээ", "5", rv.length >= 5], ["Шүүмжлэгч", "20 үнэлгээ", "20", rv.length >= 20], ["Олон талт", "3 ангилалд", "3", cats.size >= 3]];
    $("v-me").innerHTML = `<div class="ttl"><h1>${esc(name || "Би")}</h1><p>Энэ төхөөрөмж дээр хийсэн зүйлс. Бүртгэл удахгүй нэмэгдэнэ.</p></div>
      <div class="card kv"><div><b class="num">${rv.length}</b><span>Үнэлгээ</span></div><div><b class="num">${sv.length}</b><span>Хадгалсан</span></div><div><b class="num">${cats.size}</b><span>Ангилал</span></div></div>
      <section class="sec"><div class="sh"><h2>Тэмдэг</h2></div><div class="badges">${badges.map(([t, d, s, on]) => `<div class="bd${on ? "" : " off"}"><span class="b">${s}</span><b>${t}</b><small>${d}</small></div>`).join("")}</div></section>
      <section class="sec"><div class="sh"><h2>Хадгалсан</h2></div>${sv.length ? `<div class="revs">${sv.map(by).filter(Boolean).map(p => rowCard(p)).join("")}</div>` : empty("Газрын хуудсан дээрх ♡ товчоор хадгална.")}</section>
      <section class="sec"><div class="sh"><h2>Миний үнэлсэн</h2></div>${rv.length ? `<div class="revs">${rv.map(x => { const p = by(x.s); if (p && x.n && !p.name) p.name = x.n; return p ? `<a class="card pc" href="${esc(href(p))}"><span><span class="dot">${esc(p.category)}</span><b>${esc(p.name)}</b><span class="ln"><span class="st">${stars(x.r)}</span> · ${esc(x.d)}</span></span>${img(p) ? `<img src="${esc(img(p))}" alt="">` : ""}</a>` : ""; }).join("")}</div>` : empty("Та одоогоор үнэлгээ өгөөгүй байна.")}</section>
      <a class="card adcard" href="#biz"><span><span class="label">Бизнес эрхэлдэг үү?</span><b>Байгууллагын хэсэг</b></span><span class="arrow">→</span></a>`;
  }

  // ---------- Бизнес
  function biz() {
    $("v-biz").innerHTML = `<div class="ttl"><h1>Бизнесүүдэд</h1><p>Зочдынхоо сэтгэгдлийг сонсож, хариулж, ангилалдаа хэддүгээрт явааг хараарай.</p></div>
      <div class="card rule"><span class="b">✓</span><div><b>Итгэлцлийн дүрэм</b><p>Төлбөр эрэмбэд нөлөөлөхгүй. Сөрөг сэтгэгдлийг устгахгүй, зөвхөн доромжлол, хувийн мэдээлэл, спамыг нууна. Сурталчилгаа үргэлж шошготой харагдана.</p></div></div>
      <section class="sec"><div class="sh"><h2>Багцууд</h2><p>Үнэ удахгүй зарлагдана</p></div><div class="revs">
        <div class="card plan"><span class="dot">Одоо нээлттэй</span><b>Үнэгүй</b><ul><li>Газрын хуудас, зочдын үнэлгээ</li><li>Сэтгэгдэлд хариулах</li><li>Үнэлгээ урих QR код</li></ul></div>
        <div class="card plan"><span class="dot">Удахгүй</span><b>Про</b><ul><li>Үзэлт, эрэмбийн өөрчлөлтийн самбар</li><li>Өрсөлдөгчидтэй харьцуулалт</li><li>Шинэ сэтгэгдлийн мэдэгдэл</li><li>Зураг, цэс, үнийн жагсаалт</li></ul></div>
        <div class="card plan"><span class="dot">Удахгүй</span><b>Премиум</b><ul><li>Нүүр хуудасны сурталчилгаа (шошготой)</li><li>Олон салбар нэг дор</li><li>Сарын тайлан</li></ul></div>
      </div></section>
      <a class="card adcard" href="admin/"><span><span class="label">Аль хэдийн бүртгэлтэй юу?</span><b>Эзэмшигчийн хэсэгт нэвтрэх</b></span><span class="arrow">→</span></a>`;
  }

  // ---------- routing (#search, #top, #me, #biz; empty = home)
  const VIEWS = ["home", "search", "top", "me", "biz"];
  function route() {
    const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "home";
    VIEWS.forEach(x => { $("v-" + x).hidden = x !== v; });
    $("hero").hidden = v !== "home";
    $("sbar").hidden = v !== "search";
    document.querySelectorAll("nav.tabs a").forEach(a => a.classList.toggle("on", a.dataset.v === v));
    ({ home, search, top, me, biz })[v]();
  }
  function go() { route(); window.scrollTo(0, 0); }
  document.addEventListener("click", e => {
    const c = e.target.closest("[data-cat]"); if (c) { scat = c.dataset.cat; stag = ""; $("q").value = ""; }
    const t = e.target.closest("[data-tag]"); if (t) { stag = t.dataset.tag; scat = ""; $("q").value = ""; }
    const sc = e.target.closest("[data-sc]"); if (sc) { scat = sc.dataset.sc; search(); }
    const sg = e.target.closest("[data-st]"); if (sg) { stag = ""; search(); }
    const lb = e.target.closest("[data-lb]"); if (lb) { lbCat = lb.dataset.lb; top(); }
    const os = e.target.closest("[data-osm]"); if (os) pickOsm(+os.dataset.osm);
  });
  $("q").addEventListener("input", search);
  window.addEventListener("hashchange", go);
  route();

  // ---------- data
  if (!UE.ready) return;
  (async () => {
    try {
      const rows = await UE.rpc("ue_places");
      const gs = [];
      rows.forEach(r => {
        stats[r.slug] = { count: +r.count, avg: r.avg == null ? null : +r.avg, tags: r.tags || {} };
        if (PL.some(p => p.s === r.slug)) return;
        if (r.google_id) { if (+r.count) gs.push({ s: r.slug, g: r.google_id, name: "", category: r.category, location: "", region: "" }); }
        else if (r.name) PL.push({ s: r.slug, db: true, osm: r.osm_id || "", name: r.name, category: r.category, location: r.location || "", region: "" });
      });
      if (window.UEG && UEG.ready) await Promise.all(gs.slice(0, 24).map(async p => {
        try { const d = await UEG.details(p.g); p.name = d.name; p.location = d.address; p.photo = (d.photos[0] || {}).url || ""; PL.push(p); } catch (e) {}
      }));
    } catch (e) {}
  })().then(() => Promise.all(PL.map(async p => {
    try {
      if (!stats[p.s]) stats[p.s] = await UE.rpc("ue_place", { p_place: p.s }) || {};
      const rows = await UE.rpc("ue_reviews", { p_place: p.s, p_limit: 6 });
      rows.filter(r => r.body).forEach(r => recent.push({ r, p }));
    } catch (e) {}
  }))).then(() => { recent.sort((a, b) => b.r.created_at.localeCompare(a.r.created_at)); loaded = true; route(); });
})();
