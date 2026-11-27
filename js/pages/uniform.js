/* UNIFORM */
{
  const C = window.Celestial, { $, esc, attr } = C;
  function garment(u) {
    const c = u.color || "#86DDE4";
    if (u.garment === "stage") return '<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M62 38 84 30c4 10 28 10 32 0l22 8 34 26-14 30-18-10v86H60V84L42 94 28 64Z" fill="' + attr(c) + '"/><path d="M84 30 100 70 116 30" fill="none" stroke="#7B182F" stroke-width="3"/><path d="M100 70v104" stroke="rgba(0,0,0,.18)" stroke-width="2"/><g fill="#7B182F"><circle cx="100" cy="92" r="3"/><circle cx="100" cy="116" r="3"/><circle cx="100" cy="140" r="3"/></g><path d="m130 88 3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#C43556"/></svg>';
    return '<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M60 36 86 26h28l26 10 36 32-16 30-20-14v92H60V84L40 98 24 68Z" fill="' + attr(c) + '"/><path d="M60 36 86 26h28l26 10" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/><path d="M86 26c2 14 26 14 28 0" fill="#04161B" opacity=".45"/><path d="M100 40v136" stroke="rgba(0,0,0,.28)" stroke-width="3"/><path d="M140 84V176M60 84v92" stroke="rgba(0,0,0,.12)" stroke-width="2"/><path d="M28 66 44 52M172 66 156 52" stroke="rgba(255,255,255,.5)" stroke-width="5" stroke-linecap="round"/><circle cx="78" cy="70" r="9" fill="none" stroke="#fff" stroke-width="2" opacity=".85"/><path d="M71 70h14M78 63v14" stroke="#fff" stroke-width="1.5" opacity=".85"/><rect x="108" y="64" width="22" height="10" rx="2" fill="#fff" opacity=".85"/></svg>';
  }
  function render(d) {
    const list = (d.uniforms || []).slice().sort(C.byOrder);
    $("#uni").innerHTML = list.map(u => {
      const src = C.imgUrl(u.image); const tag = u.label || (u.tier ? "ชุดหลัก" : "ชุดพิเศษ");
      return '<article class="uni-card panel" style="--uc:' + attr(u.color || "#86DDE4") + '"><div class="uni-fig">' + (src ? '<img src="' + attr(src) + '" alt="' + attr(u.name) + '" loading="lazy">' : garment(u)) + '<span class="uni-tier chip">' + esc(tag) + '</span></div><div class="uni-body"><h3>' + esc(u.name) + "</h3><p>" + esc(u.desc || "") + '</p><span class="swatch"><i></i>' + esc(u.color || "") + "</span></div></article>";
    }).join("") || '<div class="empty">ยังไม่มีข้อมูลชุด</div>';
    $("#notes").innerHTML = (d.settings.uniformNotes || []).map(n => "<li>" + esc(n) + "</li>").join("") || '<li class="muted">ยังไม่มีข้อกำหนด</li>';
  }
  C.API.loadPublic(render);
}
