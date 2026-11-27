/* STAFF */
{
  const C = window.Celestial, { $, esc } = C;
  function render(d) {
    const list = (d.staff || []).slice().sort(C.byOrder); const teams = [];
    list.forEach(s => { const k = s.team || "ทีมงาน"; let g = teams.find(x => x.k === k); if (!g) teams.push(g = { k, items: [] }); g.items.push(s); });
    $("#teams").innerHTML = teams.map(g => '<div class="team"><h2 class="sub-head">' + esc(g.k) + ' <span class="count">' + g.items.length + " คน</span></h2><div class=\"staff-grid\">" + g.items.map(s =>
      '<article class="staff-card panel"><span class="ph">' + C.portrait({ id: s.id, name: s.name, pal: s.order % 2 ? "rose" : "aqua", photo: s.avatar }) + '</span><span class="role">' + esc(s.role) + "</span><h3>" + esc(s.name) + "</h3>" + (s.bio ? "<p>" + esc(s.bio) + "</p>" : "") + (s.quote ? "<blockquote>“" + esc(s.quote) + "”</blockquote>" : "") + (s.contact ? '<span class="contact">' + esc(s.contact) + "</span>" : "") + "</article>").join("") + "</div></div>").join("") || '<div class="empty">ยังไม่มีข้อมูลทีมงาน</div>';
  }
  C.API.loadPublic(render);
}
