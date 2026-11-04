/* Библиотека проверенных игр Bart.
   Каждая игра — один HTML-файл: общий движок (ввод клавиатурой/мышью/касанием/свайпами, состояния «старт → игра → пауза → конец»,
   рекорд, звук, частицы) + код игры. Все игры протестированы автоматически (запуск, ввод, конец игры, перезапуск).
   Bart берёт такую игру за основу и меняет по запросу, а если правка получилась с ошибкой — возвращает рабочую версию. */

const ENGINE = String.raw`
const cv=document.getElementById('c'),ctx=cv.getContext('2d');let W=0,H=0,DPR=1;
function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=window.innerWidth;H=window.innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);if(typeof onResize==='function')onResize()}
window.addEventListener('resize',resize);
const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---- ввод: клавиатура, мышь, касания, свайпы ---- */
const keys={},press={},ptr={x:0,y:0,sx:0,sy:0,t0:0,down:false,tap:false,up:false,dur:0,dist:0,swipe:'',swiped:false,active:false};
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!keys[e.code])press[e.code]=true;keys[e.code]=true;audio()});
window.addEventListener('keyup',e=>{keys[e.code]=false});
window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
function ptrPos(e){const r=cv.getBoundingClientRect();ptr.x=e.clientX-r.left;ptr.y=e.clientY-r.top}
cv.addEventListener('pointerdown',e=>{ptrPos(e);ptr.down=true;ptr.tap=true;ptr.active=true;ptr.sx=ptr.x;ptr.sy=ptr.y;ptr.t0=performance.now();ptr.swiped=false;audio();try{cv.focus();cv.setPointerCapture(e.pointerId)}catch(err){}});
cv.addEventListener('pointermove',e=>{ptrPos(e);ptr.active=true;if(ptr.down&&!ptr.swiped){const dx=ptr.x-ptr.sx,dy=ptr.y-ptr.sy;if(Math.hypot(dx,dy)>28){ptr.swipe=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');if(typeof MULTI_SWIPE!=='undefined'&&MULTI_SWIPE){ptr.sx=ptr.x;ptr.sy=ptr.y}else ptr.swiped=true}}});
const endPtr=()=>{if(ptr.down){ptr.up=true;ptr.dur=performance.now()-ptr.t0;ptr.dist=Math.hypot(ptr.x-ptr.sx,ptr.y-ptr.sy)}ptr.down=false};
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
cv.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')state='pause'});

/* ---- звук (WebAudio, без файлов) ---- */
let ac=null;
function audio(){try{if(!ac)ac=new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume()}catch(e){}}
function beep(f,d,type,v){try{if(!ac)return;const o=ac.createOscillator(),g=ac.createGain();o.type=type||'square';o.frequency.value=f;g.gain.value=v||.04;g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+(d||.1));o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+(d||.1))}catch(e){}}

/* ---- рисование: текст, скруглённые прямоугольники, частицы ---- */
function txt(s,x,y,size,color,align,bold){ctx.font=(bold?'700 ':'500 ')+Math.round(size)+'px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';ctx.fillStyle=color;ctx.textAlign=align||'left';ctx.textBaseline='middle';ctx.fillText(s,x,y)}
function rr(x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
const parts=[];
function burst(x,y,c,n,sp){n=n||14;sp=sp||220;for(let i=0;i<n;i++){const a=Math.random()*6.283,v=rnd(.3,1)*sp;parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-sp*.2,g:500,l:rnd(.4,.9),m:.9,c:c,s:rnd(2,5)})}}
function drawParts(){for(const p of parts){ctx.globalAlpha=clamp(p.l/p.m,0,1);ctx.fillStyle=p.c;ctx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s)}ctx.globalAlpha=1}

/* ---- состояния: menu → play ⇄ pause → over → play ---- */
let state='menu',score=0,best=0,t=0,overT=0,shake=0,last=0;
try{best=+localStorage.getItem('best_'+GAME_ID)||0}catch(e){}
function startGame(){score=0;overT=0;parts.length=0;reset();state='play';press.Space=false;press.Enter=false;ptr.tap=false}
function gameOver(){if(state!=='play')return;state='over';overT=0;shake=.45;score=Math.floor(score);if(score>best){best=score;try{localStorage.setItem('best_'+GAME_ID,String(best))}catch(e){}}beep(140,.35,'sawtooth',.06)}
function hud(){
  if(state==='menu')return;
  ctx.save();ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=5;
  txt('Счёт '+Math.floor(score),14,24,20,'#ffffff','left',true);
  txt('Рекорд '+Math.max(best,Math.floor(score)),W-60,24,16,'#cfd6ff','right');
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.fillRect(W-40,13,5,18);ctx.fillRect(W-30,13,5,18);
  ctx.restore();
}
function overlay(){
  if(state==='play')return;
  ctx.fillStyle='rgba(8,10,24,.72)';ctx.fillRect(0,0,W,H);
  const cx=W/2,cy=H/2,s=clamp(Math.min(W,H*1.4)/640,.6,1.4),touch=W<700;
  if(state==='menu'){
    txt(TITLE,cx,cy-80*s,56*s,'#ffffff','center',true);
    txt(HINT,cx,cy-14*s,20*s,'#cfd6ff','center');
    txt(touch?'Коснитесь экрана, чтобы начать':'Нажмите пробел или щёлкните, чтобы начать',cx,cy+48*s+Math.sin(t*4)*3,22*s,'#ffd166','center',true);
    if(best)txt('Рекорд: '+best,cx,cy+96*s,18*s,'#9aa4d6','center');
  }else if(state==='pause'){
    txt('Пауза',cx,cy-24*s,52*s,'#ffffff','center',true);
    txt('P / Esc или тап — продолжить',cx,cy+36*s,20*s,'#cfd6ff','center');
  }else{
    txt('Игра окончена',cx,cy-84*s,48*s,'#ff6b6b','center',true);
    txt('Счёт: '+Math.floor(score),cx,cy-22*s,32*s,'#ffffff','center',true);
    txt('Рекорд: '+best,cx,cy+20*s,22*s,'#ffd166','center');
    if(overT>.5)txt(touch?'Коснитесь, чтобы сыграть снова':'Пробел или щелчок — играть снова',cx,cy+76*s,22*s,'#cfd6ff','center');
  }
}
function loop(now){
  const dt=Math.min((now-last)/1000,.05);last=now;t+=dt;
  const act=press.Space||press.Enter||ptr.tap;
  if(state==='play'&&ptr.tap&&ptr.x>W-56&&ptr.y<46){state='pause';ptr.tap=false}
  if(state==='menu'){if(act)startGame()}
  else if(state==='over'){overT+=dt;if(overT>.5&&act)startGame()}
  else if(state==='pause'){if(press.KeyP||press.Escape||ptr.tap)state='play'}
  else{if(press.KeyP||press.Escape)state='pause';else update(dt)}
  if(state!=='pause'){for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;p.l-=dt}for(let i=parts.length-1;i>=0;i--)if(parts[i].l<=0)parts.splice(i,1);shake=Math.max(0,shake-dt)}
  ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake*28,(Math.random()-.5)*shake*28);draw();ctx.restore();
  drawParts();hud();overlay();
  for(const k in press)delete press[k];ptr.tap=false;ptr.up=false;ptr.swipe='';
  requestAnimationFrame(loop);
}
`;

