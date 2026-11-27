/* FAN CLUB — ทำเนียบแฟนคลับ: แฟนคลับแต้มใจสูงสุด สมาชิกใหม่ และระดับการ์ด */
{
  const C = window.Celestial, { $, esc } = C;
  let DATA = null, BOARD = null, ME = null, busy = false;

  function renderMe() {
    const el = $("#me"); if (!DATA) return;
    if (!C.Fan.get()) {
      el.innerHTML = '<div class="fc-me-cta"><span class="eyebrow th">การ์ดสมาชิกของคุณ</span>' + C.fanCard({ username: "you", displayName: "ชื่อของคุณ", hearts: 0, theme: "rose" }, DATA, { link: false, noBias: 1 }) + '<div class="toolbar" style="justify-content:center"><a class="btn btn-rose" href="login.html?mode=register&next=profile.html">สมัครสมาชิก</a><a class="btn btn-ghost" href="login.html?next=fanclub.html">เข้าสู่ระบบ</a></div></div>';
      return;
    }
    if (!ME) { el.innerHTML = '<div class="skel" style="height:260px"></div>'; return; }
    const lv = C.levelOf(ME.user.hearts, DATA);
    el.innerHTML = '<span class="eyebrow th">การ์ดสมาชิกของคุณ</span>' + C.fanCard(ME.user, DATA, {}) +
      '<div class="fc-me-row"><div class="bar"><span style="width:' + lv.pct.toFixed(1) + '%"></span></div><small>' + (lv.next ? "อีก " + C.fmtNum(lv.need) + " ใจถึง LV." + (lv.n + 1) + " " + esc(lv.next.name) : "ระดับสูงสุดแล้ว ✦") + "</small></div>" +
      '<div class="toolbar" style="justify-content:center">' + (ME.checkedIn ? '<button class="btn btn-ghost heart-btn done" type="button" disabled><i aria-hidden="true">♥</i> เช็กอินแล้ววันนี้</button>' : '<button class="btn btn-rose heart-btn" type="button" id="ck"><i aria-hidden="true">♥</i> กดใจเช็กอินวันนี้ +1</button>') + '<a class="btn btn-ghost" href="profile.html">โปรไฟล์ของฉัน</a></div>' +
      (ME.gave ? "" : '<p class="muted fc-tip">วันนี้ยังส่งใจให้เพื่อนแฟนคลับได้อีก 1 ใจ — แตะการ์ดของใครก็ได้ด้านล่างเพื่อไปที่โปรไฟล์แล้วกด “ส่งใจ”</p>');
    const ck = $("#ck"); if (ck) ck.addEventListener("click", checkin);
  }
  function renderBoard() {
    if (!BOARD || !DATA) return;
    const top = BOARD.top || [];
    $("#topLead").textContent = "เรียงตามแต้มใจสะสม — สมาชิกทั้งหมด " + C.fmtNum(BOARD.count || top.length) + " คน";
    $("#top").innerHTML = top.length ? top.map((f, i) => C.fanCard(f, DATA, { rank: i + 1 })).join("") : '<div class="empty">ยังไม่มีแฟนคลับ — เป็นคนแรกเลย!</div>';
    const nw = (BOARD.newest || []).filter(f => !top.slice(0, 12).some(t => t.username === f.username));
    $("#newSec").classList.toggle("hide", !nw.length);
    $("#newest").innerHTML = nw.map(f => C.fanCard(f, DATA, { size: "sm", noBias: 1 })).join("");
  }
  function renderAll() { renderMe(); renderBoard(); if (DATA) $("#ladder").innerHTML = C.levelLadder(DATA, ME && ME.user); }

  async function checkin(e) {
    if (busy) return; busy = true; e.currentTarget.disabled = true;
    try { const r = await C.API.call("fanCheckin", { token: C.Fan.get().token }); ME.checkedIn = true; Object.assign(ME.user, r.user); C.toast("♥ เช็กอินวันนี้แล้ว +1 ใจ"); renderAll(); loadBoard(); }
    catch (x) { C.toast(x.message, true); await loadMe(); }
    busy = false;
  }
  async function loadMe() {
    const s = C.Fan.get(); if (!s) { ME = null; renderAll(); return; }
    try { ME = await C.API.call("fanMe", { token: s.token }); C.Fan.patch(ME.user); }
    catch (e) { ME = null; if (/เซสชัน|ไม่พบบัญชี/.test(e.message)) { C.Fan.clear(); C.renderAcct(); } }
    renderAll();
  }
  async function loadBoard() {
    try { BOARD = await C.API.get("fans"); if (!BOARD || !Array.isArray(BOARD.top)) throw new Error("Code.gs บนเซิร์ฟเวอร์ยังเป็นเวอร์ชันเก่า — วาง Code.gs ใหม่ รัน setup แล้ว Deploy เป็น New version"); renderBoard(); }
    catch (e) { $("#top").innerHTML = '<div class="empty">โหลดทำเนียบแฟนคลับไม่สำเร็จ: ' + esc(e.message) + "</div>"; }
  }
  $("#findForm").addEventListener("submit", e => { e.preventDefault(); const u = $("#findU").value.trim().replace(/^@/, "").toLowerCase(); if (!/^[a-z0-9_.]{3,20}$/.test(u)) { C.toast("พิมพ์ชื่อผู้ใช้ (a-z, 0-9, _ หรือ .)", true); return; } location.href = "profile.html?u=" + encodeURIComponent(u); });
  document.addEventListener("fan:change", loadMe);
  C.API.loadPublic(d => { DATA = d; renderAll(); }).then(() => Promise.all([loadMe(), loadBoard()]));
}
