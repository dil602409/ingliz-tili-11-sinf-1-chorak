/* =========================
   TEST PLATFORMASI — SCRIPT.JS
   + Google Sheets ga natijalarni yuborish
   + Timer va savollar progress bilan integratsiya
   + Test ID tekshiruvi qo‘shildi
   + Faqat tanlangan savollar (mas: 10 ta) ko‘rsatiladi
   ========================= */

const TEST_DURATION_PER_QUESTION = 150; // har bir savol uchun soniya
const TOTAL_TO_SHOW = 20; // ❗ ko‘rsatish uchun savollar soni

const state = {
  name: { first: "", last: "" },
  idx: 0,
  answers: [],
  startedAt: null,
  totalSeconds: 0,
  shuffledOrder: [],
  timerInterval: null,
  timeLeft: 0
};

/* DOM elementlar */
const startScreen = document.getElementById('startScreen');
const beginBtn = document.getElementById('beginBtn');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const testIdInput = document.getElementById('testId');
const testArea = document.getElementById('testArea');
const questionCard = document.getElementById('questionCard');
const currentNum = document.getElementById('currentNum');
const totalNum = document.getElementById('totalNum');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const finishBtn = document.getElementById('finishBtn');
const confirmFinishBtn = document.getElementById('confirmFinishBtn');
const timeDisplay = document.getElementById('timeDisplay');

/* Foydali funksiyalar */
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* =========================
   Test ID tekshiruvi
   ========================= */
async function validateTestID(testId){
  const url = 'https://raw.githubusercontent.com/dil602409/test-platformasi/main/test_ids.txt';
  try{
    const resp = await fetch(url);
    if(!resp.ok) throw new Error('Test ID faylini o‘qib bo‘lmadi');
    const data = await resp.text();
    const validIds = data.split('\n').map(id=>id.trim()).filter(id=>id);
    return validIds.includes(testId);
  } catch(e){
    console.error("Test ID tekshirishda xato:", e);
    alert("Test ID tekshirishda xatolik yuz berdi.");
    return false;
  }
}

/* =========================
   SAQLASH VA DAVOM ETTIRISH
   ========================= */
function saveProgress(){
  const data = {
    currentIndex: state.idx,
    answers: state.answers,
    timeLeft: state.timeLeft,
    shuffledOrder: state.shuffledOrder
  };
  localStorage.setItem("testProgress", JSON.stringify(data));
}

function loadProgress(){
  const saved = localStorage.getItem("testProgress");
  if(!saved) return false;
  try{
    const data = JSON.parse(saved);
    if(confirm("Oldingi test topildi. Davom ettirishni xohlaysizmi?")){
      state.idx = data.currentIndex;
      state.answers = data.answers;
      state.timeLeft = data.timeLeft;
      state.shuffledOrder = data.shuffledOrder;
      totalNum.textContent = state.shuffledOrder.length;
      renderQuestionByIndex(state.idx);
      startTimer(state.timeLeft);
      startScreen.style.display = 'none';
      testArea.style.display = 'block';
      return true;
    } else {
      localStorage.removeItem("testProgress");
      return false;
    }
  } catch(e){ console.error("Progress yuklashda xato:", e); return false; }
}

function clearProgress(){ localStorage.removeItem("testProgress"); }

/* =========================
   TEST TAYYORLASH — tasodifiy 10 ta savol
   ========================= */
function prepareTest(){
  if(!state.shuffledOrder || state.shuffledOrder.length===0){
    const all = shuffle(QUESTIONS.map((_,i)=>i));
    state.shuffledOrder = all.slice(0, TOTAL_TO_SHOW);
  }
  if(!state.answers || state.answers.length!==state.shuffledOrder.length){
    state.answers = Array(state.shuffledOrder.length).fill(null);
  }
  totalNum.textContent = state.shuffledOrder.length;
  if(!state.totalSeconds) state.totalSeconds = Math.round(TEST_DURATION_PER_QUESTION * state.shuffledOrder.length);
  if(!state.timeLeft) state.timeLeft = state.totalSeconds;
}

/* =========================
   SAVOLNI RENDER QILISH
   ========================= */
function renderQuestionByIndex(orderIndex){
  const qIndex = state.shuffledOrder[orderIndex];
  const q = QUESTIONS[qIndex];
  questionCard.innerHTML = '';

  const qTitle = document.createElement('div');
  qTitle.className = 'question-text';
  qTitle.innerHTML = `<strong>(${escapeHtml(q.ballLabel)} - ${escapeHtml(String(q.ballValue))})</strong> ${escapeHtml(q.text)}`;
  questionCard.appendChild(qTitle);

  if(q.image){
    const img = document.createElement('img');
    img.className = 'q-image';
    img.src = q.image;
    img.alt = 'Question image';
    img.onerror = function(){ this.style.display='none'; };
    questionCard.appendChild(img);
  }

  const choices = document.createElement('div');
  choices.className = 'choices';
  q.choices.forEach((ch, ci)=>{
    const selected = state.answers[orderIndex]===ci;
    const choiceDiv = document.createElement('div');
    choiceDiv.className = 'choice';
    choiceDiv.innerHTML = `<label><input type="radio" name="q_${orderIndex}" value="${ci}" ${selected?'checked':''}/> <span>${String.fromCharCode(65+ci)}. ${escapeHtml(ch)}</span></label>`;
    choices.appendChild(choiceDiv);
  });
  questionCard.appendChild(choices);
  currentNum.textContent = orderIndex+1;
}