const TAIL = String.raw`
resize();reset();last=performance.now();requestAnimationFrame(loop);
`;

function build(g) {
  const head = '<!doctype html>\n<html lang="ru"><head><meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">\n<title>' + g.title + '</title>\n'
    + '<style>html,body{margin:0;height:100%;background:#0f1220;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}canvas{display:block;width:100%;height:100%;outline:none}</style></head>\n'
    + '<body><canvas id="c" tabindex="0"></canvas>\n<script>\n\'use strict\';\n';
  return head
    + "const GAME_ID='" + g.id + "',TITLE='" + g.title + "',HINT='" + g.hint + "';\n"
    + '/* ===== ДВИЖОК: размер, ввод (клавиатура / мышь / касания / свайпы), состояния, звук, частицы ===== */'
    + ENGINE
    + '\n/* ===== ИГРА: ' + g.title + ' ===== */\n' + g.code.trim() + '\n'
    + '\n/* ===== ЗАПУСК ===== */' + TAIL
    + '</script></body></html>\n';
}

/* ---------------------------------------------------------------- БЕГУН (динозавр) */
const RUNNER = String.raw`
let u,gy,P,obs,clouds,speed,spawnT,groundX;
function layout(){u=Math.min(W/18,H/10);gy=Math.round(H*0.76)}
function onResize(){layout();if(P){P.w=u*0.8;P.h=u;if(!P.air)P.y=gy}}
function reset(){
  layout();speed=u*7;spawnT=1.2;groundX=0;obs=[];
  P={x:Math.max(36,W*0.14),y:gy,vy:0,air:false,duck:false,run:0,w:u*0.8,h:u,dt:0};
  clouds=[];for(let i=0;i<6;i++)clouds.push({x:Math.random()*W,y:20+Math.random()*gy*0.45,s:0.6+Math.random()*0.8});
}
function spawn(){
  if(score>250&&Math.random()<0.28){
    const low=Math.random()<0.5;
    obs.push({t:'bird',x:W+40,y:low?gy-u*0.2:gy-u*0.6,w:u*1.1,h:u*0.55});
  }else{
    const n=1+Math.floor(Math.random()*(score>150?3:2)),w=u*0.5*n+u*0.1*(n-1),h=u*(0.9+Math.random()*0.6);
    obs.push({t:'cactus',x:W+40,y:gy,w:w,h:h,n:n});
  }
}
function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function pbox(){const w=P.duck?P.w*1.3:P.w*0.7,h=P.duck?P.h*0.5:P.h*0.88;return{x:P.x+(P.duck?0:P.w*0.15),y:P.y-h,w:w,h:h}}
function obox(o){const k=0.12;return{x:o.x+o.w*k,y:o.y-o.h+o.h*k,w:o.w*(1-2*k),h:o.h*(1-2*k)}}
function update(dt){
  speed=Math.min(u*17,speed+u*0.14*dt);score+=speed*dt/u*1.2;groundX+=speed*dt;
  const jump=press.Space||press.ArrowUp||press.KeyW||ptr.tap||ptr.swipe==='up';
  const duckKey=keys.ArrowDown||keys.KeyS;
  if(ptr.swipe==='down')P.dt=0.5;
  P.dt=Math.max(0,P.dt-dt);
  if(jump&&!P.air){P.vy=-u*15;P.air=true;beep(520,0.12,'square');}
  P.duck=!P.air&&(duckKey||P.dt>0);
  if(P.air){
    P.vy+=u*40*dt*(duckKey?2.2:1);P.y+=P.vy*dt;
    if(P.y>=gy){P.y=gy;P.vy=0;P.air=false;burst(P.x+P.w/2,gy,'#cbb78c',8,120)}
  }
  P.run+=dt*speed/u*1.4;
  for(const c of clouds){c.x-=speed*dt*0.12*c.s;if(c.x<-120)c.x=W+60+Math.random()*200}
  spawnT-=dt;
  if(spawnT<=0){spawn();spawnT=1.15+Math.random()*0.9}
  for(const o of obs)o.x-=speed*dt;
  while(obs.length&&obs[0].x<-200)obs.shift();
  const pb=pbox();
  for(const o of obs)if(hit(pb,obox(o))){burst(P.x+P.w/2,P.y-P.h/2,'#3b4a3f',22,300);gameOver();return}
}
function hill(base,amp,fq,off,col){
  ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,H);
  for(let x=0;x<=W;x+=16)ctx.lineTo(x,base-Math.sin((x+off)*fq)*amp-Math.sin((x+off)*fq*2.3)*amp*0.35);
  ctx.lineTo(W,H);ctx.closePath();ctx.fill();
}
function drawDino(){
  const x=P.x,y=P.y,w=P.w,h=P.h,leg=Math.floor(P.run)%2;
  ctx.fillStyle='#3b4a3f';
  if(P.duck){
    rr(x,y-h*0.5,w*1.3,h*0.34,8);ctx.fill();
    rr(x+w*0.95,y-h*0.55,w*0.55,h*0.3,7);ctx.fill();
    ctx.fillStyle='#fff';ctx.fillRect(x+w*1.2,y-h*0.5,5,5);ctx.fillStyle='#111';ctx.fillRect(x+w*1.27,y-h*0.48,3,3);
    ctx.fillStyle='#3b4a3f';ctx.fillRect(x+w*0.2,y-h*0.18,w*0.2,h*0.18);ctx.fillRect(x+w*0.7,y-h*0.18,w*0.2,h*0.18);
    ctx.beginPath();ctx.moveTo(x,y-h*0.4);ctx.lineTo(x-w*0.35,y-h*0.3);ctx.lineTo(x,y-h*0.25);ctx.fill();
  }else{
    rr(x+w*0.1,y-h*0.66,w*0.62,h*0.46,9);ctx.fill();
    rr(x+w*0.42,y-h*1.0,w*0.62,h*0.42,9);ctx.fill();
    ctx.fillStyle='#fff';ctx.fillRect(x+w*0.82,y-h*0.92,6,6);ctx.fillStyle='#111';ctx.fillRect(x+w*0.9,y-h*0.9,3,3);
    ctx.fillStyle='#3b4a3f';
    ctx.beginPath();ctx.moveTo(x+w*0.12,y-h*0.55);ctx.lineTo(x-w*0.3,y-h*0.38);ctx.lineTo(x+w*0.14,y-h*0.34);ctx.fill();
    const a=P.air?0:leg;
    ctx.fillRect(x+w*0.22,y-h*0.2,w*0.2,h*0.2-(a?h*0.07:0));
    ctx.fillRect(x+w*0.52,y-h*0.2,w*0.2,h*0.2-(a?0:h*0.07));
    rr(x+w*0.62,y-h*0.6,w*0.26,h*0.1,4);ctx.fill();
  }
}
function drawObs(o){
  if(o.t==='cactus'){
    ctx.fillStyle='#2f7d3a';
    for(let i=0;i<o.n;i++){
      const cx=o.x+i*u*0.6,cw=u*0.5,ch=o.h*(0.85+0.15*((i*7)%3)/2);
      rr(cx+cw*0.3,o.y-ch,cw*0.4,ch,6);ctx.fill();
      rr(cx,o.y-ch*0.65,cw*0.28,ch*0.3,5);ctx.fill();rr(cx+cw*0.72,o.y-ch*0.5,cw*0.28,ch*0.28,5);ctx.fill();
    }
  }else{
    const fl=Math.floor(t*8)%2;ctx.fillStyle='#6b4fa0';
    rr(o.x+o.w*0.2,o.y-o.h*0.7,o.w*0.6,o.h*0.4,8);ctx.fill();
    ctx.beginPath();ctx.moveTo(o.x+o.w*0.8,o.y-o.h*0.55);ctx.lineTo(o.x+o.w*1.05,o.y-o.h*0.48);ctx.lineTo(o.x+o.w*0.8,o.y-o.h*0.4);ctx.fill();
    ctx.beginPath();ctx.moveTo(o.x+o.w*0.35,o.y-o.h*0.62);ctx.lineTo(o.x+o.w*0.6,o.y-o.h*(fl?1.2:0.1));ctx.lineTo(o.x+o.w*0.7,o.y-o.h*0.62);ctx.fill();
    ctx.fillStyle='#fff';ctx.fillRect(o.x+o.w*0.72,o.y-o.h*0.62,4,4);
  }
}
function draw(){
  const g=ctx.createLinearGradient(0,0,0,gy);g.addColorStop(0,'#9fd3ff');g.addColorStop(1,'#fff1d0');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ffe08a';ctx.beginPath();ctx.arc(W*0.82,H*0.18,u*1.2,0,7);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.85)';
  for(const c of clouds){rr(c.x,c.y,u*2.2*c.s,u*0.55*c.s,u*0.28);ctx.fill();rr(c.x+u*0.5*c.s,c.y-u*0.3*c.s,u*1.1*c.s,u*0.6*c.s,u*0.3);ctx.fill()}
  hill(gy-u*0.2,u*1.4,0.0035,groundX*0.15,'#cfe8c9');hill(gy-u*0.02,u*0.8,0.006,groundX*0.35,'#a9d3a1');
  ctx.fillStyle='#d9c79a';ctx.fillRect(0,gy,W,H-gy);ctx.fillStyle='#b9a574';ctx.fillRect(0,gy,W,3);
  const off=groundX%90;
  for(let x=-off;x<W;x+=90){ctx.fillRect(x+20,gy+14,14,3);ctx.fillRect(x+60,gy+32,20,3)}
  for(const o of obs)drawObs(o);
  drawDino();
}
`;

