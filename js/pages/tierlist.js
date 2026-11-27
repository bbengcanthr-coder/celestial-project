/* TIER LIST */
{
  const C = window.Celestial, { $, $$, esc, attr } = C;
  let DATA = null, side = "";
  function lum(hex) { const m = String(hex).replace("#", ""); if (m.length < 6) return 1; const [r, g, b] = [0, 2, 4].map(i => parseInt(m.substr(i, 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
  function render(d) {
    DATA = d || DATA; if (!DATA) return;
    const tiers = (DATA.settings.tiers || []);
    const pool = DATA.trainees.filter(t => !side || t.side === side).sort((a, b) => (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1) || a.side.localeCompare(b.side) || a.no - b.no);
    const item = t => '<button type="button" class="tier-item' + (t.status === "eliminated" || t.status === "withdrawn" ? " out" : "") + '" data-side="' + attr(t.side) + '" data-id="' + attr(t.id) + '"><span class="ph">' + C.portrait(t) + "</span><span>" + esc(t.stageName || t.name) + "</span></button>";
    const rows = tiers.map(ti => {
      const list = pool.filter(t => t.tier === ti.id);
      return '<div class="tier-row"><div class="tier-label' + (lum(ti.color) < 0.42 ? " dark" : "") + '" style="--tc:' + attr(ti.color) + '"><b>' + esc(ti.label) + "</b><small>" + esc(ti.desc || "") + '</small></div><div class="tier-items">' + (list.length ? list.map(item).join("") : '<span class="tier-empty">ยังไม่มีเด็กฝึกในเทียร์นี้</span>') + "</div></div>";
    });
    const none = pool.filter(t => !tiers.some(ti => ti.id === t.tier));
    if (none.length) rows.push('<div class="tier-row"><div class="tier-label dark" style="--tc:#0c3540"><b>?</b><small>ยังไม่จัดเทียร์</small></div><div class="tier-items">' + none.map(item).join("") + "</div></div>");
    $("#board").innerHTML = rows.join("") || '<div class="empty">ยังไม่ได้ตั้งค่าเทียร์</div>';
    $$("#sideSeg button").forEach(b => b.classList.toggle("on", b.dataset.side === side));
  }
  $("#sideSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { side = b.dataset.side; render(); } });
  $("#board").addEventListener("click", e => { const c = e.target.closest("[data-id]"); if (c && DATA) C.openProfile(c.dataset.id, DATA); });
  C.API.loadPublic(render);
}
