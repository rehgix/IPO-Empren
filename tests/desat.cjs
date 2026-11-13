// Prova de desat (a mà: node tests/desat.cjs): alumnes del mateix equip, cadascú al seu navegador, amb una base de dades compartida i regles com les reals.
// Comprova que el que escriuen arriba a la base de dades: sols, alhora, amb talls de connexió, amb apartats tancats i en amagar la pàgina.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), ORIGIN = 'https://ipo.test/';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.css': 'text/css' };
const KEYS = ['idea','empatia','entrevistes','definir','prototip','micro','pestel','dafo','lean','sost','ebc','agents','juridica','fiscal','inversio','finan','prestec','treso','viab','marca','pitch','p7','_meta','_who'];
const exp = Date.now() + 100 * 864e5;
let DB, DOWN = false, LOG = [];
function reset() { DOWN = false; LOG = []; DB = {
  'groups/g1': { name: 'Grup', profs: ['prof@biada.net'], owner: 'u1', teamIds: ['t1'], teamList: [{ id: 't1', name: 'Equip 1' }], expiresAt: exp, cfg: '{}' },
  'groups/g1/teams/t1': { name: 'Equip 1', members: '[]', data: {}, updated: 1, expiresAt: exp },
  'groups/g1/teams/t1/prof/review': { v: '{}' },
  'groups/g1/members/s1': { email: 'a1@biada.net', name: 'Anna Prova', team: 't1', joined: 1 },
  'groups/g1/members/s2': { email: 'a2@biada.net', name: 'Biel Prova', team: 't1', joined: 1 },
  'groups/g1/members/s3': { email: 'a3@biada.net', name: 'Carla Prova', team: 't1', joined: 1 } }; }
