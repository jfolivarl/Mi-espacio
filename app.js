(function(){
'use strict';
var VIEWS=['resumen','tareas','metas','dinero','viajes','trabajo'];
var LABEL={resumen:'<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg> Resumen',tareas:'Agenda',metas:'Objetivos',dinero:'Finanzas',viajes:'Viajes'};
var TODAY=new Date();TODAY.setHours(0,0,0,0);
function p2(n){return (n<10?'0':'')+n}
function iso(d){return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var fmtE=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0});
function eur(n){return fmtE.format(Math.round(n))}
function num(v){var n=parseFloat(v);return isFinite(n)?n:0}
function mes(d){return d.toLocaleDateString('es-ES',{month:'short',year:'numeric'})}
function addMonths(d,n){var r=new Date(d.getFullYear(),d.getMonth()+n,1);return r}
function nice(m){m=Math.max(m,1);var e=Math.pow(10,Math.floor(Math.log10(m))),f=m/e;return (f<=1?1:f<=2?2:f<=5?5:10)*e}

/* ---------- Estado ---------- */
function defaults(){
  return {
    v:1,ejemplo:false,copia:'',alc:70,hor:{},agenda:[],ideas:[],
    marca:{
      pilares:[{n:'Web',v:2},{n:'Proyectos',v:1},{n:'LinkedIn',v:2},{n:'CV',v:2},{n:'Inglés',v:1},{n:'Red',v:2}],
      tareas:[
        {t:'Diseñar la web personal (versión inicial)',a:'Web',ok:true},
        {t:'Publicar la web en GitHub Pages',a:'Web',ok:false},
        {t:'Sustituir la foto provisional por una foto profesional',a:'Web',ok:false},
        {t:'Exportar el CV técnico y el CV turístico a PDF',a:'CV',ok:false},
        {t:'Enlazar el visor cartográfico con su ficha real',a:'Proyectos',ok:false},
        {t:'Crear un segundo repositorio de proyecto',a:'Proyectos',ok:false},
        {t:'Actualizar LinkedIn con los dos perfiles',a:'LinkedIn',ok:false},
        {t:'Practicar inglés 15 minutos al día durante un mes',a:'Inglés',ok:false},
        {t:'Escribir a tres contactos del sector',a:'Red',ok:false}
      ]
    },
    eng:{nivel:'',meta:'',min:15,log:{}},
    fin:{ingresos:0,extra:0,gastos:0,ahorro:0,meses:6},
    fm:{},trabajo:[],deudas:[],viajes:[],metas:[]
  };
}
function sumaDias(n){var d=new Date(TODAY);d.setDate(d.getDate()+n);return iso(d)}
var S=null,LS='olivar-panel-v1';
try{var raw=localStorage.getItem(LS);if(raw)S=JSON.parse(raw)}catch(e){}
function normalize(s){var d=defaults();s=s||{};
  if(Array.isArray(s.notas)&&s.notas.length){s.ideas=(s.ideas||[]).concat(s.notas.map(function(n){return {t:n.t,f:n.f||iso(TODAY),ex:/^Ejemplo:/.test(n.t)}}))}
  delete s.notas;delete s.nFec0;
  if(s.fm==null){s.fm={};var og=(s.gastos||[]).slice(),f0=s.fin||{};
    if(!og.length&&num(f0.gastos)>0)og.push({n:'Gastos mensuales',m:num(f0.gastos),t:'fijo'});
    var oi=[];if(num(f0.ingresos)>0)oi.push({n:'Ingresos',m:num(f0.ingresos)});if(num(f0.extra)>0)oi.push({n:'Extra',m:num(f0.extra)});
    if(oi.length||og.length)s.fm[iso(TODAY).slice(0,7)]={i:oi,g:og};
    if(s.fin){s.fin.ingresos=0;s.fin.extra=0;s.fin.gastos=0}}
  delete s.gastos;
  for(var k in d){if(s[k]==null)s[k]=d[k]}
  ['marca','eng','fin'].forEach(function(k){for(var j in d[k]){if(s[k][j]==null)s[k][j]=d[k][j]}});return s}
function areaDe(t){
  if(/linkedin/i.test(t))return 'LinkedIn';if(/\bcv\b|curr[ií]culum/i.test(t))return 'CV';if(/ingl[eé]s|english/i.test(t))return 'Inglés';
  if(/contact|networking|\bred\b|colega/i.test(t))return 'Red';if(/\bweb\b|foto|p[aá]gina/i.test(t))return 'Web';
  if(/repositorio|proyecto|visor|github|ficha/i.test(t))return 'Proyectos';return 'Web';
}
S=normalize(S);
S.marca.tareas.forEach(function(t){if(!t.a)t.a=areaDe(t.t)});
function marcaPil(){return S.marca.pilares.map(function(p){var ts=S.marca.tareas.filter(function(t){return t.a===p.n}),d=ts.filter(function(t){return t.ok}).length;return {n:p.n,v:ts.length?Math.round(50*d/ts.length)/10:0,d:d,n2:ts.length}})}

/* ---------- Guardado ---------- */
var docRef=null,timer=null,saving=false,dirty=false;
function setEstado(t){var e=document.getElementById('estado');if(e)e.textContent=t}
function save(){
  try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}
  if(docRef){dirty=true;clearTimeout(timer);timer=setTimeout(flush,700);setEstado('Guardando…')}
}
async function flush(){
  if(saving){timer=setTimeout(flush,400);return}
  if(!dirty)return;
  dirty=false;saving=true;
  try{await docRef.set({state:JSON.parse(JSON.stringify(S))});setEstado('Guardado en tu cuenta')}
  catch(e){setEstado('Sin conexión con tu cuenta: guardado en este navegador')}
  saving=false;if(dirty)flush();
}

/* ---------- Cálculos ---------- */
function simula(d){
  var b0=num(d.saldo),b=b0,P=num(d.cuota),r=num(d.tae)/1200,m=0,paid=0,serie=[b0];
  if(b0<=0)return {n:0,int:0,serie:serie,ok:true};
  if(P<=b0*r+0.005)return {n:Infinity,int:Infinity,serie:serie,ok:false};
  while(b>0.005&&m<600){var i=b*r,pay=Math.min(P,b+i);paid+=pay;b=b+i-pay;m++;serie.push(Math.max(b,0))}
  return {n:m,int:paid-b0,serie:serie,ok:b<=0.005};
}
function ymHoy(){return iso(TODAY).slice(0,7)}
function fmGet(ym){return S.fm[ym]||{i:[],g:[]}}
function fmEns(ym){if(!S.fm[ym])S.fm[ym]={i:[],g:[]};return S.fm[ym]}
function sumM(l){return (l||[]).reduce(function(a,x){return a+num(x.m)},0)}
function gTot(){return sumM(fmGet(ymHoy()).g)}
function iTot(){return sumM(fmGet(ymHoy()).i)}
var finMes=null;
function calc(){
  var f=S.fin,sims=S.deudas.map(simula);
  var deuda=0,cuotas=0,intereses=0,hayInf=false,maxN=0,i;
  S.deudas.forEach(function(d,k){deuda+=num(d.saldo);cuotas+=num(d.cuota);var s=sims[k];if(!s.ok)hayInf=true;else{intereses+=s.int;maxN=Math.max(maxN,s.n)}});
  var gastosTot=gTot()+cuotas,libre=iTot()-gastosTot;
  var aGl=num(f.ahorro);Object.keys(S.fm).forEach(function(k){if(sumM(S.fm[k].i)||sumM(S.fm[k].g))aGl+=sumM(S.fm[k].i)-sumM(S.fm[k].g)-cuotas});var fondoMeses=gastosTot>0?Math.max(0,aGl)/gastosTot:0,fondoObj=num(f.meses)*gastosTot;
  var H=hayInf?60:maxN,curva=[];
  for(i=0;i<=H;i++){var t=0;sims.forEach(function(s){t+=i<s.serie.length?s.serie[i]:(s.ok?0:s.serie[s.serie.length-1])});curva.push(t)}
  return {sims:sims,deuda:deuda,cuotas:cuotas,intereses:intereses,hayInf:hayInf,maxN:maxN,libre:libre,gastosTot:gastosTot,fondoMeses:fondoMeses,fondoObj:fondoObj,curva:curva,
    netoPat:aGl-deuda};
}
function mesesHasta(ym){if(!ym)return null;var p=String(ym).split('-');return (+p[0]-TODAY.getFullYear())*12+(+p[1]-1-TODAY.getMonth())}
function viajeDias(v){if(!v.f||String(v.f).length<=7)return 'sin fecha';var d=Math.round((hDate(v.f)-hDate(iso(TODAY)))/86400000);return d>0?'faltan '+d+(d===1?' día':' días'):(d===0?'¡es hoy!':((v.f2&&v.f2>=iso(TODAY))?'en curso':'ya pasó'))}
function vjDia(k){return S.viajes.some(function(x){return x.f&&x.f2&&String(x.f).length>7&&k>=x.f&&k<=x.f2})}
function viajeInfo(v){var pend=Math.max(0,num(v.c)-num(v.a)),ml=mesesHasta(v.f),need=ml==null?null:(ml<=0?pend:pend/ml);return {pend:pend,ml:ml,need:need}}
function tareasPct(){var t=S.marca.tareas;return t.length?Math.round(100*t.filter(function(x){return x.ok}).length/t.length):0}

/* ---------- Gráficos ---------- */
function lineSVG(ys,o){
  var W=600,H=230,L=80,R=16,T=16,B=30,mx=Math.max.apply(null,ys.concat([o.ref||0,1])),top=nice(mx),n=Math.max(ys.length-1,1);
  function X(i){return L+(W-L-R)*i/n}
  function Y(v){return T+(H-T-B)*(1-v/top)}
  var g='',k,i;
  for(k=0;k<=4;k++){var v=top*k/4,y=Y(v);g+='<line class="grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'"/><text x="'+(L-6)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end">'+o.fmt(v)+'</text>'}
  var d='';for(i=0;i<ys.length;i++){d+=(i?'L':'M')+X(i).toFixed(1)+' '+Y(ys[i]).toFixed(1)}
  var a=d+'L'+X(ys.length-1).toFixed(1)+' '+Y(0).toFixed(1)+'L'+X(0).toFixed(1)+' '+Y(0).toFixed(1)+'Z';
  var ref=o.ref?'<line class="ref" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(o.ref).toFixed(1)+'" y2="'+Y(o.ref).toFixed(1)+'"/>':'';
  var xl='';[0,Math.round(n/2),n].forEach(function(j){xl+='<text x="'+X(j).toFixed(1)+'" y="'+(H-8)+'" text-anchor="'+(j===0?'start':j===n?'end':'middle')+'">'+esc(o.xl(j))+'</text>'});
  var last=ys.length-1;
  return '<svg class="ch" viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="'+esc(o.alt)+'">'+g+ref+'<path class="ar" d="'+a+'"/><path class="ln" d="'+d+'"/><circle class="dot" cx="'+X(last).toFixed(1)+'" cy="'+Y(ys[last]).toFixed(1)+'" r="4.5"/>'+xl+'</svg>';
}
function radarSVG(ps){
  var W=340,H=300,cx=170,cy=150,R=95,n=ps.length,k,i;
  function pt(i,v){var a=-Math.PI/2+2*Math.PI*i/n;return [cx+R*v/5*Math.cos(a),cy+R*v/5*Math.sin(a)]}
  var s='';
  for(k=1;k<=5;k++){var pts=[];for(i=0;i<n;i++){var p=pt(i,k);pts.push(p[0].toFixed(1)+','+p[1].toFixed(1))}s+='<polygon class="ring" points="'+pts.join(' ')+'"/>'}
  var poly=[];
  for(i=0;i<n;i++){var e=pt(i,5),q=pt(i,ps[i].v);s+='<line class="ax" x1="'+cx+'" y1="'+cy+'" x2="'+e[0].toFixed(1)+'" y2="'+e[1].toFixed(1)+'"/>';poly.push(q[0].toFixed(1)+','+q[1].toFixed(1))}
  s+='<polygon class="poly" points="'+poly.join(' ')+'"/>';
  for(i=0;i<n;i++){
    var q2=pt(i,ps[i].v);s+='<circle class="pt" cx="'+q2[0].toFixed(1)+'" cy="'+q2[1].toFixed(1)+'" r="3.5"/>';
    var a=-Math.PI/2+2*Math.PI*i/n,lx=cx+(R+16)*Math.cos(a),ly=cy+(R+16)*Math.sin(a),c=Math.cos(a);
    s+='<text x="'+lx.toFixed(1)+'" y="'+(ly+4).toFixed(1)+'" text-anchor="'+(c>0.3?'start':c<-0.3?'end':'middle')+'">'+esc(ps[i].n)+'</text>';
  }
  return '<svg class="rd" viewBox="0 0 '+W+' '+H+'" width="100%" style="display:block;margin:0 auto" role="img" aria-label="Valoración de la marca personal en seis áreas">'+s+'</svg>';
}