/* ---------------------------------------------------------------- ЗМЕЙКА */
const SNAKE = String.raw`
const MULTI_SWIPE=true;
let cell,cols,rows,ox,oy,snake,dir,queue,food,acc,stepT;
function layout(){
  cell=Math.max(18,Math.min(44,Math.floor(Math.min(W,H-50)/17)));
  cols=Math.max(8,Math.floor(W/cell));rows=Math.max(8,Math.floor((H-50)/cell));
  ox=Math.floor((W-cols*cell)/2);oy=50+Math.floor((H-50-rows*cell)/2);
}
function onResize(){layout();if(snake&&snake.some(s=>s.x>=cols||s.y>=rows)){reset()}}
function reset(){
  layout();const cx=Math.floor(cols/2),cy=Math.floor(rows/2);
  snake=[{x:cx,y:cy},{x:cx-1,y:cy},{x:cx-2,y:cy}];dir={x:1,y:0};queue=[];acc=0;stepT=0.13;placeFood();
}
function placeFood(){let p;do{p={x:Math.floor(Math.random()*cols),y:Math.floor(Math.random()*rows)}}while(snake.some(s=>s.x===p.x&&s.y===p.y));food=p}
function turn(dx,dy){
  const l=queue.length?queue[queue.length-1]:dir;
  if((dx===-l.x&&dy===-l.y)||(dx===l.x&&dy===l.y))return;
  if(queue.length<2)queue.push({x:dx,y:dy});
}
function step(){
  if(queue.length)dir=queue.shift();
  const h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
  if(h.x<0||h.y<0||h.x>=cols||h.y>=rows||snake.some((s,i)=>i<snake.length-1&&s.x===h.x&&s.y===h.y)){
    burst(ox+(snake[0].x+0.5)*cell,oy+(snake[0].y+0.5)*cell,'#7be07b',26,300);gameOver();return;
  }
  snake.unshift(h);
  if(h.x===food.x&&h.y===food.y){
    score+=10;beep(660,0.08,'square');burst(ox+(h.x+0.5)*cell,oy+(h.y+0.5)*cell,'#ff6b6b',14,200);
    stepT=Math.max(0.06,stepT*0.965);placeFood();
  }else snake.pop();
}
function update(dt){
  if(press.ArrowLeft||press.KeyA||ptr.swipe==='left')turn(-1,0);
  if(press.ArrowRight||press.KeyD||ptr.swipe==='right')turn(1,0);
  if(press.ArrowUp||press.KeyW||ptr.swipe==='up')turn(0,-1);
  if(press.ArrowDown||press.KeyS||ptr.swipe==='down')turn(0,1);
  acc+=dt;
  while(acc>=stepT&&state==='play'){acc-=stepT;step()}
}
function draw(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#10231a');g.addColorStop(1,'#0a1510');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){ctx.fillStyle=(x+y)%2?'#16301f':'#13291b';ctx.fillRect(ox+x*cell,oy+y*cell,cell,cell)}
  ctx.strokeStyle='#2f6b43';ctx.lineWidth=3;ctx.strokeRect(ox,oy,cols*cell,rows*cell);
  const pulse=1+Math.sin(t*6)*0.08,fx=ox+(food.x+0.5)*cell,fy=oy+(food.y+0.5)*cell;
  ctx.fillStyle='rgba(255,90,90,.25)';ctx.beginPath();ctx.arc(fx,fy,cell*0.8*pulse,0,7);ctx.fill();
  ctx.fillStyle='#ff4d4d';ctx.beginPath();ctx.arc(fx,fy,cell*0.34*pulse,0,7);ctx.fill();
  ctx.fillStyle='#3dbb5a';ctx.fillRect(fx-1,fy-cell*0.5,3,cell*0.18);
  for(let i=snake.length-1;i>=0;i--){
    const s=snake[i],k=i/Math.max(1,snake.length-1);
    ctx.fillStyle=i===0?'#9cff8a':'hsl('+(125-k*30)+',65%,'+(52-k*14)+'%)';
    rr(ox+s.x*cell+1.5,oy+s.y*cell+1.5,cell-3,cell-3,cell*0.3);ctx.fill();
  }
  const h=snake[0],hx=ox+(h.x+0.5)*cell,hy=oy+(h.y+0.5)*cell,px=-dir.y*cell*0.18,py=dir.x*cell*0.18,fx2=dir.x*cell*0.12,fy2=dir.y*cell*0.12;
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(hx+px+fx2,hy+py+fy2,cell*0.12,0,7);ctx.arc(hx-px+fx2,hy-py+fy2,cell*0.12,0,7);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(hx+px+fx2*1.6,hy+py+fy2*1.6,cell*0.06,0,7);ctx.arc(hx-px+fx2*1.6,hy-py+fy2*1.6,cell*0.06,0,7);ctx.fill();
}
`;

