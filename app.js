// Minimal SPA + calendar + pomodoro + localStorage persistence
const temario = [
  {"num":4,"title":"Estatuto Marco del personal estatutario (Ley 55/2003)"},
  {"num":6,"title":"Planes estratégicos del SESCAM / Documentación clínica y registros"},
  {"num":7,"title":"Cuidados básicos de enfermería"},
  {"num":8,"title":"Higiene y aseo del paciente"},
  {"num":9,"title":"Movilización y traslado"},
  {"num":10,"title":"Constantes vitales"},
  {"num":11,"title":"Atención al paciente encamado"},
  {"num":12,"title":"Administración de alimentos / nutrición"},
  {"num":13,"title":"Eliminación urinaria e intestinal"},
  {"num":14,"title":"Oxigenoterapia y aspiración"},
  {"num":15,"title":"Atención al paciente terminal"},
  {"num":16,"title":"Cuidados post mortem"},
  {"num":17,"title":"Atención al anciano"},
  {"num":18,"title":"Esterilización, desinfección y limpieza"},
  {"num":19,"title":"Material sanitario y su reposición / quirófano"},
  {"num":20,"title":"Infecciones nosocomiales y aislamiento"},
  {"num":21,"title":"Farmacología básica para TCAE"},
  {"num":22,"title":"Prevención de riesgos laborales"},
  {"num":23,"title":"Residuos sanitarios"},
  {"num":24,"title":"Úlceras por presión y heridas"},
  {"num":25,"title":"Atención al paciente quirúrgico"},
  {"num":26,"title":"Atención al paciente crítico"},
  {"num":27,"title":"Salud mental y urgencias"},
  {"num":28,"title":"Bioética y confidencialidad"},
  {"num":29,"title":"Atención domiciliaria"},
  {"num":30,"title":"Calidad asistencial y satisfacción del usuario"}
];

const STORAGE_KEY = "plan_marisa_v1";
const defaultStart = "2025-10-31";

function loadState(){
  let s = localStorage.getItem(STORAGE_KEY);
  if(!s){
    const priority = [4,6,7,8,9,10,12,13,14,18,20,21,24,28];
    let schedule = {};
    let start = new Date(defaultStart);
    for(let i=0;i<180;i++){
      let d = new Date(start);
      d.setDate(start.getDate()+i);
      let key = d.toISOString().slice(0,10);
      let topic = temario[i % temario.length].num;
      if(i % 6 === 0) schedule[key] = [topic, 4];
      else schedule[key] = [topic];
    }
    let state = { schedule, completed: {}, tests: {}, repasos: {}, settings:{vol:0.5}, pom:{count:0} };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }
  return JSON.parse(s);
}
let state = loadState();

const qs = sel => document.querySelector(sel);
const qsa = sel => document.querySelectorAll(sel);

function formatDate(d){
  return d.toISOString().slice(0,10);
}

function renderToday(){
  const today = new Date();
  const key = formatDate(today);
  qs("#today-date").textContent = today.toLocaleDateString();
  const topics = state.schedule[key] || [];
  const ul = qs("#today-topics");
  ul.innerHTML = "";
  topics.forEach(n=>{
    const t = temario.find(x=>x.num===n);
    const li = document.createElement("li");
    li.textContent = `${t.num} - ${t.title}`;
    ul.appendChild(li);
  });
  const repList = qs("#repasos-list");
  repList.innerHTML = "";
  for(const r in state.repasos){
    if(state.repasos[r].includes(key)){
      const li = document.createElement("li");
      li.textContent = `Repaso: Tema ${r} programado hoy`;
      repList.appendChild(li);
    }
  }
  updateStats();
}

function updateStats(){
  const completedCount = Object.values(state.completed).flat().length;
  const testsCount = Object.keys(state.tests).length;
  const repPending = Object.keys(state.repasos).length;
  qs("#count-completed").textContent = completedCount;
  qs("#count-tests").textContent = testsCount;
  qs("#count-repasos").textContent = repPending;
  const percent = Math.min(100, Math.round((completedCount / temario.length) * 100));
  qs("#percent").textContent = percent + "%";
  qs("#meter").setAttribute("stroke-dasharray", `${percent},100`);
}