/* ---------- Media luna y tarjetas de resumen ---------- */
function gaugeSVG(segs,o){
  var cx=150,cy=148,R=108,sw=26,tot=o.total||segs.reduce(function(a,x){return a+x.v},0),acc=0,s='';
  function P(a){return (cx+R*Math.cos(a)).toFixed(1)+' '+(cy+R*Math.sin(a)).toFixed(1)}
  s+='<path class="track" d="M'+(cx-R)+' '+cy+' A'+R+' '+R+' 0 0 1 '+(cx+R)+' '+cy+'" stroke-width="'+sw+'"/>';
  if(tot>0)segs.forEach(function(x){
    if(x.v<=0)return;
    var f0=acc/tot,f1=Math.min(1,(acc+x.v)/tot);acc+=x.v;
    var a0=Math.PI+Math.PI*f0,a1=Math.PI+Math.PI*f1;
    if(f1-f0>=0.9999){a1=a0+Math.PI-0.0001}
    s+='<path d="M'+P(a0)+' A'+R+' '+R+' 0 0 1 '+P(a1)+'" fill="none" stroke-width="'+sw+'" style="stroke:'+x.c+'"/>';
  });
  s+='<text class="big '+(o.tone||'')+'" x="'+cx+'" y="'+(cy-26)+'" text-anchor="middle">'+esc(o.center)+'</text><text class="sub" x="'+cx+'" y="'+(cy-6)+'" text-anchor="middle">'+esc(o.sub)+'</text>';
  return '<svg class="gg" viewBox="0 0 300 168" width="100%" role="img" aria-label="'+esc(o.alt)+'">'+s+'</svg>';
}
function barPctSVG(items,alc){
  var W=600,H=240,L=62,R=14,T=26,B=36,bw=(W-L-R)/items.length;
  function Y(v){return T+(H-T-B)*(1-v/100)}
  var s='';
  [0,50,100].forEach(function(v){var y=Y(v);s+='<line class="grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'"/><text x="'+(L-8)+'" y="'+(y+5).toFixed(1)+'" text-anchor="end">'+v+'%</text>'});
  items.forEach(function(it,i){
    var x=L+i*bw+bw*.2,w=bw*.6,y=Y(it.p);
    s+='<rect class="bb'+(it.p>=alc&&it.n?' hit':'')+'" x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(Y(0)-y,0).toFixed(1)+'" rx="3"/>';
    s+='<text class="val" x="'+(x+w/2).toFixed(1)+'" y="'+(y-6).toFixed(1)+'" text-anchor="middle">'+(it.n?it.p+'%':'—')+'</text>';
    s+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(H-12)+'" text-anchor="middle">'+esc(it.l)+'</text>';
  });
  s+='<line class="ref" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(alc).toFixed(1)+'" y2="'+Y(alc).toFixed(1)+'"/><text class="lbl" x="'+(W-R-4)+'" y="'+(Y(alc)-7).toFixed(1)+'" text-anchor="end">Alcanzable '+alc+'%</text>';
  return '<svg class="ch" viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="Porcentaje de metas hechas por plazo, con una línea en el '+alc+'% alcanzable">'+s+'</svg>';
}
function legend(rows){
  return '<div class="lg">'+rows.map(function(r){return '<div><i style="background:'+r.c+'"></i><span>'+esc(r.l)+'</span><b>'+r.v+'</b>'+(r.p!=null?'<small>'+r.p+'%</small>':'')+'</div>'}).join('')+'</div>';
}
function enlace(h,t){return h?'<small><a href="#'+h+'">'+t+'</a></small>':''}
function cardDinero(link){
  var c=calc(),f=S.fin,ing=iTot(),g=gTot(),cu=c.cuotas,lb=c.libre;
  var ttl='<h2 class="ttl">Adónde va tu dinero cada mes'+(link?enlace('dinero/dinero','Detalle'):'')+'</h2>';
  if(ing<=0&&g+cu<=0)return '<div class="card"'+(link?'':' id="a-dinero"')+'>'+ttl+'<div class="empty">Escribe tus ingresos y gastos en la pestaña Dinero y aquí verás el reparto.</div></div>';
  var pc=function(x){return ing>0?Math.round(100*x/ing):null};
  var segs=[{v:g,c:'var(--turq)'},{v:cu,c:'var(--oro)'}],o;
  if(lb>=0){segs.push({v:lb,c:'var(--ok)'});o={center:eur(lb),sub:'te sobran al mes',tone:'ok',alt:'Reparto de tus ingresos mensuales entre gastos, cuotas de deudas y dinero libre'}}
  else o={center:eur(-lb),sub:'te faltan al mes',tone:'bad',alt:'Tus gastos y cuotas superan tus ingresos'};
  var rows=[{c:'var(--line)',l:'Ingresos',v:eur(ing)},{c:'var(--turq)',l:'Gastos',v:eur(g),p:pc(g)},{c:'var(--oro)',l:'Cuotas de deudas',v:eur(cu),p:pc(cu)},{c:'var(--ok)',l:lb>=0?'Te sobra':'Te falta',v:eur(Math.abs(lb)),p:pc(Math.abs(lb))}];
  var vi=S.viajes.map(viajeInfo).reduce(function(a,x){return a+(x.need||0)},0);
  var nota=S.viajes.length?'<p class="note">Viajes: necesitas apartar '+eur(vi)+' al mes. '+(vi<=Math.max(lb,0)?'Cabe en lo que te sobra.':'Supera lo que te sobra.')+'</p>':'';
  return '<div class="card">'+ttl+gaugeSVG(segs,o)+legend(rows)+nota+'</div>';
}
function cardDeuda(link){
  var c=calc(),ttl='<h2 class="ttl">Tu deuda'+(link?enlace('dinero/deudas','Detalle'):'')+'</h2>';
  if(!S.deudas.length||c.deuda<=0)return '<div class="card">'+ttl+'<div class="empty">Sin deudas registradas.</div></div>';
  var frase=c.hayInf?'Alguna cuota no cubre sus intereses, así que la deuda no baja. Sube la cuota.':'A este ritmo acabas en <b>'+mes(addMonths(TODAY,c.maxN))+'</b> ('+c.maxN+' meses) y pagas <b>'+eur(c.intereses)+'</b> de intereses.';
  return '<div class="card">'+ttl+'<div class="big">'+eur(c.deuda)+' <small>pendientes hoy</small></div>'+lineSVG(c.curva,{fmt:eur,xl:function(j){return j===0?'Hoy':mes(addMonths(TODAY,j))},alt:'Evolución de la deuda total mes a mes'})+'<p class="note">'+frase+'</p></div>';
}
function metasStats(){
  var H=[{k:'3m',t:'Próximos 3 meses'},{k:'12m',t:'Próximo año'},{k:'3a',t:'3 a 5 años'}],tot=0,ok=0;
  var rows=H.map(function(h){var it=S.metas.filter(function(m){return m.h===h.k}),d=it.filter(function(m){return m.ok}).length;tot+=it.length;ok+=d;return {t:h.t,d:d,n:it.length}});
  var tn=S.marca.tareas.length,td=S.marca.tareas.filter(function(x){return x.ok}).length;
  rows.push({t:'Plan de marca',d:td,n:tn});
  return {rows:rows,tot:tot,ok:ok};
}
function cardMetas(link){
  var m=metasStats(),ttl='<h2 class="ttl">Tus objetivos'+(link?enlace('metas/obj','Detalle'):'')+'</h2>';
  if(!m.tot)return '<div class="card">'+ttl+'<div class="empty">Añade objetivos en la pestaña Objetivos para ver tu avance.</div></div>';
  var alc=Math.max(1,Math.min(100,num(S.alc)||70));
  var etq=['3 meses','1 año','3–5 años','Marca'];
  var items=m.rows.map(function(r,i){return {l:etq[i],p:r.n?Math.round(100*r.d/r.n):0,n:r.n}});
  var det=m.rows.map(function(r){return esc(r.t)+': '+r.d+' de '+r.n}).join(' · ');
  var pct=Math.round(100*m.ok/m.tot);
  return '<div class="card">'+ttl+'<div class="big">'+pct+'% <small>'+m.ok+' de '+m.tot+' objetivos hechos</small></div>'+barPctSVG(items,alc)+'<div class="alc"><i></i>Línea de lo alcanzable. Una barra verde ya la ha superado.</div><p class="note">'+det+'.</p>'+(link?'':'<div class="fields" style="margin-top:.8rem">'+inp('Lo alcanzable (%)','alc',alc,'number','min="1" max="100"')+'</div><p class="note">Pon el porcentaje que consideras realista conseguir. Es tu propia referencia.</p>')+'</div>';
}
function cardMarca(link,extra){
  return '<div class="card"'+(link?' id="a-grafmarca"':'')+'><h2 class="ttl">Mi marca personal'+(link?enlace('metas/marca','Detalle'):'')+'</h2>'+radarSVG(marcaPil())+'<p class="note">Cada punta se calcula sola con las tareas hechas de esa área, de 0 a 5. Plan de marca: '+tareasPct()+'% hecho.</p>'+(extra||'')+'</div>';
}

/* ---------- Piezas ---------- */
function inp(label,path,val,type,extra){var nb=type==='number',vv=nb&&(val===0||val==='0'||val===''||val==null||num(val)===0)?'':val;return '<label class="f"><span>'+label+'</span><input data-bind="'+path+'" type="'+(type||'text')+'" value="'+esc(vv)+'"'+(nb?' inputmode="decimal" step="any" placeholder="0"':'')+' '+(extra||'')+'></label>'}
function kpi(l,v,s,tone){return '<div class="kpi"><div class="l">'+l+'</div><div class="v '+(tone||'')+'">'+v+'</div><div class="s">'+s+'</div></div>'}
function banner(){
  if(!S.ejemplo)return '';
  return '<div class="banner"><span>Hay datos de ejemplo en Dinero, Viajes y en la valoración de marca. Sustitúyelos por los tuyos o bórralos.</span><button class="btn pri" data-act="clear-ej">Borrar ejemplos</button></div>';
}

/* ---------- Vistas ---------- */
function saludo(){var h=new Date().getHours();return h<6?'Buenas noches':h<13?'Buenos días':h<21?'Buenas tardes':'Buenas noches'}
function agHoyLista(){var h=iso(TODAY);return agLista().filter(function(x){return x.it.f===h&&(!x.it.ok||aRecent[x.i])})}
var tlOpen=false,foldOpen={ht:false,wk:false,mt:false,id:false,fs:false,fd:false,fg:false,fi:false,fx:false,mc:false,cal:true};
var wkExp={};
function wMeta(it){return (it.f?fechaCorta(it.f)+(it.h?' · '+it.h:''):'Sin fecha')+(it.adj&&it.adj.length?' · '+it.adj.length+(it.adj.length===1?' adjunto':' adjuntos'):'')}
function wRow(x){var it=x.it,open=wkExp[x.i];
  return '<div class="ag wk'+(it.ok?' done':'')+'"><input type="checkbox" data-act="tg" data-list="trabajo" data-i="'+x.i+'"'+(it.ok?' checked':'')+' aria-label="Hecha"><div class="agt tap" data-act="open-w" data-i="'+x.i+'"><span class="agx">'+esc(it.t)+'</span><small>'+esc(wMeta(it))+'</small></div><span class="chev" aria-hidden="true"></span></div>';
}
function wLista(){return S.trabajo.map(function(it,i){return {it:it,i:i}})}
function vTrabajo(){return banner()+wCard(true)}
function wCard(home){
  var hoy=iso(TODAY),l=wLista(),pend=l.filter(function(x){return !x.it.ok}),hechas=l.filter(function(x){return x.it.ok});
  var by=function(a,b){return (a.it.f||'9999').localeCompare(b.it.f||'9999')||(a.it.h||'').localeCompare(b.it.h||'')};pend.sort(by);
  var blq=function(t,arr){return arr.length?'<h3 class="sh-h">'+t+'</h3>'+arr.map(wRow).join(''):''};
  var fsem=diaMas(lunesDe(hoy),6),fmes=iso(new Date(TODAY.getFullYear(),TODAY.getMonth()+1,0)),fin=fsem>fmes?fsem:fmes,fuera=pend.filter(function(x){return x.it.f>fin}).length;
  var cuerpo=blq('Atrasadas',pend.filter(function(x){return x.it.f&&x.it.f<hoy}))+blq('Hoy',pend.filter(function(x){return x.it.f===hoy}))+blq('Esta semana',pend.filter(function(x){return x.it.f>hoy&&x.it.f<=fsem}))+blq('Resto del mes',pend.filter(function(x){return x.it.f>fsem&&x.it.f<=fmes}))+blq('Sin fecha',pend.filter(function(x){return !x.it.f}))+(fuera?'<p class="note">Otras '+fuera+(fuera===1?' nota':' notas')+' para más adelante; aparecerán cuando llegue su mes.</p>':'');
  if(!cuerpo)cuerpo='<div class="empty">No tienes notas de trabajo pendientes. Pulsa «+ Nueva nota» para añadir una.</div>';
  var hz=hechas.length?'<details class="sb" style="margin-top:1rem"><summary><span>Hechas</span><b>'+hechas.length+'</b></summary><div class="sbd">'+hechas.map(wRow).join('')+'</div></details>':'';
  return '<div class="card wkcard">'+(home?'<div class="homeline" style="margin:-.25rem 0 .5rem"></div>':'')+'<h2 class="ttl">Notas de trabajo<small>'+pend.length+(pend.length===1?' pendiente':' pendientes')+'</small></h2><p class="note" style="margin-top:0">Solo de trabajo: llamadas, tarjetas de embarque, presupuestos… Aquí no se mezcla nada de tu parte personal.</p><div class="add" style="margin:0 0 .6rem"><button class="btn wkp" data-act="sh-trabajo">+ Nota de trabajo</button></div>'+cuerpo+hz+'</div>';
}
function wHoyMini(){
  var hoy=iso(TODAY),l=wLista().filter(function(x){return x.it.f===hoy&&(!x.it.ok||true)}),pend=l.filter(function(x){return !x.it.ok}).length;
  var filas=l.map(function(x){return '<div class="hoyi'+(x.it.ok?' done':'')+'"><input type="checkbox" data-act="tg" data-list="trabajo" data-i="'+x.i+'"'+(x.it.ok?' checked':'')+' aria-label="Hecha"><b>'+esc(x.it.h||'Hoy')+'</b><span class="tap" data-act="open-w" data-i="'+x.i+'">'+esc(x.it.t)+'</span></div>'}).join('')||'<p class="note" style="margin:.4rem 0">No tienes notas de trabajo para hoy.</p>';
  return {pend:pend,html:filas};
}
var selDia=null;
function diaTiles(k,short){
  var v=S.hor[k],t=hTipo(v),hoy=k===iso(TODAY),pend=S.agenda.filter(function(x){return !x.ok&&x.f===k}).length,lib=t==null?null:hLibre(v);
  var nt=function(n){return n+(n===1?(hoy?' tarea pendiente hoy':' tarea pendiente'):(hoy?' tareas pendientes hoy':' tareas pendientes'))};
  var b=function(c,big,sm){return '<button type="button" class="skb'+c+'" data-act="hoy-dia" data-d="'+k+'"><b>'+big+'</b><span>'+sm+'</span></button>'};
  if(short)return '<div class="sk sk3">'+(lib!=null?b('',hN(lib)+' h','libres'):'')+b(' tar',pend,pend===1?'tarea':'tareas')+(lib!=null?b(' est',hN(lib*H_EST)+' h','de estudio posible'):'')+'</div>';
  return '<div class="sk sk3">'+(lib!=null?b('',hN(lib)+' h',hoy?'libres hoy':'libres este día'):'')+b(' tar',pend,hoy?(pend===1?'tarea pendiente hoy':'tareas pendientes hoy'):(pend===1?'tarea pendiente':'tareas pendientes'))+(lib!=null?b(' est',hN(lib*H_EST)+' h',hoy?'de estudio posibles hoy':'de estudio posibles'):'')+'</div>';
}
function cardHoy(){
  var k=iso(TODAY),v=S.hor[k],t=hTipo(v);
  var ag=agHoyLista(),pendH=ag.filter(function(x){return !x.it.ok}).length;
  var cal='<a class="tpill hcalp" href="#tareas/cal">Ver calendario</a>';
  var tlb='<button type="button" class="btn tlb tlg'+(tlOpen?' sel':'')+'" data-act="tl-toggle" aria-expanded="'+(tlOpen?'true':'false')+'">Tiempo libre</button>';
  var cuerpo,tiles='';
  if(t==null||t==='X')cuerpo='<div class="hbox hgrid"><div class="hl">Tu horario de trabajo de hoy</div><div class="hr1">'+cal+'</div><div class="big hbg" style="font-size:1.6rem">Hoy no trabajas</div><p class="note hnt">&nbsp;</p><div class="hr2"></div></div>';
  else{
    var w=t==='T'?hHoras(v):0,lib=hLibre(v);
    cuerpo='<div class="hbox hgrid"><div class="hl">'+(t==='T'?'Hoy este es tu turno de trabajo':'Hoy no tienes que trabajar')+'</div><div class="hr1">'+cal+'</div><div class="big hbg">'+esc(hRotulo(v))+'</div><p class="note hnt">'+(t==='T'?hN(w)+' h de trabajo':'Tu horario de trabajo de hoy')+'</p><div class="hr2"></div></div>';
    tiles=diaTiles(k);
  }
  if(!tiles)tiles=diaTiles(k);
  var lista=ag.length?'<div class="hoyl">'+ag.map(function(x){return '<div class="hoyi'+(x.it.ok?' done':'')+(x.it.imp?' imp':'')+'"><input type="checkbox" data-act="tg" data-list="agenda" data-i="'+x.i+'"'+(x.it.ok?' checked':'')+' aria-label="Hecha"><b class="tap" data-act="open-t" data-i="'+x.i+'">'+esc(x.it.h?x.it.h:'Hoy')+'</b><span class="tap" data-act="open-t" data-i="'+x.i+'">'+esc(x.it.t)+cfHtml(x.i)+'</span>'+(x.it.imp?'<em>Importante</em>':'')+'</div>'}).join('')+'</div>':'<p class="note" style="margin:.4rem 0">No tienes tareas para hoy.</p>';
  lista='<details class="sb htf" data-fold="ht"'+(foldOpen.ht?' open':'')+'><summary><span>Hoy tienes</span><b>'+pendH+(pendH===1?' pendiente':' pendientes')+'</b></summary><div class="sbd">'+(ag.length?'<p class="note" style="margin:.2rem 0 .4rem">Toca una tarea para abrirla</p>':'')+lista+'</div></details>';
  var wm=wHoyMini();
  var wk='<details class="sb wkf" data-fold="wk"'+(foldOpen.wk?' open':'')+'><summary><span>Tareas de trabajo</span><b>'+wm.pend+'</b></summary><div class="sbd">'+wm.html+'<div class="add"><button class="btn wkp" data-act="sh-trabajo">+ Nota de trabajo</button> <a class="btn" href="#trabajo" style="text-decoration:none;display:inline-block">Abrir hoja de trabajo</a></div></div></details>';
  return '<div class="card hero"><h2 class="ttl">'+saludo()+'</h2>'+cuerpo+tiles+lista+wk+'</div>';
}
function avisosLista(){
  var c=calc(),out=[],d=dias(S.copia),man=sumaDias(1);
  S.agenda.forEach(function(x,xi){if(x.ok||!x.imp)return;if(x.f===iso(TODAY))out.push({t:'Importante hoy: '+x.t+(x.h?' ('+agHora(x)+')':''),h:'tareas',ti:xi,tone:'warn'});else if(x.f===man)out.push({t:'Importante mañana: '+x.t+(x.h?' ('+agHora(x)+')':''),h:'tareas',ti:xi,tone:'warn'})});
  var atr=S.agenda.filter(function(x){return !x.ok&&x.f&&x.f<iso(TODAY)}).length,atr0=-1;S.agenda.forEach(function(x,xi){if(atr0<0&&!x.ok&&x.f&&x.f<iso(TODAY))atr0=xi});
  if(atr)out.push({t:'Tienes '+atr+(atr===1?' tarea atrasada':' tareas atrasadas'),h:'tareas',ti:atr0,tone:'bad'});
  var ch=0,ch0=-1;S.agenda.forEach(function(x,i){if(!x.ok&&x.f&&x.f>=iso(TODAY)&&hConf(x.f,x.h,i).length){ch++;if(ch0<0)ch0=i}});
  if(ch)out.push({t:ch+(ch===1?' tarea choca':' tareas chocan')+' con tu turno o con otra tarea',h:'tareas',ti:ch0,tone:'warn'});
  if(c.hayInf)out.push({t:'Una cuota no cubre los intereses de su deuda',h:'dinero',tone:'bad'});
  if(c.libre<0)out.push({t:'Tus gastos y cuotas superan tus ingresos en '+eur(-c.libre)+' al mes',h:'dinero/dinero',tone:'bad'});
  S.viajes.forEach(function(v,vi){var x=viajeInfo(v);if(x.pend>0&&x.ml!=null&&x.ml<=0)out.push({t:'La fecha de '+v.d+' ya pasó o es este mes y faltan '+eur(x.pend),h:'viajes/v'+vi,tone:'warn'})});
  if(!Object.keys(S.hor).length)out.push({t:'Todavía no has importado tu horario',h:'tareas',tone:'warn'});
  if(d==null||d>14)out.push({t:d==null?'Aún no tienes ninguna copia de seguridad':'Tu última copia es de hace '+d+' días',h:'resumen',tone:'warn',copia:true});
  return out;
}
var aAll=false;
function cardAtencion(){
  var tot=avisosLista(),l=aAll?tot:tot.slice(0,5);
  var cuerpo=l.length?l.map(function(x){var pil='<span class="pill '+x.tone+'">'+(x.tone==='bad'?'Revisar':'Atención')+'</span><span>'+esc(x.t)+'</span>';
    if(x.copia)return '<div class="aviso">'+pil+'<button class="btn x" data-act="export">Guardar copia</button></div>';
    if(x.ti!=null)return '<div class="aviso tap" data-act="open-t" data-i="'+x.ti+'">'+pil+'<i class="go">›</i></div>';
    return '<a class="aviso tap" href="#'+x.h+'">'+pil+'<i class="go">›</i></a>'}).join(''):'<div class="aviso"><span class="pill ok">Todo en orden</span><span>No hay nada que requiera tu atención ahora.</span></div>';
  return '<div class="card"><h2 class="ttl">Requiere atención'+(tot.length>5?'<small>'+tot.length+' avisos</small>':'')+'</h2><div class="list">'+cuerpo+'</div>'+(tot.length>5?'<div class="add"><button class="btn" data-act="aten-mas">'+(aAll?'Ver menos':'Ver más ('+(tot.length-5)+')')+'</button></div>':'')+'</div>';
}
var tlWs=null;
function tlCal(){
  var sd=selDia||iso(TODAY),t0=iso(TODAY);if(!tlWs)tlWs=t0;
  if(sd<tlWs)tlWs=sd;else if(sd>diaMas(tlWs,6))tlWs=diaMas(sd,-6);
  var lb=hDate(sd).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'}).replace('.','');lb=lb.charAt(0).toUpperCase()+lb.slice(1);
  return '<div class="dnav"><button class="btn mar" data-act="dia-mov" data-d="-1" aria-label="Día anterior">‹</button><span>'+esc(lb)+'</span><button class="btn mar" data-act="dia-mov" data-d="1" aria-label="Día siguiente">›</button></div>'+(sd!==t0?'<div class="dhoy"><a href="#" data-act="sem-hoy">Volver a hoy</a></div>':'')+libreChart(true,hDate(tlWs),sd)+libreLegBig(true)+dayLite(sd);
}
function tlBtn(c){return '<button type="button" class="btn tlb tlg'+(tlOpen?' sel':'')+(c?' '+c:'')+'" data-act="tl-toggle" aria-expanded="'+(tlOpen?'true':'false')+'">Tiempo libre</button>'}
function cardProximos(){
  var rows=[],i,ag=agLista(),npt=S.agenda.filter(function(x){return !x.ok&&x.f&&x.f>=iso(TODAY)&&x.f<=sumaDias(7)}).length;
  for(i=0;i<7;i++){var d=new Date(TODAY);d.setDate(d.getDate()+i);var k=iso(d),v=S.hor[k],t=hTipo(v);
    var evs=ag.filter(function(x){return x.it.f===k&&!x.it.ok}).map(function(x){return '<div class="evl'+(x.it.imp?' imp':'')+'">'+esc((x.it.h?x.it.h+' · ':'')+x.it.t)+'</div>'}).join('');
    var lab=t==='T'?'<b class="tu">'+esc(hRotulo(v))+'</b>':'<b>'+(t==='V'?'Vacaciones':'No trabajas')+'</b>';
    rows.push('<div class="dia'+(i===0?' hoyr':'')+'"><div class="dl"><span>'+esc(d.toLocaleDateString('es-ES',{weekday:'short',day:'numeric'}).replace('.',''))+'</span>'+lab+'<small>'+(t==='T'?'≈ '+hN(hLibre(v))+' h libres':(vjDia(k)?'viaje':'libre'))+'</small></div>'+evs+'</div>')}
  return '<div class="card"><h2 class="ttl">Próximos 7 días <small class="npt">'+npt+(npt===1?' tarea':' tareas')+'</small>'+enlace('tareas/cal','Calendario')+'</h2><div class="lchart"><div class="lchh"><button type="button" class="btn tlb tlg" data-act="tl-go">Tiempo libre</button></div>'+libreChart(true)+libreLegBig()+'</div><div class="dias">'+rows.join('')+'</div></div>';
}
function cardViajes(){
  var l=S.viajes.map(function(v,vi){return {v:v,vi:vi,x:viajeInfo(v)}}).sort(function(a,b){return (a.v.f||'9999').localeCompare(b.v.f||'9999')}).slice(0,2);
  var cuerpo=l.map(function(o){var pct=num(o.v.c)>0?Math.min(100,Math.round(100*num(o.v.a)/num(o.v.c))):0;
    return '<a class="mb mba" href="#viajes/v'+o.vi+'"><div class="r2"><span>'+esc(o.v.d)+' · <b class="vdy">'+viajeDias(o.v)+'</b></span><b>'+pct+'%</b></div><div class="bar" aria-hidden="true"><i style="width:'+pct+'%"></i></div><p class="note" style="margin:.3rem 0 0">'+(o.x.pend<=0?'Ahorro completo.':'Faltan '+eur(o.x.pend)+(o.x.need?' · '+eur(o.x.need)+' al mes':''))+'</p></a>'}).join('')||'<div class="empty">Sin viajes previstos.</div>';
  return '<div class="card"><h2 class="ttl">Próximos viajes'+enlace('viajes/v0','Detalle')+'</h2>'+cuerpo+'</div>';
}
var pOpen='',dOpen='';
function ringSVG(p,col){var C=2*Math.PI*26;return '<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--line)" stroke-width="8"/><circle cx="32" cy="32" r="26" fill="none" stroke="'+col+'" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+(C*p/100).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">'+p+'%</text></svg>'}
function donutSVG(segs){
  var C=2*Math.PI*26,tot=segs.reduce(function(a,s){return a+Math.max(0,s.v)},0),acc=0;
  var arcs=tot>0?segs.map(function(s){var l=C*Math.max(0,s.v)/tot,r='<circle cx="32" cy="32" r="26" fill="none" stroke="'+s.c+'" stroke-width="9" stroke-dasharray="'+l.toFixed(1)+' '+(C-l).toFixed(1)+'" stroke-dashoffset="'+(-acc).toFixed(1)+'" transform="rotate(-90 32 32)"/>';acc+=l;return r}).join(''):'';
  return '<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--line)" stroke-width="9"/>'+arcs+'</svg>';
}
function sparkSVG(ys){
  if(!ys||ys.length<2)return '';
  var w=110,h=38,mx=Math.max.apply(null,ys),mn=Math.min.apply(null,ys),sp=(mx-mn)||1;
  var pts=ys.map(function(y,i){return (i*w/(ys.length-1)).toFixed(1)+','+(h-3-(y-mn)/sp*(h-8)).toFixed(1)});
  return '<svg viewBox="0 0 '+w+' '+h+'" width="100%" height="38" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,'+h+' '+pts.join(' ')+' '+w+','+h+'" fill="rgba(29,160,171,.18)"/><polyline points="'+pts.join(' ')+'" fill="none" stroke="var(--turq)" stroke-width="2.2" stroke-linejoin="round"/></svg>';
}
function citaDia(k){return S.agenda.some(function(x){return !x.ok&&x.f===k&&/\bcita\b/i.test(x.t)})}
function libreChart(big,start,sel){
  var cal=!!sel,W=big?340:120,top=big?18:12,bh=big?(cal?176:150):30,H=top+bh+(big?(cal?34:22):2),cw=W/7,bw=big?32:12,out='',i,nm=['D','L','M','X','J','V','S'],sc=big?.55:.34,sz=24*sc;
  function seg(cx,y,h,col,txt,tc){var r='<rect x="'+(cx-bw/2).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw+'" height="'+h.toFixed(1)+'" rx="2" fill="'+col+'"/>';if(h>=13)r+='<text x="'+cx.toFixed(1)+'" y="'+(y+h/2+3.5).toFixed(1)+'" text-anchor="middle" class="lch" style="fill:'+tc+'">'+txt+'</text>';return r}
  for(i=0;i<7;i++){var d=new Date(start||TODAY);d.setDate(d.getDate()+i);var k=iso(d),v=S.hor[k],t=hTipo(v),l=t==null?H_LIBRE:hLibre(v),vj=vjDia(k),col=vj?'#10B05A':'var(--turq)',cx=i*cw+cw/2,h=Math.max(l/16*bh,2);
    if(!big)out+='<rect x="'+(cx-bw/2).toFixed(1)+'" y="'+(top+bh-h).toFixed(1)+'" width="'+bw+'" height="'+h.toFixed(1)+'" rx="3" fill="'+col+'"/>';
    else{var w=t==='T'?hHoras(v):0,c=t==='T'?Math.max(0,16-l-w):0,u=bh/(cal?24:16),y=top;
      out+='<rect x="'+(cx-bw/2).toFixed(1)+'" y="'+top+'" width="'+bw+'" height="'+bh+'" rx="2" fill="var(--line)" opacity=".55"/>';
      out+=seg(cx,y,l*u,col,hN(l)+' h','#fff');y+=l*u;
      if(w>0){out+=seg(cx,y,w*u,'var(--oro)',hN(w)+' h','#172D43');y+=w*u}
      if(c>0){out+=seg(cx,y,c*u,'#B9BFC7',hN(c)+' h','#172D43');y+=c*u}
      if(cal)out+=seg(cx,y,H_SUE*u,'#3F5C80','8 h','#fff')}
    if(sel&&big)out+=(k===sel?'<rect x="'+(cx-bw/2-3).toFixed(1)+'" y="'+(top-3)+'" width="'+(bw+6)+'" height="'+(bh+36)+'" rx="7" fill="none" stroke="#D6AD55" stroke-width="1.8"/>':'')+'<rect x="'+(cx-cw/2).toFixed(1)+'" y="0" width="'+cw.toFixed(1)+'" height="'+H+'" fill="transparent" data-act="tl-sel" data-d="'+k+'"/>';
    if(citaDia(k))out+='<g transform="translate('+(cx-sz/2).toFixed(1)+' '+((top-sz)/2).toFixed(1)+') scale('+sc+')">'+'<path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill="#D64545" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>'+'</g>';
    if(big)out+='<text x="'+cx.toFixed(1)+'" y="'+(H-5)+'" text-anchor="middle" class="lcd">'+nm[d.getDay()]+d.getDate()+'</text>'}
  return '<svg viewBox="0 0 '+W+' '+H+'" width="100%" '+(big?'':'height="42" ')+'aria-hidden="true">'+out+'</svg>';
}
function libreLegBig(cal){return '<span class="mleg" style="margin-top:'+(cal?'.9rem':'.2rem')+'"><span><i style="background:var(--turq)"></i>Tiempo libre</span><span><i style="background:var(--oro)"></i>Trabajo</span><span><i style="background:#B9BFC7"></i>Desplazamiento</span>'+(cal?'<span><i style="background:#3F5C80"></i>Sueño 8 h</span>':'')+'<span><i style="background:#10B05A"></i>Viaje</span><span><svg viewBox="0 0 24 24" width="9" height="9" aria-hidden="true"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill="#D64545" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>Cita</span></span>'}
function libreLeg(){return '<span class="mleg"><span><i style="background:var(--turq)"></i>Libre</span><span><i style="background:#10B05A"></i>Viaje</span><span><svg viewBox="0 0 24 24" width="9" height="9" aria-hidden="true"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill="#D64545" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>Cita</span></span>'}
function barsSemSVG(){return libreChart(false)+libreLeg()}
function tile(id,tit,vv,sub,gr,cls){return '<button type="button" class="tile'+(cls?' '+cls:'')+(dOpen===id?' on':'')+'" data-act="res-tile" data-k="'+id+'" aria-expanded="'+(dOpen===id?'true':'false')+'"><span class="tl">'+tit+'</span><span class="tg">'+gr+'</span><span class="tv">'+vv+'</span><span class="ts">'+sub+'</span>'+'</button>'}
function vResumen(){
  var c=calc(),m=metasStats(),hoy=iso(TODAY),lim=sumaDias(7),f=S.fin;
  var ing=iTot(),g=gTot();
  var nt=S.agenda.filter(function(x){return !x.ok}).length,ni=S.ideas.length;
  var nw=S.trabajo.filter(function(x){return !x.ok}).length,bub=[['t','Tareas',nt,'t'],['i','Ideas',ni,'i'],['w','Trabajo',nw,'w']].map(function(b){return '<button type="button" class="bubl b-'+b[3]+(pOpen===b[0]?' on':'')+'" data-act="res-pend" data-k="'+b[0]+'" aria-expanded="'+(pOpen===b[0]?'true':'false')+'"><b>'+b[2]+'</b><span>'+b[1]+'</span></button>'}).join('');
  var na=avisosLista().length,pd=pOpen==='t'?cardTareas():pOpen==='i'?cardIdeas(true):pOpen==='w'?cardWork():pOpen==='a'?cardAtencion():'';
  var abtn='<button type="button" class="atenb'+(pOpen==='a'?' on':'')+'" data-act="res-pend" data-k="a" aria-expanded="'+(pOpen==='a'?'true':'false')+'"><b>'+na+'</b><span>Requiere atención</span><i class="chv" aria-hidden="true"></i></button>';
  var out=banner()+cardHoy()+'<section class="blk b-aten"><h2 class="blkt">Pendiente global<small>Toca un pendiente para ver</small></h2><div class="bubs">'+bub+'</div>'+abtn+(pd?'<div class="pdet">'+pd+'</div>':'')+'</section>';
  var dm=(ing<=0&&g+c.cuotas<=0)?{v:'Sin datos',s:'añade ingresos'}:{v:eur(Math.abs(c.libre)),s:c.libre>=0?'te sobran al mes':'te faltan al mes'};
  var dg=donutSVG([{v:g,c:'var(--turq)'},{v:c.cuotas,c:'var(--oro)'},{v:Math.max(0,c.libre),c:'var(--ok)'}]);
  var pct=m.tot?Math.round(100*m.ok/m.tot):0;
  var np=S.agenda.filter(function(x){return !x.ok&&x.f&&x.f>=hoy&&x.f<=lim}).length;
  var vj=S.viajes.map(function(v){return {v:v,x:viajeInfo(v)}}).sort(function(a,b){return (a.v.f||'9999').localeCompare(b.v.f||'9999')})[0];
  var vp=vj&&num(vj.v.c)>0?Math.min(100,Math.round(100*num(vj.v.a)/num(vj.v.c))):0;
  var nd=function(x){return x?' nd':''};
  var vsub=vj?(vj.x.ml!=null&&vj.x.pend>0?'faltan '+eur(vj.x.pend)+' · '+eur(vj.x.need)+'/mes':(vj.x.pend>0?'faltan '+eur(vj.x.pend):'ahorrado entero')):'añade un viaje';
  var items=[
    ['dinero',tile('dinero','Dinero',dm.v,dm.s,dg,nd(ing<=0&&g+c.cuotas<=0).trim()),cardDinero(true)],
    ['deuda',tile('deuda','Deuda',c.deuda>0?eur(c.deuda):'Sin deudas',c.deuda>0?'pendientes hoy':'nada pendiente',c.deuda>0?sparkSVG(c.curva):'',nd(c.deuda<=0).trim()),cardDeuda(true)],
    ['obj',tile('obj','Objetivos',m.tot?m.ok+' de '+m.tot:'Sin objetivos','hechos · '+tareasPct()+'% del plan de marca',ringSVG(pct,pct>=num(S.alc||70)?'var(--ok)':'var(--turq)'),nd(!m.tot).trim()),cardMetas(true)],
    ['prox',tile('prox','Próximos 7 días',np+(np===1?' tarea':' tareas'),'',barsSemSVG()),cardProximos()],
    ['viajes',tile('viajes','Viajes',vj?esc(vj.v.d):'Sin viajes',(vj?'<b class="vdy">'+viajeDias(vj.v)+'</b> · '+vp+'% ahorrado · ':'')+vsub,'<span class="pb"><i style="width:'+vp+'%"></i></span>','wide'+nd(!vj)),cardViajes()]
  ];
  var tiles='';
  items.forEach(function(it,i){
    if(it[0]==='viajes')tiles+='<h2 class="blkt tsub">Viajes<small>Toca para ver viajes</small></h2>';
    tiles+=it[1];
    if((i%2===1||i===items.length-1)){
      var row=items.slice(i-(i%2),i+1).filter(function(x){return x[0]===dOpen})[0];
      if(row)tiles+='<div class="tdet">'+row[2]+'</div>';
    }
    if(i===3)tiles+=marcaOpen?'<div class="tmarca solo ani">'+cardMarca(true,'<div class="add" style="justify-content:center;margin-top:.6rem"><button class="btn" data-act="res-marca">Minimizar</button></div>')+'</div>':'<button type="button" class="tile wide tmk" data-act="res-marca" aria-expanded="false"><span class="tmr">'+radarSVG(marcaPil())+'</span><span class="tmt"><span class="tl">Mi marca personal</span><span class="tv">'+tareasPct()+'% del plan</span><span class="ts">Toca para ver el gráfico</span></span><i class="chv" aria-hidden="true"></i></button>';
  });
  out+='<section class="blk b-panel"><h2 class="blkt">Cuadro de mando<small>Toca un panel para abrir</small></h2>'+heroPan()+'<div class="tiles">'+tiles+'</div></section>'+backupCard();
  return out;
}
var DESC={Web:'Web publicada y cuidada',Proyectos:'Proyectos visibles con ficha',LinkedIn:'Perfil completo y activo',CV:'Dos CV listos en PDF',Inglés:'Nivel para trabajar',Red:'Contactos del sector'};
function vMarca(){
  var mp=marcaPil();
  var bloques=mp.map(function(p){
    var pc=p.n2?Math.round(100*p.d/p.n2):0,key='m:'+p.n;
    var ts=S.marca.tareas.map(function(t,i){return {t:t,i:i}}).filter(function(x){return x.t.a===p.n}).map(function(x){var t=x.t;return '<div class="task'+(t.ok?' done':'')+'"><input type="checkbox" data-act="tg" data-list="marca.tareas" data-i="'+x.i+'"'+(t.ok?' checked':'')+' aria-label="Hecha"><span>'+esc(t.t)+'</span><button class="btn x" data-act="del" data-list="marca.tareas" data-i="'+x.i+'" aria-label="Quitar">Quitar</button></div>'}).join('')||'<div class="empty">Sin tareas en esta área.</div>';
    return '<details class="mbl" data-fold="'+esc(key)+'"'+(foldOpen[key]?' open':'')+'><summary><span class="mn">'+esc(p.n)+'</span><span class="mbar" aria-hidden="true"><i style="width:'+pc+'%"></i></span><b>'+(p.n2?p.d+'/'+p.n2+' · '+pc+'%':'0%')+'</b></summary><div class="mbd">'+ts+'</div></details>';
  }).join('');
  var opt=S.marca.pilares.map(function(p){return '<option>'+esc(p.n)+'</option>'}).join('');
  return '<details class="card fold" id="a-marca" data-fold="mc"'+(foldOpen.mc?' open':'')+' style="margin-top:1.1rem"><summary class="mksum"><span class="ttl" style="margin:0 0 .6rem;flex:1 0 100%">Mi marca personal</span><span class="mkrow"><span class="tmr">'+radarSVG(marcaPil())+'</span><span class="tmt"><span class="tv">'+tareasPct()+'% del plan</span><span class="ts">Toca para ver las áreas</span></span></span></summary><div style="margin-top:1rem"><div class="verg"><button type="button" class="tpill" data-act="marca-graf">Ver gráfico</button></div><p class="note">Cada área sube sola cuando marcas como hechas sus tareas. Toca un área para ver sus tareas.</p><div class="mbls">'+bloques+'</div>'+
  '<details class="sb oadd" style="margin-top:1rem"><summary><span class="oad"><span class="oplus" aria-hidden="true">+</span><span><b>Añadir una tarea de marca</b><small>Hace crecer un área de tu gráfico</small></span></span></summary><div class="sbd"><div class="add" style="align-items:flex-end"><label class="f" style="flex:1 1 180px"><span>Nueva tarea de marca</span><input id="nt" data-enter="bt" type="text" placeholder="Qué vas a hacer"></label><label class="f"><span>Área</span><select id="nta">'+opt+'</select></label><button class="btn pri" id="bt" data-act="marca-add">Añadir</button></div></div></details></div></details>';
}
var vjShown=3;
function vViajes(){
  var infos=S.viajes.map(viajeInfo),c=calc(),pend=0,need=0;
  infos.forEach(function(x){pend+=x.pend;need+=x.need||0});
  var ord=S.viajes.map(function(v,i){return i}).sort(function(a,b){return (S.viajes[a].f||'9999').localeCompare(S.viajes[b].f||'9999')});
  var list=ord.slice(0,vjShown).map(function(i,n){
    var v=S.viajes[i],x=infos[i],txt,tone='ok',ct='';
    if(v.f&&String(v.f).length>7){var dd=Math.round((hDate(v.f)-hDate(iso(TODAY)))/86400000);ct=dd>0?'faltan '+dd+(dd===1?' día':' días'):(dd===0?'¡es hoy!':((v.f2&&v.f2>=iso(TODAY))?'en curso':'ya pasó'))}else ct='sin fecha';
    var cab='<div class="vhd"><span class="vn">'+(n+1)+'</span><b>'+esc(v.d||'Viaje')+'</b><span class="vct">'+ct+'</span></div>';
    if(x.pend<=0){txt='<span class="pill ok">Cubierto</span>'}
    else if(x.ml==null){txt='<span class="pill warn">Pon una fecha</span>'}
    else if(x.ml<=0){var pas=(String(v.f2||v.f).length>7)&&(v.f2||v.f)<iso(TODAY);txt=(pas?'<span class="pill bad">Fecha pasada</span> ':'')+'Faltan <b>'+eur(x.pend)+'</b>'}
    else{txt='Faltan <b>'+eur(x.pend)+'</b> · <b>'+eur(x.need)+'/mes</b> durante '+x.ml+(x.ml===1?' mes':' meses')}
    return '<div class="item" id="a-v'+i+'">'+cab+'<div class="vfm"><div class="vf1">'+inp('Destino','viajes.'+i+'.d',v.d)+'</div><div class="vf2">'+inp('Desde (ida)','viajes.'+i+'.f',v.f,'date')+inp('Hasta (vuelta)','viajes.'+i+'.f2',v.f2||'','date')+'</div><div class="vf2">'+inp('Coste estimado (€)','viajes.'+i+'.c',v.c,'number','min="0"')+inp('Ya ahorrado (€)','viajes.'+i+'.a',v.a,'number','min="0"')+'</div></div><div class="res"><span>'+txt+'</span><button class="btn x" data-act="del" data-list="viajes" data-i="'+i+'" style="margin-left:auto">Quitar</button></div></div>';
  }).join('')||'<div class="empty">Añade tu primer viaje para calcular cuánto ahorrar cada mes.</div>';
  var cmp=need<=Math.max(c.libre,0)?'<span class="pill ok">Cabe en tu ahorro libre</span>':'<span class="pill warn">Supera tu ahorro libre ('+eur(c.libre)+'/mes)</span>';
  return banner()+heroViajes()+'<div class="kpis">'+kpi('Pendiente de ahorrar',eur(pend),S.viajes.length+(S.viajes.length===1?' viaje':' viajes'),'')+kpi('Necesario al mes',eur(need),'Suma de todos los viajes','')+kpi('Ahorro libre al mes',eur(c.libre),'De la sección Dinero',c.libre>=0?'ok':'bad')+'</div>'+
   '<div class="card"><h2 class="ttl">Mis viajes<small>'+cmp+'</small></h2><div class="list">'+list+'</div>'+(ord.length>vjShown?'<div class="add" style="justify-content:center"><button class="btn" data-act="vj-mas">Ver más ('+Math.min(3,ord.length-vjShown)+')</button></div>':(vjShown>3?'<div class="add" style="justify-content:center"><button class="btn" data-act="vj-menos">Ver menos</button></div>':''))+'<div class="add"><button class="btn pri" data-act="add-viaje">Añadir viaje</button></div></div>';
}
function vDinero(){
  var c=calc(),f=S.fin;
  var cuota=c.libre>=0?'ok':'bad';
  var fondoTone=c.fondoMeses>=num(f.meses)?'ok':'warn';
  var proy=[],i,aG0=num(f.ahorro);Object.keys(S.fm).forEach(function(k){if(sumM(S.fm[k].i)||sumM(S.fm[k].g))aG0+=sumM(S.fm[k].i)-sumM(S.fm[k].g)-c.cuotas});for(i=0;i<=24;i++)proy.push(Math.max(0,aG0+c.libre*i));
  var ym=finMes||ymHoy(),M=fmGet(ym),tI=sumM(M.i),tG=sumM(M.g),gFijo=M.g.reduce(function(a,g){return a+(g.t==='pun'?0:num(g.m))},0),saldoM=tI-tG-c.cuotas;
  var yms=Object.keys(S.fm).filter(function(k){return sumM(S.fm[k].i)||sumM(S.fm[k].g)}).sort();
  var mlab2=function(k){var d=new Date(+k.slice(0,4),+k.slice(5)-1,1),t=d.toLocaleDateString('es-ES',{month:'long',year:'numeric'});return t.charAt(0).toUpperCase()+t.slice(1)};
  var gl=M.g.map(function(g,i){return '<div class="item gi"><div class="fields">'+inp('Gasto','fm.'+ym+'.g.'+i+'.n',g.n)+inp('Importe (€)','fm.'+ym+'.g.'+i+'.m',g.m,'number','min="0"')+'<label class="f"><span>Tipo</span><select data-bind="fm.'+ym+'.g.'+i+'.t"><option value="fijo"'+(g.t!=='pun'?' selected':'')+'>Fijo</option><option value="pun"'+(g.t==='pun'?' selected':'')+'>Puntual</option></select></label><button class="btn x" data-act="del" data-list="fm.'+ym+'.g" data-i="'+i+'">Quitar</button></div></div>'}).join('')||'<div class="empty">Sin gastos este mes.</div>';
  var il=M.i.map(function(g,i){return '<div class="item gi gi2"><div class="fields">'+inp('Ingreso','fm.'+ym+'.i.'+i+'.n',g.n)+inp('Importe (€)','fm.'+ym+'.i.'+i+'.m',g.m,'number','min="0"')+'<button class="btn x" data-act="del" data-list="fm.'+ym+'.i" data-i="'+i+'">Quitar</button></div></div>'}).join('')||'<div class="empty">Sin ingresos este mes.</div>';
  var totI=0,totG=0;yms.forEach(function(k){totI+=sumM(S.fm[k].i);totG+=sumM(S.fm[k].g)});
  var totC=c.cuotas*yms.length,ahorroGlobal=num(f.ahorro)+totI-totG-totC,netoG=ahorroGlobal-c.deuda;
  var filasM=yms.slice().reverse().map(function(k){var a=sumM(S.fm[k].i),b2=sumM(S.fm[k].g),sd=a-b2-c.cuotas;return '<div class="row gm"><span style="flex:1 1 90px"><b>'+esc(mlab2(k))+'</b></span><span>'+eur(a)+' − '+eur(b2+c.cuotas)+'</span><b style="color:var(--'+(sd>=0?'ok':'bad')+')">'+(sd>=0?'+':'')+eur(sd)+'</b></div>'}).join('')||'<div class="empty">Aún no hay meses con datos.</div>';
  var allM=yms.slice();[ym,ymHoy()].forEach(function(k){if(allM.indexOf(k)<0)allM.push(k)});allM.sort();
  var acG=0,acS=0,ser=[num(f.ahorro)],tarj=allM.map(function(k){var a=sumM(fmGet(k).i),g2=sumM(fmGet(k).g),has=a||g2,sd=has?a-g2-c.cuotas:0;if(has){acG+=g2;acS+=sd;ser.push(num(f.ahorro)+acS)}var d=new Date(+k.slice(0,4),+k.slice(5)-1,1),lb=d.toLocaleDateString('es-ES',{month:'short'}).replace('.','')+' '+String(d.getFullYear()).slice(2);return '<button type="button" class="mt'+(k===ym?' on':'')+'" data-act="fin-mes" data-ym="'+k+'"><b>'+esc(lb.charAt(0).toUpperCase()+lb.slice(1))+'</b><span style="color:var(--'+(sd>=0?'ok':'bad')+')">'+(has?(sd>=0?'+':'')+eur(sd):'sin datos')+'</span><small>gastado: '+eur(acG)+'</small></button>'}).join('');
  var nxt=ymAdd(allM[allM.length-1],1);
  var mnav='<p class="note" style="margin:0 0 .5rem">Toca un mes para ver sus ingresos y gastos. «Gastado» es lo que llevas gastado en total hasta ese mes.</p><div class="mts">'+tarj+'<button type="button" class="mt nuevo" data-act="fin-mes" data-ym="'+nxt+'"><b>+ Mes</b><small>añadir</small></button></div><h3 class="sub" style="margin-top:1rem">'+esc(mlab2(ym))+(ym===ymHoy()?' · este mes':'')+'</h3>';
  var deudas=S.deudas.map(function(d,i){
    var s=c.sims[i],res;
    if(num(d.saldo)<=0)res='<span class="pill ok">Sin saldo</span>';
    else if(!s.ok)res='<span class="pill bad">La cuota no cubre los intereses</span>';
    else res='Libre en <b>'+mes(addMonths(TODAY,s.n))+'</b> ('+s.n+' meses) · Intereses <b>'+eur(s.int)+'</b>';
    return '<div class="item"><div class="fields">'+inp('Nombre','deudas.'+i+'.n',d.n)+inp('Saldo (€)','deudas.'+i+'.saldo',d.saldo,'number','min="0"')+inp('Interés anual (%)','deudas.'+i+'.tae',d.tae,'number','min="0"')+inp('Cuota mensual (€)','deudas.'+i+'.cuota',d.cuota,'number','min="0"')+'</div><div class="res"><span>'+res+'</span><button class="btn x" data-act="del" data-list="deudas" data-i="'+i+'" style="margin-left:auto">Quitar</button></div></div>';
  }).join('')||'<div class="empty">Sin deudas registradas.</div>';
  var curva=S.deudas.length&&c.deuda>0?'<h3 style="margin:1.1rem 0 .5rem;font-size:.95rem">Cómo baja la deuda</h3>'+lineSVG(c.curva,{fmt:eur,xl:function(j){return j===0?'Hoy':mes(addMonths(TODAY,j))},alt:'Evolución de la deuda total mes a mes'})+(c.hayInf?'<p class="note">El gráfico muestra 60 meses porque alguna cuota no cubre sus intereses.</p>':''):'';
  return banner()+
   cardDinero(false).replace('class="card"','class="card" style="margin-bottom:1.1rem"')+
   '<details class="card fold fs" data-fold="fs"'+(foldOpen.fs?' open':'')+'><summary><span class="ttl" style="margin:0">Mi situación mensual<small>'+(saldoM>=0?'+':'')+eur(saldoM)+' este mes</small></span></summary><div style="margin-top:1rem">'+mnav+
   '<div class="kpis" style="margin:.7rem 0">'+kpi('Ingresos',eur(tI),'del mes','')+kpi('Gastos',eur(tG),'fijos '+eur(gFijo)+' · puntuales '+eur(tG-gFijo),'')+kpi('Cuotas de deudas',eur(c.cuotas),'cada mes','')+kpi('Saldo del mes',(saldoM>=0?'+':'')+eur(saldoM),saldoM>=0?'te sobra':'te falta',saldoM>=0?'ok':'bad')+'</div>'+
   '<details class="sb" data-fold="fi"'+(foldOpen.fi?' open':'')+'><summary><span>Ingresos</span><b>'+eur(tI)+'</b></summary><div class="sbd"><div class="list">'+il+'</div><div class="add"><button class="btn pri" data-act="add-ing">+ Añadir ingreso</button></div></div></details>'+
   '<details class="sb" data-fold="fx"'+(foldOpen.fx?' open':'')+'><summary><span>Gastos</span><b>'+eur(tG)+'</b></summary><div class="sbd"><div class="list">'+gl+'</div><div class="add"><button class="btn pri" data-act="add-gasto">+ Añadir gasto</button></div><p class="note">«Fijo» se repite cada mes; «Puntual» solo cuenta en este mes.</p></div></details>'+
   '<div class="add"><button class="btn" data-act="trae-mes">Traer del mes anterior</button></div><p class="note">Trae los ingresos y los gastos fijos del mes anterior para no escribirlos otra vez.</p></div></details>'+
   '<details class="card fold fg" data-fold="fg"'+(foldOpen.fg?' open':'')+'><summary><span class="ttl" style="margin:0">Posición global<small>'+eur(netoG)+' en total</small></span></summary><div style="margin-top:1rem">'+
   '<div class="kpis" style="margin:0 0 .7rem">'+kpi('Ahorro total',eur(ahorroGlobal),'partida + saldos de '+yms.length+(yms.length===1?' mes':' meses'),ahorroGlobal>=0?'ok':'bad')+kpi('Deuda',eur(c.deuda),'pendiente hoy','')+kpi('Ingresos totales',eur(totI),'todos los meses','')+kpi('Gastos totales',eur(totG+totC),'incluye cuotas','')+'</div>'+
   '<p class="note" style="margin-top:0">Patrimonio neto (ahorro − deuda): <b>'+eur(netoG)+'</b></p>'+
   '<h3 class="sub">Mes a mes</h3>'+filasM+(ser.length>2?'<h3 class="sub">Cómo va mi ahorro</h3>'+lineSVG(ser,{fmt:eur,xl:function(j){return j===0?'Inicio':mlab2(yms[j-1]).slice(0,3)},alt:'Ahorro acumulado mes a mes'}):'')+
   '<h3 class="sub">Mi punto de partida</h3><div class="fields">'+inp('Ahorro antes del primer mes (€)','fin.ahorro',f.ahorro,'number','min="0"')+inp('Meses de gastos que quiero tener ahorrados','fin.meses',f.meses,'number','min="0"')+'</div><p class="note">Fondo de emergencia: lo normal es tener entre 3 y 6 meses de gastos guardados. Ahora tienes para '+c.fondoMeses.toFixed(1)+' meses.</p>'+
   '<p class="note">Cálculo orientativo. No sustituye el consejo de un asesor financiero.</p></div></details>'+
   '<details class="card fold" id="a-deudas" data-fold="fd"'+(foldOpen.fd?' open':'')+'><summary><span class="ttl" style="margin:0">Deudas<small>'+(S.deudas.length?eur(c.deuda):'ninguna')+'</small></span></summary><div style="margin-top:1rem"><div class="list">'+deudas+'</div><div class="add"><button class="btn pri" data-act="add-deuda">Añadir deuda</button></div>'+curva+'</div></details>';
}
var aRecent={},oRecent={},oPlazo='all',oEstado='pend',O_ETQ={'3m':'3 meses','12m':'1 año','3a':'3–5 años'};

/* ---------- Héroes por pestaña ---------- */
var tFil=null,tFilAnim=false;
function filT(){
  if(!tFil)return '';
  var hoy=iso(TODAY),l=agLista().filter(function(x){return !x.it.ok&&(tFil==='imp'?x.it.imp:tFil==='hoy'?x.it.f===hoy:(x.it.f&&x.it.f<hoy))});
  var tt={imp:'Importantes',hoy:'Para hoy',atr:'Atrasadas'}[tFil];
  var filas=l.map(function(x){var it=x.it,m=it.f?(it.f<hoy?'Atrasada · ':'')+fechaCorta(it.f)+(it.h?' · '+agHora(it):''):'Sin fecha';return '<div class="tmini"><input type="checkbox" data-act="tg" data-list="agenda" data-i="'+x.i+'" aria-label="Hecha"><div class="agt tap" data-act="open-t" data-i="'+x.i+'"><span class="agx">'+(it.imp?'★ ':'')+esc(it.t)+'</span><small>'+esc(m)+'</small></div></div>'}).join('')||'<div class="empty">Nada por aquí. Buen trabajo.</div>';
  var a=tFilAnim?' ani':'';tFilAnim=false;
  return '<div class="card tfil solo'+a+'"><h2 class="ttl">'+tt+'<small>'+l.length+'</small></h2>'+filas+'</div>';
}
function heroTareas(){
  var hoy=iso(TODAY),A=S.agenda,atr=A.filter(function(x){return !x.ok&&x.f&&x.f<hoy}).length,hn=A.filter(function(x){return !x.ok&&x.f===hoy}).length,imp=A.filter(function(x){return !x.ok&&x.imp}).length;
  var chip=function(n,l,k){return '<button type="button" class="tlb tch'+(tFil===k?' sel':'')+'" data-act="t-fil" data-k="'+k+'" aria-pressed="'+(tFil===k)+'">'+(k==='imp'?'<span class="cstar2" aria-hidden="true">★</span>':'')+'<b>'+n+'</b> '+l+'</button>'};
  return '<section class="card tbk"><h2 class="ttl">Tus tareas<small>Toca para verlas</small></h2><div class="tchs">'+chip(imp,'importantes','imp')+chip(hn,'hoy','hoy')+chip(atr,'atrasadas','atr')+'</div></section>'+filT();
}
function heroViajes(){return ''}
function heroPan(){return ''}
var O_IC={
 '3m':'<path d="M12 21v-8"/><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 15c0-3-2.5-5-6-5 0 3 2.5 5 6 5z"/>',
 '12m':'<path d="M12 21v-5M9 21h6"/><path d="M12 3c3.5 0 6 2.4 6 5.6 0 2.7-2 4.6-4.5 5H10.5C8 14.2 6 12.3 6 8.6 6 5.4 8.5 3 12 3z"/>',
 '3a':'<path d="M3 20l6.5-11 4 6.5 2-3L21 20z"/><path d="M9.5 9V4l4 1.5-4 1.5"/>'};
function vMetas(){
  var todos=S.metas.map(function(m,i){return {m:m,i:i}}),ms=metasStats();
  var pend=todos.filter(function(x){return !x.m.ok}).length,hechos=todos.length-pend;
  var l=todos.filter(function(x){return (oPlazo==='all'||x.m.h===oPlazo)&&(oEstado==='todos'||(oEstado==='pend')===!x.m.ok||(oEstado==='pend'&&oRecent[x.i]))});
  var alc=Math.max(1,Math.min(100,num(S.alc)||70)),pct=ms.tot?Math.round(100*ms.ok/ms.tot):0;
  var etapas=[[10,'Punto de partida','Todo gran camino empieza con un primer paso. Elige un objetivo y empieza hoy.'],[35,'Cogiendo ritmo','Ya has arrancado. Cada objetivo hecho te empuja al siguiente.'],[65,'En marcha','Vas muy bien. Lo difícil, que es empezar, ya lo has hecho.'],[90,'Recta final','Casi lo tienes. Fíjate cuánto has avanzado desde el principio.'],[101,'Meta conseguida','Lo has logrado. Es buen momento para soñar un objetivo más grande.']];
  var et=etapas.filter(function(e){return pct<e[0]})[0];
  if(!ms.tot)et=['','Tu camino empieza aquí','Añade tu primer objetivo y empieza a ver cómo avanzas.'];
  var chips=[['3m','3 meses',0],['12m','1 año',1],['3a','3–5 años',2]].map(function(h){var r=ms.rows[h[2]],on=oPlazo===h[0];
    return '<button type="button" class="tlb tch'+(on?' sel':'')+'" data-act="obj-plazo" data-k="'+(on?'all':h[0])+'" aria-pressed="'+on+'">'+h[1]+'</button>'}).join('');
  var hero='<section class="card tbk"><h2 class="ttl">Tus objetivos<small>'+ms.ok+' de '+ms.tot+' · '+pct+'%</small></h2><div class="tchs">'+chips+'</div>',camino='';
  var sig=null;['3m','12m','3a'].forEach(function(h){if(!sig)sig=todos.filter(function(x){return !x.m.ok&&x.m.h===h})[0]});
  var next=sig?'<div class="onext"><span class="oeyebrow">Tu siguiente paso</span><label class="onl"><input type="checkbox" data-act="tg" data-list="metas" data-i="'+sig.i+'" aria-label="Hecho"><span>'+esc(sig.m.t)+'</span></label><small>'+esc(O_ETQ[sig.m.h])+' · márcalo cuando lo consigas</small></div>':(ms.tot?'<div class="onext"><span class="oeyebrow">Tu siguiente paso</span><p class="omsg" style="margin:.3rem 0 0;color:var(--fg)">No te queda ningún objetivo pendiente. Añade uno nuevo para seguir creciendo.</p></div>':'');
  var est='<select id="oest" class="oest" aria-label="Estado"><option value="pend"'+(oEstado==='pend'?' selected':'')+'>Pendientes ('+pend+')</option><option value="hechos"'+(oEstado==='hechos'?' selected':'')+'>Hechos ('+hechos+')</option><option value="todos"'+(oEstado==='todos'?' selected':'')+'>Todos ('+todos.length+')</option></select>';
  var filas=l.map(function(x){return '<div class="task'+(x.m.ok?' done':'')+'"><input type="checkbox" data-act="tg" data-list="metas" data-i="'+x.i+'"'+(x.m.ok?' checked':'')+' aria-label="Hecho"><span>'+esc(x.m.t)+' <em class="plz">'+esc(O_ETQ[x.m.h]||'')+'</em></span><button class="btn x" data-act="del" data-list="metas" data-i="'+x.i+'" aria-label="Quitar">Quitar</button></div>'}).join('')||'<div class="empty">No hay objetivos en esta vista.</div>';
  var lista='<div class="oli" id="a-obj">'+(oPlazo!=='all'?'<div class="ofil"><h3 class="sh-h" style="margin:0">'+O_ETQ[oPlazo]+'</h3>'+est+'</div>'+filas:'')+
   '<details class="sb oadd" style="margin-top:1rem"><summary><span class="oad"><span class="oplus" aria-hidden="true">+</span><span><b>Añadir un objetivo</b><small>Escríbelo claro y ponle un plazo</small></span></span></summary><div class="sbd"><div class="add" style="align-items:flex-end"><label class="f" style="flex:1 1 180px"><span>Objetivo</span><input id="o_t" type="text" placeholder="¿Qué quieres conseguir?"></label><label class="f"><span>Plazo</span><select id="o_h"><option value="3m">3 meses</option><option value="12m">1 año</option><option value="3a">3–5 años</option></select></label><button class="btn pri" data-act="obj-add">Añadir</button></div></div></details>'+
   '<details class="sb osm"><summary><span>Alcanzable</span><b>'+alc+'%</b></summary><div class="sbd"><div class="fields">'+inp('Lo alcanzable (%)','alc',alc,'number','min="1" max="100"')+'</div><p class="note">Es tu propia referencia: cuando un tramo la supera, su anillo se pone verde.</p></div></details></div>';
  return hero+(oPlazo==='all'?'':lista)+'</section>'+vMarca();
}


/* ---------- Notas y copia de seguridad ---------- */
function dias(a){if(!a)return null;return Math.round((TODAY-new Date(a+'T00:00:00'))/86400000)}
function backupCard(){
  var d=dias(S.copia);
  return '<div class="card"><h2 class="ttl">Copia de seguridad<small>'+(d==null?'Sin copias':'Última: hace '+d+(d===1?' día':' días'))+'</small></h2><p class="note" style="margin-top:0">Tus datos viven solo en este iPhone. Guarda una copia en Archivos o iCloud de vez en cuando. También sirve para pasarlos a otro móvil.</p><div class="row" style="margin-top:.8rem"><button class="btn pri" data-act="export">Guardar copia</button><label class="btn" style="cursor:pointer">Restaurar copia<input type="file" id="imp" accept="application/json,.json" hidden></label></div><p class="note" id="impmsg"></p></div>';
}
function agHora(it){return it.h?it.h:'sin hora'}
function agOrden(a,b){return ((a.it.f||'9999-99-99')+(a.it.h||'99:99')).localeCompare((b.it.f||'9999-99-99')+(b.it.h||'99:99'))}
function agLista(){return S.agenda.map(function(it,i){return {it:it,i:i}}).sort(agOrden)}
function turnoLinea(k){var v=S.hor[k];return hTipo(v)?'Turno '+hRotulo(v)+' · ≈ '+hN(hLibre(v))+' h libres':''}
function fechaLarga(k){return hDate(k).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}
function mins(h){var p=String(h).split(':');return (+p[0])*60+(+p[1]||0)}
function hConf(f,h,skip){
  var out=[];if(!f||!h)return out;
  var m=mins(h),v=S.hor[f];
  if(hTipo(v)==='T'){
    var re=/(\d{1,2})(?::(\d{2}))?\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?/g,x;
    while((x=re.exec(v))){var a=+x[1]*60+(+x[2]||0),b=+x[3]*60+(+x[4]||0);if(b<=a)b+=1440;if(m>=a&&m<b){out.push({k:'turno',t:'Ese día tienes turno '+hRotulo(v)+'. A esa hora estás trabajando.'});break}}
  }
  S.agenda.forEach(function(o,j2){if(j2===skip||o.ok||o.f!==f||!o.h)return;if(Math.abs(mins(o.h)-m)<60)out.push({k:'tarea',t:'Ya tienes «'+o.t+'» a las '+o.h+'.'})});
  return out;
}
function cfHtml(i){
  var it=S.agenda[i],cf=it.ok?[]:hConf(it.f,it.h,i);
  return cf.length?' · <span class="cf">⚠ '+(cf[0].k==='turno'?'coincide con tu turno':'coincide con otra tarea')+'</span>':'';
}
function fechaCorta(f){return hDate(f).toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'}).replace(/\./g,'')}
function agItem(x,conFecha){
  var it=x.it,d=it.f?Math.round((hDate(it.f)-hDate(iso(TODAY)))/86400000):null;
  var meta=agHora(it);
  if(conFecha&&it.f)meta+=' · '+fechaCorta(it.f)+(d>1?' (en '+d+' días)':d<0?' (hace '+(-d)+(d===-1?' día':' días')+')':'');
  return '<div class="ag'+(it.ok?' done':'')+(it.imp?' imp':'')+'"><input type="checkbox" data-act="tg" data-list="agenda" data-i="'+x.i+'"'+(it.ok?' checked':'')+' aria-label="Hecha"><div class="agt tap" data-act="open-t" data-i="'+x.i+'"><span class="agx">'+esc(it.t)+'</span><small>'+esc(meta)+cfHtml(x.i)+'</small></div><button class="star'+(it.imp?' on':'')+'" data-act="ag-imp" data-i="'+x.i+'" aria-pressed="'+(it.imp?'true':'false')+'" aria-label="Marcar como importante">★</button><button class="btn x" data-act="del" data-list="agenda" data-i="'+x.i+'">Quitar</button></div>';
}
function agGrupos(){
  var hoy=iso(TODAY),g={atr:[],hoy:[],man:[],sem:[],mas:[],sin:[]};
  agLista().forEach(function(x){
    if(!x.it.f){g.sin.push(x);return}
    var d=Math.round((hDate(x.it.f)-hDate(hoy))/86400000);
    if(d<0)g.atr.push(x);else if(d===0)g.hoy.push(x);else if(d===1)g.man.push(x);else if(d<=7)g.sem.push(x);else g.mas.push(x);
  });
  return g;
}
function agBloque(tit,sub,arr,conFecha){
  if(!arr.length)return '';
  return '<div class="agg"><h3>'+tit+(sub?'<small>'+esc(sub)+'</small>':'')+'</h3>'+arr.map(function(x){return agItem(x,conFecha)}).join('')+'</div>';
}
function diaTareas(k){
  var it=agLista().filter(function(x){return x.it.f===k});
  return '<h3 style="margin:1.1rem 0 .5rem;font-size:.95rem">Tareas de este día</h3>'+(it.length?it.map(function(x){return agItem(x,false)}).join(''):'<div class="empty">Ninguna tarea este día.</div>')+'<div class="add"><button class="btn" data-act="ag-nuevo" data-d="'+k+'">+ Tarea este día</button></div>';
}
var SV='<svg class="ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">';
var ICO={
 tar:SV+'<path d="M5 3.5h10a2 2 0 0 1 2 2V12M5 3.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h8M5 3.5v17M8 8h6M8 11.5h4"/><path d="M19.4 13.6l1.6 1.6-6.2 6.2-2.4.6.6-2.4z"/></svg>',
 wk:'<svg class="ico wkico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3.2c.5 0 1 .3 1.3.8l7.6 13.4c.6 1-.1 2.4-1.3 2.4H4.4c-1.2 0-1.9-1.4-1.3-2.4L10.7 4c.3-.5.8-.8 1.3-.8z" fill="currentColor"/></svg>',
 ide:SV+'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
 hor:SV+'<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><rect x="8" y="12.5" width="8" height="5.5" rx="1"/><path d="M10.5 12.5v-1h3v1"/></svg>'
};
var carSel=null,carAnim=false,marcaOpen=false;
function carrusel(pend){
  var nwk=S.trabajo.filter(function(x){return !x.ok}).length;
  var c=function(k,ic,t,sub){return '<button type="button" class="cc'+(carSel===k?' on':'')+'" data-act="car" data-k="'+k+'" aria-pressed="'+(carSel===k)+'">'+ic+'<b>'+t+'</b><small>'+sub+'</small></button>'};
  return '<div class="car">'+c('mt',ICO.tar,'Mis tareas',pend+(pend===1?' pendiente':' pendientes'))+c('id',ICO.ide,'Ideas',S.ideas.length+(S.ideas.length===1?' idea':' ideas'))+c('wk',ICO.wk,'Trabajo',nwk+(nwk===1?' nota pendiente':' notas pendientes'))+c('imp',ICO.hor,'Importar o cambiar horario','calendario de trabajo')+'</div><div class="cdots" aria-hidden="true"><i class="on"></i><i></i><i></i><i></i></div>';
}
function vTareas(){
  var P=vHorarioP(),g=agGrupos(),hechas=S.agenda.filter(function(x){return x.ok}).length,pend=S.agenda.length-hechas;
  var cuerpo=agBloque('Atrasadas','Sin marcar como hechas',g.atr,true)+agBloque('Hoy',turnoLinea(iso(TODAY)),g.hoy,false)+agBloque('Mañana',turnoLinea(sumaDias(1)),g.man,false)+agBloque('Esta semana','',g.sem,true)+agBloque('Más adelante','',g.mas,true)+agBloque('Sin fecha','No salen en el calendario',g.sin,false);
  if(!cuerpo)cuerpo='<div class="empty">No tienes tareas pendientes. Pulsa «+ Nueva tarea» para añadir una.</div>';
  if(hechas)cuerpo+='<p class="note">'+hechas+(hechas===1?' tarea hecha':' tareas hechas')+'. Las que tienen fecha siguen visibles en el calendario.</p>';
  var det='';
  if(carSel==='mt')det='<div class="solo'+(carAnim?' ani':'')+'"><details class="card fold" id="a-mt" open><summary></summary><div><div class="add" style="margin:0 0 .8rem;text-align:center"><button class="btn pri" data-act="sh-tarea">+ Nueva tarea</button></div>'+cuerpo+'</div></details></div>';
  else if(carSel==='id')det='<div class="solo'+(carAnim?' ani':'')+'">'+cardIdeas(false).replace('<details ','<details open ')+'</div>';
  else if(carSel==='wk')det='<div class="solo'+(carAnim?' ani':'')+'">'+wCard(false)+'</div>';
  else if(carSel==='imp')det='<div class="solo'+(carAnim?' ani':'')+'">'+P.imp.replace('<details ','<details open ')+'</div>';
  carAnim=false;
  return banner()+''+(P.msg?'<div class="banner"><span>'+esc(P.msg)+'</span></div>':'')+heroTareas()+P.cal+P.ed+carrusel(pend)+det+P.resto;
}
function cardTareas(){
  var hoy=iso(TODAY),l=agLista().filter(function(x){return (!x.it.ok||aRecent[x.i])&&x.it.f!==hoy});
  var atr=l.filter(function(x){return x.it.f&&x.it.f<hoy}),fut=l.filter(function(x){return x.it.f&&x.it.f>hoy}),sin=l.filter(function(x){return !x.it.f});
  var todas=atr.concat(fut).concat(sin),pend=S.agenda.filter(function(x){return !x.ok}).length;
  var filas=todas.slice(0,5).map(function(x){
    var it=x.it,meta=it.f?(it.f<hoy?'Atrasada · ':'')+fechaCorta(it.f)+(it.h?' · '+agHora(it):''):'Sin fecha';
    return '<div class="tmini"><input type="checkbox" data-act="tg" data-list="agenda" data-i="'+x.i+'" aria-label="Hecha"><div class="agt tap" data-act="open-t" data-i="'+x.i+'"><span class="agx">'+(it.imp?'★ ':'')+esc(it.t)+'</span><small>'+esc(meta)+cfHtml(x.i)+'</small></div></div>';
  }).join('')||'<div class="empty">Sin más tareas pendientes.</div>';
  return '<div class="card"><h2 class="ttl">Tareas pendientes'+enlace('tareas/mt','Todas ('+pend+')')+'</h2>'+filas+'<div class="add"><button class="btn" data-act="sh-tarea">+ Nueva tarea</button></div></div>';
}
function cardWork(){
  var hoy=iso(TODAY),l=wLista().filter(function(x){return !x.it.ok}).sort(function(a,b){return (a.it.f||'9999').localeCompare(b.it.f||'9999')}).slice(0,5);
  var filas=l.map(function(x){return '<div class="tmini"><input type="checkbox" data-act="tg" data-list="trabajo" data-i="'+x.i+'" aria-label="Hecha"><div class="agt tap" data-act="open-w" data-i="'+x.i+'"><span class="agx">'+esc(x.it.t)+'</span><small>'+esc(wMeta(x.it))+'</small></div></div>'}).join('')||'<div class="empty">Sin notas de trabajo pendientes.</div>';
  return '<div class="card"><h2 class="ttl">Notas de trabajo'+enlace('trabajo','Abrir hoja')+'</h2>'+filas+'<div class="add"><button class="btn wkp" data-act="sh-trabajo">+ Nota de trabajo</button></div></div>';
}
var DEST={o3m:['3m','3 meses'],o12m:['12m','1 año'],o3a:['3a','3–5 años']};
function cardIdeas(link){
  var l=S.ideas.map(function(it,i){return {it:it,i:i}}).reverse();
  var filas=l.map(function(x){return '<div class="idea"><span class="ix">'+esc(x.it.t)+'</span><select data-ideasel="'+x.i+'" aria-label="Pasar la idea a otro sitio"><option value="">Pasar a…</option><option value="tarea">Tarea</option><option value="o3m">Objetivo · 3 meses</option><option value="o12m">Objetivo · 1 año</option><option value="o3a">Objetivo · 3–5 años</option></select><button class="btn" data-act="ed-open" data-l="ideas" data-i="'+x.i+'">Modificar</button><button class="btn x" data-act="del" data-list="ideas" data-i="'+x.i+'">Quitar</button>'+edHtml(x,'ideas',false)+'<div class="idadj">'+adjBloque(x,'ideas')+'</div></div>'}).join('')||'<div class="empty">Sin ideas. Toca la bombilla de arriba para guardar una.</div>';
  if(!link)return '<details class="card fold" id="a-id" data-fold="id"'+(foldOpen.id?' open':'')+'><summary><span class="ttl" style="margin:0">'+ICO.ide+'Ideas<small>'+S.ideas.length+'</small></span><button type="button" class="cplus" data-act="sh-idea" aria-label="Nueva idea">+</button></summary><div style="margin-top:1rem"><div class="add" style="margin:0 0 .8rem;text-align:center"><button class="btn pri" data-act="sh-idea">+ Nueva idea</button></div>'+filas+'</div></details>';
  return '<div class="card"><h2 class="ttl">Ideas'+(link?enlace('tareas/id','Ver'):'<small>'+S.ideas.length+'</small>')+'</h2><div class="add" style="margin:0 0 .6rem"><button class="btn" data-act="sh-idea">+ Nueva idea</button></div>'+filas+'</div>';
}

var shKind=null,shFrom=null,tT=null,shDay=null,shBack=null,shF=null;
function toast(msg){var t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.hidden=false;clearTimeout(tT);tT=setTimeout(function(){t.hidden=true},5200)}
function shConf(){
  var f=document.getElementById('sh_f'),h=document.getElementById('sh_h'),c=document.getElementById('sh_c');
  if(f)document.querySelectorAll('#sheet [data-sh=q]').forEach(function(b){var q=b.dataset.q;b.classList.toggle('on',q==='x'?!f.value:f.value===sumaDias(+q));b.setAttribute('aria-pressed',b.classList.contains('on'))});
  if(!c)return;
  var fe=f.value||(h.value?iso(TODAY):''),cf=hConf(fe,h.value,-1);
  c.innerHTML=cf.map(function(x){return '<div>⚠ '+esc(x.t)+'</div>'}).join('');
}
function openSheet(kind,pre){
  pre=pre||{};shKind=kind;shBack=pre.back||null;shF=pre.f||null;shFrom=pre.fromIdea!=null?pre.fromIdea:null;
  var s=document.getElementById('sheet'),cuerpo;
  pendAdj=[];
  if(kind==='trabajo')cuerpo='<div class="sh-top"><h2 class="ttl" style="margin:0">Nueva nota de trabajo</h2><span class="adjtop"><label class="btn adjb">Foto<input type="file" class="adjin" data-adjnew="1" accept="image/*" capture="environment"></label><label class="btn adjb">Archivo<input type="file" class="adjin" data-adjnew="1" accept="image/*,application/pdf,.txt,.doc,.docx"></label></span></div><label class="f" style="margin-top:.9rem"><span>Qué hay que hacer en el trabajo</span><input id="sh_t" type="text" placeholder="Por ejemplo: llamar a un cliente"></label><div class="chips" style="margin:.8rem 0 .2rem"><button type="button" class="chip" data-sh="q" data-q="0">Hoy</button><button type="button" class="chip" data-sh="q" data-q="1">Mañana</button><button type="button" class="chip" data-sh="q" data-q="x">Sin fecha</button></div><div class="fields" style="margin-top:.6rem"><label class="f"><span>Fecha (opcional)</span><input id="sh_f" type="date" value="'+esc(pre.f||'')+'"></label><label class="f"><span>Hora (opcional)</span><input id="sh_h" type="time"></label></div><div id="sh_adj" class="achips"></div>';
  else if(kind==='idea')cuerpo='<div class="sh-top"><h2 class="ttl" style="margin:0">Nueva idea</h2><span class="adjtop"><label class="btn adjb">Foto<input type="file" class="adjin" data-adjnew="1" accept="image/*" capture="environment"></label><label class="btn adjb">Archivo<input type="file" class="adjin" data-adjnew="1" accept="image/*,application/pdf,.txt,.doc,.docx"></label></span></div><label class="f" style="margin-top:.9rem"><span>Escribe tu idea</span><textarea id="sh_t" rows="3" placeholder="Una idea rápida"></textarea></label><div id="sh_adj" class="achips"></div>';
  else cuerpo='<div class="sh-top"><h2 class="ttl" style="margin:0">Nueva tarea</h2><span class="adjtop"><label class="btn adjb">Foto<input type="file" class="adjin" data-adjnew="1" accept="image/*" capture="environment"></label><label class="btn adjb">Archivo<input type="file" class="adjin" data-adjnew="1" accept="image/*,application/pdf,.txt,.doc,.docx"></label></span></div><label class="f" style="margin-top:.9rem"><span>Qué tienes que hacer</span><input id="sh_t" type="text" placeholder="Por ejemplo: cena de Navidad" value="'+esc(pre.t||'')+'"></label>'+
    '<div class="chips" style="margin:.8rem 0 .2rem"><button type="button" class="chip" data-sh="q" data-q="0">Hoy</button><button type="button" class="chip" data-sh="q" data-q="1">Mañana</button><button type="button" class="chip" data-sh="q" data-q="x">Sin fecha</button></div>'+
    '<div class="fields" style="margin-top:.6rem"><label class="f"><span>Fecha (opcional)</span><input id="sh_f" type="date" value="'+esc(pre.f||'')+'"></label><label class="f"><span>Hora (opcional)</span><input id="sh_h" type="time"></label></div>'+
    '<div class="row" style="margin-top:.7rem"><label class="chk"><input id="sh_imp" type="checkbox"> Importante</label></div><div id="sh_adj" class="achips"></div><div id="sh_c" class="sh-conf" aria-live="polite"></div>';
  s.innerHTML='<div class="sh-bg" data-sh="close"></div><div class="sh-card" role="dialog" aria-modal="true" aria-label="'+(kind==='idea'?'Nueva idea':kind==='trabajo'?'Nueva nota de trabajo':'Nueva tarea')+'">'+cuerpo+'<div class="row" style="margin-top:1rem"><button class="btn pri" data-sh="save">Guardar</button><button class="btn" data-sh="close">Cancelar</button></div></div>';
  s.hidden=false;
  var ft=document.getElementById('sh_t');if(ft)setTimeout(function(){ft.focus()},50);
  if(kind==='tarea'||kind==='trabajo')shConf();
}
function closeSheet(){var s=document.getElementById('sheet');s.hidden=true;s.innerHTML='';shKind=null;shFrom=null}
var ADJK='olivar-adj-v1',ADJMAX=5;
function adjAll(){try{return JSON.parse(localStorage.getItem(ADJK)||'{}')}catch(e){return {}}}
function adjPut(id,d){var o=adjAll();o[id]=d;try{localStorage.setItem(ADJK,JSON.stringify(o));return true}catch(e){return false}}
function adjDrop(ids){var o=adjAll();ids.forEach(function(i){delete o[i]});try{localStorage.setItem(ADJK,JSON.stringify(o))}catch(e){}}
function adjBlob(d){var p=d.split(','),m=/data:([^;]+)/.exec(p[0])[1],b=atob(p[1]),u=new Uint8Array(b.length),i;for(i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new Blob([u],{type:m})}
function adjFila(x,j,a,L){L=L||'agenda';var isImg=/^image\//.test(a.t),all=adjAll();return '<div class="adj"><span class="an">'+(isImg&&all[a.id]?'<img src="'+all[a.id]+'" alt="">':'')+'<i>'+esc(a.n)+'</i></span><button class="btn x" data-sh="adj-ver" data-l="'+L+'" data-i="'+x.i+'" data-j="'+j+'">Ver</button><button class="btn x" data-sh="adj-dl" data-l="'+L+'" data-i="'+x.i+'" data-j="'+j+'">Bajar</button><button class="btn x" data-sh="adj-del" data-l="'+L+'" data-i="'+x.i+'" data-j="'+j+'">Quitar</button></div>'}
function adjBloque(x,L){L=L||'agenda';
  var l=x.it.adj||[],h='';
  if(l.length===1)h=adjFila(x,0,l[0],L);
  else if(l.length>1)h='<details class="adjd"><summary>Ver archivos adjuntos ('+l.length+')</summary>'+l.map(function(a,j){return adjFila(x,j,a,L)}).join('')+'</details>';
  var add=l.length<ADJMAX?'<label class="btn adjb">+ Adjuntar<input type="file" class="adjin" data-adjin="'+x.i+'" data-l="'+L+'" accept="image/*,application/pdf,.txt,.doc,.docx"></label>':'<span class="note">Máximo '+ADJMAX+' archivos</span>';
  return '<div class="adjw">'+h+add+'</div>';
}
var edK=null;
function edHtml(x,L,sh){var att=sh?'data-sh':'data-act';return edK===L+':'+x.i?'<div class="edr"><input id="ed_t" type="text" value="'+esc(x.it.t)+'" aria-label="Texto"><button class="btn pri" '+att+'="ed-save" data-l="'+L+'" data-i="'+x.i+'">Guardar</button><button class="btn" '+att+'="ed-cancel">Cancelar</button></div>':''}
function accBloque(x,L){return '<div class="accb">'+adjBloque(x,L)+edHtml(x,L,true)+'<div class="wkx"><button class="btn" data-sh="ed-open" data-l="'+L+'" data-i="'+x.i+'">Modificar</button><button class="btn x" data-sh="ed-del" data-l="'+L+'" data-i="'+x.i+'">Quitar</button></div></div>'}
function dayWork(k){
  var l=wLista().filter(function(x){return shOnlyW!=null?x.i===shOnlyW:x.it.f===k});
  var rows=l.map(function(x){var it=x.it,op=shExp['w'+x.i];return '<div class="ag wk'+(it.ok?' done':'')+(shExp['w'+x.i]?' sel':'')+'"><input type="checkbox" data-sh="wdtg" data-i="'+x.i+'"'+(it.ok?' checked':'')+' aria-label="Hecha"><div class="agt tap" data-sh="wdexp" data-i="'+x.i+'"><span class="agx">'+esc(it.t)+'</span><small>'+esc(wMeta(it))+'</small></div><span class="chev'+(op?' o':'')+'" aria-hidden="true"></span></div>'+(op?accBloque(x,'trabajo'):'')}).join('');
  return '<h3 class="sh-h wkh">Trabajo</h3>'+(rows||'<div class="empty">Sin notas de trabajo este día.</div>');
}
function dayRows(k){
  var t=agLista().filter(function(x){return shOnly!=null?x.i===shOnly:x.it.f===k});
  return t.length?t.map(function(x){var it=x.it;return '<div class="ag'+(it.ok?' done':'')+(it.imp?' imp':'')+(x.i===shFocus?' foc':'')+'" data-ti="'+x.i+'"><input type="checkbox" data-sh="dtg" data-i="'+x.i+'"'+(it.ok?' checked':'')+' aria-label="Hecha"><div class="agt tap" data-sh="dexp" data-i="'+x.i+'"><span class="agx">'+esc(it.t)+'</span><small>'+esc(agHora(it))+(it.adj&&it.adj.length?' · '+it.adj.length+(it.adj.length===1?' adjunto':' adjuntos'):'')+cfHtml(x.i)+'</small></div><span class="chev'+(shExp[x.i]?' o':'')+'" aria-hidden="true"></span></div>'+(shExp[x.i]?accBloque(x,'agenda'):'')}).join(''):'<div class="empty">Ninguna tarea este día.</div>';
}
function dayLite(k){
  var T=agLista().filter(function(x){return x.it.f===k}),W=wLista().filter(function(x){return x.it.f===k}),I=S.ideas.filter(function(x){return x.f===k});
  function row(t,m,c){return '<div class="dl'+(c||'')+'"><span>'+esc(t)+'</span>'+(m?'<small>'+esc(m)+'</small>':'')+'</div>'}
  var h='<div class="dlite"><h3 class="dlh">'+esc(fechaLarga(k))+'</h3>';
  h+='<h4>Tareas</h4>'+(T.length?T.map(function(x){return row(x.it.t,agHora(x.it),x.it.ok?' done':'')}).join(''):'<div class="dl none">Sin tareas este día.</div>');
  h+='<h4>Trabajo</h4>'+(W.length?W.map(function(x){return row(x.it.t,wMeta(x.it),x.it.ok?' done':'')}).join(''):'<div class="dl none">Sin notas de trabajo.</div>');
  if(I.length)h+='<h4>Ideas</h4>'+I.map(function(x){return row(x.t,'')}).join('');
  return h+'<button type="button" class="btn dopen" data-act="hor-dia" data-d="'+k+'">Abrir día</button></div>';
}
var tbOn=false;
var dayFull=false,shFocus=null,shOnly=null,shOnlyW=null,shExp={};
function openWork(i){var it=S.trabajo[i];if(!it)return;
  if(it.f){openDay(it.f,false);shFocus=null;shExp={};shExp['w'+i]=true;renderDay();var e=document.querySelector('#sheet .ag.wk.sel');if(e)setTimeout(function(){e.scrollIntoView({block:'center'})},30)}
  else{shOnly=null;shOnlyW=i;shFocus=null;shExp={};shExp['w'+i]=true;shKind='dia';shDay='sin';hSel=null;renderDay()}}
function openTask(i){var it=S.agenda[i];if(!it)return;shOnlyW=null;
  if(it.f){openDay(it.f,false,i)}
  else{shOnly=i;shFocus=i;shExp={};shExp[i]=true;shKind='dia';shDay='sin';hSel=null;renderDay()}}
function renderDay(){
  var k=shDay,s=document.getElementById('sheet');if(!k)return;
  var v=S.hor[k],t=hTipo(v),id=shOnly!=null||shOnlyW!=null?[]:S.ideas.map(function(it,i){return {it:it,i:i}}).filter(function(x){return x.it.f===k});
  var ideas=id.length?'<h3 class="sh-h">Ideas de este día</h3>'+id.map(function(x){var op=shExp['i'+x.i];return '<div class="ag"><div class="agt tap" data-sh="iexp" data-i="'+x.i+'"><span class="agx">'+esc(x.it.t)+'</span></div><span class="chev'+(op?' o':'')+'" aria-hidden="true"></span></div>'+(op?accBloque(x,'ideas'):'')}).join(''):'';
  var esHoy=k===iso(TODAY),resumen=shOnly!=null||shOnlyW!=null?'':'<div class="tbw'+(tbOn?' on':'')+'"><div class="turnob" data-sh="dtog"><span>'+(esHoy?'Tu horario de trabajo de hoy':'Tu horario de trabajo este día')+'</span><b>'+(t==null||t==='X'?(esHoy?'Hoy no trabajas':'Este día no trabajas'):esc(hRotulo(v)))+'</b><button type="button" class="tmod" data-sh="dmod">Modificar</button></div></div>';
  if(dayFull){
    var w=t==='T'?hHoras(v):0,l=t==null?null:hLibre(v);
    resumen+=(t==null?'':'<div class="sk"><div><b>'+hN(w)+' h</b><span>trabajo</span></div><div><b>'+hN(l)+' h</b><span>libres</span></div><div class="est"><b>'+hN(l*H_EST)+' h</b><span>de estudio posible</span></div></div>');
  }
  s.innerHTML='<div class="sh-bg" data-sh="close"></div><div class="sh-card dday" role="dialog" aria-modal="true" aria-label="'+esc(fechaLarga(k))+'"><div class="sh-top">'+(shOnlyW!=null||shOnly!=null?'':'<button type="button" class="btn x tnv" data-sh="dprev" aria-label="Día anterior">‹</button>')+'<h2 class="ttl cap" style="margin:0">'+(shOnlyW!=null?'Nota de trabajo':shOnly!=null?'Tarea sin fecha':esc(fechaLarga(k)))+'</h2>'+(shOnlyW!=null||shOnly!=null?'':'<button type="button" class="btn x tnv" data-sh="dnext" aria-label="Día siguiente">›</button>')+'<button class="btn x" data-sh="close" aria-label="Cerrar">Cerrar</button></div>'+resumen+
   (shOnlyW!=null?'':'<h3 class="sh-h">Tareas</h3>'+dayRows(k))+(shOnly!=null?'':dayWork(k))+ideas+(shOnly!=null||shOnlyW!=null?'':'<div class="row" style="margin-top:1rem"><button class="btn pri" data-sh="dnew">+ Tarea</button><button class="btn" data-sh="didea">+ Idea</button><button class="btn wkb" data-sh="dwnew">+ Nota de trabajo</button></div>')+'</div>';
  s.hidden=false;var cc=s.querySelector('.sh-card');if(window._shT){if(cc)cc.scrollTop=window._shT;window._shT=0}
  else if(shFocus!=null){var fe=s.querySelector('.ag.foc');if(fe)setTimeout(function(){fe.scrollIntoView({block:'center'})},30)}
}
function openDay(k,full,foc){if(full!==undefined)dayFull=!!full;shOnly=null;shOnlyW=null;shFocus=foc==null?null:foc;shExp={};if(foc!=null)shExp[foc]=true;shKind='dia';shDay=k;hSel=k;render();renderDay()}
function closeDay(){tbOn=false;shDay=null;shFocus=null;shOnly=null;shOnlyW=null;hSel=null;closeSheet();render()}
function cerrarHoja(){var b=shBack;closeSheet();if(b)openDay(b)}
function saveSheet(){
  var tx=(document.getElementById('sh_t').value||'').trim();
  if(!tx){document.getElementById('sh_t').focus();return}
  if(shKind==='trabajo'){var fw=document.getElementById('sh_f').value,hw=document.getElementById('sh_h').value||'';if(hw&&!fw)fw=iso(TODAY);var nw0={t:tx,f:fw||'',h:hw,ok:false},bkw=shBack;if(pendAdj.length){nw0.adj=[];pendAdj.forEach(function(a){var id='a'+Date.now().toString(36)+Math.floor(Math.random()*1e4);if(adjPut(id,a.d))nw0.adj.push({id:id,n:a.n,t:a.t})})}pendAdj=[];S.trabajo.push(nw0);closeSheet();save();render();toast('Nota de trabajo guardada');if(bkw)openDay(bkw);return}
  if(shKind==='idea'){var bk0=shBack;var ni={t:tx,f:shF||iso(TODAY)};if(pendAdj.length){ni.adj=[];pendAdj.forEach(function(a){var id='a'+Date.now().toString(36)+Math.floor(Math.random()*1e4);if(adjPut(id,a.d))ni.adj.push({id:id,n:a.n,t:a.t})})}pendAdj=[];S.ideas.push(ni);closeSheet();save();render();toast('Idea guardada.');if(bk0)openDay(bk0);return}
  var f=document.getElementById('sh_f').value,h=document.getElementById('sh_h').value||'';
  if(h&&!f)f=iso(TODAY);
  var from=shFrom,bk=shBack;
  var nt={t:tx,f:f||'',h:h,tent:false,imp:document.getElementById('sh_imp').checked,ok:false};if(pendAdj.length){nt.adj=[];pendAdj.forEach(function(a){var id='a'+Date.now().toString(36)+Math.floor(Math.random()*1e4);if(adjPut(id,a.d))nt.adj.push({id:id,n:a.n,t:a.t})})}pendAdj=[];S.agenda.push(nt);
  var cf=hConf(f,h,S.agenda.length-1);
  if(from!=null&&S.ideas[from])S.ideas.splice(from,1);
  closeSheet();save();render();if(bk)openDay(bk);
  toast('Tarea guardada'+(f?' para el '+fechaCorta(f):' sin fecha')+(h?' a las '+h:'')+'.'+(cf.length?' ⚠ '+cf[0].t:''));
}

async function exportar(){
  var data=JSON.stringify(S,null,1),name='mi-espacio-'+iso(TODAY)+'.json',ok=false;
  try{
    var file=new File([data],name,{type:'application/json'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name});ok=true}
  }catch(e){if(e&&e.name==='AbortError')return}
  if(!ok){
    try{var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove();ok=true}catch(e){}
  }
  if(ok){S.copia=iso(TODAY);save();render()}
}


/* ---------- Horario y tiempo libre ---------- */
var H_DIA=16,H_BASE=3,H_LIBRE=16,H_SUE=8,H_EST=1/3,H_MIN=15;
var hMes=null,hSel=null,hMsg='',hArm=false;
var H_RE=/(\d{1,2})(?::(\d{2}))?\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?/g;
var H_NOM={L:'Libre',V:'Vacaciones',R:'Recupera',X:'No se trabaja'};
function hRangos(txt){var out=[],m;H_RE.lastIndex=0;while((m=H_RE.exec(txt))){out.push(m[1]+(m[2]?':'+m[2]:'')+'-'+m[3]+(m[4]?':'+m[4]:''))}return out}
function hHoras(v){var s=0,m;if(!v||/^[LVRX]$/.test(v))return 0;H_RE.lastIndex=0;while((m=H_RE.exec(v))){var a=+m[1]+(+m[2]||0)/60,b=+m[3]+(+m[4]||0)/60;if(b<=a)b+=24;s+=b-a}return s}
function hTipo(v){if(!v)return null;return /^[LVRX]$/.test(v)?v:'T'}
function hLibre(v){var t=hTipo(v);if(t==null)return null;return t==='T'?5:H_LIBRE}
function hN(x){return (Math.round(x*10)/10).toString().replace('.',',')}
function hDate(k){return new Date(k+'T00:00:00')}
function hParse(txt){
  var MES={ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sep:9,set:9,oct:10,nov:11,dic:12};
  var m=null,y=null,last=0,n=0,skip=0,out={};
  String(txt).split(/\r?\n/).forEach(function(line){
    line=line.trim();if(!line)return;
    var d=line.match(/^(lun|mar|mi[eé]|jue|vie|s[aá]b|dom)[a-záéíóú]*\.?\s+(\d{1,2})(?:\s+([a-záéíóú]{3,}))?\s*:\s*(.*)$/i);
    if(d){
      var day=+d[2];
      if(d[3]){var mk=MES[d[3].toLowerCase().slice(0,3)];if(mk){if(m!=null){if(mk-m>6)y--;else if(m-mk>6)y++}m=mk}}
      else if(m!=null&&day<last){m++;if(m>12){m=1;y++}}
      if(m==null)m=TODAY.getMonth()+1;
      if(y==null)y=TODAY.getFullYear();
      last=day;
      var v=d[4].trim(),val=null;
      if(/^[LVRX]$/i.test(v))val=v.toUpperCase();
      else{var r=hRangos(v);if(r.length)val=r.join('/')}
      var dt=new Date(y,m-1,day);
      if(val==null||dt.getMonth()!==m-1){skip++;return}
      out[iso(dt)]=val;n++;return;
    }
    var h=line.match(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/i);
    if(h){
      var nm=MES[h[1].toLowerCase().slice(0,3)],yy=line.match(/\b(20\d\d)\b/);
      if(yy)y=+yy[1];else if(y==null)y=TODAY.getFullYear();else if(m!=null&&nm<m)y++;
      m=nm;last=0;
    }
  });
  return {n:n,skip:skip,map:out};
}
function hSemanas(){
  var w={},k;
  for(k in S.hor){
    var t=hTipo(S.hor[k]);if(!t)continue;
    var d=hDate(k),mon=new Date(d);mon.setDate(d.getDate()-((d.getDay()+6)%7));
    var wk=iso(mon);if(!w[wk])w[wk]={k:wk,dias:0,turnos:0,trab:0,libre:0};
    var o=w[wk];o.dias++;if(t==='T'){o.turnos++;o.trab+=hHoras(S.hor[k])}o.libre+=hLibre(S.hor[k]);
  }
  return Object.keys(w).sort().map(function(x){return w[x]});
}
function hRotulo(v){
  var t=hTipo(v);if(t==null)return '';
  if(t!=='T')return H_NOM[t];
  return hRangos(v).join(' y ').replace(/-/g,'–')+' h';
}
function hCelda(k){
  var v=S.hor[k],t=hTipo(v),d=hDate(k);
  var nt0=S.agenda.filter(function(x){return !x.ok&&x.f===k}),ni=nt0.filter(function(x){return x.imp}).length,nc=nt0.filter(function(x){return /\bcita\b/i.test(x.t)}).length,nt=nt0.filter(function(x){return !x.imp&&!/\bcita\b/i.test(x.t)}).length,nw=S.trabajo.filter(function(x){return !x.ok&&x.f===k}).length;
  var vj=vjDia(k);
  var cls='hc'+(ni?' hi':'')+(t&&!vj?' '+t:'')+(vj?' vj':'')+(k===iso(TODAY)?' hoy':'')+(k===hSel?' sel':'')+(nt0.length?' ev':'')+(nw?' hw':'')+(nw>3?' hw2':'');
  var txt=vj?'Viaje':(t==null||t==='X'||t==='L'||t==='R'?'':(t==='T'?hRangos(v).join('<br>'):t));
  return '<button class="'+cls+'" data-act="hor-dia" data-d="'+k+'" aria-label="'+esc(d.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})+': '+(hRotulo(v)||'sin dato')+(nt?' · '+nt+(nt===1?' tarea':' tareas'):'')+(nw?' · '+nw+(nw===1?' nota de trabajo':' notas de trabajo'):''))+'"><b>'+d.getDate()+'</b><span>'+txt+'</span>'+(nc?'<em class="ccruz" title="Cita"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill="#D64545" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg></em>':'')+(ni?'<em class="cstar" title="'+(ni>1?ni+' importantes':'Importante')+'"><svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M12 2.8l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.6 6.4 19.8l1.3-6.2L3 9.3l6.3-.7z" fill="#D6AD55" stroke="#fff" stroke-width="1" stroke-linejoin="round"/></svg></em>':'')+(nt?(nt>6?'<em class="dots al" title="Más de 6 tareas: revisar"><b>!</b></em>':'<em class="dots">'+new Array(nt+1).join('<u></u>')+'</em>'):'')+(nw?(nw>6?'<em class="wd al" title="Más de 6 notas de trabajo: revisar"><b>!</b></em>':'<em class="wd">'+new Array(nw+1).join('<u></u>')+'</em>'):'')+'</button>';
}
var hSemK=null;
function lunesDe(k){var d=hDate(k),w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return iso(d)}
function diaMas(k,n){var d=hDate(k);d.setDate(d.getDate()+n);return iso(d)}
function semRef(){hSemK=lunesDe(hMes===iso(TODAY).slice(0,7)?iso(TODAY):hMes+'-01')}
function ymAdd(ym,d){var p=ym.split('-'),dt=new Date(+p[0],+p[1]-1+d,1);return iso(dt).slice(0,7)}
function vHorarioP(){
  var msg=hMsg;hMsg='';
  var meses=[],seen={},k;
  Object.keys(S.hor).sort().forEach(function(x){var ym=x.slice(0,7);if(!seen[ym]){seen[ym]=1;meses.push(ym)}});
  var sinH=null;
  if(!meses.length){sinH='<div class="card"><h2 class="ttl">Tu horario</h2><p class="note" style="margin-top:0">Todavía no hay horario. Pega el texto de tu horario y la app calcula tu tiempo libre cada semana. Escribe una línea por día, por ejemplo:</p><pre class="note" style="white-space:pre-wrap;margin:.5rem 0">Noviembre 2026\nLun 2: X\nMar 3: 10-18\nMié 4: 14-22\nJue 5: L\nVie 6: V</pre><p class="note" style="margin-top:0">L = libre · V = vacaciones · R = recupera · X = no se trabaja. Las horas del turno van como 14-22 o 10-14 / 17-21.</p></div>';meses=[iso(TODAY).slice(0,7)]}
  if(!hMes){var cur=iso(TODAY).slice(0,7);hMes=meses.indexOf(cur)>=0?cur:meses[0]}
  var hoyK=iso(TODAY),hv=S.hor[hoyK],tp=hTipo(hv),hoy;
  if(tp==null)hoy='<p class="note" style="margin:0">No tienes dato para hoy en el horario.</p>';
  else hoy='<div class="kpis" style="margin:0"><div class="kpi"><div class="l">Hoy</div><div class="v">'+esc(hRotulo(hv))+'</div><div class="s">'+(tp==='T'?hN(hHoras(hv))+' h de trabajo':'Sin trabajo')+'</div></div><div class="kpi"><div class="l">Tiempo libre</div><div class="v">≈ '+hN(hLibre(hv))+' h</div><div class="s">Estudio posible ≈ '+hN(hLibre(hv)*H_EST)+' h</div></div></div>';
  var sem=hSemanas().map(function(w){
    var a=hDate(w.k),b=new Date(a);b.setDate(a.getDate()+6);
    var rango=a.getDate()+(a.getMonth()!==b.getMonth()?' '+a.toLocaleDateString('es-ES',{month:'short'}).replace('.',''):'')+'–'+b.getDate()+' '+b.toLocaleDateString('es-ES',{month:'short'}).replace('.','');
    var est=w.libre*H_EST,pct=Math.min(100,Math.round(100*est/(H_MIN*1.6)));
    var actual=iso(TODAY)>=w.k&&iso(TODAY)<=iso(b);
    return '<div class="item"><div class="row"><b>'+rango+(actual?' · esta semana':'')+'</b><span class="pill '+(w.dias<7?'':(est>=H_MIN?'ok':'warn'))+'" style="margin-left:auto">'+(w.dias<7?'parcial · ':'')+'≈ '+hN(est)+' h estudio</span></div><div class="bar" aria-hidden="true" style="margin:.5rem 0"><i style="width:'+pct+'%"></i></div><div style="font-size:.85rem;color:var(--muted)">'+w.turnos+' turnos · '+hN(w.trab)+' h de trabajo · ≈ '+hN(w.libre)+' h libres'+(w.dias<7?' · '+w.dias+' de 7 días con dato':'')+'</div></div>';
  }).join('');
  var opts=meses.slice();if(opts.indexOf(hMes)<0)opts.push(hMes);opts.sort();
  var mlab=function(ym){var s=hDate(ym+'-01').toLocaleDateString('es-ES',{month:'long',year:'numeric'});return s.charAt(0).toUpperCase()+s.slice(1)};
  var chips='<div class="mnav"><button class="btn mar" data-act="hor-mes" data-ym="'+ymAdd(hMes,-1)+'" aria-label="Mes anterior">‹</button><select id="hmes" aria-label="Elegir mes">'+opts.map(function(ym){return '<option value="'+ym+'"'+(ym===hMes?' selected':'')+'>'+esc(mlab(ym))+'</option>'}).join('')+'</select><button class="btn mar" data-act="hor-mes" data-ym="'+ymAdd(hMes,1)+'" aria-label="Mes siguiente">›</button></div>';
  var f=hDate(hMes+'-01'),nd=new Date(f.getFullYear(),f.getMonth()+1,0).getDate(),off=(f.getDay()+6)%7,cells='',i;
  for(i=0;i<off;i++)cells+='<div class="hc vacio"></div>';
  for(i=1;i<=nd;i++)cells+=hCelda(hMes+'-'+p2(i));
  var cal=tlOpen?'<div class="tlcw">'+tlCal()+'</div>':chips+'<div class="cal">'+['L','M','X','J','V','S','D'].map(function(x){return '<div class="dh">'+x+'</div>'}).join('')+cells+'</div><p class="note" style="margin-bottom:0">Toca un día para ver sus tareas e ideas y cambiar su turno. Los puntos rojos marcan los días con tareas.</p>';
  var ed='';
  if(hSel){
    var cv=S.hor[hSel],ct=hTipo(cv)||'',dd=hDate(hSel);
    ed='<div class="card"><h2 class="ttl">'+esc(dd.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'}))+'</h2><div class="fields"><label class="f"><span>Tipo de día</span><select id="hsel">'+[['T','Turno'],['L','Libre'],['V','Vacaciones'],['R','Recupera'],['X','No se trabaja'],['','Sin dato']].map(function(o){return '<option value="'+o[0]+'"'+(o[0]===ct?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select></label><label class="f"><span>Horas del turno</span><input id="hhor" type="text" placeholder="14-22 o 10-14 / 17-21" value="'+esc(ct==='T'?hRangos(cv).join(' / '):'')+'"></label></div><div class="row" style="margin-top:.8rem"><button class="btn pri" data-act="hor-save">Guardar día</button><button class="btn" data-act="hor-cerrar">Cerrar</button></div>'+diaTareas(hSel)+'</div>';
  }
  var leyenda='<div class="leyenda"><span><i class="lt"></i>Turno</span><span><i class="lv"></i>Vacaciones</span><span><i class="lj"></i>Viaje</span><span><svg class="lst" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 2.8l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.6 6.4 19.8l1.3-6.2L3 9.3l6.3-.7z" fill="#D6AD55" stroke="#fff" stroke-width="1" stroke-linejoin="round"/></svg>Importante</span><span><i class="lr"></i>Tarea</span><span><i class="lw"></i>Trabajo</span><span><svg class="lst" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill="#D64545" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>Cita</span></div>';
  var resto=sinH||'';
  ed='';return {msg:msg,cal:'<details class="card fold'+(tlOpen?' tlo':'')+'" id="a-cal" data-fold="cal"'+(foldOpen.cal?' open':'')+'><summary><span class="ttl" style="margin:0">Calendario</span>'+(tlOpen?'<button type="button" class="calbtn" data-act="tl-close" aria-label="Volver al calendario" title="Calendario"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg></button>':'')+tlBtn('tlcal')+'</summary><div style="margin-top:1rem">'+cal+(tlOpen?'':leyenda)+'</div></details>',ed:ed,resto:resto,imp:hImportar('')};
}
var hFormD=null,hFormMsg='',hImpOpen=false;
function normHoras(t){
  t=String(t).replace(/\s+a\s+/gi,'-');
  var m=t.match(/^\s*(\d{1,2})[:.](\d{2})\s*$/);
  if(m&&+m[1]<24&&+m[2]<=24&&+m[2]>+m[1])return m[1]+'-'+m[2];
  return t;
}
function hImportar(msg){
  var k0=hFormD||hSel||iso(TODAY),v0=S.hor[k0],t0=hTipo(v0)||'';
  var tipos=[['T','Turno (con horas)'],['L','Libre'],['V','Vacaciones'],['R','Recupera'],['X','No se trabaja'],['','Sin dato']];
  return '<details class="card imp" id="a-imp" data-imp'+(hImpOpen?' open':'')+'><summary><span class="ttl" style="margin:0">'+ICO.hor+'Importar o cambiar horario</span></summary>'+
   '<h3 class="sh-h" style="margin-top:1rem;display:flex;align-items:center;justify-content:space-between">Cambiar un día<a class="tpill hcalp" href="#tareas/cal" style="text-transform:none;letter-spacing:0">Ver calendario</a></h3><div class="fields"><label class="f"><span>Día</span><input id="hd_f" type="date" value="'+k0+'"></label><label class="f"><span>Tipo de día</span><select id="hd_t">'+tipos.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===t0?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select></label></div>'+
   '<label class="f" style="margin-top:.7rem"><span>Horas del turno</span><input id="hd_h" type="text" placeholder="14-22 o 10-14 / 17-21" value="'+esc(t0==='T'?hRangos(v0).join(' / '):'')+'"></label><div class="row" style="margin-top:.7rem"><button class="btn pri" data-act="hor-dia-save">Guardar día</button></div>'+(hFormMsg?'<p class="note ok-msg">✓ '+esc(hFormMsg)+'</p>':'')+
   '<h3 class="sh-h">Pegar un horario entero</h3><label class="f"><span>Pega aquí tu horario</span><textarea id="himp" rows="6" placeholder="Diciembre 2026&#10;Mar 1: 13-21&#10;Mié 2: V"></textarea></label><div class="row" style="margin-top:.8rem"><button class="btn pri" data-act="hor-imp">Importar</button><button class="btn" data-act="hor-clear">'+(hArm?'Pulsa otra vez para borrar todo':'Borrar todo el horario')+'</button></div>'+(msg?'<p class="note">'+esc(msg)+'</p>':'')+'<p class="note" style="margin-bottom:0">Importar suma los días nuevos y reemplaza los que ya existan. El resto no se toca.</p></details>';
}

/* ---------- Render ---------- */
var ALIAS={horario:'tareas',notas:'tareas',marca:'metas'};
function view(){var h=(location.hash||'').slice(1).split('/')[0];h=ALIAS[h]||h;return VIEWS.indexOf(h)>=0?h:'resumen'}
function render(){
  var v=view();
  document.getElementById('tabs').innerHTML=VIEWS.filter(function(k){return k!=='trabajo'}).map(function(k){return '<a href="#'+k+'" class="'+(k===v?'on':'')+'"'+(k===v?' aria-current="page"':'')+'>'+LABEL[k]+'</a>'}).join('');
  var f={resumen:vResumen,tareas:vTareas,viajes:vViajes,dinero:vDinero,metas:vMetas,trabajo:vTrabajo}[v];
  var mn=document.getElementById('main');mn.innerHTML=f();
  window._lv=v;
}

/* ---------- Eventos ---------- */
function getList(path){var p=path.split('.'),o=S;p.forEach(function(k){o=o[k]});return o}
function setPath(path,val){var p=path.split('.'),o=S,i;for(i=0;i<p.length-1;i++)o=o[p[i]];o[p[p.length-1]]=val}
var main=document.getElementById('main');
main.addEventListener('click',function(e){
  var sm=e.target.closest&&e.target.closest('summary');if(!sm)return;
  var d=sm.parentNode;if(!d||d.tagName!=='DETAILS'||!(d.matches('details.fold,details.sb,details.imp,details.adjd')))return;
  var inner=e.target.closest('a,button,input,select,label');if(inner&&sm.contains(inner))return;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches||!d.animate)return;
  e.preventDefault();
  if(d._an){d._an.cancel();d._an=null}
  var cs=getComputedStyle(d),st=d.offsetHeight;d.style.overflow='hidden';
  if(!d.open){d.open=true;var en=d.offsetHeight;d._an=d.animate({height:[st+'px',en+'px']},{duration:300,easing:'cubic-bezier(.2,.8,.25,1)'});
    d._an.onfinish=d._an.oncancel=function(){d.style.overflow='';d._an=null}}
  else{var en2=sm.offsetHeight+parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom)+parseFloat(cs.borderTopWidth)+parseFloat(cs.borderBottomWidth);
    d._an=d.animate({height:[st+'px',en2+'px']},{duration:240,easing:'ease-in-out'});
    d._an.onfinish=function(){d.open=false;d.style.overflow='';d._an=null};d._an.oncancel=function(){d.style.overflow='';d._an=null}}
},true);

main.addEventListener('scroll',function(e){var c=e.target;if(!c.classList||!c.classList.contains('car'))return;var cs=c.querySelectorAll('.cc'),mid=c.scrollLeft+c.clientWidth/2,best=0,bd=1e9;cs.forEach(function(x,i){var d=Math.abs(x.offsetLeft-c.offsetLeft+x.offsetWidth/2-mid);if(d<bd){bd=d;best=i}});var ds=c.parentNode.querySelectorAll('.cdots i');ds.forEach(function(d,i){d.classList.toggle('on',i===best)})},true);
var liveT=null;
main.addEventListener('input',function(e){
  var t=e.target;
  if(t.type==='range'){var b=t.parentNode.querySelector('b');if(b)b.textContent=t.value;return}
  if(!t.dataset||!t.dataset.bind||(t.type!=='number'&&t.type!=='text'))return;
  setPath(t.dataset.bind,t.type==='number'?num(t.value):t.value);
  save();
  clearTimeout(liveT);
  var bind=t.dataset.bind,pos=null;
  try{pos=t.selectionStart}catch(err){}
  liveT=setTimeout(function(){
    render();
    var el=main.querySelector('[data-bind="'+bind+'"]');
    if(el){el.focus();if(pos!=null){try{el.setSelectionRange(pos,pos)}catch(err){}}}
  },600);
});
main.addEventListener('change',function(e){
  var t=e.target;if(!t.dataset||!t.dataset.bind)return;
  clearTimeout(liveT);
  setPath(t.dataset.bind,(t.type==='number'||t.type==='range')?num(t.value):t.value);
  save();render();
});
main.addEventListener('keydown',function(e){
  if(e.key==='Enter'&&e.target.dataset&&e.target.dataset.enter){e.preventDefault();var b=document.getElementById(e.target.dataset.enter);if(b)b.click()}
});
main.addEventListener('toggle',function(e){var d=e.target;if(!d||!d.dataset)return;if(d.dataset.imp!==undefined)hImpOpen=d.open;if(d.dataset.fold)foldOpen[d.dataset.fold]=d.open},true);
var armed=false,delArm=null,delT=null;
main.addEventListener('click',function(e){
  var ta=e.target.closest('[data-sh^="adj-"]');if(ta){adjAct(ta,ta.dataset.sh,render);return}
  var t=e.target.closest('[data-act]');if(!t)return;
  var a=t.dataset.act,i=+t.dataset.i;
  if(a==='del'){
    var key=a+':'+(t.dataset.list||'')+':'+i;
    if(delArm!==key){delArm=key;t.textContent='¿Seguro?';t.classList.add('conf');clearTimeout(delT);delT=setTimeout(function(){if(delArm===key){delArm=null;render()}},3500);return}
    delArm=null;clearTimeout(delT);
  }
  if(a!=='clear-eng')armed=false;if(a!=='hor-clear')hArm=false;
  if(a==='tg'){var L=getList(t.dataset.list);L[i].ok=t.checked;if(t.dataset.list==='metas')oRecent[i]=t.checked;if(t.dataset.list==='agenda')aRecent[i]=t.checked}
  else if(a==='del'){var Ld=getList(t.dataset.list);if(Ld[i]&&Ld[i].adj)adjDrop(Ld[i].adj.map(function(x){return x.id}));Ld.splice(i,1);oRecent={};aRecent={}}
  else if(a==='add'){var el=document.getElementById(t.dataset.src),v=el.value.trim();if(!v)return;getList(t.dataset.list).push({t:v,ok:false})}
  else if(a==='add-meta'){var el2=document.getElementById(t.dataset.src),v2=el2.value.trim();if(!v2)return;S.metas.push({t:v2,h:t.dataset.h,ok:false})}
  else if(a==='add-gasto'){fmEns(finMes||ymHoy()).g.push({n:'',m:0,t:'fijo'});foldOpen.fs=true;foldOpen.fx=true}
  else if(a==='add-ing'){fmEns(finMes||ymHoy()).i.push({n:'',m:0});foldOpen.fs=true;foldOpen.fi=true}
  else if(a==='fin-mes'){finMes=t.dataset.ym}
  else if(a==='trae-mes'){var ym0=finMes||ymHoy(),pv=fmGet(ymAdd(ym0,-1)),cu=fmEns(ym0);pv.i.forEach(function(x){cu.i.push({n:x.n,m:x.m})});pv.g.forEach(function(x){if(x.t!=='pun')cu.g.push({n:x.n,m:x.m,t:x.t})});toast('Traído del mes anterior');foldOpen.fi=true;foldOpen.fx=true}
  else if(a==='add-deuda'){S.deudas.push({n:'Nueva deuda',saldo:0,tae:0,cuota:0})}
  else if(a==='add-viaje'){S.viajes.push({d:'Nuevo viaje',f:'',f2:'',c:0,a:0});vjShown=Math.max(vjShown,S.viajes.length)}
  else if(a==='mins'){var k=iso(TODAY);S.eng.log[k]=num(S.eng.log[k])+num(t.dataset.m)}
  else if(a==='minsc'){var m=num(document.getElementById('mm').value);if(m<=0)return;var k2=iso(TODAY);S.eng.log[k2]=num(S.eng.log[k2])+m}
    else if(a==='marca-graf'){var sg=document.getElementById('sheet');shKind='graf';sg.innerHTML='<div class="sh-bg" data-sh="close"></div><div class="sh-card big" role="dialog" aria-modal="true" aria-label="Gráfico de marca personal"><div class="sh-top"><button class="gback" data-sh="close">‹ Mi marca personal</button><button class="btn" data-sh="close">Cerrar</button></div>'+radarSVG(marcaPil()).replace('viewBox="0 0 340 300"','viewBox="25 25 290 250"')+'<p class="note">Cada punta sube cuando marcas como hechas las tareas de esa área.</p></div>';sg.hidden=false;return}
  else if(a==='ed-open'){edK=t.dataset.l+':'+t.dataset.i}
  else if(a==='ed-cancel'){edK=null}
  else if(a==='ed-save'){var edv=(document.getElementById('ed_t').value||'').trim();if(edv)S[t.dataset.l][+t.dataset.i].t=edv;edK=null}
  else if(a==='vj-mas'){vjShown+=3}
  else if(a==='vj-menos'){vjShown=3}
  else if(a==='t-fil'){tFil=tFil===t.dataset.k?null:t.dataset.k;tFilAnim=!!tFil;render();return}
  else if(a==='car'){var kk=t.dataset.k,cr=document.querySelector('.car'),sl=cr?cr.scrollLeft:0;carSel=carSel===kk?null:kk;carAnim=!!carSel;render();var cr2=document.querySelector('.car');if(cr2)cr2.scrollLeft=sl;return}
  else if(a==='zero'){delete S.eng.log[t.dataset.key]}
  else if(a==='clear-eng'){
    if(!armed){armed=true;t.textContent='Pulsa otra vez para borrar todo';return}
    armed=false;S.eng.log={};
  }
  else if(a==='ag-imp'){S.agenda[i].imp=!S.agenda[i].imp}
  else if(a==='ag-nuevo'){openSheet('tarea',{f:t.dataset.d});return}
  else if(a==='sh-tarea'){e.preventDefault();openSheet('tarea');return}
  else if(a==='sh-trabajo'){openSheet('trabajo');return}
  else if(a==='wexp'){wkExp[i]=!wkExp[i]}
  else if(a==='sh-idea'){openSheet('idea');return}
  else if(a==='obj-plazo'){oPlazo=t.dataset.k;oRecent={}}
  else if(a==='tl-toggle'){e.preventDefault();tlOpen=!tlOpen;tlWs=null;if(tlOpen){hSemK=lunesDe(iso(TODAY));selDia=iso(TODAY);setTimeout(function(){var q=document.getElementById('a-cal');if(q)q.scrollIntoView({block:'start',behavior:'smooth'})},80)}}
  else if(a==='tl-close'){e.preventDefault();tlOpen=false}
  else if(a==='tl-go'){tlOpen=true;hSemK=lunesDe(iso(TODAY));selDia=iso(TODAY);foldOpen.cal=true;if(location.hash==='#tareas/cal'){render()}else location.hash='#tareas/cal';return}
  else if(a==='marca-add'){var mt=document.getElementById('nt').value.trim();if(!mt){document.getElementById('nt').focus();return}S.marca.tareas.push({t:mt,a:document.getElementById('nta').value,ok:false})}
  else if(a==='aten-mas'){aAll=!aAll}
  else if(a==='res-marca'){marcaOpen=!marcaOpen}
  else if(a==='res-pend'){pOpen=pOpen===t.dataset.k?'':t.dataset.k}
  else if(a==='res-tile'){dOpen=dOpen===t.dataset.k?'':t.dataset.k}
  else if(a==='obj-add'){var ot=document.getElementById('o_t').value.trim();if(!ot){document.getElementById('o_t').focus();return}S.metas.push({t:ot,h:document.getElementById('o_h').value,ok:false});oPlazo=document.getElementById('o_h').value;oEstado='pend'}
  else if(a==='hor-dia'){openDay(t.dataset.d,false);return}
  else if(a==='open-t'){openTask(i);return}
  else if(a==='open-w'){openWork(i);return}
  else if(a==='hoy-dia'){openDay(t.dataset.d||iso(TODAY),true);return}
  else if(a==='sem-dia'){selDia=t.dataset.d}
  else if(a==='dia-mov'){var ks=Object.keys(S.hor).sort(),n=diaMas(selDia||iso(TODAY),+t.dataset.d);if(ks.length&&n>=ks[0]&&n<=ks[ks.length-1]){selDia=n;hSemK=lunesDe(n)}}
  else if(a==='hor-mes'){hMes=t.dataset.ym;hSel=null;semRef()}
  else if(a==='sem-mov'){hSemK=diaMas(hSemK,+t.dataset.d);selDia=diaMas(selDia||iso(TODAY),+t.dataset.d);if(tlOpen&&document.getElementById('a-cal'))hMes=selDia.slice(0,7)}
  else if(a==='sem-hoy'){e.preventDefault();hSemK=lunesDe(iso(TODAY));selDia=iso(TODAY);tlWs=null}
  else if(a==='tl-sel'){selDia=t.dataset.d;hSemK=lunesDe(selDia)}
  else if(a==='hor-cerrar'){hSel=null}
  else if(a==='hor-save'){
    var ty=document.getElementById('hsel').value,hh=document.getElementById('hhor').value;
    if(ty==='T'){var rr=hRangos(hh);if(!rr.length){hMsg='Escribe las horas del turno, por ejemplo 14-22.';render();return}S.hor[hSel]=rr.join('/')}
    else if(ty==='')delete S.hor[hSel];
    else S.hor[hSel]=ty;
    hSel=null;
  }
  else if(a==='hor-dia-save'){
    var kd2=document.getElementById('hd_f').value,ty2=document.getElementById('hd_t').value,hh2=normHoras(document.getElementById('hd_h').value);
    if(!kd2){toast('Elige el día.');return}
    if(ty2==='T'){var r2=hRangos(hh2);if(!r2.length){toast('Escribe las horas del turno así: 14-22.');return}S.hor[kd2]=r2.join('/')}
    else if(ty2==='')delete S.hor[kd2];
    else S.hor[kd2]=ty2;
    var nm2={T:'Turno '+(S.hor[kd2]||''),L:'Libre',V:'Vacaciones',R:'Recupera',X:'No se trabaja','':'Sin dato'}[ty2];
    hFormMsg=fechaCorta(kd2)+': '+nm2+'. Ya puedes poner el día siguiente.';
    hFormD=diaMas(kd2,1);hMes=kd2.slice(0,7);semRef();toast('Día guardado.');
  }
  else if(a==='hor-imp'){
    var rs=hParse(document.getElementById('himp').value);
    if(!rs.n){hMsg='No encontré ningún día. Usa líneas como "Lun 2: X" o "Mar 3: 10-18".';render();return}
    Object.keys(rs.map).forEach(function(kk2){S.hor[kk2]=rs.map[kk2]});
    hMes=Object.keys(rs.map).sort()[0].slice(0,7);
    toast('Importados '+rs.n+' días.');hMsg='Importados '+rs.n+' días'+(rs.skip?'. '+rs.skip+(rs.skip===1?' línea no se pudo leer (por ejemplo, un día en blanco).':' líneas no se pudieron leer.'):'.');
  }
  else if(a==='hor-clear'){
    if(!hArm){hArm=true;render();return}
    hArm=false;S.hor={};hSel=null;
  }
  else if(a==='export'){exportar();return}
  else if(a==='clear-ej'){
    S.ejemplo=false;S.fin={ingresos:0,extra:0,gastos:0,ahorro:0,meses:S.fin.meses||6};S.fm={};S.deudas=[];S.viajes=[];S.eng.log={};S.ideas=S.ideas.filter(function(x){return !x.ex});S.agenda=S.agenda.filter(function(x){return !x.ex});
    S.marca.pilares.forEach(function(p){p.v=0});
  }
  else return;
  save();render();
});
main.addEventListener('change',function(e){
  var t=e.target;if(t.id==='hd_f'){var v3=S.hor[t.value],t3=hTipo(v3)||'';document.getElementById('hd_t').value=t3;document.getElementById('hd_h').value=t3==='T'?hRangos(v3).join(' / '):'';return}
  if(t.id==='oest'){oEstado=t.value;oRecent={};render();return}
  if(t.id==='hmes'){hMes=t.value;hSel=null;semRef();render();return}
  if(!t.dataset||t.dataset.ideasel==null)return;
  var i=+t.dataset.ideasel,v=t.value,idea=S.ideas[i];if(!v||!idea)return;
  if(v==='tarea'){t.value='';openSheet('tarea',{t:idea.t,fromIdea:i});return}
  var d=DEST[v];S.metas.push({t:idea.t,h:d[0],ok:false});S.ideas.splice(i,1);save();render();toast('Idea pasada a Objetivos ('+d[1]+').');
});
function adjLeer(f,cb){
  var r=new FileReader();
  r.onload=function(){
    if(/^image\//.test(f.type)){
      var im=new Image();im.onload=function(){var m=1280,w=im.width,h=im.height,k=Math.min(1,m/Math.max(w,h)),c=document.createElement('canvas');c.width=Math.round(w*k);c.height=Math.round(h*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
        cb(c.toDataURL('image/jpeg',.72),'image/jpeg',(f.name||'foto').replace(/\.[^.]+$/,'')+'.jpg')};
      im.onerror=function(){toast('No se pudo leer la imagen')};im.src=r.result}
    else if(f.size>1500000){toast('El archivo es muy grande (máximo 1,5 MB)')}
    else cb(r.result,f.type||'application/octet-stream',f.name||'archivo');
  };
  r.readAsDataURL(f);
}
function adjAct(t,a,rer){
  var L=t.dataset.l||'agenda',it=S[L][+t.dataset.i],ad=it&&it.adj&&it.adj[+t.dataset.j];if(!ad)return;
  var shEl=document.getElementById('sheet'),cc0=shEl.querySelector('.sh-card');window._shT=cc0&&!shEl.hidden?cc0.scrollTop:0;
  if(a==='adj-del'){adjDrop([ad.id]);it.adj.splice(+t.dataset.j,1);save();rer();return}
  var d=adjAll()[ad.id];if(!d){toast('No se encuentra el archivo en este dispositivo');return}
  var u=URL.createObjectURL(adjBlob(d));
  if(a==='adj-ver'){window.open(u,'_blank')}
  else{var l=document.createElement('a');l.href=u;l.download=ad.n;document.body.appendChild(l);l.click();l.remove()}
  setTimeout(function(){URL.revokeObjectURL(u)},60000);
}
function adjIn(inp0,rer){
  var L=inp0.dataset.l||'agenda',it=S[L][+inp0.dataset.adjin],f=inp0.files&&inp0.files[0];if(!it||!f)return;
  it.adj=it.adj||[];if(it.adj.length>=ADJMAX){toast('Máximo '+ADJMAX+' archivos');return}
  var shEl=document.getElementById('sheet'),cc0=shEl.querySelector('.sh-card');window._shT=cc0&&!shEl.hidden?cc0.scrollTop:0;
  adjLeer(f,function(d,tipo,nom){
    var id='a'+Date.now().toString(36)+Math.floor(Math.random()*1e4);
    if(!adjPut(id,d)){toast('No cabe en este dispositivo. Quita algún adjunto.');return}
    it.adj.push({id:id,n:nom,t:tipo});save();rer();toast('Adjunto guardado')});
}
var pendAdj=[];
function adjPend(){var e=document.getElementById('sh_adj');if(!e)return;e.innerHTML=pendAdj.map(function(a,j){return '<span class="achip"><i>'+esc(a.n)+'</i><button type="button" data-sh="adj-pq" data-j="'+j+'" aria-label="Quitar">×</button></span>'}).join('')}
function adjNew(inp0){var f=inp0.files&&inp0.files[0];inp0.value='';if(!f)return;if(pendAdj.length>=ADJMAX){toast('Máximo '+ADJMAX+' archivos');return}adjLeer(f,function(d,tipo,nom){pendAdj.push({d:d,t:tipo,n:nom});adjPend()})}
(function(){var x0=null,y0=0;
  main.addEventListener('touchstart',function(e){var w=e.target.closest&&e.target.closest('.sw');if(!w){x0=null;return}x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
  main.addEventListener('touchend',function(e){if(x0==null)return;var dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;
    if(Math.abs(dx)<40||Math.abs(dx)<Math.abs(dy)*1.5)return;
    var ks=Object.keys(S.hor).sort();if(!ks.length)return;
    var n=diaMas(selDia||iso(TODAY),dx<0?1:-1);if(n<ks[0]||n>ks[ks.length-1])return;
    selDia=n;hSemK=lunesDe(n);render()},{passive:true});
})();
var sh=document.getElementById('sheet');
sh.addEventListener('click',function(e){
  var t=e.target.closest('[data-sh]');if(!t)return;
  var a=t.dataset.sh;
  if(a==='close'){if(shKind==='dia')closeDay();else cerrarHoja()}
  else if(a==='dtog'){var tw=t.closest('.tbw');tbOn=!tbOn;if(tw)tw.classList.toggle('on',tbOn)}
  else if(a==='dprev'||a==='dnext'){openDay(diaMas(shDay,a==='dnext'?1:-1))}
  else if(a==='dmod'){var kd=shDay;closeDay();hFormD=kd;hFormMsg='';hImpOpen=true;if(location.hash==='#tareas/imp')window.dispatchEvent(new Event('hashchange'));else location.hash='#tareas/imp'}
  else if(a==='save')saveSheet();
  else if(a==='dtg'){S.agenda[+t.dataset.i].ok=t.checked;save();render();renderDay();return}
  else if(a.indexOf('adj-')===0&&a!=='adj-pq'){adjAct(t,a,renderDay);return}
  else if(a==='adj-pq'){pendAdj.splice(+t.dataset.j,1);adjPend()}
  else if(a==='iexp'){var ci=sh.querySelector('.sh-card');window._shT=ci?ci.scrollTop:0;shExp['i'+t.dataset.i]=!shExp['i'+t.dataset.i];renderDay();return}
  else if(a==='ed-open'){edK=t.dataset.l+':'+t.dataset.i;var cE=sh.querySelector('.sh-card');window._shT=cE?cE.scrollTop:0;renderDay();var e1=document.getElementById('ed_t');if(e1)e1.focus();return}
  else if(a==='ed-cancel'){edK=null;renderDay();return}
  else if(a==='ed-save'){var v1=(document.getElementById('ed_t').value||'').trim();if(v1){S[t.dataset.l][+t.dataset.i].t=v1;save()}edK=null;render();renderDay();return}
  else if(a==='ed-del'){var Ld2=S[t.dataset.l],ix=+t.dataset.i;if(Ld2[ix]&&Ld2[ix].adj)adjDrop(Ld2[ix].adj.map(function(z){return z.id}));Ld2.splice(ix,1);shExp={};shFocus=null;edK=null;save();if(shOnly!=null||shOnlyW!=null){closeDay()}else{render();renderDay()}return}
  else if(a==='dexp'){var cx=sh.querySelector('.sh-card');window._shT=cx?cx.scrollTop:0;shExp[+t.dataset.i]=!shExp[+t.dataset.i];renderDay();return}
  else if(a==='wdel'){var Wd=S.trabajo[+t.dataset.i];if(Wd&&Wd.adj)adjDrop(Wd.adj.map(function(x){return x.id}));S.trabajo.splice(+t.dataset.i,1);shExp={};save();if(shOnlyW!=null){closeDay()}else{render();renderDay()}return}
  else if(a==='wdtg'){S.trabajo[+t.dataset.i].ok=t.checked;save();render();renderDay();return}
  else if(a==='wdexp'){var cw=sh.querySelector('.sh-card');window._shT=cw?cw.scrollTop:0;shExp['w'+t.dataset.i]=!shExp['w'+t.dataset.i];renderDay();return}
  else if(a==='dwnew'){var kw=shDay;openSheet('trabajo',{f:kw,back:kw})}
  else if(a==='dnew'){openSheet('tarea',{f:shDay,back:shDay})}
  else if(a==='didea'){var ki=shDay;openSheet('idea',{f:ki,back:ki})}
  else if(a==='q'){var f=document.getElementById('sh_f');f.value=t.dataset.q==='x'?'':sumaDias(+t.dataset.q);shConf()}
});
sh.addEventListener('input',function(e){if(e.target.id==='sh_f'||e.target.id==='sh_h')shConf()});
sh.addEventListener('change',function(e){
  var inp0=e.target;if(inp0.dataset&&inp0.dataset.adjin!==undefined){adjIn(inp0,renderDay);return}
  if(inp0.dataset&&inp0.dataset.adjnew!==undefined){adjNew(inp0);return}
  if(e.target.id==='sh_f'||e.target.id==='sh_h')shConf()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!sh.hidden){if(shKind==='dia')closeDay();else cerrarHoja()}});
sh.addEventListener('keydown',function(e){
  if(e.key==='Enter'&&e.target.id==='sh_t'&&e.target.tagName==='INPUT'){e.preventDefault();saveSheet()}
});
[['nb_idea','idea'],['nb_tarea','tarea'],['fab','tarea'],['fab_idea','idea']].forEach(function(p){var el=document.getElementById(p[0]);if(el)el.addEventListener('click',function(){openSheet(p[1])})});
main.addEventListener('change',function(e){
  if(e.target.dataset&&e.target.dataset.adjin!==undefined){adjIn(e.target,render);return}
  var t=e.target;if(t.id!=='imp'||!t.files||!t.files[0])return;
  var r=new FileReader();
  r.onload=function(){
    var msg='';
    try{var o=JSON.parse(r.result);if(!o||!o.fin||!o.marca)throw new Error('x');S=normalize(o);save();msg='Copia restaurada.'}
    catch(err){msg='Ese archivo no es una copia del panel.'}
    render();var m=document.getElementById('impmsg');if(m)m.textContent=msg;
  };
  r.readAsText(t.files[0]);
});
window.addEventListener('hashchange',function(){
  oRecent={};aRecent={};var an=(location.hash||'').slice(1).split('/')[1]||'';
  if(an==='deudas')foldOpen.fd=true;if(an==='mt'){foldOpen.mt=true;carSel='mt'}if(an==='id'){foldOpen.id=true;carSel='id'}if(an==='cal')foldOpen.cal=true;if(an==='imp'){hImpOpen=true;carSel='imp'}window._calHome=(an==='cal');if(an==='marca')foldOpen.mc=true;
  render();
  var el=an&&document.getElementById('a-'+an);
  if(el){setTimeout(function(){el.scrollIntoView({block:'start'});window._calY=null;setTimeout(function(){window._calY=window.pageYOffset},1000);setTimeout(function(){window._calHome=false;var q=document.querySelectorAll('.calhome.on');for(var z=0;z<q.length;z++)q[z].classList.remove('on')},20000);el.classList.add('flash');setTimeout(function(){el.classList.remove('flash')},1600)},40)}
  else window.scrollTo(0,0)});

/* ---------- Inicio ---------- */
document.getElementById('hoy').textContent=TODAY.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
render();
setEstado('Guardado en este iPhone');
document.getElementById('foot').textContent='Mi espacio · Cálculos orientativos';
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}
})();
(function(){var f=document.querySelector('.fabs');if(!f)return;function u(){var y=window.pageYOffset||document.documentElement.scrollTop||0;f.classList.toggle('on',y>40)}window.addEventListener('scroll',u,{passive:true});u()})();
(function(){var b=document.createElement('button');b.type='button';b.className='totop';b.setAttribute('aria-label','Subir arriba');b.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';document.body.appendChild(b);
var tm=null,bloq=false,y0=0,t0=0;
function u(){var d=document.documentElement,y=window.pageYOffset||d.scrollTop||0,zona=y>200&&y+window.innerHeight>=d.scrollHeight-170;
 if(!zona){bloq=false;clearTimeout(tm);tm=null;b.classList.remove('on');return}
 if(bloq)return;
 if(!b.classList.contains('on')){b.classList.add('on');clearTimeout(tm);tm=setTimeout(function(){b.classList.remove('on');bloq=true;tm=null},60000)}}
window.addEventListener('scroll',u,{passive:true});window.addEventListener('resize',u);window.addEventListener('hashchange',function(){setTimeout(u,300)});
b.addEventListener('click',function(){var r=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;window.scrollTo({top:0,behavior:r?'auto':'smooth'})});u()})();
window.addEventListener('scroll',function(){if(!window._calHome||window._calY==null)return;if(Math.abs((window.pageYOffset||0)-window._calY)>40){window._calHome=false;var l=document.querySelectorAll('.calhome.on');for(var i=0;i<l.length;i++)l[i].classList.remove('on')}},{passive:true});
