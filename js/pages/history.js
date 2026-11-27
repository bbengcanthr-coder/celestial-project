/* HISTORY */
{
  const C = window.Celestial, { $, esc, attr } = C;
  function render(d) {
    const s = d.settings || {};
    $("#about").textContent = s.about || "";
    const nats = new Set((d.trainees || []).map(t => t.nationality).filter(Boolean));
    $("#stats").innerHTML = [[(s.winners || []).length, "ศิลปินที่เดบิวต์แล้ว"], [(d.trainees || []).length, "เด็กฝึกซีซันนี้"], [nats.size, "สัญชาติ"], [(d.staff || []).length, "ทีมงาน"]].map(x => '<div class="stat"><b>' + x[0] + "</b><span>" + esc(x[1]) + "</span></div>").join("");
    $("#tl").innerHTML = (d.history || []).slice().sort(C.byOrder).map(h => "<li><time>" + esc(h.date) + "</time><h3>" + esc(h.title) + "</h3><p>" + esc(h.body) + "</p>" + (C.imgUrl(h.image) ? '<img src="' + attr(C.imgUrl(h.image)) + '" alt="" loading="lazy">' : "") + "</li>").join("");
    $("#win").innerHTML = (s.winners || []).map(w => '<a class="win-card panel" href="index.html#' + attr(w.id) + '"><img class="m" src="assets/img/moon.png" alt=""><small>' + esc(w.season || "") + "</small><b>" + esc(w.name) + "</b><p>" + esc(w.tagline || "") + '</p><p class="muted" style="margin-top:8px;font-size:13.5px">' + esc((w.members || []).join(", ")) + "</p></a>").join("") || '<div class="empty">ยังไม่มีศิลปินผู้ชนะ</div>';
  }
  C.API.loadPublic(render);
}