/* =========================
   JAVOBNI SAQLASH
   ========================= */
function saveCurrentSelection(){
  const radios = document.querySelectorAll(`#questionCard input[name='q_${state.idx}']`);
  radios.forEach(r=>{ if(r.checked) state.answers[state.idx]=Number(r.value); });
  saveProgress();
}

/* =========================
   NAVIGATSIYA
   ========================= */
prevBtn.addEventListener('click', ()=>{
  saveCurrentSelection();
  if(state.idx>0){ state.idx--; renderQuestionByIndex(state.idx); }
});
nextBtn.addEventListener('click', ()=>{
  saveCurrentSelection();
  if(state.idx<state.shuffledOrder.length-1){ state.idx++; renderQuestionByIndex(state.idx); }
});

/* =========================
   TESTNI BOSHLASH — ID tekshiriladi
   ========================= */
beginBtn.addEventListener('click', async ()=>{
  const f = firstNameInput.value.trim();
  const l = lastNameInput.value.trim();
  const testId = testIdInput.value.trim();

  if(!f || !l || !testId){
    alert('Iltimos, ism, familiya va Test ID ni kiriting.');
    return;
  }

  const isValid = await validateTestID(testId);
  if(!isValid){
    alert("Kiritilgan Test ID noto'g'ri yoki mavjud emas.");
    return;
  }

  state.name.first = f;
  state.name.last = l;
  startTest();
});

/* =========================
   TIMER
   ========================= */
function startTimer(totalSec){
  let remaining = totalSec;
  state.timeLeft = remaining;
  updateTimeDisplay(remaining);
  state.timerInterval = setInterval(()=>{
    remaining--;
    state.timeLeft = remaining;
    if(remaining<0){ clearInterval(state.timerInterval); autoFinish(); return; }
    updateTimeDisplay(remaining);
  },1000);
}
function updateTimeDisplay(sec){
  const m=Math.floor(sec/60), s=sec%60;
  timeDisplay.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  timeDisplay.style.color = sec<=60?'red':'';
}

/* =========================
   TESTNI BOSHLASH
   ========================= */
function startTest(){
  prepareTest();
  if(!state.idx) state.idx = 0;
  if(!state.startedAt) state.startedAt = Date.now();
  startScreen.style.display = 'none';
  testArea.style.display = 'block';
  renderQuestionByIndex(state.idx);
  startTimer(state.timeLeft);
}

/* =========================
   AVTOMATIK YAKUNLASH
   ========================= */
function autoFinish(){
  saveCurrentSelection();
  clearInterval(state.timerInterval);
  finalizeAndShowResult();
  testArea.style.display='none';
  document.getElementById('closedNotice').style.display='block';
}

/* =========================
   NATIJA HISOBLASH
   ========================= */
function calculateResults(){
  let totalCorrect=0, totalPoints=0;
  const counts={B:{count:0,points:0},Q:{count:0,points:0},M:{count:0,points:0}};
  const perQuestion = state.shuffledOrder.map((qIdx, i)=>{
    const q = QUESTIONS[qIdx];
    const sel = state.answers[i];
    const isCorrect = sel===q.correct;
    if(isCorrect){
      totalCorrect++;
      totalPoints+=Number(q.ballValue)||0;
      counts[q.ballLabel].count++;
      counts[q.ballLabel].points+=Number(q.ballValue)||0;
    }
    return {id:q.id, selected:sel, correct:q.correct, isCorrect, ballLabel:q.ballLabel, ballValue:q.ballValue};
  });
  const percent=Math.round((totalCorrect/state.shuffledOrder.length)*10000)/100;
  return { totalCorrect, totalPoints:Math.round(totalPoints*100)/100, counts, percent, perQuestion };
}
function gradeLabel(percent){ if(percent>=86) return "A'lo"; if(percent>=71) return "Yaxshi"; if(percent>=51) return "Qoniqarli"; return "Qoniqarsiz"; }

/* =========================
   Google Sheets ga natijani yuborish
   ========================= */
