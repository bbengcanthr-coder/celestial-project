/* ============================================================
   THE CELESTIAL : PROJECT — กาแลคซีหมุนพื้นหลังหน้าเพลย์ลิสต์ (index.html)
   วาดดาว/แขนกังหัน/แกนกลางลงแคนวาสครั้งเดียว แล้วให้ CSS หมุน (ไม่วาดใหม่ทุกเฟรม จึงลื่นและไม่กินเครื่อง)
   3 ชั้นหมุนคนละความเร็ว (แกนกลางเร็วสุด ขอบนอกช้าสุด) ให้ความรู้สึกเหมือนกาแลคซีหมุนวนจริง
   ============================================================ */
(function () {
  "use strict";
  const host = document.querySelector(".galaxy"); if (!host) return;
  const small = Math.min(innerWidth, innerHeight) < 720 || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  const S = small ? 1200 : 1800, C = S / 2, R = S * 0.46;
  let seed = 20570;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); };
  const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
  // สีตามระยะจากแกน: ขาวอุ่น → ชมพูจันทร์ → กุหลาบ → ม่วง → ฟ้าน้ำทะเล
  const STOPS = [[0, [255, 244, 236]], [0.18, [255, 214, 210]], [0.38, [249, 170, 190]], [0.58, [214, 120, 170]], [0.78, [150, 150, 230]], [1, [120, 210, 228]]];
  function colorAt(t) { for (let i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) { const a = STOPS[i - 1], b = STOPS[i]; return mix(a[1], b[1], (t - a[0]) / (b[0] - a[0])); } return STOPS[STOPS.length - 1][1]; }
  function layer(cls, draw) {
    const c = document.createElement("canvas"); c.width = c.height = S; c.className = "gx-layer " + cls;
    const x = c.getContext("2d"); x.globalCompositeOperation = "lighter"; draw(x); host.appendChild(c); return c;
  }
  function glow(x, px, py, r, rgb, a) {
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, "rgba(" + rgb + "," + a + ")"); g.addColorStop(1, "rgba(" + rgb + ",0)");
    x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill();
  }
  function star(x, px, py, r, rgb, a) {
    x.fillStyle = "rgba(" + rgb + "," + a + ")"; x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill();
    if (r > 1.1) glow(x, px, py, r * 4.5, rgb, a * 0.22);
  }
  const ARMS = 3, TURN = 3.6;
  function armPoint(t, k, spread) {
    const r = t * R, th = k * 6.2832 / ARMS + t * TURN + gauss() * spread * (0.28 + 0.5 * (1 - t));
    const j = gauss() * R * 0.018 * (0.4 + t);
    return [C + Math.cos(th) * r + j, C + Math.sin(th) * r + gauss() * R * 0.018 * (0.4 + t)];
  }

  // ชั้นนอก: ฝุ่นดาวกระจาย + หมอกเนบิวลาจาง ๆ (หมุนช้าสุด)
  layer("gx-halo", x => {
    glow(x, C, C, R * 1.05, "120,60,110", 0.2);
    glow(x, C, C, R * 0.7, "196,53,86", 0.10);
    for (let i = 0; i < (small ? 70 : 120); i++) {
      const t = 0.25 + rnd() * 0.8, k = i % ARMS, [px, py] = armPoint(t, k, 0.9);
      glow(x, px, py, R * (0.06 + rnd() * 0.12), rnd() < 0.5 ? "123,24,47" : rnd() < 0.5 ? "25,112,116" : "110,80,170", 0.05 + rnd() * 0.05);
    }
    for (let i = 0; i < (small ? 2200 : 4200); i++) {
      const a = rnd() * 6.2832, r = Math.pow(rnd(), 0.55) * R * 1.08;
      const c = colorAt(Math.min(1, r / R)); star(x, C + Math.cos(a) * r, C + Math.sin(a) * r, rnd() < 0.97 ? 0.4 + rnd() * 0.7 : 1.2 + rnd(), c.join(","), 0.25 + rnd() * 0.45);
    }
  });

  // แขนกังหัน: ดาวหนาแน่น + เนบิวลาสีกุหลาบ/ฟ้าตามแนวแขน
  layer("gx-arms", x => {
    for (let i = 0; i < (small ? 160 : 260); i++) {
      const t = 0.12 + Math.pow(rnd(), 0.8) * 0.85, k = i % ARMS, [px, py] = armPoint(t, k, 0.35);
      const pal = t < 0.4 ? "249,170,190" : t < 0.65 ? (rnd() < 0.5 ? "196,53,86" : "214,120,170") : (rnd() < 0.6 ? "134,221,228" : "150,150,230");
      glow(x, px, py, R * (0.025 + rnd() * 0.06), pal, 0.10 + rnd() * 0.12);
    }
    for (let i = 0; i < (small ? 6500 : 12000); i++) {
      const t = Math.pow(rnd(), 0.7), k = i % ARMS, [px, py] = armPoint(t, k, 0.42);
      const c = colorAt(t); const big = rnd() < 0.025;
      star(x, px, py, big ? 1.3 + rnd() * 1.6 : 0.4 + rnd() * 0.9, c.join(","), big ? 1 : 0.45 + rnd() * 0.55);
    }
  });

  // แกนกลาง: แสงสว่าง + คานดาว (หมุนเร็วสุด)
  layer("gx-core", x => {
    glow(x, C, C, R * 0.5, "255,170,190", 0.28);
    glow(x, C, C, R * 0.2, "255,228,220", 0.55);
    glow(x, C, C, R * 0.07, "255,255,250", 0.9);
    for (let i = 0; i < (small ? 1800 : 3200); i++) {
      const along = gauss() * R * 0.16, across = gauss() * R * 0.045, a = 0.5;
      const px = C + Math.cos(a) * along - Math.sin(a) * across, py = C + Math.sin(a) * along + Math.cos(a) * across;
      star(x, px, py, 0.4 + rnd() * 0.9, "255," + (215 + Math.round(rnd() * 35)) + "," + (205 + Math.round(rnd() * 40)), 0.3 + rnd() * 0.5);
    }
  });

  host.classList.add("ready");
})();