const clone = x => x == null ? null : JSON.parse(JSON.stringify(x));
function ruleStu(uid, o) { // regles de l'alumnat (resum fidel de firestore.rules)
  const m = /^groups\/g1\/teams\/(\w+)$/.exec(o.path), f = /^groups\/g1\/teams\/(\w+)\/files\/(\w+)$/.exec(o.path), g = DB['groups/g1'], w = g.w || {}, now = Date.now();
  const win = k => !(k in w) || (now >= w[k].f && now < w[k].u), mem = DB['groups/g1/members/' + uid];
  if (m) { if (o.op !== 'update' || !mem || mem.team !== m[1]) return 'no és del teu equip';
    for (const k of Object.keys(o.data)) { if (k.startsWith('data.')) { const dk = k.slice(5); if (!KEYS.includes(dk)) return 'apartat desconegut ' + dk; if (!['_meta', '_who'].includes(dk) && !win(dk)) return 'apartat tancat ' + dk; }
      else if (k === 'members') { if (!win('members')) return 'equip tancat'; } else if (!['delivered', 'updated'].includes(k)) return 'camp no permès ' + k; }
    return ''; }
  if (f) { if (o.op === 'del') return ''; if (!/^(u[12]?[0-9]|l[0-4])$/.test(f[2])) return 'nom d\'arxiu ' + f[2]; if (String(o.data.data).length >= 1e6) return 'arxiu massa gran'; return ''; }
  if (/^groups\/g1\/members\//.test(o.path)) return '';
  return 'ruta no permesa ' + o.path;
}
function srv(uid, op, a, b) {
  if (DOWN && op !== 'get' && op !== 'list' && op !== 'snap') throw new Error('unavailable');
  if (op === 'get') return clone(DB[a]);
  if (op === 'snap') return JSON.stringify(a.endsWith('/*') ? Object.keys(DB).filter(k => k.startsWith(a.slice(0, -1)) && !k.slice(a.length - 1).includes('/')).map(k => Object.assign({ id: k.split('/').pop() }, DB[k])) : (DB[a] || null));
  if (op === 'list') return Object.keys(DB).filter(k => k.startsWith(a + '/') && !k.slice(a.length + 1).includes('/')).map(k => Object.assign({ id: k.split('/').pop() }, clone(DB[k])));
  const ops = op === 'batch' ? a : [{ op, path: a, data: b }];
  if (uid !== 'u1') for (const o of ops) { const r = ruleStu(uid, o); if (r) { LOG.push(uid + ' REBUTJAT: ' + r); const e = new Error('Missing or insufficient permissions (' + r + ')'); throw e; } }
  for (const o of ops) { if (o.op === 'set') DB[o.path] = clone(o.data); else if (o.op === 'del') delete DB[o.path];
    else { const d = DB[o.path] = DB[o.path] || {}; for (const k of Object.keys(o.data)) { const p = k.split('.'); if (p.length === 2) { d[p[0]] = d[p[0]] || {}; d[p[0]][p[1]] = clone(o.data[k]); } else d[k] = clone(o.data[k]); } } }
  LOG.push(uid + ' ' + ops.map(o => o.op + ':' + o.path.split('/').slice(2).join('/') + (o.data ? '[' + Object.keys(o.data).join(',') + ']' : '')).join(' '));
  return null;
}
const MOCK = `window.makeFB = function(){ const U = JSON.parse(localStorage.getItem('mockUser')); const c = (...a) => window.__srv(U.uid, ...a).catch(e => { const x = new Error(e.message.replace(/^.*?Error: /,'')); x.code = /permission/i.test(x.message) ? 'permission-denied' : 'unavailable'; throw x; });
 const L = [], ov = (d, data) => { d = JSON.parse(JSON.stringify(d || {})); Object.keys(data).forEach(k => { const p = k.split('.'); if (p.length === 2) { d[p[0]] = d[p[0]] || {}; d[p[0]][p[1]] = data[k]; } else d[k] = data[k]; }); return d; };
 const listen = (key, cb) => { const l = { key, cb, last: undefined, on: true }; L.push(l); const tick = async () => { if (!l.on) return; try { const s = await window.__srv(U.uid, 'snap', key); if (l.on && s !== l.last) { l.last = s; cb(JSON.parse(s)); } } catch (e) {} if (l.on) setTimeout(tick, 120); }; tick(); return () => { l.on = false; }; };
 // Com el Firebase de veritat: el que escrius tu arriba de seguida als teus propis oients, abans que el servidor respongui
 const echo = ops => ops.forEach(o => { if (o.op !== 'update') return; L.forEach(l => { if (l.on && l.key === o.path && l.last) { const d = ov(JSON.parse(l.last), o.data); l.last = JSON.stringify(d); l.cb(JSON.parse(l.last)); } }); });
 return { onUser(cb){ setTimeout(() => cb(U), 10); return () => {}; }, async signIn(){}, signOut(){}, get: p => c('get', p), set: (p, d) => c('set', p, d), update: (p, d) => c('update', p, d), del: p => c('del', p),
  list: p => c('list', p), listenDoc: (p, cb) => listen(p, cb), listenCol: (p, cb) => listen(p + '/*', cb), batch: ops => { echo(ops); return c('batch', ops); }, async driveToken(e){ return { token: 'T', email: e }; } }; };`;
async function student(browser, uid, n) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }), page = await ctx.newPage(); page.errs = [];
  page.on('pageerror', e => page.errs.push(String(e).slice(0, 200)));
  page.on('dialog', d => d.accept());
  await page.exposeFunction('__srv', (...a) => srv(...a));
  await page.route('**/*', r => { const url = r.request().url(); if (!url.startsWith(ORIGIN)) return r.abort();
    let rel = decodeURIComponent(url.slice(ORIGIN.length).split(/[?#]/)[0]) || 'index.html';
    if (rel === 'fbapi.js') return r.fulfill({ body: MOCK, contentType: TYPES['.js'] });
    const file = path.join(ROOT, rel); if (!fs.existsSync(file)) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ body: fs.readFileSync(file), contentType: TYPES[path.extname(file)] || 'application/octet-stream' }); });
  await page.addInitScript(u => { localStorage.setItem('mockUser', JSON.stringify(u)); }, { uid, email: 'a' + n + '@biada.net', name: DB['groups/g1/members/' + uid].name });
  await page.goto(ORIGIN + 'index.html#g=g1'); await page.waitForFunction(() => document.body.classList.contains('is-student'), null, { timeout: 15000 });
  await page.waitForTimeout(600);
  // tanca la finestra de benvinguda si hi és
  await page.evaluate(() => { const b = document.querySelector('[data-bkclose]'); if (b) b.click(); }); await page.waitForTimeout(200);
  return page;
}
const goTab = async (p, t) => { await p.evaluate(t => { const b = document.querySelector('#tabs [data-tab="' + t + '"]'); if (!b) throw new Error('no hi ha la pestanya ' + t); b.click(); }, t); await p.waitForTimeout(250); };
const type = async (p, sel, txt, delay = 15) => { const el = p.locator(sel).first(); await el.click(); await el.pressSequentially(txt, { delay }); };
const dbData = k => JSON.parse(DB['groups/g1/teams/t1'].data[k] || 'null');
const res = []; const ok = (name, cond, extra = '') => { res.push((cond ? 'OK   ' : 'FALLA') + ' ' + name + (extra ? ' → ' + extra : '')); };
(async () => {
  const browser = await chromium.launch();
  const only = process.argv[2];
  const T = async (name, fn) => { if (only && !name.startsWith(only)) return; reset(); try { await fn(); } catch (e) { ok(name, false, 'excepció: ' + String(e).slice(0, 300)); } };
  await T('1 escriu i es desa', async () => {
    const a = await student(browser, 's1', 1); await goTab(a, 'idea');
    const paths = await a.evaluate(() => [...document.querySelectorAll('#view [data-path]')].filter(e => /TEXTAREA|INPUT/.test(e.tagName) && e.type !== 'checkbox' && e.type !== 'radio').map(e => e.dataset.path));
    ok('1a hi ha camps per escriure a Idea', paths.length > 1, paths.slice(0, 6).join(','));
    await type(a, `[data-path="${paths[0]}"]`, 'Reparem bicicletes a domicili');
    await a.waitForTimeout(2200);
    const [s, f] = paths[0].split('.'); ok('1b el text arriba a la base de dades', (dbData(s) || {})[f] === 'Reparem bicicletes a domicili', JSON.stringify((dbData(s) || {})[f]));
    ok('1c indicador «Desat»', /Desat/.test(await a.locator('#syncPill').textContent()));
    await a.reload(); await a.waitForFunction(() => document.body.classList.contains('is-student')); await a.waitForTimeout(800); await a.evaluate(() => { const b = document.querySelector('[data-bkclose]'); if (b) b.click(); }); await goTab(a, 'idea');
    ok('1d en recarregar, el text hi és', await a.locator(`[data-path="${paths[0]}"]`).first().inputValue() === 'Reparem bicicletes a domicili');
    ok('1e sense errors de programa', !a.errs.length, a.errs.join(' | ')); await a.context().close();
  });
  await T('2 tres alumnes alhora', async () => {
    const [a, b, c] = await Promise.all([student(browser, 's1', 1), student(browser, 's2', 2), student(browser, 's3', 3)]);
    for (const p of [a, b, c]) await goTab(p, 'idea');
    const paths = await a.evaluate(() => [...document.querySelectorAll('#view textarea[data-path], #view input[type=text][data-path]')].map(e => e.dataset.path));
    const txt = ['Text llarg de la primera alumna, escrit a poc a poc.', 'El segon alumne escriu alhora una altra resposta.', 'La tercera també escriu al mateix temps que els altres.'];
    await Promise.all([a, b, c].map((p, i) => type(p, `[data-path="${paths[i]}"]`, txt[i], 60)));
    await a.waitForTimeout(3500);
    const d = dbData('idea') || {}; paths.slice(0, 3).forEach((pt, i) => ok('2' + 'abc'[i] + ' text de l\'alumne ' + (i + 1) + ' (mateix apartat, camps diferents)', d[pt.split('.')[1]] === txt[i], JSON.stringify(d[pt.split('.')[1]])));
    const mm = JSON.parse(DB['groups/g1/teams/t1'].members); ok('2 (informatiu, al cap de 3 s) els tres queden apuntats a la fitxa de l\'equip', ['s1','s2','s3'].every(u => mm.some(m => m.uid === u)), mm.map(m => m.name + ':' + m.uid).join(','));
    // Ara cadascú en un apartat diferent
    const tabs = ['dafo', 'pestel', 'micro']; const got = [];
    await Promise.all([a, b, c].map(async (p, i) => { await goTab(p, tabs[i]); await p.waitForTimeout(300); const sel = '#view textarea[data-path], #view textarea[data-list], #view input[type=text][data-path]'; if (!await p.locator(sel).count()) { got[i] = null; return; } await type(p, sel, 'Feina de ' + tabs[i], 50); got[i] = await p.locator(sel).first().evaluate(e => e.dataset.path || `${e.dataset.list}.${e.dataset.idx}.${e.dataset.key}`); }));
    await a.waitForTimeout(3000);
    const getP = (o, p) => p.split('.').reduce((x, k) => x == null ? x : x[k], o);
    tabs.forEach((t, i) => { if (!got[i]) return ok('2 apartat ' + t, false, 'no hi ha cap camp'); const v = getP({ [got[i].split('.')[0]]: dbData(got[i].split('.')[0]) }, got[i]); ok('2 apartats diferents: ' + t, v === 'Feina de ' + t, got[i] + '=' + JSON.stringify(v)); });
    // I els altres ho veuen
    await goTab(b, 'dafo'); await b.waitForTimeout(800);
    ok('2 el company veu la feina dels altres', (await b.evaluate(() => [...document.querySelectorAll('#view textarea, #view input')].map(e => e.value).join('|'))).includes('Feina de dafo'));
    { const mm = JSON.parse(DB['groups/g1/teams/t1'].members); ok('2 (al final) els tres queden apuntats a la fitxa de l\'equip', ['s1','s2','s3'].every(u => mm.some(m => m.uid === u)) && mm.length === 3, mm.map(m => m.name + ':' + m.uid).join(',')); }
    ok('2 sense errors de programa', ![a, b, c].some(p => p.errs.length), [a, b, c].map(p => p.errs.join('|')).join(' '));
    for (const p of [a, b, c]) await p.context().close();
  });
  await T('3 tall de connexió', async () => {
    const a = await student(browser, 's1', 1); await goTab(a, 'idea'); const sel = '#view textarea[data-path]';
    DOWN = true; await type(a, sel, 'Escrit sense connexió'); await a.waitForTimeout(2500);
    const pill = await a.locator('#syncPill').textContent(); ok('3a avisa que no s\'ha desat', /Sense connexió/.test(pill), pill);
    DOWN = false; await a.waitForTimeout(9500);
    const pt = await a.locator(sel).first().evaluate(e => e.dataset.path), [s, f] = pt.split('.');
    ok('3b en tornar la connexió es desa sol', (dbData(s) || {})[f] === 'Escrit sense connexió', JSON.stringify((dbData(s) || {})[f])); await a.context().close();
  });
  await T('4 tanca de seguida', async () => {
    const a = await student(browser, 's1', 1); await goTab(a, 'idea'); const sel = '#view textarea[data-path]';
    const pt = await a.locator(sel).first().evaluate(e => e.dataset.path), [s, f] = pt.split('.');
    await type(a, sel, 'Tanco de pressa', 5); await a.waitForTimeout(150);
    await a.close({ runBeforeUnload: false }); await new Promise(r => setTimeout(r, 1500));
    ok('4a tancar la pestanya just després d\'escriure (menys d\'1 segon)', (dbData(s) || {})[f] === 'Tanco de pressa', JSON.stringify((dbData(s) || {})[f]));
    const b = await student(browser, 's2', 2); await goTab(b, 'idea'); await type(b, sel, 'Canvio de pagina', 5);
    await b.evaluate(() => { location.hash = ''; }); await b.waitForTimeout(2500);
    ok('4b sortir del grup just després d\'escriure', (dbData(s) || {})[f] === 'Tanco de pressaCanvio de pagina' || (dbData(s) || {})[f] === 'Canvio de pagina', JSON.stringify((dbData(s) || {})[f])); await b.context().close();
  });
  await T('5 apartat tancat pel professor', async () => {
    DB['groups/g1'].w = { dafo: { f: 9e15, u: 9e15 } }; DB['groups/g1'].cfg = JSON.stringify({ access: { dafo: { state: 'closed' } } });
    const a = await student(browser, 's1', 1); await goTab(a, 'idea'); await type(a, '#view textarea[data-path]', 'Idea amb DAFO tancat'); await a.waitForTimeout(2200);
    ok('5 amb un altre apartat tancat, la resta es desa', JSON.stringify(dbData('idea') || {}).includes('Idea amb DAFO tancat'), LOG.slice(-3).join(' ; ')); await a.context().close();
  });
  await T('6 regles i web desquadrades', async () => {
    // El grup diu (w) que «idea» està tancat però la configuració que veu l'alumne diu que és obert: què passa amb la resta de feina?
    DB['groups/g1'].w = { idea: { f: 9e15, u: 9e15 } };
    const a = await student(browser, 's1', 1); await goTab(a, 'idea'); await type(a, '#view textarea[data-path]', 'Text rebutjat'); await a.waitForTimeout(1800);
    await goTab(a, 'dafo'); await a.waitForTimeout(300); await type(a, '#view textarea', 'DAFO bo'); await a.waitForTimeout(2500);
    ok('6 si un apartat és rebutjat, la resta es desa igualment', JSON.stringify(dbData('dafo') || {}).includes('DAFO bo'), LOG.filter(x => /REBUTJAT/.test(x)).slice(-1)[0] || '');
    await goTab(a, 'idea'); ok('6 el text rebutjat continua a la pantalla de l\'alumne (no desapareix)', await a.locator('[data-path="idea.activitat"]').inputValue() === 'Text rebutjat');
    const pill = await a.locator('#syncPill').textContent(); ok('6 l\'alumne veu que una part no s\'ha desat', /no s'ha pogut desar/.test(pill), pill); await a.context().close();
  });
  await T('8 dos alumnes al mateix camp', async () => {
    const [a, b] = await Promise.all([student(browser, 's1', 1), student(browser, 's2', 2)]); await goTab(a, 'idea'); await goTab(b, 'idea');
    const sel = '#view textarea[data-path]';
    await Promise.all([type(a, sel, 'AAAA AAAA AAAA AAAA AAAA', 80), type(b, sel, 'BBBB BBBB BBBB BBBB BBBB', 80)]); await a.waitForTimeout(3500);
    const v = (dbData('idea') || {}).activitat; ok('8 (informatiu) mateix camp alhora: queda el text d\'un dels dos', /^A[A ]+$|^B[B ]+$/.test(v), JSON.stringify(v));
    await a.context().close(); await b.context().close();
  });
  await T('9 canvi d\'un company mentre escric', async () => {
    const [a, b] = await Promise.all([student(browser, 's1', 1), student(browser, 's2', 2)]); await goTab(a, 'idea'); await goTab(b, 'idea');
    const ta = a.locator('[data-path="idea.activitat"]'); await ta.click(); await ta.pressSequentially('Primera part', { delay: 10 }); await a.waitForTimeout(1800);
    await type(b, '[data-path="idea.diferenciador"]', 'Cosa del company', 10); await b.waitForTimeout(1800); // arriba a «a» mentre té el cursor al camp
    await ta.pressSequentially(' i segona part', { delay: 10 }); await a.waitForTimeout(2500);
    const d = dbData('idea') || {}; ok('9 segueixo escrivint després de rebre un canvi del company', d.activitat === 'Primera part i segona part' && d.diferenciador === 'Cosa del company', JSON.stringify([d.activitat, d.diferenciador]));
    await a.context().close(); await b.context().close();
  });
  await T('10 dos desen exactament alhora', async () => {
    const [a, b] = await Promise.all([student(browser, 's1', 1), student(browser, 's2', 2)]); await goTab(a, 'idea'); await goTab(b, 'idea'); await a.waitForTimeout(1500);
    let lost = 0; const N = 6;
    for (let i = 0; i < N; i++) {
      const ta = 'Frase A' + i + ' xxxxxxxx', tb = 'Frase B' + i + ' xxxxxxxx';
      await Promise.all([a.evaluate(v => { const e = document.querySelector('[data-path="idea.activitat"]'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, ta), b.evaluate(v => { const e = document.querySelector('[data-path="idea.diferenciador"]'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, tb)]);
      await a.evaluate(() => document.activeElement && document.activeElement.blur()); await b.evaluate(() => document.activeElement && document.activeElement.blur());
      await a.waitForTimeout(4000); const d = dbData('idea') || {}; if (d.activitat !== ta || d.diferenciador !== tb) lost++;
    }
    ok('10 dos companys desen al mateix instant (camps diferents), ' + N + ' vegades', lost === 0, lost + ' vegades s\'ha perdut un dels dos textos');
    await a.context().close(); await b.context().close();
  });
  await T('11 canvia de pestanya del navegador', async () => {
    const a = await student(browser, 's1', 1); await goTab(a, 'idea');
    await a.evaluate(() => { const e = document.querySelector('[data-path="idea.activitat"]'); e.value = 'Bloquejo la tauleta'; e.dispatchEvent(new Event('input', { bubbles: true })); Object.defineProperty(document, 'visibilityState', { get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await a.waitForTimeout(300); ok('11 en amagar la pàgina es desa a l\'instant', (dbData('idea') || {}).activitat === 'Bloquejo la tauleta', JSON.stringify((dbData('idea') || {}).activitat)); await a.context().close();
  });
  await browser.close(); console.log(res.join('\n'));
  if (res.some(r => r.startsWith('FALLA') && !/informatiu|^FALLA 4a/.test(r))) process.exit(1);
})().catch(e => { console.log(res.join('\n')); console.error(e); process.exit(1); });
