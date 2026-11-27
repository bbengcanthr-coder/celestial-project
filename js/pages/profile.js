/* FAN PROFILE
   profile.html             → โปรไฟล์ของฉัน (แก้ไขได้ ต้องล็อกอิน)
   profile.html?u=ชื่อผู้ใช้  → ดูโปรไฟล์ของแฟนคลับคนอื่น (เฉพาะที่เปิดเป็นสาธารณะ)
   profile.html?review=1    → ทีมงานตรวจโปรไฟล์ (ใช้เซสชันเดียวกับหน้า admin.html) */
{
  const C = window.Celestial, P = window.CelestialProfile, { $, $$, esc, attr } = C;
  const root = $("#fpRoot");
  const MODE = C.qs("review") ? "review" : C.qs("u") ? "view" : "me";
  let DATA = null, ME = null, FORM = null, VIEW = null, LIST = null, dirty = false;

  /* ---------- helpers ---------- */
  const isSessionErr = m => /เซสชัน|เข้าสู่ระบบ|ไม่พบบัญชี/.test(m || "");
  const notInstalled = m => /ไม่รู้จักคำสั่ง\s*profile/i.test(m || "");
  const NOT_READY = "ทีมงาน: วางไฟล์ backend/Profile.gs ใน Apps Script แล้ว Deploy เป็น New version ตามคู่มือใน README";
  function head(eyebrow, title, lead) {
    $("#fpHead").innerHTML = '<span class="eyebrow">' + esc(eyebrow) + '</span><h1 class="title">' + esc(title) + "</h1>" + (lead ? '<p class="lead">' + esc(lead) + "</p>" : "");
  }
  function box(title, body, actions) {
    return '<div class="fp-empty panel"><span class="fp-empty-ic" aria-hidden="true">✦</span><h2 class="title-sm">' + esc(title) + "</h2>" + (body ? '<p class="lead">' + esc(body) + "</p>" : "") + (actions ? '<div class="toolbar">' + actions + "</div>" : "") + "</div>";
  }
  const profileUrl = u => new URL("profile.html?u=" + encodeURIComponent(u), location.href).href;
  const fmtTs = s => { if (!s) return "—"; const d = new Date(s); return isNaN(d) ? String(s) : d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }); };
  async function copy(txt, ok) {
    try { await navigator.clipboard.writeText(txt); C.toast(ok); return; } catch (e) { }
    const t = document.createElement("textarea"); t.value = txt; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); C.toast(ok); } catch (e) { C.toast("คัดลอกไม่ได้ — กดค้างที่ลิงก์เพื่อคัดลอกเอง", true); }
    t.remove();
  }
  function ask(msg, okLabel) {
    return new Promise(res => {
      let done = false;
      C.modal('<div class="pad"><h3 class="title-sm" style="margin:0 0 8px">' + esc(okLabel) + '</h3><p class="lead" style="margin:0 0 18px">' + esc(msg) + '</p><div class="toolbar" style="justify-content:flex-end"><button class="btn btn-ghost" type="button" id="fpNo">ยกเลิก</button><button class="btn btn-rose" type="button" id="fpYes" autofocus>' + esc(okLabel) + "</button></div></div>", { size: "sm", onClose: () => { if (!done) res(false); } });
      $("#fpNo").onclick = () => C.closeModal();
      $("#fpYes").onclick = () => { done = true; C.closeModal(); res(true); };
    });
  }
  async function fanCall(action, p) {
    const s = C.Fan.get(); if (!s) throw new Error("กรุณาเข้าสู่ระบบ");
    try { return await C.API.call(action, Object.assign({ token: s.token }, p || {})); }
    catch (e) { if (isSessionErr(e.message) && !notInstalled(e.message)) { C.Fan.clear(); C.renderAcct(); } throw e; }
  }

  /* ---------- การ์ดโปรไฟล์ (ใช้ทั้งตัวอย่างตอนแก้ไขและหน้าสาธารณะ) ---------- */
  const trainee = id => id && DATA && (DATA.trainees || []).find(t => t.id === id);
  function biasHtml(id) {
    const t = trainee(id); if (!t) return "";
    return '<button type="button" class="fp-bias" data-tid="' + attr(t.id) + '" title="ดูโปรไฟล์เด็กฝึก"><span class="ph">' + C.portrait(t) + '</span><span class="fp-bias-txt"><small>เมนที่เชียร์</small><b>' + esc(t.stageName || t.name) + "</b><em>" + esc(C.code(t)) + (t.status !== "active" ? " · " + esc(C.STATUS[t.status] || t.status) : "") + '</em></span><span class="fp-bias-go" aria-hidden="true">›</span></button>';
  }
  function socialsHtml(so) {
    return P.SOCIALS.map(s => {
      const v = (so || {})[s.k]; if (!v) return "";
      const ic = '<svg viewBox="0 0 24 24" aria-hidden="true">' + s.icon + "</svg>";
      return s.url
        ? '<a href="' + attr(s.url(v)) + '" target="_blank" rel="noopener nofollow ugc" title="' + attr(s.label) + '">' + ic + "<span>" + esc(v) + "</span></a>"
        : '<button type="button" data-copy="' + attr(v) + '" title="คัดลอกชื่อ ' + attr(s.label) + '">' + ic + "<span>" + esc(v) + "</span></button>";
    }).join("");
  }
  function cardHtml(user, pr, o = {}) {
    const t = P.THEMES[pr.theme] || P.THEMES.rose, lv = P.level(user.votes), so = socialsHtml(pr.socials);
    const facts = [
      pr.birthday && P.birthdayText(pr.birthday) ? ["วันเกิด", P.birthdayText(pr.birthday)] : null,
      user.createdAt ? ["สมาชิกตั้งแต่", C.fmtDate(P.bkkDate(user.createdAt))] : null,
      ["โหวตแล้ว", (Number(user.votes) || 0).toLocaleString("th-TH") + " ครั้ง"]
    ].filter(Boolean);
    const nextLv = o.preview && lv.next != null ? '<small class="fp-next">อีก ' + (lv.next - (Number(user.votes) || 0)) + " โหวตถึงระดับถัดไป</small>" : "";
    return '<article class="fp-card" style="--t1:' + t[0] + ";--t2:" + t[1] + '">' +
      '<div class="fp-cover" aria-hidden="true"></div>' +
      '<div class="fp-id">' + P.avatar(user.displayName, pr.avatar, pr.theme, "fp-av-lg") +
      '<div class="fp-names"><h2>' + esc(user.displayName || "—") + "</h2><span>@" + esc(user.username) + "</span></div></div>" +
      '<div class="fp-body"><div class="fp-lvrow"><span class="fp-level" title="ระดับแฟนคลับตามจำนวนครั้งที่โหวต">✦ ' + esc(lv.th) + " <small>" + esc(lv.en) + "</small></span>" + nextLv + "</div>" +
      (pr.bio ? '<p class="fp-bio">' + esc(pr.bio) + "</p>" : o.preview ? '<p class="fp-bio muted">ยังไม่มีข้อความแนะนำตัว</p>' : "") +
      biasHtml(pr.bias) +
      '<dl class="fp-facts">' + facts.map(f => "<div><dt>" + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd></div>").join("") + "</dl>" +
      (so ? '<div class="fp-socials">' + so + "</div>" : "") +
      "</div></article>";
  }

  /* ============================================================
     โปรไฟล์ของฉัน
     ============================================================ */
  function fromProfile(r) {
    const p = r.profile || {};
    return { displayName: r.user.displayName || "", bio: p.bio || "", bias: p.bias || "", birthday: p.birthday || "", bpart: false, theme: P.THEMES[p.theme] ? p.theme : "rose", public: p.public !== false, socials: Object.assign({}, p.socials || {}) };
  }
  function renderMe() {
    head("Fan profile", "MY PROFILE", "ตั้งชื่อ รูปโปรไฟล์ และเรื่องราวของคุณ ให้แฟนคลับคนอื่นรู้จักคุณมากขึ้น");
    if (!C.Fan.get()) {
      root.innerHTML = box("เข้าสู่ระบบเพื่อแก้ไขโปรไฟล์", "ใช้บัญชีแฟนคลับเดียวกับที่ใช้โหวต ยังไม่มีบัญชี? สมัครได้ในไม่ถึงนาที",
        '<a class="btn btn-rose" href="login.html?next=profile.html">เข้าสู่ระบบ</a><a class="btn btn-ghost" href="login.html?mode=register&next=profile.html">สมัครสมาชิก</a>');
      return;
    }
    if (!ME || !DATA) return;
    if (!FORM) FORM = fromProfile(ME);
    root.innerHTML = '<div class="fp-layout"><aside class="fp-side"><span class="eyebrow th">ตัวอย่างโปรไฟล์ที่คนอื่นเห็น</span><div id="fpPreview"></div><div id="fpShare"></div></aside>' + formHtml() + "</div>";
    bindForm(); renderNotices(); renderSide();
  }
  function formHtml() {
    const f = FORM, tr = (DATA.trainees || []).slice().sort((a, b) => (Number(a.no) || 0) - (Number(b.no) || 0));
    const opt = t => '<option value="' + attr(t.id) + '"' + (t.id === f.bias ? " selected" : "") + ">" + esc(C.code(t) + " · " + (t.stageName || t.name) + (t.stageName && t.stageName !== t.name ? " (" + t.name + ")" : "") + (t.status !== "active" ? " — " + (C.STATUS[t.status] || t.status) : "")) + "</option>";
    const act = tr.filter(t => t.status === "active"), other = tr.filter(t => t.status !== "active");
    const bm = f.birthday ? Number(f.birthday.slice(0, 2)) : 0, bd = f.birthday ? Number(f.birthday.slice(3)) : 0;
    const days = '<option value="">วัน</option>' + Array.from({ length: 31 }, (_, i) => '<option value="' + (i + 1) + '"' + (bd === i + 1 ? " selected" : "") + ">" + (i + 1) + "</option>").join("");
    const months = '<option value="">เดือน</option>' + C.TH_M.map((m, i) => '<option value="' + (i + 1) + '"' + (bm === i + 1 ? " selected" : "") + ">" + m + "</option>").join("");
    const themes = Object.keys(P.THEMES).map(k => '<label class="fp-sw" style="--t1:' + P.THEMES[k][0] + ";--t2:" + P.THEMES[k][1] + '"><input type="radio" name="theme" value="' + k + '"' + (f.theme === k ? " checked" : "") + '><span aria-hidden="true"></span><em>' + esc(P.THEMES[k][2]) + "</em></label>").join("");
    const socials = P.SOCIALS.map(s => '<div class="field"><label for="so_' + s.k + '">' + esc(s.label) + '</label><div class="fp-pre"><span><svg viewBox="0 0 24 24" aria-hidden="true">' + s.icon + "</svg>" + (s.url ? esc(s.pre) : "") + '</span><input class="input" id="so_' + s.k + '" name="so_' + s.k + '" value="' + attr(f.socials[s.k] || "") + '" placeholder="' + (s.k === "discord" ? "ชื่อผู้ใช้ Discord" : "ชื่อบัญชี หรือวางลิงก์") + '" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="120"></div><p class="fp-ferr hide" data-err-for="' + s.k + '"></p></div>').join("");
    return '<form class="fp-form panel" id="fpForm" novalidate>' +
      '<div class="fp-form-head"><h2 class="title-sm">แก้ไขโปรไฟล์</h2><span class="muted">@' + esc(ME.user.username) + "</span></div>" +
      '<div id="fpNotices"></div><p class="fp-err hide" id="fpErr" role="alert"></p>' +
      '<fieldset class="fp-fs" id="fpFields">' +
      '<div class="fp-avrow" id="fpAvRow"></div>' +
      '<div class="field"><label for="displayName">ชื่อที่แสดง</label><input class="input" id="displayName" name="displayName" maxlength="40" value="' + attr(f.displayName) + '" required><p class="fp-ferr hide" data-err-for="displayName"></p></div>' +
      '<div class="field"><label for="bio">แนะนำตัว <small class="muted">(ไม่บังคับ)</small></label><textarea class="input fp-ta" id="bio" name="bio" maxlength="' + P.BIO_MAX + '" rows="4" placeholder="เล่าเกี่ยวกับตัวคุณ หรือเหตุผลที่เชียร์เด็กฝึกคนนี้">' + esc(f.bio) + '</textarea><span class="fp-count" id="bioCount"></span></div>' +
      '<div class="field"><label for="bias">เมนที่เชียร์ <small class="muted">(ไม่บังคับ)</small></label><select class="input" id="bias" name="bias"><option value="">— ยังไม่เลือก —</option>' +
      (act.length ? '<optgroup label="กำลังแข่งขัน">' + act.map(opt).join("") + "</optgroup>" : "") + (other.length ? '<optgroup label="อื่น ๆ">' + other.map(opt).join("") + "</optgroup>" : "") + "</select></div>" +
      '<div class="field"><span class="fp-label" id="bLabel">วันเกิด <small class="muted">(ไม่บังคับ — แสดงเฉพาะวันและเดือน)</small></span><div class="fp-two" role="group" aria-labelledby="bLabel"><select class="input" name="bday" aria-label="วัน">' + days + '</select><select class="input" name="bmonth" aria-label="เดือน">' + months + '</select></div><p class="fp-ferr hide" data-err-for="birthday"></p></div>' +
      '<div class="field"><span class="fp-label">สีธีมโปรไฟล์</span><div class="fp-swatches" role="radiogroup" aria-label="สีธีมโปรไฟล์">' + themes + "</div></div>" +
      '<div class="fp-group"><h3>ช่องทางโซเชียล <small class="muted">(ไม่บังคับ)</small></h3>' + socials + "</div>" +
      '<label class="fp-switch"><input type="checkbox" name="public"' + (f.public ? " checked" : "") + '><span class="fp-track" aria-hidden="true"></span><span><b>แสดงโปรไฟล์ให้คนอื่นเห็น</b><small>ปิดไว้ = มีแค่คุณที่เห็นโปรไฟล์นี้ ลิงก์โปรไฟล์จะใช้ไม่ได้</small></span></label>' +
      "</fieldset>" +
      '<div class="fp-savebar"><span id="fpStatus" class="muted">ข้อมูลล่าสุดแล้ว</span><button class="btn btn-rose" type="submit" id="fpSave">บันทึกโปรไฟล์</button></div>' +
      "</form>";
  }
  let avBusy = false;
  const avIcon = () => P.avatar(P.line(FORM.displayName, 40) || ME.user.displayName, ME.profile.avatar, FORM.theme, "fp-av-md");
  function refreshAvIcon() { const b = $("#fpAvBox"); if (b) { const sp = avBusy ? '<span class="fp-spin" aria-label="กำลังอัปโหลด"></span>' : ""; b.innerHTML = avIcon() + sp; } }
  function renderAv() {
    const row = $("#fpAvRow"); if (!row) return;
    const p = ME.profile, locked = ME.user.banned, busy = avBusy;
    row.innerHTML = '<div class="fp-avbox' + (busy ? " busy" : "") + '" id="fpAvBox">' + avIcon() + (busy ? '<span class="fp-spin" aria-label="กำลังอัปโหลด"></span>' : "") + "</div>" +
      '<div><span class="fp-label">รูปโปรไฟล์</span><div class="toolbar"><button type="button" class="btn btn-ghost btn-sm" id="fpPick"' + (busy || locked ? " disabled" : "") + ">" + (p.avatar ? "เปลี่ยนรูป" : "อัปโหลดรูป") + "</button>" +
      (p.avatar ? '<button type="button" class="btn btn-ghost btn-sm" id="fpRemove"' + (busy || locked ? " disabled" : "") + ">ลบรูป</button>" : "") + "</div>" +
      '<p class="fp-hint">JPG, PNG หรือ WEBP — เลือกแล้วปรับตำแหน่งได้ ระบบย่อรูปให้อัตโนมัติ</p></div>' +
      '<input type="file" id="fpFile" accept="image/jpeg,image/png,image/webp,image/*" hidden>';
    const pick = $("#fpPick"), file = $("#fpFile"), rm = $("#fpRemove");
    if (pick) pick.addEventListener("click", () => file.click());
    file.addEventListener("change", async () => {
      const f = file.files && file.files[0]; file.value = ""; if (!f) return;
      try { const url = await cropper(f); if (url) await uploadAvatar(url); } catch (x) { C.toast(x.message, true); }
    });
    if (rm) rm.addEventListener("click", async () => { if (await ask("ลบรูปโปรไฟล์นี้? โปรไฟล์จะกลับไปใช้ตัวอักษรแรกของชื่อแทน", "ลบรูป")) uploadAvatar(""); });
  }
  function renderNotices() {
    const el = $("#fpNotices"); if (!el) return; const n = [];
    if (ME.user.banned) n.push(["no", "บัญชีนี้ถูกระงับโดยทีมงาน จึงแก้ไขโปรไฟล์ไม่ได้"]);
    else if (ME.profile.hidden) n.push(["no", "ทีมงานซ่อนโปรไฟล์ของคุณจากหน้าสาธารณะ หากคิดว่าเป็นความผิดพลาด ติดต่อทีมงานผ่านเพจหรือกลุ่มทางการ"]);
    if (!ME.exists && !ME.user.banned) n.push(["", "ยังไม่ได้สร้างโปรไฟล์ — กรอกข้อมูลแล้วกดบันทึก คนอื่นจะเห็นโปรไฟล์หลังจากบันทึกครั้งแรก"]);
    el.innerHTML = n.map(x => '<p class="fp-note ' + x[0] + '">' + esc(x[1]) + "</p>").join("");
    const fs = $("#fpFields"), sv = $("#fpSave"); if (fs) fs.disabled = !!ME.user.banned; if (sv) sv.disabled = !!ME.user.banned;
  }
  function renderSide() {
    const so = {}; P.SOCIALS.forEach(s => { const r = P.normSocial(s.k, FORM.socials[s.k]); if (r.ok && r.v) so[s.k] = r.v; });
    const user = Object.assign({}, ME.user, { displayName: P.line(FORM.displayName, 40) || ME.user.displayName });
    const pr = Object.assign({}, ME.profile, { bio: P.text(FORM.bio, P.BIO_MAX), bias: FORM.bias, birthday: P.validBirthday(FORM.birthday) ? FORM.birthday : "", theme: FORM.theme, socials: so });
    $("#fpPreview").innerHTML = cardHtml(user, pr, { preview: true });
    const sh = $("#fpShare"), p = ME.profile, u = ME.user.username;
    let html = "";
    if (ME.user.banned) html = "";
    else if (!ME.exists) html = '<p class="muted">บันทึกโปรไฟล์ครั้งแรกแล้วจะได้ลิงก์สำหรับแชร์</p>';
    else if (p.hidden) html = '<p class="muted">ทีมงานซ่อนโปรไฟล์นี้อยู่ ลิงก์โปรไฟล์จึงใช้ไม่ได้ชั่วคราว</p>';
    else if (!p.public) html = '<p class="muted">โปรไฟล์เป็นส่วนตัว — มีแค่คุณที่เห็น</p>';
    else html = '<label class="fp-label" for="fpLink">ลิงก์โปรไฟล์ของคุณ</label><input class="input fp-link" id="fpLink" readonly value="' + attr(profileUrl(u)) + '"><div class="toolbar"><button class="btn btn-ghost btn-sm" type="button" data-share="' + attr(u) + '">คัดลอกลิงก์</button><a class="btn btn-ghost btn-sm" href="profile.html?u=' + encodeURIComponent(u) + '">ดูหน้าสาธารณะ</a></div>';
    sh.innerHTML = html ? '<div class="fp-sharebox">' + html + "</div>" : "";
    const bc = $("#bioCount"); if (bc) { const n = (FORM.bio || "").length; bc.textContent = n + "/" + P.BIO_MAX; bc.classList.toggle("warn", n > P.BIO_MAX - 20); }
    if ($("#fpAvBox")) refreshAvIcon(); else renderAv();
  }
  function readForm() {
    const f = $("#fpForm"); if (!f) return; const g = n => f.elements[n];
    const m = g("bmonth").value, d = g("bday").value;
    FORM = {
      displayName: g("displayName").value, bio: g("bio").value, bias: g("bias").value,
      birthday: m && d ? String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0") : "", bpart: !!m !== !!d,
      theme: (f.querySelector("input[name=theme]:checked") || {}).value || "rose", public: g("public").checked, socials: {}
    };
    P.SOCIALS.forEach(s => { FORM.socials[s.k] = g("so_" + s.k).value; });
  }
  function setStatus(t, warn) { const s = $("#fpStatus"); if (s) { s.textContent = t; s.classList.toggle("warn", !!warn); } }
  function showErrs(errs) {
    $$("[data-err-for]").forEach(e => { const m = errs[e.dataset.errFor]; e.textContent = m || ""; e.classList.toggle("hide", !m); });
    const top = $("#fpErr"); const n = Object.keys(errs).length;
    top.textContent = n ? "กรุณาแก้ไขช่องที่มีข้อความสีแดง" : ""; top.classList.toggle("hide", !n);
  }
  function topErr(msg) { const top = $("#fpErr"); top.textContent = msg || ""; top.classList.toggle("hide", !msg); if (msg) top.scrollIntoView({ block: "center", behavior: "smooth" }); }
  function bindForm() {
    const f = $("#fpForm");
    f.addEventListener("input", () => { readForm(); dirty = true; setStatus("มีการแก้ไขที่ยังไม่ได้บันทึก", true); renderSide(); });
    f.addEventListener("change", () => { readForm(); renderSide(); });
    f.addEventListener("submit", save);
  }
  async function save(e) {
    e.preventDefault(); readForm();
    const errs = {}, name = P.line(FORM.displayName, 40);
    if (!name) errs.displayName = "กรุณาใส่ชื่อที่แสดง";
    if (FORM.bpart) errs.birthday = "เลือกให้ครบทั้งวันและเดือน (หรือเว้นว่างทั้งสองช่อง)";
    else if (FORM.birthday && !P.validBirthday(FORM.birthday)) errs.birthday = "วันที่นี้ไม่มีในเดือนที่เลือก";
    const socials = {}; P.SOCIALS.forEach(s => { const r = P.normSocial(s.k, FORM.socials[s.k]); if (!r.ok) errs[s.k] = r.err; else if (r.v) socials[s.k] = r.v; });
    showErrs(errs);
    if (Object.keys(errs).length) { const first = $("[data-err-for]:not(.hide)"); const inp = first && first.parentElement.querySelector("input,select,textarea"); inp && inp.focus(); return; }
    const btn = $("#fpSave"); btn.disabled = true; btn.textContent = "กำลังบันทึก…"; topErr("");
    try {
      const r = await fanCall("profileSave", { profile: { displayName: name, bio: P.text(FORM.bio, P.BIO_MAX), bias: FORM.bias, birthday: FORM.birthday, theme: FORM.theme, public: FORM.public, socials } });
      ME = r; P.remember(r); FORM = fromProfile(r); dirty = false;
      const fm = $("#fpForm"); fm.elements.displayName.value = FORM.displayName; P.SOCIALS.forEach(s => { fm.elements["so_" + s.k].value = FORM.socials[s.k] || ""; });
      setStatus("บันทึกแล้ว ✓"); C.toast("บันทึกโปรไฟล์แล้ว"); renderNotices(); renderSide();
    } catch (x) {
      if (notInstalled(x.message)) topErr("ระบบโปรไฟล์ยังไม่พร้อมใช้งาน — " + NOT_READY);
      else if (isSessionErr(x.message)) { C.toast(x.message, true); ME = null; FORM = null; renderMe(); return; }
      else topErr(x.message);
    }
    btn.disabled = !!(ME && ME.user.banned); btn.textContent = "บันทึกโปรไฟล์";
  }
  async function uploadAvatar(dataUrl) {
    avBusy = true; renderAv();
    try {
      const r = await fanCall("profileAvatar", dataUrl ? { dataUrl } : { remove: true });
      ME.profile.avatar = r.profile.avatar; ME.profile.public = r.profile.public; ME.profile.hidden = r.profile.hidden; ME.exists = true; ME.user = r.user;
      P.remember(r); C.toast(dataUrl ? "เปลี่ยนรูปโปรไฟล์แล้ว" : "ลบรูปโปรไฟล์แล้ว"); renderNotices();
    } catch (x) {
      avBusy = false;
      if (isSessionErr(x.message) && !notInstalled(x.message)) { C.toast(x.message, true); ME = null; FORM = null; renderMe(); return; }
      C.toast(notInstalled(x.message) ? "ระบบโปรไฟล์ยังไม่พร้อมใช้งาน" : x.message, true);
    }
    avBusy = false; renderAv(); renderSide();
  }

  /* ---------- ปรับตำแหน่ง / ซูมรูป แล้วย่อเป็นสี่เหลี่ยมจัตุรัส ---------- */
  const OUT = 320;
  function cropper(file) {
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type || "") && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || "")) return reject(new Error("กรุณาเลือกไฟล์รูปภาพ"));
      if (file.size > 15 * 1024 * 1024) return reject(new Error("ไฟล์ใหญ่เกิน 15MB กรุณาเลือกรูปที่เล็กลง"));
      const src = URL.createObjectURL(file), img = new Image();
      img.onerror = () => { URL.revokeObjectURL(src); reject(new Error("เปิดรูปนี้ไม่ได้ ลองใช้ไฟล์ JPG หรือ PNG")); };
      img.onload = () => {
        let done = false;
        C.modal('<div class="pad fp-cropbox"><h3 class="title-sm">ปรับรูปโปรไฟล์</h3><p class="muted">ลากรูปเพื่อเลื่อน • ใช้แถบด้านล่าง (หรือล้อเมาส์) เพื่อซูม</p>' +
          '<div class="fp-crop" id="fpCrop"><img id="fpCropImg" alt="" draggable="false"></div>' +
          '<label class="fp-zoom"><span aria-hidden="true">−</span><input type="range" id="fpZoom" min="1" max="4" step="0.01" value="1" aria-label="ซูม"><span aria-hidden="true">+</span></label>' +
          '<div class="toolbar" style="justify-content:flex-end"><button class="btn btn-ghost" type="button" id="fpCropNo">ยกเลิก</button><button class="btn btn-rose" type="button" id="fpCropOk" autofocus>ใช้รูปนี้</button></div></div>',
          { size: "sm", onClose: () => { URL.revokeObjectURL(src); if (!done) resolve(null); } });
        const view = $("#fpCrop"), el = $("#fpCropImg"), zoom = $("#fpZoom");
        el.src = src;
        const W = img.naturalWidth, H = img.naturalHeight;
        let V = view.clientWidth || 260, z = 1, cx = 0, cy = 0;
        const base = () => Math.max(V / W, V / H);
        const clamp = () => { const s = base() * z, mx = Math.max(0, (W * s - V) / 2), my = Math.max(0, (H * s - V) / 2); cx = Math.min(mx, Math.max(-mx, cx)); cy = Math.min(my, Math.max(-my, cy)); };
        const apply = () => { clamp(); const s = base() * z; el.style.width = W * s + "px"; el.style.height = H * s + "px"; el.style.transform = "translate(calc(-50% + " + cx + "px), calc(-50% + " + cy + "px))"; };
        apply();
        let drag = null;
        view.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, cx, cy }; view.setPointerCapture(e.pointerId); view.classList.add("drag"); });
        view.addEventListener("pointermove", e => { if (!drag) return; cx = drag.cx + e.clientX - drag.x; cy = drag.cy + e.clientY - drag.y; apply(); });
        const end = () => { drag = null; view.classList.remove("drag"); };
        view.addEventListener("pointerup", end); view.addEventListener("pointercancel", end);
        const setZ = nz => { const old = z; z = Math.min(4, Math.max(1, nz)); cx *= z / old; cy *= z / old; zoom.value = z; apply(); };
        view.addEventListener("wheel", e => { e.preventDefault(); setZ(z * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
        zoom.addEventListener("input", () => setZ(Number(zoom.value)));
        view.tabIndex = 0; view.setAttribute("aria-label", "พื้นที่ปรับรูป ใช้ปุ่มลูกศรเพื่อเลื่อน");
        view.addEventListener("keydown", e => { const k = { ArrowLeft: [8, 0], ArrowRight: [-8, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key]; if (k) { e.preventDefault(); cx += k[0]; cy += k[1]; apply(); } });
        $("#fpCropNo").onclick = () => C.closeModal();
        $("#fpCropOk").onclick = () => {
          V = view.clientWidth || V;
          const s = base() * z, k = OUT / V, x = V / 2 + cx - W * s / 2, y = V / 2 + cy - H * s / 2;
          const cv = document.createElement("canvas"); cv.width = cv.height = OUT; const ctx = cv.getContext("2d");
          ctx.fillStyle = "#0a2c35"; ctx.fillRect(0, 0, OUT, OUT); ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, x * k, y * k, W * s * k, H * s * k);
          let url = cv.toDataURL("image/jpeg", 0.86); if (url.length > 60000) url = cv.toDataURL("image/jpeg", 0.72);
          done = true; C.closeModal(); resolve(url);
        };
      };
      img.src = src;
    });
  }

  /* ============================================================
     ดูโปรไฟล์ของคนอื่น (?u=)
     ============================================================ */
  const MOD_LABEL = { removeAvatar: "ลบรูป", clearBio: "ล้างข้อความแนะนำตัว", hide: "ซ่อนโปรไฟล์", unhide: "เลิกซ่อน" };
  const MOD_ASK = { removeAvatar: "ลบรูปโปรไฟล์ของแฟนคลับคนนี้? (ไฟล์รูปจะถูกย้ายลงถังขยะ)", clearBio: "ล้างข้อความแนะนำตัวของแฟนคลับคนนี้?", hide: "ซ่อนโปรไฟล์นี้จากหน้าสาธารณะ? เจ้าของจะยังเห็นโปรไฟล์ตัวเอง แต่คนอื่นเปิดลิงก์ไม่ได้" };
  function modButtons(id, pr, hidden) {
    const b = op => '<button class="btn btn-ghost btn-sm' + (op === "hide" ? " fp-danger" : "") + '" type="button" data-mod="' + op + '" data-fan="' + attr(id) + '">' + esc(MOD_LABEL[op]) + "</button>";
    return (pr.avatar ? b("removeAvatar") : "") + (pr.bio ? b("clearBio") : "") + b(hidden ? "unhide" : "hide");
  }
  function flagsHtml(m) {
    const f = [m.banned ? "บัญชีถูกระงับ" : "", m.hidden ? "ซ่อนโดยทีมงาน" : "", m.public === false ? "เจ้าของตั้งเป็นส่วนตัว" : "", m.exists === false ? "ยังไม่ได้สร้างโปรไฟล์" : ""].filter(Boolean);
    return f.length ? f.map(x => '<span class="chip warn">' + esc(x) + "</span>").join("") : '<span class="chip b">แสดงต่อสาธารณะ</span>';
  }
  async function moderate(fanId, op, after) {
    const st = P.staffSession();
    if (!st) { C.toast("เซสชันทีมงานหมดอายุ กรุณาเข้าสู่ระบบหลังบ้านใหม่", true); return; }
    if (MOD_ASK[op] && !await ask(MOD_ASK[op], MOD_LABEL[op])) return;
    try { await C.API.call("profileModerate", { token: st.token, fanId, op }); C.toast(MOD_LABEL[op] + "แล้ว"); after && after(); }
    catch (x) { C.toast(x.message, true); }
  }
  async function loadView() {
    const u = String(C.qs("u") || "").trim().toLowerCase(), st = P.staffSession();
    head("Fan profile", "FAN PROFILE", "");
    try { VIEW = await C.API.call("profileView", Object.assign({ username: u }, st ? { staffToken: st.token } : {})); drawView(); }
    catch (e) {
      const s = C.Fan.get(), mine = s && s.user && s.user.username === u;
      root.innerHTML = box(notInstalled(e.message) ? "ระบบโปรไฟล์ยังไม่พร้อมใช้งาน" : e.message, notInstalled(e.message) ? NOT_READY : mine ? "นี่คือลิงก์โปรไฟล์ของคุณ ตั้งค่าให้คนอื่นเห็นได้ที่หน้าโปรไฟล์ของฉัน" : "",
        (mine ? '<a class="btn btn-rose" href="profile.html">ไปที่โปรไฟล์ของฉัน</a>' : "") + '<a class="btn btn-ghost" href="home.html">กลับหน้าแรก</a>');
    }
  }
  function drawView() {
    if (!VIEW) return;
    const s = C.Fan.get(), mine = s && s.user && s.user.username === VIEW.user.username;
    head("Fan profile", "FAN PROFILE", "โปรไฟล์ของ " + VIEW.user.displayName);
    document.title = VIEW.user.displayName + " — โปรไฟล์แฟนคลับ — THE CELESTIAL : PROJECT";
    const mod = VIEW.mod ? '<div class="fp-mod"><span class="eyebrow th">เครื่องมือทีมงาน</span><div class="fp-flags">' + flagsHtml(VIEW.mod) + "</div>" + (VIEW.mod.exists ? '<div class="toolbar">' + modButtons(VIEW.mod.fanId, VIEW.profile, VIEW.mod.hidden) + "</div>" : "") + '<a class="fp-modlink" href="profile.html?review=1">ดูโปรไฟล์ทั้งหมด ›</a></div>' : "";
    root.innerHTML = '<div class="fp-viewwrap">' + mod + cardHtml(VIEW.user, VIEW.profile) +
      '<div class="toolbar fp-viewacts">' + (mine ? '<a class="btn btn-rose" href="profile.html">แก้ไขโปรไฟล์</a>' : "") + '<button class="btn btn-ghost" type="button" data-share="' + attr(VIEW.user.username) + '">คัดลอกลิงก์โปรไฟล์</button></div></div>';
  }

  /* ============================================================
     ทีมงานตรวจโปรไฟล์ (?review=1)
     ============================================================ */
  let rq = "", rqT = null;
  function renderReview() {
    head("Staff only", "PROFILE REVIEW", "ตรวจโปรไฟล์แฟนคลับ ลบรูปหรือข้อความที่ไม่เหมาะสม และซ่อนโปรไฟล์ที่ผิดกฎ (ทุกการกระทำถูกบันทึกในหลังบ้าน)");
    if (!P.staffSession()) { root.innerHTML = box("สำหรับทีมงานเท่านั้น", "เข้าสู่ระบบหลังบ้านก่อน แล้วเปิดหน้านี้อีกครั้ง", '<a class="btn btn-rose" href="admin.html">ไปหน้าหลังบ้าน</a>'); return; }
    root.innerHTML = '<div class="fp-review"><div class="toolbar fp-revbar"><label class="search"><span class="sr">ค้นหา</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input class="input" id="rq" placeholder="ค้นหาชื่อ ชื่อผู้ใช้ หรือข้อความแนะนำตัว" autocomplete="off"></label><span class="muted" id="rCount"></span><button class="btn btn-ghost btn-sm" type="button" id="rReload">โหลดใหม่</button><a class="btn btn-ghost btn-sm" href="admin.html">กลับหลังบ้าน</a></div><div class="fp-rev-grid" id="rList">' + '<div class="skel" style="height:220px"></div>'.repeat(3) + "</div></div>";
    $("#rq").addEventListener("input", e => { rq = e.target.value.trim(); clearTimeout(rqT); rqT = setTimeout(loadReview, 380); });
    $("#rReload").addEventListener("click", loadReview);
    loadReview();
  }
  async function loadReview() {
    const st = P.staffSession(); if (!st) { renderReview(); return; }
    try { LIST = await C.API.call("profileList", { token: st.token, q: rq }); drawReview(); }
    catch (e) {
      if (/เซสชัน|ปิดใช้งาน/.test(e.message)) { C.Store.del("celestial_staff"); renderReview(); C.toast(e.message, true); return; }
      $("#rList").innerHTML = box(notInstalled(e.message) ? "ระบบโปรไฟล์ยังไม่พร้อมใช้งาน" : "โหลดรายการไม่สำเร็จ", notInstalled(e.message) ? NOT_READY : e.message, "");
    }
  }
  function drawReview() {
    if (!LIST) return;
    $("#rCount").textContent = LIST.total > LIST.items.length ? "แสดง " + LIST.items.length + " จาก " + LIST.total + " โปรไฟล์" : LIST.total + " โปรไฟล์";
    $("#rList").innerHTML = LIST.items.map(x => '<article class="fp-rev panel">' +
      '<div class="fp-rev-top">' + (x.avatar ? '<button type="button" class="fp-zoombtn" data-zoom="' + attr(x.avatar) + '" title="ดูรูปขนาดใหญ่">' + P.avatar(x.displayName, x.avatar, "rose", "fp-av-sm") + "</button>" : P.avatar(x.displayName, "", "rose", "fp-av-sm")) +
      '<div><b>' + esc(x.displayName) + "</b><span>@" + esc(x.username) + "</span></div></div>" +
      '<p class="fp-rev-bio">' + (x.bio ? esc(x.bio) : '<span class="muted">ไม่มีข้อความแนะนำตัว</span>') + "</p>" +
      '<div class="fp-flags">' + flagsHtml(x) + "</div>" +
      '<p class="fp-rev-meta">แก้ไขล่าสุด ' + esc(fmtTs(x.updatedAt)) + " · โหวต " + (Number(x.votes) || 0).toLocaleString("th-TH") + " ครั้ง</p>" +
      '<div class="toolbar"><a class="btn btn-ghost btn-sm" href="profile.html?u=' + encodeURIComponent(x.username) + '">ดูโปรไฟล์</a>' + modButtons(x.fanId, x, x.hidden) + "</div></article>").join("") ||
      box(rq ? "ไม่พบโปรไฟล์ที่ค้นหา" : "ยังไม่มีแฟนคลับสร้างโปรไฟล์", "", "");
  }

  /* ---------- คลิกที่ใช้ร่วมกัน ---------- */
  root.addEventListener("click", e => {
    const b = e.target.closest(".fp-bias"); if (b && DATA) { C.openProfile(b.dataset.tid, DATA); return; }
    const cp = e.target.closest("[data-copy]"); if (cp) { copy(cp.dataset.copy, "คัดลอกชื่อแล้ว"); return; }
    const sh = e.target.closest("[data-share]"); if (sh) { copy(profileUrl(sh.dataset.share), "คัดลอกลิงก์โปรไฟล์แล้ว"); return; }
    const z = e.target.closest("[data-zoom]"); if (z) { C.modal('<div class="pad" style="text-align:center"><img class="fp-zoomimg" src="' + attr(C.imgUrl(z.dataset.zoom)) + '" alt="รูปโปรไฟล์"></div>', { size: "sm" }); return; }
    const m = e.target.closest("[data-mod]");
    if (m) moderate(m.dataset.fan, m.dataset.mod, () => { if (MODE === "review") loadReview(); else loadView(); });
  });
  root.addEventListener("focusin", e => { if (e.target.id === "fpLink") e.target.select(); });
  addEventListener("beforeunload", e => { if (dirty && MODE === "me") { e.preventDefault(); e.returnValue = ""; } });
  document.addEventListener("fan:change", () => { if (MODE === "me") { ME = null; FORM = null; dirty = false; boot(); } else if (MODE === "view") drawView(); });

  /* ---------- start ---------- */
  function onData() { if (MODE === "me") { if (ME && $("#fpForm")) renderSide(); else renderMe(); } else if (MODE === "view") drawView(); }
  async function boot() {
    if (MODE === "review") { renderReview(); return; }
    if (MODE === "view") { loadView(); return; }
    renderMe();
    if (!C.Fan.get()) return;
    try { ME = await fanCall("profileGet"); P.remember(ME); renderMe(); }
    catch (e) {
      if (notInstalled(e.message)) root.innerHTML = box("ระบบโปรไฟล์ยังไม่พร้อมใช้งาน", NOT_READY, '<a class="btn btn-ghost" href="home.html">กลับหน้าแรก</a>');
      else if (isSessionErr(e.message)) { C.toast(e.message, true); renderMe(); }
      else root.innerHTML = box("โหลดโปรไฟล์ไม่สำเร็จ", e.message, '<button class="btn btn-ghost" type="button" onclick="location.reload()">ลองใหม่</button>');
    }
  }
  C.API.loadPublic(d => { DATA = d; onData(); }).then(() => { if (!DATA) { DATA = { settings: {}, trainees: [] }; onData(); } });
  boot();
}