qsa(".nav-btn").forEach(btn=>{
  btn.addEventListener("click", e=>{
    qsa(".nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    qsa(".view").forEach(v=>v.classList.remove("active"));
    if(btn.id==="btn-today") qs("#view-today").classList.add("active");
    if(btn.id==="btn-calendar") qs("#view-calendar").classList.add("active");
    if(btn.id==="btn-progress") qs("#view-progress").classList.add("active");
    if(btn.id==="btn-settings") qs("#view-settings").classList.add("active");
    if(btn.id==="btn-calendar") renderCalendar();
  });
});

let calDate = new Date();
function renderCalendar(d=new Date()){
  calDate = new Date(d.getFullYear(), d.getMonth(), 1);
  qs("#month-year").textContent = calDate.toLocaleString('es-ES',{month:'long', year:'numeric'});
  const grid = qs("#calendar-grid");
  grid.innerHTML = "";
  const startDay = new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(calDate.getFullYear(), calDate.getMonth()+1, 0).getDate();
  for(let i=0;i<startDay;i++){
    const el = document.createElement("div");
    el.className="day empty";
    grid.appendChild(el);
  }
  for(let day=1; day<=daysInMonth; day++){
    const el = document.createElement("div");
    el.className="day";
    const date = new Date(calDate.getFullYear(), calDate.getMonth(), day);
    const key = date.toISOString().slice(0,10);
    const dateSpan = document.createElement("div");
    dateSpan.className="date";
    dateSpan.textContent = day;
    el.appendChild(dateSpan);
    const topics = state.schedule[key] || [];
    if(topics.length){
      const tag = document.createElement("div");
      tag.className="tag";
      tag.textContent = `T${topics[0]}`;
      if(state.completed[key] && state.completed[key].length>0) el.classList.add("green");
      else if(state.repasos[key]) el.classList.add("yellow");
      else if(state.sim && state.sim.includes(key)) el.classList.add("blue");
      grid.appendChild(el);
      el.appendChild(tag);
    } else {
      grid.appendChild(el);
    }
    el.addEventListener("click", ()=> openDayDetail(key));
  }
}

qs("#prev-month").addEventListener("click", ()=> {
  calDate.setMonth(calDate.getMonth()-1);
  renderCalendar(calDate);
});
qs("#next-month").addEventListener("click", ()=> {
  calDate.setMonth(calDate.getMonth()+1);
  renderCalendar(calDate);
});

function openDayDetail(key){
  const topics = state.schedule[key] || [];
  const title = topics.length ? `Día ${key} — Tema(s): ${topics.join(", ")}` : `Día ${key} — Sin tema`;
  const ok = confirm(`${title}

Abrir opciones para este día?
Aceptar=Marcar completado
Cancelar=Cerrar`);
  if(ok && topics.length){
    state.completed[key] = topics.map(t=>({topic:t, time: new Date().toISOString()}));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderCalendar();
    renderToday();
    alert("Marcado como completado. ¡Buen trabajo!");
  }
}

let pom = {running:false, remaining:50*60, mode:'study', count: state.pom.count || 0, paused:false};
let timerInterval = null;
function updateTimerDisplay(){
  const m = Math.floor(pom.remaining/60);
  const s = pom.remaining % 60;
  qs("#timer").textContent = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  qs("#pom-mode").textContent = pom.mode==="study" ? "Estudio" : "Descanso";
  qs("#pom-count").textContent = pom.count;
}
function startPom(){
  if(pom.running) return;
  pom.running = true;
  pom.paused = false;
  pom.remaining = pom.mode==="study"?50*60:10*60;
  timerInterval = setInterval(()=>{
    if(pom.paused) return;
    pom.remaining--;
    if(pom.remaining<=0){
      if(pom.mode==="study"){
        playSound("estudio");
        pom.mode="break";
        pom.remaining=10*60;
        pom.count++;
        state.pom.count = pom.count;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } else {
        playSound("descanso");
        pom.mode="study";
        pom.remaining=50*60;
      }
    }
    updateTimerDisplay();
  },1000);
}
function pausePom(){ pom.paused = !pom.paused; }
function stopPom(){ clearInterval(timerInterval); pom.running=false; pom.mode="study"; pom.remaining=50*60; updateTimerDisplay(); }

qs("#start-pom").addEventListener("click", startPom);
qs("#pause-pom").addEventListener("click", pausePom);
qs("#stop-pom").addEventListener("click", stopPom);

function playSound(kind){
  const vol = state.settings.vol || 0.5;
  const src = kind==="estudio" ? "sounds/estudio.wav" : "sounds/descanso.wav";
  const audio = new Audio(src);
  audio.volume = vol;
  audio.play();
}

qs("#open-test").addEventListener("click", ()=>{
  const today = formatDate(new Date());
  const topics = state.schedule[today] || [];
  if(topics.length===0){ alert("No hay test programado hoy."); return; }
  const topic = topics[0];
  alert(`Abre el chat con ChatGPT y pide: "Test Tema ${topic} SESCAM TCAE (5-10 preguntas)".
Cuando termines, registra tu resultado en 'Ver errores' para que lo guarde en el panel.`);
});

qs("#mark-completed").addEventListener("click", ()=>{
  const today = formatDate(new Date());
  const topics = state.schedule[today] || [];
  if(topics.length===0){ alert("No hay tema hoy."); return; }
  state.completed[today] = topics.map(t=>({topic:t,time:new Date().toISOString()}));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderToday();
  alert("Tema marcado como completado. ¡Buen trabajo!");
});

qs("#start-sim").addEventListener("click", ()=>{
  const ok = confirm("Iniciar simulacro de 50 preguntas ahora? (Se abrirá instrucción para ChatGPT)");
  if(ok){
    alert("Pide en el chat: 'Simulacro 50 preguntas temario TCAE SESCAM 4-30'. Yo te pondré el test aquí.");
    const today = formatDate(new Date());
    state.sim = state.sim || [];
    state.sim.push(today);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderToday();
  }
});

qs("#view-errors").addEventListener("click", ()=>{
  const errors = (state.tests && state.tests.errors) || [];
  if(!errors.length) alert("No tienes errores registrados aún.");
  else alert("Errores: 
" + errors.join("
"));
});

renderToday();
renderCalendar();
updateStats();
updateTimerDisplay();

qs("#btn-today").addEventListener("click", ()=>{ document.querySelector("#btn-today").click(); });
qs("#btn-calendar").addEventListener("click", ()=>{ document.querySelector("#btn-calendar").click(); });
qs("#btn-progress").addEventListener("click", ()=>{ document.querySelector("#btn-progress").click(); });
qs("#btn-settings").addEventListener("click", ()=>{ document.querySelector("#btn-settings").click(); });
// Ultimo refresh de prueba para Marisa PRO - 30/10
