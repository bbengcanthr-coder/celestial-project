/* ROUNDS */
{
  const C = window.Celestial, { $, esc, attr } = C;
  const ST = { live: ['<span class="chip live">กำลังแข่งขัน</span>', "กำลังแข่งขัน"], done: ['<span class="chip done">จบรอบแล้ว</span>', "จบรอบแล้ว"], soon: ['<span class="chip soon">เร็ว ๆ นี้</span>', "เร็ว ๆ นี้"] };
  let DATA = null;
  function render(d) {
    DATA = d || DATA; if (!DATA) return;
    const rounds = (DATA.rounds || []).slice().sort(C.byOrder); const id = C.qs("r");
    const r = rounds.find(x => x.id === id);
    $("#tabs").innerHTML = '<a class="round-tab' + (!r ? " on" : "") + '" href="rounds.html"><small>ALL</small><b>ภาพรวม</b></a>' + rounds.map(x => '<a class="round-tab' + (r && r.id === x.id ? " on" : "") + '" href="rounds.html?r=' + encodeURIComponent(x.id) + '"' + (r && r.id === x.id ? ' aria-current="page"' : "") + "><small>" + esc(x.code) + "</small><b>" + esc(x.title) + "</b>" + (ST[x.status] ? ST[x.status][0] : "") + "</a>").join("");
    if (!r) {
      $("#round").innerHTML = '<div class="rounds-overview" style="margin-top:10px">' + rounds.map(x => '<a class="ro-card panel" href="rounds.html?r=' + encodeURIComponent(x.id) + '"><small>' + esc(x.code) + "</small><b>" + esc(x.title) + "</b><p>" + esc(x.subtitle || "") + '</p><div class="feature-meta">' + (ST[x.status] ? ST[x.status][0] : "") + '<span class="chip">' + esc(C.fmtRange(x.start, x.end)) + "</span></div></a>").join("") + "</div>";
      document.title = "กติกาแต่ละรอบ — THE CELESTIAL : PROJECT"; return;
    }
    document.title = r.title + " (" + r.code + ") — THE CELESTIAL : PROJECT";
    const src = C.imgUrl(r.banner);
    const dates = [["เริ่มรอบ", r.start], ["ส่งงาน", r.deadline], ["ประกาศผล", r.end]].filter(x => x[1]);
    const evs = (DATA.events || []).filter(e => e.date >= (r.start || "9") && e.date <= (r.end || "0")).sort((a, b) => a.date.localeCompare(b.date));
    $("#round").innerHTML =
      '<div class="round-hero panel">' + (src ? '<div class="bg"><img src="' + attr(src) + '" alt=""></div>' : "") + '<span class="eyebrow">' + esc(r.code) + "</span><h1>【" + esc(r.title) + '】</h1><div class="sub">' + esc(r.subtitle || "") + '</div><div class="feature-meta" style="margin-top:16px">' + (ST[r.status] ? ST[r.status][0] : "") + '<span class="chip">' + esc(C.fmtRange(r.start, r.end)) + '</span></div><p class="lead" style="margin-top:16px">' + esc(r.summary || "") + "</p>" +
      '<div class="toolbar" style="margin-top:20px">' + (r.doc ? '<a class="btn btn-rose" href="' + attr(r.doc) + '" target="_blank" rel="noopener">เปิดเอกสารภารกิจ</a>' : "") + (r.video ? '<a class="btn btn-ghost" href="' + attr(r.video) + '" target="_blank" rel="noopener">ดูคลิปการแสดง</a>' : "") + (r.status === "done" ? '<a class="btn btn-ghost" href="ranking.html?r=' + encodeURIComponent(r.id) + '">ดูอันดับรอบนี้</a>' : "") + "</div></div>" +
      '<div class="round-grid"><div class="panel"><h3>กติการอบนี้</h3>' + ((r.rules || []).length ? '<ol class="steps">' + r.rules.map(x => "<li>" + esc(x) + "</li>").join("") + "</ol>" : '<p class="muted">ทีมงานจะประกาศกติกาเร็ว ๆ นี้</p>') + "</div>" +
      '<div style="display:grid;gap:18px;align-content:start"><div class="panel"><h3>เกณฑ์คะแนน</h3>' + ((r.scoring || []).length ? '<table class="score"><tbody>' + r.scoring.map(x => "<tr><td>" + esc(x.label) + "</td><td>" + esc(x.value) + "</td></tr>").join("") + "</tbody></table>" : '<p class="muted">ยังไม่ประกาศ</p>') + "</div>" +
      '<div class="panel"><h3>วันสำคัญ</h3><ul class="dates">' + dates.map(x => "<li><span>" + esc(x[0]) + "</span><b>" + esc(C.fmtDate(x[1], true)) + "</b></li>").join("") + evs.filter(e => !dates.some(x => x[1] === e.date)).slice(0, 6).map(e => "<li><span>" + esc(e.title) + "</span><b>" + esc(C.fmtRange(e.date, e.end)) + "</b></li>").join("") + "</ul></div></div></div>";
  }
  C.API.loadPublic(render);
}
