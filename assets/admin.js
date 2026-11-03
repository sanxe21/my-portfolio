/* Админка кейсов: читает и сохраняет assets/works-data.js и фото через GitHub API */
(() => {
const $ = s => document.querySelector(s);
const store = k => ({ get(){ try { return localStorage.getItem(k) || sessionStorage.getItem(k) } catch (_) { return null } },
  set(v, keep){ try { (keep ? localStorage : sessionStorage).setItem(k, v) } catch (_) {} },
  del(){ try { localStorage.removeItem(k); sessionStorage.removeItem(k) } catch (_) {} } });
const sTok = store("adm-token"), sRepo = store("adm-repo"), sBr = store("adm-branch");
const cfg = { repo: sRepo.get() || "sanxe21/my-portfolio", branch: sBr.get() || "main" };
const FILE = "assets/works-data.js", DIR = "assets/works/";
const HEAD = `/*
  Кейсы для страницы «Мои работы» (works.html) и карточки на главной.
  Этот файл редактирует админ-панель: pvltsk.ru/admin.html
  Вручную тоже можно, но сохраняйте формат JSON: ключи и строки в двойных кавычках, без комментариев внутри списка.
*/
`;
const NICHES = ["Интерьеры", "Сайты", "Презентации", "Визуалы", "Маркетинг"];
const TYPES = ["3D-визуализация", "Лендинг", "Сайт-визитка", "Многостраничный сайт", "Презентация", "Карусель для соцсетей", "Баннеры", "Контент-план"];
let token = sTok.get() || "", data = [], orig = [], fileSha = "", editIdx = -1, cur = null, snap = "", idTouched = false, stash = null;
const pend = new Map(); /* путь в репозитории → { blob, url, done } */

const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const s = v => String(v == null ? "" : v).trim();
const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const I = { up: svg("M12 19V5M6 11l6-6 6 6"), down: svg("M12 5v14M6 13l6 6 6-6"), left: svg("M15 6l-6 6 6 6"), right: svg("M9 6l6 6-6 6"), x: svg("M6 6l12 12M18 6L6 18"), ext: svg("M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5") };
const TR = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
const slug = v => String(v || "").toLowerCase().split("").map(c => TR[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/, "");

/* уведомления и ожидание */
let tt = 0;
function toast(html, err, ms){ const t = $("#toast"); t.innerHTML = html; t.classList.toggle("err", !!err); t.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), ms || (err ? 8000 : 4000)) }
const busy = (on, txt) => { $("#busy").classList.toggle("on", on); if (txt) $("#busyT").textContent = txt };

/* GitHub API */
async function gh(p, o = {}){
  const r = await fetch("https://api.github.com/repos/" + cfg.repo + p, { method: o.method || "GET", cache: "no-store",
    headers: Object.assign({ Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, o.body ? { "Content-Type": "application/json" } : {}),
    body: o.body ? JSON.stringify(o.body) : undefined });
  if (!r.ok) { let m = ""; try { m = (await r.json()).message || "" } catch (_) {} const e = new Error(m || "HTTP " + r.status); e.status = r.status; throw e }
  return r.status === 204 ? null : r.json();
}
function human(e){
  if (e.status === 401) return "GitHub не принял токен: он неверный или истёк. Создайте новый.";
  if (e.status === 404) return "Репозиторий или файл не найден. Проверьте, что в токене выбран репозиторий " + esc(cfg.repo) + ".";
  if (e.status === 403) return /rate limit/i.test(e.message) ? "GitHub временно ограничил запросы. Попробуйте через несколько минут." : "Не хватает прав. В настройках токена нужен доступ Contents: Read and write.";
  if (e.status === 409 || e.status === 422) return "GitHub отклонил сохранение: " + esc(e.message) + ". Обновите страницу и попробуйте ещё раз.";
  if (e instanceof TypeError) return "Нет связи с GitHub. Проверьте интернет.";
  return esc(e.message || "Что-то пошло не так.");
}
const dec = b => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, "")), c => c.charCodeAt(0)));
const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(blob) });
function parse(t){
  const i = t.indexOf("=", t.indexOf("const WORKS")), a = t.indexOf("[", i), b = t.lastIndexOf("]");
  if (i < 0 || a < 0 || b < a) throw new Error("Не удалось найти список кейсов в файле " + FILE);
  try { const d = JSON.parse(t.slice(a, b + 1)); if (!Array.isArray(d)) throw new Error("не список"); return d }
  catch (e) { throw new Error("Файл кейсов не в формате JSON (возможно, его правили вручную): " + e.message) }
}
async function load(){
  const f = await gh("/contents/" + FILE + "?ref=" + encodeURIComponent(cfg.branch));
  fileSha = f.sha; data = parse(dec(f.content)); orig = clone(data);
}

