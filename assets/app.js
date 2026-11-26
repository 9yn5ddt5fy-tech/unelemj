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

  const img = p => (p.photos && p.photos[0] ? `${p.s}/${p.photos[0]}` : "");
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
    return `<a class="bc" href="${esc(p.s)}/"><span class="im">${img(p) ? `<img src="${esc(img(p))}" alt="" loading="lazy">` : `<span class="ph">${icon(p.category)}</span>`}
      ${r ? `<span class="badge${r === 1 ? " no1" : ""}">#${r} ${esc(p.category)}</span>` : ""}</span>
      <span class="dot">${esc(p.category)}</span><b>${esc(p.name)}</b><span class="ln">${rateLine(p)} · ${esc(p.location || "")}</span></a>`; };
  const rowCard = (p, n) => `<a class="card pc" href="${esc(p.s)}/"><span>${n ? `<span class="rk num">#${n}</span>` : `<span class="dot">${esc(p.category)}</span>`}<b>${esc(p.name)}</b>
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
    const near = ranked(PL.filter(p => !region || p.region === region)).concat(PL.filter(p => (!region || p.region === region) && !st(p).count));
    const tagCounts = {};
    PL.forEach(p => Object.entries(st(p).tags || {}).forEach(([t, n]) => { if (!NEG.includes(t)) tagCounts[t] = (tagCounts[t] || 0) + n; }));
    const themes = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    $("v-home").innerHTML = `
      <div class="cats">${Object.keys(CATS).map(c => { const n = PL.filter(p => p.category === c).length;
        return `<a class="cat${n ? "" : " off"}" href="#search" data-cat="${esc(c)}"><i>${icon(c)}</i><span>${esc(c)}</span><small>${n ? n + " газар" : "Удахгүй"}</small></a>`; }).join("")}</div>
      <a class="card adcard" href="#biz"><span><span class="label">Үнэлэмжийн зар</span><b>Таны бизнес энд харагдах уу?</b><span class="ln">Газраа үнэгүй бүртгүүлж, зочдын сэтгэгдэлд хариулаарай.</span></span><span class="arrow">→</span></a>
      ${sec("Шилдэг үнэлгээтэй", "Зочдын үнэлгээгээр", `<a class="more" href="#top">Бүх эрэмбэ</a>`, ranked(PL).length ? `<div class="shelf">${ranked(PL).slice(0, 8).map(bigCard).join("")}</div>` : empty(loaded ? "Одоогоор үнэлгээ алга." : "Ачааллаж байна…"))}
      ${sec("Ойролцоо", "Аймаг, дүүргээр", regions.length > 1 ? `<select id="region" aria-label="Байршил"><option value="">Бүх газар</option>${regions.map(r => `<option${r === region ? " selected" : ""}>${esc(r)}</option>`).join("")}</select>` : "",
        near.length ? `<div class="shelf">${near.map(bigCard).join("")}</div>` : empty("Энэ байршилд одоогоор газар алга."))}
      ${themes.length ? sec("Сэдвээр", "Зочдын хамгийн их онцолсон зүйлсээр", "", `<div class="tags">${themes.map(([t, n]) => `<a class="tg" href="#search" data-tag="${esc(t)}">${esc(t)} <b class="num">${n}</b></a>`).join("")}</div>`) : ""}
      ${sec("Сүүлийн сэтгэгдлүүд", "", "", recent.length ? `<div class="revs feed">${recent.slice(0, 6).map(({ r, p }) => { const nm = r.author || "Зочин";
        return `<div class="rv"><div class="who"><span class="av">${esc(nm[0])}</span><span><b>${esc(nm)}</b><small>${date(r.created_at)}</small></span></div>
        <a class="card" href="${esc(p.s)}/"><span class="t"><span class="dot">${esc(p.name)}</span><span class="st">${stars(r.rating)}</span><p>${esc(r.body)}</p></span>${img(p) ? `<img src="${esc(img(p))}" alt="" loading="lazy">` : ""}</a></div>`; }).join("")}</div>` : empty(loaded ? "Сэтгэгдэл одоогоор алга." : "Ачааллаж байна…"))}`;
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
    $("sres").innerHTML = `<p class="cnt">${sorted.length} газар</p><div class="revs">${sorted.map(p => rowCard(p)).join("")}</div>
      ${!sorted.length ? empty(`“${esc(raw || scat || stag)}” Үнэлэмжид одоогоор алга.`) : ""}
      ${q.length >= 2 ? `<div class="card soon"><b>Google-ээс хайх удахгүй</b><p>Удахгүй энд Google Maps-ийн газрууд шууд гарч ирнэ. Хэн ч газар гараар нэмэх шаардлагагүй болно.</p></div>` : ""}`;
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
    const by = s => PL.find(p => p.s === s);
    const cats = new Set(rv.map(x => (by(x.s) || {}).category).filter(Boolean));
    const badges = [["Анхны алхам", "1 үнэлгээ", "1", rv.length >= 1], ["Идэвхтэн", "5 үнэлгээ", "5", rv.length >= 5], ["Шүүмжлэгч", "20 үнэлгээ", "20", rv.length >= 20], ["Олон талт", "3 ангилалд", "3", cats.size >= 3]];
    $("v-me").innerHTML = `<div class="ttl"><h1>${esc(name || "Би")}</h1><p>Энэ төхөөрөмж дээр хийсэн зүйлс. Бүртгэл удахгүй нэмэгдэнэ.</p></div>
      <div class="card kv"><div><b class="num">${rv.length}</b><span>Үнэлгээ</span></div><div><b class="num">${sv.length}</b><span>Хадгалсан</span></div><div><b class="num">${cats.size}</b><span>Ангилал</span></div></div>
      <section class="sec"><div class="sh"><h2>Тэмдэг</h2></div><div class="badges">${badges.map(([t, d, s, on]) => `<div class="bd${on ? "" : " off"}"><span class="b">${s}</span><b>${t}</b><small>${d}</small></div>`).join("")}</div></section>
      <section class="sec"><div class="sh"><h2>Хадгалсан</h2></div>${sv.length ? `<div class="revs">${sv.map(by).filter(Boolean).map(p => rowCard(p)).join("")}</div>` : empty("Газрын хуудсан дээрх ♡ товчоор хадгална.")}</section>
      <section class="sec"><div class="sh"><h2>Миний үнэлсэн</h2></div>${rv.length ? `<div class="revs">${rv.map(x => { const p = by(x.s); return p ? `<a class="card pc" href="${esc(p.s)}/"><span><span class="dot">${esc(p.category)}</span><b>${esc(p.name)}</b><span class="ln"><span class="st">${stars(x.r)}</span> · ${esc(x.d)}</span></span>${img(p) ? `<img src="${esc(img(p))}" alt="">` : ""}</a>` : ""; }).join("")}</div>` : empty("Та одоогоор үнэлгээ өгөөгүй байна.")}</section>
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
  });
  $("q").addEventListener("input", search);
  window.addEventListener("hashchange", go);
  route();

  // ---------- data
  if (!UE.ready) return;
  Promise.all(PL.map(async p => {
    try {
      stats[p.s] = await UE.rpc("ue_place", { p_place: p.s }) || {};
      const rows = await UE.rpc("ue_reviews", { p_place: p.s, p_limit: 6 });
      rows.filter(r => r.body).forEach(r => recent.push({ r, p }));
    } catch (e) {}
  })).then(() => { recent.sort((a, b) => b.r.created_at.localeCompare(a.r.created_at)); loaded = true; route(); });
})();
