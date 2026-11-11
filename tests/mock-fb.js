// Firebase de mentida per a la revisió automàtica (tests/smoke.cjs): un professor amb un grup, sense tocar cap dada real
window.DB = {
 'groups/g1': {name:'IPO II · 2n Electricitat', profs:['prof@biada.net'], owner:'u1', teamIds:['t1'], teamList:['Equip 1'], expiresAt: Date.now()+100*864e5, createdAt: 1, course:'2026-27'},
 'groups/g1/teams/t1': {name:'Equip 1', members:'[]', data:{}, updated:1, expiresAt: Date.now()+100*864e5},
 'groups/g1/teams/t1/prof/review': {v:'{}'},
 'groups/g1/teams/t1/files/u0': {name:'a.png', kind:'img', size:10, data:'xx'},
 'groups/g1/members/s1': {email:'alu@biada.net', name:'Alu', team:'t1', joined:1},
 'profs/prof@biada.net': {email:'prof@biada.net'}
};
window.WRITES=[];
window.makeFB = function(){ const kids=(c)=>Object.keys(DB).filter(k=>k.startsWith(c+'/')&&!k.slice(c.length+1).includes('/')).map(k=>Object.assign({id:k.split('/').pop()},DB[k]));
 return { onUser(cb){ setTimeout(()=>cb({uid:'u1',email:'prof@biada.net',name:'Sergi Prova'}),10); return ()=>{}; },
  async signIn(){}, signOut(){}, async get(p){return DB[p]?JSON.parse(JSON.stringify(DB[p])):null},
  async set(p,d){WRITES.push(['set',p]);DB[p]=d}, async update(p,d){Object.assign(DB[p],d)}, async del(p){delete DB[p]},
  async list(c,w){ let l=kids(c); if(w) l=l.filter(x=>(x[w[0]]||[]).includes(w[2])); return JSON.parse(JSON.stringify(l)); },
  listenDoc(p,cb){cb(DB[p]||null);return()=>{}}, listenCol(c,cb){cb(kids(c));return()=>{}},
  async batch(ops){ ops.forEach(o=>{WRITES.push([o.op,o.path, JSON.stringify(o.data||'').slice(0,80)]); if(o.op==='set')DB[o.path]=o.data; else if(o.op==='update')DB[o.path]=Object.assign(DB[o.path]||{},o.data); else delete DB[o.path];}); },
  async driveToken(e){ return {token:'TOK', email:e}; } }; };
