/* FAN LOGIN / REGISTER */
{
  const C = window.Celestial, { $, $$, esc } = C;
  const next = (() => { const n = C.qs("next") || "vote.html"; return /^[\w\-]+\.html(\?[\w=%&\-.]*)?$/.test(n) ? n : "vote.html"; })();
  function mode(m) {
    $$("#auth .seg button").forEach(b => { b.classList.toggle("on", b.dataset.mode === m); b.setAttribute("aria-selected", b.dataset.mode === m); });
    $("#fLogin").classList.toggle("hide", m !== "login"); $("#fReg").classList.toggle("hide", m !== "register");
    const f = m === "login" ? $("#lu") : $("#rn"); f && f.focus();
  }
  function err(form, msg) { const e = form.querySelector("[data-err]"); e.textContent = msg || ""; e.classList.toggle("hide", !msg); }
  function done(res) { C.Fan.set({ token: res.token, user: res.user }); C.toast("ยินดีต้อนรับ " + res.user.displayName); setTimeout(() => location.href = next, 500); }
  function showMe() {
    const s = C.Fan.get(); if (!s) return;
    $("#me").classList.remove("hide"); $("#fLogin").classList.add("hide"); $("#fReg").classList.add("hide"); $("#auth .seg").classList.add("hide");
    $("#me").innerHTML = '<div style="text-align:center"><p class="lead" style="margin:0 auto 16px">คุณเข้าสู่ระบบในชื่อ <b>' + esc(s.user.displayName) + "</b> (@" + esc(s.user.username) + ')</p><div class="toolbar" style="justify-content:center"><a class="btn btn-rose" href="vote.html">ไปหน้าโหวต</a><button class="btn btn-ghost" id="out" type="button">ออกจากระบบ</button></div></div>';
    $("#out").addEventListener("click", () => { C.Fan.clear(); location.reload(); });
  }
  $("#auth .seg").addEventListener("click", e => { const b = e.target.closest("button"); if (b) mode(b.dataset.mode); });
  $$("[data-show]").forEach(b => b.addEventListener("click", () => { const i = b.previousElementSibling; i.type = i.type === "password" ? "text" : "password"; b.textContent = i.type === "password" ? "แสดง" : "ซ่อน"; }));
  $("#fLogin").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, btn = f.querySelector("[type=submit]"); err(f);
    const u = f.username.value.trim(), p = f.password.value; if (!u || !p) return err(f, "กรอกชื่อผู้ใช้และรหัสผ่าน");
    btn.disabled = true; btn.textContent = "กำลังตรวจสอบ…";
    try { done(await C.API.call("fanLogin", { username: u, password: p })); } catch (x) { err(f, x.message); btn.disabled = false; btn.textContent = "เข้าสู่ระบบ"; }
  });
  $("#fReg").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, btn = f.querySelector("[type=submit]"); err(f);
    const d = { displayName: f.displayName.value.trim(), username: f.username.value.trim().toLowerCase(), password: f.password.value };
    if (!d.displayName) return err(f, "กรุณาใส่ชื่อที่แสดง");
    if (!/^[a-z0-9_.]{3,20}$/.test(d.username)) return err(f, "ชื่อผู้ใช้ต้องเป็น a-z, 0-9, _ หรือ . ยาว 3–20 ตัว");
    if (d.password.length < 6) return err(f, "รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");
    if (d.password !== f.password2.value) return err(f, "รหัสผ่านทั้งสองช่องไม่ตรงกัน");
    if (!$("#agree").checked) return err(f, "กรุณายอมรับกฎการโหวตก่อนสมัคร");
    btn.disabled = true; btn.textContent = "กำลังสร้างบัญชี…";
    try { done(await C.API.call("fanRegister", d)); } catch (x) { err(f, x.message); btn.disabled = false; btn.textContent = "สมัครสมาชิกและเข้าสู่ระบบ"; }
  });
  if (C.Fan.get()) showMe(); else mode(C.qs("mode") === "register" ? "register" : "login");
  C.API.loadPublic(() => {});
}