/* ---------------------------------------------------------------- ПТИЧКА (flappy) */
const FLAPPY = String.raw`
let u,gy,B,pipes,spawnT,clouds,groundX;
function layout(){u=H/12;gy=H-u}
function onResize(){layout();if(B)B.r=u*0.38}
function reset(){
  layout();groundX=0;spawnT=0.9;pipes=[];
  B={x:W*0.28,y:H*0.42,vy:0,r:u*0.38,rot:0};
  clouds=[];for(let i=0;i<5;i++)clouds.push({x:Math.random()*W,y:Math.random()*H*0.5,s:0.6+Math.random()*0.8});
}
function gapSize(){return Math.max(u*2.9,u*3.8-score*0.05*u)}
function update(dt){
  const sp=u*4.2+Math.min(u*1.6,score*u*0.05);groundX+=sp*dt;
  const flap=press.Space||press.ArrowUp||press.KeyW||ptr.tap;
  if(flap){B.vy=-u*8.6;beep(700,0.07,'square')}
  B.vy+=u*26*dt;B.y+=B.vy*dt;B.rot=clamp(B.vy/(u*12),-0.5,1.1);
  if(B.y<B.r){B.y=B.r;B.vy=0}
  spawnT-=dt;
  if(spawnT<=0){spawnT=1.55;const gap=gapSize();pipes.push({x:W+u,top:rnd(u*1.2,gy-gap-u*1.2),gap:gap,w:u*1.5,passed:false})}
  for(const p of pipes){
    p.x-=sp*dt;
    if(!p.passed&&p.x+p.w<B.x){p.passed=true;score+=1;beep(880,0.06,'triangle')}
    if(B.x+B.r>p.x&&B.x-B.r<p.x+p.w&&(B.y-B.r<p.top||B.y+B.r>p.top+p.gap)){die();return}
  }
  while(pipes.length&&pipes[0].x<-u*3)pipes.shift();
  for(const c of clouds){c.x-=sp*dt*0.15*c.s;if(c.x<-160)c.x=W+80}
  if(B.y+B.r>=gy)die();
}
function die(){burst(B.x,B.y,'#ffd34d',24,320);gameOver()}
function draw(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#5cc6ff');g.addColorStop(1,'#c9f0ff');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(255,255,255,.8)';
  for(const c of clouds){rr(c.x,c.y,u*2.4*c.s,u*0.6*c.s,u*0.3);ctx.fill();rr(c.x+u*0.5*c.s,c.y-u*0.35*c.s,u*1.2*c.s,u*0.7*c.s,u*0.35);ctx.fill()}
  for(const p of pipes){
    const gr=ctx.createLinearGradient(p.x,0,p.x+p.w,0);gr.addColorStop(0,'#4fae3b');gr.addColorStop(0.5,'#8be06a');gr.addColorStop(1,'#3f9a2f');
    ctx.fillStyle=gr;
    ctx.fillRect(p.x,0,p.w,p.top);ctx.fillRect(p.x,p.top+p.gap,p.w,gy-p.top-p.gap);
    rr(p.x-u*0.1,p.top-u*0.5,p.w+u*0.2,u*0.5,6);ctx.fill();
    rr(p.x-u*0.1,p.top+p.gap,p.w+u*0.2,u*0.5,6);ctx.fill();
  }
  ctx.fillStyle='#ded895';ctx.fillRect(0,gy,W,H-gy);ctx.fillStyle='#74c043';ctx.fillRect(0,gy,W,u*0.22);
  ctx.fillStyle='#c9c279';for(let x=-(groundX%40);x<W;x+=40)ctx.fillRect(x,gy+u*0.4,20,4);
  const hov=state==='menu'?Math.sin(t*4)*u*0.2:0;
  ctx.save();ctx.translate(B.x,B.y+hov);ctx.rotate(B.rot);
  ctx.fillStyle='#ffd34d';ctx.beginPath();ctx.arc(0,0,B.r,0,7);ctx.fill();
  ctx.fillStyle='#ff9f1c';const wf=Math.sin(t*(state==='play'?20:8))*B.r*0.5;
  ctx.beginPath();ctx.ellipse(-B.r*0.25,B.r*0.1+wf*0.3,B.r*0.55,B.r*0.32,-0.3+wf*0.02,0,7);ctx.fill();
  ctx.fillStyle='#ff6b3d';ctx.beginPath();ctx.moveTo(B.r*0.8,-B.r*0.05);ctx.lineTo(B.r*1.5,B.r*0.15);ctx.lineTo(B.r*0.8,B.r*0.4);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(B.r*0.35,-B.r*0.3,B.r*0.3,0,7);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(B.r*0.45,-B.r*0.3,B.r*0.13,0,7);ctx.fill();
  ctx.restore();
  if(state==='play')txt(String(Math.floor(score)),W/2,u*1.6,u*1.3,'#ffffff','center',true);
}
`;

