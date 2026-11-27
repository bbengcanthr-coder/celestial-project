/* RANKING */
{
  const C = window.Celestial, { $, esc, attr } = C;
  let DATA = null, round = C.qs("r") || "";
  function delta(t, rr, idx) {
    const now = C.rankIn(t, rr[idx].id), prev = idx > 0 ? C.rankIn(t, rr[idx - 1].id) : null;
    if (!prev) return idx > 0 ? '<span class="same">NEW</span>' : "";
    const d = prev - now; return d > 0 ? '<span class="up">▲' + d + "</span>" : d < 0 ? '<span class="down">▼' + -d + "</span>" : '<span class="same">—</span>';
  }
  function render(d) {
    DATA = d || DATA; if (!DATA) return;
    const rr = C.rankedRounds(DATA);
    const sel = $("#roundSel");
    if (!rr.length) { $("#rank").innerHTML = '<div class="empty">ยังไม่มีการประกาศอันดับ</div>'; sel.innerHTML = ""; return; }
    if (!rr.some(r => r.id === round)) round = rr[rr.length - 1].id;
    sel.innerHTML = rr.map(r => '<option value="' + attr(r.id) + '"' + (r.id === round ? " selected" : "") + ">【" + esc(r.title) + "】 " + esc(r.code) + "</option>").join("");
    const idx = rr.findIndex(r => r.id === round), R = rr[idx];
    $("#rkLead").textContent = "อันดับหลังรอบ " + R.code + " " + R.title;
    const list = DATA.trainees.filter(t => C.rankIn(t, round)).sort((a, b) => C.rankIn(a, round) - C.rankIn(b, round));
    const cut = Number(((DATA.settings.cutoffs || {})[round]) || 0);
    const card = t => '<div class="rk-card">' + C.traineeCard(t, DATA, { noMeta: false }) + '<span class="rk-n">' + C.rankIn(t, round) + '</span><span class="delta">' + delta(t, rr, idx) + "</span></div>";
    const top = list.slice(0, 5), mid = list.slice(5, 10), rest = list.slice(10);
    let restHtml = "";
    rest.forEach(t => {
      const n = C.rankIn(t, round);
      restHtml += '<button type="button" class="rk-row' + (t.status !== "active" && t.status !== "debut" ? " out" : "") + '" data-id="' + attr(t.id) + '"><span class="rk">' + n + '</span><span class="ph">' + C.portrait(t) + "</span><span><strong>" + esc(t.name) + "</strong><small>" + esc(t.stageName || "") + " — " + esc(C.STATUS[t.status] || "") + "</small></span>" + delta(t, rr, idx) + "</button>";
      if (cut && n === cut) restHtml += '<div class="cutline">เส้นตัดรอบนี้ — อันดับ ' + cut + "</div>";
    });
    $("#rank").innerHTML =
      '<div class="rank-group"><span class="rank-pill">TOP 5</span><div class="rk-top">' + top.map(card).join("") + "</div></div>" +
      (mid.length ? '<div class="rank-group"><span class="rank-pill mid">RANK 6 – 10</span><div class="rk-mid">' + mid.map(card).join("") + "</div>" + (cut === 10 ? '<div class="cutline" style="margin-top:18px">เส้นตัดรอบนี้ — อันดับ 10</div>' : "") + "</div>" : "") +
      (rest.length ? '<div class="rank-group"><span class="rank-pill low">RANK 11 – ' + (10 + rest.length) + '</span><div class="rk-list">' + restHtml + "</div></div>" : "");
  }
  $("#roundSel").addEventListener("change", e => { round = e.target.value; render(); });
  $("#rank").addEventListener("click", e => { const c = e.target.closest("[data-id]"); if (c && DATA) C.openProfile(c.dataset.id, DATA); });
  C.API.loadPublic(render);
}
