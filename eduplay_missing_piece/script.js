const $ = (id) => document.getElementById(id);
const pages = {home:$("homePage"),game:$("gamePage"),report:$("reportPage")};
const catalog = [
  ["🎈","🌸","⚽","🐱","🚗","🍎","🦋","⭐","🐶","🍉","🚲","🌻"],
  ["🐸","🍓","🎁","🚌","🌈","🐰","🍌","🚀","🐠","🎨","🍪","🧸"],
  ["🦁","🍇","🎸","🐼","🚂","🌙","🍩","🦄","🏀","🐢","🌺","🎲"]
];
const state = {round:0,score:0,lives:3,streak:0,correct:0,answers:[],roundResults:[],current:null,phase:"memorize",timer:null,remaining:0,sound:true,locked:false};
const roundDuration = [5,5,5,5,5,4,4,4,4,4,3,3,3,3,3];
let roundStartedAt = 0;

function showPage(name){
  Object.entries(pages).forEach(([key,el])=>el.classList.toggle("active",key===name));
  document.querySelectorAll(".nav-btn").forEach(btn=>btn.classList.toggle("active",btn.dataset.page===name));
  if(name==="report") renderReport();
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-page]").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));
$("startBtn").addEventListener("click",startGame);
$("backHomeBtn").addEventListener("click",()=>showPage("home"));
$("restartBtn").addEventListener("click",startGame);
$("playAgainBtn").addEventListener("click",startGame);
$("printBtn").addEventListener("click",()=>window.print());
$("soundToggle").addEventListener("click",()=>{
  state.sound=!state.sound;
  $("soundToggle").textContent=state.sound?"🔊":"🔇";
});

