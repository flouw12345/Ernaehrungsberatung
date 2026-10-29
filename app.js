"use strict";
const APP_VERSION="2.3.0";

/* ---------- Zustand & Speicherung (nur auf diesem Gerät) ---------- */
const LS="makrocoach.v1";
function iso(d){const z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,10)}
function addDays(s,n){const d=new Date(s+"T12:00:00");d.setDate(d.getDate()+n);return iso(d)}
function exampleState(){
  const today=iso(new Date());const log=[];let w=88.6;
  for(let i=24;i>=0;i--){ if(i%7===2||i%7===5) continue; const t=(24-i);w=88.6-t*0.06+Math.sin(t*1.7)*0.35;log.push({d:addDays(today,-i),kg:Math.round(w*10)/10});}
  return {v:2,example:true,updatedAt:0,adjust:0,adjustLog:[],shop:{},weekFlags:{},days:{},custom:[],
    profile:{sex:"m",age:30,height:182,weight:88,bf:20,steps:"s2",days:4,dur:60,goal:"moderat",region:"de",excl:[],main:3,snacks:0,shake:30,shakeMilk:false,prep:true,weekend:"LD"},log};
}
// Ergänzt Felder, die ältere Stände (z. B. Backups aus dem Makro-Coach-Artefakt) noch nicht haben
function normalize(s){
  s.days=s.days&&typeof s.days==="object"?s.days:{};
  s.custom=Array.isArray(s.custom)?s.custom:[];
  s.logDel=s.logDel||{};
  // Ältere Profile kannten nur "meals" (3–5): in Hauptmahlzeiten + Snacks umrechnen
  const p=s.profile;if(p&&p.main==null){const m=Number(p.meals)||4;Object.assign(p,{main:3,snacks:Math.min(2,Math.max(0,m-3)),shake:0,shakeMilk:false,weekend:"LD"});delete p.meals}
  s.shop=s.shop||{};s.shopOpts=Object.assign({open:true,qty:true,cats:false},s.shopOpts);s.weekFlags=s.weekFlags||{};s.adjustLog=s.adjustLog||[];s.adjust=s.adjust||0;
  return s;
}
function lsGet(){try{const s=localStorage.getItem(LS);return s?JSON.parse(s):null}catch(e){return null}}
function lsSet(s){try{localStorage.setItem(LS,JSON.stringify(s));return true}catch(e){return false}}
let state=normalize(lsGet()||exampleState());

function save(){state.updatedAt=Date.now();if(!lsSet(state))toast("Speichern fehlgeschlagen – Speicher voll oder gesperrt")}

/* ---------- Helfer ---------- */
const nf=(x,d=0)=>Number(x).toLocaleString("de-DE",{minimumFractionDigits:d,maximumFractionDigits:d});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(msg){document.querySelectorAll(".toast").forEach(t=>t.remove());const t=document.createElement("div");t.className="toast";t.setAttribute("role","status");t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}
function mondayOf(s){const d=new Date(s+"T12:00:00");const wd=(d.getDay()+6)%7;d.setDate(d.getDate()-wd);return iso(d)}
function weekdayOf(s){return (new Date(s+"T12:00:00").getDay()+6)%7}
function fmtDate(s,long){const d=new Date(s+"T12:00:00");return d.toLocaleDateString("de-DE",long?{weekday:"short",day:"2-digit",month:"2-digit"}:{day:"2-digit",month:"2-digit"})}
function searchKey(s){return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ß/g,"ss")}

/* ---------- Berechnung ---------- */
function weeks(){
  const m={};for(const e of [...state.log].sort((a,b)=>a.d<b.d?-1:1)){const k=mondayOf(e.d);(m[k]=m[k]||[]).push(e)}
  return Object.keys(m).sort().map(k=>{const a=m[k];return {wk:k,n:a.length,avg:a.reduce((s,e)=>s+e.kg,0)/a.length,entries:a}});
}
function currentWeight(){
  const p=state.profile;if(!state.log.length)return {w:p.weight,src:"Profilangabe"};
  const sorted=[...state.log].sort((a,b)=>a.d<b.d?-1:1);const last=sorted[sorted.length-1];
  const from=addDays(last.d,-6);const recent=sorted.filter(e=>e.d>=from);
  if(recent.length>=2)return {w:recent.reduce((s,e)=>s+e.kg,0)/recent.length,src:"Ø der letzten 7 Tage"};
  return {w:last.kg,src:"letzte Messung"};
}
function calc(){
  const p=state.profile;const cw=currentWeight();const w=cw.w;const male=p.sex==="m";
  const mif=10*w+6.25*p.height-5*p.age+(male?5:-161);
  const hb=male?88.362+13.397*w+4.799*p.height-5.677*p.age:447.593+9.247*w+3.098*p.height-4.330*p.age;
  const km=p.bf?370+21.6*w*(1-p.bf/100):null;
  const methods=[["Mifflin-St Jeor",mif],["Harris-Benedict (rev.)",hb]];if(km)methods.push(["Katch-McArdle",km]);
  const bmr=methods.reduce((s,m)=>s+m[1],0)/methods.length;
  const st=STEPS.find(s=>s[0]===p.steps)||STEPS[1];
  const train=p.days*0.035*(p.dur/60);
  const pal=st[3]+train;const tdee=bmr*pal;
  const g=GOALS.find(x=>x[0]===p.goal)||GOALS[1];
  const defRaw=w*g[3]/100*7700/7;const cap=tdee*0.25;const def=Math.min(defRaw,cap);
  let target=tdee-def+(state.adjust||0);
  const floor=Math.max(mif,male?1500:1200);let floored=false;
  if(target<floor){target=floor;floored=true}
  target=Math.round(target/10)*10;
  const P=Math.round(2*w);
  let F=Math.round(Math.max(0.8*w,target*0.22/9));
  let C=Math.round((target-P*4-F*9)/4);
  if(C<60){F=Math.round(Math.max(0.6*w,(target-P*4-60*4)/9));C=Math.round((target-P*4-F*9)/4)}
  const kgWeek=(tdee-target)*7/7700;
  const fiber=Math.max(25,Math.round(target/1000*14));
  const water=Math.round(w*0.035*10)/10;
  return {w,wsrc:cw.src,methods,bmr,pal,st,train,tdee,g,def,defRaw,cap,target,floored,P,C,F,kgWeek,fiber,water,lbm:p.bf?w*(1-p.bf/100):null};
}

