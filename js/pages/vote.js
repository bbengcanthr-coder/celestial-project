/* VOTE — login required, once per day (Asia/Bangkok) */
{
  const C = window.Celestial, { $, $$, esc, attr } = C;
  let DATA = null, ME = null, side = "B", pick = C.qs("t") || "", q = "", busy = false;
  function fmtClock(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(n => String(n).padStart(2, "0")).join(":"); }
  function renderState() {
    const v = (DATA && DATA.settings.vote) || {}; const el = $("#vState"); const sess = C.Fan.get();
    if (!v.open) { el.innerHTML = '<strong>ขณะนี้ปิดโหวต</strong><span class="muted">ติดตามประกาศเปิดโหวตรอบถัดไปได้ที่หน้าแรกและปฏิทิน</span><a class="btn btn-ghost btn-sm" href="calendar.html">ดูปฏิทิน</a>'; return; }
    if (!sess) { el.innerHTML = '<strong>เข้าสู่ระบบเพื่อโหวต</strong><span class="muted">ระบบต้องยืนยันตัวตนแฟนคลับ เพื่อจำกัดการโหวตวันละ 1 ครั้งต่อบัญชี</span><div class="toolbar"><a class="btn btn-rose" href="login.html?next=vote.html' + (pick ? "%3Ft%3D" + encodeURIComponent(pick) : "") + '">เข้าสู่ระบบ</a><a class="btn btn-ghost" href="login.html?mode=register&next=vote.html">สมัครสมาชิก</a></div>'; return; }
    if (!ME) { el.innerHTML = '<div class="skel" style="height:90px"></div>'; return; }
    const who = '<div class="who"><span class="acct-btn" style="pointer-events:none"><span class="dot">' + esc(ME.user.displayName.slice(0, 1).toUpperCase()) + "</span>" + esc(ME.user.displayName) + "</span></div>";
    if (ME.voted) {
      const t = DATA.trainees.find(x => x.id === ME.voted.traineeId) || { name: "—", side: "B", id: "x" };
      el.innerHTML = who + '<div class="voted-card"><span class="ph">' + C.portrait(t) + "</span><span>วันนี้คุณโหวตให้ <b>" + esc(t.stageName || t.name) + '</b> แล้ว</span></div><span class="muted">โหวตครั้งถัดไปได้ในอีก</span><div class="clock" id="clock">' + fmtClock(C.msToBkkMidnight()) + "</div>";
    } else el.innerHTML = who + '<strong>วันนี้คุณยังไม่ได้โหวต</strong><span class="muted">สิทธิ์โหวตวันนี้หมดเวลาในอีก</span><div class="clock" id="clock">' + fmtClock(C.msToBkkMidnight()) + "</div>";
  }
  function renderGrid() {
    const v = DATA.settings.vote || {}; const locked = !v.open || !C.Fan.get() || !ME || !!ME.voted;
    const list = DATA.trainees.filter(t => t.side === side && t.status === "active" && (!q || (t.name + " " + t.stageName).toLowerCase().includes(q))).sort((a, b) => a.no - b.no);
    $("#vGrid").classList.toggle("locked", locked);
    $("#vGrid").innerHTML = list.map(t => C.traineeCard(t, DATA).replace('<div class="ph">', '<div class="ph"><span class="pick" aria-hidden="true">✓</span>').replace('class="t-card', 'class="t-card' + (t.id === pick && !locked ? " sel" : ""))).join("") || '<div class="empty">ไม่พบเด็กฝึก</div>';
    $$("#sideSeg button").forEach(b => b.classList.toggle("on", b.dataset.side === side));
    const bar = $("#vBar"); bar.classList.toggle("hide", locked);
    const t = DATA.trainees.find(x => x.id === pick);
    $("#vPick").innerHTML = t ? "เลือกแล้ว: <b>" + esc(t.stageName || t.name) + "</b> (" + esc(t.side + String(t.no).padStart(2, "0")) + ")" : "ยังไม่ได้เลือก";
    $("#vGo").disabled = !t;
  }
  function renderResults() {
    const sec = $("#resultsSec"); const ty = DATA.tally;
    if (!ty || !ty.total) { sec.classList.add("hide"); return; }
    sec.classList.remove("hide");
    const r = (DATA.rounds || []).find(x => x.id === ty.round);
    $("#resLead").textContent = (r ? "รอบ " + r.code + " " + r.title + " — " : "") + "รวมทั้งหมด " + ty.total.toLocaleString("th-TH") + " โหวต อัปเดตอัตโนมัติ";
    const col = s => {
      const list = DATA.trainees.filter(t => t.side === s).map(t => ({ t, n: ty.totals[t.id] || 0 })).filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 10);
      const sum = DATA.trainees.filter(t => t.side === s).reduce((a, t) => a + (ty.totals[t.id] || 0), 0) || 1; const max = list.length ? list[0].n : 1;
      return '<div class="panel ' + (s === "G" ? "g" : "b") + '"><h3 class="sub-head ' + (s === "G" ? "g" : "b") + '" style="margin:0 0 14px">' + s + '-TRAINEES</h3><div class="bars">' + (list.map((x, i) => '<div class="bar-row"><span class="rk">' + (i + 1) + '</span><span class="ph">' + C.portrait(x.t) + '</span><div class="bar-track"><span class="bar-fill" style="width:' + Math.max(4, x.n / max * 100).toFixed(1) + '%"></span><b>' + esc(x.t.stageName || x.t.name) + '</b></div><span class="pct">' + (x.n / sum * 100).toFixed(1) + "%</span></div>").join("") || '<p class="muted">ยังไม่มีโหวต</p>') + "</div></div>";
    };
    $("#results").innerHTML = col("B") + col("G");
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
        pick = ""; await loadMe(); C.API.loadPublic(d => { DATA = d; renderAll(); });
      } catch (err) { C.closeModal(); C.toast(err.message, true); await loadMe(); }
      busy = false;
    });
  }
  $("#sideSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { side = b.dataset.side; renderGrid(); } });
  $("#q").addEventListener("input", e => { q = e.target.value.trim().toLowerCase(); renderGrid(); });
  $("#vGrid").addEventListener("click", e => {
    const c = e.target.closest(".t-card"); if (!c) return;
    if ($("#vGrid").classList.contains("locked")) { C.openProfile(c.dataset.id, DATA); return; }
    pick = pick === c.dataset.id ? "" : c.dataset.id; renderGrid();
  });
  $("#vGo").addEventListener("click", submit);
  document.addEventListener("fan:change", loadMe);
  setInterval(() => { const c = $("#clock"); if (c) { const ms = C.msToBkkMidnight(); c.textContent = fmtClock(ms); if (ms < 1000) setTimeout(loadMe, 1500); } }, 1000);
  C.API.loadPublic(d => { DATA = d; const t = d.trainees.find(x => x.id === pick); if (t) side = t.side; renderAll(); }).then(loadMe);
}
