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
  const tiers = () => (D.settings.tiers || []);
  const cats = () => (D.settings.categories || []);
  const rounds = () => (D.rounds || []).slice().sort(byOrder);
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
  async function upload(file, kind) {
    let dataUrl;
    if (kind === "image") dataUrl = await resizeImage(file, C.LIVE ? 1600 : 900, C.LIVE ? 0.86 : 0.8);
    else { const lim = C.LIVE ? 20e6 : 1.5e6; if (file.size > lim) throw new Error(C.LIVE ? "ไฟล์ใหญ่เกิน 20MB" : "โหมดตัวอย่างรับไฟล์เสียงไม่เกิน 1.5MB ใช้ลิงก์ Google Drive แทน"); dataUrl = await readData(file); }
    const r = await call("upload", { name: file.name, kind, dataUrl }); return r.url;
  }

  /* ---------- generic fields ---------- */
  const OPT = {
    side: () => [["B", "B — ฝั่งชาย"], ["G", "G — ฝั่งหญิง"]],
    side3: () => [["G", "G — ฝั่งหญิง"], ["B", "B — ฝั่งชาย"], ["X", "รวมชายหญิง"]],
    status: () => [["active", "กำลังแข่งขัน"], ["eliminated", "ตกรอบ"], ["withdrawn", "ถอนตัว"], ["debut", "เดบิวต์"]],
    tier: () => [["", "— ยังไม่จัด —"]].concat(tiers().map(t => [t.id, "เทียร์ " + t.label])),
    cat: () => cats().map(c => [c.id, c.label]),
    rstatus: () => [["live", "กำลังแข่งขัน"], ["soon", "เร็ว ๆ นี้"], ["done", "จบรอบแล้ว"]],
    rkind: () => [["list", "รายการข้อ (1.1, 1.2 …)"], ["table", "ตารางบทลงโทษ"]],
    tone: () => [["rose", "แดงกุหลาบ"], ["aqua", "ฟ้าน้ำทะเล"], ["blush", "ชมพูจันทร์"]],
    garment: () => [["jacket", "แจ็กเก็ตฝึกซ้อม"], ["stage", "ชุดเวที"]],
    winner: () => [["", "— ไม่ระบุ (แสดงในแท็บ ALL TRACKS) —"]].concat((D.settings.winners || []).map(w => [w.id, w.name])),
    round: () => rounds().map(r => [r.id, r.code + " " + r.title]),
    role: () => [["staff", "สตาฟ — แก้ไขเนื้อหา"], ["admin", "แอดมิน — จัดการบัญชีและรีเซ็ตโหวตได้"]]
  };
  function fieldHtml(f, v) {
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
        const src = f.type === "image" ? C.imgUrl(v) : "";
        inp = '<div class="img-field"><div class="pv" data-pv="' + id + '">' + (src ? '<img src="' + attr(src) + '" alt="">' : f.type === "audio" ? "ไฟล์เสียง" : "ไม่มีรูป") + '</div><div><div class="ctrl"><input class="input" id="' + id + '" name="' + attr(f.k) + '" value="' + attr(String(v).startsWith("data:") ? "(อัปโหลดแล้ว)" : v) + '" data-raw="' + attr(String(v).startsWith("data:") ? v : "") + '" placeholder="วางลิงก์ หรือกดอัปโหลด"><label class="btn btn-ghost btn-sm up-btn">อัปโหลด<input type="file" accept="' + (f.type === "image" ? "image/*" : "audio/*") + '" data-up="' + id + '" data-kind="' + f.type + '"></label></div>' + help + "</div></div>";
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
    $$("[data-up]", root).forEach(inp => inp.addEventListener("change", async () => {
      const file = inp.files[0]; if (!file) return; const t = $("#" + inp.dataset.up, root), pv = root.querySelector('[data-pv="' + inp.dataset.up + '"]');
      pv.textContent = "กำลังอัปโหลด…";
      try { const url = await upload(file, inp.dataset.kind); if (url.startsWith("data:")) { t.value = "(อัปโหลดแล้ว)"; t.dataset.raw = url; } else { t.value = url; t.dataset.raw = ""; } pv.innerHTML = inp.dataset.kind === "image" ? '<img src="' + attr(C.imgUrl(url)) + '" alt="">' : "✓ อัปโหลดแล้ว"; C.toast("อัปโหลดแล้ว อย่าลืมกดบันทึก"); }
      catch (e) { pv.textContent = "ผิดพลาด"; C.toast(e.message, true); }
      inp.value = "";
    }));
    $$('.img-field input.input', root).forEach(t => t.addEventListener("input", () => { t.dataset.raw = ""; const pv = root.querySelector('[data-pv="' + t.id + '"]'); const u = C.imgUrl(t.value); if (pv && pv.textContent !== "ไฟล์เสียง") pv.innerHTML = u ? '<img src="' + attr(u) + '" alt="" onerror="this.replaceWith(\'ลิงก์รูปเปิดไม่ได้\')">' : "ไม่มีรูป"; }));
  }
  function openForm(title, fields, item, onSave, extra = "") {
    C.modal('<form class="pad" id="edForm" novalidate><h3 class="mt">' + esc(title) + "</h3>" + extra + '<div class="form-grid">' + fields.map(f => fieldHtml(f, f.k.split(".").reduce((o, k) => o == null ? o : o[k], item))).join("") + '</div><div class="form-foot"><button class="btn btn-ghost" type="button" onclick="Celestial.closeModal()">ยกเลิก</button><button class="btn btn-rose" type="submit">บันทึก</button></div></form>');
    const form = $("#edForm"); bindFormExtras(form);
    form.addEventListener("submit", async e => {
      e.preventDefault(); const out = JSON.parse(JSON.stringify(item || {}));
      for (const f of fields) {
        const v = readField(form, f); if (v === undefined) continue;
        if (f.req && (v === "" || (Array.isArray(v) && !v.length))) { C.toast("กรุณากรอก " + f.label, true); form.elements[f.k] && form.elements[f.k].focus(); return; }
        const ks = f.k.split("."); let o = out; ks.slice(0, -1).forEach(k => { o[k] = o[k] && typeof o[k] === "object" ? o[k] : {}; o = o[k]; }); o[ks[ks.length - 1]] = v;
      }
      const btn = form.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "กำลังบันทึก…";
      try { await onSave(out); C.closeModal(); C.toast("บันทึกแล้ว"); render(); }
      catch (x) { C.toast(x.message, true); btn.disabled = false; btn.textContent = "บันทึก"; }
    });
  }

  /* ---------- schemas ---------- */
  const F = (k, label, type = "text", o = {}) => Object.assign({ k, label, type }, o);
  const SCHEMA = {
    trainees: {
      label: "เด็กฝึก", add: "เพิ่มเด็กฝึก",
      fields: () => [F("side", "ฝั่ง", "select", { opt: "side", req: 1 }), F("no", "หมายเลข", "number", { req: 1 }), F("name", "ชื่อ-นามสกุล", "text", { req: 1 }), F("stageName", "ชื่อในวงการ / ชื่อเล่น"), F("nationality", "สัญชาติ", "text", { ph: "เช่น ไทย" }), F("position", "ตำแหน่ง", "text", { ph: "เช่น Main Vocal / Leader" }), F("birthday", "วันเกิด", "text", { ph: "เช่น 14 ก.พ." }), F("height", "ส่วนสูง", "text", { ph: "เช่น 175 cm" }), F("tier", "เทียร์", "select", { opt: "tier" }), F("status", "สถานะ", "select", { opt: "status" }), F("photo", "รูปโปรไฟล์ (แนวตั้ง 4:5)", "image", { help: "อัปโหลด หรือวางลิงก์รูป (รองรับลิงก์แชร์ Google Drive)" }), F("bio", "ประวัติ", "textarea", { rows: 5 }), F("cv", "ผู้เล่น / CV (แสดงในโปรไฟล์ ถ้าเว้นว่างจะไม่แสดง)"), F("link", "ลิงก์โปรไฟล์ฉบับเต็ม (Google Doc ฯลฯ)")],
      row: t => ({ th: '<div class="th">' + C.portrait(t) + "</div>", title: t.side + String(t.no).padStart(2, "0") + " " + t.name, sub: [t.stageName, t.nationality, t.position].filter(Boolean).join(" — "), off: t.status !== "active" && t.status !== "debut" }),
      sort: (a, b) => a.side.localeCompare(b.side) || a.no - b.no,
      fresh: () => { const side = "B"; const n = Math.max(0, ...D.trainees.filter(t => t.side === side).map(t => +t.no || 0)) + 1; return { side, no: n, status: "active", tier: "", ranks: {} }; },
      search: t => [t.name, t.stageName, t.nationality, t.position, t.side + t.no].join(" ")
    },
    banners: { label: "แบนเนอร์", add: "เพิ่มแบนเนอร์", ordered: 1, fields: () => [F("title", "หัวข้อ", "text", { req: 1 }), F("subtitle", "ข้อความรอง"), F("image", "รูปแบนเนอร์ (แนวนอน 21:8 แนะนำ 2100×800)", "image", { help: "ถ้าไม่ใส่รูป ระบบจะสร้างแบนเนอร์ลายดวงจันทร์ให้อัตโนมัติ" }), F("link", "ลิงก์ปุ่ม", "text", { ph: "เช่น vote.html หรือ https://…" }), F("linkLabel", "ข้อความบนปุ่ม", "text", { ph: "เช่น โหวตเลย" }), F("tone", "โทนสี (กรณีไม่มีรูป)", "select", { opt: "tone" }), F("active", "แสดงบนหน้าแรก", "bool"), F("hideText", "ซ่อนข้อความบนรูป (ใช้เมื่อรูปมีข้อความอยู่แล้ว)", "bool")], row: b => ({ th: '<div class="th">' + (C.imgUrl(b.image) ? '<img src="' + attr(C.imgUrl(b.image)) + '" alt="">' : '<div class="art" style="--a:#7B182F;--c:#04161B"><b>' + esc((b.title || "?").slice(0, 2)) + "</b></div>") + "</div>", title: b.title, sub: (b.active === false ? "ซ่อนอยู่ — " : "") + (b.subtitle || ""), off: b.active === false }), fresh: () => ({ active: true, tone: "rose" }) },
    news: { label: "ข่าวสาร", add: "เพิ่มข่าว", fields: () => [F("title", "หัวข้อข่าว", "text", { req: 1 }), F("date", "วันที่", "date", { req: 1 }), F("tag", "แท็ก", "text", { ph: "เช่น ผลการแข่งขัน" }), F("pinned", "ปักหมุดไว้บนสุด", "bool"), F("body", "เนื้อหาย่อ", "textarea"), F("link", "ลิงก์อ่านต่อ"), F("image", "รูปประกอบ", "image")], row: n => ({ th: '<div class="th">' + (C.imgUrl(n.image) ? '<img src="' + attr(C.imgUrl(n.image)) + '" alt="">' : '<div class="art"><b>N</b></div>') + "</div>", title: (n.pinned ? "📌 " : "") + n.title, sub: C.fmtDate(n.date) + (n.tag ? " — " + n.tag : "") }), sort: (a, b) => String(b.date).localeCompare(a.date), fresh: () => ({ date: C.iso(new Date()) }), search: n => n.title + " " + n.tag },
    events: { label: "ปฏิทิน", add: "เพิ่มกิจกรรม", fields: () => [F("title", "ชื่อกิจกรรม", "text", { req: 1 }), F("category", "ประเภท", "select", { opt: "cat" }), F("date", "วันที่เริ่ม", "date", { req: 1 }), F("end", "วันที่สิ้นสุด (ถ้ามีหลายวัน)", "date"), F("time", "เวลา", "text", { ph: "เช่น 20:00 น." }), F("desc", "รายละเอียด", "textarea", { rows: 3 })], row: e => { const c = cats().find(x => x.id === e.category); return { th: '<div class="th sw" style="background:' + attr(c ? c.color : "#9fb3b8") + '">' + esc(String(+e.date.slice(8, 10) || "")) + "</div>", title: e.title, sub: C.fmtRange(e.date, e.end) + (c ? " — " + c.label : "") + (e.time ? " — " + e.time : "") }; }, sort: (a, b) => String(a.date).localeCompare(b.date), fresh: () => ({ date: "2027-01-01", category: (cats()[0] || {}).id }), search: e => e.title + " " + e.date },
    rounds: { label: "รอบการแข่งขัน", add: "เพิ่มรอบ", ordered: 1, fields: () => [F("code", "รหัสรอบ", "text", { req: 1, ph: "เช่น ROUND 03" }), F("title", "ชื่อรอบ", "text", { req: 1, ph: "เช่น SOLAR FLARE" }), F("subtitle", "คำอธิบายสั้น", "text", { full: 1 }), F("status", "สถานะ", "select", { opt: "rstatus" }), F("deadline", "กำหนดส่งงาน", "date"), F("start", "วันเริ่มรอบ", "date"), F("end", "วันประกาศผล", "date"), F("summary", "สรุปภารกิจ", "textarea"), F("rules", "กติกา (บรรทัดละ 1 ข้อ)", "lines"), F("scoring", "เกณฑ์คะแนน (บรรทัดละ 1 รายการ รูปแบบ: หัวข้อ | คะแนน)", "pairs"), F("doc", "ลิงก์เอกสารภารกิจ (Google Doc)"), F("video", "ลิงก์คลิปการแสดง (YouTube)"), F("banner", "รูปแบนเนอร์รอบ", "image")], row: r => ({ th: '<div class="th sw" style="background:' + ({ live: "#C43556", done: "#5B6E74", soon: "#86DDE4" }[r.status] || "#86DDE4") + '">' + esc((r.code || "").replace(/\D/g, "").slice(-2) || "F") + "</div>", title: r.code + " — " + r.title + (D.settings.currentRound === r.id ? " (รอบปัจจุบัน)" : ""), sub: ({ live: "กำลังแข่งขัน", done: "จบรอบแล้ว", soon: "เร็ว ๆ นี้" }[r.status] || "") + " — " + C.fmtRange(r.start, r.end) }), fresh: () => ({ status: "soon", rules: [], scoring: [] }) },
    rules: { label: "กฎของคอมมู", add: "เพิ่มหมวดกฎ", ordered: 1, fields: () => [F("title", "ชื่อหมวด", "text", { req: 1 }), F("kind", "รูปแบบ", "select", { opt: "rkind" }), F("items", "ข้อกฎ (บรรทัดละ 1 ข้อ — แบบตารางใช้รูปแบบ: การกระทำ | บทลงโทษ)", "lines", { rows: 9 })], row: r => ({ th: '<div class="th sw" style="background:#F9CCCB">' + esc(String(r.order || "")) + "</div>", title: r.title, sub: (r.items || []).length + " ข้อ — " + (r.kind === "table" ? "ตาราง" : "รายการ") }), fresh: () => ({ kind: "list", items: [] }) },
    uniforms: { label: "ชุดเด็กฝึก", add: "เพิ่มชุด", ordered: 1, fields: () => [F("name", "ชื่อชุด", "text", { req: 1 }), F("tier", "ใช้กับเทียร์", "select", { opt: "tier" }), F("color", "สีหลัก", "color"), F("garment", "แบบภาพตัวอย่าง (กรณีไม่มีรูป)", "select", { opt: "garment" }), F("image", "รูปชุดจริง", "image"), F("desc", "คำอธิบาย", "textarea", { rows: 3 })], row: u => ({ th: '<div class="th">' + (C.imgUrl(u.image) ? '<img src="' + attr(C.imgUrl(u.image)) + '" alt="">' : '<div style="width:100%;height:100%;background:' + attr(u.color) + '"></div>') + "</div>", title: u.name, sub: (u.tier ? "เทียร์ " + u.tier : "ชุดพิเศษ") + " — " + (u.color || "") }), fresh: () => ({ color: "#86DDE4", garment: "jacket" }) },
    staff: { label: "โปรไฟล์ทีมงาน", add: "เพิ่มทีมงาน", ordered: 1, fields: () => [F("name", "ชื่อ", "text", { req: 1 }), F("role", "ตำแหน่ง", "text", { ph: "เช่น Vocal Mentor" }), F("team", "ทีม (ใช้จัดกลุ่มบนหน้าเว็บ)", "text", { ph: "เช่น ทีมเมนเทอร์" }), F("contact", "ช่องทางติดต่อ", "text", { ph: "@ชื่อ" }), F("bio", "หน้าที่ / แนะนำตัว", "textarea", { rows: 3 }), F("quote", "คำพูดประจำตัว"), F("avatar", "รูปโปรไฟล์ (สี่เหลี่ยมจัตุรัส)", "image")], row: s => ({ th: '<div class="th round">' + C.portrait({ id: s.id, name: s.name, side: "G", photo: s.avatar }) + "</div>", title: s.name, sub: [s.role, s.team].filter(Boolean).join(" — ") }), fresh: () => ({}) },
    tracks: { label: "เพลย์ลิสต์", add: "เพิ่มเพลง", ordered: 1, fields: () => [F("title", "ชื่อเพลง", "text", { req: 1 }), F("artist", "ศิลปิน", "text"), F("winner", "อยู่ในเพลย์ลิสต์ของ", "select", { opt: "winner" }), F("youtube", "ลิงก์ YouTube (ถ้ามี)"), F("audio", "ไฟล์เสียง (.mp3)", "audio", { help: "แนะนำ: อัปโหลดไฟล์ไว้ใน Google Drive ตั้งค่าแชร์ 'ทุกคนที่มีลิงก์' แล้ววางลิงก์ที่นี่" }), F("cover", "ปกเพลง (สี่เหลี่ยมจัตุรัส)", "image"), F("note", "หมายเหตุใต้ชื่อเพลง", "text", { full: 1 })], row: t => ({ th: '<div class="th">' + (C.imgUrl(t.cover) ? '<img src="' + attr(C.imgUrl(t.cover)) + '" alt="">' : '<div class="art"><b>♪</b></div>') + "</div>", title: t.title, sub: (t.artist || "") + (t.audio ? " — มีไฟล์เสียง" : t.youtube ? " — YouTube" : " — ยังไม่มีไฟล์") }), fresh: () => ({}) },
    history: { label: "ประวัติโปรเจกต์", add: "เพิ่มเหตุการณ์", ordered: 1, fields: () => [F("date", "ช่วงเวลา", "text", { req: 1, ph: "เช่น มิ.ย. 2569" }), F("title", "หัวข้อ", "text", { req: 1 }), F("body", "รายละเอียด", "textarea"), F("image", "รูปประกอบ", "image")], row: h => ({ th: '<div class="th sw" style="background:#86DDE4;font-size:12px;font-style:normal">' + esc(String(h.date).slice(-4)) + "</div>", title: h.title, sub: h.date }), fresh: () => ({}) }
  };
  const SET_ARRAYS = {
    winners: { label: "ศิลปินผู้ชนะ", add: "เพิ่มศิลปิน", fields: () => [F("name", "ชื่อวง / ศิลปิน", "text", { req: 1 }), F("side", "ฝั่ง", "select", { opt: "side3" }), F("season", "ซีซัน", "text", { ph: "เช่น SEASON 1 — 2569" }), F("tagline", "คำโปรย", "text", { full: 1 }), F("members", "สมาชิก (คั่นด้วยจุลภาค)", "csv", { full: 1 }), F("cover", "ภาพปกศิลปิน", "image")], row: w => ({ th: '<div class="th"><div class="art" style="--a:#F9CCCB;--c:#C43556"><b>' + esc(w.name.slice(0, 2)) + "</b></div></div>", title: w.name, sub: (w.season || "") + " — " + (w.members || []).length + " คน" }) },
    tiers: { label: "นิยามเทียร์", add: "เพิ่มเทียร์", keyed: 1, fields: () => [F("label", "ชื่อเทียร์", "text", { req: 1, ph: "เช่น S" }), F("color", "สี", "color"), F("desc", "คำอธิบาย", "text", { full: 1 })], row: t => ({ th: '<div class="th sw" style="background:' + attr(t.color) + '">' + esc(t.label) + "</div>", title: "เทียร์ " + t.label, sub: t.desc }) },
    categories: { label: "ประเภทกิจกรรม", add: "เพิ่มประเภท", keyed: 1, fields: () => [F("label", "ชื่อประเภท", "text", { req: 1 }), F("color", "สี", "color")], row: c => ({ th: '<div class="th sw" style="background:' + attr(c.color) + '"></div>', title: c.label, sub: c.color }) }
  };

  /* ---------- generic list (collection or settings array) ---------- */
  const listState = {};
  function listHtml(key, sc, items, opts = {}) {
    const st = listState[key] = listState[key] || { q: "", side: "" };
    let list = items.slice(); if (sc.sort) list.sort(sc.sort); else if (sc.ordered) list.sort(byOrder);
    const q = st.q.toLowerCase();
    if (q) list = list.filter(it => (sc.search ? sc.search(it) : JSON.stringify(it)).toLowerCase().includes(q));
    if (key === "trainees" && st.side) list = list.filter(t => t.side === st.side);
    const canMove = (sc.ordered || opts.settingsArr) && !q;
    return '<div class="a-card"><div class="a-head"><div><h3>' + esc(sc.label) + '</h3><span class="muted" style="font-size:13.5px">' + items.length + ' รายการ</span></div><div class="toolbar">' +
      (key === "trainees" ? '<div class="seg" data-side-filter><button type="button" data-s=""' + (st.side === "" ? ' class="on"' : "") + '>ทั้งหมด</button><button type="button" data-s="B"' + (st.side === "B" ? ' class="on"' : "") + '>B</button><button type="button" data-s="G"' + (st.side === "G" ? ' class="on g"' : ' class="g"') + ">G</button></div>" : "") +
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
      if (b.closest("[data-side-filter]")) { listState[key].side = b.dataset.s; render(); return; }
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
        if (name === "trainees" && !it.id) { let base = it.side + String(it.no).padStart(2, "0"), id = base, k = 2; while (D.trainees.some(t => t.id === id)) id = base + "-" + k++; it.id = id; it.ranks = it.ranks || {}; }
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
      const noPhoto = D.trainees.filter(t => !t.photo).length; const cr = rounds().find(r => r.id === D.settings.currentRound);
      return '<div class="kpis"><div class="kpi"><b>' + act + "</b><span>เด็กฝึกที่ยังแข่งขัน (จาก " + D.trainees.length + ')</span></div><div class="kpi"><b>' + (D.fanCount || D.fans.length) + '</b><span>บัญชีแฟนคลับ</span></div><div class="kpi"><b>' + (D.votesToday || 0) + '</b><span>โหวตวันนี้</span></div><div class="kpi"><b>' + ((D.tally && D.tally.total) || 0) + "</b><span>โหวตรอบ " + esc(v.round || "-") + "</span></div></div>" +
        '<div class="grid2"><div class="a-card"><h3>ควบคุมด่วน</h3><p class="desc">เปลี่ยนสถานะสำคัญได้ทันที ทุกการเปลี่ยนแปลงจะขึ้นบนเว็บภายใน 1 นาที</p>' +
        '<label class="switch"><input type="checkbox" id="qVote"' + (v.open ? " checked" : "") + "> เปิดรับโหวต</label><br>" +
        '<label class="switch"><input type="checkbox" id="qAnn"' + (D.settings.announcement && D.settings.announcement.on ? " checked" : "") + '> แสดงประกาศ popup หน้าแรก</label>' +
        '<div class="field" style="margin-top:10px"><label for="qRound">รอบปัจจุบัน (แสดงบนหน้าแรก)</label><select class="input" id="qRound">' + OPT.round().map(o => '<option value="' + attr(o[0]) + '"' + (o[0] === D.settings.currentRound ? " selected" : "") + ">" + esc(o[1]) + "</option>").join("") + "</select></div>" +
        '<div class="toolbar"><a class="btn btn-ghost btn-sm" href="home.html" target="_blank" rel="noopener">เปิดหน้าเว็บ</a><button class="btn btn-ghost btn-sm" type="button" data-go="ranking">อัปเดตอันดับ</button><button class="btn btn-ghost btn-sm" type="button" data-go="banners">จัดการแบนเนอร์</button></div></div>' +
        '<div class="a-card"><h3>กิจกรรมที่กำลังจะถึง</h3><p class="desc">จากปฏิทิน 2570</p><div class="rows">' + (soon.map(e => { const r = SCHEMA.events.row(e); return '<div class="row">' + r.th + '<div class="tx"><strong>' + esc(r.title) + "</strong><small>" + esc(r.sub) + "</small></div><div></div></div>"; }).join("") || '<div class="empty">ไม่มีกิจกรรมที่กำลังจะถึง</div>') + "</div></div></div>" +
        '<div class="grid2" style="margin-top:16px"><div class="a-card"><h3>สิ่งที่ควรตรวจ</h3><ul class="notes" style="margin-top:12px">' +
        "<li>รอบปัจจุบัน: " + esc(cr ? cr.code + " " + cr.title : "ยังไม่ได้ตั้ง") + "</li><li>เด็กฝึกที่ยังไม่มีรูป: " + noPhoto + " คน</li><li>แบนเนอร์ที่แสดงอยู่: " + D.banners.filter(b => b.active !== false).length + " ชิ้น</li><li>บัญชีแฟนคลับที่ถูกระงับ: " + D.fans.filter(f => f.banned).length + " บัญชี</li></ul></div>" +
        '<div class="a-card"><h3>กิจกรรมล่าสุดของทีมงาน</h3><ul class="log" style="margin-top:8px">' + (D.log || []).slice(0, 8).map(l => "<li><time>" + esc(fmtTs(l.ts)) + "</time><span><b>" + esc(l.user) + "</b> " + esc(logText(l)) + "</span></li>").join("") + "</ul></div></div>";
    },
    bind: root => {
      $("#qVote", root).addEventListener("change", async e => { try { await saveSettings({ vote: Object.assign({}, D.settings.vote, { open: e.target.checked }) }); C.toast(e.target.checked ? "เปิดโหวตแล้ว" : "ปิดโหวตแล้ว"); } catch (x) { C.toast(x.message, true); e.target.checked = !e.target.checked; } });
      $("#qAnn", root).addEventListener("change", async e => { try { await saveSettings({ announcement: Object.assign({}, D.settings.announcement, { on: e.target.checked, version: C.uid("a") }) }); C.toast("บันทึกแล้ว"); } catch (x) { C.toast(x.message, true); } });
      $("#qRound", root).addEventListener("change", async e => { try { await saveSettings({ currentRound: e.target.value }); C.toast("ตั้งรอบปัจจุบันแล้ว"); } catch (x) { C.toast(x.message, true); } });
      root.addEventListener("click", e => { const g = e.target.closest("[data-go]"); if (g) go(g.dataset.go); });
    }
  };
  const LOGW = { login: "เข้าสู่ระบบ", add: "เพิ่ม", edit: "แก้ไข", delete: "ลบ", reorder: "จัดลำดับ", update: "อัปเดต", settings: "แก้ตั้งค่า", ban: "ระงับแฟนคลับ", unban: "ยกเลิกระงับ", account: "จัดการบัญชี", password: "เปลี่ยนรหัสผ่าน", votesReset: "รีเซ็ตโหวต", save: "บันทึก", upload: "อัปโหลดไฟล์" };
  const logText = l => (LOGW[l.action] || l.action) + (l.detail ? " " + l.detail : "");

  /* ranking editor */
  const RK = { round: null, side: "B", list: null, out: null, dirty: false };
  function rkLoad() {
    const rid = RK.round; const all = D.trainees.filter(t => t.side === RK.side);
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
      const cut = Number((D.settings.cutoffs || {})[RK.round] || 0);
      const T = id => D.trainees.find(t => t.id === id);
      const rows = RK.list.map((id, i) => { const t = T(id); if (!t) return ""; return '<div class="row" draggable="true" data-id="' + attr(id) + '"><span class="handle" aria-hidden="true">⋮⋮</span><span class="num">' + (i + 1) + '</span><div class="th round">' + C.portrait(t) + '</div><div class="tx"><strong>' + esc(t.name) + "</strong><small>" + esc((t.stageName || "") + " — " + (C.STATUS[t.status] || "")) + (D.tally && D.tally.totals[id] ? " — " + D.tally.totals[id] + " โหวต" : "") + '</small></div><div class="acts"><button class="ib" type="button" data-mv="-1" aria-label="เลื่อนขึ้น"' + (i ? "" : " disabled") + '>↑</button><button class="ib" type="button" data-mv="1" aria-label="เลื่อนลง"' + (i < RK.list.length - 1 ? "" : " disabled") + '>↓</button><button class="ib danger" type="button" data-ex aria-label="ไม่จัดอันดับในรอบนี้" title="ไม่จัดอันดับในรอบนี้">×</button></div></div>' + (cut && i + 1 === cut && i < RK.list.length - 1 ? '<div class="cut"><span>เส้นตัด อันดับ ' + cut + "</span></div>" : ""); }).join("");
      return '<div class="a-card"><div class="a-head"><div><h3>อัปเดตอันดับเด็กฝึก</h3><span class="muted" style="font-size:13.5px">ลากเพื่อเรียง หรือใช้ปุ่มลูกศร แล้วกด “บันทึกอันดับ”</span></div><div class="toolbar">' +
        '<select class="input mini-sel" id="rkRound" aria-label="รอบ">' + OPT.round().map(o => '<option value="' + attr(o[0]) + '"' + (o[0] === RK.round ? " selected" : "") + ">" + esc(o[1]) + "</option>").join("") + "</select>" +
        '<div class="seg" id="rkSide"><button type="button" data-s="B"' + (RK.side === "B" ? ' class="on"' : "") + '>B</button><button type="button" class="g' + (RK.side === "G" ? " on" : "") + '" data-s="G">G</button></div></div></div>' +
        '<div class="toolbar" style="margin-bottom:14px"><button class="btn btn-ghost btn-sm" type="button" id="rkVotes">เรียงตามผลโหวต</button><button class="btn btn-ghost btn-sm" type="button" id="rkPrev">เรียงตามรอบก่อน</button><button class="btn btn-ghost btn-sm" type="button" id="rkClear">ล้างอันดับรอบนี้</button>' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:14px;margin-left:auto">เส้นตัดอันดับ <input class="input mini-sel" id="rkCut" type="number" min="0" style="width:80px" value="' + (cut || "") + '" placeholder="ไม่มี"></label>' +
        '<button class="btn btn-rose" type="button" id="rkSave">' + (RK.dirty ? "บันทึกอันดับ •" : "บันทึกอันดับ") + "</button></div>" +
        '<div class="rows rk-edit" id="rkList">' + (rows || '<div class="empty">ไม่มีเด็กฝึกในฝั่งนี้</div>') + "</div>" +
        (RK.out.length ? '<h3 style="margin:22px 0 8px;font-size:15px">ไม่จัดอันดับในรอบนี้</h3><div class="rows">' + RK.out.map(id => { const t = T(id); return '<div class="row off"><div class="th round">' + C.portrait(t) + '</div><div class="tx"><strong>' + esc(t.name) + "</strong><small>" + esc(C.STATUS[t.status] || "") + '</small></div><div class="acts"><button class="ib" type="button" data-in="' + attr(id) + '" aria-label="เพิ่มเข้าอันดับ">+</button></div></div>'; }).join("") + "</div>" : "") + "</div>";
    },
    bind: root => {
      const mark = () => { RK.dirty = true; render(); };
      $("#rkRound", root).addEventListener("change", async e => { if (RK.dirty && !await confirmBox("ยังไม่ได้บันทึกอันดับที่แก้ไว้ เปลี่ยนรอบเลยหรือไม่?", "เปลี่ยนรอบ", false)) { e.target.value = RK.round; return; } RK.round = e.target.value; RK.list = null; render(); });
      $("#rkSide", root).addEventListener("click", async e => { const b = e.target.closest("[data-s]"); if (!b || b.dataset.s === RK.side) return; if (RK.dirty && !await confirmBox("ยังไม่ได้บันทึกอันดับที่แก้ไว้ เปลี่ยนฝั่งเลยหรือไม่?", "เปลี่ยนฝั่ง", false)) return; RK.side = b.dataset.s; RK.list = null; render(); });
      $("#rkVotes", root).addEventListener("click", () => { const tt = (D.tally && D.tally.totals) || {}; RK.list.sort((a, b) => (tt[b] || 0) - (tt[a] || 0)); mark(); });
      $("#rkPrev", root).addEventListener("click", () => { const rr = rounds(); const p = rr[rr.findIndex(r => r.id === RK.round) - 1]; if (!p) { C.toast("ไม่มีรอบก่อนหน้า"); return; } const T = id => D.trainees.find(t => t.id === id); RK.list.sort((a, b) => ((T(a).ranks || {})[p.id] || 999) - ((T(b).ranks || {})[p.id] || 999)); mark(); });
      $("#rkClear", root).addEventListener("click", async () => { if (!await confirmBox("ล้างอันดับของรอบนี้ (ฝั่ง " + RK.side + ") ทั้งหมด? อันดับจะหายจากหน้าเว็บ", "ล้างอันดับ")) return; try { const r = await call("patch", { collection: "trainees", note: "ranks " + RK.round, changes: D.trainees.filter(t => t.side === RK.side).map(t => { const rk = Object.assign({}, t.ranks); delete rk[RK.round]; return { id: t.id, fields: { ranks: rk } }; }) }); D.trainees = r.items; RK.list = null; C.toast("ล้างแล้ว"); render(); } catch (x) { C.toast(x.message, true); } });
      $("#rkSave", root).addEventListener("click", async () => {
        const changes = D.trainees.filter(t => t.side === RK.side).map(t => { const rk = Object.assign({}, t.ranks); const i = RK.list.indexOf(t.id); if (i >= 0) rk[RK.round] = i + 1; else delete rk[RK.round]; return { id: t.id, fields: { ranks: rk } }; });
        const cut = Number($("#rkCut", root).value) || 0;
        try { const r = await call("patch", { collection: "trainees", changes, note: "ranks " + RK.round + " " + RK.side }); D.trainees = r.items; if (cut !== Number((D.settings.cutoffs || {})[RK.round] || 0)) await saveSettings({ cutoffs: Object.assign({}, D.settings.cutoffs, { [RK.round]: cut }) }); RK.dirty = false; C.toast("บันทึกอันดับแล้ว"); render(); } catch (x) { C.toast(x.message, true); }
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

  /* tiers */
  const tierDefs = setArrView("tiers", "");
  VIEWS.tiers = {
    html: () => {
      const side = (listState.tierSide = listState.tierSide || "B");
      const list = D.trainees.filter(t => t.side === side).sort((a, b) => a.no - b.no);
      return '<div class="a-card"><div class="a-head"><div><h3>จัดเทียร์เด็กฝึก</h3><span class="muted" style="font-size:13.5px">เลือกเทียร์จากเมนูข้างชื่อ ระบบบันทึกทันที</span></div><div class="seg" id="tSide"><button type="button" data-s="B"' + (side === "B" ? ' class="on"' : "") + '>B-TRAINEES</button><button type="button" class="g' + (side === "G" ? " on" : "") + '" data-s="G">G-TRAINEES</button></div></div><div class="tier-edit">' +
        list.map(t => '<div class="row' + (t.status !== "active" ? " off" : "") + '"><div class="th round">' + C.portrait(t) + '</div><div class="tx"><strong>' + esc(t.stageName || t.name) + "</strong><small>" + esc(t.side + String(t.no).padStart(2, "0")) + '</small></div><select class="input mini-sel" data-tier="' + attr(t.id) + '" aria-label="เทียร์ของ ' + attr(t.name) + '">' + OPT.tier().map(o => '<option value="' + attr(o[0]) + '"' + ((t.tier || "") === o[0] ? " selected" : "") + ">" + esc(o[0] || "—") + "</option>").join("") + "</select></div>").join("") + "</div></div>" +
        '<div style="margin-top:16px">' + tierDefs.html() + "</div>";
    },
    bind: root => {
      $("#tSide", root).addEventListener("click", e => { const b = e.target.closest("[data-s]"); if (b) { listState.tierSide = b.dataset.s; render(); } });
      root.addEventListener("change", async e => { const s = e.target.closest("[data-tier]"); if (!s) return; try { const r = await call("patch", { collection: "trainees", changes: [{ id: s.dataset.tier, fields: { tier: s.value } }], note: "tier" }); D.trainees = r.items; C.toast("อัปเดตเทียร์แล้ว"); } catch (x) { C.toast(x.message, true); } });
      tierDefs.bind(root);
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
    vote: [F("vote.open", "เปิดรับโหวต", "bool", { full: 1 }), F("vote.round", "นับคะแนนเข้ารอบ", "select", { opt: "round" }), F("vote.showResults", "แสดงผลโหวตสด (เปอร์เซ็นต์) บนหน้าเว็บ", "bool"), F("vote.title", "หัวข้อหน้าโหวต", "text", { full: 1 }), F("vote.note", "ข้อความใต้หัวข้อ", "text", { full: 1 })]
  };
  VIEWS.settings = {
    html: () => settingsCard("site", "ข้อมูลเว็บไซต์", "ชื่อ ซีซัน และคำโปรยที่แสดงทั่วเว็บ", SETF.site) + settingsCard("socials", "ช่องทางติดตาม", "ไอคอนมุมซ้ายบนและท้ายเว็บ เว้นว่างเพื่อซ่อน", SETF.socials) + settingsCard("ann", "ประกาศ popup หน้าแรก", "แก้หัวข้อหรือข้อความแล้ว ประกาศจะเด้งให้ทุกคนเห็นใหม่อีกครั้ง", SETF.ann),
    bind: root => bindSettingsCards(root, SETF)
  };

  VIEWS.vote = {
    html: () => {
      const ty = D.tally || { totals: {}, total: 0 }; const r = rounds().find(x => x.id === (D.settings.vote || {}).round);
      const col = side => { const list = D.trainees.filter(t => t.side === side).map(t => ({ t, n: ty.totals[t.id] || 0 })).sort((a, b) => b.n - a.n); const sum = list.reduce((a, x) => a + x.n, 0) || 1;
        return '<div class="a-card"><h3>' + side + '-TRAINEES</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>เด็กฝึก</th><th class="num">โหวต</th><th class="num">%</th></tr></thead><tbody>' + list.map((x, i) => '<tr class="' + (x.t.status !== "active" ? "off" : "") + '"><td>' + (i + 1) + "</td><td>" + esc(x.t.stageName || x.t.name) + '</td><td class="num">' + x.n + '</td><td class="num">' + (x.n / sum * 100).toFixed(1) + "</td></tr>").join("") + "</tbody></table></div></div>"; };
      return '<div class="kpis"><div class="kpi"><b>' + (D.votesToday || 0) + '</b><span>โหวตวันนี้</span></div><div class="kpi"><b>' + ty.total + "</b><span>รวมรอบ " + esc(r ? r.code : ty.round || "-") + '</span></div><div class="kpi"><b>' + (D.fanCount || D.fans.length) + '</b><span>บัญชีแฟนคลับ</span></div><div class="kpi"><b>' + ((D.settings.vote || {}).open ? "เปิด" : "ปิด") + "</b><span>สถานะโหวต</span></div></div>" +
        settingsCard("vote", "ตั้งค่าการโหวต", "แฟนคลับโหวตได้วันละ 1 ครั้งต่อบัญชี ตัดรอบ 00:00 น. เวลาไทย เปลี่ยน “นับคะแนนเข้ารอบ” เมื่อเริ่มรอบใหม่ คะแนนจะเริ่มนับใหม่โดยไม่ลบของเดิม", SETF.vote) +
        '<div class="grid2" style="margin-top:16px">' + col("B") + col("G") + "</div>" +
        (isAdmin() ? '<div class="a-card" style="margin-top:16px;border-color:rgba(196,53,86,.4)"><h3>รีเซ็ตคะแนนโหวต</h3><p class="desc">ลบคะแนนทั้งหมดของรอบที่เลือก ใช้เมื่อต้องการเริ่มนับใหม่จริง ๆ เท่านั้น (เฉพาะแอดมิน)</p><div class="toolbar"><select class="input mini-sel" id="rsRound">' + OPT.round().map(o => '<option value="' + attr(o[0]) + '">' + esc(o[1]) + "</option>").join("") + '</select><button class="btn btn-rose btn-sm" type="button" id="rsGo">รีเซ็ตคะแนนรอบนี้</button></div></div>' : "");
    },
    bind: root => {
      bindSettingsCards(root, SETF);
      const b = $("#rsGo", root); if (b) b.addEventListener("click", async () => { const rid = $("#rsRound", root).value; if (!await confirmBox("ลบคะแนนโหวตทั้งหมดของรอบ " + rid + " การกระทำนี้ย้อนกลับไม่ได้", "รีเซ็ตคะแนน", true, "RESET")) return; try { const r = await call("votesReset", { round: rid }); C.toast("ลบแล้ว " + r.removed + " โหวต"); await reload(); } catch (x) { C.toast(x.message, true); } });
    }
  };

  VIEWS.fans = {
    html: () => {
      const q = (listState.fq || "").toLowerCase(); const list = D.fans.filter(f => !q || (f.username + " " + f.displayName).toLowerCase().includes(q)).sort((a, b) => String(b.createdAt).localeCompare(a.createdAt));
      return '<div class="a-card"><div class="a-head"><div><h3>สมาชิกแฟนคลับ</h3><span class="muted" style="font-size:13.5px">' + (D.fanCount || D.fans.length) + ' บัญชี — ระงับบัญชีที่ผิดกฎเพื่อปิดสิทธิ์โหวต</span></div><label class="search"><span class="sr">ค้นหา</span><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input class="input" id="fq" value="' + attr(listState.fq || "") + '" placeholder="ค้นหาชื่อผู้ใช้"></label></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>ชื่อที่แสดง</th><th>ชื่อผู้ใช้</th><th>สมัครเมื่อ</th><th class="num">โหวตทั้งหมด</th><th>โหวตล่าสุด</th><th>สถานะ</th><th></th></tr></thead><tbody>' +
        list.slice(0, 300).map(f => '<tr class="' + (f.banned ? "off" : "") + '"><td>' + esc(f.displayName) + "</td><td>@" + esc(f.username) + "</td><td>" + esc(fmtTs(f.createdAt)) + '</td><td class="num">' + f.votes + "</td><td>" + esc(f.lastVote ? C.fmtDate(f.lastVote) : "—") + "</td><td>" + (f.banned ? '<span class="badge no">ระงับ</span>' : '<span class="badge ok">ปกติ</span>') + '</td><td><button class="btn btn-ghost btn-sm" type="button" data-ban="' + attr(f.id) + '" data-v="' + (f.banned ? 0 : 1) + '">' + (f.banned ? "ยกเลิกระงับ" : "ระงับ") + "</button></td></tr>").join("") + "</tbody></table></div>" + (list.length > 300 ? '<p class="muted">แสดง 300 รายการแรก ใช้ช่องค้นหาเพื่อหาบัญชีอื่น</p>' : "") + (list.length ? "" : '<div class="empty">ไม่พบบัญชี</div>') + "</div>";
    },
    bind: root => {
      $("#fq", root).addEventListener("input", e => { listState.fq = e.target.value; const p = e.target.selectionStart; render(); const n = $("#fq"); n.focus(); n.setSelectionRange(p, p); });
      root.addEventListener("click", async e => { const b = e.target.closest("[data-ban]"); if (!b) return; const ban = b.dataset.v === "1"; if (ban && !await confirmBox("ระงับบัญชีนี้? เจ้าของบัญชีจะเข้าสู่ระบบและโหวตไม่ได้", "ระงับบัญชี")) return; try { await call("fanBan", { id: b.dataset.ban, banned: ban }); D.fans.find(f => f.id === b.dataset.ban).banned = ban; C.toast(ban ? "ระงับแล้ว" : "ยกเลิกระงับแล้ว"); render(); } catch (x) { C.toast(x.message, true); } });
    }
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
    ["การแข่งขัน", [["ranking", "อันดับเด็กฝึก"], ["tiers", "เทียร์ลิสต์"], ["trainees", "เด็กฝึก", () => D.trainees.length], ["rounds", "กติกาแต่ละรอบ", () => D.rounds.length], ["vote", "ระบบโหวต"]]],
    ["หน้าเว็บ", [["banners", "แบนเนอร์", () => D.banners.length], ["news", "ข่าวสาร", () => D.news.length], ["events", "ปฏิทิน 2570", () => D.events.length], ["rules", "กฎของคอมมู"], ["uniforms", "ชุดเด็กฝึก"], ["staff", "โปรไฟล์ทีมงาน"], ["playlist", "ศิลปินผู้ชนะ & เพลง"], ["history", "ประวัติโปรเจกต์"], ["settings", "ตั้งค่าเว็บไซต์"]]],
    ["สมาชิก", [["fans", "แฟนคลับ", () => D.fanCount || D.fans.length], ["accounts", "บัญชีทีมงาน", null, 1], ["log", "บันทึกการทำงาน"]]]
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
    fresh.innerHTML = VIEWS[view].html(); VIEWS[view].bind(fresh);
    window.scrollTo(0, y);
  }
  async function reload(keep) { D = await call("admin"); if (!keep) RK.list = null; render(); }

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