/* ---------- Plan-Generator ---------- */
function allowed(fid,p){const f=FOODS[fid];if(f.reg&&!f.reg.includes(p.region))return false;return !(f.tags||[]).some(t=>p.excl.includes(t))}
function resolveMeal(m,p){
  const items=[];
  for(const it of m.items){const fid=it.c.find(x=>allowed(x,p));if(!fid){if(it.req||it.r==="P")return null;continue}items.push({...it,fid,g:it.r==="x"?it.g:(it.min+(it.max-it.min)/3)})}
  return {m,items};
}
const KEY={P:"p",C:"c",F:"f"};
function tot(items,k){return items.reduce((s,i)=>s+i.g*(FOODS[i.fid][k]||0)/100,0)}
function solve(items,t,iters){
  for(let n=0;n<iters;n++)for(const R of ["P","C","F"]){const k=KEY[R];
    for(const i of items.filter(x=>x.r===R)){const m=FOODS[i.fid][k]/100;if(m<=0)continue;
      const need=(t[k]-(tot(items,k)-i.g*m))/m;i.g=clamp(need,i.min,i.max)}}
}
function roundG(fid,g){if(fid==="oil")return Math.round(g/2)*2;if(["pb","nuts","whey","soyprot"].includes(fid))return Math.round(g/5)*5;return Math.round(g/10)*10}
let weekCache=null;
function mealCfg(p){return {main:p.main===2?2:3,snacks:Math.min(2,Math.max(0,Number(p.snacks)||0)),shake:Number(p.shake)||0,shakeMilk:!!p.shakeMilk,weekend:p.weekend==="L"?"L":"LD"}}
function shakeMeal(p,cfg){
  if(!cfg.shake)return null;
  const prot=["whey","soyprot"].find(x=>allowed(x,p));if(!prot)return null;
  const items=[{c:[prot],r:"x",g:cfg.shake,fid:prot}];
  const milk=cfg.shakeMilk&&["milk","soymilk"].find(x=>allowed(x,p));if(milk)items.push({c:[milk],r:"x",g:250,fid:milk});
  return {slot:"S",m:{id:"dailyshake",n:`Proteinshake mit ${cfg.shake} g ${prot==="whey"?"Whey":"Sojaprotein"}`,prep:milk?"Mit 250 ml Milch shaken.":"Mit 300 ml Wasser shaken."},items};
}
// Woher kommt Mittag- und Abendessen? k = Index des Gerichts, from = Tag, an dem gekocht wird (Mo=0 … So=6)
function cookSchedule(p,cfg,n){
  const lunch=[],dinner=[];
  if(p.prep){
    // Gekocht wird Sa, So, Mo … Fr, jeder Kochtag bekommt ein eigenes Gericht
    const dish={};[5,6,0,1,2,3,4].forEach((d,i)=>{dish[d]=i});
    // Freitag nicht dasselbe Gericht wie Samstag, wenn genug Gerichte zur Auswahl stehen
    if(n>2&&dish[4]%n===dish[5]%n)dish[4]++;
    for(let d=0;d<7;d++){
      // Mo–Fr: Mittagessen wurde am Vorabend vorgekocht (Montag: am Sonntag)
      lunch[d]=d===0?{k:dish[6],from:6}:d<=4?{k:dish[d-1],from:d-1}:{k:dish[d],from:d};
      dinner[d]=d<=4||cfg.weekend==="LD"?{k:dish[d],from:d}:{cold:true};
    }
  } else for(let d=0;d<7;d++){lunch[d]={k:d,from:d};dinner[d]={k:d+3,from:d,fresh:true}}
  return {lunch,dinner};
}
function buildWeek(){
  const key=JSON.stringify([state.profile,state.adjust,state.log.length,state.log[state.log.length-1]]);
  if(weekCache&&weekCache.key===key)return weekCache.val;
  const p=state.profile;const r=calc();const cfg=mealCfg(p);
  const valid=s=>MEALS.filter(m=>m.slot===s).map(m=>resolveMeal(m,p)).filter(Boolean);
  const shake=shakeMeal(p,cfg);
  const B=valid("B"),M=valid("M"),K=valid("K"),S=valid("S").filter(x=>!(shake&&x.m.id==="shake"));
  // Reihenfolge: Frühstück, (Snack), Mittag, (Shake), (Snack), (Abend); Snacks bekommen je 12 % der Makros
  const SN=0.12,scale=1-SN*cfg.snacks;
  const slots=[["B",(cfg.main===2?.4:.3)*scale]];
  if(cfg.snacks>=2)slots.push(["S",SN]);
  slots.push(["L",(cfg.main===2?.6:.35)*scale]);
  if(shake)slots.push(["SHAKE",0]);
  if(cfg.snacks>=1)slots.push(["S",SN]);
  if(cfg.main===3)slots.push(["D",.35*scale]);
  const tgt={p:r.P,c:r.C,f:r.F};
  const sm=shake?macrosOf(shake.items):{p:0,c:0,f:0};
  const rest={p:Math.max(0,tgt.p-sm.p),c:Math.max(0,tgt.c-sm.c),f:Math.max(0,tgt.f-sm.f)};
  const sched=cookSchedule(p,cfg,M.length);const dishOf=k=>M.length?M[k%M.length]:null;
  const week=[];
  for(let d=0;d<7;d++){
    let sIdx=0;const meals=[];
    for(const [s,frac] of slots){
      if(s==="SHAKE"){meals.push({...shake,items:shake.items.map(i=>({...i}))});continue}
      let pick=null,from=null;
      if(s==="B")pick=B[d%B.length];
      else if(s==="L"){const src=sched.lunch[d];pick=dishOf(src.k);from=src.from}
      else if(s==="D"){const src=sched.dinner[d];
        if(src.cold){const pool=K.length?K:B;pick=pool[d%pool.length]}
        else{pick=dishOf(src.k);from=src.from;const l=dishOf(sched.lunch[d].k);
          if(src.fresh&&pick&&l&&M.length>1&&pick.m.id===l.m.id)pick=dishOf(src.k+1)}}
      else if(S.length){pick=S[(d+sIdx*2)%S.length];sIdx++}
      if(!pick)continue;
      const items=pick.items.map(i=>({...i}));
      solve(items,{p:rest.p*frac,c:rest.c*frac,f:rest.f*frac},10);
      meals.push({slot:s,m:pick.m,items,from});
    }
    const all=meals.flatMap(x=>x.items);
    for(let n=0;n<8;n++)for(const R of ["P","C","F"]){const k=KEY[R];const gap=tgt[k]-tot(all,k);
      const its=all.filter(i=>i.r===R&&FOODS[i.fid][k]>0);const con=its.reduce((s,i)=>s+i.g*FOODS[i.fid][k]/100,0);if(con<1)continue;
      const fac=1+gap/con;for(const i of its)i.g=clamp(i.g*fac,i.min,i.max*1.4)}
    for(const i of all)i.g=roundG(i.fid,i.g);
    for(const ml of meals)ml.items=ml.items.filter(i=>i.g>0);
    week.push(meals);
  }
  // Kochplan: pro Kochtag das Gericht mit allen Mahlzeiten, für die es reicht
  const cooks=Array.from({length:7},()=>[]);
  week.forEach((meals,d)=>meals.forEach(ml=>{if(ml.from===null||ml.from===undefined)return;
    let c=cooks[ml.from].find(x=>x.m.id===ml.m.id);if(!c){c={m:ml.m,from:ml.from,uses:[],sum:{}};cooks[ml.from].push(c)}
    c.uses.push({d,slot:ml.slot});for(const i of ml.items)c.sum[i.fid]=(c.sum[i.fid]||0)+i.g}));
  for(const list of cooks)for(const c of list)c.uses.sort((a,b)=>((a.d-c.from+7)%7)-((b.d-c.from+7)%7)||(a.slot==="L"?-1:1));
  weekCache={key,val:{week,r,cooks,cfg}};
  return weekCache.val;
}
function macrosOf(items){return {k:tot(items,"k"),p:tot(items,"p"),c:tot(items,"c"),f:tot(items,"f")}}
function amount(fid,g){
  const f=FOODS[fid];
  if(f.unit){const n=Math.round(g/f.unit.g*2)/2;return nf(n,n%1?1:0)+" "+f.unit.l}
  if(fid==="oil")return nf(g)+" g · ≈ "+nf(g/10,1)+" EL";
  if(f.scoop)return nf(g)+" g · ≈ "+nf(g/f.scoop,1)+" Messl.";
  if(f.slice)return nf(g)+" g · "+nf(Math.round(g/f.slice*2)/2,1)+" Scheiben";
  return nf(g)+" g";
}
function foodName(fid){const f=FOODS[fid];return state.profile.region==="cn"?f.n+" · "+f.cn:f.n}

/* ---------- Gewichtsanalyse ---------- */
function analyse(){
  const ws=weeks().filter(w=>w.n>=3);const g=GOALS.find(x=>x[0]===state.profile.goal)||GOALS[1];const target=-g[3];
  if(ws.length<2)return {status:"wait",ws,target,txt:"Noch zu wenig Daten. Ich brauche mindestens zwei Wochen mit je drei Messungen, um einen Trend zu erkennen.",delta:0};
  const ch=[];for(let i=1;i<ws.length;i++)ch.push((ws[i].avg-ws[i-1].avg)/ws[i-1].avg*100);
  const last=ch[ch.length-1],prev=ch.length>1?ch[ch.length-2]:null;
  const lastWk=ws[ws.length-1].wk;const weak=!!(state.weekFlags||{})[lastWk];
  const slow=c=>c>target+0.2, fast=c=>c<target-0.3;
  let status="ok",delta=0,txt="Du liegst im Zielkorridor. Plan bleibt unverändert.";
  if(fast(last)){status="fast";delta=+125;txt="Du nimmst schneller ab als geplant. Mehr Energie schützt Kraft und Muskulatur."}
  else if(weak&&!slow(last)){status="fast";delta=+100;txt="Deine Kraftwerte sind gesunken. Etwas mehr Energie, vor allem um das Training herum, hilft."}
  else if(slow(last)&&prev!==null&&slow(prev)){status="slow";delta=-125;txt="Zwei Wochen in Folge langsamer als geplant. Ich senke die Kalorien leicht, über Kohlenhydrate und Fett."}
  else if(slow(last)){status="watch";txt="Diese Woche etwas langsamer als geplant. Das ist oft nur Wasser, also noch keine Anpassung. Nächste Woche entscheidet."}
  return {status,delta,txt,last,prev,target,ws,lastWk,weak};
}

