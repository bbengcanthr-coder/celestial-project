/* TRAINEES */
{
  const C = window.Celestial, { $, $$, esc } = C;
  let DATA = null; const f = { side: C.qs("side") || "", q: "", pos: "", status: "" };
  function render(d) {
    DATA = d || DATA; if (!DATA) return;
    const q = f.q.trim().toLowerCase();
    const match = t => (!f.side || t.side === f.side) && (!f.status || t.status === f.status) &&
      (!f.pos || String(t.position || "").toLowerCase().includes(f.pos.toLowerCase())) &&
      (!q || [t.name, t.stageName, t.nationality, t.position, t.id].join(" ").toLowerCase().includes(q));
    const all = DATA.trainees.slice().sort((a, b) => (a.side + String(a.no).padStart(3, "0")).localeCompare(b.side + String(b.no).padStart(3, "0")));
    const block = side => {
      const list = all.filter(t => t.side === side && match(t)); if (f.side && f.side !== side) return "";
      return '<h2 class="sub-head ' + (side === "G" ? "g" : "b") + '">' + side + '-TRAINEES <span class="count">' + list.length + " คน — " + (side === "G" ? "ฝั่งหญิง" : "ฝั่งชาย") + "</span></h2>" +
        (list.length ? '<div class="t-grid">' + list.map(t => C.traineeCard(t, DATA)).join("") + "</div>" : '<div class="empty">ไม่พบเด็กฝึกที่ตรงกับตัวกรอง</div>');
    };
    $("#lists").innerHTML = block("B") + block("G");
    $$("#sideSeg button").forEach(b => { b.classList.toggle("on", b.dataset.side === f.side); b.classList.toggle("g", b.dataset.side === "G"); });
  }
  $("#sideSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; f.side = b.dataset.side; render(); });
  let qt; $("#q").addEventListener("input", e => { clearTimeout(qt); qt = setTimeout(() => { f.q = e.target.value; render(); }, 120); });
  $("#pos").addEventListener("change", e => { f.pos = e.target.value; render(); });
  $("#status").addEventListener("change", e => { f.status = e.target.value; render(); });
  $("#lists").addEventListener("click", e => { const c = e.target.closest(".t-card"); if (c && DATA) C.openProfile(c.dataset.id, DATA); });
  C.API.loadPublic(d => { render(d); const id = C.qs("id"); if (id && !render.opened) { render.opened = 1; C.openProfile(id, d); } });
}
