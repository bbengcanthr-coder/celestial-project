/* TRAINEES */
{
  const C = window.Celestial, { $ } = C;
  let DATA = null; const f = { q: "", pos: "", status: "" };
  function render(d) {
    DATA = d || DATA; if (!DATA) return;
    const q = f.q.trim().toLowerCase();
    const match = t => (!f.status || t.status === f.status) &&
      (!f.pos || String(t.position || "").toLowerCase().includes(f.pos.toLowerCase())) &&
      (!q || [t.name, t.stageName, t.nationality, t.position, t.id].join(" ").toLowerCase().includes(q));
    const all = DATA.trainees.slice().sort((a, b) => (Number(a.no) || 0) - (Number(b.no) || 0) || String(a.id).localeCompare(String(b.id)));
    const list = all.filter(match);
    $("#lists").innerHTML = '<h2 class="sub-head b">TRAINEES <span class="count">' + (list.length === all.length ? all.length + " คน" : list.length + " จาก " + all.length + " คน") + "</span></h2>" +
      (list.length ? '<div class="t-grid">' + list.map(t => C.traineeCard(t, DATA)).join("") + "</div>" : '<div class="empty">ไม่พบเด็กฝึกที่ตรงกับตัวกรอง</div>');
  }
  let qt; $("#q").addEventListener("input", e => { clearTimeout(qt); qt = setTimeout(() => { f.q = e.target.value; render(); }, 120); });
  $("#pos").addEventListener("change", e => { f.pos = e.target.value; render(); });
  $("#status").addEventListener("change", e => { f.status = e.target.value; render(); });
  $("#lists").addEventListener("click", e => { const c = e.target.closest(".t-card"); if (c && DATA) C.openProfile(c.dataset.id, DATA); });
  C.API.loadPublic(d => { render(d); const id = C.qs("id"); if (id && !render.opened) { render.opened = 1; C.openProfile(id, d); } });
}