/* ---------- Tagebuch ---------- */
const GLASS_ML=250;
const SLOTS=["B","L","D","S"];
function peekDay(d){return state.days[d]||{entries:[],water:0}}
// Nur für Änderungen aufrufen: der Zeitstempel entscheidet beim Zusammenführen, welche Version eines Tages gilt
function getDay(d){if(!state.days[d])state.days[d]={entries:[],water:0};state.days[d].u=Date.now();return state.days[d]}
function dayTotals(entries){
  const t={k:0,p:0,c:0,f:0,fi:0,og:0};
  for(const e of entries){const m=e.g/100;t.k+=e.k*m;t.p+=e.p*m;t.c+=e.c*m;t.f+=e.f*m;t.fi+=(e.fi||0)*m;if(e.og)t.og+=e.g}
  return t;
}
function allDiaryFoods(){return state.custom.concat(DIARY_FOODS)}
function suggestSlot(){const h=new Date().getHours();return h<11?"B":h<15?"L":h<17?"S":"D"}
function planEntries(ml,ref){
  return ml.items.map(i=>{const f=FOODS[i.fid];return {n:f.n,k:f.k,p:f.p,c:f.c,f:f.f,fi:f.fi||0,og:!!f.og,g:i.g,meal:ml.slot,plan:ref}});
}
const PROTEIN_SOURCES=[["Hähnchen","meat"],["Thunfisch","fish"],["Skyr","dairy"],["Magerquark","dairy"],["Eiklar","egg"],["Tofu","soy"],["Linsen",null],["Proteinpulver",null]];
function advice(day,r){
  const s=dayTotals(day.entries);const out=[];const p=state.profile;
  const isToday=diaryDay===iso(new Date());
  if(!day.entries.length){out.push(["","Für diesen Tag ist noch nichts eingetragen. Übernimm Mahlzeiten aus deinem Plan oder suche Lebensmittel."])}
  else{
    const q=s.k/r.target;
    if(q>1.1)out.push(["warn",`Du liegst ${nf(s.k-r.target)} kcal über deinem Ziel. Kleinere Portionen oder mehr Gemüse helfen beim nächsten Mal.`]);
    else if(q>=0.9)out.push(["good","Deine Kalorienzufuhr passt gut zu deinem Ziel."]);
    else if(!isToday||new Date().getHours()>=19)out.push(["warn",`Dir fehlen ${nf(r.target-s.k)} kcal. Ein zu großes Defizit kostet Kraft und Muskulatur.`]);
    else out.push(["",`Noch ${nf(r.target-s.k)} kcal verfügbar.`]);
    if(s.p<r.P*0.85){const src=PROTEIN_SOURCES.filter(([,tag])=>!tag||!p.excl.includes(tag)).map(([n])=>n).slice(0,5).join(", ");
      out.push(["warn",`Protein: ${nf(s.p)} von ${nf(r.P)} g. Gute Quellen: ${src}.`])}
    else out.push(["good",`Protein: ${nf(s.p)} g, gut versorgt.`]);
    if(s.fi<r.fiber*0.7)out.push(["warn",`Ballaststoffe: nur ${nf(s.fi)} g (Ziel ≥ ${nf(r.fiber)} g). Mehr Vollkorn, Gemüse, Linsen oder Beeren.`]);
    else out.push(["good",`Ballaststoffe: ${nf(s.fi)} g, sehr gut.`]);
    if(s.f>r.F*1.25)out.push(["warn","Recht viel Fett heute. Auf versteckte Fette in Käse, Wurst, Snacks und Öl achten."]);
    if(s.og<400)out.push(["warn",`Obst & Gemüse: ${nf(s.og)} g. Rund 650 g pro Tag sind ideal.`]);
    else out.push(["good",`Obst & Gemüse: ${nf(s.og)} g, prima.`]);
  }
  const wl=day.water/1000;
  if(wl<r.water*0.75)out.push(["warn",`Trinken: ${nf(wl,2)} von ${nf(r.water,1)} l. Stell dir ein Glas Wasser in Sichtweite.`]);
  else out.push(["good",`Trinken: ${nf(wl,2)} l, gut hydriert.`]);
  return out;
}

/* ---------- Ansichten ---------- */
let view="heute",wiz=0,draft=null,planDay=(new Date().getDay()+6)%7,confirmReset=false,exportText="";
let diaryDay=iso(new Date()),selFood=null,addG=100,addSlot=suggestSlot();
function exampleBanner(){return state.example?`<div class="banner"><p><b>Beispielwerte.</b> Alles hier ist ein ausgefülltes Muster. Beantworte den Fragebogen, dann rechnet der Coach mit deinen Daten.</p><button class="primary" data-act="startwiz">Fragebogen starten</button></div>`:""}

function vHeute(){
  const {week,r}=buildWeek();const day=peekDay(diaryDay);const t=dayTotals(day.entries);
  const circ=2*Math.PI*52;const ratio=Math.min(t.k/r.target,1);const over=t.k>r.target*1.05;
  const left=r.target-t.k;const plan=week[weekdayOf(diaryDay)];
  const macro=(lab,v,goal,c)=>`<div class="macro" style="--c:var(${c})"><span class="label">${lab}</span><span class="v">${nf(v)}<small> / ${nf(goal)} g</small></span><div class="bar"><i style="width:${Math.min(100,v/goal*100)}%;background:var(${c})"></i></div></div>`;
  const isToday=diaryDay===iso(new Date());
  return `<div class="view">${exampleBanner()}
  <div><h1>${isToday?"Heute":esc(fmtDate(diaryDay,true))}</h1><p class="lede">Ernährungstagebuch – Ziele aus deinem Tagesbedarf.</p></div>
  <div class="datenav"><button data-act="prevday" aria-label="Vorheriger Tag">‹</button><input type="date" id="diaryday" value="${diaryDay}" aria-label="Datum"><button data-act="nextday" aria-label="Nächster Tag">›</button></div>
  <section class="card">
    <div class="ringwrap">
      <svg class="ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg${over?" over":""}" style="stroke-dasharray:${circ};stroke-dashoffset:${circ*(1-ratio)}"/></svg>
      <div class="ringtext"><span class="big">${nf(t.k)}</span><span class="mono">von ${nf(r.target)} kcal</span><span class="hint">${left>=0?`noch ${nf(left)} kcal`:`${nf(-left)} kcal darüber`}</span></div>
    </div>
    <div class="macros">${macro("Protein",t.p,r.P,"--prot")}${macro("Kohlenh.",t.c,r.C,"--carb")}${macro("Fett",t.f,r.F,"--fat")}</div>
  </section>
  <section class="card">
    <div class="meal-head"><h2>Aus deinem Plan</h2><span class="label">${DAYLONG[weekdayOf(diaryDay)]}</span></div>
    ${plan.map((ml,i)=>{const ref=diaryDay+":"+i;const done=day.entries.some(e=>e.plan===ref);const mm=macrosOf(ml.items);
      return `<div class="planrow"><div><div class="slot">${SLOTNAME[ml.slot]}</div><div>${esc(ml.m.n)}</div><div class="mm"><span>${nf(mm.k)} kcal</span><span class="p">P ${Math.round(mm.p)}</span><span class="c">KH ${Math.round(mm.c)}</span><span class="f">F ${Math.round(mm.f)}</span></div></div>
      ${done?`<span class="pill good">Eingetragen</span>`:`<button data-act="eatplan" data-i="${i}">Gegessen</button>`}</div>`}).join("")}
  </section>
  <section class="card">
    <div class="meal-head"><h2>Wasser</h2><span class="mono">${nf(day.water/1000,2)} / ${nf(r.water,1)} l</span></div>
    <div class="bar"><i style="width:${Math.min(100,day.water/1000/r.water*100)}%;background:var(--water)"></i></div>
    <div class="row"><button data-act="water" data-d="-${GLASS_ML}" style="flex:1">− 250 ml</button><button class="primary" data-act="water" data-d="${GLASS_ML}" style="flex:1">+ 250 ml</button></div>
  </section>
  <section class="card">
    <h2>Lebensmittel eintragen</h2>
    <div class="field"><label for="foodsearch" class="sr-only">Lebensmittel suchen</label><input type="text" id="foodsearch" placeholder="Suchen, z. B. Skyr" autocomplete="off" enterkeyhint="search"></div>
    <ul class="results" id="foodresults"></ul>
    ${selFood?`<div class="confirm">
      <h3>${esc(selFood.n)}</h3>
      <div class="grid2 keep2">
        <div class="field"><label for="addg">Menge</label><div class="unitbox"><input type="number" id="addg" inputmode="decimal" min="1" value="${addG}"><em>g</em></div></div>
        <div class="field"><label for="addslot">Mahlzeit</label><select id="addslot">${SLOTS.map(s=>`<option value="${s}" ${s===addSlot?"selected":""}>${SLOTNAME[s]}</option>`).join("")}</select></div>
      </div>
      <p class="mm" id="addpreview">${previewText()}</p>
      <div class="row"><button class="ghost" data-act="addcancel" style="flex:1">Abbrechen</button><button class="primary" data-act="addconfirm" style="flex:1">Eintragen</button></div>
    </div>`:""}
    <details class="custom"><summary>Eigenes Lebensmittel anlegen</summary>
      <form id="customform" class="grid2 keep2" novalidate>
        <div class="field span2"><label for="cn">Name</label><input type="text" id="cn" required></div>
        <div class="field"><label for="ck">kcal / 100 g</label><input type="number" id="ck" step="any" min="0" inputmode="decimal" required></div>
        <div class="field"><label for="cp">Protein g</label><input type="number" id="cp" step="any" min="0" inputmode="decimal" required></div>
        <div class="field"><label for="cc">Kohlenh. g</label><input type="number" id="cc" step="any" min="0" inputmode="decimal" required></div>
        <div class="field"><label for="cf">Fett g</label><input type="number" id="cf" step="any" min="0" inputmode="decimal" required></div>
        <div class="field span2"><label for="cfi">Ballaststoffe g (optional)</label><input type="number" id="cfi" step="any" min="0" inputmode="decimal"></div>
        <button type="submit" class="primary span2">Speichern</button>
      </form></details>
  </section>
  ${SLOTS.map(s=>{const its=day.entries.map((e,i)=>({e,i})).filter(x=>x.e.meal===s);if(!its.length)return "";const mt=dayTotals(its.map(x=>x.e));
    return `<section class="card"><div class="meal-head"><h2>${SLOTNAME[s]}</h2><span class="mono">${nf(mt.k)} kcal</span></div><ul class="entries">
    ${its.map(({e,i})=>{const m=e.g/100;return `<li><div><div>${esc(e.n)}</div><div class="mm"><span>${nf(e.g)} g</span><span>${nf(e.k*m)} kcal</span><span class="p">P ${nf(e.p*m,1)}</span><span class="c">KH ${nf(e.c*m,1)}</span><span class="f">F ${nf(e.f*m,1)}</span></div></div><button class="x" data-entry="${i}" aria-label="${esc(e.n)} entfernen">✕</button></li>`}).join("")}
    </ul></section>`}).join("")}
  <section class="card"><h2>Auswertung</h2><ul class="advice">${advice(day,r).map(([c,tx])=>`<li class="${c}">${esc(tx)}</li>`).join("")}</ul>
  <p class="hint">Richtwerte – ersetzen keine ärztliche oder professionelle Ernährungsberatung.</p></section>
  </div>`;
}
function previewText(){if(!selFood)return "";const m=(Number(addG)||0)/100;return `<span>${nf(selFood.k*m)} kcal</span><span class="p">P ${nf(selFood.p*m,1)}</span><span class="c">KH ${nf(selFood.c*m,1)}</span><span class="f">F ${nf(selFood.f*m,1)}</span>`}
function renderResults(q){
  const ul=document.getElementById("foodresults");if(!ul)return;const k=searchKey(q.trim());
  if(!k){ul.innerHTML="";return}
  const hits=allDiaryFoods().filter(f=>searchKey(f.n).includes(k)).slice(0,25);
  ul.innerHTML=hits.length?hits.map(f=>`<li><button data-food="${esc(f.id)}"><span>${esc(f.n)}</span><span class="mono">${nf(f.k)} kcal/100 g</span></button></li>`).join("")
    :`<li class="hint" style="padding:10px 2px">Nichts gefunden – lege unten ein eigenes Lebensmittel an.</li>`;
}

