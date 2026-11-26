// Үнэлэмж · one place page: summary, reviews, and the step-by-step review form
(() => {
  const slug = document.body.dataset.place;
  const info = (window.UE_PLACES || {})[slug] || {};
  const { esc, date } = UE;
  const $ = id => document.getElementById(id);
  const NEG = ["Удаан хүлээлгэдэг", "Үнэтэй", "Цэвэрлэгээ дутуу", "Ус, цахилгаан тасалдсан"];
  const MOOD = ["", "Муу байсан", "Дунд зэрэг", "Болж байна", "Сайн байсан", "Гайхалтай!"];
  const stars = n => { const r = Math.round(n || 0); return "★".repeat(r) + "☆".repeat(5 - r); };
  const fmt = n => (n ? Number(n).toFixed(1) : "–");
  let place = null, last = null, allowed = [];
  let toastT; const toast = m => { const t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2400); };

  // ---- static header from config
  function renderHead() {
    document.title = (info.name || slug) + " · Үнэлэмж";
    const ph = info.photos || [];
    if (ph[0]) $("herobg").style.backgroundImage = `url("${ph[0].replace(/"/g, "")}")`;
    $("gal").innerHTML = ph.length
      ? `<div class="gal${ph.length === 1 ? " one" : ""}">${ph.map((p, i) => `<img src="${esc(p)}" alt="${esc(info.name)} · зураг ${i + 1}" loading="${i ? "lazy" : "eager"}">`).join("")}</div>` : "";
    $("cat").textContent = info.category || "";
    $("name").textContent = info.name || slug;
    $("sub").textContent = info.location || "";
    $("about").textContent = info.about || "";
    $("aboutc").hidden = !info.about;
    chips();
  }
  function chips() {
    const f = [];
    if (place && place.count) f.push(`<span class="chip"><span class="st">★</span> <b class="num">${fmt(place.avg)}</b> · <span class="num">${place.count}</span> үнэлгээ</span>`);
    if (info.since) f.push(`<span class="chip">${esc(info.since)} оноос</span>`);
    if (info.season) f.push(`<span class="chip">${esc(info.season)}</span>`);
    if (info.phone) f.push(`<button class="chip" id="phone">${esc(info.phone)}</button>`);
    $("chips").innerHTML = f.join("");
    const pb = $("phone");
    if (pb) pb.onclick = () => { try { navigator.clipboard.writeText(info.phone).then(() => toast("Утасны дугаар хуулагдлаа"), () => {}); } catch (e) {} };
  }

  // ---- summary + reviews from the server
  async function loadSummary() {
    place = await UE.rpc("ue_place", { p_place: slug });
    if (!place) { $("sum").innerHTML = `<p class="empty">Энэ газар бүртгэлгүй байна.</p>`; $("open").disabled = true; return; }
    allowed = place.allowed_tags || [];
    const n = place.count || 0;
    if (!n) {
      $("sum").innerHTML = `<p class="empty">Одоогоор үнэлгээ алга. Анхны үнэлгээг та өгөөрэй.</p>`;
      $("tagblk").hidden = true;
      return;
    }
    const dist = place.dist || {};
    const max = Math.max(1, ...Object.values(dist));
    const crit = [["Үйлчилгээ", place.service], ["Цэвэр байдал", place.clean], ["Үнэ, чанар", place.value]].filter(c => c[1]);
    $("sum").innerHTML = `<div class="sum"><div class="big"><b class="num">${fmt(place.avg)}</b><span class="st">${stars(place.avg)}</span><br><small class="num">${n} үнэлгээ</small></div>
      <div class="dist">${[5, 4, 3, 2, 1].map(s => `<div class="dr"><span>${s}</span><span class="bar"><i style="width:${(dist[s] || 0) / max * 100}%"></i></span><span class="num">${dist[s] || 0}</span></div>`).join("")}</div></div>
      ${crit.length ? `<div class="crit">${crit.map(([l, v]) => `<div class="cr"><span>${l}</span><span class="bar"><i style="width:${v / 5 * 100}%"></i></span><em class="num">${fmt(v)}</em></div>`).join("")}</div>` : ""}`;
    chips();
    const tags = Object.entries(place.tags || {});
    $("tagblk").hidden = !tags.length;
    $("tags").innerHTML = tags.map(([t, c]) => `<span class="tg${NEG.includes(t) ? " neg" : ""}">${esc(t)} <b class="num">${c}</b></span>`).join("");
  }

  function revHtml(r) {
    const nm = r.author || "Зочин";
    return `<div class="rv"><div class="who"><span class="av">${esc(nm[0])}</span><span><b>${esc(nm)}</b><small>${date(r.created_at)}</small></span></div>
      <div class="card"><span class="stars">${stars(r.rating)}</span>
      ${r.body ? `<p>${esc(r.body)}</p>` : ""}
      ${r.tags && r.tags.length ? `<div class="tags">${r.tags.map(t => `<span class="tg${NEG.includes(t) ? " neg" : ""}">${esc(t)}</span>`).join("")}</div>` : ""}
      ${r.reply ? `<div class="reply"><b>Эзэмшигчийн хариу</b>${esc(r.reply)}</div>` : ""}</div></div>`;
  }
  async function loadReviews(more) {
    const rows = await UE.rpc("ue_reviews", { p_place: slug, p_before: more ? last : null, p_limit: 20 });
    if (!more) $("revs").innerHTML = "";
    if (!rows.length && !more) $("revs").innerHTML = `<div class="card"><p class="empty">Сэтгэгдэл одоогоор алга. Анхны сэтгэгдлийг та бичээрэй.</p></div>`;
    $("revs").insertAdjacentHTML("beforeend", rows.map(revHtml).join(""));
    if (rows.length) last = rows[rows.length - 1].id;
    $("more").hidden = rows.length < 20;
  }
  async function load() {
    if (!UE.ready) { $("sum").innerHTML = `<p class="empty">Сервер хараахан холбогдоогүй байна.</p>`; $("open").disabled = true; return; }
    try { await loadSummary(); await loadReviews(false); }
    catch (e) { $("sum").innerHTML = `<p class="empty">Ачааллахад алдаа гарлаа. Интернэтээ шалгаад хуудсыг дахин ачаална уу.</p>`; }
  }

  // ---- review form
  let F, STEPS = 4;
  const sheet = $("sheet"), q = $("fq"), nx = $("fnext");
  function openForm() { F = { step: 0, r: 0, s: 0, c: 0, v: 0, tags: [], t: "", name: "" }; try { F.name = localStorage.getItem("ue-name") || ""; } catch (e) {} sheet.hidden = false; document.body.style.overflow = "hidden"; render(); }
  function closeForm() { sheet.hidden = true; document.body.style.overflow = ""; }
  function render() {
    $("fprog").style.width = (Math.min(F.step, STEPS) / STEPS * 100) + "%";
    $("ferr").textContent = ""; nx.disabled = false; nx.textContent = "Үргэлжлүүлэх"; nx.hidden = false;
    if (F.step === 0) {
      q.innerHTML = `<span class="mute" style="font-weight:700">${esc(info.name || slug)}</span><h2>Ерөнхийдөө ямар байсан бэ?</h2>
        <div class="bs" id="bs">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-v="${i}" class="${i <= F.r ? "on" : ""}" aria-label="${i} од">★</button>`).join("")}</div><div class="mood">${MOOD[F.r]}</div>`;
      nx.disabled = !F.r;
    } else if (F.step === 1) {
      const mk = (k, l) => `<div class="mini"><b>${l}</b><div class="s" data-k="${k}">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-v="${i}" class="${i <= F[k] ? "on" : ""}" aria-label="${l} ${i} од">★</button>`).join("")}</div></div>`;
      q.innerHTML = `<h2>Дэлгэрэнгүй</h2><span class="hint">Заавал биш. Алгасаж болно.</span><div>${mk("s", "Үйлчилгээ")}${mk("c", "Цэвэр байдал")}${mk("v", "Үнэ, чанар")}</div>`;
    } else if (F.step === 2) {
      const b = t => `<button type="button" class="${NEG.includes(t) ? "neg" : ""}${F.tags.includes(t) ? " on" : ""}" data-t="${esc(t)}">${esc(t)}</button>`;
      q.innerHTML = `<h2>Юу санаанд үлдсэн бэ?</h2><span class="pl">Сайн тал</span><div class="pick">${allowed.filter(t => !NEG.includes(t)).map(b).join("")}</div>
        <span class="pl">Сайжруулах</span><div class="pick">${allowed.filter(t => NEG.includes(t)).map(b).join("")}</div>`;
    } else if (F.step === 3) {
      q.innerHTML = `<h2>Бусдад зөвлөгөө</h2>
        <label class="f">Сэтгэгдэл<textarea class="inp" id="ft" maxlength="1000" placeholder="Юу сайн байсан, юуг сайжруулах вэ?">${esc(F.t)}</textarea></label>
        <label class="f">Нэр (заавал биш)<input class="inp" id="fn" type="text" maxlength="40" placeholder="Жишээ нь: Болд" value="${esc(F.name)}"></label>
        <label class="hp" aria-hidden="true">Вэб сайт<input id="fhp" tabindex="-1" autocomplete="off"></label>
        <span class="hint">Сэтгэгдэл нийтэд харагдана. Утас, хаяг зэрэг хувийн мэдээлэл бүү бичээрэй.</span>`;
      nx.textContent = "Илгээх";
    } else {
      q.innerHTML = `<div class="done"><div class="ok">✓</div><h2>Баярлалаа!</h2><p class="mute">Таны үнэлгээ нийтлэгдлээ.</p></div>`;
      nx.textContent = "Хаах";
    }
  }
  async function submit() {
    if ($("fhp") && $("fhp").value) { F.step = 4; return render(); } // bot trap
    nx.disabled = true; nx.textContent = "Илгээж байна…";
    try {
      await UE.rpc("ue_submit", { p_place: slug, p_device: UE.device(), p_rating: F.r, p_service: F.s || null, p_clean: F.c || null, p_value: F.v || null, p_tags: F.tags, p_body: F.t.trim(), p_author: F.name.trim() });
      try { if (F.name.trim()) localStorage.setItem("ue-name", F.name.trim()); } catch (e) {}
      F.step = 4; render(); last = null; load();
    } catch (e) {
      const m = { too_soon: "Та энэ газарт өнөөдөр аль хэдийн үнэлгээ өгсөн байна. Маргааш дахин оролдоно уу.", too_many: "Энэ сүлжээнээс өнөөдөр хэт олон үнэлгээ ирсэн байна. Маргааш дахин оролдоно уу." }[e.code];
      $("ferr").textContent = m || "Илгээж чадсангүй. Интернэтээ шалгаад дахин оролдоно уу.";
      nx.disabled = false; nx.textContent = "Дахин илгээх";
    }
  }
  nx.onclick = () => { if (F.step === 3) return submit(); if (F.step === 4) return closeForm(); F.step++; render(); };
  $("fx").onclick = closeForm;
  q.addEventListener("click", e => {
    const b = e.target.closest("#bs [data-v]"); if (b) { F.r = +b.dataset.v; return render(); }
    const m = e.target.closest("[data-k] [data-v]"); if (m) { F[m.parentNode.dataset.k] = +m.dataset.v; return render(); }
    const t = e.target.closest("[data-t]"); if (t) { const v = t.dataset.t; F.tags = F.tags.includes(v) ? F.tags.filter(x => x !== v) : [...F.tags, v]; t.classList.toggle("on"); }
  });
  q.addEventListener("input", e => { if (e.target.id === "ft") F.t = e.target.value; if (e.target.id === "fn") F.name = e.target.value; });
  $("open").onclick = openForm;
  $("more").onclick = () => loadReviews(true).catch(() => toast("Ачааллахад алдаа гарлаа"));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !sheet.hidden) closeForm(); });

  renderHead(); load();
  if (location.hash === "#review") setTimeout(() => { if (!$("open").disabled) openForm(); }, 600);
})();