/* ---------------------------------------------------------------- АРКАНОИД */
const BREAKOUT = String.raw`
let pad,ball,bricks,lives,level,launchT,bw,bh,bx0;
const COLS=10,PAL=['#ff5b6e','#ff9b4d','#ffd84d','#5be37d','#4dd2ff','#4d7bff','#b061ff','#ff6bd6','#a0ffcf'];
function layout(){bw=Math.min(90,Math.floor((W-24)/COLS));bh=Math.max(18,Math.min(28,H*0.035));bx0=(W-bw*COLS)/2}
function onResize(){layout();if(pad){pad.y=H-46;pad.x=clamp(pad.x,pad.w/2,W-pad.w/2);mk(true)}}
function mk(keep){
  const old=keep&&bricks?bricks:null,rows=Math.min(4+level,9);bricks=[];
  for(let r=0;r<rows;r++)for(let c=0;c<COLS;c++){
    const o=old&&old[r*COLS+c];
    bricks.push({x:bx0+c*bw,y:70+r*(bh+4),w:bw-4,h:bh,r:r,hp:o?o.hp:(level>2&&r<2?2:1),alive:o?o.alive:true});
  }
}
function reset(){
  layout();level=1;lives=3;
  pad={w:Math.max(90,Math.min(W*0.2,170)),h:14,x:W/2,y:H-46};
  mk(false);serve();
}
function serve(){
  const sp=Math.min(H*0.62+level*28,H*0.95);
  ball={x:pad.x,y:pad.y-20,vx:sp*0.45*(Math.random()<0.5?-1:1),vy:-sp*0.89,r:8,sp:sp,stuck:true,trail:[]};launchT=0.7;
}
function hitBrick(b){
  b.hp--;
  if(b.hp<=0){b.alive=false;score+=10*(10-b.r);burst(b.x+b.w/2,b.y+b.h/2,PAL[b.r%PAL.length],10,180);beep(300+b.r*50,0.06,'square')}
  else beep(220,0.05,'square');
}
function collide(){
  if(ball.x<ball.r){ball.x=ball.r;ball.vx=Math.abs(ball.vx)}
  if(ball.x>W-ball.r){ball.x=W-ball.r;ball.vx=-Math.abs(ball.vx)}
  if(ball.y<46+ball.r){ball.y=46+ball.r;ball.vy=Math.abs(ball.vy)}
  if(ball.vy>0&&ball.y+ball.r>=pad.y-pad.h/2&&ball.y-ball.r<=pad.y+pad.h/2&&Math.abs(ball.x-pad.x)<pad.w/2+ball.r){
    const off=clamp((ball.x-pad.x)/(pad.w/2),-1,1);let a=off*1.05;if(Math.abs(a)<0.22)a=(a<0||(a===0&&Math.random()<0.5)?-1:1)*0.22;
    ball.vx=ball.sp*Math.sin(a);ball.vy=-ball.sp*Math.cos(a);ball.y=pad.y-pad.h/2-ball.r;beep(440,0.05,'triangle');
  }
  for(const b of bricks){
    if(!b.alive)continue;
    const nx=clamp(ball.x,b.x,b.x+b.w),ny=clamp(ball.y,b.y,b.y+b.h),dx=ball.x-nx,dy=ball.y-ny;
    if(dx*dx+dy*dy<ball.r*ball.r){
      const cx=b.x+b.w/2,cy=b.y+b.h/2;
      if(Math.abs(ball.x-cx)/(b.w/2+ball.r)>Math.abs(ball.y-cy)/(b.h/2+ball.r))ball.vx=(ball.x<cx?-1:1)*Math.abs(ball.vx);
      else ball.vy=(ball.y<cy?-1:1)*Math.abs(ball.vy);
      if(Math.abs(ball.vy)<ball.sp*0.28)ball.vy=(ball.vy<0?-1:1)*ball.sp*0.28;const m=Math.hypot(ball.vx,ball.vy)||1;ball.vx=ball.vx/m*ball.sp;ball.vy=ball.vy/m*ball.sp;
      hitBrick(b);break;
    }
  }
}
function update(dt){
  const kv=(keys.ArrowLeft||keys.KeyA?-1:0)+(keys.ArrowRight||keys.KeyD?1:0);
  if(kv){pad.x+=kv*W*0.9*dt;ptr.active=false}else if(ptr.active||ptr.down)pad.x=ptr.x;
  pad.x=clamp(pad.x,pad.w/2,W-pad.w/2);
  if(ball.stuck){
    ball.x=pad.x;ball.y=pad.y-pad.h/2-ball.r-1;launchT-=dt;
    if(launchT<=0||press.Space||ptr.tap)ball.stuck=false;
    return;
  }
  ball.trail.push({x:ball.x,y:ball.y});if(ball.trail.length>8)ball.trail.shift();
  const n=Math.max(1,Math.ceil(Math.hypot(ball.vx,ball.vy)*dt/6));
  for(let i=0;i<n;i++){ball.x+=ball.vx*dt/n;ball.y+=ball.vy*dt/n;collide()}
  if(bricks.every(b=>!b.alive)){level++;mk(false);serve();beep(880,0.2,'triangle')}
  if(ball.y>H+20){
    lives--;shake=0.3;beep(150,0.25,'sawtooth');
    if(lives<=0)gameOver();else serve();
  }
}
function draw(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#14122b');g.addColorStop(1,'#07060f');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(const b of bricks){
    if(!b.alive)continue;
    ctx.fillStyle=PAL[b.r%PAL.length];rr(b.x,b.y,b.w,b.h,5);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.28)';rr(b.x+2,b.y+2,b.w-4,b.h*0.35,4);ctx.fill();
    if(b.hp>1){ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=2;rr(b.x+1,b.y+1,b.w-2,b.h-2,5);ctx.stroke()}
  }
  ctx.fillStyle='#e8ecff';rr(pad.x-pad.w/2,pad.y-pad.h/2,pad.w,pad.h,7);ctx.fill();
  ctx.fillStyle='#6ea8ff';rr(pad.x-pad.w/2,pad.y-pad.h/2,pad.w,pad.h*0.4,6);ctx.fill();
  for(let i=0;i<ball.trail.length;i++){ctx.globalAlpha=i/ball.trail.length*0.35;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ball.trail[i].x,ball.trail[i].y,ball.r*(i/ball.trail.length),0,7);ctx.fill()}
  ctx.globalAlpha=1;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,7);ctx.fill();
  if(state!=='menu'){
    for(let i=0;i<lives;i++){ctx.fillStyle='#ff6b8a';ctx.beginPath();ctx.arc(24+i*22,H-16,7,0,7);ctx.fill()}
    txt('Уровень '+level,W/2,24,16,'#cfd6ff','center');
  }
}
`;

