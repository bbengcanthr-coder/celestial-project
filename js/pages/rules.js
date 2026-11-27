/* RULES */
{
  const C = window.Celestial, { $, $$, esc, attr } = C;
  function render(d) {
    const secs = (d.rules || []).slice().sort(C.byOrder);
    if (d.settings.rulesUpdated) $("#rLead").textContent = "กฎของคอมมูที่เด็กฝึก ผู้เล่น และแฟนคลับทุกคนต้องปฏิบัติตาม — ปรับปรุงล่าสุด " + C.fmtDate(d.settings.rulesUpdated, true);
    $("#toc").innerHTML = secs.map((s, i) => '<a href="#' + attr(s.id) + '">' + (i + 1) + ". " + esc(s.title) + "</a>").join("");
    $("#secs").innerHTML = secs.map((s, i) => {
      let body;
      if (s.kind === "table") body = '<table class="penalty"><thead><tr><th>การกระทำ</th><th>บทลงโทษ</th></tr></thead><tbody>' + (s.items || []).map(x => { const p = String(x).split("|"); return "<tr><td>" + esc(p[0].trim()) + "</td><td>" + esc((p[1] || "").trim()) + "</td></tr>"; }).join("") + "</tbody></table>";
      else body = '<ol class="rule-list" style="--sec:\'' + (i + 1) + '\'">' + (s.items || []).map(x => "<li>" + esc(x) + "</li>").join("") + "</ol>";
      return '<section class="rule-sec panel" id="' + attr(s.id) + '"><h2><small>' + (i + 1) + "</small>" + esc(s.title) + "</h2>" + body + "</section>";
    }).join("") || '<div class="empty">ยังไม่มีกฎ</div>';
    const links = $$("#toc a"); const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id)); }), { rootMargin: "-30% 0px -60% 0px" });
    $$(".rule-sec").forEach(s => io.observe(s));
    if (location.hash && !render.jumped) { render.jumped = 1; const t = document.getElementById(location.hash.slice(1)); t && setTimeout(() => t.scrollIntoView(), 50); }
  }
  C.API.loadPublic(render);
}