function vProfil(){
  if(!draft){draft=state.example?{sex:"m",age:"",height:"",weight:"",bf:"",steps:"s2",days:4,dur:60,goal:"moderat",region:"de",excl:[],main:3,snacks:0,shake:30,shakeMilk:false,prep:true,weekend:"LD"}:JSON.parse(JSON.stringify(state.profile))}
  const d=draft;const steps=`<div class="steps" aria-hidden="true">${[0,1,2,3].map(i=>`<b class="${i<=wiz?"on":""}"></b>`).join("")}</div>`;
  const radio=(name,val,label,sub,cur)=>`<label class="choice"><input type="radio" name="${name}" id="${name}-${val}" value="${val}" ${String(cur)===String(val)?"checked":""}><span>${label}${sub?`<small>${sub}</small>`:""}</span></label>`;
  let body="";
  if(wiz===0)body=`<h2>Körperdaten</h2>
   <div class="field"><span class="lab">Geschlecht</span><div class="choices">${radio("sex","m","Männlich","",d.sex)}${radio("sex","w","Weiblich","",d.sex)}</div><span class="hint">Für die Grundumsatz-Formeln.</span></div>
   <div class="grid2">
    <div class="field"><label for="age">Alter</label><div class="unitbox"><input type="number" id="age" inputmode="numeric" min="15" max="90" value="${d.age}"><em>J.</em></div></div>
    <div class="field"><label for="height">Größe</label><div class="unitbox"><input type="number" id="height" inputmode="numeric" min="130" max="220" value="${d.height}"><em>cm</em></div></div>
    <div class="field"><label for="weight">Gewicht</label><div class="unitbox"><input type="number" id="weight" inputmode="decimal" step="0.1" min="40" max="250" value="${d.weight}"><em>kg</em></div><span class="hint">Morgens, nüchtern.</span></div>
    <div class="field"><label for="bf">Körperfett (optional)</label><div class="unitbox"><input type="number" id="bf" inputmode="decimal" step="0.5" min="4" max="60" value="${d.bf??""}"><em>%</em></div><span class="hint">Schaltet Katch-McArdle frei.</span></div>
   </div>`;
  if(wiz===1)body=`<h2>Aktivität</h2>
   <div class="field"><span class="lab">Schritte pro Tag (Zepp-App oder iPhone Health)</span><div class="choices">${STEPS.map(s=>radio("steps",s[0],s[1],s[2],d.steps)).join("")}</div></div>
   <div class="field"><span class="lab">Krafttraining pro Woche</span><div class="choices">${[2,3,4,5].map(n=>radio("days",n,n+"×","",d.days)).join("")}</div></div>
   <div class="field"><span class="lab">Dauer einer Einheit</span><div class="choices">${[[45,"45 Min."],[60,"60 Min."],[90,"90 Min."]].map(x=>radio("dur",x[0],x[1],"",d.dur)).join("")}</div></div>`;
  if(wiz===2)body=`<h2>Ziel</h2>
   <div class="field"><span class="lab">Wie schnell willst du abnehmen?</span><div class="choices">${GOALS.map(g=>radio("goal",g[0],g[1],g[2],d.goal)).join("")}</div></div>
   <p class="note">Protein ist fest auf 2 g pro kg Körpergewicht eingestellt und wird jede Woche an deinen Gewichtsschnitt angepasst.</p>`;
  if(wiz===3)body=`<h2>Ernährung &amp; Einkauf</h2>
   <div class="field"><span class="lab">Wo kaufst du ein?</span><div class="choices">${radio("region","de","Deutschland","Rewe, Aldi, Lidl",d.region)}${radio("region","cn","China","Hema 盒马, Ole', Taobao",d.region)}</div><span class="hint">In China zeigt die Einkaufsliste die chinesischen Namen mit an.</span></div>
   <div class="field"><span class="lab">Was soll nicht vorkommen?</span><div class="choices">${EXCL.map(e=>`<label class="choice"><input type="checkbox" name="excl" id="excl-${e[0]}" value="${e[0]}" ${d.excl.includes(e[0])?"checked":""}><span>${e[1]}</span></label>`).join("")}</div></div>
   <div class="field"><span class="lab">Hauptmahlzeiten</span><div class="choices">${radio("main",2,"2 Mahlzeiten","Frühstück + Mittagessen",d.main)}${radio("main",3,"3 Mahlzeiten","Frühstück, Mittag- und Abendessen",d.main)}</div></div>
   <div class="field"><span class="lab">Proteinshake täglich (als Snack)</span><div class="choices">${[[0,"Kein Shake"],[25,"25 g"],[30,"30 g"],[40,"40 g"]].map(x=>radio("shake",x[0],x[1],x[0]?"Whey bzw. Sojaprotein":"",d.shake)).join("")}</div>
     <div class="choices">${radio("shakeMilk","false","Mit Wasser","",d.shakeMilk)}${radio("shakeMilk","true","Mit Milch","250 ml",d.shakeMilk)}</div></div>
   <div class="field"><span class="lab">Weitere Snacks</span><div class="choices">${[[0,"Keine"],[1,"1 Snack"],[2,"2 Snacks"]].map(x=>radio("snacks",x[0],x[1],"",d.snacks)).join("")}</div></div>
   <div class="field"><span class="lab">Meal-Prep unter der Woche</span><div class="choices">${radio("prep","true","Ja","Mo–Do abends kochen: Abendessen + Mittag am Folgetag",d.prep)}${radio("prep","false","Nein","jeden Tag frisch",d.prep)}</div></div>
   <div class="field"><span class="lab">Am Wochenende einmal pro Tag kochen</span><div class="choices">${radio("weekend","LD","Mittag + Abend","ein Gericht für beide Mahlzeiten",d.weekend)}${radio("weekend","L","Nur Mittagessen","abends etwas Kaltes",d.weekend)}</div><span class="hint">Am Sonntag wird das Mittagessen für Montag mitgekocht. Gilt mit Meal-Prep.</span></div>`;
  return `<div class="view">${exampleBanner()}
   <div><h1>Fragebogen</h1><p class="lede">Vier kurze Schritte. Du kannst sie jederzeit erneut durchgehen, dein Gewichtsverlauf und Tagebuch bleiben erhalten.</p></div>
   <form class="card" id="wizform" novalidate>${steps}${body}<p class="note warn" id="wizerr" hidden></p>
    <div class="row" style="justify-content:space-between"><button type="button" class="ghost" data-act="wizback" ${wiz===0?"disabled":""}>Zurück</button><button type="submit" class="primary">${wiz<3?"Weiter":"Plan erstellen"}</button></div>
   </form></div>`;
}
function readWiz(){
  const f=document.getElementById("wizform");if(!f)return;
  const val=n=>{const el=f.querySelector(`[name=${n}]:checked`);return el?el.value:null};
  if(wiz===0){draft.sex=val("sex")||draft.sex;for(const k of ["age","height","weight","bf"]){const v=f.querySelector("#"+k).value.replace(",",".");draft[k]=v===""?"":Number(v)}}
  if(wiz===1){draft.steps=val("steps");draft.days=Number(val("days"));draft.dur=Number(val("dur"))}
  if(wiz===2){draft.goal=val("goal")}
  if(wiz===3){draft.region=val("region");draft.excl=[...f.querySelectorAll("[name=excl]:checked")].map(x=>x.value);draft.main=Number(val("main"));draft.shake=Number(val("shake"));draft.shakeMilk=val("shakeMilk")==="true";draft.snacks=Number(val("snacks"));draft.prep=val("prep")==="true";draft.weekend=val("weekend")}
}
function wizError(){
  if(wiz===0){const d=draft;if(!(d.age>=15&&d.age<=90))return "Bitte ein Alter zwischen 15 und 90 eingeben.";if(!(d.height>=130&&d.height<=220))return "Bitte die Größe in cm eingeben (130–220).";if(!(d.weight>=40&&d.weight<=250))return "Bitte das Gewicht in kg eingeben.";if(d.bf!==""&&d.bf!==null&&!(d.bf>=4&&d.bf<=60))return "Körperfett bitte zwischen 4 und 60 % oder leer lassen."}
  return null;
}