/* ---------------------------------------------------------------- КОСМОБОЙ (шутер) */
const SHOOTER = String.raw`
let s,ship,bul,en,eb,pups,stars,spawnT,shotT,inv,power,lives,diff;
function layout(){s=clamp(Math.min(W,H*1.2)/700,0.7,1.4)}
function onResize(){layout();if(ship)ship.y=H-90*s}
function reset(){
  layout();lives=3;diff=0;spawnT=1;shotT=0;inv=0;power=0;bul=[];en=[];eb=[];pups=[];
  ship={x:W/2,y:H-90*s,w:34*s,h:40*s};
  stars=[];for(let i=0;i<70;i++)stars.push({x:Math.random()*W,y:Math.random()*H,z:0.3+Math.random()*0.9});
}
function fire(){
  const sp=-640*s,y=ship.y-ship.h/2;
  if(power>0){bul.push({x:ship.x-12*s,y:y,vx:-40*s,vy:sp},{x:ship.x,y:y-6*s,vx:0,vy:sp},{x:ship.x+12*s,y:y,vx:40*s,vy:sp})}
  else bul.push({x:ship.x,y:y,vx:0,vy:sp});
  beep(900,0.04,'square',0.02);
}
function spawn(){
  const r=Math.random(),sp=(90+diff*22)*s;
  if(diff>1.2&&r<0.18)en.push({k:'tank',x:rnd(40*s,W-40*s),y:-30*s,vx:0,vy:sp*0.55,hp:4,w:38*s,h:30*s,sh:rnd(0.8,1.6),ph:0});
  else if(r<0.45)en.push({k:'zig',x:rnd(40*s,W-40*s),y:-30*s,vx:(Math.random()<0.5?-1:1)*sp*0.9,vy:sp*0.8,hp:1,w:28*s,h:28*s,ph:0});
  else en.push({k:'drone',x:rnd(40*s,W-40*s),y:-30*s,vx:0,vy:sp,hp:1,w:30*s,h:26*s,ph:Math.random()*6,x0:0});
}
function hurt(){
  if(inv>0)return;
  lives--;inv=1.6;shake=0.35;burst(ship.x,ship.y,'#6ea8ff',22,300);beep(120,0.3,'sawtooth',0.06);
  if(lives<=0){burst(ship.x,ship.y,'#ffffff',36,380);gameOver()}
}
function update(dt){
  diff+=dt*0.012*60/60;power=Math.max(0,power-dt);inv=Math.max(0,inv-dt);
  const kv=(keys.ArrowLeft||keys.KeyA?-1:0)+(keys.ArrowRight||keys.KeyD?1:0);
  if(kv){ship.x+=kv*560*s*dt;ptr.active=false}else if(ptr.active||ptr.down)ship.x+=(ptr.x-ship.x)*Math.min(1,dt*14);
  ship.x=clamp(ship.x,ship.w/2,W-ship.w/2);
  shotT-=dt;if(shotT<=0){fire();shotT=power>0?0.16:0.22}
  spawnT-=dt;if(spawnT<=0){spawn();spawnT=Math.max(0.35,1.1-diff*0.05)}
  for(const b of bul){b.x+=b.vx*dt;b.y+=b.vy*dt}
  bul=bul.filter(b=>b.y>-20);
  for(const e of en){
    e.ph+=dt;
    if(e.k==='drone'){e.y+=e.vy*dt;e.x+=Math.sin(e.ph*2.4)*60*s*dt}
    else if(e.k==='zig'){e.x+=e.vx*dt;e.y+=e.vy*dt;if(e.x<e.w||e.x>W-e.w)e.vx=-e.vx}
    else{e.y+=e.vy*dt;e.sh-=dt;if(e.sh<=0){e.sh=rnd(1.2,2);const dx=ship.x-e.x,dy=ship.y-e.y,m=Math.hypot(dx,dy)||1;eb.push({x:e.x,y:e.y+e.h/2,vx:dx/m*230*s,vy:dy/m*230*s})}}
    for(const b of bul){
      if(!b.dead&&Math.abs(b.x-e.x)<e.w*0.6&&Math.abs(b.y-e.y)<e.h*0.7){
        b.dead=true;e.hp--;burst(b.x,b.y,'#ffd166',4,120);
        if(e.hp<=0){
          e.dead=true;score+=e.k==='tank'?50:e.k==='zig'?20:10;burst(e.x,e.y,e.k==='tank'?'#ff9b4d':'#ff5b6e',16,260);beep(200,0.12,'sawtooth',0.04);
          if(Math.random()<0.1)pups.push({x:e.x,y:e.y});
        }
      }
    }
    if(!e.dead&&Math.abs(e.x-ship.x)<(e.w+ship.w)*0.45&&Math.abs(e.y-ship.y)<(e.h+ship.h)*0.45){e.dead=true;burst(e.x,e.y,'#ff5b6e',14,240);hurt()}
  }
  bul=bul.filter(b=>!b.dead);en=en.filter(e=>!e.dead&&e.y<H+50);
  for(const b of eb){b.x+=b.vx*dt;b.y+=b.vy*dt;if(Math.abs(b.x-ship.x)<ship.w*0.45&&Math.abs(b.y-ship.y)<ship.h*0.45){b.dead=true;hurt()}}
  eb=eb.filter(b=>!b.dead&&b.y<H+20&&b.y>-20&&b.x>-20&&b.x<W+20);
  for(const p of pups){p.y+=110*s*dt;if(Math.abs(p.x-ship.x)<28*s&&Math.abs(p.y-ship.y)<30*s){p.dead=true;power=8;beep(1000,0.15,'triangle')}}
  pups=pups.filter(p=>!p.dead&&p.y<H+20);
  for(const st of stars){st.y+=st.z*60*s*dt;if(st.y>H){st.y=0;st.x=Math.random()*W}}
}
function draw(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#05061a');g.addColorStop(1,'#1a0f3a');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fff';for(const st of stars){ctx.globalAlpha=0.3+st.z*0.5;ctx.fillRect(st.x,st.y,st.z*2,st.z*2)}ctx.globalAlpha=1;
  for(const p of pups){ctx.fillStyle='#5be37d';ctx.beginPath();ctx.arc(p.x,p.y,13*s,0,7);ctx.fill();txt('P',p.x,p.y+1,16*s,'#06270f','center',true)}
  for(const e of en){
    if(e.k==='drone'){ctx.fillStyle='#ff5b6e';ctx.beginPath();ctx.ellipse(e.x,e.y,e.w/2,e.h/3,0,0,7);ctx.fill();ctx.fillStyle='#ffb3bd';ctx.beginPath();ctx.ellipse(e.x,e.y-e.h*0.15,e.w/4,e.h/4,0,0,7);ctx.fill()}
    else if(e.k==='zig'){ctx.fillStyle='#ffb347';ctx.beginPath();ctx.moveTo(e.x,e.y-e.h/2);ctx.lineTo(e.x+e.w/2,e.y);ctx.lineTo(e.x,e.y+e.h/2);ctx.lineTo(e.x-e.w/2,e.y);ctx.fill()}
    else{ctx.fillStyle='#8f6bff';rr(e.x-e.w/2,e.y-e.h/2,e.w,e.h,8);ctx.fill();ctx.fillStyle='#e1d6ff';ctx.fillRect(e.x-e.w*0.3,e.y-3,e.w*0.6,6);ctx.fillStyle='#ff5b6e';ctx.fillRect(e.x-4,e.y+e.h*0.2,8,8)}
  }
  for(const b of bul){ctx.fillStyle='#8ff0ff';rr(b.x-2*s,b.y-8*s,4*s,16*s,2);ctx.fill()}
  for(const b of eb){ctx.fillStyle='#ff7a7a';ctx.beginPath();ctx.arc(b.x,b.y,5*s,0,7);ctx.fill()}
  if(state!=='over'&&(inv<=0||Math.floor(t*14)%2===0)){
    ctx.save();ctx.translate(ship.x,ship.y);
    ctx.fillStyle='#ffb347';ctx.beginPath();ctx.moveTo(-8*s,ship.h*0.4);ctx.lineTo(0,ship.h*(0.7+Math.sin(t*40)*0.1));ctx.lineTo(8*s,ship.h*0.4);ctx.fill();
    ctx.fillStyle='#d9e2ff';ctx.beginPath();ctx.moveTo(0,-ship.h/2);ctx.lineTo(ship.w/2,ship.h/2);ctx.lineTo(0,ship.h*0.28);ctx.lineTo(-ship.w/2,ship.h/2);ctx.closePath();ctx.fill();
    ctx.fillStyle='#4d7bff';ctx.beginPath();ctx.moveTo(0,-ship.h*0.2);ctx.lineTo(ship.w*0.14,ship.h*0.15);ctx.lineTo(-ship.w*0.14,ship.h*0.15);ctx.fill();
    ctx.restore();
  }
  if(state!=='menu'){
    for(let i=0;i<lives;i++){ctx.fillStyle='#ff6b8a';ctx.beginPath();ctx.arc(22+i*22,H-18,7,0,7);ctx.fill()}
    if(power>0)txt('Тройной выстрел: '+Math.ceil(power)+' с',W/2,24,16,'#5be37d','center',true);
  }
}
`;

