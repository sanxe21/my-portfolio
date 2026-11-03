/* Страница «Мои работы»: шапка, тема, фильтр по нишам, карточки и окно кейса */
(() => {
const $ = s => document.querySelector(s), root = document.documentElement;
const mm = matchMedia("(prefers-reduced-motion: reduce)"), fine = matchMedia("(pointer: fine)").matches;
const OWNER = { name: "Александр Поволоцкий", brand: "pvltsk", telegram: "@pvltskyak" };
const tgUrl = "https://t.me/" + OWNER.telegram.replace("@", "");
const tgIcon='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.5 3.5 2.8 10.7c-.9.4-.9 1.1-.2 1.3l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3-14.1c.3-1.2-.5-1.8-1.5-1.3z"/></svg>';
const wordmark='<svg class="wm" viewBox="0 0 126 40" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle class="d" style="--i:0" cx="14" cy="19" r="9" pathLength="1"/><path class="d" style="--i:0" d="M5 10v26" pathLength="1"/><path class="d" style="--i:1" d="M26 10l9 18 9-18" pathLength="1"/><path class="d ac" style="--i:2" d="M54 2v26" pathLength="1"/><path class="d" style="--i:3" d="M66 4v18a6 6 0 0 0 6 6" pathLength="1"/><path class="d" style="--i:3" d="M60 12h12" pathLength="1"/><path class="d" style="--i:4" d="M90 13c-3-4-11-3-11 2s11 3 11 8-9 5-12 1" pathLength="1"/><path class="d" style="--i:5" d="M100 2v26" pathLength="1"/><path class="d" style="--i:5" d="M112 10L101 20l12 8" pathLength="1"/><circle class="dot" cx="121" cy="26" r="2.4"/></svg>';
const menu = [["index.html#services","Услуги"],["index.html#decks","Презентации"],["index.html#interiors","Интерьеры"],["index.html#about","Обо мне"],["index.html#contact","Контакты"]];
/* ?preview — показать черновики; ?preview=local — предпросмотр из админки, ещё не опубликованный */
const preview = /[?&]preview\b/.test(location.search);
let src = typeof WORKS !== "undefined" && Array.isArray(WORKS) ? WORKS : [];
if (/[?&]preview=local\b/.test(location.search)) { try { const p = JSON.parse(localStorage.getItem("pvltsk-preview")); if (Array.isArray(p)) src = p } catch (_) {} }
const works = src.filter(w => w && (preview || !w.draft));
if (preview) { const t = document.createElement("div"); t.className = "pv-tag"; t.textContent = "Предпросмотр: черновики видны только вам"; document.body.append(t) }
const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const nbRe = /(^|[\s«(])(в|к|с|у|и|а|о|на|за|по|из|от|до|для|не|но)\s+/gi;
const nbs = t => t.replace(nbRe, "$1$2 ").replace(nbRe, "$1$2 ").replace(/\s+—/g, " —");
function nb(el){ const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const v = nbs(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v } }
const img = (src, alt, extra = "") => `<img src="${esc(src)}" alt="${esc(alt)}" ${extra} onerror="this.closest('.cov,.cmp,.car-i,.doc-cv').classList.add('noimg');this.remove()">`;
const arrow = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"}"/></svg>`;
const isTall = g => g.w && g.h && g.h / g.w > 1.35;
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return n + " " + (m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c) };
const mb = n => !n ? "" : n < 1048576 ? Math.max(1, Math.round(n / 1024)) + " КБ" : (n / 1048576 < 10 ? (n / 1048576).toFixed(1).replace(".", ",") : Math.round(n / 1048576)) + " МБ";
const docsOf = w => (w.docs || []).filter(d => d && d.pages && d.pages.length);
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
<div class="wb"><div class="meta"><b>${esc(w.niche)}</b><span>${esc(w.type)}</span>${docsOf(w).length ? '<span class="m-pdf">PDF-альбом</span>' : ""}</div><h3>${esc(w.title)}</h3><p>${esc(w.summary)}</p>${w.badge ? `<span class="badge">${esc(w.badge)}</span>` : ""}<span class="more">Смотреть кейс</span></div></button>`;
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
let opener = null, curGal = [];
/* карусель фото */
function car(G){
  const n = G.length;
  const sl = G.map((g, i) => `<figure class="car-s" role="group" aria-roledescription="слайд" aria-label="${i + 1} из ${n}">
<button class="car-i${isTall(g) ? " tall" : ""}" type="button" data-i="${i}" data-cur="Открыть" aria-label="Открыть фото ${i + 1} из ${n} на весь экран" ${PH}>${img(g.src, g.alt || g.caption || "", i ? 'loading="lazy"' : "")}${isTall(g) ? '<span class="car-tag">Длинный скриншот — откройте целиком</span>' : ""}</button>
${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ""}</figure>`).join("");
  const ctl = n > 1 ? `<div class="car-c"><button class="car-b" type="button" data-d="-1" aria-label="Предыдущее фото">${arrow(0)}</button><span class="car-n" aria-live="polite">1 / ${n}</span><button class="car-b" type="button" data-d="1" aria-label="Следующее фото">${arrow(1)}</button></div>
<div class="car-t">${G.map((g, i) => `<button type="button" data-t="${i}" aria-label="Фото ${i + 1}"${i ? "" : ' aria-current="true"'}><img src="${esc(g.src)}" alt="" loading="lazy" onerror="this.remove()"></button>`).join("")}</div>` : "";
  return `<div class="car" data-g='${esc(JSON.stringify(G.map(g => ({ src: g.src, alt: g.alt || "", caption: g.caption || "", tall: !!isTall(g) }))))}'><div class="car-v" tabindex="0" role="region" aria-roledescription="карусель" aria-label="Фото проекта: ${n}">${sl}</div>${ctl}</div>`;
}
function initCar(c){
  const v = c.querySelector(".car-v"), num = c.querySelector(".car-n"), th = [...c.querySelectorAll(".car-t button")], n = v.children.length;
  const G = JSON.parse(c.dataset.g); let i = 0, t = 0;
  const go = k => { i = Math.max(0, Math.min(n - 1, k)); v.scrollTo({ left: i * v.clientWidth, behavior: mm.matches ? "auto" : "smooth" }) };
  const paint = () => { if (num) num.textContent = (i + 1) + " / " + n;
    th.forEach((b, k) => { if (k === i) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current") });
    const a = th[i]; if (a) { const p = a.parentNode; p.scrollTo({ left: a.offsetLeft - (p.clientWidth - a.offsetWidth) / 2, behavior: "smooth" }) } };
  v.addEventListener("scroll", () => { clearTimeout(t); t = setTimeout(() => { const k = Math.round(v.scrollLeft / v.clientWidth); if (k !== i) { i = k; paint() } }, 60) }, { passive: true });
  c.addEventListener("click", e => { const b = e.target.closest(".car-b"), tb = e.target.closest("[data-t]"), s = e.target.closest(".car-i");
    if (b) { go(i + +b.dataset.d); paint() }
    else if (tb) { go(+tb.dataset.t); paint() }
    else if (s) lbOpen(G, +s.dataset.i, s) });
  v.addEventListener("keydown", e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); go(i + (e.key === "ArrowRight" ? 1 : -1)); paint() } });
  addEventListener("resize", () => { v.scrollLeft = i * v.clientWidth }, { passive: true });
}
/* просмотр на весь экран */
const lb = document.createElement("div");
lb.className = "lb"; lb.hidden = true; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Просмотр фото");
lb.innerHTML = `<div class="lb-top"><span class="lb-n" aria-live="polite"></span><button class="lb-x" type="button" aria-label="Закрыть просмотр"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
<div class="lb-sc"><img alt=""></div><p class="lb-cap"></p>
<button class="lb-b p" type="button" aria-label="Предыдущее фото">${arrow(0)}</button><button class="lb-b n" type="button" aria-label="Следующее фото">${arrow(1)}</button>`;
document.body.append(lb);
const lbImg = lb.querySelector("img"), lbSc = lb.querySelector(".lb-sc");
let lbI = 0, lbFrom = null;
function lbShow(k){
  lbI = (k + curGal.length) % curGal.length; const g = curGal[lbI];
  lbImg.src = g.src; lbImg.alt = g.alt || g.caption || ""; lbImg.classList.toggle("tall", g.tall); lbImg.classList.remove("zoom"); lbImg.classList.toggle("zm", !g.tall); lbSc.scrollTop = 0;
  [1, -1].forEach(o => { const nx = curGal[(lbI + o + curGal.length) % curGal.length]; if (nx && nx !== g) new Image().src = nx.src });
  lb.querySelector(".lb-n").textContent = curGal.length > 1 ? (lbI + 1) + " / " + curGal.length : "";
  lb.querySelector(".lb-cap").textContent = g.caption || "";
  lb.querySelectorAll(".lb-b").forEach(b => b.hidden = curGal.length < 2);
}
function lbOpen(G, k, from){ curGal = G; lbFrom = from; lbShow(k); lb.hidden = false; lb.querySelector(".lb-x").focus() }
function lbClose(){ lb.hidden = true; lbImg.removeAttribute("src"); if (lbFrom) lbFrom.focus() }
lb.querySelector(".lb-x").onclick = lbClose;
lb.querySelector(".lb-b.p").onclick = () => lbShow(lbI - 1);
lb.querySelector(".lb-b.n").onclick = () => lbShow(lbI + 1);
lbSc.addEventListener("click", e => { if (e.target === lbSc) lbClose(); else if (e.target === lbImg && lbImg.classList.contains("zm")) { const z = lbImg.classList.toggle("zoom"); if (z) lbSc.scrollTop = 0 } });
let tx = 0, ty = 0;
lbSc.addEventListener("touchstart", e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY }, { passive: true });
lbSc.addEventListener("touchend", e => { const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
  if (curGal.length > 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) lbShow(lbI + (dx < 0 ? 1 : -1)) }, { passive: true });
function body(w){
  const c = w.compare;
  const media = c ? `<div><div class="cmp" style="--pos:50%${c.ratio ? ";aspect-ratio:" + esc(c.ratio) : ""}">${img(c.before.src, c.before.alt || c.before.label)}<div class="cb">${img(c.after.src, c.after.alt || c.after.label)}</div>
<span class="cmp-h" aria-hidden="true"></span><span class="cmp-l l1" aria-hidden="true">${esc(c.before.label)}</span><span class="cmp-l l2" aria-hidden="true">${esc(c.after.label)}</span>
<input type="range" min="0" max="100" value="50" aria-label="Сравнение кадров: ${esc(c.before.label)} и ${esc(c.after.label)}"></div>
<p class="cmp-hint">Потяните ползунок, чтобы сравнить: ${esc(c.before.label.toLowerCase())} и ${esc(c.after.label.toLowerCase())}.</p></div>`
    : null;
  const G = (w.gallery || []).filter(g => g && g.src);
  /* без сравнения галерея встаёт наверх вместо обложки, со сравнением — под текстом */
  const top = media || (G.length ? car(G) : `<div class="cov m-cover" ${PH}>${img(w.cover, w.coverAlt || w.title)}</div>`);
  const gal = media && G.length ? `<div class="blk gal-b"><h3>Галерея</h3>${car(G)}</div>` : "";
  const D = docsOf(w);
  const docs = D.length ? `<div class="blk docs-b"><h3>${D.length > 1 ? "Альбомы проекта" : "Альбом проекта"}</h3>${D.map((d, i) => {
    const n = d.pages.length, p0 = d.pages[0], t = d.title || "Дизайн-проект", ar = p0.w && p0.h ? p0.w / p0.h : 1.414;
    return `<div class="doc" data-doc="${i}"><button class="doc-cv" type="button" data-pg="0" data-cur="Листать" style="aspect-ratio:${p0.w || 1414} / ${p0.h || 1000};width:min(100%,${Math.round(440 * ar)}px)" aria-label="Листать альбом «${esc(t)}», ${plural(n, "страница", "страницы", "страниц")}"><span class="doc-st" aria-hidden="true"></span>${img(p0.src, "")}</button>
<div class="doc-i"><span class="doc-k">PDF · ${plural(n, "страница", "страницы", "страниц")}</span><h4>${esc(t)}</h4>
${n > 1 ? `<div class="doc-th">${d.pages.slice(1, 5).map((p, k) => `<button type="button" data-pg="${k + 1}" aria-label="Открыть страницу ${k + 2}"><img src="${esc(p.src)}" alt="" loading="lazy" onerror="this.remove()"></button>`).join("")}${n > 5 ? `<span>+${n - 5}</span>` : ""}</div>` : ""}
<div class="doc-b"><button class="btn btn-p" type="button" data-pg="0">Листать альбом</button>${d.pdf ? `<a class="btn btn-s" href="${esc(d.pdf)}" download>Скачать PDF${d.size ? " · " + mb(d.size) : ""}</a>` : ""}</div></div></div>`;
  }).join("")}</div>` : "";
  const blk = (t, h) => h ? `<div class="blk"><h3>${t}</h3>${h}</div>` : "";
  return `<div class="mh"><div class="meta"><b>${esc(w.niche)}</b><span>${esc(w.type)}</span></div><h2 id="mTitle">${esc(w.title)}</h2><p>${esc(w.summary)}</p>${w.badge ? `<span class="badge">${esc(w.badge)}</span>` : ""}</div>
<div class="mb">${top}<div class="mg">
${blk("Задача", w.task ? `<p>${esc(w.task)}</p>` : "")}
${blk("Что сделано", (w.done || []).length ? `<ul class="ck">${w.done.map(d => `<li>${esc(d)}</li>`).join("")}</ul>` : "")}
${blk("Инструменты", (w.tools || []).length ? `<div class="pills">${w.tools.map(t => `<span>${esc(t)}</span>`).join("")}</div>` : "")}
${blk("Итог", w.result ? `<p>${esc(w.result)}</p>` : "")}
</div>${docs}${gal}
<div class="mf"><p>Похожая задача? Напишите — обсудим.</p><a class="btn btn-p" href="${tgUrl}" target="_blank" rel="noopener noreferrer">${tgIcon}Обсудить проект</a></div></div>`;
}
function open(id, from){
  const w = works.find(x => x.id === id); if (!w) return;
  opener = from || null; mc.innerHTML = body(w); nb(mc);
  document.querySelectorAll(".cur,.cur-d").forEach(el => el.classList.remove("lbl", "hov", "off"));
  const cmp = mc.querySelector(".cmp");
  if (cmp) { const r = cmp.querySelector("input"); r.addEventListener("input", () => cmp.style.setProperty("--pos", r.value + "%")) }
  mc.querySelectorAll(".car").forEach(initCar);
  const D = docsOf(w);
  mc.querySelectorAll(".doc").forEach(el => { const d = D[+el.dataset.doc], t = d.title || "Дизайн-проект", n = d.pages.length;
    const G = d.pages.map((p, k) => ({ src: p.src, alt: `${t}, страница ${k + 1}`, caption: `${t} · ${k + 1} из ${n}`, tall: false, page: true }));
    el.addEventListener("click", e => { const b = e.target.closest("[data-pg]"); if (b) lbOpen(G, +b.dataset.pg, b) }) });
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
  if (!lb.hidden) {
    if (e.key === "Escape") lbClose();
    else if (e.key === "ArrowRight" && curGal.length > 1) lbShow(lbI + 1);
    else if (e.key === "ArrowLeft" && curGal.length > 1) lbShow(lbI - 1);
    else if (e.key === "Tab") { const f = [...lb.querySelectorAll("button")].filter(x => !x.hidden); const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() } else if (!lb.contains(document.activeElement)) { e.preventDefault(); a.focus() } }
    return;
  }
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