function vBedarf(){
  const r=calc();const p=state.profile;
  const pk=r.P*4,ck=r.C*4,fk=r.F*9,sum=pk+ck+fk;
  return `<div class="view">${exampleBanner()}
  <div><h1>Dein Tagesbedarf</h1><p class="lede">Berechnet mit ${r.methods.length} gängigen Formeln für den Grundumsatz, multipliziert mit deinem Aktivitätsfaktor.</p></div>
  <section class="card">
    <span class="label">Zielkalorien pro Tag</span>
    <div class="readout"><span class="big">${nf(r.target)}<small>kcal</small></span></div>
    <p class="mono" style="font-size:13px;color:var(--muted)">Erhaltung ${nf(r.tdee)} kcal · Defizit ${nf(r.tdee-r.target)} kcal · ≈ ${nf(r.kgWeek,2)} kg pro Woche</p>
    <div class="bar" role="img" aria-label="Makroverteilung"><i style="width:${pk/sum*100}%;background:var(--prot)"></i><i style="width:${ck/sum*100}%;background:var(--carb)"></i><i style="width:${fk/sum*100}%;background:var(--fat)"></i></div>
    <div class="macros">
      <div class="macro" style="--c:var(--prot)"><span class="label">Protein</span><span class="v">${r.P}<small> g</small></span><span class="s">2,0 g/kg · ${Math.round(pk/sum*100)} %</span></div>
      <div class="macro" style="--c:var(--carb)"><span class="label">Kohlenh.</span><span class="v">${r.C}<small> g</small></span><span class="s">${nf(r.C/r.w,1)} g/kg · ${Math.round(ck/sum*100)} %</span></div>
      <div class="macro" style="--c:var(--fat)"><span class="label">Fett</span><span class="v">${r.F}<small> g</small></span><span class="s">${nf(r.F/r.w,1)} g/kg · ${Math.round(fk/sum*100)} %</span></div>
    </div>
    <p class="mono" style="font-size:13px;color:var(--muted)">Ballaststoffe ≥ ${nf(r.fiber)} g · Wasser ${nf(r.water,1)} l · BMI ${nf(r.w/((p.height/100)**2),1)}</p>
    ${r.floored?`<p class="note warn">Das rechnerische Ziel lag unter deinem Grundumsatz. Ich habe es auf ${nf(r.target)} kcal angehoben, damit Training und Regeneration nicht leiden.</p>`:""}
    ${r.defRaw>r.cap?`<p class="note warn">Das gewünschte Tempo würde mehr als 25 % Defizit bedeuten. Ich habe das Defizit auf ${nf(r.cap)} kcal begrenzt.</p>`:""}
    ${state.adjust?`<p class="note">Enthält eine Anpassung aus dem Gewichtstracking: ${state.adjust>0?"+":""}${nf(state.adjust)} kcal.</p>`:""}
  </section>
  <section class="card">
    <h2>So ist der Wert entstanden</h2>
    <div class="scroll"><table>
     <thead><tr><th>Grundumsatz (BMR)</th><th class="r">kcal</th></tr></thead><tbody>
     ${r.methods.map(m=>`<tr><td>${m[0]}</td><td class="r">${nf(m[1])}</td></tr>`).join("")}
     <tr class="total"><td>Mittelwert</td><td class="r">${nf(r.bmr)}</td></tr></tbody></table></div>
    <div class="scroll"><table>
     <thead><tr><th>Aktivitätsfaktor (PAL)</th><th class="r">Wert</th></tr></thead><tbody>
     <tr><td>Alltag: ${r.st[1]} Schritte</td><td class="r">${nf(r.st[3],2)}</td></tr>
     <tr><td>Training: ${p.days}× ${p.dur} Min.</td><td class="r">+${nf(r.train,2)}</td></tr>
     <tr class="total"><td>Gesamt-PAL</td><td class="r">${nf(r.pal,2)}</td></tr></tbody></table></div>
    <p class="note">Gewichtsbasis: ${nf(r.w,1)} kg (${r.wsrc})${r.lbm?` · fettfreie Masse ≈ ${nf(r.lbm,1)} kg`:""}. Fett mindestens 0,8 g/kg, der Rest kommt aus Kohlenhydraten. Formeln sind Schätzungen mit etwa ±10 % Streuung, deshalb justiert das Gewichtstracking nach.</p>
    ${(p.bf>=25||r.w/((p.height/100)**2)>=30)?`<p class="note">Bei höherem Körperfettanteil sind 2 g pro kg Gesamtgewicht eher großzügig. Das ist unbedenklich, aber 2,4 g pro kg fettfreie Masse (${nf(2.4*(r.lbm||r.w*0.75))} g) würde auch reichen.</p>`:""}
  </section>
  <div class="row"><a class="btn" href="#plan">Zum Ernährungsplan</a><button data-act="editprofile" class="ghost">Angaben ändern</button></div>
  </div>`;
}

function vPlan(){
  const {week,r,cooks,cfg}=buildWeek();const day=week[planDay];const all=day.flatMap(m=>m.items);const t=macrosOf(all);
  const dev=(a,b)=>{const d=Math.round(a-b);return (d>0?"+":"")+d};
  return `<div class="view">${exampleBanner()}
  <div><h1>Ernährungsplan</h1><p class="lede">${cfg.main} Hauptmahlzeiten${cfg.shake?" + Proteinshake":""}${cfg.snacks?` + ${cfg.snacks} Snack${cfg.snacks>1?"s":""}`:""}${state.profile.prep?", unter der Woche vorgekocht":""}. Mengen auf deine Makros skaliert, Gewichte für rohe Zutaten.</p></div>
  <div class="days" role="group" aria-label="Wochentag">${DAYS.map((d,i)=>`<button data-day="${i}" aria-pressed="${i===planDay}">${d}</button>`).join("")}</div>
  <section class="card">
    <div class="meal-head"><h2>${DAYLONG[planDay]}</h2><span class="mono" style="font-size:13px">${nf(t.k)} / ${nf(r.target)} kcal</span></div>
    <div class="mm"><span class="p"><b>P ${Math.round(t.p)} g</b> (${dev(t.p,r.P)})</span><span class="c"><b>KH ${Math.round(t.c)} g</b> (${dev(t.c,r.C)})</span><span class="f"><b>F ${Math.round(t.f)} g</b> (${dev(t.f,r.F)})</span></div>
    ${cooks[planDay].map(c=>`<div class="cook">
      <div class="meal-head"><div><div class="slot">${state.profile.prep&&planDay<=4?"Heute Abend kochen":"Heute kochen"}</div><h3>${esc(c.m.n)}</h3></div><span class="pill neutral">${c.uses.length} ${c.uses.length>1?"Portionen":"Portion"}</span></div>
      <p class="hint">Für ${c.uses.map(u=>SLOTNAME[u.slot]+" "+(u.d===planDay?"heute":DAYLONG[u.d])).join(" und ")}${c.uses.length>1?" – nach dem Kochen aufteilen.":"."}</p>
      <ul>${Object.entries(c.sum).map(([fid,g])=>`<li><span>${esc(foodName(fid))}</span><span>${amount(fid,g)}</span></li>`).join("")}</ul>
    </div>`).join("")}
    ${day.map(ml=>{const mm=macrosOf(ml.items);const pre=ml.from!==null&&ml.from!==undefined&&ml.from!==planDay?`vorgekocht am ${DAYLONG[ml.from]}`:ml.slot==="D"&&ml.from===planDay&&day.some(x=>x.slot==="L"&&x.m.id===ml.m.id)?"vom Mittag":"";return `<div class="meal">
      <div class="meal-head"><div><div class="slot">${SLOTNAME[ml.slot]}${pre?` · <span class="pre">${pre}</span>`:""}</div><h3>${esc(ml.m.n)}</h3></div><span class="mono" style="font-size:12.5px;color:var(--muted)">${nf(mm.k)} kcal</span></div>
      <ul>${ml.items.map(i=>`<li><span>${esc(foodName(i.fid))}</span><span>${amount(i.fid,i.g)}</span></li>`).join("")}</ul>
      <div class="mm"><span class="p">P ${Math.round(mm.p)}</span><span class="c">KH ${Math.round(mm.c)}</span><span class="f">F ${Math.round(mm.f)}</span>${ml.m.prep?`<span>· ${esc(ml.m.prep)}</span>`:""}</div>
    </div>`}).join("")}
  </section>
  <p class="note">Würzen ist frei: Salz, Pfeffer, Kräuter, Sojasauce, Senf und Essig musst du nicht mitzählen. Abweichungen von ±10 g pro Makro sind unproblematisch. Unter „Heute“ trägst du gegessene Mahlzeiten mit einem Tipp ein.</p>
  </div>`;
}