/* ---------------------------------------------------------------- ТЕТРИС */
const TETRIS = String.raw`
const MULTI_SWIPE=false;
const SH={I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],O:[[1,1],[1,1]],T:[[0,1,0],[1,1,1],[0,0,0]],S:[[0,1,1],[1,1,0],[0,0,0]],Z:[[1,1,0],[0,1,1],[0,0,0]],J:[[1,0,0],[1,1,1],[0,0,0]],L:[[0,0,1],[1,1,1],[0,0,0]]};
const COL={I:'#4dd2ff',O:'#ffd84d',T:'#b061ff',S:'#5be37d',Z:'#ff5b6e',J:'#4d7bff',L:'#ff9b4d'};
const CW=10,CH=20;
let grid,cur,nextK,bag,fall,lines,level,cell,bx,by,das,dirHeld,anchor;
function layout(){
  const panel=Math.max(92,Math.min(150,W*0.24));
  cell=Math.max(14,Math.floor(Math.min((H-60)/CH,(W-panel-20)/CW)));
  bx=Math.floor((W-cell*CW-panel-12)/2);by=Math.floor((H-cell*CH)/2)+14;
}
function onResize(){layout()}
function rot(m){const n=m.length,r=m.map(()=>Array(n).fill(0));for(let y=0;y<n;y++)for(let x=0;x<n;x++)r[x][n-1-y]=m[y][x];return r}
function pull(){
  if(!bag||!bag.length){bag=['I','O','T','S','Z','J','L'];for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const tmp=bag[i];bag[i]=bag[j];bag[j]=tmp}}
  return bag.pop();
}
function fits(m,x,y){
  for(let r=0;r<m.length;r++)for(let c=0;c<m.length;c++){
    if(!m[r][c])continue;
    const nx=x+c,ny=y+r;
    if(nx<0||nx>=CW||ny>=CH)return false;
    if(ny>=0&&grid[ny][nx])return false;
  }
  return true;
}
function spawn(){
  const k=nextK;nextK=pull();
  const m=SH[k].map(r=>r.slice());
  cur={k:k,m:m,x:Math.floor((CW-m.length)/2),y:-1};
  if(!fits(cur.m,cur.x,cur.y)){gameOver()}
}
function reset(){
  layout();grid=[];for(let y=0;y<CH;y++)grid.push(Array(CW).fill(0));
  bag=[];nextK=pull();lines=0;level=1;fall=0;das=0;dirHeld=0;anchor=0;spawn();
}
function move(d){if(fits(cur.m,cur.x+d,cur.y)){cur.x+=d;return true}return false}
function rotate(dir){
  let m=cur.m;if(dir>0)m=rot(m);else{m=rot(rot(rot(m)))}
  for(const k of [0,-1,1,-2,2])if(fits(m,cur.x+k,cur.y)){cur.m=m;cur.x+=k;beep(500,0.03,'triangle',0.03);return}
}
function lock(){
  for(let r=0;r<cur.m.length;r++)for(let c=0;c<cur.m.length;c++)if(cur.m[r][c]){
    const ny=cur.y+r,nx=cur.x+c;
    if(ny<0){gameOver();return}
    grid[ny][nx]=COL[cur.k];
  }
  let n=0;
  for(let y=CH-1;y>=0;y--){
    if(grid[y].every(v=>v)){
      for(let x=0;x<CW;x++)burst(bx+(x+0.5)*cell,by+(y+0.5)*cell,grid[y][x],2,160);
      grid.splice(y,1);grid.unshift(Array(CW).fill(0));n++;y++;
    }
  }
  if(n){score+=[0,100,300,500,800][n]*level;lines+=n;level=1+Math.floor(lines/10);beep(500+n*120,0.15,'triangle');if(n===4)shake=0.25}
  else beep(160,0.05,'square',0.03);
  spawn();
}
function drop(){while(fits(cur.m,cur.x,cur.y+1)){cur.y++;score+=1}lock();fall=0}
function update(dt){
  const l=keys.ArrowLeft||keys.KeyA,r=keys.ArrowRight||keys.KeyD;
  if(press.ArrowLeft||press.KeyA)move(-1);
  if(press.ArrowRight||press.KeyD)move(1);
  const dn=l&&!r?-1:r&&!l?1:0;
  if(dn!==dirHeld){dirHeld=dn;das=0.17}else if(dn){das-=dt;if(das<=0){move(dn);das=0.05}}
  if(press.ArrowUp||press.KeyW||press.KeyX)rotate(1);
  if(press.KeyZ)rotate(-1);
  if(press.Space){drop();return}
  /* касания: тап — поворот, перетаскивание — движение, свайп вниз — сброс */
  if(ptr.tap)anchor=ptr.x;
  if(ptr.down){while(ptr.x-anchor>cell*0.9){move(1);anchor+=cell*0.9}while(anchor-ptr.x>cell*0.9){move(-1);anchor-=cell*0.9}}
  if(ptr.swipe==='down'){drop();return}
  if(ptr.up&&ptr.dist<14&&ptr.dur<300)rotate(1);
  fall+=dt;
  const soft=keys.ArrowDown||keys.KeyS,iv=soft?0.04:Math.max(0.07,0.8*Math.pow(0.84,level-1));
  if(fall>=iv){fall=0;if(fits(cur.m,cur.x,cur.y+1)){cur.y++;if(soft)score+=1}else lock()}
}
function block(x,y,sz,col){
  ctx.fillStyle=col;rr(x+1,y+1,sz-2,sz-2,Math.max(2,sz*0.15));ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.28)';ctx.fillRect(x+3,y+3,sz-6,Math.max(2,sz*0.18));
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(x+3,y+sz-sz*0.2-1,sz-6,Math.max(2,sz*0.16));
}
function draw(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#14122b');g.addColorStop(1,'#07060f');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#0c0a1c';ctx.fillRect(bx,by,cell*CW,cell*CH);
  ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;
  for(let x=1;x<CW;x++){ctx.beginPath();ctx.moveTo(bx+x*cell,by);ctx.lineTo(bx+x*cell,by+CH*cell);ctx.stroke()}
  for(let y=1;y<CH;y++){ctx.beginPath();ctx.moveTo(bx,by+y*cell);ctx.lineTo(bx+CW*cell,by+y*cell);ctx.stroke()}
  ctx.strokeStyle='#4a4d8a';ctx.lineWidth=3;ctx.strokeRect(bx-1,by-1,cell*CW+2,cell*CH+2);
  for(let y=0;y<CH;y++)for(let x=0;x<CW;x++)if(grid[y][x])block(bx+x*cell,by+y*cell,cell,grid[y][x]);
  if(cur&&state!=='over'){
    let gy2=cur.y;while(fits(cur.m,cur.x,gy2+1))gy2++;
    for(let r=0;r<cur.m.length;r++)for(let c=0;c<cur.m.length;c++)if(cur.m[r][c]){
      if(gy2+r>=0){ctx.strokeStyle=COL[cur.k];ctx.globalAlpha=0.35;ctx.lineWidth=2;ctx.strokeRect(bx+(cur.x+c)*cell+2,by+(gy2+r)*cell+2,cell-4,cell-4);ctx.globalAlpha=1}
      if(cur.y+r>=0)block(bx+(cur.x+c)*cell,by+(cur.y+r)*cell,cell,COL[cur.k]);
    }
  }
  const px=bx+CW*cell+14,sz=Math.max(10,Math.min(cell*0.8,(W-px-8)/4));
  if(W-px>sz*3){
    txt('Дальше',px,by+14,14,'#cfd6ff','left',true);
    const m=SH[nextK];
    for(let r=0;r<m.length;r++)for(let c=0;c<m.length;c++)if(m[r][c])block(px+c*sz,by+30+r*sz,sz,COL[nextK]);
    txt('Уровень '+level,px,by+30+sz*5,14,'#cfd6ff','left',true);
    txt('Линии '+lines,px,by+30+sz*5+22,14,'#cfd6ff','left',true);
  }
}
`;

