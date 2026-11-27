/* ============================================================
   THE CELESTIAL : PROJECT — core (data, sessions, shared UI)
   ============================================================ */
(function () {
  "use strict";
  const CFG = window.CELESTIAL_CONFIG || {};
  const LIVE = !!(CFG.API_URL && /^https:\/\//.test(CFG.API_URL));

  /* ---------- tiny helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const attr = esc;
  const uid = (p = "") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const qs = k => new URLSearchParams(location.search).get(k);
  const byOrder = (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0);

  const TH_M = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const TH_MS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const TH_D = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  function parseISO(s) { if (!s) return null; const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function fmtDate(s, long) {
    const d = parseISO(s); if (!d) return s || "";
    return d.getDate() + " " + (long ? TH_M : TH_MS)[d.getMonth()] + " " + (d.getFullYear() + 543);
  }
  function fmtRange(a, b) {
    if (!b || a === b) return fmtDate(a);
    const x = parseISO(a), y = parseISO(b); if (!x || !y) return fmtDate(a) + " – " + fmtDate(b);
    if (x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth()) return x.getDate() + "–" + y.getDate() + " " + TH_MS[x.getMonth()] + " " + (x.getFullYear() + 543);
    return fmtDate(a) + " – " + fmtDate(b);
  }
  // วันที่ปัจจุบันตามเวลาไทย (ใช้ตัดรอบโหวตรายวัน)
  function bkkToday() {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { const d = new Date(Date.now() + 7 * 3600e3); return d.toISOString().slice(0, 10); }
  }
  function msToBkkMidnight() {
    const now = Date.now(); const bk = new Date(now + 7 * 3600e3);
    const next = Date.UTC(bk.getUTCFullYear(), bk.getUTCMonth(), bk.getUTCDate() + 1) - 7 * 3600e3;
    return next - now;
  }

  /* ---------- storage (never throws) ---------- */
  const Store = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };

  /* ---------- hashing ---------- */
  async function sha256(str) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    } catch (e) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return "x" + (h >>> 0).toString(16); }
  }

  /* ============================================================
     DEMO SERVER — mirrors backend/Code.gs actions, stored locally
     ============================================================ */
  const DB_KEY = "celestial_demo_db_v2"; // v2: ข้อมูลตัวอย่างเฉพาะเด็กฝึกชาย
  Store.del("celestial_demo_db_v1");
  const COLLECTIONS = ["trainees", "staff", "banners", "news", "events", "rounds", "rules", "uniforms", "tracks", "history"];
  const Demo = {
    db: null,
    load() {
      if (this.db) return this.db;
      let db = Store.get(DB_KEY);
      if (!db || !db.settings) {
        db = JSON.parse(JSON.stringify(window.CELESTIAL_SEED || {}));
        db.fans = db.fans || []; db.votes = db.votes || []; db.sessions = {}; db.log = db.log || [];
      }
      this.db = db; return db;
    },
    persist() { if (!Store.set(DB_KEY, this.db)) throw new Error("พื้นที่เก็บข้อมูลในเบราว์เซอร์เต็ม ลองใช้ลิงก์รูปแทนการอัปโหลด"); },
    reset() { Store.del(DB_KEY); this.db = null; return this.load(); },
    async hash(pw, salt) { return sha256(salt + "::" + pw + "::celestial"); },
    session(token, kind) {
      const s = this.load().sessions[token];
      if (!s || s.kind !== kind || s.exp < Date.now()) throw new Error(kind === "staff" ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" : "กรุณาเข้าสู่ระบบก่อนโหวต");
      return s;
    },
    newToken(kind, id, hours) {
      const t = uid("t") + uid(); this.load().sessions[t] = { kind, id, exp: Date.now() + hours * 3600e3 }; return t;
    },
    tally(db) {
      const round = db.settings.vote && db.settings.vote.round;
      const totals = {}; let total = 0;
      db.votes.forEach(v => { if (v.round === round) { totals[v.traineeId] = (totals[v.traineeId] || 0) + 1; total++; } });
      return { round, totals, total };
    },
    publicData() {
      const db = this.load(); const out = { settings: db.settings };
      COLLECTIONS.forEach(c => out[c] = db[c] || []);
      out.tally = db.settings.vote && db.settings.vote.showResults ? this.tally(db) : null;
      out.mode = "demo"; return JSON.parse(JSON.stringify(out));
    },
    staffUser(token) {
      const s = this.session(token, "staff");
      const a = this.load().accounts.find(x => x.username === s.id && x.active !== false);
      if (!a) throw new Error("บัญชีนี้ถูกปิดใช้งาน"); return a;
    },
    coll(name) { if (!COLLECTIONS.includes(name)) throw new Error("ไม่รู้จักชุดข้อมูล " + name); const db = this.load(); db[name] = db[name] || []; return db[name]; },
    log(user, action, detail) { const db = this.load(); db.log.unshift({ ts: new Date().toISOString(), user: user.username, action, detail: detail || "" }); db.log = db.log.slice(0, 300); },
    actions: {
      async public() { return Demo.publicData(); },
      async fanRegister(p) {
        const db = Demo.load(); const u = String(p.username || "").trim().toLowerCase();
        if (!/^[a-z0-9_.]{3,20}$/.test(u)) throw new Error("ชื่อผู้ใช้ต้องเป็น a-z, 0-9, _ หรือ . ยาว 3–20 ตัว");
        if (String(p.password || "").length < 6) throw new Error("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");
        const name = String(p.displayName || "").trim().slice(0, 40);
        if (!name) throw new Error("กรุณาใส่ชื่อที่แสดง");
        if (db.fans.some(f => f.username === u)) throw new Error("ชื่อผู้ใช้นี้มีคนใช้แล้ว");
        const salt = uid(); const fan = { id: uid("f"), username: u, displayName: name, salt, hash: await Demo.hash(p.password, salt), createdAt: new Date().toISOString(), banned: false, lastVote: "" };
        db.fans.push(fan); const token = Demo.newToken("fan", fan.id, 24 * 30); Demo.persist();
        return { token, user: { id: fan.id, username: u, displayName: name } };
      },
      async fanLogin(p) {
        const db = Demo.load(); const u = String(p.username || "").trim().toLowerCase();
        const fan = db.fans.find(f => f.username === u);
        if (!fan || fan.hash !== await Demo.hash(p.password || "", fan.salt)) throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        if (fan.banned) throw new Error("บัญชีนี้ถูกระงับโดยทีมงาน");
        const token = Demo.newToken("fan", fan.id, 24 * 30); Demo.persist();
        return { token, user: { id: fan.id, username: fan.username, displayName: fan.displayName } };
      },
      async fanMe(p) {
        const s = Demo.session(p.token, "fan"); const db = Demo.load();
        const fan = db.fans.find(f => f.id === s.id); if (!fan) throw new Error("ไม่พบบัญชี");
        const today = bkkToday(); const v = db.votes.find(x => x.fanId === fan.id && x.date === today);
        return { user: { id: fan.id, username: fan.username, displayName: fan.displayName, banned: fan.banned }, today, voted: v ? { traineeId: v.traineeId, ts: v.ts } : null };
      },
      async vote(p) {
        const s = Demo.session(p.token, "fan"); const db = Demo.load();
        const fan = db.fans.find(f => f.id === s.id); if (!fan) throw new Error("ไม่พบบัญชี");
        if (fan.banned) throw new Error("บัญชีนี้ถูกระงับสิทธิ์โหวต");
        const vs = db.settings.vote || {};
        if (!vs.open) throw new Error("ขณะนี้ปิดโหวตแล้ว");
        const t = db.trainees.find(x => x.id === p.traineeId);
        if (!t || t.status !== "active") throw new Error("ไม่สามารถโหวตให้เด็กฝึกคนนี้ได้");
        const today = bkkToday();
        if (fan.lastVote === today || db.votes.some(x => x.fanId === fan.id && x.date === today)) throw new Error("วันนี้คุณโหวตไปแล้ว กลับมาโหวตใหม่ได้หลังเที่ยงคืน (เวลาไทย)");
        db.votes.push({ date: today, ts: new Date().toISOString(), fanId: fan.id, traineeId: t.id, round: vs.round || "" });
        fan.lastVote = today; Demo.persist();
        return { ok: true, today, traineeId: t.id };
      },
      async staffLogin(p) {
        const db = Demo.load(); const u = String(p.username || "").trim().toLowerCase();
        const a = db.accounts.find(x => x.username === u);
        if (!a || a.active === false || a.hash !== await Demo.hash(p.password || "", a.salt)) throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        a.lastLogin = new Date().toISOString(); const token = Demo.newToken("staff", a.username, 12);
        Demo.log(a, "login"); Demo.persist();
        return { token, user: { username: a.username, name: a.name, role: a.role } };
      },
      async admin(p) {
        const me = Demo.staffUser(p.token); const db = Demo.load();
        const out = Demo.publicData(); out.tally = Demo.tally(db);
        const today = bkkToday();
        out.votesToday = db.votes.filter(v => v.date === today).length;
        out.fans = db.fans.map(f => ({ id: f.id, username: f.username, displayName: f.displayName, createdAt: f.createdAt, banned: !!f.banned, lastVote: f.lastVote, votes: db.votes.filter(v => v.fanId === f.id).length }));
        out.accounts = db.accounts.map(a => ({ username: a.username, name: a.name, role: a.role, active: a.active !== false, lastLogin: a.lastLogin || "" }));
        out.log = db.log.slice(0, 120); out.me = { username: me.username, name: me.name, role: me.role };
        return out;
      },
      async save(p) {
        const me = Demo.staffUser(p.token); if (!COLLECTIONS.includes(p.collection)) throw new Error("ไม่รู้จักชุดข้อมูล " + p.collection);
        if (!Array.isArray(p.items)) throw new Error("ข้อมูลไม่ถูกต้อง");
        Demo.load()[p.collection] = p.items; Demo.log(me, "save", p.collection + " (" + p.items.length + ")"); Demo.persist(); return { ok: true };
      },
      async saveSettings(p) {
        const me = Demo.staffUser(p.token); const db = Demo.load();
        db.settings = Object.assign({}, db.settings, p.patch || {}); Demo.log(me, "settings", Object.keys(p.patch || {}).join(", ")); Demo.persist(); return { settings: db.settings };
      },
      async upsert(p) {
        const me = Demo.staffUser(p.token); const c = Demo.coll(p.collection); const it = Object.assign({}, p.item || {});
        if (!it.id) it.id = uid(p.collection.slice(0, 2));
        if (p.collection === "trainees" && !it.side) it.side = "B";
        const i = c.findIndex(x => x.id === it.id);
        if (i >= 0) c[i] = it; else { if (it.order == null || it.order === "") it.order = c.reduce((m, x) => Math.max(m, Number(x.order) || 0), 0) + 1; c.push(it); }
        Demo.log(me, i >= 0 ? "edit" : "add", p.collection + ": " + (it.title || it.name || it.id)); Demo.persist(); return { items: c, id: it.id };
      },
      async remove(p) {
        const me = Demo.staffUser(p.token); const db = Demo.load(); Demo.coll(p.collection);
        const it = db[p.collection].find(x => x.id === p.id); db[p.collection] = db[p.collection].filter(x => x.id !== p.id);
        Demo.log(me, "delete", p.collection + ": " + (it ? (it.title || it.name || it.id) : p.id)); Demo.persist(); return { items: db[p.collection] };
      },
      async reorder(p) {
        const me = Demo.staffUser(p.token); const c = Demo.coll(p.collection);
        (p.ids || []).forEach((id, i) => { const it = c.find(x => x.id === id); if (it) it.order = i + 1; });
        Demo.log(me, "reorder", p.collection); Demo.persist(); return { items: c };
      },
      async patch(p) {
        const me = Demo.staffUser(p.token); const c = Demo.coll(p.collection);
        (p.changes || []).forEach(ch => { const it = c.find(x => x.id === ch.id); if (it) Object.assign(it, ch.fields || {}); });
        Demo.log(me, "update", p.collection + " (" + (p.changes || []).length + ")" + (p.note ? " " + p.note : "")); Demo.persist(); return { items: c };
      },
      async fanBan(p) {
        const me = Demo.staffUser(p.token); const f = Demo.load().fans.find(x => x.id === p.id); if (!f) throw new Error("ไม่พบสมาชิก");
        f.banned = !!p.banned; Demo.log(me, p.banned ? "ban" : "unban", f.username); Demo.persist(); return { ok: true };
      },
      async accountSave(p) {
        const me = Demo.staffUser(p.token); if (me.role !== "admin") throw new Error("เฉพาะแอดมินเท่านั้น");
        const db = Demo.load(); const x = p.account || {}; const u = String(x.username || "").trim().toLowerCase();
        if (!/^[a-z0-9_.]{3,20}$/.test(u)) throw new Error("ชื่อผู้ใช้ต้องเป็น a-z, 0-9, _ หรือ . ยาว 3–20 ตัว");
        let a = db.accounts.find(k => k.username === u);
        if (!a) { if (!x.password) throw new Error("บัญชีใหม่ต้องตั้งรหัสผ่าน"); a = { username: u, salt: uid() }; db.accounts.push(a); }
        if (u === me.username && x.active === false) throw new Error("ปิดบัญชีตัวเองไม่ได้");
        a.name = x.name || u; a.role = x.role === "admin" ? "admin" : "staff"; a.active = x.active !== false;
        if (x.password) { if (String(x.password).length < 8) throw new Error("รหัสผ่านสตาฟต้องยาวอย่างน้อย 8 ตัว"); a.salt = uid(); a.hash = await Demo.hash(x.password, a.salt); }
        Demo.log(me, "account", u); Demo.persist(); return { ok: true };
      },
      async changePassword(p) {
        const me = Demo.staffUser(p.token);
        if (me.hash !== await Demo.hash(p.oldPassword || "", me.salt)) throw new Error("รหัสผ่านเดิมไม่ถูกต้อง");
        if (String(p.newPassword || "").length < 8) throw new Error("รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัว");
        me.salt = uid(); me.hash = await Demo.hash(p.newPassword, me.salt); Demo.log(me, "password"); Demo.persist(); return { ok: true };
      },
      async votesReset(p) {
        const me = Demo.staffUser(p.token); if (me.role !== "admin") throw new Error("เฉพาะแอดมินเท่านั้น");
        const db = Demo.load(); const before = db.votes.length; db.votes = db.votes.filter(v => v.round !== p.round);
        const today = bkkToday(); db.fans.forEach(f => { if (f.lastVote === today && !db.votes.some(v => v.fanId === f.id && v.date === today)) f.lastVote = ""; });
        Demo.log(me, "votesReset", p.round + " (-" + (before - db.votes.length) + ")"); Demo.persist(); return { ok: true, removed: before - db.votes.length };
      },
      async upload(p) { Demo.staffUser(p.token); return { url: p.dataUrl }; }
    }
  };

  /* ============================================================
     API — same calls in live and demo mode
     ============================================================ */
  function ensureSeed() {
    if (window.CELESTIAL_SEED || Store.get(DB_KEY)) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = "js/demo-data.js";
      s.onload = res; s.onerror = () => rej(new Error("โหลดข้อมูลตัวอย่างไม่ได้")); document.head.appendChild(s);
    });
  }
  const API = {
    live: LIVE,
    async call(action, payload = {}) {
      if (!LIVE) {
        await ensureSeed();
        const fn = Demo.actions[action]; if (!fn) throw new Error("ไม่รู้จักคำสั่ง " + action);
        await new Promise(r => setTimeout(r, 120));
        return fn(payload);
      }
      let res;
      try {
        res = action === "public"
          ? await fetch(CFG.API_URL + "?action=public&t=" + Math.floor(Date.now() / 15000), { method: "GET" })
          : await fetch(CFG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ action }, payload)) });
      } catch (e) { throw new Error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง"); }
      let j; try { j = await res.json(); } catch (e) { throw new Error("เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (ตรวจสอบ API_URL ใน js/config.js)"); }
      if (!j || j.ok === false) throw new Error((j && j.error) || "เกิดข้อผิดพลาด");
      return j.data !== undefined ? j.data : j;
    },
    // GET ?action=…&… (ใช้กับคำสั่งที่ไม่ต้องล็อกอิน เช่น ดึงไฟล์เสียง)
    async get(action, params = {}) {
      if (!LIVE) throw new Error("ต้องตั้ง API_URL ใน js/config.js ก่อน");
      let res;
      try { res = await fetch(CFG.API_URL + "?" + new URLSearchParams(Object.assign({ action }, params)).toString(), { method: "GET" }); }
      catch (e) { throw new Error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง"); }
      let j; try { j = await res.json(); } catch (e) { throw new Error("เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (ตรวจสอบ API_URL ใน js/config.js)"); }
      if (!j || j.ok === false) throw new Error((j && j.error) || "เกิดข้อผิดพลาด");
      return j.data !== undefined ? j.data : j;
    },
    // render(data) is called with cached data first (if any), then again when fresh data differs
    async loadPublic(render) {
      const KEY = "celestial_pub_cache";
      const cached = LIVE ? Store.get(KEY) : null;
      let shown = null;
      const run = d => { applyChrome(d); render(d); };
      if (cached && cached.data) { shown = JSON.stringify(cached.data); safeRender(run, cached.data); }
      try {
        const fresh = await API.call("public");
        const s = JSON.stringify(fresh);
        if (LIVE) Store.set(KEY, { ts: Date.now(), data: fresh });
        if (s !== shown) safeRender(run, fresh);
        return fresh;
      } catch (e) {
        if (!cached) { showLoadError(e.message); }
        else toast("ใช้ข้อมูลล่าสุดที่บันทึกไว้ (" + e.message + ")", true);
      }
    },
    demo: Demo
  };
  function safeRender(fn, data) { try { fn(data); } catch (e) { console.error(e); } }

  /* settings-driven chrome: social links, rounds menu, footer text */
  const ICONS = {
    facebook: ["Facebook Page", '<path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z"/>'],
    group: ["Facebook Group", '<path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>'],
    youtube: ["YouTube", '<path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.87.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/>'],
    tiktok: ["TikTok", '<path d="M19.6 7.7a5.6 5.6 0 0 1-3.4-1.2v7.3a5.8 5.8 0 1 1-5-5.7v3a2.8 2.8 0 1 0 2 2.7V2h3a3.4 3.4 0 0 0 3.4 3.1z"/>'],
    discord: ["Discord", '<path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.4C.6 9.1-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2.1a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.7-3.6-13.7zM8.5 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm7 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"/>'],
    doc: ["เอกสารคอมมู", '<path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/>']
  };
  function socialsHtml(s) {
    const so = (s && s.socials) || {};
    return Object.keys(ICONS).filter(k => so[k]).map(k => '<a href="' + attr(so[k]) + '" target="_blank" rel="noopener" aria-label="' + attr(ICONS[k][0]) + '" title="' + attr(ICONS[k][0]) + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[k][1] + "</svg></a>").join("");
  }
  function applyChrome(d) {
    const s = d.settings || {};
    $$("[data-socials]").forEach(el => el.innerHTML = socialsHtml(s));
    $$("[data-tagline]").forEach(el => { if (s.tagline) el.textContent = s.tagline; });
    $$("[data-footnote]").forEach(el => { if (s.footerNote) el.textContent = s.footerNote; });
    const rounds = (d.rounds || []).slice().sort(byOrder);
    const cur = document.body.dataset.page === "rounds" ? (qs("r") || "") : "";
    $$("[data-rounds-menu]").forEach(el => {
      el.innerHTML = rounds.map(r => '<a href="rounds.html?r=' + encodeURIComponent(r.id) + '"' + (cur === r.id ? ' class="active"' : "") + ">【" + esc(r.title) + "】<small>" + esc(r.code) + "</small></a>").join("") + '<a href="rounds.html">ภาพรวมทุกรอบ<small>All</small></a>';
    });
    $$("[data-rounds-sheet]").forEach(el => {
      el.innerHTML = rounds.map(r => '<a class="s-link" style="padding-left:26px;font-size:15px" href="rounds.html?r=' + encodeURIComponent(r.id) + '">' + esc(r.title) + "<small>" + esc(r.code) + "</small></a>").join("");
    });
  }
  function showLoadError(msg) {
    const m = $("main"); if (!m) return;
    const box = document.createElement("div"); box.className = "wrap section";
    box.innerHTML = '<div class="empty">โหลดข้อมูลไม่สำเร็จ: ' + esc(msg) + '<br><br><button class="btn btn-ghost btn-sm" onclick="location.reload()">โหลดใหม่</button></div>';
    m.prepend(box);
  }

  /* ---------- fan session ---------- */
  const Fan = {
    KEY: "celestial_fan",
    get() { return Store.get(this.KEY); },
    set(s) { Store.set(this.KEY, s); },
    clear() { Store.del(this.KEY); }
  };

  /* ---------- toast & modal ---------- */
  let toastEl, toastT;
  function toast(msg, err) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.toggle("err", !!err);
    requestAnimationFrame(() => toastEl.classList.add("show"));
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), err ? 4200 : 2600);
  }
  let lastFocus = null;
  function modal(html, opts = {}) {
    closeModal();
    const m = document.createElement("div"); m.className = "modal"; m.id = "modal";
    m.innerHTML = '<div class="modal-box ' + (opts.size || "") + '" role="dialog" aria-modal="true"><button class="x-btn modal-close" aria-label="ปิด">×</button>' + html + "</div>";
    document.body.appendChild(m); lastFocus = document.activeElement;
    m.addEventListener("click", e => { if (e.target === m || e.target.closest(".modal-close")) closeModal(); });
    requestAnimationFrame(() => { m.classList.add("open"); const f = m.querySelector("[autofocus]") || m.querySelector(".modal-close"); f && f.focus(); });
    document.body.style.overflow = "hidden";
    if (opts.onClose) m._onClose = opts.onClose;
    return m;
  }
  function closeModal() {
    const m = $("#modal"); if (!m) return;
    m.remove(); document.body.style.overflow = "";
    if (m._onClose) m._onClose();
    lastFocus && lastFocus.focus && lastFocus.focus();
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); closeSheet(); } });

  /* ---------- trainee visuals ---------- */
  // สีพื้นรูปแทนตัว (กรณีไม่มีรูป): เด็กฝึกใช้โทน aqua ส่วนทีมงานสลับ aqua / rose ได้ด้วย pal: "rose"
  const PALETTES = {
    aqua: [["#197074", "#082D36"], ["#86DDE4", "#197074"], ["#2a8a90", "#0b3a44"], ["#197074", "#450A18"]],
    rose: [["#C43556", "#450A18"], ["#F9CCCB", "#C43556"], ["#7B182F", "#082D36"], ["#d9587a", "#7B182F"]]
  };
  // รหัสเด็กฝึกที่แสดงบนเว็บ เช่น B01 (THE CELESTIAL รับเฉพาะเด็กฝึกชาย)
  function code(t) { return (t.side || "B") + String(t.no || "").padStart(2, "0"); }
  function hashStr(s) { let h = 0; s = String(s); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function initials(t) {
    const n = String(t.stageName || t.name || "?").trim();
    const parts = n.split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? parts[0][0] + parts[1][0] : n.slice(0, 2)).toUpperCase();
  }
  function imgUrl(u) {
    u = String(u || "").trim(); if (!u) return "";
    const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/);
    return m ? "https://lh3.googleusercontent.com/d/" + m[1] + "=w1000" : u;
  }
  function audioUrl(u) {
    u = String(u || "").trim(); if (!u) return "";
    const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/);
    if (m) return "https://drive.google.com/uc?export=download&id=" + m[1];
    const d = u.match(/^(https:\/\/www\.dropbox\.com\/.*?)(\?dl=0)?$/); if (d && /dropbox/.test(u)) return u.replace("dl=0", "raw=1");
    return u;
  }
  /* ---------- ไฟล์เสียงจาก Google Drive ----------
     ตั้งแต่ปี 2024 Drive ไม่ยอมให้ <audio> ของเว็บอื่นเล่นลิงก์ Drive ตรง ๆ
     จึงขอไฟล์ผ่าน Apps Script (Code.gs → ?action=audio) เป็นชิ้น ๆ แล้วประกอบเป็นไฟล์ในเครื่องเพื่อเล่น */
  function driveId(u) {
    u = String(u || "");
    if (!/(?:drive|docs)\.google\.com|drive\.usercontent\.google\.com/.test(u)) return "";
    const m = u.match(/(?:\/file\/d\/|[?&]id=)([\w-]{20,})/); return m ? m[1] : "";
  }
  function b64bytes(s) { const bin = atob(s), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  const audioCache = new Map();
  // คืน URL ที่ <audio> เล่นได้: ลิงก์ Drive → blob: URL, ลิงก์อื่นใช้ตามเดิม
  function loadAudio(u) {
    const id = driveId(u); if (!id) return Promise.resolve(audioUrl(u));
    if (!LIVE) return Promise.reject(new Error("โหมดตัวอย่างเล่นไฟล์จาก Google Drive ไม่ได้ — ต้องเชื่อม Google Apps Script (API_URL) ก่อน"));
    if (audioCache.has(id)) return audioCache.get(id);
    const job = (async () => {
      const first = await API.get("audio", { id, part: 0 });
      if (!first || typeof first.data !== "string" || !first.parts) throw new Error("Code.gs บนเซิร์ฟเวอร์ยังเป็นเวอร์ชันเก่า — วาง Code.gs ใหม่แล้ว Deploy เป็น New version");
      const rest = []; for (let i = 1; i < first.parts; i++) rest.push(i);
      const got = {}; let k = 0;
      await Promise.all(Array.from({ length: Math.min(3, rest.length) }, async () => { while (k < rest.length) { const n = rest[k++]; got[n] = await API.get("audio", { id, part: n }); } }));
      const chunks = [first].concat(rest.map(n => got[n])).map(x => b64bytes(x.data));
      return URL.createObjectURL(new Blob(chunks, { type: first.mime || "audio/mpeg" }));
    })();
    audioCache.set(id, job); job.catch(() => audioCache.delete(id));
    return job;
  }
  function portrait(t, label) {
    const pairs = PALETTES[t.pal === "rose" ? "rose" : "aqua"]; const p = pairs[hashStr(t.id || t.name) % pairs.length];
    const art = '<div class="art" style="--a:' + p[0] + ";--c:" + p[1] + '"><b>' + esc(initials(t)) + "</b></div>";
    const src = imgUrl(t.photo || t.image || t.avatar);
    return src ? art + '<img src="' + attr(src) + '" alt="' + attr(label || t.name || "") + '" loading="lazy" onerror="this.remove()">' : art;
  }
  function tierOf(data, id) { return ((data.settings && data.settings.tiers) || []).find(x => x.id === id); }
  function tierBadge(data, t) {
    const ti = tierOf(data, t.tier); if (!ti) return "";
    return '<span class="tier" style="--tc:' + attr(ti.color) + '" title="Tier ' + attr(ti.label) + '">' + esc(ti.label) + "</span>";
  }
  const STATUS = { active: "กำลังแข่งขัน", eliminated: "ตกรอบ", debut: "เดบิวต์", withdrawn: "ถอนตัว" };
  function traineeCard(t, data, opts = {}) {
    const out = t.status === "eliminated" || t.status === "withdrawn";
    return '<button type="button" class="t-card' + (out ? " out" : "") + (t.status === "debut" ? " debut" : "") + '" data-id="' + attr(t.id) + '">' +
      '<div class="ph">' + portrait(t) + '<span class="t-no">' + esc(code(t)) + "</span>" + tierBadge(data, t) +
      '<span class="ribbon">' + esc(t.status === "withdrawn" ? "WITHDRAWN" : "ELIMINATED") + "</span>" +
      '<div class="t-name"><strong>' + esc(t.name) + "</strong>" + (t.stageName && t.stageName !== t.name ? "<span>" + esc(t.stageName) + "</span>" : "") + "</div></div>" +
      (opts.noMeta ? "" : '<div class="t-meta"><span class="chip">' + esc(t.nationality || "—") + '</span><span class="chip b">' + esc(t.position || "—") + "</span></div>") +
      "</button>";
  }
  // rounds that have ranking, in round order
  function rankedRounds(data) {
    return (data.rounds || []).slice().sort(byOrder).filter(r => (data.trainees || []).some(t => t.ranks && t.ranks[r.id]));
  }
  function rankIn(t, roundId) { return t.ranks && t.ranks[roundId] ? Number(t.ranks[roundId]) : null; }
  function latestRank(t, data) {
    const rr = rankedRounds(data); for (let i = rr.length - 1; i >= 0; i--) { const r = rankIn(t, rr[i].id); if (r) return { round: rr[i], rank: r, prev: i > 0 ? rankIn(t, rr[i - 1].id) : null }; }
    return null;
  }
  function sparkline(t, data) {
    const rr = rankedRounds(data); if (!rr.length) return "";
    const pts = rr.map(r => ({ r, v: rankIn(t, r.id) }));
    const max = Math.max(10, ...pts.map(p => p.v || 0)); const W = 420, H = 120, px = 28, top = 22, bot = 26;
    const x = i => rr.length === 1 ? W / 2 : px + i * (W - px * 2) / (rr.length - 1);
    const y = v => top + ((v - 1) / (max - 1)) * (H - top - bot);
    const valid = pts.map((p, i) => p.v ? [x(i), y(p.v)] : null).filter(Boolean);
    const line = valid.length > 1 ? '<polyline points="' + valid.map(p => p.join(",")).join(" ") + '" fill="none" stroke="#86DDE4" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' : "";
    const marks = pts.map((p, i) => '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="11" fill="rgba(245,234,234,.55)">' + esc(p.r.code || p.r.title) + "</text>" +
      (p.v ? '<circle cx="' + x(i) + '" cy="' + y(p.v) + '" r="4.5" fill="#04161B" stroke="#86DDE4" stroke-width="2"/><text x="' + x(i) + '" y="' + (y(p.v) - 10) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#F5EAEA">#' + p.v + "</text>" : "")).join("");
    return '<div class="spark"><h5>อันดับในแต่ละรอบ</h5><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="กราฟอันดับ">' + line + marks + "</svg></div>";
  }
  function openProfile(id, data) {
    const t = (data.trainees || []).find(x => x.id === id); if (!t) return;
    const ti = tierOf(data, t.tier); const lr = latestRank(t, data);
    const rows = [["รหัส", code(t)], ["สัญชาติ", t.nationality], ["ตำแหน่ง", t.position], ["วันเกิด", t.birthday], ["ส่วนสูง", t.height], ["เทียร์", ti ? ti.label + (ti.desc ? " — " + ti.desc : "") : ""], ["อันดับล่าสุด", lr ? "#" + lr.rank + " (" + (lr.round.code || lr.round.title) + ")" : ""], ["ผู้เล่น / CV", t.cv], ["สถานะ", STATUS[t.status] || t.status]].filter(r => r[1]);
    const canVote = t.status === "active";
    modal('<div class="profile"><div class="ph">' + portrait(t) + '</div><div class="profile-body">' +
      '<span class="chip b">TRAINEE</span>' +
      "<h3>" + esc(t.name) + "</h3>" + (t.stageName ? '<div class="stage">' + esc(t.stageName) + "</div>" : "") +
      '<dl class="dl">' + rows.map(r => "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>").join("") + "</dl>" +
      (t.bio ? '<p class="bio">' + esc(t.bio) + "</p>" : "") + sparkline(t, data) +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px">' + (canVote ? '<a class="btn btn-rose" href="vote.html?t=' + encodeURIComponent(t.id) + '">โหวตให้ ' + esc(t.stageName || t.name) + "</a>" : "") +
      (t.link ? '<a class="btn btn-ghost" href="' + attr(t.link) + '" target="_blank" rel="noopener">โปรไฟล์ฉบับเต็ม</a>' : "") + "</div></div></div>");
  }

  /* ---------- chrome: account chip, menus ---------- */
  function closeSheet() { const s = $("#sheet"); if (s) { s.classList.remove("open"); s.setAttribute("aria-hidden", "true"); } }
  function initChrome() {
    const mb = $("#menuBtn"), sh = $("#sheet");
    if (mb && sh) {
      mb.addEventListener("click", () => { sh.classList.add("open"); sh.setAttribute("aria-hidden", "false"); const c = sh.querySelector(".x-btn"); c && c.focus(); });
      sh.addEventListener("click", e => { if (e.target === sh || e.target.closest(".x-btn")) closeSheet(); });
    }
    $$(".dd > .tab").forEach(b => b.addEventListener("click", e => {
      const dd = b.parentElement; const open = !dd.classList.contains("open");
      $$(".dd.open").forEach(x => x.classList.remove("open")); if (open) dd.classList.add("open");
      b.setAttribute("aria-expanded", open); e.stopPropagation();
    }));
    document.addEventListener("click", () => $$(".dd.open").forEach(x => x.classList.remove("open")));
    renderAcct();
    const y = $("#year"); if (y) y.textContent = new Date().getFullYear() + 543;
    if (!LIVE) { const n = $("#demoNote"); if (n) n.classList.remove("hide"); }
    starfield();
  }
  function renderAcct() {
    const el = $("#acct"); if (!el) return; const f = Fan.get();
    if (f && f.user) {
      el.innerHTML = '<a class="acct-btn" href="vote.html" title="ไปหน้าโหวต"><span class="dot">' + esc((f.user.displayName || "?").slice(0, 1).toUpperCase()) + "</span>" + esc(f.user.displayName) + '</a><button class="acct-btn" id="logoutBtn" type="button" style="padding:0 14px">ออกจากระบบ</button>';
      $("#logoutBtn").addEventListener("click", () => { Fan.clear(); toast("ออกจากระบบแล้ว"); renderAcct(); document.dispatchEvent(new CustomEvent("fan:change")); });
    } else {
      el.innerHTML = '<a class="acct-btn" href="login.html?next=' + encodeURIComponent(location.pathname.split("/").pop() || "home.html") + '"><span class="dot">✦</span>เข้าสู่ระบบ<span class="long">แฟนคลับ</span></a>';
    }
  }

  /* ---------- starfield (one quiet motion) ---------- */
  function starfield() {
    const host = $(".sky"); if (!host || host.querySelector("canvas")) return;
    const c = document.createElement("canvas"); host.appendChild(c); const ctx = c.getContext("2d");
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars = [], W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), raf, last = 0;
    function size() {
      W = c.clientWidth; H = c.clientHeight; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(W * H / 7000); stars = [];
      for (let i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() ** 3 * 1.4 + 0.3, p: Math.random() * 6.28, s: 0.4 + Math.random() * 1.2, h: Math.random() < 0.12 ? 1 : Math.random() < 0.2 ? 2 : 0 });
      draw(0);
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        const a = reduce ? 0.6 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.p + t / 1000 * s.s));
        ctx.fillStyle = s.h === 1 ? "rgba(249,204,203," + a + ")" : s.h === 2 ? "rgba(134,221,228," + a + ")" : "rgba(255,255,255," + a * 0.85 + ")";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
    }
    function loop(t) { if (t - last > 50) { draw(t); last = t; } raf = requestAnimationFrame(loop); }
    size(); let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(size, 150); });
    if (!reduce) { raf = requestAnimationFrame(loop); document.addEventListener("visibilitychange", () => { if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(loop); }); }
  }

  /* ---------- export ---------- */
  window.Celestial = {
    CFG, LIVE, API, Fan, Store, $, $$, esc, attr, uid, qs, byOrder, TH_M, TH_MS, TH_D, parseISO, iso, fmtDate, fmtRange, bkkToday, msToBkkMidnight,
    toast, modal, closeModal, portrait, code, traineeCard, tierOf, tierBadge, openProfile, rankedRounds, rankIn, latestRank, STATUS, imgUrl, audioUrl, driveId, loadAudio, initials, renderAcct, sha256, COLLECTIONS, hashStr
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initChrome); else initChrome();
})();