function shuffle(arr){return [...arr].sort(()=>Math.random()-.5)}
function stageFor(index){return index<5?0:index<10?1:2}
function objectCount(index){return [4,5,6][stageFor(index)]}
function stageName(stage){return ["🌱 TAHAP 1 · DASAR","🌼 TAHAP 2 · MENENGAH","🚀 TAHAP 3 · MAHIR"][stage]}
function startGame(){
  clearInterval(state.timer);
  Object.assign(state,{round:0,score:0,lives:3,streak:0,correct:0,answers:[],roundResults:[],current:null,phase:"memorize",locked:false});
  showPage("game");
  beginRound();
}
function beginRound(){
  clearInterval(state.timer);
  if(state.round>=15 || state.lives<=0){finishGame();return}
  state.locked=false;
  const stage=stageFor(state.round), count=objectCount(state.round);
  const pool=shuffle(catalog[stage]);
  const objects=pool.slice(0,count);
  const missing=objects[Math.floor(Math.random()*objects.length)];
  const distractors=shuffle(catalog.flat().filter(x=>!objects.includes(x))).slice(0,3);
  state.current={objects,missing,choices:shuffle([missing,...distractors]),stage,count};
  state.phase="memorize";
  updateHud();
  $("stageLabel").textContent=stageName(stage);
  $("phaseLabel").textContent="FASE 1 · AMATI";
  $("instruction").textContent="Perhatikan semua benda berikut dan ingat baik-baik, ya!";
  $("answerArea").classList.add("hidden");
  $("nextBtn").classList.add("hidden");
  $("feedback").textContent="";
  $("feedback").className="feedback";
  $("timerCaption").textContent="Detik untuk mengamati";
  renderObjects(objects);
  runTimer(roundDuration[state.round],()=>showQuestion());
}
function renderObjects(objects){
  $("objectGrid").innerHTML=objects.map(item=>`<div class="object-tile" aria-label="Objek">${item}</div>`).join("");
}
function runTimer(seconds,done){
  clearInterval(state.timer);
  state.remaining=seconds;
  $("timerNumber").textContent=seconds;
  state.timer=setInterval(()=>{
    state.remaining--;
    $("timerNumber").textContent=Math.max(0,state.remaining);
    if(state.remaining<=0){clearInterval(state.timer);done()}
  },1000);
}
function showQuestion(){
  state.phase="guess";
  $("phaseLabel").textContent="FASE 2 · TEMUKAN";
  $("instruction").textContent="Satu benda menghilang! Benda mana yang tadi kamu lihat?";
  $("timerCaption").textContent="Pilih jawabanmu";
  $("timerNumber").textContent="❓";
  const {objects,missing,choices}=state.current;
  $("objectGrid").innerHTML=objects.map(item=>`<div class="object-tile ${item===missing?"missing-tile":""}">${item===missing?"?":item}</div>`).join("");
  $("answerArea").classList.remove("hidden");
  $("choiceGrid").innerHTML=choices.map((item,i)=>`<button class="choice-btn" data-choice="${item}" aria-label="Pilihan ${i+1}">${item}</button>`).join("");
  $("choiceGrid").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>checkAnswer(btn.dataset.choice,btn)));
  roundStartedAt=performance.now();
}
function checkAnswer(choice,button){
  if(state.locked)return;
  state.locked=true;
  const elapsed=(performance.now()-roundStartedAt)/1000;
  const isCorrect=choice===state.current.missing;
  $("choiceGrid").querySelectorAll("button").forEach(btn=>{
    btn.disabled=true;
    if(btn.dataset.choice===state.current.missing)btn.classList.add("correct");
  });
  if(isCorrect){
    state.correct++;state.streak++;
    const points=100+(state.streak-1)*10;
    state.score+=points;
    $("feedback").textContent=`Hebat! Jawabanmu benar. +${points} poin ⭐`;
    $("feedback").className="feedback good";
    button.classList.add("correct");
  }else{
    state.lives=Math.max(0,state.lives-1);state.streak=0;
    button.classList.add("wrong");
    $("feedback").textContent="Belum tepat. Tetap semangat, ayo coba lagi di ronde berikutnya!";
    $("feedback").className="feedback bad";
  }
  state.answers.push({round:state.round+1,stage:state.current.stage,correct:isCorrect,time:elapsed});
  state.roundResults.push({round:state.round+1,stage:state.current.stage,correct:isCorrect,time:elapsed});
  updateHud();
  $("nextBtn").classList.remove("hidden");
  $("nextBtn").textContent=state.round===14||state.lives===0?"Lihat Rapor ➜":"Lanjutkan ➜";
}
$("nextBtn").addEventListener("click",()=>{
  state.round++;
  if(state.round>=15||state.lives<=0){finishGame()}else{beginRound()}
});
function updateHud(){
  $("roundLabel").textContent=`${Math.min(state.round+1,15)} / 15`;
  $("scoreLabel").textContent=state.score;
  $("lifeLabel").textContent="❤️ ".repeat(state.lives)+"🤍 ".repeat(3-state.lives);
  $("streakLabel").textContent=`${state.streak} 🔥`;
  $("progressBar").style.width=`${state.answers.length/15*100}%`;
}
function finishGame(){
  clearInterval(state.timer);
  showPage("report");
}
function renderReport(){
  const total=state.answers.length;
  const accuracy=total?Math.round(state.correct/total*100):0;
  const avg=total?state.answers.reduce((sum,a)=>sum+a.time,0)/total:0;
  $("finalScore").textContent=state.score;
  $("accuracy").textContent=total?`${accuracy}%`:"—";
  $("correctCount").textContent=total?`${state.correct}/${total}`:"—";
  $("avgTime").textContent=total?`${avg.toFixed(1)} dtk`:"—";
  $("reportTitle").textContent=total?"Kamu Hebat!":"Rapor Permainan";
  $("reportMessage").textContent=total?`Kamu sudah menyelesaikan ${total} dari 15 ronde. Terus berlatih dan tingkatkan kemampuanmu!`:"Selesaikan permainan untuk melihat hasilmu di sini.";
  if(!total){$("stageResults").innerHTML='<p class="empty-report">Belum ada data permainan. Mulai permainan untuk melihat laporan.</p>';return}
  $("stageResults").innerHTML=[0,1,2].map(stage=>{
    const items=state.answers.filter(a=>a.stage===stage);
    const wins=items.filter(a=>a.correct).length;
    const pct=items.length?Math.round(wins/items.length*100):0;
    return `<article class="stage-result"><strong>${["🌱 Tahap 1 · Dasar","🌼 Tahap 2 · Menengah","🚀 Tahap 3 · Mahir"][stage]}</strong><p>${wins} benar dari ${items.length} ronde · Akurasi ${pct}%</p></article>`;
  }).join("");
}