function sendToGoogleSheet(res){
  const url = "https://script.google.com/macros/s/AKfycbzEHdtRC-O9NWrLi1REUYn6CJthi6wZzWiTANIv6GtgfrsGE-1J5cDzhBubLqLW3cy4/exec";
  const data = {
    ism: state.name.first,
    familiya: state.name.last,
    savollar_soni: state.shuffledOrder.length,
    togri_javoblar: res.totalCorrect,
    B: res.counts.B.count,
    Q: res.counts.Q.count,
    M: res.counts.M.count,
    ball: res.totalPoints,
    foiz: res.percent,
    sana: new Date().toLocaleString()
  };
  fetch(url,{
    method:"POST",
    body: JSON.stringify(data)
  }).then(r=>r.text()).then(t=>console.log("Google Sheets:", t)).catch(e=>console.error("Google Sheets xato:", e));
}

/* =========================
   NATIJANI KO‘RSATISH
   ========================= */
function finalizeAndShowResult(){
  const res = calculateResults();
  sendToGoogleSheet(res);
  
  const fnameSafe = state.name.first+' '+state.name.last;
  const dateIso = new Date().toLocaleString();
  let rowsHtml = state.shuffledOrder.map((qIdx,i)=>{
    const q = QUESTIONS[qIdx];
    const pr=res.perQuestion[i];
    const selLabel=pr.selected===null?'-':String.fromCharCode(65+pr.selected);
    const correctLabel=String.fromCharCode(65+q.correct);
    const color=pr.isCorrect?'#e6ffef':(pr.selected===null?'#f8fafc':'#fff5f5');
    return `<tr style="background:${color}"><td>${q.id}</td><td>${escapeHtml(q.text)}</td><td style="text-align:center">${selLabel}</td><td style="text-align:center">${correctLabel}</td><td style="text-align:center">${q.ballLabel}-${q.ballValue}</td></tr>`;
  }).join('');

  const statCell = label=>{ 
    const c=res.counts[label]||{count:0,points:0}; 
    return `<div style="display:flex;flex-direction:column;align-items:center"><div style="font-weight:800;font-size:18px">${label}</div><div style="font-weight:700">${c.count} ta</div><div style="font-size:13px">${Math.round((c.points||0)*100)/100} ball</div></div>`; 
  };

  const resultHtml = `<!doctype html>
  <html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Natija — ${escapeHtml(fnameSafe)}</title>
  <style>body{font-family:Arial,sans-serif;background:#f5f5f5;padding:18px}.wrap{max-width:900px;margin:auto;background:white;padding:18px;border-radius:12px;box-shadow:0 10px 30px rgba(2,6,23,0.06)}h1{margin:0 0 6px;font-size:20px;color:#0b66ff}.stats{display:flex;gap:14px;justify-content:center;margin:18px 0}.big-score{font-size:46px;font-weight:900;text-align:center;margin:18px 0;color:#05263a}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}th{background:#0b66ff;color:white}</style></head>
  <body>
    <div class="wrap">
      <h1>OLTIARIQ IXTISOSLASHTIRILGAN MAKTABI</h1>
      <div>Fan: Ingliz tili — 8-sinf, 1-chorak<br>O'quvchi: ${escapeHtml(fnameSafe)}<br>Sanasi: ${escapeHtml(dateIso)}</div>
      <div class="stats">${statCell('B')}${statCell('Q')}${statCell('M')}</div>
      <div class="big-score">${Math.round(res.totalPoints*100)/100} ball</div>
      <div style="text-align:center;font-weight:700">${gradeLabel(res.percent)} (${res.percent}%)</div>
      <table><thead><tr><th>ID</th><th>Savol</th><th>Tanlangan</th><th>To'g'ri</th><th>Ball</th></tr></thead><tbody>${rowsHtml}</tbody></table>
    </div>
  </body></html>`;

  const wnd = window.open('','_blank');
  try{ wnd.document.open(); wnd.document.write(resultHtml); wnd.document.close(); }catch(e){ alert('Natija yangi oynada ochilmadi.'); }
  clearProgress();
}

/* =========================
   YAKUNLASH TUGMASI
   ========================= */
finishBtn.addEventListener('click', ()=>{ confirmFinishBtn.style.display='inline-block'; });
confirmFinishBtn.addEventListener('click', ()=>{
  saveCurrentSelection();
  clearInterval(state.timerInterval);
  finalizeAndShowResult();
  testArea.style.display='none';
  document.getElementById('closedNotice').style.display='block';
  confirmFinishBtn.style.display='none';
});

/* =========================
   KLAVIATURA NAVIGATSIYASI
   ========================= */
document.addEventListener('keydown', (e)=>{
  if(testArea.style.display!=='block') return;
  if(e.key==='ArrowRight') nextBtn.click();
  if(e.key==='ArrowLeft') prevBtn.click();
});

/* =========================
   Sahifa yuklanganda progressni tiklash
   ========================= */
window.addEventListener("load", ()=>{
  loadProgress();
});
