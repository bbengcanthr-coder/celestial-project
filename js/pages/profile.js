/* FAN PROFILE — โปรไฟล์แฟนคลับ: รูป ภาพพื้นหลัง เมน ธีม + กดใจรายวัน + ระดับ/การ์ด */
{
  const C = window.Celestial, { $, $$, esc, attr } = C;
  let DATA = null, ME = null, P = null, busy = false, err = "";
  const askU = (C.qs("u") || "").trim().toLowerCase();

  const own = () => !!(ME && P && ME.user.username === P.username);
  function joined(s) { const d = s ? new Date(s) : null; return d && !isNaN(d) ? C.TH_M[d.getMonth()] + " " + (d.getFullYear() + 543) : ""; }

  function setWall() {
    const w = $("#wall"); if (!w || !P || !DATA) return;
    const bias = P.bias && DATA.trainees.find(t => t.id === P.bias);
    const src = C.imgUrl(P.cover) || (bias ? C.photoSrc(bias) : "");
    w.innerHTML = src ? '<img src="' + attr(src) + '" alt="" onerror="this.remove()">' : "";
    document.body.classList.toggle("has-wall", !!src);
    document.body.style.setProperty("--fc", (C.THEMES[P.theme] || C.THEMES.rose)[0]);
  }

  function heartBtn() {
    const s = C.Fan.get();
    if (!s) return '<a class="btn btn-rose heart-btn" href="login.html?next=' + encodeURIComponent("profile.html" + location.search) + '"><i aria-hidden="true">♥</i> เข้าสู่ระบบเพื่อ' + (P ? "ส่งใจ" : "กดใจ") + "</a>";
    if (!ME) return '<span class="skel" style="display:inline-block;width:200px;height:44px;border-radius:99px"></span>';
    if (own()) return ME.checkedIn
      ? '<button class="btn btn-ghost heart-btn done" type="button" disabled><i aria-hidden="true">♥</i> เช็กอินแล้ววันนี้ · <span class="hb-clock">' + C.fmtClock(C.msToBkkMidnight()) + "</span></button>"
      : '<button class="btn btn-rose heart-btn" type="button" id="hbGo"><i aria-hidden="true">♥</i> กดใจเช็กอินวันนี้ +1</button>';
    if (ME.gave) return '<button class="btn btn-ghost heart-btn done" type="button" disabled><i aria-hidden="true">♥</i> ' + (ME.gave === P.username ? "ส่งใจให้คนนี้แล้ววันนี้" : "วันนี้ส่งใจให้ @" + esc(ME.gave) + " แล้ว") + "</button>";
    return '<button class="btn btn-rose heart-btn" type="button" id="hbGo"><i aria-hidden="true">♥</i> ส่งใจให้ ' + esc(P.displayName) + "</button>";
  }

  function render() {
    const box = $("#pf"); if (!DATA) return;
    if (err) { box.innerHTML = '<div class="empty">' + esc(err) + '<br><br><a class="btn btn-ghost btn-sm" href="fanclub.html">ไปหน้าทำเนียบแฟนคลับ</a></div>'; $("#ladder").innerHTML = C.levelLadder(DATA, null); return; }
    if (!P) {
      if (!C.Fan.get()) {
        box.innerHTML = '<div class="pf-cta panel"><span class="eyebrow">Fan profile</span><h1 class="title-sm">สร้างโปรไฟล์แฟนคลับของคุณ</h1><p class="lead">ใส่รูปโปรไฟล์ ตั้งภาพพื้นหลังเป็นศิลปินที่รัก เลือกเมนและสีธีม กดใจเช็กอินทุกวันเพื่อเลื่อนระดับ ปลดล็อกการ์ดสมาชิกสุดพิเศษ</p><div class="toolbar" style="justify-content:center;margin-top:18px"><a class="btn btn-rose" href="login.html?mode=register&next=profile.html">สมัครสมาชิก</a><a class="btn btn-ghost" href="login.html?next=profile.html">เข้าสู่ระบบ</a></div></div>';
        $("#ladder").innerHTML = C.levelLadder(DATA, null); return;
      }
      box.innerHTML = '<div class="skel" style="height:460px"></div>'; return;
    }
    const lv = C.levelOf(P.hearts, DATA), th = (C.THEMES[P.theme] || C.THEMES.rose)[0];
    const bias = P.bias && DATA.trainees.find(t => t.id === P.bias);
    const cover = C.imgUrl(P.cover) || (bias ? C.photoSrc(bias) : "");
    document.title = P.displayName + " (@" + P.username + ") — THE CELESTIAL : PROJECT";
    box.innerHTML = '<article class="pf-hero fr-' + lv.frame + '" style="--fc:' + attr(th) + ";--lc:" + attr(lv.cur.color) + '">' +
      '<div class="pf-cover">' + (cover ? '<img src="' + attr(cover) + '" alt="" onerror="this.remove()">' : "") + '<span class="pf-lv lv-badge">LV.' + lv.n + " " + esc(lv.cur.name) + "</span></div>" +
      '<div class="pf-main"><span class="pf-av">' + C.avatarHtml(P) + '</span><div class="pf-id"><h1>' + esc(P.displayName) + '</h1><small>@' + esc(P.username) + (joined(P.createdAt) ? " · สมาชิกตั้งแต่ " + esc(joined(P.createdAt)) : "") + '</small></div>' +
      '<div class="pf-actions" id="acts">' + heartBtn() + (own() ? '<button class="btn btn-ghost" type="button" id="edit">แก้ไขโปรไฟล์</button>' : "") + '<button class="btn btn-ghost" type="button" id="share" title="คัดลอกลิงก์โปรไฟล์">แชร์</button></div></div>' +
      '<div class="pf-body"><div class="pf-left">' +
      '<div class="pf-prog"><div class="pf-prog-top"><b><i aria-hidden="true">♥</i> ' + C.fmtNum(P.hearts) + ' <small>แต้มใจ</small></b><span>' + (lv.next ? "อีก " + C.fmtNum(lv.need) + " ใจถึง LV." + (lv.n + 1) + " " + esc(lv.next.name) : "ระดับสูงสุดแล้ว ✦") + '</span></div><div class="bar"><span style="width:' + lv.pct.toFixed(1) + '%"></span></div></div>' +
      '<ul class="pf-stats"><li><b>' + C.fmtNum(P.checkins) + "</b><span>วันที่เช็กอิน</span></li><li><b>" + C.fmtNum(P.received) + "</b><span>ใจที่ได้รับ</span></li><li><b>" + C.fmtNum(P.given) + "</b><span>ใจที่ส่งให้คนอื่น</span></li><li><b>" + C.fmtNum(P.votes) + "</b><span>ครั้งที่ร่วมโหวต</span></li></ul>" +
      (P.bio ? '<p class="pf-bio">' + esc(P.bio) + "</p>" : own() ? '<p class="pf-bio muted">ยังไม่มีข้อความแนะนำตัว — กด “แก้ไขโปรไฟล์” เพื่อเพิ่ม</p>' : "") +
      (bias ? '<button type="button" class="pf-bias" data-id="' + attr(bias.id) + '"><span class="ph">' + C.portrait(bias) + '</span><span><small>เมนของ ' + esc(P.displayName) + "</small><b>" + esc(bias.stageName || bias.name) + "</b><em>" + esc(C.code(bias) + " · " + (bias.position || "")) + "</em></span></button>" : "") +
      '</div><div class="pf-right"><span class="eyebrow th">การ์ดสมาชิก</span>' + C.fanCard(P, DATA, { link: false, size: "lg" }) + "</div></div></article>";
    $("#ladder").innerHTML = C.levelLadder(DATA, P);
    setWall(); bind();
  }

  function bind() {
    const go = $("#hbGo"); if (go) go.addEventListener("click", heart);
    const ed = $("#edit"); if (ed) ed.addEventListener("click", editor);
    $("#share").addEventListener("click", async () => {
      const url = location.href.split("?")[0].replace(/[^/]*$/, "") + "profile.html?u=" + encodeURIComponent(P.username);
      try { if (navigator.share) await navigator.share({ title: P.displayName + " — THE CELESTIAL : PROJECT", url }); else { await navigator.clipboard.writeText(url); C.toast("คัดลอกลิงก์โปรไฟล์แล้ว"); } } catch (e) { if (e && e.name !== "AbortError") C.modal('<div class="pad"><h3 class="title-sm">ลิงก์โปรไฟล์</h3><input class="input" value="' + attr(url) + '" readonly autofocus onfocus="this.select()"></div>', { size: "sm" }); }
    });
    const b = $(".pf-bias"); if (b) b.addEventListener("click", () => C.openProfile(b.dataset.id, DATA));
  }

  function burst(el) {
    const r = el.getBoundingClientRect(), host = document.createElement("div"); host.className = "burst"; host.style.left = (r.left + r.width / 2) + "px"; host.style.top = (r.top + r.height / 2) + "px";
    for (let i = 0; i < 14; i++) { const h = document.createElement("i"); h.textContent = "♥"; h.style.setProperty("--a", (i / 14 * 360) + "deg"); h.style.setProperty("--d", (60 + Math.random() * 70) + "px"); h.style.animationDelay = (Math.random() * 0.12) + "s"; host.appendChild(h); }
    document.body.appendChild(host); setTimeout(() => host.remove(), 1300);
  }
  async function heart(e) {
    if (busy) return; busy = true; const btn = e.currentTarget; btn.disabled = true;
    try {
      const before = C.levelOf(P.hearts, DATA).n;
      if (own()) { const r = await C.API.call("fanCheckin", { token: C.Fan.get().token }); ME.checkedIn = true; Object.assign(ME.user, r.user); P = Object.assign({}, P, r.user); C.toast("♥ เช็กอินวันนี้แล้ว +1 ใจ"); }
      else { const r = await C.API.call("fanGive", { token: C.Fan.get().token, to: P.username }); ME.gave = P.username; Object.assign(ME.user, r.user); P = Object.assign({}, P, r.target); C.toast("♥ ส่งใจให้ " + P.displayName + " แล้ว"); }
      burst(btn); render();
      const after = C.levelOf(P.hearts, DATA);
      if (own() && after.n > before) setTimeout(() => C.modal('<div class="pad" style="text-align:center"><span class="eyebrow">Level up!</span><h3 class="title-sm">เลื่อนเป็น LV.' + after.n + " " + esc(after.cur.name) + '</h3><p class="lead" style="margin:6px auto 16px">ปลดล็อกการ์ดสมาชิกระดับใหม่แล้ว</p><div style="max-width:340px;margin:0 auto">' + C.fanCard(P, DATA, { link: false }) + "</div></div>", { size: "sm" }), 700);
    } catch (x) { C.toast(x.message, true); if (/เซสชัน/.test(x.message)) { C.Fan.clear(); C.renderAcct(); } await loadMe(); }
    busy = false;
  }

  /* ---------- แก้ไขโปรไฟล์ ---------- */
  function readData(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error("อ่านไฟล์ไม่ได้")); r.readAsDataURL(file); }); }
  async function prepImage(file, kind) {
    if (!/^image\//.test(file.type)) throw new Error("กรุณาเลือกไฟล์รูป");
    if (file.size > 15e6) throw new Error("ไฟล์ใหญ่เกิน 15MB");
    const url = await readData(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("ไฟล์รูปไม่ถูกต้อง")); i.src = url; });
    const cv = document.createElement("canvas"), x = cv.getContext("2d");
    if (kind === "avatar") { const n = Math.min(img.width, img.height), S = C.LIVE ? 400 : 240; cv.width = cv.height = S; x.drawImage(img, (img.width - n) / 2, (img.height - n) / 2, n, n, 0, 0, S, S); }
    else { const maxW = C.LIVE ? 1600 : 900, maxH = C.LIVE ? 1100 : 620, k = Math.min(1, maxW / img.width, maxH / img.height); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); x.drawImage(img, 0, 0, cv.width, cv.height); }
    let q = C.LIVE ? 0.86 : 0.72, out = cv.toDataURL("image/jpeg", q);
    while (out.length > 3.2e6 && q > 0.45) { q -= 0.1; out = cv.toDataURL("image/jpeg", q); }
    return out;
  }
  function editor() {
    const act = DATA.trainees.filter(t => t.status !== "withdrawn").sort((a, b) => a.no - b.no);
    const th = P.theme && C.THEMES[P.theme] ? P.theme : "rose";
    C.modal('<form class="pad pf-edit" id="pe" novalidate><h3 class="title-sm" style="margin:0 0 16px">แก้ไขโปรไฟล์</h3>' +
      '<div class="pe-imgs"><div class="pe-av"><span class="pf-av" id="peAv">' + C.avatarHtml(P) + '</span><div class="pe-btns"><label class="btn btn-ghost btn-sm up-btn">อัปโหลดรูปโปรไฟล์<input type="file" accept="image/*" data-kind="avatar"></label><button class="btn btn-ghost btn-sm" type="button" data-rm="avatar"' + (P.avatar ? "" : " hidden") + ">ลบรูป</button></div></div>" +
      '<div class="pe-cover"><div class="pe-wall" id="peWall">' + (C.imgUrl(P.cover) ? '<img src="' + attr(C.imgUrl(P.cover)) + '" alt="">' : "<span>ยังไม่มีภาพพื้นหลัง — ถ้าไม่ใส่ จะใช้รูปเมนแทน</span>") + '</div><div class="pe-btns"><label class="btn btn-ghost btn-sm up-btn">อัปโหลดภาพพื้นหลัง<input type="file" accept="image/*" data-kind="cover"></label><button class="btn btn-ghost btn-sm" type="button" data-rm="cover"' + (P.cover ? "" : " hidden") + '>ลบภาพ</button></div><small class="muted">เช่น รูปศิลปินที่ชอบ จะแสดงเป็นภาพพื้นหลังโปรไฟล์และบนการ์ดสมาชิก</small></div></div>' +
      '<div class="field"><label for="peName">ชื่อที่แสดง</label><input class="input" id="peName" maxlength="40" value="' + attr(P.displayName) + '"></div>' +
      '<div class="field"><label for="peBio">แนะนำตัว (ไม่เกิน 300 ตัวอักษร)</label><textarea class="input" id="peBio" maxlength="300" rows="3">' + esc(P.bio || "") + "</textarea></div>" +
      '<div class="field"><label for="peBias">เมนของฉัน</label><select class="input" id="peBias"><option value="">— ยังไม่เลือก —</option>' + act.map(t => '<option value="' + attr(t.id) + '"' + (t.id === P.bias ? " selected" : "") + ">" + esc(C.code(t) + " " + (t.stageName || t.name)) + "</option>").join("") + "</select></div>" +
      '<div class="field"><span class="lab">สีธีมการ์ด</span><div class="themes">' + Object.keys(C.THEMES).map(k => '<label class="theme-sw" style="--c:' + C.THEMES[k][0] + '"><input type="radio" name="theme" value="' + k + '"' + (k === th ? " checked" : "") + '><i></i><span>' + esc(C.THEMES[k][1]) + "</span></label>").join("") + "</div></div>" +
      '<div class="form-foot" style="display:flex;justify-content:flex-end;gap:10px"><button class="btn btn-ghost" type="button" onclick="Celestial.closeModal()">ยกเลิก</button><button class="btn btn-rose" type="submit">บันทึกโปรไฟล์</button></div></form>');
    const form = $("#pe"), tok = () => C.Fan.get().token;
    const apply = u => { P = Object.assign({}, P, u); Object.assign(ME.user, u); C.Fan.patch(u); };
    $$("input[type=file]", form).forEach(inp => inp.addEventListener("change", async () => {
      const file = inp.files[0]; if (!file) return; const kind = inp.dataset.kind, lab = inp.parentElement; lab.classList.add("loading"); lab.firstChild.textContent = "กำลังอัปโหลด…";
      try {
        const dataUrl = await prepImage(file, kind); const r = await C.API.call("fanUpload", { token: tok(), kind, dataUrl }); apply(r.user);
        if (kind === "avatar") $("#peAv").innerHTML = C.avatarHtml(P); else $("#peWall").innerHTML = '<img src="' + attr(C.imgUrl(P.cover)) + '" alt="">';
        form.querySelector('[data-rm="' + kind + '"]').hidden = false; C.toast("อัปโหลดแล้ว"); render();
      } catch (x) { C.toast(x.message, true); }
      lab.classList.remove("loading"); lab.firstChild.textContent = kind === "avatar" ? "อัปโหลดรูปโปรไฟล์" : "อัปโหลดภาพพื้นหลัง"; inp.value = "";
    }));
    $$("[data-rm]", form).forEach(b => b.addEventListener("click", async () => {
      const kind = b.dataset.rm;
      try { const r = await C.API.call("fanUpdate", { token: tok(), profile: { [kind]: "" } }); apply(r.user); b.hidden = true; if (kind === "avatar") $("#peAv").innerHTML = C.avatarHtml(P); else $("#peWall").innerHTML = "<span>ยังไม่มีภาพพื้นหลัง — ถ้าไม่ใส่ จะใช้รูปเมนแทน</span>"; render(); } catch (x) { C.toast(x.message, true); }
    }));
    form.addEventListener("submit", async e => {
      e.preventDefault(); const btn = form.querySelector("[type=submit]");
      const prof = { displayName: $("#peName").value.trim(), bio: $("#peBio").value.trim(), bias: $("#peBias").value, theme: (form.querySelector("input[name=theme]:checked") || {}).value || "" };
      if (!prof.displayName) { C.toast("กรุณาใส่ชื่อที่แสดง", true); return; }
      btn.disabled = true; btn.textContent = "กำลังบันทึก…";
      try { const r = await C.API.call("fanUpdate", { token: tok(), profile: prof }); apply(r.user); C.closeModal(); C.toast("บันทึกโปรไฟล์แล้ว"); render(); }
      catch (x) { C.toast(x.message, true); btn.disabled = false; btn.textContent = "บันทึกโปรไฟล์"; }
    });
  }

  /* ---------- โหลดข้อมูล ---------- */
  async function loadMe() {
    const s = C.Fan.get(); if (!s) { ME = null; return; }
    try { ME = await C.API.call("fanMe", { token: s.token }); C.Fan.patch(ME.user); }
    catch (e) { ME = null; if (/เซสชัน|ไม่พบบัญชี/.test(e.message)) { C.Fan.clear(); C.renderAcct(); } }
  }
  async function loadProfile() {
    const s = C.Fan.get();
    await loadMe();
    if (askU && !(ME && ME.user.username === askU)) {
      try { P = await C.API.get("fan", { u: askU }); if (!P || !P.username) throw new Error("Code.gs บนเซิร์ฟเวอร์ยังเป็นเวอร์ชันเก่า — วาง Code.gs ใหม่ รัน setup แล้ว Deploy เป็น New version"); err = ""; } catch (e) { err = e.message; P = null; }
    } else if (ME) { P = Object.assign({}, ME.user); err = ""; }
    else { P = null; err = s && C.Fan.get() ? "โหลดโปรไฟล์ไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง" : ""; }
    render();
  }
  document.addEventListener("fan:change", loadProfile);
  setInterval(() => { const c = $(".hb-clock"); if (c) { const ms = C.msToBkkMidnight(); c.textContent = C.fmtClock(ms); if (ms < 1000) setTimeout(loadProfile, 1500); } }, 1000);
  C.API.loadPublic(d => { DATA = d; render(); }).then(loadProfile);
}
