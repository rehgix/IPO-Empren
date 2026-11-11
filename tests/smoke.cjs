// Revisió automàtica de la web. S'executa sola a GitHub abans de publicar: si falla, la web no es publica.
// Obre totes les pàgines amb el grup d'exemple (vista del professor i de cada equip), en ordinador i en mòbil, i comprova que:
//   1) no hi ha cap error de programa, 2) cap pàgina se surt de la pantalla, 3) cap pàgina queda buida,
//   4) no es demana res a servidors externs (lletres, llibreries...).
// També obre el tauler del professor, la configuració i les còpies de seguretat amb un Firebase de mentida (tests/mock-fb.js).
// Per passar-la a mà: node tests/smoke.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), ORIGIN = 'https://ipo.test/';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
const fails = [], fail = (where, what) => { fails.push(where + ' → ' + what); };

async function open(browser, width, cloud) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const st = { where: 'inici' };
  page.on('pageerror', e => fail(`${width}px ${st.where}`, 'error de programa: ' + String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') fail(`${width}px ${st.where}`, 'error a la consola: ' + m.text().slice(0, 300)); });
  await page.route('**/*', route => {
    const url = route.request().url();
    if (!url.startsWith(ORIGIN)) { if (!/^(data|blob|about):/.test(url)) fail(`${width}px ${st.where}`, 'petició a un servidor extern: ' + url.slice(0, 120)); return route.abort(); }
    let rel = decodeURIComponent(url.slice(ORIGIN.length).split(/[?#]/)[0]) || 'index.html';
    if (rel === 'config.js' && !cloud) return route.fulfill({ body: '', contentType: TYPES['.js'] }); // sense configuració: grup d'exemple
    if (rel === 'fbapi.js' && cloud) rel = 'tests/mock-fb.js';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { fail(`${width}px ${st.where}`, 'arxiu que no existeix: ' + rel); return route.fulfill({ status: 404, body: '' }); }
    return route.fulfill({ body: fs.readFileSync(file), contentType: TYPES[path.extname(file)] || 'application/octet-stream' });
  });
  return { page, st };
}
// Comprovacions d'una pàgina ja dibuixada
async function check(page, width, where) {
  const r = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, text: document.querySelector('#view').innerText.trim().length }));
  if (r.over > 1) fail(`${width}px ${where}`, `la pàgina se surt de la pantalla (${r.over} px)`);
  if (r.text < 20) fail(`${width}px ${where}`, 'la pàgina ha quedat buida');
}

(async () => {
  const browser = await chromium.launch();
  let pages = 0;
  for (const width of [1280, 390]) {
    // 1) Grup d'exemple: totes les pàgines del professor i de cada equip
    const { page, st } = await open(browser, width, false);
    await page.goto(ORIGIN + 'index.html'); await page.waitForSelector('#tabs [data-tab]', { state: 'attached' });
    const roles = await page.evaluate(() => [...document.querySelector('#roleSel').options].map(o => o.value));
    if (roles.length < 2) fail(`${width}px`, 'no hi ha equips d\'exemple');
    for (const role of roles) {
      await page.evaluate(v => { const s = document.querySelector('#roleSel'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, role);
      await page.waitForTimeout(150);
      const tabs = await page.evaluate(() => [...document.querySelectorAll('#tabs [data-tab]')].map(b => b.dataset.tab));
      if (tabs.length < 5) fail(`${width}px ${role}`, 'falten apartats al menú');
      for (const t of tabs) {
        st.where = (role === 'prof' ? 'professor' : 'equip ' + (Number(role) + 1)) + ' / ' + t;
        await page.evaluate(t => document.querySelector(`#tabs [data-tab="${t}"]`).click(), t);
        await page.waitForTimeout(120);
        await check(page, width, st.where); pages++;
      }
    }
    // Mode fosc: que no peti en canviar de tema
    st.where = 'mode fosc'; await page.evaluate(() => setTheme('dark')); await page.waitForTimeout(100); await check(page, width, st.where);
    await page.close();
    // 2) Amb sessió (Firebase de mentida): tauler, configuració i còpies de seguretat
    const c = await open(browser, width, true);
    await c.page.addInitScript(() => { try { localStorage.setItem('ipoBk:prof@biada.net', JSON.stringify({ seen: true, on: false })); } catch (e) {} });
    for (const [hash, name] of [['', 'tauler del professorat'], ['#config', 'configuració general'], ['#copies', 'còpies de seguretat'], ['#g=g1', 'grup amb sessió']]) {
      c.st.where = name;
      await c.page.goto(ORIGIN + 'index.html' + hash); await c.page.waitForTimeout(1200);
      await check(c.page, width, name); pages++;
    }
    await c.page.close();
  }
  await browser.close();
  if (fails.length) { console.error(`\nREVISIÓ FALLADA: ${fails.length} problemes\n` + [...new Set(fails)].slice(0, 40).map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
  console.log(`Revisió correcta: ${pages} pàgines comprovades (ordinador i mòbil), sense errors.`);
})().catch(e => { console.error('La revisió no s\'ha pogut executar:', e); process.exit(1); });
