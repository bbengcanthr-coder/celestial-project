/* CALENDAR — ปี 2570 (ค.ศ. 2027) */
{
  const C = window.Celestial, { $, $$, esc, attr } = C;
  const YEAR = 2027; let DATA = null;
  const todayISO = C.iso(new Date());
  let month = (() => { const n = new Date(); return n.getFullYear() === YEAR ? n.getMonth() : 0; })();
  const catOf = id => (DATA.settings.categories || []).find(c => c.id === id) || { label: "อื่น ๆ", color: "#9fb3b8" };
  const covers = (e, ds) => ds >= e.date && ds <= (e.end || e.date);
  function render(d) {
    DATA = d || DATA; if (!DATA) return;
    const evs = (DATA.events || []).slice().sort((a, b) => a.date.localeCompare(b.date) || String(a.time).localeCompare(String(b.time)));
    $("#mTitle").textContent = C.TH_M[month] + " " + (YEAR + 543);
    $("#prev").disabled = month === 0; $("#next").disabled = month === 11;
    $("#months").innerHTML = C.TH_MS.map((m, i) => { const has = evs.some(e => +e.date.slice(5, 7) === i + 1 && +e.date.slice(0, 4) === YEAR); return '<button type="button" role="tab" data-m="' + i + '" class="' + (i === month ? "on " : "") + (has ? "has" : "") + '" aria-selected="' + (i === month) + '">' + m + "</button>"; }).join("");
    const first = new Date(YEAR, month, 1), days = new Date(YEAR, month + 1, 0).getDate();
    let html = C.TH_D.map(x => '<div class="cal-dow">' + x + "</div>").join("");
    for (let i = 0; i < first.getDay(); i++) html += '<div class="cal-day blank" aria-hidden="true"></div>';
    for (let dd = 1; dd <= days; dd++) {
      const ds = C.iso(new Date(YEAR, month, dd)); const list = evs.filter(e => covers(e, ds));
      const pills = list.slice(0, 3).map(e => '<span class="ev-pill' + (e.date !== ds ? " cont" : "") + '" style="--ec:' + attr(catOf(e.category).color) + '">' + esc(e.title) + "</span>").join("");
      html += '<button type="button" class="cal-day' + (ds === todayISO ? " today" : "") + (new Date(YEAR, month, dd).getDay() === 0 ? " sun" : "") + '" data-d="' + ds + '" aria-label="' + dd + " " + C.TH_M[month] + (list.length ? " มี " + list.length + " กิจกรรม" : "") + '"><span class="n">' + dd + "</span>" + pills + (list.length > 3 ? '<span class="ev-more">+' + (list.length - 3) + " รายการ</span>" : "") + '<span class="dots">' + list.map(e => '<i style="--ec:' + attr(catOf(e.category).color) + '"></i>').join("") + "</span></button>";
    }
    $("#grid").innerHTML = html;
    $("#legend").innerHTML = (DATA.settings.categories || []).map(c => '<span><i style="--ec:' + attr(c.color) + '"></i>' + esc(c.label) + "</span>").join("");
    const hide = $("#hidePast").checked; const groups = {};
    evs.filter(e => +e.date.slice(0, 4) === YEAR && (!hide || (e.end || e.date) >= todayISO)).forEach(e => (groups[+e.date.slice(5, 7) - 1] = groups[+e.date.slice(5, 7) - 1] || []).push(e));
    $("#agenda").innerHTML = Object.keys(groups).sort((a, b) => a - b).map(m => '<div class="ag-month panel pad"><h3>' + C.TH_M[m] + " " + (YEAR + 543) + "</h3>" + groups[m].map(e => { const dt = C.parseISO(e.date); return '<div class="ag-item' + ((e.end || e.date) < todayISO ? " past" : "") + '" style="--ec:' + attr(catOf(e.category).color) + '"><time>' + esc(e.end && e.end !== e.date ? C.fmtRange(e.date, e.end).replace(/ \d{4}$/, "") : dt.getDate() + " " + C.TH_MS[dt.getMonth()]) + "<small>" + esc(e.time || ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"][dt.getDay()]) + "</small></time><i></i><div><strong>" + esc(e.title) + "</strong>" + (e.desc ? "<p>" + esc(e.desc) + "</p>" : "") + '<p class="muted" style="font-size:12.5px">' + esc(catOf(e.category).label) + "</p></div></div>"; }).join("") + "</div>").join("") || '<div class="empty">ไม่มีกิจกรรม</div>';
  }
  function openDay(ds) {
    const list = (DATA.events || []).filter(e => covers(e, ds)); const d = C.parseISO(ds);
    C.modal('<div class="pad"><span class="eyebrow th">วัน' + esc(["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"][d.getDay()]) + '</span><h3 class="title-sm" style="margin-bottom:12px">' + esc(C.fmtDate(ds, true)) + "</h3>" +
      (list.length ? list.map(e => '<div class="ag-item" style="--ec:' + attr(catOf(e.category).color) + ';grid-template-columns:10px minmax(0,1fr)"><i></i><div><strong>' + esc(e.title) + "</strong><p>" + esc(C.fmtRange(e.date, e.end)) + (e.time ? " — " + esc(e.time) : "") + "</p>" + (e.desc ? "<p>" + esc(e.desc) + "</p>" : "") + '<p class="muted" style="font-size:12.5px">' + esc(catOf(e.category).label) + "</p></div></div>").join("") : '<p class="muted">ไม่มีกิจกรรมในวันนี้</p>') + "</div>", { size: "sm" });
  }
  $("#prev").addEventListener("click", () => { if (month > 0) { month--; render(); } });
  $("#next").addEventListener("click", () => { if (month < 11) { month++; render(); } });
  $("#months").addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (b) { month = +b.dataset.m; render(); } });
  $("#grid").addEventListener("click", e => { const b = e.target.closest("[data-d]"); if (b) openDay(b.dataset.d); });
  $("#hidePast").addEventListener("change", () => render());
  C.API.loadPublic(render);
}