/* данные */
function side(x){ const o = { src: x.src, label: s(x.label) }; if (s(x.alt)) o.alt = s(x.alt); if (x.w && x.h) { o.w = x.w; o.h = x.h } return o }
function tidy(w){
  const o = { id: w.id, niche: s(w.niche), type: s(w.type), title: s(w.title), summary: s(w.summary) };
  if (s(w.badge)) o.badge = s(w.badge);
  if (w.draft) o.draft = true;
  const G = (w.gallery || []).filter(g => g && g.src), C = w.compare && w.compare.before && w.compare.after && w.compare.before.src && w.compare.after.src ? w.compare : null;
  o.cover = w.cover || (C && C.after.src) || (G[0] && G[0].src) || "";
  if (s(w.coverAlt)) o.coverAlt = s(w.coverAlt);
  if (C) o.compare = { ratio: C.ratio || (C.before.w ? C.before.w + " / " + C.before.h : ""), before: side(C.before), after: side(C.after) };
  o.task = s(w.task);
  o.done = (w.done || []).map(s).filter(Boolean);
  o.gallery = G.map(g => { const x = { src: g.src }; if (s(g.caption)) x.caption = s(g.caption); if (s(g.alt)) x.alt = s(g.alt); if (g.w && g.h) { x.w = g.w; x.h = g.h } return x });
  const D = (w.docs || []).filter(d => d && d.pages && d.pages.length);
  if (D.length) o.docs = D.map(d => { const x = { title: s(d.title) || "Дизайн-проект", pages: d.pages.map(p => ({ src: p.src, w: p.w, h: p.h })) }; if (d.pdf && d.download !== false) { x.pdf = d.pdf; if (d.size) x.size = d.size } return x });
  return o;
}
const serialize = d => HEAD + "const WORKS = " + JSON.stringify(d.map(tidy), null, 2) + ";\n";
function paths(d){ const p = new Set(); d.map(tidy).forEach(w => { if (w.cover) p.add(w.cover); if (w.compare) { p.add(w.compare.before.src); p.add(w.compare.after.src) } w.gallery.forEach(g => p.add(g.src)); (w.docs || []).forEach(d => { d.pages.forEach(x => p.add(x.src)); if (d.pdf) p.add(d.pdf) }) }); return p }
const isDirty = () => JSON.stringify(data.map(tidy)) !== JSON.stringify(orig.map(tidy));
const editChanged = () => !!cur && JSON.stringify(cur) !== snap;
function markDirty(){ const d = isDirty(); $("#dirty").classList.toggle("on", d); $("#bPublish").disabled = !d }
const view = p => pend.has(p) ? pend.get(p).url : p;
window.admImgErr = im => { im.onerror = null; const p = im.dataset.p; if (p && !/^(blob:|https?:)/.test(p)) im.src = "https://raw.githubusercontent.com/" + cfg.repo + "/" + cfg.branch + "/" + p };
const imgT = (p, alt, lazy) => p ? `<img src="${esc(view(p))}" data-p="${esc(p)}" alt="${esc(alt || "")}" ${lazy ? 'loading="lazy"' : ""} onerror="admImgErr(this)">` : "";

/* экраны */
function show(v){
  ["vLogin", "vList", "vEdit"].forEach(id => $("#" + id).hidden = id !== v);
  const inApp = v !== "vLogin";
  $("#bOut").hidden = !inApp; $("#bPublish").hidden = v !== "vList"; $("#bPreview").hidden = v !== "vList";
  $("#dirty").style.visibility = inApp ? "" : "hidden";
  markDirty();
}

/* список */
function drawList(){
  const ul = $("#cases");
  if (!data.length) { ul.innerHTML = '<li class="empty">Пока нет ни одного кейса. Нажмите «Новый кейс».</li>'; return }
  const live = new Set(orig.filter(w => !w.draft).map(w => w.id));
  ul.innerHTML = data.map((w, i) => { const t = tidy(w); return `<li class="ci"><div class="th">${imgT(t.cover, "", true)}</div>
<div><h3>${esc(t.title || "Без названия")}${t.draft ? '<span class="tag">Черновик</span>' : ""}</h3><div class="m">${esc([t.niche, t.type].filter(Boolean).join(" · "))}</div></div>
<div class="acts"><button class="ib" type="button" data-a="up" data-i="${i}" aria-label="Поднять выше"${i ? "" : " disabled"}>${I.up}</button><button class="ib" type="button" data-a="down" data-i="${i}" aria-label="Опустить ниже"${i < data.length - 1 ? "" : " disabled"}>${I.down}</button>
${live.has(t.id) ? `<a class="ib" href="works.html#${encodeURIComponent(t.id)}" target="_blank" rel="noopener" aria-label="Открыть на сайте">${I.ext}</a>` : ""}
<button class="btn btn-g sm" type="button" data-a="edit" data-i="${i}">Изменить</button><button class="btn btn-d sm" type="button" data-a="del" data-i="${i}">Удалить</button></div></li>` }).join("");
}
$("#cases").addEventListener("click", e => {
  const b = e.target.closest("[data-a]"); if (!b) return; const i = +b.dataset.i, a = b.dataset.a;
  if (a === "up" || a === "down") { const j = a === "up" ? i - 1 : i + 1; [data[i], data[j]] = [data[j], data[i]]; drawList(); markDirty();
    const nb = $(`#cases [data-a="${a}"][data-i="${j}"]`); if (nb && !nb.disabled) nb.focus() }
  else if (a === "edit") openEditor(i);
  else if (a === "del") { if (confirm(`Удалить кейс «${data[i].title || "Без названия"}»?\nЕго фото удалятся из репозитория после публикации.`)) { data.splice(i, 1); drawList(); markDirty(); toast("Кейс удалён из списка. Нажмите «Опубликовать», чтобы убрать его с сайта.") } }
});
$("#bNew").onclick = () => openEditor(-1);

