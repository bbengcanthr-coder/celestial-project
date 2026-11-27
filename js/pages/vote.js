/* VOTE — login required, once per day (Asia/Bangkok) */
{
  const C = window.Celestial, { $, esc } = C;
  let DATA = null, ME = null, pick = C.qs("t") || "", q = "", busy = false;
  function fmtClock(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(n => String(n).padStart(2, "0")).join(":"); }
  function renderState() {
    const v = (DATA && DATA.settings.vote) || {}; const el = $("#vState"); const sess = C.Fan.get();
    if (!v.open) { el.innerHTML = '<strong>ขณะนี้ปิดโหวต</strong><span class="muted">ติดตามประกาศเปิดโหวตรอบถัดไปได้ที่หน้าแรกและปฏิทิน</span><a class="btn btn-ghost btn-sm" href="calendar.html">ดูปฏิทิน</a>'; return; }
    if (!sess) { el.innerHTML = '<strong>เข้าสู่ระบบเพื่อโหวต</strong><span class="muted">ระบบต้องยืนยันตัวตนแฟนคลับ เพื่อจำกัดการโหวตวันละ 1 ครั้งต่อบัญชี</span><div class="toolbar"><a class="btn btn-rose" href="login.html?next=vote.html' + (pick ? "%3Ft%3D" + encodeURIComponent(pick) : "") + '">เข้าสู่ระบบ</a><a class="btn btn-ghost" href="login.html?mode=register&next=vote.html">สมัครสมาชิก</a></div>'; return; }
    if (!ME) { el.innerHTML = '<div class="skel" style="height:90px"></div>'; return; }
    const who = '<div class="who"><span class="acct-btn" style="pointer-events:none"><span class="dot av">' + C.avatarHtml(ME.user) + "</span>" + esc(ME.user.displayName) + "</span></div>";
    const nudge = ME.checkedIn ? "" : '<a class="heart-nudge" href="profile.html"><i aria-hidden="true">♥</i> อย่าลืมกดใจเช็กอินประจำวัน เพื่อเลื่อนระดับแฟนคลับ</a>';
    if (ME.voted) {
      const t = DATA.trainees.find(x => x.id === ME.voted.traineeId) || { name: "—", id: "x" };
      el.innerHTML = who + '<div class="voted-card"><span class="ph">' + C.portrait(t) + "</span><span>วันนี้คุณโหวตให้ <b>" + esc(t.stageName || t.name) + '</b> แล้ว</span></div><span class="muted">โหวตครั้งถัดไปได้ในอีก</span><div class="clock" id="clock">' + fmtClock(C.msToBkkMidnight()) + "</div>" + nudge;
    } else el.innerHTML = who + '<strong>วันนี้คุณยังไม่ได้โหวต</strong><span class="muted">สิทธิ์โหวตวันนี้หมดเวลาในอีก</span><div class="clock" id="clock">' + fmtClock(C.msToBkkMidnight()) + "</div>" + nudge;
  }
  function renderGrid() {
    const v = DATA.settings.vote || {}; const locked = !v.open || !C.Fan.get() || !ME || !!ME.voted;
    const list = DATA.trainees.filter(t => t.status === "active" && (!q || (t.name + " " + t.stageName).toLowerCase().includes(q))).sort((a, b) => a.no - b.no);
    $("#vGrid").classList.toggle("locked", locked);
    $("#vGrid").innerHTML = list.map(t => C.traineeCard(t, DATA).replace('<div class="ph">', '<div class="ph"><span class="pick" aria-hidden="true">✓</span>').replace('class="t-card', 'class="t-card' + (t.id === pick && !locked ? " sel" : ""))).join("") || '<div class="empty">ไม่พบเด็กฝึก</div>';
    const bar = $("#vBar"); bar.classList.toggle("hide", locked);
    const t = DATA.trainees.find(x => x.id === pick);
    $("#vPick").innerHTML = t ? "เลือกแล้ว: <b>" + esc(t.stageName || t.name) + "</b> (" + esc(C.code(t)) + ")" : "ยังไม่ได้เลือก";
    $("#vGo").disabled = !t;
  }
  /* ผลโหวตเป็นความลับ: แสดงเฉพาะรอบที่ทีมงานกด “ประกาศผล” (รวมโหวตบนเว็บ + คะแนนจากช่องทางอื่น) */
  let resRound = "";
  function renderResults() {
    const res = DATA.results || {}; const rr = (DATA.rounds || []).slice().sort(C.byOrder).filter(r => res[r.id] && Array.isArray(res[r.id].rows));
    const box = $("#resBox"), sel = $("#resRound");
    if (!rr.length) {
      sel.classList.add("hide"); $("#resLead").textContent = "ผลโหวตเป็นความลับจนกว่าทีมงานจะประกาศเมื่อจบรอบ";
      box.innerHTML = '<div class="panel res-locked"><span class="lock" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3"/><rect x="4.5" y="10" width="15" height="11" rx="2.5"/><path d="M12 14.5v2.5"/></svg></span><strong>ยังไม่มีการประกาศผลโหวต</strong><span class="muted">คะแนนทั้งหมด (โหวตบนเว็บนี้ + คะแนนจากช่องทางอื่นของทีมงาน) จะถูกรวมและประกาศครั้งเดียวเมื่อจบแต่ละรอบ</span></div>';
      return;
    }
    if (!rr.some(r => r.id === resRound)) resRound = rr[rr.length - 1].id;
    sel.classList.toggle("hide", rr.length < 2);
    sel.innerHTML = rr.map(r => '<option value="' + C.attr(r.id) + '"' + (r.id === resRound ? " selected" : "") + ">" + esc(r.code + " " + r.title) + "</option>").join("");
    const R = res[resRound], rd = rr.find(r => r.id === resRound);
    const when = R.publishedAt ? new Date(R.publishedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "";
    $("#resLead").textContent = "รอบ " + (rd.code + " " + rd.title) + (when ? " — ประกาศเมื่อ " + when : "") + (R.total != null ? " — คะแนนรวม " + C.fmtNum(R.total) : "");
    const T = id => DATA.trainees.find(t => t.id === id) || { id: id, name: id };
    const max = R.rows.length ? (R.rows[0].pct || 1) : 1;
    const src = (R.sources || []);
    const bd = x => '<div class="bd"><span>เว็บ <b>' + C.fmtNum(x.web) + "</b></span>" + src.map(s => "<span>" + esc(s.label) + " <b>" + C.fmtNum((x.ext || {})[s.id]) + "</b></span>").join("") + "</div>";
    box.innerHTML = (R.note ? '<p class="res-note">' + esc(R.note) + "</p>" : "") +
      '<div class="panel res-board"><div class="bars">' + (R.rows.map(x => { const t = T(x.id);
        return '<button type="button" class="bar-row r' + x.rank + (R.breakdown ? " has-bd" : "") + '" data-id="' + C.attr(t.id) + '"><span class="rk">' + x.rank + '</span><span class="ph">' + C.portrait(t) + '</span><span class="bar-col"><span class="bar-track"><span class="bar-fill" style="width:' + Math.max(4, x.pct / max * 100).toFixed(1) + '%"></span><b>' + esc(t.stageName || t.name) + "</b></span>" + (R.breakdown ? bd(x) : "") + '</span><span class="pct">' + (R.showNumbers && x.total != null ? "<b>" + C.fmtNum(x.total) + "</b><small>" + Number(x.pct).toFixed(1) + "%</small>" : Number(x.pct).toFixed(1) + "%") + "</span></button>"; }).join("") || '<p class="muted">ไม่มีคะแนนในรอบนี้</p>') + "</div></div>";
  }
  function renderAll() { if (!DATA) return; const v = DATA.settings.vote || {}; $("#vTitle").textContent = v.title || "VOTE"; if (v.note) $("#vNote").textContent = v.note; renderState(); renderGrid(); renderResults(); }
  async function loadMe() {
    const s = C.Fan.get(); if (!s) { ME = null; renderAll(); return; }
    try { ME = await C.API.call("fanMe", { token: s.token }); }
    catch (e) { C.Fan.clear(); C.renderAcct(); ME = null; C.toast(e.message, true); }
    renderAll();
  }
  async function submit() {
    const t = DATA.trainees.find(x => x.id === pick); if (!t || busy) return;
    C.modal('<div class="pad" style="text-align:center"><span class="eyebrow th">ยืนยันการโหวต</span><div class="ph" style="width:120px;height:120px;border-radius:50%;margin:10px auto 14px">' + C.portrait(t) + '</div><h3 class="title-sm">' + esc(t.stageName || t.name) + '</h3><p class="lead" style="margin-inline:auto">โหวตได้วันละ 1 ครั้ง เมื่อยืนยันแล้วจะเปลี่ยนไม่ได้จนถึงเที่ยงคืน (เวลาไทย)</p><div class="toolbar" style="justify-content:center;margin-top:20px"><button class="btn btn-rose" id="vConfirm" type="button" autofocus>ยืนยันโหวต</button><button class="btn btn-ghost" type="button" onclick="Celestial.closeModal()">ยกเลิก</button></div></div>', { size: "sm" });
    $("#vConfirm").addEventListener("click", async e => {
      busy = true; e.target.disabled = true; e.target.textContent = "กำลังบันทึก…";
      try {
        await C.API.call("vote", { token: C.Fan.get().token, traineeId: t.id });
        C.closeModal(); C.toast("โหวตให้ " + (t.stageName || t.name) + " แล้ว ขอบคุณที่ร่วมโหวต");
        pick = ""; await loadMe();
      } catch (err) { C.closeModal(); C.toast(err.message, true); await loadMe(); }
      busy = false;
    });
  }
  $("#q").addEventListener("input", e => { q = e.target.value.trim().toLowerCase(); renderGrid(); });
  $("#vGrid").addEventListener("click", e => {
    const c = e.target.closest(".t-card"); if (!c) return;
    if ($("#vGrid").classList.contains("locked")) { C.openProfile(c.dataset.id, DATA); return; }
    pick = pick === c.dataset.id ? "" : c.dataset.id; renderGrid();
  });
  $("#vGo").addEventListener("click", submit);
  $("#resRound").addEventListener("change", e => { resRound = e.target.value; renderResults(); });
  $("#resBox").addEventListener("click", e => { const b = e.target.closest("[data-id]"); if (b && DATA) C.openProfile(b.dataset.id, DATA); });
  document.addEventListener("fan:change", loadMe);
  setInterval(() => { const c = $("#clock"); if (c) { const ms = C.msToBkkMidnight(); c.textContent = fmtClock(ms); if (ms < 1000) setTimeout(loadMe, 1500); } }, 1000);
  C.API.loadPublic(d => { DATA = d; renderAll(); }).then(loadMe);
}
