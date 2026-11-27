/* ============================================================
   THE CELESTIAL : PROJECT — ส่วนเสริม "โปรไฟล์แฟนคลับ"
   ------------------------------------------------------------
   โหลดต่อจาก js/core.js (ไม่ได้แก้ core.js เลย)
   - เพิ่มคำสั่งโปรไฟล์ให้ "โหมดตัวอย่าง" (เก็บในเบราว์เซอร์ เหมือนคำสั่งเดิม)
   - ปุ่มบัญชีมุมขวาบน: แสดงรูปโปรไฟล์ และกดแล้วไปหน้าโปรไฟล์
   - เพิ่มลิงก์ "โปรไฟล์ของฉัน" ในเมนูมือถือ ส่วนท้ายเว็บ และหน้าเข้าสู่ระบบ
   ฝั่งเซิร์ฟเวอร์อยู่ใน backend/Profile.gs
   ============================================================ */
(function () {
  "use strict";
  const C = window.Celestial;
  if (!C || window.CelestialProfile) return;
  const { $, $$, esc, attr } = C;

  /* ---------- กติกาเดียวกับ backend/Profile.gs ---------- */
  const THEMES = {
    rose: ["#C43556", "#450A18", "Rose"],
    aqua: ["#86DDE4", "#197074", "Aqua"],
    wine: ["#7B182F", "#1d0409", "Wine"],
    teal: ["#2a8a90", "#082D36", "Teal"],
    blush: ["#F9CCCB", "#a3385a", "Blush"]
  };
  const BIO_MAX = 300;
  const SOCIALS = [
    { k: "x", label: "X (Twitter)", pre: "x.com/", re: /^[A-Za-z0-9_]{1,15}$/, host: /(?:twitter|x)\.com\//i, url: v => "https://x.com/" + v, icon: '<path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z"/>' },
    { k: "ig", label: "Instagram", pre: "instagram.com/", re: /^[A-Za-z0-9_.]{1,30}$/, host: /instagram\.com\//i, url: v => "https://www.instagram.com/" + v + "/", icon: '<path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3c1.2-.1 1.6-.1 4.8-.1ZM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0Zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9Z"/>' },
    { k: "tiktok", label: "TikTok", pre: "tiktok.com/@", re: /^[A-Za-z0-9_.]{2,24}$/, host: /tiktok\.com\/@?/i, url: v => "https://www.tiktok.com/@" + v, icon: '<path d="M19.6 7.7a5.6 5.6 0 0 1-3.4-1.2v7.3a5.8 5.8 0 1 1-5-5.7v3a2.8 2.8 0 1 0 2 2.7V2h3a3.4 3.4 0 0 0 3.4 3.1z"/>' },
    { k: "facebook", label: "Facebook", pre: "facebook.com/", re: /^(?:[A-Za-z0-9.\-]{1,50}|profile\.php\?id=\d{5,20})$/, host: /facebook\.com\//i, url: v => "https://www.facebook.com/" + v, icon: '<path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z"/>' },
    { k: "discord", label: "Discord", pre: "Discord", re: /^[A-Za-z0-9_.]{2,32}(?:#\d{4})?$/, host: null, url: null, icon: '<path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.4C.6 9.1-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2.1a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.7-3.6-13.7zM8.5 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm7 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"/>' }
  ];
  // ระดับแฟนคลับตามจำนวนครั้งที่โหวต
  const LEVELS = [[0, "ดาวดวงใหม่", "New Star"], [5, "ดาวประกาย", "Twinkle"], [20, "กลุ่มดาว", "Constellation"], [50, "ทางช้างเผือก", "Milky Way"], [100, "ซูเปอร์โนวา", "Supernova"]];
  function level(votes) { const n = Number(votes) || 0; let l = LEVELS[0]; LEVELS.forEach(x => { if (n >= x[0]) l = x; }); const i = LEVELS.indexOf(l); return { th: l[1], en: l[2], index: i, next: LEVELS[i + 1] ? LEVELS[i + 1][0] : null }; }

  function normSocial(k, v) {
    const r = SOCIALS.find(s => s.k === k); v = String(v == null ? "" : v).trim();
    if (!r || !v) return { ok: true, v: "" };
    if (r.host) { const m = v.match(new RegExp(r.host.source + "([^\\s/#]+)", "i")); if (m) v = m[1]; }
    if (k !== "facebook") v = v.split("?")[0];
    v = v.replace(/^@+/, "").replace(/\/+$/, "");
    return r.re.test(v) ? { ok: true, v } : { ok: false, v, err: "ชื่อบัญชี " + r.label + " ไม่ถูกต้อง" };
  }
  const line = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  const text = (v, max) => String(v == null ? "" : v).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
  function validBirthday(s) { const m = String(s).match(/^(\d{2})-(\d{2})$/); if (!m) return false; const mo = +m[1], d = +m[2]; return mo >= 1 && mo <= 12 && d >= 1 && d <= [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1]; }
  function birthdayText(s) { if (!validBirthday(s)) return ""; return Number(s.slice(3)) + " " + C.TH_M[Number(s.slice(0, 2)) - 1]; }
  // วันที่ตามเวลาไทยจาก ISO timestamp
  function bkkDate(isoTs) {
    if (!isoTs) return ""; const d = new Date(isoTs); if (isNaN(d)) return String(isoTs).slice(0, 10);
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(d); }
    catch (e) { return new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10); }
  }

  /* ---------- รูปโปรไฟล์ (มีรูปใช้รูป ไม่มีรูปใช้ตัวอักษรแรกบนพื้นสีธีม) ---------- */
  function firstChar(name) {
    const ch = Array.from(String(name || "").trim()).find(c => !/[ัิ-ฺเ-ไ็-๎\s]/.test(c));
    return (ch || "✦").toUpperCase();
  }
  function avatar(name, url, theme, cls) {
    const t = THEMES[theme] || THEMES.rose; const src = url ? C.imgUrl(url) : "";
    return '<span class="fp-av' + (cls ? " " + cls : "") + '" style="--t1:' + t[0] + ";--t2:" + t[1] + '"><b>' + esc(firstChar(name)) + "</b>" +
      (src ? '<img src="' + attr(src) + '" alt="" loading="lazy" onerror="this.remove()">' : "") + "</span>";
  }

  /* ---------- แคชโปรไฟล์ของคนที่ล็อกอิน (ใช้กับปุ่มบัญชีทุกหน้า) ---------- */
  const PKEY = "celestial_fan_profile";
  const STALE = 6 * 3600e3;
  function cached() { const s = C.Fan.get(), c = C.Store.get(PKEY); return s && s.user && c && c.id === s.user.id ? c : null; }
  function remember(res) {
    if (!res || !res.user) return;
    const p = res.profile || {};
    C.Store.set(PKEY, { id: res.user.id, avatar: p.avatar || "", theme: p.theme || "rose", ts: Date.now() });
    const s = C.Fan.get();
    if (s && s.user && s.user.id === res.user.id && res.user.displayName && s.user.displayName !== res.user.displayName) { s.user.displayName = res.user.displayName; C.Fan.set(s); C.renderAcct(); }
    decorate(true);
  }
  function staffSession() { const s = C.Store.get("celestial_staff"); return s && s.token && s.exp > Date.now() ? s : null; }

  /* ============================================================
     โหมดตัวอย่าง — คำสั่งเดียวกับ backend/Profile.gs เก็บในเบราว์เซอร์
     ============================================================ */
  const Demo = C.API && C.API.demo;
  if (Demo && Demo.actions && !Demo.actions.profileGet) {
    const fanOf = token => { const s = Demo.session(token, "fan"); const f = Demo.load().fans.find(x => x.id === s.id); if (!f) throw new Error("ไม่พบบัญชี กรุณาเข้าสู่ระบบใหม่"); return f; };
    const blank = id => ({ fanId: id, avatar: "", bio: "", bias: "", birthday: "", socials: {}, theme: "rose", public: true, hidden: false, updatedAt: "" });
    const store = () => { const db = Demo.load(); db.profiles = db.profiles || {}; return db.profiles; };
    const votesOf = f => Demo.load().votes.filter(v => v.fanId === f.id).length;
    const userOf = f => ({ id: f.id, username: f.username, displayName: f.displayName, createdAt: f.createdAt || "", votes: votesOf(f), lastVote: f.lastVote || "", votedToday: f.lastVote === C.bkkToday(), banned: !!f.banned });
    const pub = d => ({ avatar: d.avatar, bio: d.bio, bias: d.bias, birthday: d.birthday, socials: d.socials || {}, theme: d.theme, updatedAt: d.updatedAt });
    const own = d => Object.assign(pub(d), { public: d.public !== false, hidden: !!d.hidden });
    const rate = {}; const limit = (k, max) => { const now = Date.now(); rate[k] = (rate[k] || []).filter(t => now - t < 600e3); if (rate[k].length >= max) throw new Error("ทำรายการถี่เกินไป กรุณารอสักครู่แล้วลองใหม่"); rate[k].push(now); };
    Object.assign(Demo.actions, {
      async profileGet(p) { const f = fanOf(p.token), d = store()[f.id]; return { user: userOf(f), profile: own(d || blank(f.id)), exists: !!d }; },
      async profileSave(p) {
        const f = fanOf(p.token); if (f.banned) throw new Error("บัญชีนี้ถูกระงับโดยทีมงาน จึงแก้ไขโปรไฟล์ไม่ได้");
        limit("save" + f.id, 20);
        const x = p.profile || {}, name = line(x.displayName, 40); if (!name) throw new Error("กรุณาใส่ชื่อที่แสดง");
        const bias = String(x.bias || "").trim(); if (bias && !(Demo.load().trainees || []).some(t => t.id === bias)) throw new Error("ไม่พบเด็กฝึกที่เลือก");
        const birthday = String(x.birthday || "").trim(); if (birthday && !validBirthday(birthday)) throw new Error("วันเกิดไม่ถูกต้อง");
        const socials = {}; SOCIALS.forEach(s => { const r = normSocial(s.k, (x.socials || {})[s.k]); if (!r.ok) throw new Error(r.err); if (r.v) socials[s.k] = r.v; });
        const d = store()[f.id] || blank(f.id);
        Object.assign(d, { bio: text(x.bio, BIO_MAX), bias, birthday, socials, theme: THEMES[x.theme] ? x.theme : "rose", public: x.public !== false, updatedAt: new Date().toISOString() });
        store()[f.id] = d; f.displayName = name; Demo.persist();
        return { user: userOf(f), profile: own(d), exists: true };
      },
      async profileAvatar(p) {
        const f = fanOf(p.token); if (f.banned) throw new Error("บัญชีนี้ถูกระงับโดยทีมงาน จึงแก้ไขโปรไฟล์ไม่ได้");
        limit("av" + f.id, 8);
        let url = "";
        if (!p.remove) { if (!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(p.dataUrl || ""))) throw new Error("ไฟล์รูปไม่ถูกต้อง (รองรับ JPG, PNG, WEBP)"); url = p.dataUrl; }
        const d = store()[f.id] || blank(f.id); d.avatar = url; d.updatedAt = new Date().toISOString(); store()[f.id] = d; Demo.persist();
        return { user: userOf(f), profile: own(d), exists: true };
      },
      async profileView(p) {
        const u = String(p.username || "").trim().toLowerCase(); let staff = null;
        if (p.staffToken) { try { staff = Demo.staffUser(p.staffToken); } catch (e) { } }
        const f = Demo.load().fans.find(x => x.username === u); if (!f) throw new Error("ไม่พบโปรไฟล์นี้");
        const d = store()[f.id];
        if (!staff) {
          if (f.banned || !d) throw new Error("ไม่พบโปรไฟล์นี้");
          if (d.hidden) throw new Error("โปรไฟล์นี้ถูกซ่อนโดยทีมงาน");
          if (d.public === false) throw new Error("เจ้าของตั้งโปรไฟล์นี้เป็นส่วนตัว");
        }
        const pr = d || blank(f.id);
        const out = { user: { username: f.username, displayName: f.displayName, createdAt: f.createdAt || "", votes: votesOf(f) }, profile: pub(pr) };
        if (staff) out.mod = { fanId: f.id, exists: !!d, public: pr.public !== false, hidden: !!pr.hidden, banned: !!f.banned };
        return out;
      },
      async profileList(p) {
        Demo.staffUser(p.token); const db = Demo.load(), all = store(), q = String(p.q || "").trim().toLowerCase();
        const items = Object.keys(all).map(id => { const f = db.fans.find(x => x.id === id); if (!f) return null; const d = all[id]; return { fanId: id, username: f.username, displayName: f.displayName, banned: !!f.banned, votes: votesOf(f), avatar: d.avatar, bio: d.bio, bias: d.bias, public: d.public !== false, hidden: !!d.hidden, updatedAt: d.updatedAt }; })
          .filter(x => x && (!q || (x.username + " " + x.displayName + " " + x.bio).toLowerCase().includes(q))).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
        return { items: items.slice(0, 300), total: items.length };
      },
      async profileModerate(p) {
        const me = Demo.staffUser(p.token), d = store()[p.fanId]; if (!d) throw new Error("ไม่พบโปรไฟล์");
        if (p.op === "removeAvatar") d.avatar = ""; else if (p.op === "clearBio") d.bio = ""; else if (p.op === "hide") d.hidden = true; else if (p.op === "unhide") d.hidden = false; else throw new Error("ไม่รู้จักคำสั่ง " + p.op);
        const f = Demo.load().fans.find(x => x.id === p.fanId); Demo.log(me, "profile " + p.op, f ? f.username : p.fanId); Demo.persist();
        return { profile: own(d) };
      }
    });
  }

  /* ============================================================
     หน้าตาเว็บส่วนกลาง: ปุ่มบัญชี เมนูมือถือ ส่วนท้าย
     ============================================================ */
  function dotWith(dot, c) {
    if (!dot || dot.dataset.fp) return; dot.dataset.fp = "1";
    const t = THEMES[(c && c.theme) || "rose"] || THEMES.rose;
    // ใส่สไตล์ไว้ในตัว เพราะหน้าอื่นไม่ได้โหลด css/profile.css
    dot.classList.add("fp-dot"); dot.style.background = "linear-gradient(135deg," + t[0] + "," + t[1] + ")"; dot.style.position = "relative"; dot.style.overflow = "hidden";
    if (c && c.avatar) dot.insertAdjacentHTML("beforeend", '<img src="' + attr(C.imgUrl(c.avatar)) + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.remove()">');
  }
  function decorate(force) {
    const s = C.Fan.get(), c = cached();
    const acct = $("#acct");
    if (acct && s && s.user) {
      const a = acct.querySelector("a.acct-btn");
      if (a) {
        if (force) { a.removeAttribute("data-fp"); const d = a.querySelector(".dot"); if (d) { d.removeAttribute("data-fp"); d.textContent = firstChar(s.user.displayName); } }
        if (!a.dataset.fp) { a.dataset.fp = "1"; a.href = "profile.html"; a.title = "โปรไฟล์ของฉัน"; if (document.body.dataset.page === "profile" && !C.qs("u") && !C.qs("review")) a.setAttribute("aria-current", "page"); }
        dotWith(a.querySelector(".dot"), c);
      }
    }
    const who = $("#vState .who .dot"); if (who && s) { if (force) who.removeAttribute("data-fp"); dotWith(who, c); }
    // เมนูมือถือ
    const sl = $('.sheet-panel a.s-link[href="login.html"]');
    if (sl && !$('.sheet-panel a[href="profile.html"]')) sl.insertAdjacentHTML("afterend", '<a class="s-link" href="profile.html">โปรไฟล์ของฉัน<small>Profile</small></a>');
    // ส่วนท้ายเว็บ
    const fl = $('.foot ul a[href="login.html"]');
    if (fl && !$('.foot ul a[href="profile.html"]')) fl.closest("li").insertAdjacentHTML("afterend", '<li><a href="profile.html">โปรไฟล์แฟนคลับ</a></li>');
    // หน้าเข้าสู่ระบบ (กรณีล็อกอินอยู่แล้ว)
    const meBar = $("#me .toolbar");
    if (meBar && !meBar.querySelector('a[href="profile.html"]')) { const first = meBar.querySelector(".btn"); const html = '<a class="btn btn-ghost" href="profile.html">โปรไฟล์ของฉัน</a>'; first ? first.insertAdjacentHTML("afterend", html) : meBar.insertAdjacentHTML("afterbegin", html); }
  }

  // โหลดรูปโปรไฟล์ของคนที่ล็อกอินมาเก็บไว้ (นาน ๆ ครั้ง — ไม่ยิงเซิร์ฟเวอร์ทุกหน้า)
  let syncing = false;
  async function sync() {
    const s = C.Fan.get(); if (!s || !s.token || syncing) return;
    const c = C.Store.get(PKEY);
    if (c && c.id === s.user.id && Date.now() - (c.ts || 0) < STALE) return;
    syncing = true;
    try { remember(await C.API.call("profileGet", { token: s.token })); }
    catch (e) { if (/ไม่รู้จักคำสั่ง/.test(e.message)) C.Store.set(PKEY, { id: s.user.id, avatar: "", theme: "rose", ts: Date.now() }); }
    syncing = false;
  }

  function start() {
    decorate();
    const watch = el => { if (el) new MutationObserver(() => decorate()).observe(el, { childList: true }); };
    watch($("#acct")); watch($("#vState")); watch($("#me"));
    document.addEventListener("fan:change", () => decorate(true));
    if (document.body.dataset.page !== "profile") setTimeout(sync, 400);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

  window.CelestialProfile = { THEMES, SOCIALS, LEVELS, BIO_MAX, level, normSocial, validBirthday, birthdayText, bkkDate, firstChar, avatar, cached, remember, staffSession, decorate, line, text };
})();