function shopping(){
  const {week}=buildWeek();const sum={};
  for(const day of week)for(const ml of day)for(const i of ml.items)sum[i.fid]=(sum[i.fid]||0)+i.g;
  const groups={};
  for(const fid in sum){const f=FOODS[fid];const g=sum[fid];const packs=Math.ceil(g/f.pack.g-0.08);
    (groups[f.cat]=groups[f.cat]||[]).push({fid,g,packs:Math.max(1,packs)})}
  return groups;
}
function vEinkauf(){
  const groups=shopping();const cn=state.profile.region==="cn";const checked=state.shop||{};
  const qty=it=>{const f=FOODS[it.fid];if(f.unit&&f.unit.g===f.pack.g)return `${it.packs} ${f.unit.l}<small>${nf(it.g)} g</small>`;
    if(f.long)return `${nf(it.g)} g<small>Vorrat: ${f.pack.l}</small>`;
    return `${it.packs} × ${f.pack.l}<small>${nf(it.g)} g benötigt</small>`};
  const order=["prot","dairy","carb","veg","misc"];
  const n=Object.values(groups).flat().length,done=Object.values(groups).flat().filter(i=>checked[i.fid]).length;
  return `<div class="view">${exampleBanner()}
  <div><h1>Einkaufsliste</h1><p class="lede">Alles für 7 Tage nach deinem aktuellen Plan, auf übliche Packungsgrößen aufgerundet.</p></div>
  <div class="row" style="justify-content:space-between"><span class="pill ${done===n?"good":"neutral"}">${done} von ${n} erledigt</span><button data-act="resetshop" class="ghost">Neue Woche</button></div>
  ${vShopExport(n-done)}
  ${order.filter(c=>groups[c]).map(c=>`<section class="card"><span class="label">${CATS[c]}</span><ul class="shop">
    ${groups[c].sort((a,b)=>b.g-a.g).map(it=>`<li class="${checked[it.fid]?"done":""}"><input type="checkbox" id="shop-${it.fid}" data-shop="${it.fid}" ${checked[it.fid]?"checked":""} aria-label="${esc(FOODS[it.fid].n)}">
      <label class="nm" for="shop-${it.fid}">${esc(FOODS[it.fid].n)}${cn?`<small>${FOODS[it.fid].cn}</small>`:""}</label><span class="q">${qty(it)}</span></li>`).join("")}
  </ul></section>`).join("")}
  <p class="note">${cn?"Griechischen Joghurt, Lachs, Hähnchenbrust und TK-Gemüse gibt es meist bei Hema (盒马) und Ole'. Proteinpulver bekommst du am einfachsten über Tmall oder Taobao. Magerquark ist in China kaum erhältlich und deshalb ersetzt.":"Magerquark, Skyr, Hähnchen und TK-Gemüse sind beim Discounter meist am günstigsten. Lachs und Beeren lohnen sich als TK-Ware."}</p>
  </div>`;
}
function vShopExport(open){
  const o=state.shopOpts;
  const opt=(k,label)=>`<label class="row" style="gap:8px;font-size:14px"><input type="checkbox" data-shopopt="${k}" ${o[k]?"checked":""} style="width:20px;height:20px;accent-color:var(--accent)"> ${label}</label>`;
  return `<section class="card">
    <h2>In Listen-App übertragen</h2>
    <p class="hint">Ein Artikel pro Zeile – so wird daraus in Google Keep, Todoist, Microsoft To Do oder Apple Erinnerungen eine abhakbare Liste, die du mit Android- und iPhone-Nutzern teilen kannst.</p>
    <div class="stack">${opt("open","Nur noch offene Artikel"+(o.open?` (${open})`:""))}${opt("qty","Mengen mitnehmen")}${opt("cats","Kategorien als Überschriften")}</div>
    <div class="row"><button class="primary" data-act="shareshop" style="flex:1">Teilen …</button><button data-act="copyshop" style="flex:1">Kopieren</button></div>
    ${exportText?`<div class="field"><label for="exportbox">Text zum Kopieren</label><textarea id="exportbox" readonly>${esc(exportText)}</textarea></div>`:""}
    <details class="custom"><summary>So geht's in den Apps</summary>
      <ol class="advice" style="margin-top:8px">
        <li><b>Google Keep</b> (Android &amp; iPhone, gratis): „Teilen …“ → Keep wählen → in der Notiz über ⋮ bzw. „+“ <i>Kästchen anzeigen</i>. Über „Mitarbeiter“ teilst du die Liste mit anderen.</li>
        <li><b>Todoist</b> (Android &amp; iPhone): „Kopieren“ → in einem Projekt neue Aufgabe → einfügen → „Als einzelne Aufgaben hinzufügen“. Projekt teilen, um gemeinsam abzuhaken.</li>
        <li><b>Microsoft To Do</b>: „Kopieren“ → in einer Liste ins Feld „Aufgabe hinzufügen“ einfügen → mehrere Aufgaben erstellen. Liste über „Teilen“ freigeben.</li>
        <li><b>Apple Erinnerungen</b> (nur iPhone): „Kopieren“ → in einer Liste neue Erinnerung → einfügen, jede Zeile wird eine eigene Erinnerung.</li>
        <li><b>Bring!</b>: Ein Import ganzer Listen ist offiziell nicht vorgesehen. Probier „Kopieren“ und Einfügen ins Eingabefeld, sonst Artikel einzeln oder per Sprache hinzufügen.</li>
      </ol>
    </details>
  </section>`;
}
function shopLines(){
  const groups=shopping();const cn=state.profile.region==="cn";const o=state.shopOpts;const checked=state.shop||{};const lines=[];let count=0;
  for(const c of ["prot","dairy","carb","veg","misc"]){
    const its=(groups[c]||[]).filter(it=>!(o.open&&checked[it.fid])).sort((a,b)=>b.g-a.g);if(!its.length)continue;
    if(o.cats)lines.push((lines.length?"\n":"")+CATS[c].toUpperCase());
    for(const it of its){const f=FOODS[it.fid];const q=f.unit&&f.unit.g===f.pack.g?`${it.packs} ${f.unit.l}`:f.long?`${nf(it.g)} g, Vorrat ${f.pack.l}`:`${it.packs} × ${f.pack.l}`;
      lines.push(`${f.n}${cn?" "+f.cn:""}${o.qty?` (${q})`:""}`);count++}
  }
  return {text:lines.join("\n"),count};
}
function shopTitle(){return "Einkauf ab "+fmtDate(mondayOf(iso(new Date())))}
async function exportShop(how){
  const {text,count}=shopLines();if(!count){toast("Alles erledigt – nichts zu exportieren");return}
  if(how==="share"&&navigator.share){try{await navigator.share({title:shopTitle(),text});return}catch(e){if(e&&e.name==="AbortError")return}}
  try{await navigator.clipboard.writeText(text);toast(`${count} Artikel kopiert`)}catch(e){exportText=text;render();toast("Bitte manuell kopieren")}
}

