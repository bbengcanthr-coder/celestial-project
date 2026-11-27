/* LANDING — winner artist + playlist */
{
  const C = window.Celestial, { $, $$, esc, attr } = C;
  const audio = $("#audio"); let DATA = null, winner = null, list = [], idx = 0, seeking = false;
  const PLAY = '<path d="M7 4v16l13-8z"/>', PAUSE = '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>';
  // เสียงเงียบสั้น ๆ ใช้ "ปลดล็อก" เครื่องเล่นตอนแตะปุ่ม (Safari/iPhone ไม่ยอมให้เล่นเองหลังรอโหลดไฟล์จาก Drive)
  const SILENT = "data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";
  const silent = () => audio.getAttribute("src") === SILENT;
  let loadTok = 0, busy = false;
  function setBusy(b) {
    busy = b; const p = $("#pPlay"); p.classList.toggle("loading", b); p.setAttribute("aria-busy", b ? "true" : "false");
    const t = list[idx]; $("#tNote").textContent = b ? "กำลังโหลดเพลง…" : (t && t.note) || "";
  }
  const t2s = s => !isFinite(s) ? "0:00" : Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  function fitName() {
    const h = $("#wName"), moon = $(".ld-moon"); const max = moon.clientWidth * 0.6;
    let fs = Math.min(104, moon.clientWidth * 0.2); h.style.fontSize = fs + "px";
    while (h.scrollWidth > max && fs > 22) { fs -= 2; h.style.fontSize = fs + "px"; }
  }
  function pickWinner(id) {
    const ws = DATA.settings.winners || [];
    winner = id === "all" ? null : (ws.find(w => w.id === id) || ws[0] || null);
    const s = DATA.settings;
    $("#wSeason").textContent = winner ? (winner.season || "THE WINNER") : "THE CELESTIAL : PROJECT";
    $("#wName").textContent = winner ? winner.name : "PLAYLIST";
    $("#wTag").textContent = winner ? (winner.tagline || "") : "เพลงทั้งหมดของโปรเจกต์";
    $("#wMembers").innerHTML = winner ? (winner.members || []).map(m => "<span>" + esc(m) + "</span>").join("") : "";
    $$("#wTabs button").forEach(b => { b.classList.toggle("on", b.dataset.w === (winner ? winner.id : "all")); b.setAttribute("aria-selected", b.classList.contains("on")); });
    const all = (DATA.tracks || []).slice().sort(C.byOrder);
    list = winner ? all.filter(t => t.winner === winner.id) : all;
    if (!list.length) list = all;
    renderTracks(); load(0, false); fitName();
    document.title = (winner ? winner.name + " — " : "") + "THE CELESTIAL : PROJECT";
  }
  function coverHtml(t) {
    const src = C.imgUrl(t && t.cover) || C.imgUrl(winner && winner.cover);
    return src ? '<img class="c" src="' + attr(src) + '" alt="">' : '<div class="cv-art"><img src="assets/img/emblem.png" alt=""><b>' + esc(t ? t.title : "") + "</b></div>";
  }
  function renderTracks() {
    $("#tracks").innerHTML = list.map((t, i) => '<li><button type="button" data-i="' + i + '"' + (i === idx ? ' class="on" aria-current="true"' : "") + '><span class="i">' + (i + 1) + "</span><span><strong>" + esc(t.title) + "</strong><small>" + esc(t.artist || "") + '</small></span><span class="tag">' + (t.audio ? "" : t.youtube ? "YouTube" : "เร็ว ๆ นี้") + "</span></button></li>").join("") || '<li class="muted" style="padding:12px">ยังไม่มีเพลงในเพลย์ลิสต์</li>';
  }
  function load(i, play) {
    if (!list.length) { $("#tTitle").textContent = "ยังไม่มีเพลง"; $("#cover").innerHTML = coverHtml(null); return; }
    idx = (i + list.length) % list.length; const t = list[idx];
    $("#tTitle").textContent = t.title; $("#tArtist").textContent = t.artist || ""; $("#tNote").textContent = t.note || "";
    $("#cover").innerHTML = coverHtml(t);
    const yt = $("#pYt"); yt.classList.toggle("hide", !t.youtube); if (t.youtube) yt.href = t.youtube;
    audio.pause(); loadTok++; setBusy(false);
    // ลิงก์ Drive ยังไม่ใส่ src — จะดึงไฟล์ตอนกดเล่น (ดู ensureSrc)
    const src = t.audio && !C.driveId(t.audio) ? C.audioUrl(t.audio) : "";
    if (src) { audio.src = src; } else { audio.removeAttribute("src"); audio.load(); }
    $("#seekBar").value = 0; $("#tCur").textContent = "0:00"; $("#tDur").textContent = "0:00";
    renderTracks(); setIcon(false);
    if ("mediaSession" in navigator) try { navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist || "", album: "THE CELESTIAL : PROJECT" }); } catch (e) { }
    if (play) toggle(true);
  }
  function setIcon(p) { $("#playIco").innerHTML = p ? PAUSE : PLAY; $("#pPlay").setAttribute("aria-label", p ? "หยุดชั่วคราว" : "เล่น"); }
  // ให้ <audio> มีไฟล์จริงก่อนเล่น: ลิงก์ Drive จะดึงผ่าน Apps Script (ครั้งแรกรอไม่กี่วินาที ครั้งต่อไปเล่นทันที)
  async function ensureSrc(t) {
    if (audio.getAttribute("src") && !silent()) return true;
    const my = ++loadTok; setBusy(true);
    try { audio.src = SILENT; const p = audio.play(); if (p) p.catch(() => { }); } catch (e) { }
    try {
      const url = await C.loadAudio(t.audio); if (my !== loadTok) return false;
      audio.src = url; setBusy(false); return true;
    } catch (e) {
      if (my === loadTok) { audio.removeAttribute("src"); audio.load(); setBusy(false); setIcon(false); C.toast("เล่นเพลงนี้ไม่ได้: " + e.message, true); }
      return false;
    }
  }
  async function toggle(force) {
    const t = list[idx]; if (!t || busy) return;
    if (!t.audio) { C.toast(t.youtube ? "เพลงนี้ฟังได้บน YouTube กดปุ่ม YouTube" : "เพลงนี้ยังไม่มีไฟล์เสียง ทีมงานจะเพิ่มเร็ว ๆ นี้"); return; }
    if (audio.paused || silent() || force === true) {
      if (!await ensureSrc(t)) return;
      try { await audio.play(); }
      catch (e) { setIcon(false); C.toast(e && e.name === "NotAllowedError" ? "โหลดเพลงเสร็จแล้ว แตะปุ่มเล่นอีกครั้ง" : "เล่นเสียงไม่ได้ ลองกดอีกครั้ง หรือตรวจสอบลิงก์ไฟล์เสียง", !(e && e.name === "NotAllowedError")); }
    }
    else audio.pause();
  }
  audio.addEventListener("play", () => { if (!silent()) setIcon(true); });
  audio.addEventListener("pause", () => { if (!silent()) setIcon(false); });
  audio.addEventListener("loadedmetadata", () => { if (!silent()) $("#tDur").textContent = t2s(audio.duration); });
  audio.addEventListener("timeupdate", () => { if (seeking || !audio.duration || silent()) return; $("#seekBar").value = audio.currentTime / audio.duration * 1000; $("#tCur").textContent = t2s(audio.currentTime); });
  audio.addEventListener("ended", () => { if (silent()) return; let n = idx; for (let k = 1; k <= list.length; k++) { const j = (idx + k) % list.length; if (list[j].audio) { n = j; break; } } if (n !== idx) load(n, true); });
  audio.addEventListener("error", () => { if (audio.getAttribute("src") && !silent()) C.toast("โหลดไฟล์เสียงไม่สำเร็จ ตรวจสอบว่าลิงก์เปิดให้ทุกคนเข้าถึงได้", true); });
  $("#seekBar").addEventListener("input", e => { seeking = true; if (audio.duration) $("#tCur").textContent = t2s(e.target.value / 1000 * audio.duration); });
  $("#seekBar").addEventListener("change", e => { if (audio.duration) audio.currentTime = e.target.value / 1000 * audio.duration; seeking = false; });
  $("#pPlay").addEventListener("click", () => toggle());
  $("#pPrev").addEventListener("click", () => load(idx - 1, !audio.paused));
  $("#pNext").addEventListener("click", () => load(idx + 1, !audio.paused));
  $("#tracks").addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (b) load(+b.dataset.i, true); });
  $("#wTabs").addEventListener("click", e => { const b = e.target.closest("[data-w]"); if (b) { pickWinner(b.dataset.w); try { history.replaceState(null, "", "#" + b.dataset.w); } catch (x) { } } });
  addEventListener("resize", () => fitName());
  function render(d) {
    DATA = d; const ws = d.settings.winners || [];
    const hasLoose = (d.tracks || []).some(t => !t.winner);
    $("#wTabs").innerHTML = ws.map(w => '<button type="button" role="tab" data-w="' + attr(w.id) + '">' + esc(w.name) + "</button>").join("") + (hasLoose || !ws.length ? '<button type="button" role="tab" data-w="all">ALL TRACKS</button>' : "");
    $("#season").textContent = (d.settings.siteName || "THE CELESTIAL : PROJECT") + (d.settings.season ? " — " + d.settings.season : "");
    const h = location.hash.slice(1); const keep = winner && ws.some(w => w.id === winner.id) ? winner.id : null;
    pickWinner(keep || (ws.some(w => w.id === h) || h === "all" ? h : (ws[0] ? ws[0].id : "all")));
  }
  document.fonts && document.fonts.ready.then(fitName);
  C.API.loadPublic(render);
}