export const GAMES = [
  { id: 'runner', title: 'Бегун', re: /динозавр|dino|раннер|runner|бегун|кактус|бегать/i, hint: 'Пробел / ↑ / тап — прыжок, ↓ или свайп вниз — пригнуться',
    controls: 'пробел, ↑ или тап — прыжок; ↓ или свайп вниз — пригнуться; P — пауза', desc: 'Бегите по пустыне, перепрыгивайте кактусы и пригибайтесь под птицами — скорость растёт.', code: RUNNER },
  { id: 'snake', title: 'Змейка', re: /змейк|snake/i, hint: 'Стрелки / WASD / свайпы — поворот',
    controls: 'стрелки или WASD; на телефоне — свайпы; P — пауза', desc: 'Собирайте яблоки, не врезайтесь в стены и в себя — змейка ускоряется.', code: SNAKE },
  { id: 'flappy', title: 'Птичка', re: /flappy|флэппи|флаппи|птичк|птиц/i, hint: 'Пробел / ↑ / тап — взмах крыльями',
    controls: 'пробел, ↑ или тап — взмах; P — пауза', desc: 'Пролетайте между трубами: проход становится уже, скорость растёт.', code: FLAPPY },
  { id: 'breakout', title: 'Арканоид', re: /арканоид|breakout|кирпич|ракетк|разбива\S*\s+блок/i, hint: 'Мышь / палец / ← → — платформа',
    controls: 'мышь, палец или ← → — платформа; P — пауза', desc: 'Разбейте все блоки мячом: три жизни, каждый уровень сложнее.', code: BREAKOUT },
  { id: 'shooter', title: 'Космобой', re: /космос|космическ|шутер|стрелялк|invader|инвейдер|звёздн|звездн|корабл/i, hint: 'Стрелки / мышь / палец — двигать корабль, стрельба автоматическая',
    controls: 'стрелки, A/D, мышь или палец — движение, огонь автоматический; P — пауза', desc: 'Сбивайте дроны, зигзаги и танки, собирайте бонус «P» — тройной выстрел.', code: SHOOTER },
  { id: 'tetris', title: 'Тетрис', re: /тетрис|tetris|падающ\S*\s+фигур/i, hint: '← → — двигать, ↑ — поворот, ↓ — вниз, пробел — сброс',
    controls: '← → — движение, ↑ — поворот, ↓ — ускорить, пробел — сбросить; на телефоне: тап — поворот, перетаскивание — движение, свайп вниз — сброс', desc: 'Классические падающие фигуры: линии, уровни, тень-подсказка и следующая фигура.', code: TETRIS },
].map(g => ({ ...g, html: build(g) }));

/* Подбор игры по тексту запроса (null — жанр не опознан). */
export function pickGame(text) {
  for (const g of GAMES) if (g.re.test(text || '')) return g;
  return null;
}

/* Определяет игру из нашей библиотеки по тексту прошлого ответа (по маркеру GAME_ID). */
export function gameFromText(text) {
  const m = /const GAME_ID='(\w+)'/.exec(text || '');
  return m ? GAMES.find(g => g.id === m[1]) || null : null;
}

/* Готовый ответ Bart с рабочей игрой. */
export function gameAnswer(g, generic) {
  const others = GAMES.filter(x => x.id !== g.id).map(x => x.title).join(', ');
  return (generic ? 'Жанр вы не назвали, поэтому вот «' + g.title + '». ' : 'Готово — игра «' + g.title + '». ') + g.desc + '\n\n```html index.html\n' + g.html + '```\n\n**Управление:** ' + g.controls
    + '. Рекорд сохраняется. Чтобы изменить игру — напишите, что поменять: тему, цвета, скорость, новые механики.'
    + (generic ? ' Другие готовые игры: ' + others + ' — просто назовите нужную.' : '');
}

/* Запрос без жанра («сделай игру»): подойдёт любая из готовых. */
export function randomGame() { return GAMES[Math.floor(Math.random() * GAMES.length)]; }
