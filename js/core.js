/* ============================================================
   THE CELESTIAL : PROJECT — core (data, sessions, shared UI)
   ============================================================ */
(function () {
  "use strict";
  const CFG = window.CELESTIAL_CONFIG || {};
  const LIVE = !!(CFG.API_URL && /^https:\/\//.test(CFG.API_URL));
  const SERVER_VERSION = "2026-11-28"; // ต้องตรงกับ VERSION ใน backend/Code.gs

  /* ---------- tiny helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const attr = esc;
  const uid = (p = "") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const qs = k => new URLSearchParams(location.search).get(k);
  const byOrder = (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0);
  const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const fmtNum = v => num(v).toLocaleString("th-TH", { maximumFractionDigits: 2 });

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
  // วันที่ปัจจุบันตามเวลาไทย (ใช้ตัดรอบโหวต/กดใจรายวัน)
  function bkkToday() {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { const d = new Date(Date.now() + 7 * 3600e3); return d.toISOString().slice(0, 10); }
  }
  function msToBkkMidnight() {
    const now = Date.now(); const bk = new Date(now + 7 * 3600e3);
    const next = Date.UTC(bk.getUTCFullYear(), bk.getUTCMonth(), bk.getUTCDate() + 1) - 7 * 3600e3;
    return next - now;
  }
  function fmtClock(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(n => String(n).padStart(2, "0")).join(":"); }

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

  /* ---------- fan levels ---------- */
  const DEFAULT_LEVELS = [
    { id: "l1", name: "STARDUST", min: 0, color: "#9FB3B8", frame: 1 },
    { id: "l2", name: "COMET", min: 7, color: "#86DDE4", frame: 2 },
    { id: "l3", name: "NEBULA", min: 30, color: "#E0809A", frame: 3 },
    { id: "l4", name: "CONSTELLATION", min: 60, color: "#C9D6FF", frame: 4 },
    { id: "l5", name: "SUPERNOVA", min: 120, color: "#C43556", frame: 5 },
    { id: "l6", name: "CELESTIAL", min: 200, color: "#F4D58D", frame: 6 }
  ];
  const THEMES = { rose: ["#C43556", "กุหลาบ"], aqua: ["#86DDE4", "ฟ้าน้ำทะเล"], blush: ["#F9CCCB", "ชมพูจันทร์"], gold: ["#F4D58D", "ทองดาว"], violet: ["#A88BEB", "ม่วงเนบิวลา"], mint: ["#7FE0B0", "มิ้นต์"] };
  function fanLevels(data) { const l = (data && data.settings && Array.isArray(data.settings.fanLevels) && data.settings.fanLevels.length) ? data.settings.fanLevels : DEFAULT_LEVELS; return l.slice().sort((a, b) => num(a.min) - num(b.min)); }
  function levelOf(hearts, data) {
    const L = fanLevels(data); let i = 0; L.forEach((l, k) => { if (num(hearts) >= num(l.min)) i = k; });
    const cur = L[i], next = L[i + 1] || null;
    return { idx: i, n: i + 1, cur, next, all: L, frame: Math.min(6, Math.max(1, num(cur.frame) || i + 1)), need: next ? num(next.min) - num(hearts) : 0, pct: next ? Math.max(0, Math.min(100, (num(hearts) - num(cur.min)) / Math.max(1, num(next.min) - num(cur.min)) * 100)) : 100 };
  }

  /* ============================================================
     DEMO SERVER — mirrors backend/Code.gs actions, stored locally
     ============================================================ */
  const DB_KEY = "celestial_demo_db_v3"; // v3: ไม่มีเทียร์ + โปรไฟล์แฟนคลับ + คะแนนโหวตภายนอก
  Store.del("celestial_demo_db_v1"); Store.del("celestial_demo_db_v2");
  const COLLECTIONS = ["trainees", "staff", "banners", "news", "events", "rounds", "rules", "uniforms", "tracks", "history"];
  const fanPub = f => ({ username: f.username, displayName: f.displayName, avatar: f.avatar || "", cover: f.cover || "", bio: f.bio || "", bias: f.bias || "", theme: f.theme || "", hearts: num(f.hearts), checkins: num(f.checkins), received: num(f.received), given: num(f.given), votes: num(f.votes), createdAt: f.createdAt || "" });
  const Demo = {
    db: null,
    load() {
      if (this.db) return this.db;
      let db = Store.get(DB_KEY);
      if (!db || !db.settings) {
        db = JSON.parse(JSON.stringify(window.CELESTIAL_SEED || {}));
        db.fans = db.fans || []; db.votes = db.votes || []; db.sessions = {}; db.log = db.log || []; db.voteboard = db.voteboard || {}; db.hearts = db.hearts || [];
      }
      this.db = db; return db;
    },
    persist() { if (!Store.set(DB_KEY, this.db)) throw new Error("พื้นที่เก็บข้อมูลในเบราว์เซอร์เต็ม ลองใช้รูปขนาดเล็กลงหรือใช้ลิงก์รูปแทนการอัปโหลด"); },
    reset() { Store.del(DB_KEY); this.db = null; return this.load(); },
    async hash(pw, salt) { return sha256(salt + "::" + pw + "::celestial"); },
    session(token, kind) {
      const s = this.load().sessions[token];
      if (!s || s.kind !== kind || s.exp < Date.now()) throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
      return s;
    },
    newToken(kind, id, hours) {
      const t = uid("t") + uid(); this.load().sessions[t] = { kind, id, exp: Date.now() + hours * 3600e3 }; return t;
    },
    tally(db, round) {
      const totals = Object.assign({}, (db.webVotesExtra || {})[round] || {}); let total = 0;
      Object.keys(totals).forEach(k => total += totals[k]);
      db.votes.forEach(v => { if (v.round === round) { totals[v.traineeId] = (totals[v.traineeId] || 0) + 1; total++; } });
      return { round, totals, total };
    },
    publicData() {
      const db = this.load(); const out = { settings: db.settings };
      COLLECTIONS.forEach(c => out[c] = db[c] || []);
      out.results = {}; Object.keys(db.voteboard || {}).forEach(r => { if (db.voteboard[r].published) out.results[r] = db.voteboard[r].published; });
      out.mode = "demo"; return JSON.parse(JSON.stringify(out));
    },
    staffUser(token) {
      const s = this.session(token, "staff");
      const a = this.load().accounts.find(x => x.username === s.id && x.active !== false);
      if (!a) throw new Error("บัญชีนี้ถูกปิดใช้งาน"); return a;
    },
    fan(token) { const s = Demo.session(token, "fan"); const f = Demo.load().fans.find(x => x.id === s.id); if (!f) throw new Error("ไม่พบบัญชี กรุณาเข้าสู่ระบบใหม่"); return f; },
    coll(name) { if (!COLLECTIONS.includes(name)) throw new Error("ไม่รู้จักชุดข้อมูล " + name); const db = this.load(); db[name] = db[name] || []; return db[name]; },
    log(user, action, detail) { const db = this.load(); db.log.unshift({ ts: new Date().toISOString(), user: user.username, action, detail: detail || "" }); db.log = db.log.slice(0, 300); },
    actions: {
      async public() { return Demo.publicData(); },
      async fans() {
        const all = Demo.load().fans.filter(f => !f.banned);
        return { top: all.slice().sort((a, b) => num(b.hearts) - num(a.hearts) || String(a.createdAt).localeCompare(String(b.createdAt))).slice(0, 36).map(fanPub), newest: all.slice(-8).reverse().map(fanPub), count: all.length };
      },
      async fan(p) {
        const u = String(p.u || "").trim().toLowerCase(); const f = Demo.load().fans.find(x => x.username === u);
        if (!f) throw new Error("ไม่พบโปรไฟล์ @" + u); if (f.banned) throw new Error("โปรไฟล์นี้ถูกระงับโดยทีมงาน"); return fanPub(f);
      },
      async fanRegister(p) {
        const db = Demo.load(); const u = String(p.username || "").trim().toLowerCase();
        if (!/^[a-z0-9_.]{3,20}$/.test(u)) throw new Error("ชื่อผู้ใช้ต้องเป็น a-z, 0-9, _ หรือ . ยาว 3–20 ตัว");
        if (String(p.password || "").length < 6) throw new Error("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");
        const name = String(p.displayName || "").trim().slice(0, 40);
        if (!name) throw new Error("กรุณาใส่ชื่อที่แสดง");
        if (db.fans.some(f => f.username === u)) throw new Error("ชื่อผู้ใช้นี้มีคนใช้แล้ว");
        const salt = uid(); const fan = { id: uid("f"), username: u, displayName: name, salt, hash: await Demo.hash(p.password, salt), createdAt: new Date().toISOString(), banned: false, lastVote: "", votes: 0, hearts: 0, checkins: 0, received: 0, given: 0, bonus: 0 };
        db.fans.push(fan); const token = Demo.newToken("fan", fan.id, 24 * 30); Demo.persist();
        return { token, user: { id: fan.id, username: u, displayName: name, avatar: "" } };
      },
      async fanLogin(p) {
        const db = Demo.load(); const u = String(p.username || "").trim().toLowerCase();
        const fan = db.fans.find(f => f.username === u);
        if (!fan || !fan.hash || fan.hash !== await Demo.hash(p.password || "", fan.salt)) throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        if (fan.banned) throw new Error("บัญชีนี้ถูกระงับโดยทีมงาน");
        const token = Demo.newToken("fan", fan.id, 24 * 30); Demo.persist();
        return { token, user: { id: fan.id, username: fan.username, displayName: fan.displayName, avatar: fan.avatar || "" } };
      },
      async fanMe(p) {
        const fan = Demo.fan(p.token); const db = Demo.load();
        const today = bkkToday(); const v = db.votes.find(x => x.fanId === fan.id && x.date === today);
        return { user: Object.assign(fanPub(fan), { id: fan.id, banned: !!fan.banned }), today, voted: v ? { traineeId: v.traineeId, ts: v.ts } : null, checkedIn: fan.lastCheckin === today, gave: fan.lastGive === today ? (fan.lastGiveTo || "-") : "" };
      },
      async vote(p) {
        const fan = Demo.fan(p.token); const db = Demo.load();
        if (fan.banned) throw new Error("บัญชีนี้ถูกระงับสิทธิ์โหวต");
        const vs = db.settings.vote || {};
        if (!vs.open) throw new Error("ขณะนี้ปิดโหวตแล้ว");
        const t = db.trainees.find(x => x.id === p.traineeId);
        if (!t || t.status !== "active") throw new Error("ไม่สามารถโหวตให้เด็กฝึกคนนี้ได้");
        const today = bkkToday();
        if (fan.lastVote === today || db.votes.some(x => x.fanId === fan.id && x.date === today)) throw new Error("วันนี้คุณโหวตไปแล้ว กลับมาโหวตใหม่ได้หลังเที่ยงคืน (เวลาไทย)");
        db.votes.push({ date: today, ts: new Date().toISOString(), fanId: fan.id, traineeId: t.id, round: vs.round || "" });
        fan.lastVote = today; fan.votes = num(fan.votes) + 1; Demo.persist();
        return { ok: true, today, traineeId: t.id };
      },
      async fanUpdate(p) {
        const f = Demo.fan(p.token); const x = p.profile || {};
        if (f.banned) throw new Error("บัญชีนี้ถูกระงับโดยทีมงาน");
        if (x.displayName !== undefined) { const n = String(x.displayName).trim().slice(0, 40); if (!n) throw new Error("กรุณาใส่ชื่อที่แสดง"); f.displayName = n; }
        if (x.bio !== undefined) f.bio = String(x.bio || "").slice(0, 300);
        if (x.bias !== undefined) f.bias = String(x.bias || "");
        if (x.theme !== undefined) f.theme = THEMES[x.theme] ? x.theme : "";
        ["avatar", "cover"].forEach(k => { if (x[k] !== undefined) { const u = String(x[k] || "").trim(); if (u && !/^(https:\/\/|data:image\/)/.test(u)) throw new Error("ลิงก์รูปต้องขึ้นต้นด้วย https://"); f[k] = u; } });
        Demo.persist(); return { user: fanPub(f) };
      },
      async fanUpload(p) {
        const f = Demo.fan(p.token); const kind = p.kind === "cover" ? "cover" : "avatar";
        if (!/^data:image\//.test(String(p.dataUrl || ""))) throw new Error("รองรับเฉพาะไฟล์รูป");
        f[kind] = p.dataUrl; Demo.persist(); return { url: p.dataUrl, user: fanPub(f) };
      },
      async fanCheckin(p) {
        const f = Demo.fan(p.token); const today = bkkToday(); if (f.banned) throw new Error("บัญชีนี้ถูกระงับโดยทีมงาน");
        if (f.lastCheckin === today) throw new Error("วันนี้คุณกดใจเช็กอินไปแล้ว กลับมาใหม่หลังเที่ยงคืน (เวลาไทย)");
        f.checkins = num(f.checkins) + 1; f.lastCheckin = today; f.hearts = num(f.checkins) + num(f.received) + num(f.bonus);
        Demo.load().hearts.push({ date: today, from: f.id, to: f.id, kind: "checkin" }); Demo.persist(); return { user: fanPub(f), today };
      },
      async fanGive(p) {
        const me = Demo.fan(p.token); const today = bkkToday(); if (me.banned) throw new Error("บัญชีนี้ถูกระงับโดยทีมงาน");
        if (me.lastGive === today) throw new Error("วันนี้คุณส่งใจไปแล้ว (วันละ 1 ใจ) กลับมาใหม่หลังเที่ยงคืน (เวลาไทย)");
        const o = Demo.load().fans.find(x => x.username === String(p.to || "").toLowerCase());
        if (!o) throw new Error("ไม่พบแฟนคลับคนนี้"); if (o.id === me.id) throw new Error("ส่งใจให้ตัวเองไม่ได้ ใช้ปุ่มเช็กอินประจำวันแทน"); if (o.banned) throw new Error("ส่งใจให้บัญชีนี้ไม่ได้");
        me.given = num(me.given) + 1; me.lastGive = today; me.lastGiveTo = o.username;
        o.received = num(o.received) + 1; o.hearts = num(o.checkins) + num(o.received) + num(o.bonus);
        Demo.load().hearts.push({ date: today, from: me.id, to: o.id, kind: "give" }); Demo.persist();
        return { user: fanPub(me), target: fanPub(o), today };
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
        const out = Demo.publicData(); const vr = (db.settings.vote || {}).round || "";
        out.tally = Demo.tally(db, vr); out.tallies = {};
        (db.rounds || []).map(r => r.id).concat([vr]).forEach(id => { if (!(id in out.tallies)) out.tallies[id] = Demo.tally(db, id); });
        out.board = JSON.parse(JSON.stringify(db.voteboard || {}));
        const today = bkkToday();
        out.votesToday = db.votes.filter(v => v.date === today).length;
        out.fans = db.fans.map(f => Object.assign(fanPub(f), { id: f.id, banned: !!f.banned, lastVote: f.lastVote, votes: db.votes.filter(v => v.fanId === f.id).length, bonus: num(f.bonus) }));
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
      async voteBoardSave(p) {
        const me = Demo.staffUser(p.token); const db = Demo.load(); if (!p.round) throw new Error("กรุณาเลือกรอบ");
        const sources = (p.sources || []).filter(s => s.id && s.label).slice(0, 10);
        const scores = {}; sources.forEach(s => { scores[s.id] = {}; Object.keys((p.scores || {})[s.id] || {}).forEach(t => { const n = Number(p.scores[s.id][t]); if (isFinite(n) && n > 0) scores[s.id][t] = n; }); });
        const b = db.voteboard[p.round] || {}; db.voteboard[p.round] = { sources, scores, published: b.published || null, updatedAt: new Date().toISOString(), updatedBy: me.username };
        Demo.log(me, "voteBoard", p.round); Demo.persist(); return { board: JSON.parse(JSON.stringify(db.voteboard)) };
      },
      async votePublish(p) {
        const me = Demo.staffUser(p.token); const db = Demo.load(); const round = p.round; if (!round) throw new Error("กรุณาเลือกรอบ");
        const b = db.voteboard[round] = db.voteboard[round] || { sources: [], scores: {}, published: null };
        if (p.publish === false) b.published = null;
        else {
          const web = Demo.tally(db, round).totals, ids = {}; Object.keys(web).forEach(k => ids[k] = 1); b.sources.forEach(s => Object.keys(b.scores[s.id] || {}).forEach(k => ids[k] = 1));
          let rows = Object.keys(ids).filter(id => db.trainees.some(t => t.id === id)).map(id => { const ext = {}; let tot = num(web[id]); b.sources.forEach(s => { const n = num((b.scores[s.id] || {})[id]); ext[s.id] = n; tot += n; }); return { id, web: num(web[id]), ext, total: tot }; }).filter(r => r.total > 0).sort((a, c) => c.total - a.total);
          const sum = rows.reduce((a, r) => a + r.total, 0) || 1, showNumbers = p.showNumbers !== false, breakdown = !!p.breakdown;
          rows = rows.map((r, i) => { const o = { id: r.id, rank: i + 1, pct: Math.round(r.total / sum * 1000) / 10 }; if (showNumbers) { o.total = r.total; if (breakdown) { o.web = r.web; o.ext = r.ext; } } return o; });
          const rd = db.rounds.find(r => r.id === round);
          b.published = { round, title: rd ? rd.code + " " + rd.title : round, publishedAt: new Date().toISOString(), note: String(p.note || "").slice(0, 300), showNumbers, breakdown: showNumbers && breakdown, rows };
          if (showNumbers) b.published.total = sum; if (b.published.breakdown) b.published.sources = b.sources;
        }
        Demo.log(me, b.published ? "votePublish" : "voteUnpublish", round); Demo.persist(); return { board: JSON.parse(JSON.stringify(db.voteboard)) };
      },
      async fanBan(p) {
        const me = Demo.staffUser(p.token); const f = Demo.load().fans.find(x => x.id === p.id); if (!f) throw new Error("ไม่พบสมาชิก");
        f.banned = !!p.banned; Demo.log(me, p.banned ? "ban" : "unban", f.username); Demo.persist(); return { ok: true };
      },
      async fanModerate(p) {
        const me = Demo.staffUser(p.token); const f = Demo.load().fans.find(x => x.id === p.id); if (!f) throw new Error("ไม่พบสมาชิก");
        (p.clear || []).forEach(k => { if (["avatar", "cover", "bio"].includes(k)) f[k] = ""; });
        const add = Math.round(Number(p.bonusAdd) || 0); if (add) { f.bonus = num(f.bonus) + add; f.hearts = num(f.checkins) + num(f.received) + num(f.bonus); }
        Demo.log(me, "fanModerate", f.username); Demo.persist(); return { fan: Object.assign(fanPub(f), { id: f.id, bonus: num(f.bonus) }) };
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
        if (db.webVotesExtra) delete db.webVotesExtra[p.round];
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
      const s = document.createElement("script"); s.src = "js/demo-data.js?v=20261128d";
      s.onload = res; s.onerror = () => rej(new Error("โหลดข้อมูลตัวอย่างไม่ได้")); document.head.appendChild(s);
    });
  }
  async function readJson(res) {
    let j; try { j = await res.json(); } catch (e) { throw new Error("เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (ตรวจสอบ API_URL ใน js/config.js)"); }
    if (!j || j.ok === false) throw new Error((j && j.error) || "เกิดข้อผิดพลาด");
    return j.data !== undefined ? j.data : j;
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
      return readJson(res);
    },
    // GET ?action=…&… (คำสั่งที่ไม่ต้องล็อกอิน เช่น ไฟล์เสียง รูป โปรไฟล์แฟนคลับ)
    async get(action, params = {}) {
      if (!LIVE) {
        if (action === "audio" || action === "image") throw new Error("ต้องตั้ง API_URL ใน js/config.js ก่อน");
        return API.call(action, params);
      }
      let res;
      try { res = await fetch(CFG.API_URL + "?" + new URLSearchParams(Object.assign({ action }, params)).toString(), { method: "GET" }); }
      catch (e) { throw new Error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง"); }
      return readJson(res);
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
    clear() { Store.del(this.KEY); },
    // อัปเดตชื่อ/รูปในเซสชันหลังแก้โปรไฟล์ (ชิปบัญชีมุมขวาบนจะเปลี่ยนตาม)
    patch(u) { const s = this.get(); if (!s || !s.user || !u) return; ["displayName", "avatar"].forEach(k => { if (u[k] !== undefined) s.user[k] = u[k]; }); this.set(s); renderAcct(); }
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

  /* ============================================================
     IMAGES — รูปจาก Google Drive
     ลิงก์ตรงของ Drive ไม่ใช่บริการทางการและบางครั้งตอบ 403 (รูปไม่ขึ้น)
     ลำดับที่ลอง: lh3.googleusercontent.com → drive.google.com/thumbnail → ขอผ่าน Apps Script (?action=image)
     รูปที่ได้จาก Apps Script จะถูกเก็บไว้ในเครื่อง (Cache Storage) ครั้งต่อไปขึ้นทันที
     ============================================================ */
  function driveImgId(u) {
    u = String(u || "");
    let m = u.match(/^https:\/\/lh\d\.googleusercontent\.com\/d\/([\w-]{20,})/); if (m) return m[1];
    m = u.match(/^https:\/\/lh\d\.google\.com\/(?:u\/\d+\/)?d\/([\w-]{20,})/); if (m) return m[1];
    if (!/^https:\/\/(?:drive|docs)\.google\.com\/|^https:\/\/drive\.usercontent\.google\.com\//.test(u)) return "";
    m = u.match(/(?:\/file\/d\/|\/d\/|[?&]id=)([\w-]{20,})/); return m ? m[1] : "";
  }
  const IMG = { lh3: [0, 0], thumb: [0, 0] }; // [ok, fail] นับในหน้านี้ ใช้เลือกวิธีแรกที่ได้ผล
  const lh3Url = id => "https://lh3.googleusercontent.com/d/" + id + "=w1600";
  const thumbUrl = id => "https://drive.google.com/thumbnail?id=" + id + "&sz=w1600";
  function imgUrl(u) {
    u = String(u || "").trim(); if (!u) return "";
    const id = driveImgId(u); if (!id) return u;
    return IMG.lh3[0] === 0 && IMG.lh3[1] >= 2 ? thumbUrl(id) : lh3Url(id);
  }
  function giveUp(img) {
    img.dataset.imgFail = "1";
    if (typeof img.onerror === "function") { try { img.onerror.call(img, new Event("error")); } catch (e) { } }
    else img.classList.add("img-fail");
  }
  document.addEventListener("load", e => {
    const img = e.target; if (!img || img.tagName !== "IMG") return; const s = img.currentSrc || img.src || "";
    if (/lh\d\.googleusercontent\.com\/d\//.test(s)) IMG.lh3[0]++; else if (/drive\.google\.com\/thumbnail/.test(s)) IMG.thumb[0]++;
  }, true);
  document.addEventListener("error", e => {
    const img = e.target; if (!img || img.tagName !== "IMG" || img.dataset.imgFail) return;
    const s = img.currentSrc || img.src || ""; const id = driveImgId(s); if (!id) return;
    e.stopPropagation(); // ยังไม่ให้ onerror ของรูป (เช่น ซ่อนรูป) ทำงาน จนกว่าจะลองครบทุกวิธี
    if (/lh\d\.googleusercontent\.com|lh\d\.google\.com/.test(s)) { IMG.lh3[1]++; if (!(IMG.thumb[0] === 0 && IMG.thumb[1] >= 2)) { img.src = thumbUrl(id); return; } }
    else if (/drive\.google\.com\/thumbnail/.test(s)) IMG.thumb[1]++;
    if (!LIVE || img.dataset.proxy) { giveUp(img); return; }
    img.dataset.proxy = "1";
    proxyImg(id).then(url => { img.src = url; }).catch(() => giveUp(img));
  }, true);

  // รูปย่อขึ้นก่อนเสมอ แล้วค่อยลองสลับเป็นรูปเต็ม: ลิงก์ตรง → thumbnail → Apps Script (ถ้าทุกทางไม่ได้ ก็ใช้รูปย่อต่อไป)
  function tryLoad(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(src); i.onerror = () => rej(new Error("x")); i.src = src; }); }
  const upgraded = new WeakSet();
  document.addEventListener("load", e => {
    const img = e.target; if (!img || img.tagName !== "IMG" || !img.dataset.full || upgraded.has(img)) return;
    upgraded.add(img); const full = img.dataset.full, id = driveImgId(full);
    tryLoad(full)
      .catch(() => id ? tryLoad(thumbUrl(id)) : Promise.reject())
      .catch(() => id && LIVE ? proxyImg(id) : Promise.reject())
      .then(src => { if (img.isConnected) img.src = src; }, () => { });
  }, true);
  const imgMem = new Map(), imgQ = new Map(); let imgT = null, imgBusy = 0;
  const IMG_CACHE = "celestial-img-v1", imgKey = id => "https://img.celestial.local/" + id;
  async function cacheGet(id) {
    try { if (!window.caches) return null; const c = await caches.open(IMG_CACHE); const r = await c.match(imgKey(id)); if (!r) return null; const ts = Number(r.headers.get("x-ts") || 0); if (Date.now() - ts > 14 * 864e5) return null; return await r.blob(); } catch (e) { return null; }
  }
  async function cachePut(id, blob) {
    try { if (!window.caches) return; const c = await caches.open(IMG_CACHE); await c.put(imgKey(id), new Response(blob, { headers: { "Content-Type": blob.type, "x-ts": String(Date.now()) } })); } catch (e) { }
  }
  function b64bytes(s) { const bin = atob(s), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  function proxyImg(id) {
    if (imgMem.has(id)) return imgMem.get(id);
    const job = (async () => {
      let blob = await cacheGet(id);
      if (!blob) { blob = await new Promise((res, rej) => { imgQ.set(id, { res, rej }); clearTimeout(imgT); imgT = setTimeout(flushImg, 30); }); cachePut(id, blob); }
      return URL.createObjectURL(blob);
    })();
    imgMem.set(id, job); job.catch(() => imgMem.delete(id));
    return job;
  }
  async function flushImg() {
    if (!imgQ.size || imgBusy >= 3) { if (imgQ.size) imgT = setTimeout(flushImg, 120); return; }
    const batch = Array.from(imgQ.entries()).slice(0, 12); batch.forEach(([id]) => imgQ.delete(id));
    if (imgQ.size) imgT = setTimeout(flushImg, 0);
    imgBusy++;
    try {
      const r = await API.get("image", { ids: batch.map(b => b[0]).join(",") });
      if (!r || !r.items) { if (!IMG.warned) { IMG.warned = 1; console.warn("[Celestial] Code.gs บนเซิร์ฟเวอร์ยังเป็นเวอร์ชันเก่า — รูปจาก Google Drive จะไม่ขึ้นจนกว่าจะ Deploy เป็น New version"); } }
      batch.forEach(([id, h]) => {
        const it = r.items && r.items[id];
        if (it) h.res(new Blob([b64bytes(it.data)], { type: it.mime || "image/jpeg" }));
        else if ((r.more || []).includes(id)) { imgQ.set(id, h); clearTimeout(imgT); imgT = setTimeout(flushImg, 0); }
        else h.rej(new Error((r.errors || {})[id] || "เปิดรูปไม่ได้"));
      });
    } catch (e) { batch.forEach(([, h]) => h.rej(e)); }
    finally { imgBusy--; }
  }

  /* ---------- audio ---------- */
  function audioUrl(u) {
    u = String(u || "").trim(); if (!u) return "";
    const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/);
    if (m) return "https://drive.google.com/uc?export=download&id=" + m[1];
    const d = u.match(/^(https:\/\/www\.dropbox\.com\/.*?)(\?dl=0)?$/); if (d && /dropbox/.test(u)) return u.replace("dl=0", "raw=1");
    return u;
  }
  /* ไฟล์เสียงจาก Google Drive: ขอผ่าน Apps Script (Code.gs → ?action=audio) เป็นชิ้น ๆ แล้วประกอบเป็นไฟล์ในเครื่องเพื่อเล่น */
  function driveId(u) {
    u = String(u || "");
    if (!/(?:drive|docs)\.google\.com|drive\.usercontent\.google\.com/.test(u)) return "";
    const m = u.match(/(?:\/file\/d\/|[?&]id=)([\w-]{20,})/); return m ? m[1] : "";
  }
  const audioCache = new Map();
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
  // รูปย่อที่ฝังอยู่ในข้อมูลของเว็บ (photoThumb / avatarThumb) ขึ้นได้ทุกเครื่องแน่นอน ไม่ต้องพึ่งลิงก์ Google Drive
  const thumbOf = t => { const v = t && (t.photoThumb || t.avatarThumb || t.imageThumb); return /^data:image\//.test(String(v || "")) ? String(v) : ""; };
  function photoSrc(t) { return thumbOf(t) || imgUrl(t && (t.photo || t.image || t.avatar)); }
  function portrait(t, label) {
    const pairs = PALETTES[t.pal === "rose" ? "rose" : "aqua"]; const p = pairs[hashStr(t.id || t.name) % pairs.length];
    const art = '<div class="art" style="--a:' + p[0] + ";--c:" + p[1] + '"><b>' + esc(initials(t)) + "</b></div>";
    const full = imgUrl(t.photo || t.image || t.avatar), th = thumbOf(t), alt = ' alt="' + attr(label || t.name || "") + '"';
    if (th) return art + '<img src="' + attr(th) + '"' + (full ? ' data-full="' + attr(full) + '"' : "") + alt + ' onerror="this.remove()">';
    return full ? art + '<img src="' + attr(full) + '"' + alt + ' loading="lazy" onerror="this.remove()">' : art;
  }
  const STATUS = { active: "กำลังแข่งขัน", eliminated: "ตกรอบ", debut: "เดบิวต์", withdrawn: "ถอนตัว" };
  function traineeCard(t, data, opts = {}) {
    const out = t.status === "eliminated" || t.status === "withdrawn";
    return '<button type="button" class="t-card' + (out ? " out" : "") + (t.status === "debut" ? " debut" : "") + '" data-id="' + attr(t.id) + '">' +
      '<div class="ph">' + portrait(t) + '<span class="t-no">' + esc(code(t)) + "</span>" +
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
    const lr = latestRank(t, data);
    const rows = [["รหัส", code(t)], ["สัญชาติ", t.nationality], ["ตำแหน่ง", t.position], ["วันเกิด", t.birthday], ["ส่วนสูง", t.height], ["อันดับล่าสุด", lr ? "#" + lr.rank + " (" + (lr.round.code || lr.round.title) + ")" : ""], ["ผู้เล่น / CV", t.cv], ["สถานะ", STATUS[t.status] || t.status]].filter(r => r[1]);
    const canVote = t.status === "active";
    modal('<div class="profile"><div class="ph">' + portrait(t) + '</div><div class="profile-body">' +
      '<span class="chip b">TRAINEE</span>' +
      "<h3>" + esc(t.name) + "</h3>" + (t.stageName ? '<div class="stage">' + esc(t.stageName) + "</div>" : "") +
      '<dl class="dl">' + rows.map(r => "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>").join("") + "</dl>" +
      (t.bio ? '<p class="bio">' + esc(t.bio) + "</p>" : "") + sparkline(t, data) +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px">' + (canVote ? '<a class="btn btn-rose" href="vote.html?t=' + encodeURIComponent(t.id) + '">โหวตให้ ' + esc(t.stageName || t.name) + "</a>" : "") +
      (t.link ? '<a class="btn btn-ghost" href="' + attr(t.link) + '" target="_blank" rel="noopener">โปรไฟล์ฉบับเต็ม</a>' : "") + "</div></div></div>");
  }

  /* ---------- fan visuals ---------- */
  function fanInitial(f) { return String((f && (f.displayName || f.username)) || "?").trim().slice(0, 1).toUpperCase() || "?"; }
  function avatarHtml(f) {
    const src = imgUrl(f && f.avatar);
    return '<span class="av-ini">' + esc(fanInitial(f)) + "</span>" + (src ? '<img src="' + attr(src) + '" alt="" loading="lazy" onerror="this.remove()">' : "");
  }
  // การ์ดแฟนคลับ: กรอบการ์ดเปลี่ยนตามระดับ (fr-1 … fr-6)
  function fanCard(f, data, opts = {}) {
    const lv = levelOf(f.hearts, data); const th = (THEMES[f.theme] || THEMES.rose)[0];
    const bias = f.bias && (data.trainees || []).find(t => t.id === f.bias);
    const cover = imgUrl(f.cover) || (bias ? photoSrc(bias) : "");
    const tag = opts.link === false ? "div" : "a";
    return "<" + tag + ' class="fan-card fr-' + lv.frame + (opts.size ? " " + opts.size : "") + '"' + (tag === "a" ? ' href="profile.html?u=' + encodeURIComponent(f.username) + '"' : "") + ' style="--fc:' + attr(th) + ";--lc:" + attr(lv.cur.color || "#9FB3B8") + '">' +
      '<span class="fc-in"><span class="fc-cover">' + (cover ? '<img src="' + attr(cover) + '" alt="" loading="lazy" onerror="this.remove()">' : "") + "</span>" +
      (opts.rank ? '<span class="fc-rank">' + esc(opts.rank) + "</span>" : "") +
      '<span class="fc-av">' + avatarHtml(f) + "</span>" +
      '<span class="fc-id"><strong>' + esc(f.displayName) + "</strong><small>@" + esc(f.username) + "</small></span>" +
      '<span class="fc-lv"><span class="lv-badge">LV.' + lv.n + " " + esc(lv.cur.name) + '</span><span class="fc-hearts"><i aria-hidden="true">♥</i> ' + fmtNum(f.hearts) + "</span></span>" +
      (bias && !opts.noBias ? '<span class="fc-bias">เมน · ' + esc(bias.stageName || bias.name) + "</span>" : "") +
      "</span>" + (lv.frame >= 4 ? '<i class="fc-shine" aria-hidden="true"></i>' : "") + (lv.frame >= 5 ? '<i class="fc-spark" aria-hidden="true"></i>' : "") +
      "</" + tag + ">";
  }

  // ตารางระดับแฟนคลับ: การ์ดตัวอย่างของแต่ละระดับ (ถ้ามี me จะใช้ชื่อ/รูปของผู้ใช้และบอกว่าปลดล็อกถึงไหนแล้ว)
  function levelLadder(data, me) {
    const L = fanLevels(data), mine = me ? levelOf(me.hearts, data) : null;
    return L.map((l, i) => {
      const f = Object.assign({ username: me ? me.username : "fan", displayName: me ? me.displayName : l.name, theme: me ? me.theme : "rose", avatar: me ? me.avatar : "", cover: me ? me.cover : "", bias: me ? me.bias : "" }, { hearts: num(l.min) });
      const got = mine && mine.idx >= i;
      return '<div class="lv-step' + (got ? " got" : mine ? " locked" : "") + (mine && mine.idx === i ? " now" : "") + '"><div class="lv-head"><span class="lv-dot" style="--lc:' + attr(l.color) + '"></span><b>LV.' + (i + 1) + " " + esc(l.name) + "</b><small>" + (i ? "ตั้งแต่ " + fmtNum(l.min) + " ใจ" : "เริ่มต้น") + "</small>" + (mine ? (got ? '<span class="lv-ok">' + (mine.idx === i ? "ระดับปัจจุบัน" : "ปลดล็อกแล้ว") + "</span>" : '<span class="lv-need">อีก ' + fmtNum(num(l.min) - num(me.hearts)) + " ใจ</span>") : "") + "</div>" + fanCard(f, data, { link: false, noBias: 1 }) + "</div>";
    }).join("");
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
      el.innerHTML = '<a class="acct-btn" href="profile.html" title="โปรไฟล์ของฉัน"><span class="dot av">' + avatarHtml(f.user) + "</span>" + esc(f.user.displayName) + '</a><button class="acct-btn" id="logoutBtn" type="button" style="padding:0 14px">ออกจากระบบ</button>';
      $("#logoutBtn").addEventListener("click", () => { Fan.clear(); toast("ออกจากระบบแล้ว"); renderAcct(); document.dispatchEvent(new CustomEvent("fan:change")); });
    } else {
      el.innerHTML = '<a class="acct-btn" href="login.html?next=' + encodeURIComponent((location.pathname.split("/").pop() || "home.html") + location.search) + '"><span class="dot">✦</span>เข้าสู่ระบบ<span class="long">แฟนคลับ</span></a>';
    }
  }

  /* ---------- starfield (one quiet motion) ---------- */
  function starfield() {
    const host = $(".sky"); if (!host || host.querySelector(":scope > canvas")) return;
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
    CFG, LIVE, SERVER_VERSION, API, Fan, Store, $, $$, esc, attr, uid, qs, byOrder, num, fmtNum, TH_M, TH_MS, TH_D, parseISO, iso, fmtDate, fmtRange, bkkToday, msToBkkMidnight, fmtClock,
    toast, modal, closeModal, portrait, photoSrc, proxyImg, code, traineeCard, openProfile, rankedRounds, rankIn, latestRank, STATUS, imgUrl, driveImgId, audioUrl, driveId, loadAudio, initials, renderAcct, sha256, COLLECTIONS, hashStr,
    THEMES, DEFAULT_LEVELS, fanLevels, levelOf, fanCard, avatarHtml, levelLadder
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initChrome); else initChrome();
})();
