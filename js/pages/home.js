/* HOME */
{
  const C = window.Celestial, { $, $$, esc, attr } = C;
  let DATA = null, slideIdx = 0, autoT = null;

  /* ---------- banners ---------- */
  function slideHtml(b, i, s) {
    const link = b.link ? '<a class="btn btn-rose" href="' + attr(b.link) + '">' + esc(b.linkLabel || "ดูรายละเอียด") + "</a>" : "";
    const text = '<div class="bn-text"><span class="bn-kicker">' + esc(s.season || "") + "</span><h3>" + esc(b.title) + "</h3>" + (b.subtitle ? "<p>" + esc(b.subtitle) + "</p>" : "") + link + "</div>";
    const src = C.imgUrl(b.image);
    if (src) return '<div class="slide has-img" role="group" aria-label="' + (i + 1) + '"><img class="bn-img" src="' + attr(src) + '" alt="' + attr(b.title) + '" ' + (i ? 'loading="lazy"' : "") + ">" + (b.hideText ? "" : text) + "</div>";
    return '<div class="slide tone-' + attr(b.tone || "rose") + '" role="group" aria-label="' + (i + 1) + '"><div class="bn-art" aria-hidden="true"><img class="bn-moon" src="assets/img/moon.png" alt=""><span class="bn-ring"></span></div>' + text + "</div>";
  }
  function renderBanners(d) {
    const list = (d.banners || []).filter(b => b.active !== false).sort(C.byOrder);
    const track = $("#bannerTrack"), dots = $("#bDots");
    if (!list.length) { $("#banners").classList.add("hide"); return; }
    $("#banners").classList.remove("hide");
    track.innerHTML = list.map((b, i) => slideHtml(b, i, d.settings || {})).join("");
    dots.innerHTML = list.map((b, i) => '<button type="button" aria-label="แบนเนอร์ที่ ' + (i + 1) + '"' + (i === 0 ? ' class="on"' : "") + "></button>").join("");
    $("#banners").classList.toggle("single", list.length < 2);
    slideIdx = 0; startAuto();
  }
  function go(i) {
    const slides = $$("#bannerTrack .slide"); if (!slides.length) return;
    slideIdx = (i + slides.length) % slides.length;
    const tr = $("#bannerTrack"); tr.scrollTo({ left: slides[slideIdx].offsetLeft, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  function startAuto() {
    clearInterval(autoT);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    autoT = setInterval(() => { if (!document.hidden && !$("#banners").matches(":hover")) go(slideIdx + 1); }, 7000);
  }
  function setupBanners() {
    const tr = $("#bannerTrack");
    $("#bPrev").addEventListener("click", () => { go(slideIdx - 1); startAuto(); });
    $("#bNext").addEventListener("click", () => { go(slideIdx + 1); startAuto(); });
    $("#bDots").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; go([...b.parentNode.children].indexOf(b)); startAuto(); });
    tr.addEventListener("keydown", e => { if (e.key === "ArrowRight") { go(slideIdx + 1); e.preventDefault(); } if (e.key === "ArrowLeft") { go(slideIdx - 1); e.preventDefault(); } });
    let st; tr.addEventListener("scroll", () => {
      clearTimeout(st); st = setTimeout(() => {
        const w = tr.clientWidth || 1; slideIdx = Math.round(tr.scrollLeft / w);
        $$("#bDots button").forEach((b, i) => b.classList.toggle("on", i === slideIdx));
      }, 80);
    }, { passive: true });
  }

  /* ---------- current round feature ---------- */
  function renderFeature(d) {
    const s = d.settings || {}; const rounds = (d.rounds || []).slice().sort(C.byOrder);
    const r = rounds.find(x => x.id === s.currentRound) || rounds.find(x => x.status === "live") || rounds[0];
    const el = $("#feature"); if (!r) { el.classList.add("hide"); return; }
    const st = { live: '<span class="chip live">กำลังแข่งขัน</span>', done: '<span class="chip done">จบรอบแล้ว</span>', soon: '<span class="chip soon">เร็ว ๆ นี้</span>' }[r.status] || "";
    const src = C.imgUrl(r.banner);
    el.innerHTML = '<div class="feature-text"><span class="eyebrow">Recent — ' + esc(r.code) + "</span>" +
      '<h2 class="grad-title">【' + esc(r.title) + "】<br>" + esc((r.subtitle || "").split("—")[0].trim()) + "</h2>" +
      '<div class="feature-meta">' + st + '<span class="chip">' + esc(C.fmtRange(r.start, r.end)) + "</span>" + (r.deadline ? '<span class="chip">ส่งงาน ' + esc(C.fmtDate(r.deadline)) + "</span>" : "") + "</div>" +
      '<p class="lead">' + esc(r.summary) + "</p>" +
      '<div class="toolbar" style="margin-top:22px"><a class="btn btn-rose" href="rounds.html?r=' + encodeURIComponent(r.id) + '">ดูกติการอบนี้</a>' + (s.vote && s.vote.open ? '<a class="btn btn-ghost" href="vote.html">โหวตรอบนี้</a>' : "") + "</div></div>" +
      '<div class="feature-media">' + (src ? '<img src="' + attr(src) + '" alt="' + attr(r.title) + '">' : '<div class="round-art"><img src="assets/img/moon.png" alt=""><span>' + esc(r.code) + "</span><b>" + esc(r.title) + "</b></div>") + "</div>";
  }

  /* ---------- pulse ---------- */
  function renderPulse(d) {
    const today = C.parseISO(C.iso(new Date())); const cats = (d.settings.categories || []);
    const ev = (d.events || []).filter(e => C.parseISO(e.end || e.date) >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
    let evHtml = '<p class="muted">ยังไม่มีกิจกรรมที่กำลังจะมาถึง</p>';
    if (ev) {
      const start = C.parseISO(ev.date); const days = Math.round((start - today) / 864e5);
      const cat = cats.find(c => c.id === ev.category);
      evHtml = '<div class="big-num">' + (days > 0 ? days + "<small>วัน</small>" : "วันนี้") + "</div><strong>" + esc(ev.title) + '</strong><span class="muted">' + esc(C.fmtRange(ev.date, ev.end)) + (cat ? " — " + esc(cat.label) : "") + "</span>";
    }
    const v = d.settings.vote || {}; const total = d.tally ? d.tally.total : null;
    const act = (d.trainees || []).filter(t => t.status === "active");
    const outN = (d.trainees || []).filter(t => t.status === "eliminated" || t.status === "withdrawn").length;
    $("#pulse").innerHTML =
      '<a class="pulse-tile panel" href="calendar.html"><span class="eyebrow aqua th">กิจกรรมถัดไป</span>' + evHtml + "</a>" +
      '<a class="pulse-tile panel" href="vote.html"><span class="eyebrow th">สถานะโหวต</span><div class="big-num">' + (v.open ? "เปิด" : "ปิด") + "</div><strong>" + esc(v.title || "โหวตเด็กฝึก") + '</strong><span class="muted">' + (v.open ? (total != null ? "รวม " + total.toLocaleString("th-TH") + " โหวตในรอบนี้" : "โหวตได้วันละ 1 ครั้ง") : "ติดตามประกาศรอบถัดไป") + "</span></a>" +
      '<a class="pulse-tile panel" href="trainees.html"><span class="eyebrow aqua th">ยังอยู่ในการแข่งขัน</span><div class="big-num">' + act.length + '<small>คน</small></div><strong>' + (outN ? "ตกรอบหรือถอนตัวแล้ว " + outN + " คน" : "ยังไม่มีผู้ตกรอบ") + '</strong><span class="muted">จากทั้งหมด ' + (d.trainees || []).length + " คน</span></a>";
  }

  /* ---------- top 5 ---------- */
  function renderTop(d) {
    const rr = C.rankedRounds(d); const r = rr[rr.length - 1]; const prev = rr[rr.length - 2];
    if (!r) { $("#topSplit").innerHTML = '<div class="empty">ยังไม่มีการประกาศอันดับ</div>'; return; }
    $("#topLead").textContent = "อันดับหลังรอบ " + r.code + " " + r.title;
    const list = d.trainees.filter(t => C.rankIn(t, r.id)).sort((a, b) => C.rankIn(a, r.id) - C.rankIn(b, r.id)).slice(0, 5);
    $("#topSplit").innerHTML = '<div class="rank-panel panel"><div class="rk-top">' + list.map(t => {
      const now = C.rankIn(t, r.id), was = prev ? C.rankIn(t, prev.id) : null;
      const ch = was ? (was - now > 0 ? '<span class="up">▲' + (was - now) + "</span>" : was - now < 0 ? '<span class="down">▼' + (now - was) + "</span>" : '<span class="same">—</span>') : (prev ? '<span class="same">NEW</span>' : "");
      return '<div class="rk-card">' + C.traineeCard(t, d) + '<span class="rk-n">' + now + '</span><span class="delta">' + ch + "</span></div>";
    }).join("") + "</div></div>";
  }

  /* ---------- pick'em ---------- */
  const PK = "celestial_pickem";
  // เก็บไว้ในคีย์ B เหมือนเดิม เพื่อให้ผล Pick'em ที่แฟนคลับเคยเลือกไว้ยังอยู่
  function pkState() { const st = C.Store.get(PK, null); return { B: (st && Array.isArray(st.B) ? st.B : []).slice(0, 5) }; }
  function renderPick(d) {
    const st = pkState(); const picks = st.B.map(id => d.trainees.some(x => x.id === id) ? id : null);
    const pool = d.trainees.filter(t => t.status !== "withdrawn").sort((a, b) => a.no - b.no);
    const slot = i => {
      const t = d.trainees.find(x => x.id === picks[i]);
      return '<button type="button" class="pk-slot' + (t ? " filled" : "") + '" data-i="' + i + '" aria-label="ช่องที่ ' + (i + 1) + (t ? " " + attr(t.name) + " แตะเพื่อเอาออก" : " ว่าง") + '"><span class="pk-disc ph">' + (t ? C.portrait(t) : "<i>+</i>") + "</span><small>" + (t ? esc(t.stageName || t.name) : "PICK " + String(i + 1).padStart(2, "0")) + "</small></button>";
    };
    $("#pkBoards").innerHTML = '<div class="pk-board panel b solo"><div class="pk-head"><span class="chip b">MY DEBUT LINE-UP</span><span class="muted">' + picks.filter(Boolean).length + "/5</span></div>" +
      '<div class="pk-formation"><div>' + slot(0) + "</div><div>" + slot(1) + slot(2) + "</div><div>" + slot(3) + slot(4) + "</div></div>" +
      '<div class="pk-pool">' + pool.map(t => '<button type="button" class="pk-chip' + (picks.includes(t.id) ? " used" : "") + '" data-pick="' + attr(t.id) + '"><span class="ph">' + C.portrait(t) + "</span>" + esc(t.stageName || t.name) + "</button>").join("") + "</div></div>";
  }
  function setupPick() {
    $("#pkBoards").addEventListener("click", e => {
      const st = pkState(); const chip = e.target.closest("[data-pick]"), slot = e.target.closest(".pk-slot");
      st.B = st.B.map(id => DATA.trainees.some(x => x.id === id) ? id : null);
      if (chip) {
        const id = chip.dataset.pick; const at = st.B.indexOf(id);
        if (at >= 0) st.B[at] = null;
        else { let i = -1; for (let k = 0; k < 5; k++) if (!st.B[k]) { i = k; break; } if (i < 0) { C.toast("กระดานเต็มแล้ว แตะวงกลมเพื่อเอาออกก่อน"); return; } st.B[i] = id; }
      } else if (slot && slot.classList.contains("filled")) { st.B[+slot.dataset.i] = null; }
      else return;
      C.Store.set(PK, st); renderPick(DATA);
    });
    $("#pkReset").addEventListener("click", () => { C.Store.set(PK, { B: [] }); renderPick(DATA); C.toast("รีเซ็ตกระดานแล้ว"); });
    $("#pkCopy").addEventListener("click", async () => {
      const st = pkState(); const nm = id => { const t = DATA.trainees.find(x => x.id === id); return t ? (t.stageName || t.name) : "-"; };
      const txt = "PICK'EM — THE CELESTIAL : PROJECT\n" + [0, 1, 2, 3, 4].map(i => (i + 1) + ". " + nm(st.B[i])).join("\n");
      try { await navigator.clipboard.writeText(txt); C.toast("คัดลอกแล้ว นำไปวางในโพสต์ได้เลย"); } catch (e) { C.modal('<div class="pad"><h3 class="title-sm">ผล Pick\'em ของคุณ</h3><p class="muted">คัดลอกข้อความด้านล่าง</p><textarea class="input" rows="5" readonly autofocus>' + esc(txt) + "</textarea></div>", { size: "sm" }); }
    });
  }

  /* ---------- news ---------- */
  function renderNews(d) {
    const list = (d.news || []).slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.date).localeCompare(a.date));
    $("#news").innerHTML = list.length ? list.map(n => {
      const src = C.imgUrl(n.image);
      const inner = (src ? '<div class="news-img"><img src="' + attr(src) + '" alt="" loading="lazy"></div>' : "") +
        '<div class="news-body"><div class="news-meta"><span class="chip">' + esc(n.tag || "ข่าว") + "</span><time>" + esc(C.fmtDate(n.date)) + "</time>" + (n.pinned ? '<span class="chip live">ปักหมุด</span>' : "") + "</div><h3>" + esc(n.title) + "</h3><p>" + esc(n.body) + "</p>" + (n.link ? '<span class="more">อ่านต่อ</span>' : "") + "</div>";
      return n.link ? '<a class="news-card panel" href="' + attr(n.link) + '">' + inner + "</a>" : '<article class="news-card panel">' + inner + "</article>";
    }).join("") : '<div class="empty">ยังไม่มีข่าวสาร</div>';
  }

  /* ---------- announcement ---------- */
  function announce(d) {
    const a = d.settings.announcement; if (!a || !a.on || !a.title) return;
    const key = "celestial_ann_seen"; if (C.Store.get(key) === (a.version || a.title)) return;
    const src = C.imgUrl(a.image);
    C.modal((src ? '<img src="' + attr(src) + '" alt="" style="width:100%;max-height:300px;object-fit:cover">' : '<div class="ann-art"><img src="assets/img/emblem.png" alt=""></div>') +
      '<div class="pad" style="text-align:center"><span class="eyebrow">Official announcement</span><h3 class="title-sm">' + esc(a.title) + '</h3><p class="lead" style="margin-inline:auto">' + esc(a.body) + '</p><div class="toolbar" style="justify-content:center;margin-top:20px">' +
      (a.link ? '<a class="btn btn-rose" href="' + attr(a.link) + '">' + esc(a.linkLabel || "ดูรายละเอียด") + "</a>" : "") + '<button class="btn btn-ghost" type="button" onclick="Celestial.closeModal()">ปิด</button></div></div>',
      { size: "sm", onClose: () => C.Store.set(key, a.version || a.title) });
  }

  function render(d) {
    DATA = d; const s = d.settings || {};
    if (s.tagline) $("#nsLead").textContent = s.tagline;
    renderBanners(d); renderFeature(d); renderPulse(d); renderTop(d); renderPick(d); renderNews(d);
  }
  setupBanners(); setupPick();
  $("#topSplit").addEventListener("click", e => { const b = e.target.closest("[data-id]"); if (b && DATA) C.openProfile(b.dataset.id, DATA); });
  C.API.loadPublic(render).then(d => d && setTimeout(() => announce(d), 600));
}
