/* ============================================================
   THE CELESTIAL : PROJECT — ระบบหลังบ้านสำหรับสตาฟ
   ============================================================ */
{
  const C = window.Celestial, { $, $$, esc, attr } = C;
  const SKEY = "celestial_staff";
  let S = null, D = null, view = "dashboard", busyN = 0;

  /* ---------- session & api ---------- */
  const Sess = {
    get() { const s = C.Store.get(SKEY); return s && s.exp > Date.now() ? s : null; },
    set(s) { C.Store.set(SKEY, Object.assign({ exp: Date.now() + 11.5 * 3600e3 }, s)); },
    clear() { C.Store.del(SKEY); }
  };
  function saving(on) { busyN += on ? 1 : -1; const el = $("#saving"); if (el) el.classList.toggle("show", busyN > 0); }
  async function call(action, p = {}) {
    saving(true);
    try { return await C.API.call(action, Object.assign({ token: S && S.token }, p)); }
    catch (e) { if (/เซสชัน|ปิดใช้งาน|token/i.test(e.message)) { Sess.clear(); C.toast(e.message, true); setTimeout(() => location.reload(), 1200); } throw e; }
    finally { saving(false); }
  }
  const isAdmin = () => S && S.user && S.user.role === "admin";
  const byOrder = (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0);
  const cats = () => (D.settings.categories || []);
  const rounds = () => (D.rounds || []).slice().sort(byOrder);
  // คะแนนรวมของรอบ = โหวตบนเว็บ + คะแนนจากช่องทางภายนอกที่ทีมงานกรอก (เห็นเฉพาะทีมงาน)
  function combined(round) {
    const web = ((D.tallies || {})[round] || (D.tally && D.tally.round === round ? D.tally : null) || { totals: {} }).totals || {};
    const b = (D.board || {})[round] || {}; const out = Object.assign({}, web);
    (b.sources || []).forEach(s => Object.keys((b.scores || {})[s.id] || {}).forEach(t => out[t] = (out[t] || 0) + (Number(b.scores[s.id][t]) || 0)));
    return out;
  }
  const fmtTs = s => { if (!s) return "—"; const d = new Date(s); return isNaN(d) ? s : d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }); };

  function confirmBox(msg, ok = "ยืนยัน", danger = true, typeWord = "") {
    return new Promise(res => {
      let done = false;
      C.modal('<div class="pad"><h3 class="mt">' + esc(ok) + '</h3><p class="lead" style="margin:0 0 16px">' + esc(msg) + "</p>" + (typeWord ? '<div class="field"><label for="cfw">พิมพ์ <b>' + esc(typeWord) + '</b> เพื่อยืนยัน</label><input class="input" id="cfw" autocomplete="off"></div>' : "") +
        '<div class="toolbar" style="justify-content:flex-end"><button class="btn btn-ghost" type="button" id="cfNo">ยกเลิก</button><button class="btn ' + (danger ? "btn-rose" : "btn-aqua") + '" type="button" id="cfOk" autofocus>' + esc(ok) + "</button></div></div>", { size: "sm", onClose: () => { if (!done) res(false); } });
      $("#cfNo").onclick = () => C.closeModal();
      $("#cfOk").onclick = () => { if (typeWord && $("#cfw").value.trim() !== typeWord) { C.toast("พิมพ์คำยืนยันไม่ถูกต้อง", true); return; } done = true; C.closeModal(); res(true); };
    });
  }

  /* ---------- uploads ---------- */
  function readData(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error("อ่านไฟล์ไม่ได้")); r.readAsDataURL(file); }); }
  async function resizeImage(file, max, q) {
    const url = await readData(file);
    if (/gif|svg/.test(file.type)) return url;
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("ไฟล์รูปไม่ถูกต้อง")); i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height)); const cv = document.createElement("canvas");
    cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL(file.type === "image/png" && k === 1 ? "image/png" : "image/jpeg", q);
  }
  async function upload(file, kind, max) {
    let dataUrl;
    if (kind === "image") dataUrl = await resizeImage(file, C.LIVE ? (Number(max) || 1600) : 900, C.LIVE ? 0.86 : 0.8);
    else { const lim = C.LIVE ? 20e6 : 1.5e6; if (file.size > lim) throw new Error(C.LIVE ? "ไฟล์ใหญ่เกิน 20MB" : "โหมดตัวอย่างรับไฟล์เสียงไม่เกิน 1.5MB ใช้ลิงก์ Google Drive แทน"); dataUrl = await readData(file); }
    const r = await call("upload", { name: file.name, kind, dataUrl }); return r.url;
  }

  /* ---------- ตรวจเซิร์ฟเวอร์ + ตรวจว่ารูปจาก Drive คนทั่วไปเห็นได้จริง ----------
     หมายเหตุ: ในเบราว์เซอร์ของเจ้าของ Google Drive ลิงก์รูปตรงมักเปิดได้เสมอ (เพราะล็อกอินอยู่)
     แต่คนอื่นอาจเปิดไม่ได้ — การตรวจนี้จึงถามเซิร์ฟเวอร์ (Apps Script) ว่าส่งรูปให้คนทั่วไปได้หรือไม่ */
  const oldServer = () => C.LIVE && D && (!D.version || String(D.version) < C.SERVER_VERSION);
  function serverBanner() {
    if (!oldServer()) return "";
    return '<div class="a-card warn-card"><h3>⚠ Code.gs บนเซิร์ฟเวอร์ยังเป็นเวอร์ชันเก่า</h3><p class="desc">หน้าเว็บอัปเดตแล้ว แต่ Apps Script ยังรันโค้ดเก่าอยู่ — <b>รูปจาก Google Drive จะไม่ขึ้นสำหรับคนทั่วไป</b> และระบบประกาศผลโหวต / โปรไฟล์แฟนคลับยังใช้ไม่ได้</p><ol class="steps-sm"><li>Google Sheet → ส่วนขยาย → Apps Script → ลบโค้ดเดิมใน Code.gs แล้ววาง <b>backend/Code.gs</b> ใหม่ทั้งไฟล์ → บันทึก</li><li>เลือกฟังก์ชัน <b>setup</b> → Run</li><li>Deploy → <b>Manage deployments</b> → ✎ แก้ไข deployment เดิม → Version: <b>New version</b> → Deploy</li><li>กลับมาหน้านี้แล้วกดปุ่ม ⟳ มุมขวาบน — ถ้าแถบนี้หายไปแปลว่าเรียบร้อย</li></ol><p class="desc" style="margin:10px 0 0">ถ้าเผลอกด <b>New deployment</b> จะได้ URL ใหม่ ต้องนำ URL ใหม่ไปใส่ใน js/config.js แทนของเดิม (ตอนนี้เว็บเชื่อมกับ <code>' + esc(String(C.CFG.API_URL || "").replace(/^(.{48}).+(.{10})$/, "$1…$2")) + "</code>)</p></div>";
  }
  const imgWhy = m => /เปิดไฟล์ไม่ได้/.test(m || "") ? "เปิดไม่ได้ — ไฟล์ถูกลบ หรือไม่ได้อยู่ใน Drive ของบัญชีที่ตั้ง Apps Script (แก้: กดอัปโหลดรูปใหม่จากหลังบ้าน)" : (m || "เปิดไม่ได้");
  function imageTargets() {
    const out = [], add = (label, url, thumb) => { if (url || thumb) out.push({ label, url: String(url || ""), thumb: /^data:image\//.test(String(thumb || "")) }); };
    D.trainees.forEach(t => add("เด็กฝึก " + C.code(t) + " " + (t.stageName || t.name), t.photo, t.photoThumb));
    (D.staff || []).forEach(x => add("ทีมงาน " + x.name, x.avatar, x.avatarThumb));
    (D.banners || []).forEach(x => add("แบนเนอร์ " + x.title, x.image));
    (D.news || []).forEach(x => add("ข่าว " + x.title, x.image));
    (D.rounds || []).forEach(x => add("รอบ " + x.code, x.banner));
    (D.uniforms || []).forEach(x => add("ชุด " + x.name, x.image));
    (D.tracks || []).forEach(x => add("ปกเพลง " + x.title, x.cover));
    (D.history || []).forEach(x => add("ประวัติ " + x.title, x.image));
    (D.settings.winners || []).forEach(x => add("ศิลปิน " + x.name, x.cover));
    add("ประกาศ popup", (D.settings.announcement || {}).image);
    return out;
  }
  async function checkImages(list) {
    const res = list.map(x => Object.assign({}, x, { id: x.thumb ? "" : C.driveImgId(x.url) }));
    const ids = Array.from(new Set(res.filter(r => r.id).map(r => r.id))), info = {}; let old = false;
    for (let i = 0; i < ids.length && C.LIVE; i += 16) {
      const part = ids.slice(i, i + 16);
      try { const r = await C.API.get("image", { ids: part.join(","), meta: 1 }); if (!r || !r.items) { old = true; break; } part.forEach(id => info[id] = r.items[id] ? { ok: 1, size: r.items[id].size } : { ok: 0, msg: (r.errors || {})[id] }); }
      catch (e) { part.forEach(id => info[id] = { ok: 0, msg: e.message }); }
    }
    for (const r of res) {
      if (r.thumb) { r.ok = 1; r.msg = "มีรูปสำรองในระบบ — แสดงได้ทุกเครื่องแน่นอน"; continue; }
      if (/^data:image\//.test(r.url)) { r.ok = 1; r.msg = "ฝังอยู่ในข้อมูล (โหมดตัวอย่าง)"; continue; }
      if (r.id && C.LIVE) { const x = info[r.id] || {}; r.ok = !old && !!x.ok; r.msg = old ? "Code.gs บนเซิร์ฟเวอร์ยังเป็นเวอร์ชันเก่า — คนทั่วไปจะไม่เห็นรูปนี้" : x.ok ? "คนทั่วไปเห็นได้" + (x.size ? " · " + Math.round(x.size / 1024) + " KB" : "") : imgWhy(x.msg); continue; }
      r.ok = await new Promise(done => { const im = new Image(), t = setTimeout(() => done(false), 12000); im.onload = () => { clearTimeout(t); done(true); }; im.onerror = () => { clearTimeout(t); done(false); }; im.src = C.imgUrl(r.url); });
      r.msg = r.ok ? "ลิงก์ภายนอก เปิดได้" : "ลิงก์เปิดไม่ได้ — ตรวจลิงก์ หรือกดอัปโหลดรูปใหม่จากหลังบ้าน";
    }
    return { res, old };
  }
  const IMGCHK = { html: "" };
  const needThumb = () => D.trainees.filter(t => t.photo && !t.photoThumb).length + (D.staff || []).filter(x => x.avatar && !x.avatarThumb).length;
  // สร้างรูปสำรองให้รูปที่อัปโหลดไว้ก่อนหน้า: ลองดึงรูปผ่าน Apps Script → ลิงก์ตรง → thumbnail แล้วบันทึกเป็นรูปย่อในข้อมูลของเว็บ
  async function repairThumbs(progress) {
    const jobs = [];
    D.trainees.forEach(t => { if (t.photo && !t.photoThumb) jobs.push({ coll: "trainees", it: t, key: "photo", spec: "360x450", label: "เด็กฝึก " + C.code(t) + " " + (t.stageName || t.name) }); });
    (D.staff || []).forEach(x => { if (x.avatar && !x.avatarThumb) jobs.push({ coll: "staff", it: x, key: "avatar", spec: "220x220", label: "ทีมงาน " + x.name }); });
    const done = [], fail = [];
    for (const j of jobs) {
      progress("กำลังซ่อมรูป " + (done.length + fail.length + 1) + "/" + jobs.length + " — " + j.label);
      const url = String(j.it[j.key] || ""), id = C.driveImgId(url), tries = [];
      if (/^data:image\//.test(url)) tries.push(() => url);
      if (id && C.LIVE) tries.push(() => C.proxyImg(id));
      tries.push(() => C.imgUrl(url));
      if (id) tries.push(() => "https://drive.google.com/thumbnail?id=" + id + "&sz=w1000");
      for (const t of tries) { try { j.thumb = await makeThumb(await t(), j.spec); break; } catch (e) { } }
      (j.thumb ? done : fail).push(j);
    }
    for (const coll of ["trainees", "staff"]) {
      const list = done.filter(j => j.coll === coll);
      for (let i = 0; i < list.length; i += 3) { progress("กำลังบันทึก…"); const r = await call("patch", { collection: coll, changes: list.slice(i, i + 3).map(j => ({ id: j.it.id, fields: { [j.key + "Thumb"]: j.thumb } })), note: "รูปสำรอง" }); D[coll] = r.items; }
    }
    return { done, fail, total: jobs.length };
  }

  /* ---------- รูปย่อฝังในข้อมูล (แสดงได้ทุกเครื่องแน่นอน ไม่ต้องพึ่งลิงก์ Google Drive) ---------- */
  const THUMB_MAX = 32000; // ตัวอักษร — ต้องไม่เกิน 50,000 ต่อช่องของ Google Sheets
  async function makeThumb(src, spec) {
    const [w, h] = String(spec || "360x450").split("x").map(Number);
    const isBlob = src instanceof Blob, url = isBlob ? URL.createObjectURL(src) : String(src);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); if (!isBlob && !/^(data|blob):/.test(url)) i.crossOrigin = "anonymous"; const t = setTimeout(() => rej(new Error("หมดเวลา")), 15000); i.onload = () => { clearTimeout(t); res(i); }; i.onerror = () => { clearTimeout(t); rej(new Error("เปิดรูปไม่ได้")); }; i.src = url; });
      let W = w, H = h, q = 0.82, out = "";
      for (let k = 0; k < 12; k++) {
        const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const x = cv.getContext("2d");
        const r = Math.max(W / img.naturalWidth, H / img.naturalHeight), sw = W / r, sh = H / r;
        x.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) * 0.25, sw, sh, 0, 0, W, H); // ครอปค่อนไปด้านบน ให้เห็นหน้า
        out = cv.toDataURL("image/jpeg", q); // ถ้ารูปข้ามโดเมนไม่อนุญาต จะ error ตรงนี้
        if (out.length <= THUMB_MAX) return out;
        if (q > 0.56) q -= 0.08; else { W = Math.round(W * 0.88); H = Math.round(H * 0.88); }
      }
      throw new Error("ย่อรูปไม่ลง");
    } finally { if (isBlob) URL.revokeObjectURL(url); }
  }

  /* ---------- generic fields ---------- */
  const OPT = {
    status: () => [["active", "กำลังแข่งขัน"], ["eliminated", "ตกรอบ"], ["withdrawn", "ถอนตัว"], ["debut", "เดบิวต์"]],
    cat: () => cats().map(c => [c.id, c.label]),
    rstatus: () => [["live", "กำลังแข่งขัน"], ["soon", "เร็ว ๆ นี้"], ["done", "จบรอบแล้ว"]],
    rkind: () => [["list", "รายการข้อ (1.1, 1.2 …)"], ["table", "ตารางบทลงโทษ"]],
    tone: () => [["rose", "แดงกุหลาบ"], ["aqua", "ฟ้าน้ำทะเล"], ["blush", "ชมพูจันทร์"]],
    garment: () => [["jacket", "แจ็กเก็ตฝึกซ้อม"], ["stage", "ชุดเวที"]],
    winner: () => [["", "— ไม่ระบุ (แสดงในแท็บ ALL TRACKS) —"]].concat((D.settings.winners || []).map(w => [w.id, w.name])),
    round: () => rounds().map(r => [r.id, r.code + " " + r.title]),
    frame: () => [[1, "1 — กระจกเรียบ"], [2, "2 — ขอบเรืองแสง"], [3, "3 — ขอบไล่สี + ดาวมุม"], [4, "4 — โฮโลแกรมเงิน"], [5, "5 — ทับทิมทองประกาย"], [6, "6 — CELESTIAL ออโรร่า"]],
    role: () => [["staff", "สตาฟ — แก้ไขเนื้อหา"], ["admin", "แอดมิน — จัดการบัญชีและรีเซ็ตโหวตได้"]]
  };
  function fieldHtml(f, v, item) {
    const id = "f_" + f.k.replace(/\W/g, "_"), cls = f.full || ["textarea", "lines", "pairs", "image", "audio"].includes(f.type) ? " full" : "";
    const lab = '<label for="' + id + '">' + esc(f.label) + (f.req ? " *" : "") + "</label>";
    const help = f.help ? '<span class="help">' + esc(f.help) + "</span>" : "";
    let inp;
    v = v == null ? "" : v;
    switch (f.type) {
      case "textarea": inp = '<textarea class="input" id="' + id + '" name="' + attr(f.k) + '" rows="' + (f.rows || 4) + '">' + esc(v) + "</textarea>"; break;
      case "lines": inp = '<textarea class="input" id="' + id + '" name="' + attr(f.k) + '" rows="' + (f.rows || 6) + '">' + esc((v || []).join("\n")) + "</textarea>"; break;
      case "pairs": inp = '<textarea class="input" id="' + id + '" name="' + attr(f.k) + '" rows="5">' + esc((v || []).map(p => p.label + " | " + p.value).join("\n")) + "</textarea>"; break;
      case "csv": inp = '<input class="input" id="' + id + '" name="' + attr(f.k) + '" value="' + attr((v || []).join(", ")) + '">'; break;
      case "select": inp = '<select class="input" id="' + id + '" name="' + attr(f.k) + '">' + OPT[f.opt]().map(o => '<option value="' + attr(o[0]) + '"' + (String(v) === String(o[0]) ? " selected" : "") + ">" + esc(o[1]) + "</option>").join("") + "</select>"; break;
      case "bool": return '<div class="field' + cls + '"><label class="switch"><input type="checkbox" name="' + attr(f.k) + '"' + (v ? " checked" : "") + "> " + esc(f.label) + "</label>" + help + "</div>";
      case "color": inp = '<div class="color-field"><input type="color" value="' + attr(/^#[0-9a-f]{6}$/i.test(v) ? v : "#86dde4") + '" data-sync="' + id + '" aria-label="เลือกสี"><input class="input" id="' + id + '" name="' + attr(f.k) + '" value="' + attr(v) + '" placeholder="#C43556"></div>'; break;
      case "image": case "audio": {
        const tv = f.thumb && item ? String(item[f.k + "Thumb"] || "") : "";
        const src = f.type === "image" ? (tv || C.imgUrl(v)) : "";
        inp = '<div class="img-field"><div class="pv" data-pv="' + id + '">' + (src ? '<img src="' + attr(src) + '" alt="">' : f.type === "audio" ? "ไฟล์เสียง" : "ไม่มีรูป") + '</div><div><div class="ctrl"><input class="input" id="' + id + '" name="' + attr(f.k) + '" value="' + attr(String(v).startsWith("data:") ? "(อัปโหลดแล้ว)" : v) + '" data-raw="' + attr(String(v).startsWith("data:") ? v : "") + '" placeholder="วางลิงก์ หรือกดอัปโหลด"><label class="btn btn-ghost btn-sm up-btn">อัปโหลด<input type="file" accept="' + (f.type === "image" ? "image/*" : "audio/*") + '" data-up="' + id + '" data-kind="' + f.type + '" data-max="' + (f.max || "") + '"></label></div>' + help + "</div></div>";
        if (f.thumb) inp = inp.replace(/<\/div><\/div>$/, (v && !tv ? '<small class="img-chk no">รูปนี้ยังไม่มีรูปสำรองในระบบ — ถ้าหน้าเว็บไม่ขึ้นรูป ให้กดอัปโหลดใหม่ แล้วกดบันทึก</small>' : "") + "</div></div>") + '<input type="hidden" name="' + attr(f.k + "Thumb") + '" value="' + attr(tv) + '" data-thumb-of="' + id + '" data-spec="' + attr(f.thumb) + '">';
        return '<div class="field' + cls + '">' + lab + inp + "</div>";
      }
      default: inp = '<input class="input" id="' + id + '" name="' + attr(f.k) + '" type="' + (["number", "date", "password"].includes(f.type) ? f.type : "text") + '"' + (f.type === "password" ? ' autocomplete="new-password"' : "") + ' value="' + attr(v) + '"' + (f.ro ? " readonly" : "") + (f.ph ? ' placeholder="' + attr(f.ph) + '"' : "") + ">";
    }
    return '<div class="field' + cls + '">' + lab + inp + help + "</div>";
  }
  function readField(form, f) {
    const el = form.elements[f.k]; if (!el) return undefined;
    const v = f.type === "bool" ? el.checked : el.value;
    switch (f.type) {
      case "lines": return String(v).split("\n").map(s => s.trim()).filter(Boolean);
      case "pairs": return String(v).split("\n").map(s => s.trim()).filter(Boolean).map(s => { const p = s.split("|"); return { label: p[0].trim(), value: (p.slice(1).join("|") || "").trim() }; });
      case "csv": return String(v).split(/[,\n]/).map(s => s.trim()).filter(Boolean);
      case "number": return v === "" ? "" : Number(v);
      case "image": case "audio": return el.dataset.raw && v === "(อัปโหลดแล้ว)" ? el.dataset.raw : String(v).trim();
      case "bool": return !!v;
      default: return String(v).trim();
    }
  }
  function bindFormExtras(root) {
    $$("[data-sync]", root).forEach(c => { const t = $("#" + c.dataset.sync, root); c.addEventListener("input", () => t.value = c.value); t.addEventListener("input", () => { if (/^#[0-9a-f]{6}$/i.test(t.value)) c.value = t.value; }); });
    const thumbBox = id => root.querySelector('[data-thumb-of="' + id + '"]');
    const note = (inp, cls, txt) => { const box = inp.closest(".img-field").lastElementChild; $$(".img-chk", box).forEach(x => x.remove()); if (!txt) return; const n = document.createElement("small"); n.className = "img-chk " + cls; n.textContent = txt; box.appendChild(n); };
    $$("[data-up]", root).forEach(inp => inp.addEventListener("change", async () => {
      const file = inp.files[0]; if (!file) return; const t = $("#" + inp.dataset.up, root), pv = root.querySelector('[data-pv="' + inp.dataset.up + '"]'), tb = thumbBox(inp.dataset.up);
      pv.textContent = "กำลังอัปโหลด…"; note(inp);
      let thumb = "";
      if (tb && inp.dataset.kind === "image") { try { thumb = await makeThumb(file, tb.dataset.spec); tb.value = thumb; pv.innerHTML = '<img src="' + attr(thumb) + '" alt="">'; } catch (x) { tb.value = ""; } }
      try {
        const url = await upload(file, inp.dataset.kind, inp.dataset.max);
        if (url.startsWith("data:")) { t.value = "(อัปโหลดแล้ว)"; t.dataset.raw = url; } else { t.value = url; t.dataset.raw = ""; }
        if (!thumb) pv.innerHTML = inp.dataset.kind === "image" ? '<img src="' + attr(C.imgUrl(url)) + '" alt="">' : "✓ อัปโหลดแล้ว";
        if (thumb) note(inp, "ok", "✓ อัปโหลดแล้ว + สร้างรูปสำรองในระบบแล้ว — หน้าเว็บแสดงรูปนี้ได้ทุกเครื่อง (กดบันทึกเพื่อใช้รูปนี้)");
        else if (C.LIVE && inp.dataset.kind === "image") { note(inp, "", "กำลังตรวจว่าคนทั่วไปเห็นรูปนี้ได้ไหม…"); checkImages([{ label: "", url }]).then(({ res }) => { const r = res[0]; note(inp, r.ok ? "ok" : "no", (r.ok ? "✓ คนทั่วไปเห็นรูปนี้ได้ — กดบันทึกเพื่อใช้รูปนี้" : "✗ " + r.msg)); }); }
        C.toast("อัปโหลดแล้ว อย่าลืมกดบันทึก");
      } catch (e) {
        if (thumb) { t.value = ""; t.dataset.raw = ""; note(inp, "ok", "อัปโหลดรูปเต็มขึ้น Drive ไม่สำเร็จ (" + e.message + ") แต่มีรูปสำรองในระบบแล้ว กดบันทึกได้เลย หน้าเว็บจะแสดงรูปสำรองนี้"); }
        else { pv.textContent = "ผิดพลาด"; C.toast(e.message, true); }
      }
      inp.value = "";
    }));
    let pt = null;
    $$('.img-field input.input', root).forEach(t => t.addEventListener("input", () => {
      t.dataset.raw = ""; const pv = root.querySelector('[data-pv="' + t.id + '"]'), tb = thumbBox(t.id); const u = C.imgUrl(t.value);
      if (pv && pv.textContent !== "ไฟล์เสียง") pv.innerHTML = u ? '<img src="' + attr(u) + '" alt="" onerror="this.replaceWith(\'ลิงก์รูปเปิดไม่ได้\')">' : "ไม่มีรูป";
      if (!tb) return; tb.value = ""; note(t);
      clearTimeout(pt); if (!u) return;
      pt = setTimeout(async () => { // วางลิงก์รูปเอง: ลองสร้างรูปสำรองจากลิงก์ (บางลิงก์ไม่อนุญาต)
        note(t, "", "กำลังสร้างรูปสำรองจากลิงก์…");
        try { tb.value = await makeThumb(u, tb.dataset.spec); note(t, "ok", "✓ สร้างรูปสำรองในระบบแล้ว — หน้าเว็บแสดงรูปนี้ได้ทุกเครื่อง"); }
        catch (x) { note(t, "no", "สร้างรูปสำรองจากลิงก์นี้ไม่ได้ — ถ้าหน้าเว็บไม่ขึ้นรูป ให้ดาวน์โหลดรูปมาแล้วกดปุ่มอัปโหลดแทน"); }
      }, 700);
    }));
  }
  function openForm(title, fields, item, onSave, extra = "") {
    C.modal('<form class="pad" id="edForm" novalidate><h3 class="mt">' + esc(title) + "</h3>" + extra + '<div class="form-grid">' + fields.map(f => fieldHtml(f, f.k.split(".").reduce((o, k) => o == null ? o : o[k], item), item)).join("") + '</div><div class="form-foot"><button class="btn btn-ghost" type="button" onclick="Celestial.closeModal()">ยกเลิก</button><button class="btn btn-rose" type="submit">บันทึก</button></div></form>');
    const form = $("#edForm"); bindFormExtras(form);
    form.addEventListener("submit", async e => {
      e.preventDefault(); const out = JSON.parse(JSON.stringify(item || {}));
      for (const f of fields) {
        const v = readField(form, f); if (v === undefined) continue;
        if (f.req && (v === "" || (Array.isArray(v) && !v.length))) { C.toast("กรุณากรอก " + f.label, true); form.elements[f.k] && form.elements[f.k].focus(); return; }
        const ks = f.k.split("."); let o = out; ks.slice(0, -1).forEach(k => { o[k] = o[k] && typeof o[k] === "object" ? o[k] : {}; o = o[k]; }); o[ks[ks.length - 1]] = v;
      }
      $$("[data-thumb-of]", form).forEach(h => { out[h.name] = h.value; });
      const btn = form.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "กำลังบันทึก…";
      try { const msg = await onSave(out); C.closeModal(); C.toast(typeof msg === "string" ? msg : "บันทึกแล้ว"); render(); }
      catch (x) { C.toast(x.message, true); btn.disabled = false; btn.textContent = "บันทึก"; }
    });
  }

  /* ---------- schemas ---------- */
  const F = (k, label, type = "text", o = {}) => Object.assign({ k, label, type }, o);
  const SCHEMA = {
    trainees: {
      label: "เด็กฝึก", add: "เพิ่มเด็กฝึก",
      fields: () => [F("no", "หมายเลข", "number", { req: 1, help: "ใช้เป็นรหัสเด็กฝึก เช่น 1 = B01" }), F("name", "ชื่อ-นามสกุล", "text", { req: 1 }), F("stageName", "ชื่อในวงการ / ชื่อเล่น"), F("nationality", "สัญชาติ", "text", { ph: "เช่น ไทย" }), F("position", "ตำแหน่ง", "text", { ph: "เช่น Main Vocal / Leader" }), F("birthday", "วันเกิด", "text", { ph: "เช่น 14 ก.พ." }), F("height", "ส่วนสูง", "text", { ph: "เช่น 175 cm" }), F("status", "สถานะ", "select", { opt: "status" }), F("photo", "รูปโปรไฟล์ (แนวตั้ง 4:5)", "image", { max: 1200, thumb: "360x450", help: "แนะนำกดอัปโหลด — ระบบจะเก็บรูปสำรองขนาดเล็กไว้ในเว็บด้วย รูปจึงขึ้นได้ทุกเครื่องแม้ลิงก์ Google Drive เปิดไม่ได้" }), F("bio", "ประวัติ", "textarea", { rows: 5 }), F("cv", "ผู้เล่น / CV (แสดงในโปรไฟล์ ถ้าเว้นว่างจะไม่แสดง)"), F("link", "ลิงก์โปรไฟล์ฉบับเต็ม (Google Doc ฯลฯ)")],
      row: t => ({ th: '<div class="th">' + C.portrait(t) + "</div>", title: C.code(t) + " " + t.name, sub: [t.stageName, t.nationality, t.position].filter(Boolean).join(" — "), off: t.status !== "active" && t.status !== "debut" }),
      sort: (a, b) => (Number(a.no) || 0) - (Number(b.no) || 0) || String(a.id).localeCompare(String(b.id)),
      fresh: () => { const n = Math.max(0, ...D.trainees.map(t => +t.no || 0)) + 1; return { side: "B", no: n, status: "active", ranks: {} }; },
      search: t => [t.name, t.stageName, t.nationality, t.position, C.code(t)].join(" ")
    },
    banners: { label: "แบนเนอร์", add: "เพิ่มแบนเนอร์", ordered: 1, fields: () => [F("title", "หัวข้อ", "text", { req: 1 }), F("subtitle", "ข้อความรอง"), F("image", "รูปแบนเนอร์ (แนวนอน 21:8 แนะนำ 2100×800)", "image", { max: 2100, help: "ถ้าไม่ใส่รูป ระบบจะสร้างแบนเนอร์ลายดวงจันทร์ให้อัตโนมัติ" }), F("link", "ลิงก์ปุ่ม", "text", { ph: "เช่น vote.html หรือ https://…" }), F("linkLabel", "ข้อความบนปุ่ม", "text", { ph: "เช่น โหวตเลย" }), F("tone", "โทนสี (กรณีไม่มีรูป)", "select", { opt: "tone" }), F("active", "แสดงบนหน้าแรก", "bool"), F("hideText", "ซ่อนข้อความบนรูป (ใช้เมื่อรูปมีข้อความอยู่แล้ว)", "bool")], row: b => ({ th: '<div class="th">' + (C.imgUrl(b.image) ? '<img src="' + attr(C.imgUrl(b.image)) + '" alt="">' : '<div class="art" style="--a:#7B182F;--c:#04161B"><b>' + esc((b.title || "?").slice(0, 2)) + "</b></div>") + "</div>", title: b.title, sub: (b.active === false ? "ซ่อนอยู่ — " : "") + (b.subtitle || ""), off: b.active === false }), fresh: () => ({ active: true, tone: "rose" }) },
    news: { label: "ข่าวสาร", add: "เพิ่มข่าว", fields: () => [F("title", "หัวข้อข่าว", "text", { req: 1 }), F("date", "วันที่", "date", { req: 1 }), F("tag", "แท็ก", "text", { ph: "เช่น ผลการแข่งขัน" }), F("pinned", "ปักหมุดไว้บนสุด", "bool"), F("body", "เนื้อหาย่อ", "textarea"), F("link", "ลิงก์อ่านต่อ"), F("image", "รูปประกอบ", "image", { max: 1400 })], row: n => ({ th: '<div class="th">' + (C.imgUrl(n.image) ? '<img src="' + attr(C.imgUrl(n.image)) + '" alt="">' : '<div class="art"><b>N</b></div>') + "</div>", title: (n.pinned ? "📌 " : "") + n.title, sub: C.fmtDate(n.date) + (n.tag ? " — " + n.tag : "") }), sort: (a, b) => String(b.date).localeCompare(a.date), fresh: () => ({ date: C.iso(new Date()) }), search: n => n.title + " " + n.tag },
    events: { label: "ปฏิทิน", add: "เพิ่มกิจกรรม", fields: () => [F("title", "ชื่อกิจกรรม", "text", { req: 1 }), F("category", "ประเภท", "select", { opt: "cat" }), F("date", "วันที่เริ่ม", "date", { req: 1 }), F("end", "วันที่สิ้นสุด (ถ้ามีหลายวัน)", "date"), F("time", "เวลา", "text", { ph: "เช่น 20:00 น." }), F("desc", "รายละเอียด", "textarea", { rows: 3 })], row: e => { const c = cats().find(x => x.id === e.category); return { th: '<div class="th sw" style="background:' + attr(c ? c.color : "#9fb3b8") + '">' + esc(String(+e.date.slice(8, 10) || "")) + "</div>", title: e.title, sub: C.fmtRange(e.date, e.end) + (c ? " — " + c.label : "") + (e.time ? " — " + e.time : "") }; }, sort: (a, b) => String(a.date).localeCompare(b.date), fresh: () => ({ date: "2027-01-01", category: (cats()[0] || {}).id }), search: e => e.title + " " + e.date },
    rounds: { label: "รอบการแข่งขัน", add: "เพิ่มรอบ", ordered: 1, fields: () => [F("code", "รหัสรอบ", "text", { req: 1, ph: "เช่น ROUND 03" }), F("title", "ชื่อรอบ", "text", { req: 1, ph: "เช่น SOLAR FLARE" }), F("subtitle", "คำอธิบายสั้น", "text", { full: 1 }), F("status", "สถานะ", "select", { opt: "rstatus" }), F("deadline", "กำหนดส่งงาน", "date"), F("start", "วันเริ่มรอบ", "date"), F("end", "วันประกาศผล", "date"), F("summary", "สรุปภารกิจ", "textarea"), F("rules", "กติกา (บรรทัดละ 1 ข้อ)", "lines"), F("scoring", "เกณฑ์คะแนน (บรรทัดละ 1 รายการ รูปแบบ: หัวข้อ | คะแนน)", "pairs"), F("doc", "ลิงก์เอกสารภารกิจ (Google Doc)"), F("video", "ลิงก์คลิปการแสดง (YouTube)"), F("banner", "รูปแบนเนอร์รอบ", "image", { max: 1800 })], row: r => ({ th: '<div class="th sw" style="background:' + ({ live: "#C43556", done: "#5B6E74", soon: "#86DDE4" }[r.status] || "#86DDE4") + '">' + esc((r.code || "").replace(/\D/g, "").slice(-2) || "F") + "</div>", title: r.code + " — " + r.title + (D.settings.currentRound === r.id ? " (รอบปัจจุบัน)" : ""), sub: ({ live: "กำลังแข่งขัน", done: "จบรอบแล้ว", soon: "เร็ว ๆ นี้" }[r.status] || "") + " — " + C.fmtRange(r.start, r.end) }), fresh: () => ({ status: "soon", rules: [], scoring: [] }) },
    rules: { label: "กฎของคอมมู", add: "เพิ่มหมวดกฎ", ordered: 1, fields: () => [F("title", "ชื่อหมวด", "text", { req: 1 }), F("kind", "รูปแบบ", "select", { opt: "rkind" }), F("items", "ข้อกฎ (บรรทัดละ 1 ข้อ — แบบตารางใช้รูปแบบ: การกระทำ | บทลงโทษ)", "lines", { rows: 9 })], row: r => ({ th: '<div class="th sw" style="background:#F9CCCB">' + esc(String(r.order || "")) + "</div>", title: r.title, sub: (r.items || []).length + " ข้อ — " + (r.kind === "table" ? "ตาราง" : "รายการ") }), fresh: () => ({ kind: "list", items: [] }) },
    uniforms: { label: "ชุดเด็กฝึก", add: "เพิ่มชุด", ordered: 1, fields: () => [F("name", "ชื่อชุด", "text", { req: 1 }), F("label", "ป้ายกำกับ", "text", { ph: "เช่น ชุดฝึกซ้อม / ชุดเวที" }), F("color", "สีหลัก", "color"), F("garment", "แบบภาพตัวอย่าง (กรณีไม่มีรูป)", "select", { opt: "garment" }), F("image", "รูปชุดจริง", "image", { max: 1200 }), F("desc", "คำอธิบาย", "textarea", { rows: 3 })], row: u => ({ th: '<div class="th">' + (C.imgUrl(u.image) ? '<img src="' + attr(C.imgUrl(u.image)) + '" alt="">' : '<div style="width:100%;height:100%;background:' + attr(u.color) + '"></div>') + "</div>", title: u.name, sub: (u.label || "—") + " — " + (u.color || "") }), fresh: () => ({ color: "#86DDE4", garment: "jacket", label: "ชุดฝึกซ้อม" }) },
    staff: { label: "โปรไฟล์ทีมงาน", add: "เพิ่มทีมงาน", ordered: 1, fields: () => [F("name", "ชื่อ", "text", { req: 1 }), F("role", "ตำแหน่ง", "text", { ph: "เช่น Vocal Mentor" }), F("team", "ทีม (ใช้จัดกลุ่มบนหน้าเว็บ)", "text", { ph: "เช่น ทีมเมนเทอร์" }), F("contact", "ช่องทางติดต่อ", "text", { ph: "@ชื่อ" }), F("bio", "หน้าที่ / แนะนำตัว", "textarea", { rows: 3 }), F("quote", "คำพูดประจำตัว"), F("avatar", "รูปโปรไฟล์ (สี่เหลี่ยมจัตุรัส)", "image", { max: 700, thumb: "220x220" })], row: s => ({ th: '<div class="th round">' + C.portrait({ id: s.id, name: s.name, pal: "rose", photo: s.avatar, avatarThumb: s.avatarThumb }) + "</div>", title: s.name, sub: [s.role, s.team].filter(Boolean).join(" — ") }), fresh: () => ({}) },
    tracks: { label: "เพลย์ลิสต์", add: "เพิ่มเพลง", ordered: 1, fields: () => [F("title", "ชื่อเพลง", "text", { req: 1 }), F("artist", "ศิลปิน", "text"), F("winner", "อยู่ในเพลย์ลิสต์ของ", "select", { opt: "winner" }), F("youtube", "ลิงก์ YouTube (ถ้ามี)"), F("audio", "ไฟล์เสียง (.mp3)", "audio", { help: "กดอัปโหลด (ไม่เกิน 20MB) หรือวางลิงก์ไฟล์ใน Google Drive — เว็บจะดึงไฟล์ผ่าน Apps Script ให้เอง ไฟล์ต้องอยู่ใน Drive ของบัญชีที่ตั้ง Apps Script หรือแชร์แบบ 'ทุกคนที่มีลิงก์'" }), F("cover", "ปกเพลง (สี่เหลี่ยมจัตุรัส)", "image", { max: 900 }), F("note", "หมายเหตุใต้ชื่อเพลง", "text", { full: 1 })], row: t => ({ th: '<div class="th">' + (C.imgUrl(t.cover) ? '<img src="' + attr(C.imgUrl(t.cover)) + '" alt="">' : '<div class="art"><b>♪</b></div>') + "</div>", title: t.title, sub: (t.artist || "") + (t.audio ? " — มีไฟล์เสียง" : t.youtube ? " — YouTube" : " — ยังไม่มีไฟล์") }), fresh: () => ({}) },
    history: { label: "ประวัติโปรเจกต์", add: "เพิ่มเหตุการณ์", ordered: 1, fields: () => [F("date", "ช่วงเวลา", "text", { req: 1, ph: "เช่น มิ.ย. 2569" }), F("title", "หัวข้อ", "text", { req: 1 }), F("body", "รายละเอียด", "textarea"), F("image", "รูปประกอบ", "image", { max: 1400 })], row: h => ({ th: '<div class="th sw" style="background:#86DDE4;font-size:12px;font-style:normal">' + esc(String(h.date).slice(-4)) + "</div>", title: h.title, sub: h.date }), fresh: () => ({}) }
  };
  const SET_ARRAYS = {
    winners: { label: "ศิลปินผู้ชนะ", add: "เพิ่มศิลปิน", fields: () => [F("name", "ชื่อวง / ศิลปิน", "text", { req: 1 }), F("season", "ซีซัน", "text", { ph: "เช่น SEASON 1 — 2569" }), F("tagline", "คำโปรย", "text", { full: 1 }), F("members", "สมาชิก (คั่นด้วยจุลภาค)", "csv", { full: 1 }), F("cover", "ภาพปกศิลปิน", "image", { max: 1400 })], row: w => ({ th: '<div class="th"><div class="art" style="--a:#F9CCCB;--c:#C43556"><b>' + esc(w.name.slice(0, 2)) + "</b></div></div>", title: w.name, sub: (w.season || "") + " — " + (w.members || []).length + " คน" }) },
    fanLevels: { label: "ระดับแฟนคลับ", add: "เพิ่มระดับ", fields: () => [F("name", "ชื่อระดับ", "text", { req: 1, ph: "เช่น SUPERNOVA" }), F("min", "แต้มใจขั้นต่ำ", "number", { req: 1, help: "ได้ระดับนี้เมื่อแต้มใจสะสมถึงค่านี้ (ระดับแรกควรเป็น 0)" }), F("color", "สีประจำระดับ", "color"), F("frame", "กรอบการ์ด", "select", { opt: "frame" })], row: l => ({ th: '<div class="th sw" style="background:' + attr(l.color) + '">' + esc(String(l.frame || "")) + "</div>", title: l.name, sub: "ตั้งแต่ " + (Number(l.min) || 0) + " ใจ — กรอบแบบ " + (l.frame || 1) }) },
    categories: { label: "ประเภทกิจกรรม", add: "เพิ่มประเภท", keyed: 1, fields: () => [F("label", "ชื่อประเภท", "text", { req: 1 }), F("color", "สี", "color")], row: c => ({ th: '<div class="th sw" style="background:' + attr(c.color) + '"></div>', title: c.label, sub: c.color }) }
  };

  /* ---------- generic list (collection or settings array) ---------- */
  const listState = {};
  function listHtml(key, sc, items, opts = {}) {
    const st = listState[key] = listState[key] || { q: "" };
    let list = items.slice(); if (sc.sort) list.sort(sc.sort); else if (sc.ordered) list.sort(byOrder);
    const q = st.q.toLowerCase();
    if (q) list = list.filter(it => (sc.search ? sc.search(it) : JSON.stringify(it)).toLowerCase().includes(q));
    const canMove = (sc.ordered || opts.settingsArr) && !q;
    return '<div class="a-card"><div class="a-head"><div><h3>' + esc(sc.label) + '</h3><span class="muted" style="font-size:13.5px">' + items.length + ' รายการ</span></div><div class="toolbar">' +
      (items.length > 6 ? '<label class="search"><span class="sr">ค้นหา</span><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input class="input" data-q="' + key + '" value="' + attr(st.q) + '" placeholder="ค้นหา"></label>' : "") +
      '<button class="btn btn-rose" type="button" data-add="' + key + '">+ ' + esc(sc.add) + '</button></div></div><div class="rows">' +
      (list.map((it, i) => { const r = sc.row(it); return '<div class="row' + (r.off ? " off" : "") + '">' + r.th + '<div class="tx"><strong>' + esc(r.title) + "</strong><small>" + esc(r.sub || "") + '</small></div><div class="acts">' +
        (key === "trainees" ? '<select class="input mini-sel" data-status="' + attr(it.id) + '" aria-label="สถานะ">' + OPT.status().map(o => '<option value="' + o[0] + '"' + (it.status === o[0] ? " selected" : "") + ">" + o[1] + "</option>").join("") + "</select>" : "") +
        (canMove ? '<button class="ib" type="button" data-up="' + attr(it.id) + '" aria-label="เลื่อนขึ้น"' + (i === 0 ? " disabled" : "") + '>↑</button><button class="ib" type="button" data-down="' + attr(it.id) + '" aria-label="เลื่อนลง"' + (i === list.length - 1 ? " disabled" : "") + ">↓</button>" : "") +
        '<button class="ib" type="button" data-edit="' + attr(it.id) + '" aria-label="แก้ไข" title="แก้ไข">✎</button><button class="ib danger" type="button" data-del="' + attr(it.id) + '" aria-label="ลบ" title="ลบ">🗑</button></div></div>'; }).join("") || '<div class="empty">' + (q ? "ไม่พบรายการ" : "ยังไม่มีรายการ กด “" + esc(sc.add) + "” เพื่อเริ่ม") + "</div>") + "</div></div>";
  }
  function bindList(root, key, sc, getItems, ops) {
    const card = root; const items = () => getItems();
    card.addEventListener("input", e => { const q = e.target.closest("[data-q]"); if (q && q.dataset.q === key) { listState[key].q = q.value; const pos = q.selectionStart; render(); const n = $('[data-q="' + key + '"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } } });
    card.addEventListener("change", async e => {
      const s = e.target.closest("[data-status]"); if (!s || key !== "trainees") return;
      try { const r = await call("patch", { collection: "trainees", changes: [{ id: s.dataset.status, fields: { status: s.value } }], note: "status" }); D.trainees = r.items; C.toast("อัปเดตสถานะแล้ว"); render(); } catch (x) { C.toast(x.message, true); }
    });
    card.addEventListener("click", async e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.add === key) { const it = sc.fresh ? sc.fresh() : {}; openForm(sc.add, sc.fields(), it, ops.save); return; }
      const id = b.dataset.edit || b.dataset.del || b.dataset.up || b.dataset.down; if (!id) return;
      const it = items().find(x => x.id === id); if (!it) return;
      if (b.dataset.edit) openForm("แก้ไข" + sc.label, sc.fields(), it, ops.save, key === "trainees" ? '<p class="muted" style="margin:-8px 0 14px;font-size:13.5px">รหัสระบบ ' + esc(it.id) + " (ใช้ผูกกับคะแนนโหวต แก้ไขไม่ได้)</p>" : "");
      else if (b.dataset.del) { if (await confirmBox("ลบ “" + (it.title || it.name || it.label || id) + "” ออกจากเว็บไซต์? การลบย้อนกลับไม่ได้", "ลบรายการ")) { try { await ops.remove(id); C.toast("ลบแล้ว"); render(); } catch (x) { C.toast(x.message, true); } } }
      else {
        const list = items().slice().sort(byOrder); const i = list.findIndex(x => x.id === id); const j = b.dataset.up ? i - 1 : i + 1; if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]]; try { await ops.reorder(list.map(x => x.id)); render(); } catch (x) { C.toast(x.message, true); }
      }
    });
  }
  function collOps(name) {
    return {
      save: async it => {
        if (name === "trainees" && !it.id) { it.side = it.side || "B"; let base = C.code(it), id = base, k = 2; while (D.trainees.some(t => t.id === id)) id = base + "-" + k++; it.id = id; it.ranks = it.ranks || {}; }
        const r = await call("upsert", { collection: name, item: it }); D[name] = r.items;
      },
      remove: async id => { const r = await call("remove", { collection: name, id }); D[name] = r.items; },
      reorder: async ids => { const r = await call("reorder", { collection: name, ids }); D[name] = r.items; }
    };
  }
  async function saveSettings(patch) { const r = await call("saveSettings", { patch }); D.settings = r.settings; }
  function setArrOps(key) {
    const arr = () => (D.settings[key] || []).slice();
    return {
      save: async it => {
        const a = arr();
        if (!it.id) { it.id = SET_ARRAYS[key].keyed ? String(it.label || "x").trim().replace(/\s+/g, "-").slice(0, 16) : C.uid(key.slice(0, 1)); while (a.some(x => x.id === it.id)) it.id += "1"; a.push(it); }
        else { const i = a.findIndex(x => x.id === it.id); if (i >= 0) a[i] = it; else a.push(it); }
        await saveSettings({ [key]: a });
      },
      remove: async id => saveSettings({ [key]: arr().filter(x => x.id !== id) }),
      reorder: async ids => { const a = arr(); await saveSettings({ [key]: ids.map(id => a.find(x => x.id === id)).filter(Boolean) }); }
    };
  }
  function collView(name, intro) {
    return {
      html: () => (intro ? '<p class="lead" style="margin:0 0 16px">' + intro + "</p>" : "") + listHtml(name, SCHEMA[name], D[name] || []),
      bind: root => bindList(root, name, SCHEMA[name], () => D[name] || [], collOps(name))
    };
  }
  function setArrView(key, intro) {
    const sc = Object.assign({}, SET_ARRAYS[key], { ordered: 1 });
    const items = () => (D.settings[key] || []).map((x, i) => Object.assign({ order: i + 1 }, x));
    return { html: () => (intro ? '<p class="lead" style="margin:0 0 16px">' + intro + "</p>" : "") + listHtml("s_" + key, sc, items(), { settingsArr: 1 }), bind: root => bindList(root, "s_" + key, sc, items, setArrOps(key)) };
  }

  /* ---------- settings form cards ---------- */
  function settingsCard(id, title, desc, fields) {
    return '<form class="a-card" data-set="' + id + '" novalidate><h3>' + esc(title) + '</h3><p class="desc">' + esc(desc) + '</p><div class="form-grid">' + fields.map(f => fieldHtml(f, f.k.split(".").reduce((o, k) => o == null ? o : o[k], D.settings))).join("") + '</div><div class="toolbar" style="justify-content:flex-end"><button class="btn btn-rose" type="submit">บันทึก' + esc(title) + "</button></div></form>";
  }
  function bindSettingsCards(root, defs) {
    bindFormExtras(root);
    $$("form[data-set]", root).forEach(form => form.addEventListener("submit", async e => {
      e.preventDefault(); const fields = defs[form.dataset.set]; const patch = {};
      fields.forEach(f => { const v = readField(form, f); const ks = f.k.split("."); if (ks.length === 1) patch[ks[0]] = v; else { patch[ks[0]] = patch[ks[0]] || JSON.parse(JSON.stringify(D.settings[ks[0]] || {})); let o = patch[ks[0]]; ks.slice(1, -1).forEach(k => { o[k] = o[k] || {}; o = o[k]; }); o[ks[ks.length - 1]] = v; } });
      if (form.dataset.set === "ann" && patch.announcement) { const a = D.settings.announcement || {}; if (a.title !== patch.announcement.title || a.body !== patch.announcement.body || (!a.on && patch.announcement.on)) patch.announcement.version = C.uid("a"); }
      const btn = form.querySelector("[type=submit]"); btn.disabled = true;
      try { await saveSettings(patch); C.toast("บันทึกแล้ว"); render(); } catch (x) { C.toast(x.message, true); btn.disabled = false; }
    }));
  }

  /* ============================================================
     VIEWS
     ============================================================ */
  const VIEWS = {};

  VIEWS.dashboard = {
    html: () => {
      const act = D.trainees.filter(t => t.status === "active").length; const v = D.settings.vote || {};
      const today = C.iso(new Date()); const soon = D.events.filter(e => (e.end || e.date) >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
      const noPhoto = D.trainees.filter(t => !t.photo).length; const oldG = D.trainees.filter(t => t.side === "G").length; const cr = rounds().find(r => r.id === D.settings.currentRound);
      return '<div class="kpis"><div class="kpi"><b>' + act + "</b><span>เด็กฝึกที่ยังแข่งขัน (จาก " + D.trainees.length + ')</span></div><div class="kpi"><b>' + (D.fanCount || D.fans.length) + '</b><span>บัญชีแฟนคลับ</span></div><div class="kpi"><b>' + (D.votesToday || 0) + '</b><span>โหวตวันนี้</span></div><div class="kpi"><b>' + ((D.tally && D.tally.total) || 0) + "</b><span>โหวตบนเว็บรอบ " + esc((cr && cr.id === v.round ? cr.code : v.round) || "-") + " (ลับ)</span></div></div>" +
        '<div class="grid2"><div class="a-card"><h3>ควบคุมด่วน</h3><p class="desc">เปลี่ยนสถานะสำคัญได้ทันที ทุกการเปลี่ยนแปลงจะขึ้นบนเว็บภายใน 1 นาที</p>' +
        '<label class="switch"><input type="checkbox" id="qVote"' + (v.open ? " checked" : "") + "> เปิดรับโหวต</label><br>" +
        '<label class="switch"><input type="checkbox" id="qAnn"' + (D.settings.announcement && D.settings.announcement.on ? " checked" : "") + '> แสดงประกาศ popup หน้าแรก</label>' +
        '<div class="field" style="margin-top:10px"><label for="qRound">รอบปัจจุบัน (แสดงบนหน้าแรก)</label><select class="input" id="qRound">' + OPT.round().map(o => '<option value="' + attr(o[0]) + '"' + (o[0] === D.settings.currentRound ? " selected" : "") + ">" + esc(o[1]) + "</option>").join("") + "</select></div>" +
        '<div class="toolbar"><a class="btn btn-ghost btn-sm" href="home.html" target="_blank" rel="noopener">เปิดหน้าเว็บ</a><button class="btn btn-ghost btn-sm" type="button" data-go="ranking">อัปเดตอันดับ</button><button class="btn btn-ghost btn-sm" type="button" data-go="banners">จัดการแบนเนอร์</button></div></div>' +
        '<div class="a-card"><h3>กิจกรรมที่กำลังจะถึง</h3><p class="desc">จากปฏิทิน 2570</p><div class="rows">' + (soon.map(e => { const r = SCHEMA.events.row(e); return '<div class="row">' + r.th + '<div class="tx"><strong>' + esc(r.title) + "</strong><small>" + esc(r.sub) + "</small></div><div></div></div>"; }).join("") || '<div class="empty">ไม่มีกิจกรรมที่กำลังจะถึง</div>') + "</div></div></div>" +
        '<div class="grid2" style="margin-top:16px"><div class="a-card"><h3>สิ่งที่ควรตรวจ</h3><ul class="notes" style="margin-top:12px">' +
        "<li>รอบปัจจุบัน: " + esc(cr ? cr.code + " " + cr.title : "ยังไม่ได้ตั้ง") + "</li><li>ประกาศผลโหวตแล้ว: " + esc(rounds().filter(r => ((D.board || {})[r.id] || {}).published).map(r => r.code).join(", ") || "ยังไม่มี") + "</li><li>เด็กฝึกที่ยังไม่มีรูป: " + noPhoto + " คน</li>" + (needThumb() ? '<li style="color:#ffd9dd">รูปที่ยังไม่มีรูปสำรอง (อาจไม่ขึ้นบนเว็บ): ' + needThumb() + " รูป — กด “ซ่อมรูปที่ไม่ขึ้น” ด้านล่าง</li>" : "") + "<li>แบนเนอร์ที่แสดงอยู่: " + D.banners.filter(b => b.active !== false).length + " ชิ้น</li><li>บัญชีแฟนคลับที่ถูกระงับ: " + D.fans.filter(f => f.banned).length + " บัญชี</li>" + (oldG ? '<li style="color:#ffd9dd">ยังมีข้อมูลเด็กฝึกฝั่งหญิง (รหัส G) ค้างอยู่ ' + oldG + ' คน — THE CELESTIAL รับเฉพาะเด็กฝึกชาย ลบได้ที่เมนู “เด็กฝึก”</li>' : "") + "</ul></div>" +
        '<div class="a-card"><h3>กิจกรรมล่าสุดของทีมงาน</h3><ul class="log" style="margin-top:8px">' + (D.log || []).slice(0, 8).map(l => "<li><time>" + esc(fmtTs(l.ts)) + "</time><span><b>" + esc(l.user) + "</b> " + esc(logText(l)) + "</span></li>").join("") + "</ul></div></div>" +
        '<div class="a-card" style="margin-top:16px"><div class="a-head"><div><h3>ตรวจรูปภาพบนเว็บ</h3><span class="muted" style="font-size:13.5px">เช็กว่ารูปทุกรูปที่ใช้บนเว็บ คนทั่วไป (ที่ไม่ได้ล็อกอิน Google ของทีมงาน) เปิดเห็นได้จริงไหม</span></div><div class="toolbar">' + (needThumb() ? '<button class="btn btn-rose btn-sm" type="button" id="imgFix">ซ่อมรูปที่ไม่ขึ้น (' + needThumb() + ")</button>" : "") + '<button class="btn btn-ghost btn-sm" type="button" id="imgCheck">ตรวจทุกรูป</button></div></div>' + (needThumb() ? '<p class="img-sum no" style="margin-bottom:8px">รูปเด็กฝึก/ทีมงาน ' + needThumb() + ' รูปยังไม่มีรูปสำรองในระบบ (อาจไม่ขึ้นบนหน้าเว็บ) — กด “ซ่อมรูปที่ไม่ขึ้น”</p>' : "") + '<div id="imgRes">' + IMGCHK.html + "</div></div>";
    },
    bind: root => {
      $("#qVote", root).addEventListener("change", async e => { try { await saveSettings({ vote: Object.assign({}, D.settings.vote, { open: e.target.checked }) }); C.toast(e.target.checked ? "เปิดโหวตแล้ว" : "ปิดโหวตแล้ว"); } catch (x) { C.toast(x.message, true); e.target.checked = !e.target.checked; } });
      $("#qAnn", root).addEventListener("change", async e => { try { await saveSettings({ announcement: Object.assign({}, D.settings.announcement, { on: e.target.checked, version: C.uid("a") }) }); C.toast("บันทึกแล้ว"); } catch (x) { C.toast(x.message, true); } });
      $("#qRound", root).addEventListener("change", async e => { try { await saveSettings({ currentRound: e.target.value }); C.toast("ตั้งรอบปัจจุบันแล้ว"); } catch (x) { C.toast(x.message, true); } });
      root.addEventListener("click", e => { const g = e.target.closest("[data-go]"); if (g) go(g.dataset.go); });
      const fx = $("#imgFix", root); if (fx) fx.addEventListener("click", async () => {
        fx.disabled = true; const out = $("#imgRes", root);
        try {
          const r = await repairThumbs(m => { out.innerHTML = '<p class="muted" style="font-size:13.5px">' + esc(m) + "</p>"; });
          IMGCHK.html = '<p class="img-sum ' + (r.fail.length ? "no" : "ok") + '">' + (r.done.length ? "✓ ซ่อมแล้ว " + r.done.length + " รูป — หน้าเว็บแสดงรูปเหล่านี้ได้ทุกเครื่องแล้ว" : "ยังซ่อมไม่ได้สักรูป") + "</p>" +
            (r.fail.length ? '<p class="desc" style="margin:8px 0 4px">ดึงรูปเดิมมาไม่ได้ ' + r.fail.length + ' รูป — ให้ไปที่เมนู “เด็กฝึก” (หรือ “โปรไฟล์ทีมงาน”) กด ✎ แก้ไข → <b>อัปโหลด</b> รูปใหม่จากเครื่อง → <b>บันทึก</b></p><ul class="chk-list">' + r.fail.map(j => "<li><b>" + esc(j.label) + "</b></li>").join("") + "</ul>" : "");
          C.toast(r.done.length ? "ซ่อมรูปแล้ว " + r.done.length + " รูป" : "ยังซ่อมรูปไม่ได้ ดูรายละเอียดในการ์ด", !r.done.length);
        } catch (x) { IMGCHK.html = '<p class="img-sum no">ซ่อมไม่สำเร็จ: ' + esc(x.message) + "</p>"; }
        render();
      });
      $("#imgCheck", root).addEventListener("click", async e => {
        const b = e.target; b.disabled = true; b.textContent = "กำลังตรวจ…"; $("#imgRes", root).innerHTML = '<p class="muted" style="font-size:13.5px">กำลังตรวจรูปทั้งหมด อาจใช้เวลาสักครู่…</p>';
        try {
          const { res, old } = await checkImages(imageTargets()); const bad = res.filter(r => !r.ok);
          IMGCHK.html = '<p class="img-sum ' + (bad.length ? "no" : "ok") + '">' + (!res.length ? "ยังไม่มีรูปบนเว็บ" : old ? "⚠ Code.gs บนเซิร์ฟเวอร์ยังเป็นเวอร์ชันเก่า — รูปจาก Drive ทั้งหมดจะไม่ขึ้นสำหรับคนทั่วไป (ดูวิธีแก้ที่แถบเหลืองด้านบน)" : bad.length ? "รูปทั้งหมด " + res.length + " รูป — มีปัญหา " + bad.length + " รูป" : "✓ รูปทั้งหมด " + res.length + " รูป คนทั่วไปเห็นได้ครบ") + "</p>" +
            (bad.length && !old ? '<ul class="chk-list">' + bad.map(r => "<li><b>" + esc(r.label) + "</b><span>" + esc(r.msg) + "</span></li>").join("") + "</ul>" : "") +
            '<p class="muted" style="font-size:12.5px;margin:8px 0 0">ตรวจเมื่อ ' + esc(new Date().toLocaleTimeString("th-TH")) + "</p>";
        } catch (x) { IMGCHK.html = '<p class="img-sum no">ตรวจไม่สำเร็จ: ' + esc(x.message) + "</p>"; }
        $("#imgRes", root).innerHTML = IMGCHK.html; b.disabled = false; b.textContent = "ตรวจอีกครั้ง";
      });
    }
  };
  const LOGW = { login: "เข้าสู่ระบบ", add: "เพิ่ม", edit: "แก้ไข", delete: "ลบ", reorder: "จัดลำดับ", update: "อัปเดต", settings: "แก้ตั้งค่า", ban: "ระงับแฟนคลับ", unban: "ยกเลิกระงับ", account: "จัดการบัญชี", password: "เปลี่ยนรหัสผ่าน", votesReset: "รีเซ็ตโหวต", save: "บันทึก", upload: "อัปโหลดไฟล์", voteBoard: "บันทึกคะแนนโหวตภายนอก", votePublish: "ประกาศผลโหวต", voteUnpublish: "ยกเลิกประกาศผลโหวต", fanModerate: "จัดการโปรไฟล์แฟนคลับ" };
  const logText = l => (LOGW[l.action] || l.action) + (l.detail ? " " + l.detail : "");

  /* ranking editor */
  const RK = { round: null, list: null, out: null, dirty: false, votes: {} };
  function rkLoad() {
    const rid = RK.round; const all = D.trainees.slice();
    const ranked = all.filter(t => t.ranks && t.ranks[rid]).sort((a, b) => a.ranks[rid] - b.ranks[rid]);
    const rr = rounds(); const prevR = rr[rr.findIndex(r => r.id === rid) - 1];
    const rest = all.filter(t => !(t.ranks && t.ranks[rid]) && t.status !== "withdrawn" && (ranked.length === 0 ? true : t.status === "active"))
      .sort((a, b) => ((prevR && a.ranks && a.ranks[prevR.id]) || 999) - ((prevR && b.ranks && b.ranks[prevR.id]) || 999) || a.no - b.no);
    RK.list = ranked.concat(rest).map(t => t.id); RK.out = all.filter(t => !RK.list.includes(t.id)).map(t => t.id); RK.dirty = rest.length > 0 && ranked.length > 0;
  }
  VIEWS.ranking = {
    html: () => {
      if (!RK.round || !rounds().some(r => r.id === RK.round)) { RK.round = D.settings.currentRound || (rounds()[0] || {}).id; RK.list = null; }
      if (!RK.list) rkLoad();
      RK.votes = combined(RK.round);
      const cut = Number((D.settings.cutoffs || {})[RK.round] || 0);
      const T = id => D.trainees.find(t => t.id === id);
      const rows = RK.list.map((id, i) => { const t = T(id); if (!t) return ""; return '<div class="row" draggable="true" data-id="' + attr(id) + '"><span class="handle" aria-hidden="true">⋮⋮</span><span class="num">' + (i + 1) + '</span><div class="th round">' + C.portrait(t) + '</div><div class="tx"><strong>' + esc(t.name) + "</strong><small>" + esc((t.stageName || "") + " — " + (C.STATUS[t.status] || "")) + (RK.votes[id] ? " — คะแนนโหวตรวม " + C.fmtNum(RK.votes[id]) : "") + '</small></div><div class="acts"><button class="ib" type="button" data-mv="-1" aria-label="เลื่อนขึ้น"' + (i ? "" : " disabled") + '>↑</button><button class="ib" type="button" data-mv="1" aria-label="เลื่อนลง"' + (i < RK.list.length - 1 ? "" : " disabled") + '>↓</button><button class="ib danger" type="button" data-ex aria-label="ไม่จัดอันดับในรอบนี้" title="ไม่จัดอันดับในรอบนี้">×</button></div></div>' + (cut && i + 1 === cut && i < RK.list.length - 1 ? '<div class="cut"><span>เส้นตัด อันดับ ' + cut + "</span></div>" : ""); }).join("");
      return '<div class="a-card"><div class="a-head"><div><h3>อัปเดตอันดับเด็กฝึก</h3><span class="muted" style="font-size:13.5px">ลากเพื่อเรียง หรือใช้ปุ่มลูกศร แล้วกด “บันทึกอันดับ”</span></div><div class="toolbar">' +
        '<select class="input mini-sel" id="rkRound" aria-label="รอบ">' + OPT.round().map(o => '<option value="' + attr(o[0]) + '"' + (o[0] === RK.round ? " selected" : "") + ">" + esc(o[1]) + "</option>").join("") + "</select></div></div>" +
        '<div class="toolbar" style="margin-bottom:14px"><button class="btn btn-ghost btn-sm" type="button" id="rkVotes" title="โหวตบนเว็บ + คะแนนช่องทางอื่นของรอบนี้">เรียงตามผลโหวตรวม</button><button class="btn btn-ghost btn-sm" type="button" id="rkPrev">เรียงตามรอบก่อน</button><button class="btn btn-ghost btn-sm" type="button" id="rkClear">ล้างอันดับรอบนี้</button>' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:14px;margin-left:auto">เส้นตัดอันดับ <input class="input mini-sel" id="rkCut" type="number" min="0" style="width:80px" value="' + (cut || "") + '" placeholder="ไม่มี"></label>' +
        '<button class="btn btn-rose" type="button" id="rkSave">' + (RK.dirty ? "บันทึกอันดับ •" : "บันทึกอันดับ") + "</button></div>" +
        '<div class="rows rk-edit" id="rkList">' + (rows || '<div class="empty">ยังไม่มีเด็กฝึก</div>') + "</div>" +
        (RK.out.length ? '<h3 style="margin:22px 0 8px;font-size:15px">ไม่จัดอันดับในรอบนี้</h3><div class="rows">' + RK.out.map(id => { const t = T(id); return '<div class="row off"><div class="th round">' + C.portrait(t) + '</div><div class="tx"><strong>' + esc(t.name) + "</strong><small>" + esc(C.STATUS[t.status] || "") + '</small></div><div class="acts"><button class="ib" type="button" data-in="' + attr(id) + '" aria-label="เพิ่มเข้าอันดับ">+</button></div></div>'; }).join("") + "</div>" : "") + "</div>";
    },
    bind: root => {
      const mark = () => { RK.dirty = true; render(); };
      $("#rkRound", root).addEventListener("change", async e => { if (RK.dirty && !await confirmBox("ยังไม่ได้บันทึกอันดับที่แก้ไว้ เปลี่ยนรอบเลยหรือไม่?", "เปลี่ยนรอบ", false)) { e.target.value = RK.round; return; } RK.round = e.target.value; RK.list = null; render(); });
      $("#rkVotes", root).addEventListener("click", () => { const tt = combined(RK.round); RK.list.sort((a, b) => (tt[b] || 0) - (tt[a] || 0)); mark(); });
      $("#rkPrev", root).addEventListener("click", () => { const rr = rounds(); const p = rr[rr.findIndex(r => r.id === RK.round) - 1]; if (!p) { C.toast("ไม่มีรอบก่อนหน้า"); return; } const T = id => D.trainees.find(t => t.id === id); RK.list.sort((a, b) => ((T(a).ranks || {})[p.id] || 999) - ((T(b).ranks || {})[p.id] || 999)); mark(); });
      $("#rkClear", root).addEventListener("click", async () => { if (!await confirmBox("ล้างอันดับของรอบนี้ทั้งหมด? อันดับจะหายจากหน้าเว็บ", "ล้างอันดับ")) return; try { const r = await call("patch", { collection: "trainees", note: "ranks " + RK.round, changes: D.trainees.map(t => { const rk = Object.assign({}, t.ranks); delete rk[RK.round]; return { id: t.id, fields: { ranks: rk } }; }) }); D.trainees = r.items; RK.list = null; C.toast("ล้างแล้ว"); render(); } catch (x) { C.toast(x.message, true); } });
      $("#rkSave", root).addEventListener("click", async () => {
        const changes = D.trainees.map(t => { const rk = Object.assign({}, t.ranks); const i = RK.list.indexOf(t.id); if (i >= 0) rk[RK.round] = i + 1; else delete rk[RK.round]; return { id: t.id, fields: { ranks: rk } }; });
        const cut = Number($("#rkCut", root).value) || 0;
        try { const r = await call("patch", { collection: "trainees", changes, note: "ranks " + RK.round }); D.trainees = r.items; if (cut !== Number((D.settings.cutoffs || {})[RK.round] || 0)) await saveSettings({ cutoffs: Object.assign({}, D.settings.cutoffs, { [RK.round]: cut }) }); RK.dirty = false; C.toast("บันทึกอันดับแล้ว"); render(); } catch (x) { C.toast(x.message, true); }
      });
      $("#rkCut", root).addEventListener("change", () => { RK.dirty = true; $("#rkSave", root).textContent = "บันทึกอันดับ •"; });
      root.addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return; const row = b.closest("[data-id]");
        if (b.dataset.mv && row) { const i = RK.list.indexOf(row.dataset.id), j = i + Number(b.dataset.mv); if (j < 0 || j >= RK.list.length) return; [RK.list[i], RK.list[j]] = [RK.list[j], RK.list[i]]; mark(); }
        else if (b.hasAttribute("data-ex") && row) { RK.list = RK.list.filter(x => x !== row.dataset.id); RK.out.push(row.dataset.id); mark(); }
        else if (b.dataset.in) { RK.out = RK.out.filter(x => x !== b.dataset.in); RK.list.push(b.dataset.in); mark(); }
      });
      let dragId = null; const list = $("#rkList", root);
      list.addEventListener("dragstart", e => { const r = e.target.closest("[data-id]"); if (!r) return; dragId = r.dataset.id; r.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", dragId); } catch (x) { } });
      list.addEventListener("dragend", e => { const r = e.target.closest("[data-id]"); r && r.classList.remove("drag"); });
      list.addEventListener("dragover", e => { e.preventDefault(); $$(".over", list).forEach(x => x.classList.remove("over")); const r = e.target.closest("[data-id]"); r && r.classList.add("over"); });
      list.addEventListener("drop", e => { e.preventDefault(); const r = e.target.closest("[data-id]"); if (!r || !dragId || r.dataset.id === dragId) return; const from = RK.list.indexOf(dragId); RK.list.splice(from, 1); const to = RK.list.indexOf(r.dataset.id); const rect = r.getBoundingClientRect(); RK.list.splice(e.clientY > rect.top + rect.height / 2 ? to + 1 : to, 0, dragId); dragId = null; mark(); });
    }
  };

  VIEWS.trainees = collView("trainees", "เพิ่ม แก้ไขประวัติ และอัปเดตสถานะเด็กฝึก (ตกรอบ / ถอนตัว / เดบิวต์) ได้จากเมนูสถานะในแต่ละแถว");
  VIEWS.banners = collView("banners", "แบนเนอร์จะเลื่อนอัตโนมัติบนหน้าแรกตามลำดับนี้ ซ่อนชั่วคราวได้โดยปิด “แสดงบนหน้าแรก”");
  VIEWS.news = collView("news");
  VIEWS.events = { html: () => collView("events", "กิจกรรมในปฏิทิน 2570 (วันที่ต้องอยู่ในปี ค.ศ. 2027 จึงจะแสดงในปฏิทิน)").html() + '<div style="margin-top:16px">' + setArrView("categories").html() + "</div>", bind: root => { collView("events").bind(root); setArrView("categories").bind(root); } };
  VIEWS.rounds = collView("rounds", "รายละเอียดและกติกาของแต่ละรอบ จะแสดงในหน้า ROUNDS และเมนู ROUNDS");
  VIEWS.rules = { html: () => collView("rules").html() + '<div style="margin-top:16px">' + settingsCard("rulesUpd", "วันที่ปรับปรุงกฎ", "แสดงใต้หัวข้อหน้ากฎ", SETF.rulesUpd) + "</div>", bind: root => { collView("rules").bind(root); bindSettingsCards(root, SETF); } };
  VIEWS.uniforms = { html: () => collView("uniforms").html() + '<div style="margin-top:16px">' + settingsCard("uniNotes", "ข้อกำหนดการแต่งกาย", "บรรทัดละ 1 ข้อ แสดงใต้รายการชุดในหน้า UNIFORM", SETF.uniNotes) + "</div>", bind: root => { collView("uniforms").bind(root); bindSettingsCards(root, SETF); } };
  VIEWS.staff = collView("staff", "โปรไฟล์ที่แสดงในหน้า STAFF (แยกจากบัญชีเข้าระบบหลังบ้าน)");
  VIEWS.playlist = { html: () => setArrView("winners", "ศิลปินผู้ชนะจะแสดงบนดวงจันทร์ในหน้าแรกสุดของเว็บ (index) เรียงตามลำดับนี้").html() + '<div style="margin-top:16px">' + collView("tracks").html() + "</div>", bind: root => { setArrView("winners").bind(root); collView("tracks").bind(root); } };
  VIEWS.history = { html: () => settingsCard("about", "เกี่ยวกับโปรเจกต์", "ย่อหน้าแนะนำด้านบนหน้า HISTORY", SETF.about) + '<div style="margin-top:16px">' + collView("history").html() + "</div>", bind: root => { bindSettingsCards(root, SETF); collView("history").bind(root); } };

  const SETF = {
    site: [F("siteName", "ชื่อเว็บไซต์"), F("season", "ซีซัน", "text", { ph: "SEASON 2 — 2570" }), F("tagline", "คำโปรย", "text", { full: 1 }), F("footerNote", "ข้อความท้ายเว็บ", "text", { full: 1 })],
    socials: [F("socials.facebook", "Facebook Page"), F("socials.group", "Facebook Group"), F("socials.youtube", "YouTube"), F("socials.tiktok", "TikTok"), F("socials.discord", "Discord"), F("socials.doc", "เอกสารคอมมู (Google Doc)")],
    ann: [F("announcement.on", "แสดงประกาศ popup เมื่อเข้าหน้าแรก", "bool", { full: 1 }), F("announcement.title", "หัวข้อประกาศ", "text", { full: 1 }), F("announcement.body", "ข้อความ", "textarea", { rows: 3 }), F("announcement.link", "ลิงก์ปุ่ม"), F("announcement.linkLabel", "ข้อความปุ่ม"), F("announcement.image", "รูปประกอบ", "image")],
    about: [F("about", "ข้อความ", "textarea", { rows: 6 })],
    rulesUpd: [F("rulesUpdated", "ปรับปรุงล่าสุดเมื่อ", "date")],
    uniNotes: [F("uniformNotes", "ข้อกำหนด", "lines", { rows: 6 })],
    vote: [F("vote.open", "เปิดรับโหวต", "bool", { full: 1 }), F("vote.round", "นับคะแนนเข้ารอบ", "select", { opt: "round" }), F("vote.title", "หัวข้อหน้าโหวต", "text", { full: 1 }), F("vote.note", "ข้อความใต้หัวข้อ", "text", { full: 1 })]
  };
  VIEWS.settings = {
    html: () => settingsCard("site", "ข้อมูลเว็บไซต์", "ชื่อ ซีซัน และคำโปรยที่แสดงทั่วเว็บ", SETF.site) + settingsCard("socials", "ช่องทางติดตาม", "ไอคอนมุมซ้ายบนและท้ายเว็บ เว้นว่างเพื่อซ่อน", SETF.socials) + settingsCard("ann", "ประกาศ popup หน้าแรก", "แก้หัวข้อหรือข้อความแล้ว ประกาศจะเด้งให้ทุกคนเห็นใหม่อีกครั้ง", SETF.ann),
    bind: root => bindSettingsCards(root, SETF)
  };

  /* ระบบโหวต: คะแนนลับ + คะแนนจากช่องทางภายนอก + ประกาศผลรายรอบ */
  const VB = { round: null, sources: null, scores: null, dirty: false };
  function vbLoad(round) { const b = (D.board || {})[round] || {}; VB.round = round; VB.sources = JSON.parse(JSON.stringify(b.sources || [])); VB.scores = JSON.parse(JSON.stringify(b.scores || {})); VB.dirty = false; }
  const vbWeb = round => (((D.tallies || {})[round] || { totals: {} }).totals) || {};
  function vbTotals() { const web = vbWeb(VB.round), out = {}; D.trainees.forEach(t => { let n = Number(web[t.id]) || 0; VB.sources.forEach(s => n += Number((VB.scores[s.id] || {})[t.id]) || 0); out[t.id] = n; }); return out; }
  function vbFind(q) { q = String(q || "").trim().toLowerCase(); if (!q) return null; return D.trainees.find(t => [t.id, C.code(t), t.stageName, t.name].some(x => String(x || "").trim().toLowerCase() === q)); }
  VIEWS.vote = {
    html: () => {
      const v = D.settings.vote || {}; const rs = rounds();
      if (!VB.round || !rs.some(r => r.id === VB.round) || (!VB.dirty && VB.sources === null)) vbLoad(VB.round && rs.some(r => r.id === VB.round) ? VB.round : (v.round || (rs[0] || {}).id || ""));
      const b = (D.board || {})[VB.round] || {}, pub = b.published, web = vbWeb(VB.round), tot = vbTotals();
      const sum = Object.keys(tot).reduce((a, k) => a + tot[k], 0) || 0;
      const list = D.trainees.filter(t => t.status !== "withdrawn" || tot[t.id]).slice().sort((a, c) => tot[c.id] - tot[a.id] || (a.no - c.no));
      const r = rs.find(x => x.id === VB.round);
      const head = '<tr><th>#</th><th>เด็กฝึก</th><th class="num">โหวตบนเว็บ</th>' + VB.sources.map(s => '<th class="num src">' + esc(s.label) + "</th>").join("") + '<th class="num">รวม</th><th class="num">%</th></tr>';
      const body = list.map((t, i) => '<tr data-t="' + attr(t.id) + '" class="' + (t.status !== "active" ? "off" : "") + '"><td>' + (i + 1) + "</td><td><b>" + esc(C.code(t)) + "</b> " + esc(t.stageName || t.name) + '</td><td class="num">' + C.fmtNum(web[t.id] || 0) + "</td>" +
        VB.sources.map(s => '<td class="num"><input class="input vb-in" type="number" min="0" step="any" inputmode="decimal" data-src="' + attr(s.id) + '" data-t="' + attr(t.id) + '" value="' + attr((VB.scores[s.id] || {})[t.id] || "") + '" aria-label="' + attr(s.label + " — " + (t.stageName || t.name)) + '"></td>').join("") +
        '<td class="num vb-tot">' + C.fmtNum(tot[t.id]) + '</td><td class="num vb-pct">' + (sum ? (tot[t.id] / sum * 100).toFixed(1) : "0.0") + "</td></tr>").join("");
      return '<div class="kpis"><div class="kpi"><b>' + (D.votesToday || 0) + '</b><span>โหวตบนเว็บวันนี้</span></div><div class="kpi"><b>' + C.fmtNum(((D.tally || {}).total) || 0) + "</b><span>โหวตบนเว็บรอบ " + esc((rs.find(x => x.id === v.round) || {}).code || v.round || "-") + '</span></div><div class="kpi"><b>' + (D.fanCount || D.fans.length) + '</b><span>บัญชีแฟนคลับ</span></div><div class="kpi"><b>' + (v.open ? "เปิด" : "ปิด") + "</b><span>สถานะโหวต</span></div></div>" +
        settingsCard("vote", "ตั้งค่าการโหวต", "แฟนคลับโหวตได้วันละ 1 ครั้งต่อบัญชี ตัดรอบ 00:00 น. เวลาไทย ผลโหวตเป็นความลับ หน้าเว็บจะไม่แสดงคะแนนจนกว่าจะกด “ประกาศผล” ด้านล่าง — เปลี่ยน “นับคะแนนเข้ารอบ” เมื่อเริ่มรอบใหม่ คะแนนจะเริ่มนับใหม่โดยไม่ลบของเดิม", SETF.vote) +
        '<div class="a-card vb-card" style="margin-top:16px"><div class="a-head"><div><h3>คะแนนโหวตรวม <span class="badge no">ลับ — เห็นเฉพาะทีมงาน</span></h3><span class="muted" style="font-size:13.5px">โหวตบนเว็บนับให้อัตโนมัติ · คะแนนจากช่องทางอื่น (โพลเพจ, X, ฟอร์ม ฯลฯ) กรอกเองในตาราง</span></div><div class="toolbar"><select class="input mini-sel" id="vbRound" aria-label="รอบ">' + OPT.round().map(o => '<option value="' + attr(o[0]) + '"' + (o[0] === VB.round ? " selected" : "") + ">" + esc(o[1]) + "</option>").join("") + "</select></div></div>" +
        '<div class="vb-srcs">' + VB.sources.map(s => '<span class="vb-src"><input class="input" data-lab="' + attr(s.id) + '" value="' + attr(s.label) + '" aria-label="ชื่อช่องทาง"><button class="ib" type="button" data-paste="' + attr(s.id) + '" title="วางคะแนนทั้งคอลัมน์จากสเปรดชีต" aria-label="วางคะแนน">⎘</button><button class="ib danger" type="button" data-rmsrc="' + attr(s.id) + '" title="ลบช่องทางนี้" aria-label="ลบช่องทาง">×</button></span>').join("") + '<button class="btn btn-ghost btn-sm" type="button" id="vbAdd">+ เพิ่มช่องทางคะแนนภายนอก</button></div>' +
        (VB.sources.length ? "" : '<p class="muted" style="margin:0 0 12px;font-size:13.5px">ยังไม่มีคะแนนจากช่องทางอื่นในรอบนี้ — กด “+ เพิ่มช่องทางคะแนนภายนอก” แล้วกรอกคะแนนในคอลัมน์ใหม่</p>') +
        '<div class="tbl-wrap"><table class="tbl vb-tbl"><thead>' + head + "</thead><tbody>" + body + '</tbody><tfoot><tr><td></td><td>รวมทั้งหมด</td><td class="num">' + C.fmtNum(Object.keys(web).reduce((a, k) => a + (Number(web[k]) || 0), 0)) + "</td>" + VB.sources.map(s => '<td class="num" data-sum="' + attr(s.id) + '">' + C.fmtNum(Object.values(VB.scores[s.id] || {}).reduce((a, n) => a + (Number(n) || 0), 0)) + "</td>").join("") + '<td class="num" id="vbSum">' + C.fmtNum(sum) + "</td><td></td></tr></tfoot></table></div>" +
        '<div class="toolbar" style="justify-content:flex-end;margin-top:14px"><span class="muted" style="font-size:13px;margin-right:auto">' + (b.updatedAt ? "บันทึกล่าสุด " + esc(fmtTs(b.updatedAt)) + (b.updatedBy ? " โดย " + esc(b.updatedBy) : "") : "ยังไม่เคยบันทึกคะแนนภายนอกของรอบนี้") + '</span><button class="btn btn-ghost btn-sm" type="button" id="vbSort">เรียงตามคะแนนรวม</button><button class="btn btn-rose" type="button" id="vbSave">' + (VB.dirty ? "บันทึกคะแนน •" : "บันทึกคะแนน") + "</button></div></div>" +
        '<div class="a-card pub-card' + (pub ? " on" : "") + '" style="margin-top:16px"><h3>ประกาศผลโหวต ' + esc(r ? r.code + " " + r.title : "") + '</h3><p class="desc">' + (pub ? "ประกาศแล้วเมื่อ " + esc(fmtTs(pub.publishedAt)) + " — หน้าเว็บแสดงผลตามที่ประกาศไว้ ถ้าแก้คะแนนแล้วต้องกด “อัปเดตผลที่ประกาศ” อีกครั้ง" : "ยังไม่ประกาศ — แฟนคลับยังไม่เห็นคะแนนของรอบนี้ เมื่อกดประกาศ ระบบจะรวมโหวตบนเว็บ + คะแนนช่องทางอื่น ณ ตอนนั้น แล้วแสดงที่หน้า VOTE") + "</p>" +
        '<div class="form-grid"><div class="field"><label class="switch"><input type="checkbox" id="pbNum"' + (!pub || pub.showNumbers !== false ? " checked" : "") + '> แสดงตัวเลขคะแนน (ปิด = แสดงเฉพาะเปอร์เซ็นต์)</label></div><div class="field"><label class="switch"><input type="checkbox" id="pbBd"' + (pub && pub.breakdown ? " checked" : "") + '> แยกคะแนนบนเว็บ / แต่ละช่องทาง</label></div><div class="field full"><label for="pbNote">ข้อความประกอบการประกาศ (ไม่บังคับ)</label><input class="input" id="pbNote" value="' + attr(pub && pub.note || "") + '" placeholder="เช่น รวมคะแนนโหวตในเว็บและโพลบนเพจ Facebook"></div></div>' +
        '<div class="toolbar" style="justify-content:flex-end">' + (pub ? '<a class="btn btn-ghost btn-sm" href="vote.html#results" target="_blank" rel="noopener">ดูหน้าผลโหวต</a><button class="btn btn-ghost" type="button" id="pbOff">ยกเลิกประกาศ</button>' : "") + '<button class="btn btn-rose" type="button" id="pbGo">' + (pub ? "อัปเดตผลที่ประกาศ" : "ประกาศผลรอบนี้") + "</button></div></div>" +
        (isAdmin() ? '<div class="a-card" style="margin-top:16px;border-color:rgba(196,53,86,.4)"><h3>รีเซ็ตคะแนนโหวตบนเว็บ</h3><p class="desc">ลบคะแนนโหวตบนเว็บทั้งหมดของรอบที่เลือก (ไม่ลบคะแนนช่องทางอื่น) ใช้เมื่อต้องการเริ่มนับใหม่จริง ๆ เท่านั้น (เฉพาะแอดมิน)</p><div class="toolbar"><select class="input mini-sel" id="rsRound">' + OPT.round().map(o => '<option value="' + attr(o[0]) + '">' + esc(o[1]) + "</option>").join("") + '</select><button class="btn btn-rose btn-sm" type="button" id="rsGo">รีเซ็ตคะแนนรอบนี้</button></div></div>' : "");
    },
    bind: root => {
      bindSettingsCards(root, SETF);
      const markDirty = () => { VB.dirty = true; const b = $("#vbSave", root); if (b) b.textContent = "บันทึกคะแนน •"; };
      const refresh = () => { const tot = vbTotals(), sum = Object.keys(tot).reduce((a, k) => a + tot[k], 0);
        $$("tr[data-t]", root).forEach(tr => { const id = tr.dataset.t; tr.querySelector(".vb-tot").textContent = C.fmtNum(tot[id]); tr.querySelector(".vb-pct").textContent = sum ? (tot[id] / sum * 100).toFixed(1) : "0.0"; });
        VB.sources.forEach(s => { const c = root.querySelector('[data-sum="' + s.id + '"]'); if (c) c.textContent = C.fmtNum(Object.values(VB.scores[s.id] || {}).reduce((a, n) => a + (Number(n) || 0), 0)); });
        $("#vbSum", root).textContent = C.fmtNum(sum); };
      root.addEventListener("input", e => {
        const i = e.target.closest(".vb-in"); if (i) { const n = Number(i.value); VB.scores[i.dataset.src] = VB.scores[i.dataset.src] || {}; if (i.value === "" || !isFinite(n) || n <= 0) delete VB.scores[i.dataset.src][i.dataset.t]; else VB.scores[i.dataset.src][i.dataset.t] = n; markDirty(); refresh(); return; }
        const l = e.target.closest("[data-lab]"); if (l) { const s = VB.sources.find(x => x.id === l.dataset.lab); if (s) { s.label = l.value; markDirty(); } }
      });
      $("#vbRound", root).addEventListener("change", async e => { if (VB.dirty && !await confirmBox("ยังไม่ได้บันทึกคะแนนที่แก้ไว้ เปลี่ยนรอบเลยหรือไม่?", "เปลี่ยนรอบ", false)) { e.target.value = VB.round; return; } vbLoad(e.target.value); render(); });
      $("#vbAdd", root).addEventListener("click", () => openForm("เพิ่มช่องทางคะแนนภายนอก", [F("label", "ชื่อช่องทาง", "text", { req: 1, full: 1, ph: "เช่น Facebook Poll / X (Twitter) / Google Form" })], {}, async it => { VB.sources.push({ id: C.uid("s").slice(0, 12), label: it.label }); VB.dirty = true; return "เพิ่มช่องทางแล้ว กรอกคะแนนในคอลัมน์ใหม่ แล้วกดบันทึกคะแนน"; }));
      $("#vbSort", root).addEventListener("click", () => render());
      $("#vbSave", root).addEventListener("click", () => vbSave().then(() => { C.toast("บันทึกคะแนนแล้ว"); render(); }).catch(x => C.toast(x.message, true)));
      root.addEventListener("click", async e => {
        const rm = e.target.closest("[data-rmsrc]"); if (rm) { const s = VB.sources.find(x => x.id === rm.dataset.rmsrc); if (s && await confirmBox("ลบช่องทาง “" + s.label + "” และคะแนนทั้งคอลัมน์? (มีผลเมื่อกดบันทึกคะแนน)", "ลบช่องทาง")) { VB.sources = VB.sources.filter(x => x !== s); delete VB.scores[s.id]; VB.dirty = true; render(); } return; }
        const ps = e.target.closest("[data-paste]"); if (ps) { const s = VB.sources.find(x => x.id === ps.dataset.paste); if (s) vbPaste(s); }
      });
      $("#pbGo", root).addEventListener("click", async () => {
        const pub = ((D.board || {})[VB.round] || {}).published, r = rounds().find(x => x.id === VB.round);
        if (!await confirmBox((pub ? "อัปเดตผลที่ประกาศของ " : "ประกาศผลโหวต ") + (r ? r.code + " " + r.title : VB.round) + " ให้ทุกคนเห็นบนหน้าเว็บ? ระบบจะรวมโหวตบนเว็บ + คะแนนช่องทางอื่น ณ ตอนนี้", pub ? "อัปเดตผล" : "ประกาศผล", false)) return;
        try { if (VB.dirty) await vbSave(); const res = await call("votePublish", { round: VB.round, publish: true, showNumbers: $("#pbNum", root).checked, breakdown: $("#pbBd", root).checked, note: $("#pbNote", root).value.trim() }); D.board = res.board; C.toast("ประกาศผลแล้ว แฟนคลับเห็นที่หน้า VOTE ภายใน 1 นาที"); render(); } catch (x) { C.toast(x.message, true); }
      });
      const off = $("#pbOff", root); if (off) off.addEventListener("click", async () => { if (!await confirmBox("ยกเลิกการประกาศผลรอบนี้? หน้าเว็บจะกลับไปซ่อนคะแนน (คะแนนยังอยู่ครบ)", "ยกเลิกประกาศ")) return; try { const res = await call("votePublish", { round: VB.round, publish: false }); D.board = res.board; C.toast("ยกเลิกประกาศแล้ว"); render(); } catch (x) { C.toast(x.message, true); } });
      const b = $("#rsGo", root); if (b) b.addEventListener("click", async () => { const rid = $("#rsRound", root).value; if (!await confirmBox("ลบคะแนนโหวตบนเว็บทั้งหมดของรอบ " + rid + " การกระทำนี้ย้อนกลับไม่ได้", "รีเซ็ตคะแนน", true, "RESET")) return; try { const r = await call("votesReset", { round: rid }); C.toast("ลบแล้ว " + r.removed + " โหวต"); await reload(true); } catch (x) { C.toast(x.message, true); } });
    }
  };
  async function vbSave() {
    const empty = VB.sources.find(s => !String(s.label || "").trim()); if (empty) throw new Error("กรุณาตั้งชื่อช่องทางคะแนนให้ครบ");
    const r = await call("voteBoardSave", { round: VB.round, sources: VB.sources.map(s => ({ id: s.id, label: s.label.trim() })), scores: VB.scores });
    D.board = r.board; vbLoad(VB.round);
  }
  function vbPaste(src) {
    C.modal('<form class="pad" id="psForm"><h3 class="mt">วางคะแนน: ' + esc(src.label) + '</h3><p class="desc" style="color:var(--ink-3);font-size:14px;margin:-6px 0 12px">คัดลอก 2 คอลัมน์จาก Google Sheets / Excel มาวางได้เลย บรรทัดละ 1 คน: <b>รหัสหรือชื่อเด็กฝึก</b> แล้วตามด้วย <b>คะแนน</b> (คั่นด้วย Tab, จุลภาค หรือ |) เช่น<br><code>B01	120</code><br><code>Kai, 98</code></p><textarea class="input" id="psTx" rows="10" autofocus></textarea><p class="muted" id="psMsg" style="font-size:13px"></p><div class="form-foot"><button class="btn btn-ghost" type="button" onclick="Celestial.closeModal()">ยกเลิก</button><button class="btn btn-rose" type="submit">ใส่คะแนน</button></div></form>');
    $("#psForm").addEventListener("submit", e => {
      e.preventDefault(); const ok = [], bad = [];
      $("#psTx").value.split(/\r?\n/).map(x => x.trim()).filter(Boolean).forEach(line => { const m = line.match(/^(.*?)[\t,|;]\s*([\d.,]+)\s*$/) || line.match(/^(.*\S)\s+([\d.,]+)$/); const t = m && vbFind(m[1]); const n = m ? Number(m[2].replace(/,/g, "")) : NaN; if (t && isFinite(n)) { VB.scores[src.id] = VB.scores[src.id] || {}; if (n > 0) VB.scores[src.id][t.id] = n; else delete VB.scores[src.id][t.id]; ok.push(t.id); } else bad.push(line); });
      if (!ok.length) { $("#psMsg").textContent = "อ่านไม่ได้สักบรรทัด ตรวจรูปแบบอีกครั้ง"; return; }
      VB.dirty = true; C.closeModal(); render(); C.toast("ใส่คะแนนแล้ว " + ok.length + " คน" + (bad.length ? " (อ่านไม่ได้ " + bad.length + " บรรทัด)" : "") + " อย่าลืมกดบันทึก", !!bad.length);
    });
  }

  VIEWS.fans = {
    html: () => {
      const q = (listState.fq || "").toLowerCase(), sort = listState.fs || "new";
      const list = D.fans.filter(f => !q || (f.username + " " + f.displayName).toLowerCase().includes(q)).sort(sort === "hearts" ? (a, b) => (b.hearts || 0) - (a.hearts || 0) : (a, b) => String(b.createdAt).localeCompare(a.createdAt));
      return '<div class="a-card"><div class="a-head"><div><h3>สมาชิกแฟนคลับ</h3><span class="muted" style="font-size:13.5px">' + (D.fanCount || D.fans.length) + ' บัญชี — ระงับบัญชีที่ผิดกฎเพื่อปิดสิทธิ์โหวตและกดใจ / ล้างรูปที่ไม่เหมาะสมได้ที่ปุ่ม “จัดการ”</span></div><div class="toolbar"><select class="input mini-sel" id="fs" aria-label="เรียง"><option value="new"' + (sort === "new" ? " selected" : "") + '>สมัครล่าสุด</option><option value="hearts"' + (sort === "hearts" ? " selected" : "") + '>แต้มใจมากสุด</option></select><label class="search"><span class="sr">ค้นหา</span><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input class="input" id="fq" value="' + attr(listState.fq || "") + '" placeholder="ค้นหาชื่อผู้ใช้"></label></div></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>ชื่อที่แสดง</th><th>ชื่อผู้ใช้</th><th>ระดับ</th><th class="num">แต้มใจ</th><th class="num">โหวต</th><th>สมัครเมื่อ</th><th>สถานะ</th><th></th></tr></thead><tbody>' +
        list.slice(0, 300).map(f => { const lv = C.levelOf(f.hearts, D); return '<tr class="' + (f.banned ? "off" : "") + '"><td><span class="fav">' + C.avatarHtml(f) + "</span></td><td>" + esc(f.displayName) + "</td><td>@" + esc(f.username) + '</td><td><span class="badge" style="background:' + attr(lv.cur.color) + '22;color:' + attr(lv.cur.color) + '">LV.' + lv.n + " " + esc(lv.cur.name) + '</span></td><td class="num">' + C.fmtNum(f.hearts) + '</td><td class="num">' + (f.votes || 0) + "</td><td>" + esc(fmtTs(f.createdAt)) + "</td><td>" + (f.banned ? '<span class="badge no">ระงับ</span>' : '<span class="badge ok">ปกติ</span>') + '</td><td><button class="btn btn-ghost btn-sm" type="button" data-fan="' + attr(f.id) + '">จัดการ</button></td></tr>'; }).join("") + "</tbody></table></div>" + (list.length > 300 ? '<p class="muted">แสดง 300 รายการแรก ใช้ช่องค้นหาเพื่อหาบัญชีอื่น</p>' : "") + (list.length ? "" : '<div class="empty">ไม่พบบัญชี</div>') + "</div>";
    },
    bind: root => {
      $("#fq", root).addEventListener("input", e => { listState.fq = e.target.value; const p = e.target.selectionStart; render(); const n = $("#fq"); n.focus(); n.setSelectionRange(p, p); });
      $("#fs", root).addEventListener("change", e => { listState.fs = e.target.value; render(); });
      root.addEventListener("click", e => { const b = e.target.closest("[data-fan]"); if (b) fanManage(b.dataset.fan); });
    }
  };
  function fanManage(id) {
    const f = D.fans.find(x => x.id === id); if (!f) return;
    const lv = C.levelOf(f.hearts, D);
    C.modal('<div class="pad fan-manage"><h3 class="mt">จัดการแฟนคลับ @' + esc(f.username) + '</h3><div class="fm-grid"><div>' + C.fanCard(f, D, { link: false }) + '</div><div><dl class="dl" style="margin-top:0"><dt>ระดับ</dt><dd>LV.' + lv.n + " " + esc(lv.cur.name) + "</dd><dt>แต้มใจรวม</dt><dd>" + C.fmtNum(f.hearts) + "</dd><dt>เช็กอิน</dt><dd>" + (f.checkins || 0) + " วัน</dd><dt>ได้รับใจ</dt><dd>" + (f.received || 0) + "</dd><dt>ส่งใจ</dt><dd>" + (f.given || 0) + "</dd><dt>โบนัสจากทีมงาน</dt><dd>" + (f.bonus || 0) + "</dd><dt>โหวต</dt><dd>" + (f.votes || 0) + " ครั้ง</dd></dl>" + (f.bio ? '<p class="bio" style="font-size:14px">' + esc(f.bio) + "</p>" : "") + "</div></div>" +
      '<h4 class="fm-h">ล้างเนื้อหาที่ไม่เหมาะสม</h4><div class="toolbar"><button class="btn btn-ghost btn-sm" type="button" data-clr="avatar"' + (f.avatar ? "" : " disabled") + '>ล้างรูปโปรไฟล์</button><button class="btn btn-ghost btn-sm" type="button" data-clr="cover"' + (f.cover ? "" : " disabled") + '>ล้างภาพพื้นหลัง</button><button class="btn btn-ghost btn-sm" type="button" data-clr="bio"' + (f.bio ? "" : " disabled") + ">ล้างข้อความแนะนำตัว</button></div>" +
      '<h4 class="fm-h">แต้มใจโบนัส (เช่น รางวัลกิจกรรมแฟนคลับ)</h4><div class="toolbar"><input class="input mini-sel" id="fmBonus" type="number" step="1" style="width:110px" placeholder="+10 / -5"><button class="btn btn-ghost btn-sm" type="button" id="fmBonusGo">เพิ่ม/ลดแต้ม</button></div>' +
      '<div class="toolbar" style="justify-content:space-between;margin-top:22px"><a class="btn btn-ghost btn-sm" href="profile.html?u=' + encodeURIComponent(f.username) + '" target="_blank" rel="noopener">ดูโปรไฟล์บนเว็บ</a><button class="btn ' + (f.banned ? "btn-aqua" : "btn-rose") + ' btn-sm" type="button" id="fmBan">' + (f.banned ? "ยกเลิกระงับบัญชี" : "ระงับบัญชี") + "</button></div></div>");
    const box = $("#modal");
    const done = (r, msg) => { Object.assign(f, r.fan || {}); C.toast(msg); render(); fanManage(id); };
    $$("[data-clr]", box).forEach(b => b.addEventListener("click", async () => { const k = b.dataset.clr; if (!await confirmBox("ล้าง" + b.textContent.replace("ล้าง", "") + "ของ @" + f.username + "?", "ล้างข้อมูล")) { fanManage(id); return; } try { done(await call("fanModerate", { id, clear: [k] }), "ล้างแล้ว"); } catch (x) { C.toast(x.message, true); } }));
    $("#fmBonusGo", box).addEventListener("click", async () => { const n = Math.round(Number($("#fmBonus", box).value) || 0); if (!n) { C.toast("ใส่จำนวนแต้ม เช่น 10 หรือ -5", true); return; } try { done(await call("fanModerate", { id, bonusAdd: n }), (n > 0 ? "เพิ่ม " : "ลด ") + Math.abs(n) + " แต้มแล้ว"); } catch (x) { C.toast(x.message, true); } });
    $("#fmBan", box).addEventListener("click", async () => { const ban = !f.banned; if (ban && !await confirmBox("ระงับบัญชีนี้? เจ้าของบัญชีจะเข้าสู่ระบบ โหวต และกดใจไม่ได้ และโปรไฟล์จะถูกซ่อน", "ระงับบัญชี")) { fanManage(id); return; } try { await call("fanBan", { id, banned: ban }); f.banned = ban; C.toast(ban ? "ระงับแล้ว" : "ยกเลิกระงับแล้ว"); render(); fanManage(id); } catch (x) { C.toast(x.message, true); } });
  }

  const levelDefs = setArrView("fanLevels", "แฟนคลับได้แต้มใจจากการกดเช็กอินประจำวัน (+1/วัน) และจากแฟนคลับคนอื่นส่งใจให้ (คนละ 1 ใจ/วัน) แต้มสะสมถึงขั้นต่ำของระดับไหนจะได้ระดับนั้น พร้อมกรอบการ์ดประจำระดับ");
  VIEWS.levels = {
    html: () => {
      const L = C.fanLevels(D), sample = (lv, i) => C.fanCard({ username: "sample" + (i + 1), displayName: "ตัวอย่าง " + lv.name, hearts: Number(lv.min) || 0, theme: ["rose", "aqua", "blush", "gold", "violet", "mint"][i % 6] }, D, { link: false, noBias: 1 });
      return levelDefs.html() + '<div class="a-card" style="margin-top:16px"><h3>ตัวอย่างการ์ดแต่ละระดับ</h3><p class="desc">หน้าตาการ์ดที่แฟนคลับจะเห็นบนโปรไฟล์และหน้าทำเนียบแฟนคลับ</p><div class="lv-preview">' + L.map(sample).join("") + "</div></div>";
    },
    bind: root => levelDefs.bind(root)
  };

  VIEWS.accounts = {
    html: () => '<div class="a-card"><div class="a-head"><div><h3>บัญชีทีมงาน</h3><span class="muted" style="font-size:13.5px">' + D.accounts.length + ' บัญชี — สร้างบัญชีให้สตาฟแต่ละคนแยกกัน ระบบจะบันทึกว่าใครแก้อะไร</span></div><button class="btn btn-rose" type="button" id="acAdd">+ เพิ่มบัญชี</button></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>ชื่อผู้ใช้</th><th>ชื่อ</th><th>สิทธิ์</th><th>สถานะ</th><th>เข้าระบบล่าสุด</th><th></th></tr></thead><tbody>' +
      D.accounts.map(a => '<tr class="' + (a.active ? "" : "off") + '"><td>' + esc(a.username) + "</td><td>" + esc(a.name) + '</td><td><span class="badge' + (a.role === "admin" ? " no" : "") + '">' + (a.role === "admin" ? "แอดมิน" : "สตาฟ") + "</span></td><td>" + (a.active ? '<span class="badge ok">ใช้งาน</span>' : '<span class="badge">ปิดใช้งาน</span>') + "</td><td>" + esc(fmtTs(a.lastLogin)) + '</td><td><button class="btn btn-ghost btn-sm" type="button" data-ac="' + attr(a.username) + '">แก้ไข</button></td></tr>').join("") + "</tbody></table></div></div>",
    bind: root => {
      const form = a => openForm(a ? "แก้ไขบัญชี " + a.username : "เพิ่มบัญชีทีมงาน", [F("username", "ชื่อผู้ใช้ (a-z, 0-9)", "text", { req: 1, ro: !!a }), F("name", "ชื่อที่แสดง", "text", { req: 1 }), F("role", "สิทธิ์", "select", { opt: "role" }), F("active", "เปิดใช้งานบัญชี", "bool"), F("password", a ? "ตั้งรหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" : "รหัสผ่าน (อย่างน้อย 8 ตัว)", "password", { full: 1, req: !a })], a ? Object.assign({}, a, { password: "" }) : { role: "staff", active: true },
        async it => { await call("accountSave", { account: it }); await reload(true); });
      $("#acAdd", root).addEventListener("click", () => form(null));
      root.addEventListener("click", e => { const b = e.target.closest("[data-ac]"); if (b) form(D.accounts.find(a => a.username === b.dataset.ac)); });
    }
  };

  VIEWS.log = { html: () => '<div class="a-card"><h3>บันทึกการทำงานของทีมงาน</h3><p class="desc">120 รายการล่าสุด</p><ul class="log">' + (D.log || []).map(l => "<li><time>" + esc(fmtTs(l.ts)) + "</time><span><b>" + esc(l.user) + "</b> " + esc(logText(l)) + "</span></li>").join("") + "</ul></div>", bind: () => { } };

  /* ---------- nav & shell ---------- */
  const NAV = [
    ["ภาพรวม", [["dashboard", "แดชบอร์ด"]]],
    ["การแข่งขัน", [["ranking", "อันดับเด็กฝึก"], ["trainees", "เด็กฝึก", () => D.trainees.length], ["rounds", "กติกาแต่ละรอบ", () => D.rounds.length], ["vote", "ระบบโหวต & ประกาศผล"]]],
    ["หน้าเว็บ", [["banners", "แบนเนอร์", () => D.banners.length], ["news", "ข่าวสาร", () => D.news.length], ["events", "ปฏิทิน 2570", () => D.events.length], ["rules", "กฎของคอมมู"], ["uniforms", "ชุดเด็กฝึก"], ["staff", "โปรไฟล์ทีมงาน"], ["playlist", "ศิลปินผู้ชนะ & เพลง"], ["history", "ประวัติโปรเจกต์"], ["settings", "ตั้งค่าเว็บไซต์"]]],
    ["สมาชิก", [["fans", "แฟนคลับ", () => D.fanCount || D.fans.length], ["levels", "ระดับแฟนคลับ & การ์ด"], ["accounts", "บัญชีทีมงาน", null, 1], ["log", "บันทึกการทำงาน"]]]
  ];
  const TITLES = {}; NAV.forEach(g => g[1].forEach(i => TITLES[i[0]] = i[1]));
  function go(v) { if (!VIEWS[v] || (v === "accounts" && !isAdmin())) v = "dashboard"; view = v; try { history.replaceState(null, "", "#" + v); } catch (e) { } closeSide(); render(); window.scrollTo(0, 0); }
  function closeSide() { $(".a-side") && $(".a-side").classList.remove("open"); $("#scrim") && $("#scrim").classList.remove("show"); }
  function render() {
    if (!D) return;
    $("#aNav").innerHTML = NAV.map(g => "<h6>" + esc(g[0]) + "</h6>" + g[1].filter(i => !i[3] || isAdmin()).map(i => '<button type="button" data-v="' + i[0] + '"' + (i[0] === view ? ' class="on" aria-current="page"' : "") + ">" + esc(i[1]) + (i[2] ? '<span class="cnt">' + i[2]() + "</span>" : "") + "</button>").join("")).join("");
    $("#aTitle").textContent = TITLES[view] || "";
    const root = $("#view"); const y = window.scrollY;
    const fresh = root.cloneNode(false); root.replaceWith(fresh);
    fresh.innerHTML = serverBanner() + VIEWS[view].html(); VIEWS[view].bind(fresh);
    window.scrollTo(0, y);
  }
  async function reload(keep) { D = await call("admin"); if (!keep) RK.list = null; if (!VB.dirty) VB.sources = null; render(); }

  function shell() {
    document.body.innerHTML = '<div class="sky" aria-hidden="true"></div><div class="a-shell"><aside class="a-side" aria-label="เมนูหลังบ้าน"><a class="logo" href="home.html" target="_blank" rel="noopener"><img src="assets/img/emblem.png" alt=""><span><b>CELESTIAL</b><small>ระบบหลังบ้าน</small></span></a><nav class="a-nav" id="aNav"></nav></aside><div class="a-scrim" id="scrim"></div>' +
      '<div class="a-main"><header class="a-top"><button class="menu-btn a-burger" id="burger" type="button" aria-label="เมนู"><i></i></button><h2 id="aTitle"></h2><span class="mode-pill' + (C.LIVE ? "" : " demo") + '"><i></i>' + (C.LIVE ? "เชื่อมต่อ Google Sheets" : "โหมดตัวอย่าง") + '</span><button class="ib" id="aRefresh" type="button" title="โหลดข้อมูลล่าสุด" aria-label="โหลดข้อมูลล่าสุด">⟳</button><div class="me"><span class="acct-btn" style="pointer-events:none"><span class="dot">' + esc(S.user.name.slice(0, 1)) + '</span><span class="nm">' + esc(S.user.name) + '</span></span><span class="role' + (isAdmin() ? " admin" : "") + '">' + (isAdmin() ? "แอดมิน" : "สตาฟ") + '</span></div><button class="btn btn-ghost btn-sm" id="aPw" type="button">รหัสผ่าน</button><button class="btn btn-ghost btn-sm" id="aOut" type="button">ออก</button></header><div class="a-body" id="view"></div></div></div><div class="saving" id="saving">กำลังบันทึก…</div>';
    $("#aNav").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (b) go(b.dataset.v); });
    $("#burger").addEventListener("click", () => { $(".a-side").classList.add("open"); $("#scrim").classList.add("show"); });
    $("#scrim").addEventListener("click", closeSide);
    $("#aOut").addEventListener("click", () => { Sess.clear(); location.reload(); });
    $("#aRefresh").addEventListener("click", async () => { try { await reload(true); C.toast("โหลดข้อมูลล่าสุดแล้ว"); } catch (x) { C.toast(x.message, true); } });
    $("#aPw").addEventListener("click", () => openForm("เปลี่ยนรหัสผ่านของฉัน", [F("oldPassword", "รหัสผ่านเดิม", "password", { req: 1, full: 1 }), F("newPassword", "รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)", "password", { req: 1, full: 1 })], {}, async it => { await call("changePassword", it); }));
  }

  function loginScreen(msg) {
    document.body.innerHTML = '<div class="sky" aria-hidden="true"></div><main class="a-login"><form class="panel" id="sl" novalidate><div class="brand"><img src="assets/img/emblem.png" alt=""><h1>ระบบหลังบ้านสำหรับสตาฟ</h1><p>THE CELESTIAL : PROJECT</p></div><p class="err hide" id="slErr" style="margin:0 0 12px;padding:10px 14px;border-radius:12px;background:rgba(196,53,86,.15);border:1px solid rgba(196,53,86,.45);color:#ffd9dd;font-size:14px"></p>' +
      '<div class="field"><label for="su">ชื่อผู้ใช้</label><input class="input" id="su" autocomplete="username" autocapitalize="none" autofocus></div><div class="field"><label for="sp">รหัสผ่าน</label><input class="input" id="sp" type="password" autocomplete="current-password"></div><button class="btn btn-rose" type="submit" style="width:100%">เข้าสู่ระบบ</button>' +
      (C.LIVE ? "" : '<div class="demo-hint">โหมดตัวอย่าง: ลองเข้าด้วย <code>polaris</code> (แอดมิน) หรือ <code>sirius</code> (สตาฟ) รหัสผ่าน <code>celestial2570</code><br>ข้อมูลที่แก้จะอยู่ในเบราว์เซอร์นี้เท่านั้น <button type="button" class="btn btn-ghost btn-sm" id="demoReset" style="margin-top:8px">ล้างข้อมูลตัวอย่าง</button></div>') +
      '<p style="text-align:center;margin:16px 0 0;font-size:14px"><a href="home.html">กลับหน้าเว็บไซต์</a></p></form></main>';
    C.Store && (document.title = "ระบบหลังบ้าน — THE CELESTIAL : PROJECT");
    const err = m => { const e = $("#slErr"); e.textContent = m; e.classList.toggle("hide", !m); };
    if (msg) err(msg);
    const dr = $("#demoReset"); if (dr) dr.addEventListener("click", () => { C.API.demo.reset(); C.toast("รีเซ็ตข้อมูลตัวอย่างแล้ว"); });
    $("#sl").addEventListener("submit", async e => {
      e.preventDefault(); err(""); const btn = e.target.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "กำลังตรวจสอบ…";
      try { const r = await C.API.call("staffLogin", { username: $("#su").value, password: $("#sp").value }); Sess.set(r); start(); }
      catch (x) { err(x.message); btn.disabled = false; btn.textContent = "เข้าสู่ระบบ"; }
    });
  }

  async function start() {
    S = Sess.get(); if (!S) return loginScreen();
    shell(); $("#view").innerHTML = '<div class="skel" style="height:300px"></div>';
    try { D = await call("admin"); S.user = D.me || S.user; }
    catch (e) { Sess.clear(); return loginScreen(e.message); }
    const h = location.hash.slice(1); view = VIEWS[h] ? h : "dashboard"; if (view === "accounts" && !isAdmin()) view = "dashboard";
    render();
  }
  window.addEventListener("beforeunload", e => { if (RK.dirty && view === "ranking") { e.preventDefault(); e.returnValue = ""; } });
  start();
}