/* редактор */
const blank = () => ({ id: "", niche: "", type: "", title: "", summary: "", badge: "", draft: false, cover: "", coverAlt: "", compare: null, task: "", done: [], gallery: [], docs: [] });
function openEditor(i){
  editIdx = i; cur = i < 0 ? blank() : Object.assign(blank(), clone(data[i]));
  idTouched = i >= 0; stash = null; snap = JSON.stringify(cur);
  $("#eTitle").textContent = i < 0 ? "Новый кейс" : "Редактирование кейса";
  drawForm(); show("vEdit"); scrollTo(0, 0);
  const t = $("#fEdit [data-k=title]"); if (t && i < 0) t.focus();
}
const drop = (kind, multi) => `<label class="drop" data-up="${kind}"><input type="file" accept="image/*" data-up="${kind}"${multi ? " multiple" : ""} aria-label="${multi ? "Добавить фото в галерею" : "Загрузить фото"}"><span>${multi ? "Перетащите сюда фото или <b>выберите файлы</b>" : "Перетащите фото или <b>выберите файл</b>"}</span><small>JPG, PNG или WebP. Фото сожмутся автоматически.</small></label>`;
const pic = (p, kind, w, h) => p ? `<div class="pic">${imgT(p, "")}<button class="ib" type="button" data-rm="${kind}" aria-label="Убрать фото">${I.x}</button>${w ? `<span class="sz">${w}×${h}</span>` : ""}</div>` : drop(kind, false);
const opts = (id, list) => `<datalist id="${id}">${[...new Set(list.filter(Boolean))].map(v => `<option value="${esc(v)}">`).join("")}</datalist>`;
function field(k, label, o = {}){
  const v = o.value != null ? o.value : cur[k];
  const ctl = o.area ? `<textarea class="in" id="e_${k}" data-k="${k}" rows="${o.rows || 4}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ""}>${esc(v)}</textarea>`
    : `<input class="in" id="e_${k}" data-k="${k}" value="${esc(v)}"${o.list ? ` list="${o.list}"` : ""}${o.ph ? ` placeholder="${esc(o.ph)}"` : ""} autocomplete="off">`;
  return `<div class="f"><label for="e_${k}">${label}</label>${ctl}${o.hint ? `<small id="h_${k}">${o.hint}</small>` : ""}</div>`;
}
function cmpWarn(){
  const c = cur.compare; if (!c || !c.before.w || !c.after.w) return "";
  return Math.abs(c.before.w / c.before.h - c.after.w / c.after.h) > .01 ? '<p class="warn">Кадры разных пропорций — при сравнении они не совпадут. Лучше загрузить два кадра одного размера и ракурса.</p>' : "";
}
function drawForm(){
  const c = cur.compare, G = cur.gallery;
  $("#fEdit").innerHTML = `
${opts("dlN", [...data.map(w => w.niche), ...NICHES])}${opts("dlT", [...data.map(w => w.type), ...TYPES])}
${field("title", "Название *", { ph: "Например: Лендинг для барбершопа" })}
<div class="row2">${field("niche", "Ниша *", { list: "dlN", hint: "По нишам работают фильтры на странице работ." })}${field("type", "Тип работы", { list: "dlT" })}</div>
${field("summary", "Короткое описание для карточки", { area: true, rows: 2, ph: "1–2 предложения: что это и чем интересно" })}
<div class="row2">${field("id", "Адрес кейса", { hint: `Ссылка: pvltsk.ru/works.html#<span id="idv">${esc(cur.id || "…")}</span>` })}${field("badge", "Пометка на карточке", { ph: "Например: Новое", hint: "Необязательно." })}</div>
<label class="chk"><input type="checkbox" data-k="draft"${cur.draft ? " checked" : ""}><span><b>Черновик</b> — не показывать на сайте, пока не сниму галочку</span></label>

<fieldset class="sec"><legend>Обложка</legend><p class="sec-d">Показывается на карточке кейса. Лучше горизонтальная, от 1600 px в ширину. Если не загрузить, возьмётся кадр из сравнения или первое фото галереи.</p>
${pic(cur.cover, "cover")}
${cur.cover ? `<div class="f" style="margin-top:16px">${field("coverAlt", "Что на обложке", { hint: "Одной фразой — для поисковиков и незрячих. Необязательно." }).replace(/^<div class="f">|<\/div>$/g, "")}</div>` : ""}
</fieldset>

<fieldset class="sec"><legend>Сравнение ползунком</legend><p class="sec-d">Два кадра одного ракурса: до/после, день/ночь, старый/новый дизайн. В кейсе появится ползунок.</p>
<label class="chk" style="margin-bottom:${c ? 20 : 0}px"><input type="checkbox" data-act="cmp"${c ? " checked" : ""}><span>Добавить сравнение</span></label>
${c ? `${cmpWarn()}<div class="cmpg">
<div><div class="f"><label for="e_bl">Подпись первого кадра</label><input class="in" id="e_bl" data-k="compare.before.label" value="${esc(c.before.label)}"></div>${pic(c.before.src, "before", c.before.w, c.before.h)}</div>
<div><div class="f"><label for="e_al">Подпись второго кадра</label><input class="in" id="e_al" data-k="compare.after.label" value="${esc(c.after.label)}"></div>${pic(c.after.src, "after", c.after.w, c.after.h)}</div>
</div>` : ""}
</fieldset>

<fieldset class="sec"><legend>Описание</legend><p class="sec-d">Что было нужно клиенту и как вы это решили.</p>
${field("task", "Задача", { area: true, rows: 4 })}
${field("done", "Что сделано", { area: true, rows: 6, value: cur.done.join("\n"), hint: "Каждый пункт — с новой строки." })}
</fieldset>

<fieldset class="sec"><legend>Галерея</legend><p class="sec-d">Скриншоты сайта, слайды, ракурсы — на сайте они листаются каруселью и открываются на весь экран. Длинные скриншоты страниц загружайте целиком: их можно будет пролистать. Порядок меняется стрелками или перетаскиванием.</p>
${G.length ? `<ul class="g-list" id="gl">${G.map((g, i) => `<li class="gi" data-gi="${i}"><div class="im" draggable="true" title="Перетащите, чтобы поменять порядок">${imgT(g.src, "", true)}<span class="n">${i + 1}</span></div>
<div class="bd"><input class="in" data-g="${i}" value="${esc(g.caption || "")}" placeholder="Подпись (необязательно)" aria-label="Подпись к фото ${i + 1}">
<div class="bt"><button class="ib" type="button" data-ga="l" data-i="${i}" aria-label="Сдвинуть влево"${i ? "" : " disabled"}>${I.left}</button><button class="ib" type="button" data-ga="r" data-i="${i}" aria-label="Сдвинуть вправо"${i < G.length - 1 ? "" : " disabled"}>${I.right}</button><button class="ib" type="button" data-ga="x" data-i="${i}" aria-label="Удалить фото ${i + 1}">${I.x}</button></div></div></li>`).join("")}</ul>` : ""}
${drop("gal", true)}
</fieldset>

<fieldset class="sec"><legend>PDF-альбом</legend><p class="sec-d">Подача проекта целиком: дизайн-проект, планировки, презентация. Страницы превратятся в картинки, и на сайте альбом можно будет листать на любом устройстве. Оригинал PDF можно дать скачать.</p>
${(cur.docs || []).length ? `<ul class="d-list">${cur.docs.map((d, i) => docItem(d, i)).join("")}</ul>` : ""}
${dropPdf()}
</fieldset>

<div class="foot"><button class="btn btn-p" type="button" data-f="pub">Опубликовать</button><button class="btn btn-g" type="button" data-f="save" title="Сохранить в списке, не публикуя на сайте">Сохранить</button><button class="btn btn-g" type="button" data-f="prev">Предпросмотр</button><span class="sp"></span><button class="btn btn-g" type="button" data-f="cancel">Отмена</button></div>`;
}
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return n + " " + (m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c) };
const mb = n => !n ? "" : n < 1048576 ? Math.max(1, Math.round(n / 1024)) + " КБ" : (n / 1048576 < 10 ? (n / 1048576).toFixed(1).replace(".", ",") : Math.round(n / 1048576)) + " МБ";
const canDl = d => !!d.pdf && (pend.has(d.pdf) || paths(orig).has(d.pdf));
const dropPdf = () => `<label class="drop" data-up="pdf"><input type="file" accept="application/pdf,.pdf" data-up="pdf" aria-label="Загрузить PDF"><span>Перетащите PDF или <b>выберите файл</b></span><small>До ${MAXP} страниц. Чтобы PDF можно было скачать, он должен весить меньше ${MAXPDF} МБ.</small></label>`;
function docItem(d, i){
  const n = d.pages.length, dl = canDl(d), last = cur.docs.length - 1;
  return `<li class="di"><div class="dcv">${imgT(d.pages[0].src, "", true)}<span class="n">${plural(n, "страница", "страницы", "страниц")}</span></div>
<div class="dbd"><div class="f" style="margin:0"><label for="dt${i}">Название альбома</label><input class="in" id="dt${i}" data-dt="${i}" value="${esc(d.title || "")}" placeholder="Например: Дизайн-проект спальни"></div>
<label class="chk"><input type="checkbox" data-dl="${i}"${dl && d.download !== false ? " checked" : ""}${dl ? "" : " disabled"}><span>Можно скачать PDF${d.size ? " (" + mb(d.size) + ")" : ""}${dl ? "" : d.big ? " — файл тяжелее " + MAXPDF + " МБ, будет только листание" : " — оригинала нет, загрузите PDF заново"}</span></label>
<div class="bt"><button class="ib" type="button" data-da="u" data-i="${i}" aria-label="Выше"${i ? "" : " disabled"}>${I.up}</button><button class="ib" type="button" data-da="d" data-i="${i}" aria-label="Ниже"${i < last ? "" : " disabled"}>${I.down}</button><button class="ib" type="button" data-da="x" data-i="${i}" aria-label="Удалить альбом">${I.x}</button></div></div></li>`;
}
function setK(k, v){ const p = k.split("."); let o = cur; while (p.length > 1) o = o[p.shift()]; o[p[0]] = v }
const fE = $("#fEdit");
fE.addEventListener("submit", e => e.preventDefault());
fE.addEventListener("input", e => {
  const t = e.target, k = t.dataset.k;
  if (t.dataset.g != null) { cur.gallery[+t.dataset.g].caption = t.value; return }
  if (t.dataset.dt != null) { cur.docs[+t.dataset.dt].title = t.value; return }
  if (t.dataset.dl != null) { cur.docs[+t.dataset.dl].download = t.checked; return }
  if (!k) return;
  t.classList.remove("bad");
  if (k === "done") cur.done = t.value.split("\n").map(x => x.trim()).filter(Boolean);
  else if (k === "draft") cur.draft = t.checked;
  else if (k === "id") { idTouched = true; cur.id = t.value; $("#idv").textContent = slug(t.value) || "…" }
  else setK(k, t.value);
  if (k === "title" && !idTouched) { cur.id = slug(t.value); const f = fE.querySelector("[data-k=id]"); f.value = cur.id; $("#idv").textContent = cur.id || "…" }
});
fE.addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.k === "id") { cur.id = slug(t.value); t.value = cur.id; $("#idv").textContent = cur.id || "…" }
  if (t.dataset.act === "cmp") { if (t.checked) cur.compare = stash || { ratio: "", before: { src: "", label: "До" }, after: { src: "", label: "После" } }; else { stash = cur.compare; cur.compare = null } drawForm() }
  if (t.type === "file" && t.files.length) { addFiles(t.dataset.up, t.files); t.value = "" }
});
fE.addEventListener("click", e => {
  const rm = e.target.closest("[data-rm]"), ga = e.target.closest("[data-ga]"), f = e.target.closest("[data-f]"), da = e.target.closest("[data-da]");
  if (da) { const i = +da.dataset.i, D = cur.docs;
    if (da.dataset.da === "x") { if (!confirm("Убрать альбом «" + (D[i].title || "без названия") + "»?")) return; D.splice(i, 1) } else { const j = da.dataset.da === "u" ? i - 1 : i + 1; [D[i], D[j]] = [D[j], D[i]] }
    drawForm(); return }
  if (rm) { const k = rm.dataset.rm; if (k === "cover") cur.cover = ""; else { cur.compare[k].src = ""; delete cur.compare[k].w; delete cur.compare[k].h } drawForm() }
  else if (ga) { const i = +ga.dataset.i, G = cur.gallery;
    if (ga.dataset.ga === "x") G.splice(i, 1); else { const j = ga.dataset.ga === "l" ? i - 1 : i + 1; [G[i], G[j]] = [G[j], G[i]] }
    drawForm(); const n = fE.querySelector(`[data-ga="${ga.dataset.ga}"][data-i="${ga.dataset.ga === "x" ? Math.min(i, G.length - 1) : ga.dataset.ga === "l" ? i - 1 : i + 1}"]`); if (n && !n.disabled) n.focus() }
  else if (f) ({ pub: () => { if (apply()) publish() }, save: () => { if (apply()) toast("Сохранено в списке. Чтобы изменения появились на сайте, нажмите «Опубликовать».", false, 6000) }, prev: () => preview(true), cancel: cancelEdit })[f.dataset.f]();
});
/* перетаскивание файлов и порядок галереи */
let dragI = -1;
fE.addEventListener("dragstart", e => { const im = e.target.closest && e.target.closest(".gi .im"); if (!im) return; dragI = +im.parentNode.dataset.gi; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/x-gal", String(dragI)); im.parentNode.classList.add("drag") });
fE.addEventListener("dragend", () => { dragI = -1; fE.querySelectorAll(".drag,.tgt,.over").forEach(x => x.classList.remove("drag", "tgt", "over")) });
fE.addEventListener("dragover", e => {
  const files = [...e.dataTransfer.types].includes("Files"), z = e.target.closest(".drop"), gi = e.target.closest(".gi");
  if (files && z) { e.preventDefault(); z.classList.add("over") }
  else if (dragI > -1 && gi) { e.preventDefault(); fE.querySelectorAll(".tgt").forEach(x => x.classList.remove("tgt")); gi.classList.add("tgt") }
});
fE.addEventListener("dragleave", e => { const z = e.target.closest(".drop"); if (z && !z.contains(e.relatedTarget)) z.classList.remove("over") });
fE.addEventListener("drop", e => {
  const z = e.target.closest(".drop"), gi = e.target.closest(".gi");
  if (z && e.dataTransfer.files.length) { e.preventDefault(); z.classList.remove("over"); addFiles(z.dataset.up, e.dataTransfer.files) }
  else if (gi && dragI > -1) { e.preventDefault(); const j = +gi.dataset.gi, G = cur.gallery; const [m] = G.splice(dragI, 1); G.splice(j, 0, m); dragI = -1; drawForm() }
});
addEventListener("dragover", e => { if (!e.target.closest || !e.target.closest(".drop")) e.preventDefault() });
addEventListener("drop", e => { if (!e.target.closest || !e.target.closest(".drop,.gi")) e.preventDefault() });

/* подготовка фото: уменьшение и сжатие в браузере */
const toBlob = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
async function prep(file, maxW){
  const u = URL.createObjectURL(file);
  try {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("браузер не смог открыть файл «" + file.name + "»")); i.src = u });
    const w = im.naturalWidth, h = im.naturalHeight; let k = Math.min(1, maxW / w); if (w * k * h * k > 16e6) k = Math.sqrt(16e6 / (w * h));
    const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
    const c = document.createElement("canvas"); c.width = cw; c.height = ch; const x = c.getContext("2d");
    x.drawImage(im, 0, 0, cw, ch);
    let blob = await toBlob(c, "image/webp", .86);
    if (!blob || blob.type !== "image/webp") { x.globalCompositeOperation = "destination-over"; x.fillStyle = "#fff"; x.fillRect(0, 0, cw, ch); blob = await toBlob(c, "image/jpeg", .88) }
    if (!blob) throw new Error("не удалось сжать «" + file.name + "»");
    return { blob, w: cw, h: ch, ext: blob.type === "image/webp" ? "webp" : "jpg" };
  } finally { URL.revokeObjectURL(u) }
}
async function addFiles(kind, list){
  if (kind === "pdf") return addPdf([...list].find(f => f.type === "application/pdf" || /\.pdf$/i.test(f.name)));
  let files = [...list].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|avif|heic)$/i.test(f.name));
  if (!files.length) { toast("Это не картинка. Подойдут JPG, PNG или WebP.", true); return }
  if (kind !== "gal") files = files.slice(0, 1);
  const max = kind === "gal" ? 2000 : kind === "cover" ? 1800 : 2400, base = slug(cur.id || cur.title) || "case";
  busy(true, "Обработка фото…"); let ok = 0;
  try {
    for (const [n, f] of files.entries()) {
      if (files.length > 1) busy(true, `Обработка фото ${n + 1} из ${files.length}…`);
      try {
        const r = await prep(f, max), p = DIR + base + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + "." + r.ext;
        pend.set(p, { blob: r.blob, url: URL.createObjectURL(r.blob) });
        if (kind === "cover") cur.cover = p;
        else if (kind === "gal") cur.gallery.push({ src: p, caption: "", w: r.w, h: r.h });
        else { Object.assign(cur.compare[kind], { src: p, w: r.w, h: r.h }); const b = cur.compare.before; cur.compare.ratio = b.w ? b.w + " / " + b.h : r.w + " / " + r.h }
        ok++;
      } catch (e) { toast("Не получилось: " + esc(e.message) + ". Если это HEIC с iPhone — сохраните фото как JPG.", true) }
    }
  } finally { busy(false); drawForm() }
  if (ok && kind === "gal") toast(ok === 1 ? "Фото добавлено в галерею." : `Добавлено фото: ${ok}.`);
}

/* PDF: страницы → картинки (pdf.js лежит в assets/vendor/pdfjs и грузится только здесь) */
const MAXP = 80, MAXPDF = 45, PJ = new URL("assets/vendor/pdfjs/", location.href).href;
let pdfjs = null;
async function addPdf(file){
  if (!file) { toast("Это не PDF.", true); return }
  busy(true, "Открываю PDF…");
  const base = slug(cur.id || cur.title) || "case", tag = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const made = [];
  try {
    if (!pdfjs) { pdfjs = await import(PJ + "pdf.min.mjs"); pdfjs.GlobalWorkerOptions.workerSrc = PJ + "pdf.worker.min.mjs" }
    const buf = new Uint8Array(await file.arrayBuffer());
    const task = pdfjs.getDocument({ data: buf.slice(), cMapUrl: PJ + "cmaps/", cMapPacked: true, standardFontDataUrl: PJ + "standard_fonts/", wasmUrl: PJ + "wasm/", iccUrl: PJ + "iccs/" }), doc = await task.promise;
    const total = doc.numPages, n = Math.min(total, MAXP), pages = [];
    for (let k = 1; k <= n; k++) {
      busy(true, `Готовлю страницу ${k} из ${n}…`);
      const pg = await doc.getPage(k), v1 = pg.getViewport({ scale: 1 });
      let sc = 2200 / Math.max(v1.width, v1.height); if (v1.width * sc * v1.height * sc > 12e6) sc = Math.sqrt(12e6 / (v1.width * v1.height));
      const vp = pg.getViewport({ scale: sc }), c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvas: c, canvasContext: x, viewport: vp }).promise; pg.cleanup();
      let blob = await toBlob(c, "image/webp", .85); if (!blob || blob.type !== "image/webp") blob = await toBlob(c, "image/jpeg", .87);
      const p = DIR + base + "-" + tag + "-p" + String(k).padStart(2, "0") + (blob.type === "image/webp" ? ".webp" : ".jpg");
      pend.set(p, { blob, url: URL.createObjectURL(blob) }); made.push(p); pages.push({ src: p, w: c.width, h: c.height });
      c.width = c.height = 0;
    }
    try { await task.destroy() } catch (_) {}
    const d = { title: file.name.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").trim(), pages, size: file.size };
    if (file.size <= MAXPDF * 1048576) { d.pdf = DIR + base + "-" + tag + ".pdf"; pend.set(d.pdf, { blob: file, url: URL.createObjectURL(file) }); d.download = true }
    else d.big = true;
    (cur.docs = cur.docs || []).push(d);
    toast(`Альбом добавлен: ${plural(n, "страница", "страницы", "страниц")}.` + (total > n ? ` В PDF ${total} стр. — взял первые ${MAXP}.` : "") + (d.big ? ` PDF тяжелее ${MAXPDF} МБ, поэтому на сайте будет только листание.` : ""), false, 7000);
  } catch (e) {
    made.forEach(p => pend.delete(p));
    toast("Не получилось открыть PDF" + (/password/i.test(e.name + e.message) ? ": он защищён паролем. Сохраните копию без пароля." : ": " + esc(e.message)), true);
  } finally { busy(false); drawForm() }
}

function apply(){
  fE.querySelectorAll(".bad").forEach(x => x.classList.remove("bad"));
  const errs = [];
  if (!s(cur.title)) errs.push(["title", "Укажите название кейса."]);
  if (!s(cur.niche)) errs.push(["niche", "Укажите нишу — например, «Сайты»."]);
  if (cur.compare && !(cur.compare.before.src && cur.compare.after.src)) errs.push([null, "Для сравнения загрузите оба кадра или снимите галочку «Добавить сравнение»."]);
  let id = slug(cur.id) || slug(cur.title) || "case";
  const taken = v => data.some((w, k) => k !== editIdx && w.id === v);
  if (taken(id)) { if (idTouched) errs.push(["id", "Такой адрес уже у другого кейса. Придумайте другой."]); else { let n = 2; while (taken(id + "-" + n)) n++; id += "-" + n } }
  if (errs.length) { errs.forEach(([k]) => { const el = k && fE.querySelector(`[data-k="${k}"]`); if (el) el.classList.add("bad") });
    const first = errs.find(([k]) => k); if (first) fE.querySelector(`[data-k="${first[0]}"]`).focus(); toast(errs.map(x => x[1]).join(" "), true); return false }
  cur.id = id;
  const w = tidy(cur);
  if (editIdx < 0) { data.unshift(w); editIdx = 0 } else data[editIdx] = w;
  cur = null; drawList(); show("vList"); scrollTo(0, 0); return true;
}
function cancelEdit(){ if (editChanged() && !confirm("Выйти без сохранения? Изменения в этом кейсе пропадут.")) return; cur = null; drawList(); show("vList") }

/* предпросмотр в соседней вкладке, без публикации */
function preview(withCur){
  const d = data.map(tidy); let id = "";
  if (withCur && cur) { const c = tidy(Object.assign({}, cur, { id: slug(cur.id) || "preview" })); id = c.id; if (editIdx < 0) d.unshift(c); else d[editIdx] = c }
  const m = p => p ? view(p) : p;
  d.forEach(w => { w.cover = m(w.cover); if (w.compare) { w.compare.before.src = m(w.compare.before.src); w.compare.after.src = m(w.compare.after.src) } w.gallery.forEach(g => g.src = m(g.src)); (w.docs || []).forEach(d => { d.pages.forEach(x => x.src = m(x.src)); if (d.pdf) d.pdf = m(d.pdf) }) });
  try { localStorage.setItem("pvltsk-preview", JSON.stringify(d)) } catch (_) { toast("Браузер не дал сохранить предпросмотр.", true); return }
  open("works.html?preview=local" + (id ? "#" + encodeURIComponent(id) : ""), "pvltsk-preview");
}
$("#bPreview").onclick = () => preview(false);

/* публикация: один коммит с фото и файлом кейсов */
function message(){
  const o = new Map(orig.map(w => [w.id, w])), n = new Map(data.map(w => [w.id, w])), q = w => "«" + (w.title || w.id) + "»", parts = [];
  const add = data.filter(w => !o.has(w.id)), del = orig.filter(w => !n.has(w.id)), chg = data.filter(w => o.has(w.id) && JSON.stringify(tidy(w)) !== JSON.stringify(tidy(o.get(w.id))));
  if (add.length) parts.push("добавить " + add.map(q).join(", ")); if (chg.length) parts.push("обновить " + chg.map(q).join(", ")); if (del.length) parts.push("удалить " + del.map(q).join(", "));
  return "Админка: " + (parts.join("; ") || "изменить порядок кейсов");
}
async function publish(){
  if (!isDirty()) { toast("Нет изменений для публикации."); return }
  busy(true, "Публикация…");
  try {
    const br = encodeURIComponent(cfg.branch), ref = await gh("/git/ref/heads/" + br), head = ref.object.sha, hc = await gh("/git/commits/" + head);
    const f = await gh("/contents/" + FILE + "?ref=" + head);
    if (fileSha && f.sha !== fileSha && !confirm("Файл с кейсами изменился на GitHub после того, как вы открыли админку (например, правки из другой вкладки). Ваша версия заменит его. Продолжить?")) return;
    const used = paths(data), was = paths(orig), tree = [], up = [...used].filter(p => pend.has(p) && !pend.get(p).done);
    for (const [k, p] of up.entries()) { busy(true, `Загрузка фото ${k + 1} из ${up.length}…`);
      const b = await gh("/git/blobs", { method: "POST", body: { content: await b64(pend.get(p).blob), encoding: "base64" } }); tree.push({ path: p, mode: "100644", type: "blob", sha: b.sha }) }
    const gone = [...was].filter(p => !used.has(p) && p.startsWith(DIR));
    gone.forEach(p => tree.push({ path: p, mode: "100644", type: "blob", sha: null }));
    tree.push({ path: FILE, mode: "100644", type: "blob", content: serialize(data) });
    busy(true, "Сохранение на GitHub…");
    const t = await gh("/git/trees", { method: "POST", body: { base_tree: hc.tree.sha, tree } });
    const c = await gh("/git/commits", { method: "POST", body: { message: message(), tree: t.sha, parents: [head] } });
    await gh("/git/refs/heads/" + br, { method: "PATCH", body: { sha: c.sha } });
    up.forEach(p => pend.get(p).done = true); gone.forEach(p => { if (pend.has(p)) pend.get(p).done = false });
    data = data.map(tidy); orig = clone(data);
    try { fileSha = (await gh("/contents/" + FILE + "?ref=" + c.sha)).sha } catch (_) { fileSha = "" }
    drawList(); show("vList");
    toast('Опубликовано. Сайт обновится через 1–3 минуты; если изменений не видно, обновите страницу (Ctrl+F5). <a href="works.html" target="_blank" rel="noopener">Открыть работы</a>', false, 10000);
  } catch (e) { toast(human(e), true) }
  finally { busy(false); markDirty() }
}
$("#bPublish").onclick = publish;

/* вход и выход */
$("#cRepo").value = cfg.repo; $("#cBranch").value = cfg.branch; $("#repoName").textContent = cfg.repo.split("/")[1] || cfg.repo;
$("#fLogin").addEventListener("submit", async e => {
  e.preventDefault(); const t = $("#tok").value.trim(); if (!t) { $("#tok").classList.add("bad"); $("#tok").focus(); return }
  cfg.repo = s($("#cRepo").value) || cfg.repo; cfg.branch = s($("#cBranch").value) || cfg.branch;
  token = t; busy(true, "Проверка доступа…");
  try { await load(); const keep = $("#rem").checked; sTok.del(); sTok.set(t, keep); sRepo.set(cfg.repo, true); sBr.set(cfg.branch, true); $("#tok").value = ""; drawList(); show("vList") }
  catch (err) { token = ""; toast(human(err), true) }
  finally { busy(false) }
});
$("#bOut").onclick = () => { if ((isDirty() || editChanged()) && !confirm("Есть неопубликованные изменения. Выйти без публикации?")) return;
  sTok.del(); token = ""; data = []; orig = []; cur = null; show("vLogin") };
addEventListener("beforeunload", e => { if (token && (isDirty() || editChanged())) { e.preventDefault(); e.returnValue = "" } });

(async () => {
  if (!token) { show("vLogin"); return }
  busy(true, "Загрузка кейсов…");
  try { await load(); drawList(); show("vList") }
  catch (e) { if (e.status === 401) { sTok.del(); token = "" } show("vLogin"); toast(human(e), true) }
  finally { busy(false) }
})();
})();