function chartSVG(){
  const log=[...state.log].sort((a,b)=>a.d<b.d?-1:1);if(log.length<2)return `<p class="hint">Ab zwei Messungen erscheint hier dein Verlauf.</p>`;
  const W=640,H=230,L=44,R=12,T=14,B=30;
  const t0=new Date(log[0].d+"T12:00:00").getTime(),t1=new Date(log[log.length-1].d+"T12:00:00").getTime();const span=Math.max(1,t1-t0);
  const ws=weeks();
  const vals=log.map(e=>e.kg);let lo=Math.min(...vals),hi=Math.max(...vals);const pad=Math.max(0.4,(hi-lo)*0.15);lo=Math.floor((lo-pad)*2)/2;hi=Math.ceil((hi+pad)*2)/2;
  const x=d=>L+(new Date(d+"T12:00:00").getTime()-t0)/span*(W-L-R);const y=v=>T+(hi-v)/(hi-lo)*(H-T-B);
  const ticks=[];const step=(hi-lo)>4?1:0.5;for(let v=Math.ceil(lo/step)*step;v<=hi+1e-9;v+=step)ticks.push(v);
  const tk=ticks.length>6?ticks.filter((_,i)=>i%2===0):ticks;
  const avgPts=ws.map(w=>{const mid=w.entries.reduce((s,e)=>s+new Date(e.d+"T12:00:00").getTime(),0)/w.n;const xx=L+(mid-t0)/span*(W-L-R);return [clamp(xx,L,W-R),y(w.avg),w]});
  const lastA=avgPts[avgPts.length-1];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gewichtsverlauf mit Wochendurchschnitt">
   ${tk.map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="11" fill="var(--muted)">${nf(v,1)}</text>`).join("")}
   <text x="${L}" y="${H-8}" font-family="IBM Plex Mono, monospace" font-size="11" fill="var(--muted)">${fmtDate(log[0].d)}</text>
   <text x="${W-R}" y="${H-8}" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="11" fill="var(--muted)">${fmtDate(log[log.length-1].d)}</text>
   ${log.map(e=>`<circle cx="${x(e.d)}" cy="${y(e.kg)}" r="3.2" fill="var(--muted)" opacity=".55"/>`).join("")}
   <polyline points="${avgPts.map(p=>p[0]+","+p[1]).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
   ${avgPts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/>`).join("")}
   <circle cx="${lastA[0]}" cy="${lastA[1]}" r="6" fill="var(--accent)"/>
  </svg>`;
}
function vTracking(){
  const a=analyse();const ws=weeks();const today=iso(new Date());
  const pillFor={ok:["good","Im Zielkorridor"],slow:["warn","Zu langsam"],watch:["neutral","Beobachten"],fast:["bad","Zu schnell"],wait:["neutral","Sammelt Daten"]}[a.status];
  const col={ok:"var(--good)",slow:"var(--warn)",watch:"var(--muted)",fast:"var(--bad)",wait:"var(--muted)"}[a.status];
  const curWk=mondayOf(today);const flags=state.weekFlags||{};
  const recent=[...state.log].sort((x,y)=>x.d<y.d?1:-1).slice(0,14);
  return `<div class="view">${exampleBanner()}
  <div><h1>Gewicht &amp; Check-in</h1><p class="lede">Wiege dich 3–7× pro Woche morgens nüchtern. Entscheidend ist der Wochendurchschnitt, einzelne Tage schwanken durch Wasser und Salz.</p></div>
  <form class="card" id="logform" novalidate>
    <span class="label">Neue Messung</span>
    <div class="grid2">
      <div class="field"><label for="logdate">Datum</label><input type="date" id="logdate" value="${today}" max="${today}"></div>
      <div class="field"><label for="logkg">Gewicht</label><div class="unitbox"><input type="number" id="logkg" inputmode="decimal" step="0.1" min="30" max="300" placeholder="z. B. 84,6"><em>kg</em></div></div>
    </div>
    <p class="note warn" id="logerr" hidden></p>
    <button type="submit" class="primary">Messung speichern</button>
  </form>
  <section class="card">
    <div class="meal-head"><h2>Wochen-Check-in</h2><span class="pill ${pillFor[0]}">${pillFor[1]}</span></div>
    <div class="reco" style="--c:${col}">
      <p>${a.txt}</p>
      ${a.last!==undefined?`<p class="mono" style="font-size:12.5px;color:var(--muted)">Letzte Woche ${a.last>0?"+":""}${nf(a.last,2)} % · Ziel ${nf(a.target,2)} % pro Woche</p>`:""}
      ${a.delta?`<div class="row"><button class="primary" data-act="apply" data-delta="${a.delta}">${a.delta>0?"+":""}${a.delta} kcal übernehmen</button><span class="hint">Plan und Einkaufsliste werden sofort neu berechnet.</span></div>`:""}
    </div>
    <label class="row" style="gap:8px;font-size:14px"><input type="checkbox" id="weak" ${flags[curWk]?"checked":""} style="width:20px;height:20px;accent-color:var(--accent)"> Kraftwerte sind diese Woche deutlich gesunken</label>
    ${state.adjust?`<p class="note">Bisherige Anpassungen insgesamt: ${state.adjust>0?"+":""}${nf(state.adjust)} kcal. <button class="ghost" data-act="clearadj" style="min-height:30px;padding:3px 10px;margin-left:6px">Zurücksetzen</button></p>`:""}
  </section>
  <section class="card chart"><div class="meal-head"><h2>Verlauf</h2><span class="legend"><span><i style="background:var(--muted);opacity:.55;border-radius:50%"></i>Messung</span><span><i style="background:var(--accent)"></i>Wochenschnitt</span></span></div>${chartSVG()}</section>
  ${ws.length?`<section class="card"><h2>Wochenschnitte</h2><div class="scroll"><table>
    <thead><tr><th>Woche ab</th><th class="r">Messungen</th><th class="r">Ø kg</th><th class="r">Δ %</th></tr></thead><tbody>
    ${ws.slice().reverse().map((w,i,arr)=>{const prev=arr[i+1];const d=prev?(w.avg-prev.avg)/prev.avg*100:null;return `<tr><td>${fmtDate(w.wk)}</td><td class="r">${w.n}${w.n<3?" ·":""}</td><td class="r">${nf(w.avg,1)}</td><td class="r">${d===null?"–":(d>0?"+":"")+nf(d,2)}</td></tr>`}).join("")}
    </tbody></table></div><p class="hint">Wochen mit weniger als 3 Messungen (·) zählen nicht für die Empfehlung.</p></section>`:""}
  ${recent.length?`<section class="card log"><h2>Letzte Messungen</h2><div class="scroll"><table><tbody>
    ${recent.map(e=>`<tr><td>${fmtDate(e.d,true)}</td><td class="r">${nf(e.kg,1)} kg</td><td class="r"><button class="x" data-del="${e.d}" aria-label="Messung vom ${fmtDate(e.d)} löschen">Löschen</button></td></tr>`).join("")}
  </tbody></table></div></section>`:""}
  <section class="card">
    <div class="meal-head"><h2>iCloud-Abgleich</h2><span class="pill ${state.lastSync&&Date.now()-state.lastSync<7*86400000?"good":"warn"}">Zuletzt: ${ago(state.lastSync)}</span></div>
    <p class="hint">Die App speichert auf diesem Gerät. Über die Datei <b>${SYNC_FILE}</b> in iCloud Drive gleichst du iPhone, iPad und Mac ab und hast gleichzeitig ein Backup.</p>
    <div class="row"><button class="primary" data-act="export-json" style="flex:1">In iCloud sichern</button>
      <label class="btn" for="importfile" style="flex:1">Aus iCloud laden</label><input type="file" id="importfile" accept=".json,application/json" hidden></div>
    <details class="custom"><summary>So funktioniert's</summary><ol class="advice" style="margin-top:8px">
      <li><b>Sichern:</b> „In iCloud sichern“ → <i>In Dateien sichern</i> → <i>iCloud Drive</i> → Sichern. Beim nächsten Mal „Ersetzen“ wählen.</li>
      <li><b>Auf dem anderen Gerät:</b> „Aus iCloud laden“ → <i>Durchsuchen</i> → iCloud Drive → ${SYNC_FILE}.</li>
      <li>Beim Laden wird <b>zusammengeführt</b>, nichts überschrieben: Pro Tag, Messung und Lebensmittel gilt die neueste Änderung. Danach dort wieder sichern.</li>
      <li>Auch Backups aus dem Makro-Coach-Artefakt lassen sich so laden.</li>
    </ol></details>
    <div><button data-act="export-csv" class="ghost">Gewicht als CSV exportieren</button></div>
    ${exportText?`<div class="field"><label for="exportbox">Export-Text zum Kopieren</label><textarea id="exportbox" readonly>${esc(exportText)}</textarea><button data-act="copyexport">Kopieren</button></div>`:""}
    ${confirmReset?`<div class="confirm"><p><b>Wirklich alles löschen?</b> Profil, Messungen, Tagebuch und Anpassungen werden entfernt.</p><div class="row"><button class="danger" data-act="reset-yes">Ja, alles löschen</button><button class="ghost" data-act="reset-no">Abbrechen</button></div></div>`:`<div><button class="danger" data-act="reset">Alle Daten löschen</button></div>`}
  </section>
  <section class="card">
    <h2>Auf dem iPhone installieren</h2>
    <ol class="advice"><li>Diese Seite in <b>Safari</b> öffnen.</li><li>Auf <b>Teilen</b> tippen (Quadrat mit Pfeil).</li><li><b>„Zum Home-Bildschirm“</b> wählen.</li><li>Einmal mit Internet öffnen – danach läuft alles offline.</li></ol>
    <p class="hint">Version ${APP_VERSION}</p>
  </section>
  </div>`;
}

/* ---------- Rendering & Routing ---------- */
const VIEWS={heute:vHeute,profil:vProfil,bedarf:vBedarf,plan:vPlan,einkauf:vEinkauf,tracking:vTracking};
function render(){
  const app=document.getElementById("app");app.innerHTML=VIEWS[view]();
  document.querySelectorAll("nav.tabs a").forEach(a=>{if(a.dataset.v===view)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
  document.getElementById("profilebtn").toggleAttribute("aria-current",view==="profil");
}
function route(){const h=location.hash.replace("#","");const nv=VIEWS[h]?h:"heute";if(nv!==view){exportText="";confirmReset=false}view=nv;if(view!=="profil"){draft=null}render();window.scrollTo(0,0)}
window.addEventListener("hashchange",route);

/* ---------- Abgleich über eine Datei in iCloud Drive ---------- */
const SYNC_FILE="makro-coach-sync.json";
// Führt zwei Stände zusammen: pro Tag, pro Messung und pro eigenem Lebensmittel gewinnt die neuere Änderung,
// Einstellungen kommen aus dem zuletzt geänderten Stand.
function mergeStates(a,b){
  const [older,newer]=(b.updatedAt||0)>(a.updatedAt||0)?[a,b]:[b,a];
  const out={...newer,example:false};
  // Tage: neuere Änderung gewinnt; ohne Zeitstempel (alte Backups) der Tag mit mehr Einträgen
  out.days={...older.days};
  for(const d in newer.days){const x=out.days[d],y=newer.days[d];
    if(!x||(y.u||0)>(x.u||0)||((y.u||0)===(x.u||0)&&y.entries.length>=x.entries.length))out.days[d]=y}
  // Messungen: neuere gewinnt, Löschungen bleiben gelöscht
  out.logDel={...older.logDel};for(const d in newer.logDel)out.logDel[d]=Math.max(out.logDel[d]||0,newer.logDel[d]);
  const log={};for(const e of [...older.log,...newer.log]){const cur=log[e.d];if(!cur||(e.t||0)>=(cur.t||0))log[e.d]=e}
  out.log=Object.values(log).filter(e=>!(out.logDel[e.d]>(e.t||0))).sort((x,y)=>x.d<y.d?-1:1);
  const custom={};for(const f of [...older.custom,...newer.custom])custom[f.id]=f;
  out.custom=Object.values(custom);
  out.weekFlags={...older.weekFlags,...newer.weekFlags};
  return normalize(out);
}
function ago(ts){if(!ts)return "noch nie";const d=Math.floor((Date.now()-ts)/86400000);return d<=0?"heute":d===1?"gestern":`vor ${d} Tagen`}

async function saveFile(name,data,type){
  const file=new File([data],name,{type});
  // iPhone: Teilen-Dialog (In Dateien sichern, AirDrop …)
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:name});return}catch(e){if(e&&e.name==="AbortError")return}
  }
  try{const a=document.createElement("a");a.href=URL.createObjectURL(file);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);toast("Datei gespeichert");return}catch(e){}
  exportText=data;render();toast("Text unten kopieren");
}
async function share(text){
  if(navigator.share){try{await navigator.share({text});return}catch(e){if(e&&e.name==="AbortError")return}}
  try{await navigator.clipboard.writeText(text);toast("Kopiert")}catch(e){exportText=text;render();toast("Bitte manuell kopieren")}
}

function addEntry(entry,msg){getDay(diaryDay).entries.push(entry);save();render();toast(msg)}

document.addEventListener("click",e=>{
  const food=e.target.closest("[data-food]");
  if(food){selFood=allDiaryFoods().find(f=>f.id===food.dataset.food)||null;addG=100;addSlot=suggestSlot();render();const g=document.getElementById("addg");if(g){g.focus();g.select()}return}
  const ent=e.target.closest("[data-entry]");
  if(ent){const [rm]=getDay(diaryDay).entries.splice(Number(ent.dataset.entry),1);save();render();toast(`${rm.n} entfernt`);return}
  const dayB=e.target.closest("[data-day]");if(dayB){planDay=Number(dayB.dataset.day);render();return}
  const del=e.target.closest("[data-del]");if(del){state.log=state.log.filter(x=>x.d!==del.dataset.del);state.logDel[del.dataset.del]=Date.now();save();render();toast("Messung gelöscht");return}
  const b=e.target.closest("[data-act]");if(!b)return;const act=b.dataset.act;
  if(act==="startwiz"||act==="editprofile"){wiz=0;draft=null;if(view==="profil")render();else location.hash="profil"}
  if(act==="wizback"){readWiz();wiz=Math.max(0,wiz-1);render()}
  if(act==="prevday"){diaryDay=addDays(diaryDay,-1);selFood=null;render()}
  if(act==="nextday"){diaryDay=addDays(diaryDay,1);selFood=null;render()}
  if(act==="water"){const d=getDay(diaryDay);d.water=Math.max(0,d.water+Number(b.dataset.d));save();render()}
  if(act==="eatplan"){const i=Number(b.dataset.i);const ml=buildWeek().week[weekdayOf(diaryDay)][i];if(!ml)return;
    const day=getDay(diaryDay);day.entries.push(...planEntries(ml,diaryDay+":"+i));save();render();toast(`${ml.m.n} eingetragen`)}
  if(act==="addcancel"){selFood=null;render()}
  if(act==="addconfirm"){const g=Number(String(addG).replace(",","."));if(!selFood||!(g>0)){toast("Bitte eine gültige Menge eingeben");return}
    const f=selFood;selFood=null;addEntry({n:f.n,k:f.k,p:f.p,c:f.c,f:f.f,fi:f.fi||0,og:!!f.og,g:Math.round(g*10)/10,meal:addSlot},`${f.n} eingetragen`)}
  if(act==="apply"){const d=Number(b.dataset.delta);state.adjust=(state.adjust||0)+d;state.adjustLog=[...(state.adjustLog||[]),{d:iso(new Date()),delta:d}];save();render();toast(`Ziel um ${d>0?"+":""}${d} kcal angepasst`)}
  if(act==="clearadj"){state.adjust=0;save();render();toast("Anpassungen zurückgesetzt")}
  if(act==="resetshop"){state.shop={};save();render()}
  if(act==="shareshop"){exportShop("share")}
  if(act==="copyshop"){exportShop("copy")}
  if(act==="export-json"){state.lastSync=Date.now();save();saveFile(SYNC_FILE,JSON.stringify(state),"application/json").then(()=>render())}
  if(act==="export-csv"){const rows=["datum;gewicht_kg",...[...state.log].sort((a,b)=>a.d<b.d?-1:1).map(e=>e.d+";"+String(e.kg).replace(".",","))];saveFile("gewicht-"+iso(new Date())+".csv",rows.join("\n"),"text/csv")}
  if(act==="copyexport"){const t=document.getElementById("exportbox");share(exportText);if(t){t.select()}}
  if(act==="reset"){confirmReset=true;render()}
  if(act==="reset-no"){confirmReset=false;render()}
  if(act==="reset-yes"){confirmReset=false;state=exampleState();state.updatedAt=Date.now();lsSet(state);render();toast("Alle Daten gelöscht")}
});
document.addEventListener("input",e=>{
  if(e.target.id==="foodsearch"){renderResults(e.target.value)}
  if(e.target.id==="addg"){addG=e.target.value;const p=document.getElementById("addpreview");if(p)p.innerHTML=previewText()}
});
document.addEventListener("change",e=>{
  const so=e.target.closest("[data-shopopt]");if(so){state.shopOpts[so.dataset.shopopt]=so.checked;exportText="";save();render();return}
  const s=e.target.closest("[data-shop]");if(s){state.shop=state.shop||{};state.shop[s.dataset.shop]=s.checked;save();render();return}
  if(e.target.id==="addslot"){addSlot=e.target.value}
  if(e.target.id==="diaryday"&&e.target.value){diaryDay=e.target.value;selFood=null;render()}
  if(e.target.id==="weak"){const wk=mondayOf(iso(new Date()));state.weekFlags=state.weekFlags||{};if(e.target.checked)state.weekFlags[wk]=true;else delete state.weekFlags[wk];save();render()}
  if(e.target.id==="importfile"){const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{let s;try{s=JSON.parse(rd.result);if(!s.profile||!Array.isArray(s.log))throw 0}catch(err){toast("Datei ist kein gültiges Makro-Coach-Backup");return}
    s=normalize(s);if(state.example){state=s;state.example=false}else state=mergeStates(state,s);
    state.lastSync=Date.now();save();render();toast("Daten zusammengeführt")};rd.readAsText(f);e.target.value=""}
});
document.addEventListener("submit",e=>{
  e.preventDefault();
  if(e.target.id==="wizform"){readWiz();const err=wizError();const el=document.getElementById("wizerr");if(err){el.textContent=err;el.hidden=false;return}
    if(wiz<3){wiz++;render();window.scrollTo(0,0);return}
    const prof={...draft,bf:draft.bf===""?null:draft.bf};
    if(state.example){state={v:2,example:false,updatedAt:0,adjust:0,adjustLog:[],shop:{},weekFlags:{},days:state.days||{},custom:state.custom||[],profile:prof,log:[{d:iso(new Date()),kg:prof.weight,t:Date.now()}],logDel:{}}}
    else state.profile=prof;
    save();wiz=0;draft=null;location.hash="bedarf";toast("Plan erstellt");if(view==="bedarf")render();
  }
  if(e.target.id==="logform"){const d=document.getElementById("logdate").value;const kg=Number(document.getElementById("logkg").value.replace(",","."));const el=document.getElementById("logerr");
    if(!d||!(kg>=30&&kg<=300)){el.textContent="Bitte ein Datum und ein Gewicht zwischen 30 und 300 kg eingeben.";el.hidden=false;return}
    if(state.example){toast("Erst den Fragebogen ausfüllen");location.hash="profil";return}
    state.log=state.log.filter(x=>x.d!==d);state.log.push({d,kg:Math.round(kg*10)/10,t:Date.now()});delete state.logDel[d];save();render();toast("Messung gespeichert")}
  if(e.target.id==="customform"){const v=id=>document.getElementById(id).value.trim().replace(",",".");const n=v("cn");
    const num=id=>{const s=v(id);const x=Number(s);return s!==""&&x>=0?x:NaN};const k=num("ck"),p=num("cp"),c=num("cc"),f=num("cf");
    if(!n||[k,p,c,f].some(Number.isNaN)){toast("Bitte Name und alle Nährwerte ausfüllen");return}
    const food={id:"c"+Date.now(),n,k,p,c,f,fi:Number(v("cfi"))||0,og:false};
    state.custom.unshift(food);selFood=food;addG=100;addSlot=suggestSlot();save();render();toast(`${n} gespeichert`)}
});

/* ---------- Start ---------- */
function updateOnline(){document.getElementById("offline").hidden=navigator.onLine}
window.addEventListener("online",updateOnline);window.addEventListener("offline",updateOnline);
updateOnline();
route();
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}))}
