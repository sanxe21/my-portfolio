/* Страница «Мои работы»: шапка, тема, фильтр по нишам, карточки и окно кейса */
(() => {
const $ = s => document.querySelector(s), root = document.documentElement;
const mm = matchMedia("(prefers-reduced-motion: reduce)"), fine = matchMedia("(pointer: fine)").matches;
const OWNER = { name: "Александр Поволоцкий", brand: "pvltsk", telegram: "@pvltskyak" };
const tgUrl = "https://t.me/" + OWNER.telegram.replace("@", "");
const tgIcon='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.5 3.5 2.8 10.7c-.9.4-.9 1.1-.2 1.3l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3-14.1c.3-1.2-.5-1.8-1.5-1.3z"/></svg>';
const wordmark='<svg class="wm" viewBox="0 0 126 40" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle class="d" style="--i:0" cx="14" cy="19" r="9" pathLength="1"/><path class="d" style="--i:0" d="M5 10v26" pathLength="1"/><path class="d" style="--i:1" d="M26 10l9 18 9-18" pathLength="1"/><path class="d ac" style="--i:2" d="M54 2v26" pathLength="1"/><path class="d" style="--i:3" d="M66 4v18a6 6 0 0 0 6 6" pathLength="1"/><path class="d" style="--i:3" d="M60 12h12" pathLength="1"/><path class="d" style="--i:4" d="M90 13c-3-4-11-3-11 2s11 3 11 8-9 5-12 1" pathLength="1"/><path class="d" style="--i:5" d="M100 2v26" pathLength="1"/><path class="d" style="--i:5" d="M112 10L101 20l12 8" pathLength="1"/><circle class="dot" cx="121" cy="26" r="2.4"/></svg>';
const menu = [["index.html#services","Услуги"],["index.html#decks","Презентации"],["index.html#interiors","Интерьеры"],["index.html#about","Обо мне"],["index.html#contact","Контакты"]];
const works = typeof WORKS !== "undefined" && Array.isArray(WORKS) ? WORKS : [];
const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const nbRe = /(^|[\s«(])(в|к|с|у|и|а|о|на|за|по|из|от|до|для|не|но)\s+/gi;
const nbs = t => t.replace(nbRe, "$1$2 ").replace(nbRe, "$1$2 ").replace(/\s+—/g, " —");
function nb(el){ const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const v = nbs(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v } }
const img = (src, alt, extra = "") => `<img src="${esc(src)}" alt="${esc(alt)}" ${extra} onerror="this.closest('.cov,.cmp').classList.add('noimg');this.remove()">`;
const PH = 'data-ph="Изображение скоро появится"';

/* шапка, подвал, кнопки */
$("#logo").innerHTML = wordmark; $("#logo").setAttribute("aria-label", OWNER.brand + " — на главную");
$("#fwm").innerHTML = wordmark;
$("#menu").innerHTML = menu.map(m => `<li><a href="${m[0]}">${m[1]}</a></li>`).join("") + '<li><a class="nav-work" href="works.html" aria-current="page">Мои работы</a></li>';
document.querySelectorAll("[data-tg]").forEach(a => { a.href = tgUrl; a.innerHTML = tgIcon + esc(a.dataset.tg) });
$("#fab").href = tgUrl; $("#fab").innerHTML = tgIcon;
$("#copyright").textContent = "© " + new Date().getFullYear() + " " + OWNER.name + ". Все права защищены.";

/* фильтр и карточки */
const niches = [...new Set(works.map(w => w.niche).filter(Boolean))];
let filter = "Все";
const chips = $("#chips"), grid = $("#wk");
if (niches.length > 1) {
  const all = [["Все", works.length], ...niches.map(n => [n, works.filter(w => w.niche === n).length])];
  chips.innerHTML = all.map(([n, c]) => `<button class="chip" type="button" data-n="${esc(n)}" aria-pressed="${n === filter}">${esc(n)}<i>${c}</i></button>`).join("");
  chips.addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; filter = b.dataset.n;
    chips.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", c === b)); draw(true) });
} else chips.remove();
function card(w){
  return `<button class="card wcard rv" type="button" data-id="${esc(w.id)}" data-cur="Открыть" aria-haspopup="dialog">
<div class="cov" ${PH}>${img(w.cover, w.coverAlt || w.title, 'loading="lazy"')}</div>
<div class="wb"><div class="meta"><b>${esc(w.niche)}</b><span>${esc(w.type)}</span></div><h3>${esc(w.title)}</h3><p>${esc(w.summary)}</p>${w.badge ? `<span class="badge">${esc(w.badge)}</span>` : ""}<span class="more">Смотреть кейс</span></div></button>`;
}
function draw(again){
  const list = works.filter(w => filter === "Все" || w.niche === filter);
  grid.classList.toggle("solo", list.length === 1);
  grid.innerHTML = list.map(card).join("");
  $("#wkEmpty").hidden = list.length > 0;
  nb(grid);
  if (again) grid.querySelectorAll(".rv").forEach(c => c.classList.add("in", "done"));
}
draw(false);
grid.addEventListener("click", e => { const b = e.target.closest(".wcard"); if (b) open(b.dataset.id, b) });

/* окно кейса */
const ov = $("#ov"), modal = $("#modal"), mc = $("#mContent");
let opener = null;
function body(w){
  const c = w.compare;
  const media = c ? `<div><div class="cmp" style="--pos:50%${c.ratio ? ";aspect-ratio:" + esc(c.ratio) : ""}">${img(c.before.src, c.before.alt || c.before.label)}<div class="cb">${img(c.after.src, c.after.alt || c.after.label)}</div>
<span class="cmp-h" aria-hidden="true"></span><span class="cmp-l l1" aria-hidden="true">${esc(c.before.label)}</span><span class="cmp-l l2" aria-hidden="true">${esc(c.after.label)}</span>
<input type="range" min="0" max="100" value="50" aria-label="Сравнение кадров: ${esc(c.before.label)} и ${esc(c.after.label)}"></div>
<p class="cmp-hint">Потяните ползунок, чтобы сравнить: ${esc(c.before.label.toLowerCase())} и ${esc(c.after.label.toLowerCase())}.</p></div>`
    : `<div class="cov m-cover" ${PH}>${img(w.cover, w.coverAlt || w.title)}</div>`;
  const gal = (w.gallery || []).length ? `<div class="gal">${w.gallery.map(g => `<figure><div class="cov" ${PH}>${img(g.src, g.alt || "", 'loading="lazy"')}</div>${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ""}</figure>`).join("")}</div>` : "";
  const blk = (t, h) => h ? `<div class="blk"><h3>${t}</h3>${h}</div>` : "";
  return `<div class="mh"><div class="meta"><b>${esc(w.niche)}</b><span>${esc(w.type)}</span></div><h2 id="mTitle">${esc(w.title)}</h2><p>${esc(w.summary)}</p>${w.badge ? `<span class="badge">${esc(w.badge)}</span>` : ""}</div>
<div class="mb">${media}<div class="mg">
${blk("Задача", w.task ? `<p>${esc(w.task)}</p>` : "")}
${blk("Что сделано", (w.done || []).length ? `<ul class="ck">${w.done.map(d => `<li>${esc(d)}</li>`).join("")}</ul>` : "")}
${blk("Инструменты", (w.tools || []).length ? `<div class="pills">${w.tools.map(t => `<span>${esc(t)}</span>`).join("")}</div>` : "")}
${blk("Итог", w.result ? `<p>${esc(w.result)}</p>` : "")}
</div>${gal}
<div class="mf"><p>Похожая задача? Напишите — обсудим.</p><a class="btn btn-p" href="${tgUrl}" target="_blank" rel="noopener noreferrer">${tgIcon}Обсудить проект</a></div></div>`;
}
function open(id, from){
  const w = works.find(x => x.id === id); if (!w) return;
  opener = from || null; mc.innerHTML = body(w); nb(mc);
  document.querySelectorAll(".cur,.cur-d").forEach(el => el.classList.remove("lbl", "hov", "off"));
  const cmp = mc.querySelector(".cmp");
  if (cmp) { const r = cmp.querySelector("input"); r.addEventListener("input", () => cmp.style.setProperty("--pos", r.value + "%")) }
  ov.classList.add("open"); document.body.classList.add("lock"); ov.scrollTop = 0;
  $("#mClose").focus();
  try { history.replaceState(null, "", "#" + id) } catch (_) {}
}
function close(){
  if (!ov.classList.contains("open")) return;
  ov.classList.remove("open"); document.body.classList.remove("lock");
  try { history.replaceState(null, "", location.pathname + location.search) } catch (_) {}
  if (opener && document.body.contains(opener)) opener.focus(); opener = null;
}
$("#mClose").addEventListener("click", close);
ov.addEventListener("click", e => { if (e.target === ov) close() });
document.addEventListener("keydown", e => {
  if (!ov.classList.contains("open")) { if (e.key === "Escape") menuEl.classList.remove("open"); return }
  if (e.key === "Escape") { close(); return }
  if (e.key === "Tab") {
    const f = [...modal.querySelectorAll('button,a[href],input,[tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null);
    if (!f.length) return; const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
  }
});
const fromHash = () => { const id = decodeURIComponent(location.hash.slice(1)); if (id && works.some(w => w.id === id)) open(id, grid.querySelector(`[data-id="${CSS.escape(id)}"]`)) };
fromHash(); addEventListener("hashchange", fromHash);

/* меню */
const burger = $("#burger"), menuEl = $("#menu");
burger.onclick = () => { const o = menuEl.classList.toggle("open"); burger.setAttribute("aria-expanded", o) };
menuEl.addEventListener("click", e => { if (e.target.closest("a")) { menuEl.classList.remove("open"); burger.setAttribute("aria-expanded", "false") } });

/* тема */
const tbtn = $("#theme");
const curTheme = () => root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
function paintBtn(){ const d = curTheme() === "dark"; tbtn.setAttribute("aria-label", d ? "Включить светлую тему" : "Включить тёмную тему"); tbtn.classList.toggle("is-dark", d) }
function setTheme(t){ root.dataset.theme = t; try { localStorage.setItem("theme", t) } catch (_) {} paintBtn() }
paintBtn();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (!root.dataset.theme) paintBtn() });
tbtn.addEventListener("click", () => { const next = curTheme() === "dark" ? "light" : "dark";
  if (!document.startViewTransition || mm.matches) { setTheme(next); return }
  const r0 = tbtn.getBoundingClientRect(), x = r0.left + r0.width / 2, y = r0.top + r0.height / 2, R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(() => setTheme(next));
  vt.ready.then(() => root.animate({ clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + R + "px at " + x + "px " + y + "px)"] }, { duration: 1000, easing: "cubic-bezier(.22,1,.36,1)", pseudoElement: "::view-transition-new(root)" })).catch(() => {}) });

/* появление, прогресс прокрутки, подсветка карточек */
nb(document.body);
const els = document.querySelectorAll(".rv,.lines");
if (mm.matches || !("IntersectionObserver" in window)) els.forEach(e => e.classList.add("in", "done"));
else { const io = new IntersectionObserver(en => en.forEach(x => { if (x.isIntersecting) { x.target.classList.add("in"); setTimeout(() => x.target.classList.add("done"), 1100); io.unobserve(x.target) } }), { threshold: .12 }); els.forEach(e => io.observe(e)) }
const bar = $("#bar"); let tick = false;
const prog = () => { tick = false; const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, scrollY / h) : 0) + ")" };
addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(prog) } }, { passive: true }); prog();
if (fine && !mm.matches) {
  document.addEventListener("pointermove", e => { const c = e.target.closest && e.target.closest(".card"); if (c) { const r = c.getBoundingClientRect(); c.style.setProperty("--mx", e.clientX - r.left + "px"); c.style.setProperty("--my", e.clientY - r.top + "px") } });
  /* курсор-спутник */
  const ring = document.createElement("div"); ring.className = "cur"; ring.setAttribute("aria-hidden", "true"); ring.innerHTML = '<span class="cur-i"></span><span class="cur-t"></span>';
  const dot = document.createElement("div"); dot.className = "cur-d"; dot.setAttribute("aria-hidden", "true"); document.body.append(ring, dot);
  const lab = ring.querySelector(".cur-t"); let cx = -100, cy = -100, rx = -100, ry = -100, seen = false;
  addEventListener("pointermove", e => { if (e.pointerType !== "mouse") return; cx = e.clientX; cy = e.clientY;
    if (!seen) { seen = true; rx = cx; ry = cy; ring.classList.add("on"); dot.classList.add("on") }
    const t = e.target, l = t.closest && t.closest("[data-cur]"), h = t.closest && t.closest("a,button,input");
    ring.classList.toggle("hov", !!h && !l); ring.classList.toggle("lbl", !!l); dot.classList.toggle("off", !!l);
    if (l && lab.textContent !== l.dataset.cur) lab.textContent = l.dataset.cur }, { passive: true });
  root.addEventListener("mouseleave", () => { seen = false; ring.classList.remove("on"); dot.classList.remove("on") });
  (function f(){ rx += (cx - rx) * .16; ry += (cy - ry) * .16; ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)"; dot.style.transform = "translate3d(" + cx + "px," + cy + "px,0)"; requestAnimationFrame(f) })();
}
})();
