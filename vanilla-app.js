const root = document.getElementById('root');

const OFFLINE_SOUNDTRACKS = {
  'Lo-fi': 'Warm lo-fi room tone',
  'Rain': 'Soft rain ambience',
  'Café': 'Low café room ambience',
  'Deep Space': 'Slow deep-space drone',
  'Brown Noise': 'Steady brown-noise focus bed',
  'Piano': 'Gentle piano-like ambience'
};

const NAV = [
  ['dashboard','home','Home'],
  ['planner','calendar','Planner'],
  ['focus','focus','Focus'],
  ['progress','chart','Progress'],
  ['social','users','Social']
];

const SHOWCASE = [
  ['Why Stratify','One calm student-life system instead of scattered tools. Plan, focus, improve, repeat.','dashboard'],
  ['Planner','A real daily plan with clear next actions, completion tracking, and local persistence.','planner'],
  ['Strati Assistant','One offline command surface can add tasks, prepare focus, select ambience, and answer what is left.','dashboard'],
  ['Locked-In Focus','One goal, one timer, one soundtrack. No side quests until the session ends.','focus'],
  ['Progress','Simple signals turn completed work into useful feedback about consistency and focus time.','progress'],
  ['Social','Accountability without a distracting feed: presence, encouragement, and focused study together.','social']
];

const demoPlanner = [
  {id:'dinner',title:'Dinner',time:'18:30',date:'',type:'Personal',done:true},
  {id:'math',title:'Math homework',time:'19:00',date:'',type:'Homework',done:true},
  {id:'physics',title:'Physics · Electromagnetism',time:'19:40',date:'',type:'Study',done:false},
  {id:'chemistry',title:'Chemistry recall',time:'20:30',date:'',type:'Study',done:false},
  {id:'winddown',title:'Pack bag + wind down',time:'22:15',date:'',type:'Other',done:false}
];

const state = {
  section:'dashboard',
  data:null,
  peers:[
    {id:'demo1',name:'Nadia',lockedIn:true,subject:'Physics'},
    {id:'demo2',name:'Rafi',lockedIn:false,subject:'Chemistry'},
    {id:'demo3',name:'Maya',lockedIn:true,subject:'Biology'}
  ],
  stratiOpen:false,
  stratiMode:'study',
  stratiMessages:[],
  stratiBusy:false,
  showcaseStep:-1,
  focusTimer:null,
  toast:''
};

const defaultData = () => ({
  profile:{name:'User',grade:'Grade 10',curriculum:'National Curriculum — Science',goal:'Exam excellence'},
  plannerItems:demoPlanner.map(x=>({...x})),
  focus:{subject:'Physics',mode:'Practice',goal:'Complete Electromagnetism questions 1–10',duration:40,secondsLeft:2400,running:false,started:false,scratch:''},
  music:{modeLabel:'Lo-fi',playing:false},
  focusHistory:[]
});

const STORAGE_KEY = 'stratify_offline_competition_v2';
let audioCtx=null;
let audioNodes=[];

function escapeHtml(value=''){
  return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}
function attr(value=''){ return escapeHtml(value); }
function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
function uid(){ return `item-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }
function formatClock(seconds){ const s=Math.max(0,Number(seconds)||0); return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function initials(name='User'){ return name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase(); }

function icon(name){
  const paths={
    home:'<path d="M3.5 10.8 12 3.7l8.5 7.1v8.4a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8z"/><path d="M9 21v-7h6v7"/>',
    calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M7.5 3v4M16.5 3v4M3.5 9h17"/><path d="M7.5 13h3M13.5 13h3M7.5 17h3"/>',
    focus:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/>',
    chart:'<path d="M4 19.5V10M10 19.5V5M16 19.5v-7M22 19.5H2"/>',
    users:'<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.7 2.5-5.5 5.5-5.5s4.9 1.8 5.5 5.5"/><path d="M15.5 5.5a3 3 0 0 1 0 5.8M16.8 14c2.2.4 3.5 2 3.9 5"/>',
    sparkle:'<path d="m12 2 1.45 4.2L18 7.7l-4.55 1.5L12 13.5l-1.45-4.3L6 7.7l4.55-1.5z"/><path d="m18.5 14 .7 2 2.1.7-2.1.7-.7 2-.7-2-2.1-.7 2.1-.7z"/>',
    presentation:'<rect x="3" y="4" width="18" height="12.5" rx="2"/><path d="M8 20h8M12 16.5V20M7.5 12l3-3 2.2 2.1 4-4"/>',
    user:'<circle cx="12" cy="8" r="3.3"/><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"/>',
    arrow:'<path d="M5 12h13M14 7l5 5-5 5"/>',
    check:'<path d="m5 12.5 4 4L19 7"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    trash:'<path d="M4.5 7h15M9 7V4.5h6V7M7 7l.8 13h8.4L17 7M10 10.5v6M14 10.5v6"/>',
    flame:'<path d="M13.5 2.5c.7 3-1.8 4.3-1 6.3.5 1 1.7 1.3 2.8.5 1.5-1 2-2.9 1.8-4.7 2.3 2 3.9 4.2 3.9 7 0 4.1-3.2 7.2-7.2 7.2S5 18.7 5 14.7c0-3 1.7-5.5 4.6-7.8-.1 2 .7 3.5 2.2 4.2-.4-3.1.4-5.8 1.7-8.6Z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'
  };
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.sparkle}</svg>`;
}

function safeLoad(){
  try{ const raw=localStorage.getItem(STORAGE_KEY); return raw?JSON.parse(raw):null; }catch{return null;}
}
function saveState(){ if(!state.data)return; try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.data));}catch{} }
function bootstrapOffline(){
  try{if(new URLSearchParams(location.search).has('reset')) localStorage.removeItem(STORAGE_KEY);}catch{}
  const stored=safeLoad()||{};
  state.data={...defaultData(),...stored};
  state.data.profile={...defaultData().profile,...(stored.profile||{}),name:'User'};
  state.data.plannerItems=Array.isArray(stored.plannerItems)&&stored.plannerItems.length?stored.plannerItems:demoPlanner.map(x=>({...x}));
  state.data.focus={...defaultData().focus,...(stored.focus||{}),running:false,started:false};
  state.data.music={...defaultData().music,...(stored.music||{}),playing:false};
  state.data.focusHistory=Array.isArray(stored.focusHistory)?stored.focusHistory:[];
  render();
}

function showToast(message){ state.toast=message;render();clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>{state.toast='';render();},1800); }
function stopAmbientAudio(){ for(const node of audioNodes){try{node.stop?.();}catch{}try{node.disconnect?.();}catch{}} audioNodes=[];if(state.data?.music)state.data.music.playing=false; }
function makeNoise(ctx,seconds=2){const b=ctx.createBuffer(1,ctx.sampleRate*seconds,ctx.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.35;const s=ctx.createBufferSource();s.buffer=b;s.loop=true;return s;}
function startAmbientAudio(label){
  stopAmbientAudio();const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx){showToast('Audio is unavailable in this browser.');return;}
  audioCtx=audioCtx||new Ctx();if(audioCtx.state==='suspended')audioCtx.resume();
  const gain=audioCtx.createGain();gain.gain.value=.055;gain.connect(audioCtx.destination);audioNodes.push(gain);
  if(['Rain','Café','Brown Noise'].includes(label)){const noise=makeNoise(audioCtx);const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=label==='Rain'?1400:label==='Café'?700:350;noise.connect(filter);filter.connect(gain);noise.start();audioNodes.push(noise,filter);}else{const base=label==='Deep Space'?82:label==='Piano'?261.63:174.61;[1,1.5,2].forEach((ratio,i)=>{const osc=audioCtx.createOscillator();const g=audioCtx.createGain();osc.type=label==='Lo-fi'?'triangle':'sine';osc.frequency.value=base*ratio;g.gain.value=.025/(i+1);osc.connect(g);g.connect(gain);osc.start();audioNodes.push(osc,g);});}
  state.data.music.playing=true;saveState();render();
}
function toggleAmbientAudio(){const music=state.data.music;if(music.playing){stopAmbientAudio();saveState();render();showToast('Soundtrack paused.');}else{startAmbientAudio(music.modeLabel);showToast(`${music.modeLabel} ambient playing.`);}}

function appShell(content){
  const locked=Boolean(state.data?.focus?.started);
  const current=NAV.find(([id])=>id===state.section)?.[2] || (state.section==='profile'?'Profile':'Home');
  return `<div class="app-shell ${locked?'locked-mode':''}">
    <aside class="nav-rail">
      <button class="brand" data-nav="dashboard" aria-label="Stratify Home"><span class="brand-glyph"><i></i><i></i><i></i></span><span class="brand-word">STRATIFY</span></button>
      <div class="rail-label">STUDENT LIFE OS</div>
      <nav class="rail-nav">${NAV.map(([id,ico,label])=>`<button class="rail-link ${state.section===id?'active':''}" data-nav="${id}">${icon(ico)}<span>${label}</span></button>`).join('')}</nav>
      <div class="rail-spacer"></div>
      <button class="showcase-button" data-action="showcase">${icon('presentation')}<span><strong>Showcase</strong><small>Judge mode</small></span></button>
      <button class="profile-chip ${state.section==='profile'?'active':''}" data-nav="profile"><span class="avatar">US</span><span><strong>User</strong><small>${escapeHtml(state.data.profile?.grade||'Student')}</small></span>${icon('arrow')}</button>
    </aside>
    <section class="workspace">
      <header class="topbar"><div class="mobile-brand"><span class="brand-glyph mini"><i></i><i></i><i></i></span><strong>STRATIFY</strong></div><div class="crumb"><span>STRATIFY</span><b>/</b><strong>${escapeHtml(current)}</strong></div><div class="top-actions">${locked?'<span class="locked-pill">● LOCKED IN</span>':''}<button class="strati-button" data-action="strati">${icon('sparkle')}<span>Ask Strati</span></button><button class="avatar-button" data-nav="profile">US</button></div></header>
      ${content}
    </section>
    ${state.stratiOpen?stratiModal():''}${state.showcaseStep>=0?showcaseOverlay():''}${state.toast?`<div class="toast">${escapeHtml(state.toast)}</div>`:''}
  </div>`;
}

function homePage(){
  const items=state.data.plannerItems||[];const done=items.filter(x=>x.done).length;const percent=items.length?Math.round(done/items.length*100):0;const next=items.find(x=>!x.done);const left=items.filter(x=>!x.done).slice(0,3);
  const hour=new Date().getHours();const part=hour<12?'morning':hour<18?'afternoon':'evening';
  return `<main class="page home-page">
    <section class="page-hero home-hero"><div class="hero-copy"><span class="kicker">YOUR STUDENT LIFE, IN LAYERS</span><h1>Good ${part}, User.</h1><p>Turn a crowded day into one clear next move.</p><div class="hero-actions"><button class="btn primary" data-action="focus-next">Start next focus ${icon('arrow')}</button><button class="btn secondary" data-nav="planner">Open planner</button></div></div><div class="orbit-card"><div class="orbit-ring" style="--p:${percent}"><div><strong>${percent}%</strong><span>day aligned</span></div></div><p>${done} of ${items.length} planned layers complete</p></div></section>
    <section class="home-bento">
      <article class="strata-card system-card"><div class="card-top"><span class="kicker">THE STRATIFY LOOP</span><span class="status-dot">LIVE</span></div><h2>One system. Four deliberate moves.</h2><div class="layer-flow"><div><span>01</span><b>PLAN</b><small>Make the next move visible.</small></div><i></i><div><span>02</span><b>FOCUS</b><small>Protect one task from noise.</small></div><i></i><div><span>03</span><b>IMPROVE</b><small>Read what your work reveals.</small></div><i></i><div><span>04</span><b>REPEAT</b><small>Build consistency, not chaos.</small></div></div></article>
      <article class="strata-card task-preview"><div class="card-top"><span class="kicker">TODAY'S LAYERS</span><button class="text-link" data-nav="planner">See all ${icon('arrow')}</button></div><div class="mini-tasks">${left.length?left.map((x,i)=>`<div><span class="mini-index">${String(i+1).padStart(2,'0')}</span><p><strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.time||'Any time')} · ${escapeHtml(x.type)}</small></p></div>`).join(''):'<div class="empty-state">All planned layers are complete.</div>'}</div></article>
      <article class="strata-card next-card"><span class="kicker">UP NEXT</span><div class="next-icon">${icon('focus')}</div><h2>${next?escapeHtml(next.title):'You are clear.'}</h2><p>${next?`${escapeHtml(next.time||'Any time')} · ${escapeHtml(next.type)}`:'Nothing unfinished right now.'}</p><button class="btn inverse full" data-action="focus-next">Prepare Locked-In ${icon('arrow')}</button></article>
      <article class="strata-card momentum-card"><span class="kicker">MOMENTUM</span><div class="momentum-value"><strong>${done}</strong><span>completed today</span></div><div class="micro-bars">${[45,70,54,86,64,92,percent].map((v,i)=>`<i style="height:${Math.max(18,v)}%" class="${i===6?'active':''}"></i>`).join('')}</div><p>Consistency grows from finishing the plan you already made.</p></article>
    </section>
  </main>`;
}

function plannerPage(){
  const items=state.data.plannerItems||[];const done=items.filter(x=>x.done).length;const pct=items.length?Math.round(done/items.length*100):0;
  return `<main class="page planner-page">
    <section class="page-hero planner-hero"><div class="hero-copy"><span class="kicker">PLAN WITH INTENT</span><h1>Planner</h1><p>Build a day that tells you what to do next—not a list that makes you feel behind.</p></div><div class="hero-stat"><strong>${done}/${items.length}</strong><span>complete</span><div class="thin-progress"><i style="width:${pct}%"></i></div></div></section>
    <section class="planner-layout">
      <article class="strata-card planner-stack"><div class="card-top"><div><span class="kicker">TODAY</span><h2>Your study stack</h2></div><span class="pill brand-soft">${pct}% aligned</span></div><div class="task-stack">${items.map((item,i)=>`<div class="task-row ${item.done?'done':''}"><button class="task-toggle" data-toggle-task="${attr(item.id)}"><span class="check-box">${item.done?icon('check'):''}</span><span class="task-time">${escapeHtml(item.time||'—')}</span><span class="task-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.type||'Other')}${item.date?` · ${escapeHtml(item.date)}`:''}</small></span></button><button class="icon-button danger" data-delete-task="${attr(item.id)}" aria-label="Delete ${attr(item.title)}">${icon('trash')}</button></div>`).join('')}</div></article>
      <aside class="planner-side"><article class="strata-card add-card"><div class="card-top"><div><span class="kicker">ADD A LAYER</span><h2>Make it concrete.</h2></div><span class="round-icon">${icon('plus')}</span></div><form id="planner-form" class="planner-form"><label>Task<input class="input" name="title" placeholder="e.g. Biology chapter 4" required></label><div class="form-split"><label>Type<select class="input" name="type">${['Study','Homework','Meal','Personal','Break','Other'].map(x=>`<option>${x}</option>`).join('')}</select></label><label>Time<input class="input" name="time" type="time"></label></div><label>Date<input class="input" name="date" type="date"></label><button class="btn primary full" type="submit">Add to planner ${icon('arrow')}</button></form></article><article class="strata-card strati-suggest"><span class="kicker">STRATI'S NEXT MOVE</span><h3>${escapeHtml(items.find(x=>!x.done)?.title||'Plan complete')}</h3><p>${items.find(x=>!x.done)?'The next unfinished layer is already clear.':'Everything currently planned is complete.'}</p><button class="btn secondary full" data-action="strati">Tell Strati my situation</button></article></aside>
    </section>
  </main>`;
}

function focusPage(){
  const f=state.data.focus;const music=state.data.music||{modeLabel:'Lo-fi',playing:false};
  const pct=f.duration?Math.round((1-f.secondsLeft/(f.duration*60))*100):0;
  return `<main class="page focus-page ${f.started?'immersive':''}">
    <section class="page-hero focus-hero"><div class="hero-copy"><span class="kicker">${f.started?'NO SIDE QUESTS':'LOCKED-IN MODE'}</span><h1>${f.started?'Stay with the one thing.':'Focus without friction.'}</h1><p>${escapeHtml(f.goal)}</p></div><span class="focus-state ${f.started?'on':''}">${f.started?'● SESSION ACTIVE':'READY TO LOCK IN'}</span></section>
    <section class="focus-layout"><article class="focus-stage"><div class="focus-orbit" style="--focus-progress:${pct}"><div class="orbit-arc"></div><div class="orbit-inner"><span>${escapeHtml(f.subject)}</span><strong class="focus-timer">${formatClock(f.secondsLeft)}</strong><small>${escapeHtml(f.mode)} · ${f.started?'Locked In':'Ready'}</small></div></div><p class="focus-goal">${escapeHtml(f.goal)}</p><div class="focus-actions">${!f.started?`<button class="btn primary large" data-action="focus-start">Enter Locked-In ${icon('arrow')}</button>`:`<button class="btn primary" data-action="focus-toggle">${f.running?'Pause':'Resume'}</button><button class="btn secondary" data-action="focus-complete">Complete session</button><button class="text-danger" data-action="focus-exit">Exit session</button>`}</div></article>
      <article class="strata-card blueprint-card"><div class="card-top"><div><span class="kicker">SESSION BLUEPRINT</span><h2>Define the one thing.</h2></div>${icon('focus')}</div><label>Subject<select id="focus-subject" class="input" ${f.started?'disabled':''}>${['Physics','Mathematics','Chemistry','Biology','English','ICT'].map(s=>`<option ${s===f.subject?'selected':''}>${s}</option>`).join('')}</select></label><label>Mode<select id="focus-mode" class="input" ${f.started?'disabled':''}>${['Learn','Practice','Revise','Assignment'].map(s=>`<option ${s===f.mode?'selected':''}>${s}</option>`).join('')}</select></label><label>Goal<textarea id="focus-goal" class="input textarea" ${f.started?'disabled':''}>${escapeHtml(f.goal)}</textarea></label><div class="duration-row">${[15,25,35,40,50].map(d=>`<button class="duration-chip ${d===f.duration?'selected':''}" data-duration="${d}" ${f.started?'disabled':''}><strong>${d}</strong><span>min</span></button>`).join('')}</div></article></section>
    <section class="focus-bottom"><article class="strata-card soundtrack-card"><div class="card-top"><div><span class="kicker">AMBIENCE LAYER</span><h2>${escapeHtml(music.modeLabel)}</h2></div><span class="pill brand-soft">OFFLINE</span></div><div class="sound-grid">${Object.keys(OFFLINE_SOUNDTRACKS).map(name=>`<button class="sound-chip ${name===music.modeLabel?'selected':''}" data-music="${attr(name)}"><span class="sound-wave"><i></i><i></i><i></i></span>${escapeHtml(name)}</button>`).join('')}</div><div class="now-playing"><div class="audio-bars ${music.playing?'playing':''}">${Array.from({length:14},(_,i)=>`<i style="--h:${22+((i*19)%65)}%"></i>`).join('')}</div><p><strong>${escapeHtml(OFFLINE_SOUNDTRACKS[music.modeLabel])}</strong><small>Generated locally in your browser.</small></p><button class="btn ${music.playing?'secondary':'primary'}" data-action="music-toggle">${music.playing?'Pause':'Play ambient'}</button></div></article>${f.started?`<article class="strata-card scratch-card"><span class="kicker">PARK THE THOUGHT</span><h2>Scratchpad</h2><p>Write it down without leaving the session.</p><textarea id="focus-scratch" class="input textarea tall" placeholder="Formula, question, idea…">${escapeHtml(f.scratch||'')}</textarea></article>`:''}</section>
  </main>`;
}

function progressPage(){
  const items=state.data.plannerItems||[];const completion=items.length?Math.round(items.filter(x=>x.done).length/items.length*100):0;const history=state.data.focusHistory||[];const minutes=history.reduce((a,x)=>a+(x.minutes||0),0);const consistency=clamp(58+history.length*5+items.filter(x=>x.done).length*3,0,96);
  const bars=[38,52,46,68,58,78,Math.max(20,consistency)];
  return `<main class="page progress-page"><section class="page-hero progress-hero"><div class="hero-copy"><span class="kicker">PROGRESS, WITHOUT THE WALL STREET DASHBOARD</span><h1>Read the pattern.</h1><p>Use a few meaningful signals to decide what to improve next.</p></div><div class="progress-spark">${bars.map((v,i)=>`<i style="height:${v}%" class="${i===bars.length-1?'active':''}"></i>`).join('')}<span>7-day momentum</span></div></section>
    <section class="metric-grid"><article class="metric-tile"><span>CONSISTENCY</span><strong>${consistency}%</strong><small>plan → action</small><div class="metric-line"><i style="width:${consistency}%"></i></div></article><article class="metric-tile"><span>FOCUS TIME</span><strong>${Math.floor(minutes/60)}h ${minutes%60}m</strong><small>completed sessions</small></article><article class="metric-tile"><span>COMPLETION</span><strong>${completion}%</strong><small>today's planner</small><div class="metric-line"><i style="width:${completion}%"></i></div></article><article class="metric-tile"><span>STRONGEST SIGNAL</span><strong>Physics</strong><small>current focus subject</small></article></section>
    <section class="progress-layout"><article class="strata-card insight-card"><span class="kicker">ONE USEFUL INSIGHT</span><div class="insight-mark">⌁</div><h2>Protect your best focus window.</h2><p>Your strongest pattern is consistency when you begin with one clear task. Keep the hardest analytical work inside a protected 40–50 minute block.</p><div class="insight-action"><span>${icon('clock')} 7:30–9:00 PM</span><button class="text-link" data-nav="focus">Prepare focus ${icon('arrow')}</button></div></article><article class="strata-card history-card"><div class="card-top"><div><span class="kicker">RECENT FOCUS</span><h2>Completed sessions</h2></div><span class="pill brand-soft">${history.length} total</span></div><div class="history-list">${history.length?history.slice(-6).reverse().map((x,i)=>`<div><span class="history-dot"></span><p><strong>${escapeHtml(x.subject)}</strong><small>Locked-In session</small></p><b>${x.minutes} min</b></div>`).join(''):'<div class="empty-state">Complete your first Locked-In session and it will appear here.</div>'}</div></article></section>
  </main>`;
}

function socialPage(){
  const people=state.peers||[];const locked=people.filter(x=>x.lockedIn).length;
  return `<main class="page social-page"><section class="page-hero social-hero"><div class="hero-copy"><span class="kicker">ACCOUNTABILITY, NOT ANOTHER FEED</span><h1>Study near people who are also trying.</h1><p>Presence and encouragement without infinite scrolling.</p></div><div class="social-pulse"><span class="pulse-core">${locked}</span>${people.map((p,i)=>`<i class="pulse-person p${i+1}">${initials(p.name)}</i>`).join('')}<small>friends locked in now</small></div></section>
    <section class="social-layout"><article class="strata-card presence-card"><div class="card-top"><div><span class="kicker">STUDY PRESENCE</span><h2>Your circle</h2></div><span class="pill success">OFFLINE DEMO</span></div><div class="people-list">${people.map(p=>`<div class="person-row"><span class="avatar large">${initials(p.name)}</span><div><strong>${escapeHtml(p.name)}</strong><small>${p.lockedIn?`Locked in · ${escapeHtml(p.subject)}`:`Available · ${escapeHtml(p.subject)}`}</small></div><span class="presence-state ${p.lockedIn?'locked':''}">${p.lockedIn?'FOCUSING':'OPEN'}</span><button class="icon-button encourage" data-encourage="${attr(p.name)}" aria-label="Encourage ${attr(p.name)}">${icon('flame')}</button></div>`).join('')}</div></article><article class="strata-card no-feed-card"><span class="kicker">DESIGN PRINCIPLE</span><h2>No feed.<br>No follower count.<br>No performance theatre.</h2><p>Stratify Social exists for one reason: make it easier to keep a study promise.</p><div class="quiet-actions"><div><strong>01</strong><span>See who is studying</span></div><div><strong>02</strong><span>Send one-tap encouragement</span></div><div><strong>03</strong><span>Join your own focus session</span></div></div><button class="btn primary full" data-nav="focus">Open Locked-In ${icon('arrow')}</button></article></section>
  </main>`;
}

function profilePage(){
  return `<main class="page profile-page"><section class="page-hero profile-hero"><div class="hero-copy"><span class="kicker">YOUR STRATIFY</span><h1>Built around the student.</h1><p>A lightweight offline competition profile with no account barrier.</p></div><div class="profile-monogram">US</div></section><section class="profile-grid"><article class="strata-card identity-card"><span class="kicker">STUDENT PROFILE</span><div class="identity-row"><span class="avatar xl">US</span><div><h2>User</h2><p>${escapeHtml(state.data.profile?.grade||'Student')}</p></div></div><dl><div><dt>Curriculum</dt><dd>${escapeHtml(state.data.profile?.curriculum||'')}</dd></div><div><dt>Goal</dt><dd>${escapeHtml(state.data.profile?.goal||'')}</dd></div></dl><div class="profile-principles"><div><b>01</b><span><strong>Zero login barrier</strong><small>Open and demonstrate immediately.</small></span></div><div><b>02</b><span><strong>Offline persistence</strong><small>Planner and progress stay in the browser.</small></span></div><div><b>03</b><span><strong>Student-first scope</strong><small>Five focused areas instead of feature overload.</small></span></div></div></article><article class="strata-card stack-card"><span class="kicker">TECH STACK</span><h2>Pure vanilla web.</h2><div class="tech-pills"><span>HTML</span><span>CSS</span><span>JavaScript</span><span>localStorage</span><span>Web Audio API</span></div><p>No framework. No server required. The competition build runs locally and keeps Planner, Focus and Progress data in the browser.</p></article><article class="strata-card philosophy-card"><span class="kicker">PRODUCT PHILOSOPHY</span><h2>Less surface area.<br>More student clarity.</h2><p>Five focused areas: Planner, Strati, Focus, Progress and Social.</p></article></section></main>`;
}

function stratiModal(){
  const consultant=state.stratiMode==='consultant';
  return `<div class="modal-backdrop"><section class="strati-panel"><header class="strati-head"><div class="strati-mark">${icon('sparkle')}</div><div><span class="kicker">STRATI · OFFLINE COMMAND SURFACE</span><h2>${consultant?'Consultant mode':'Study Buddy'}</h2><p>${consultant?'Supportive guidance for workload, motivation and realistic next steps.':'Operate Planner, Focus, ambience, and your next move from one place.'}</p></div><button class="close-button" data-action="strati-close" aria-label="Close">×</button></header><div class="mode-tabs"><button class="${!consultant?'active':''}" data-strati-mode="study">${icon('sparkle')} Study Buddy</button><button class="${consultant?'active':''}" data-strati-mode="consultant">♡ Consultant</button></div><div class="chat-area">${state.stratiMessages.length?state.stratiMessages.map(msg=>`<div class="chat-message ${msg.role==='user'?'user':'assistant'}"><span>${msg.role==='user'?'YOU':'STRATI'}</span><p>${escapeHtml(msg.content)}</p></div>`).join(''):`<div class="empty-chat"><div class="strati-orb">✦</div><h3>${consultant?'What feels heavy right now?':'Tell me what is happening today.'}</h3><p>${consultant?'I’ll help you reduce it to one manageable next step.':'Try “Add Biology revision at 7 PM” or “Start 25 minute Physics focus”.'}</p></div>`}</div><form id="strati-form" class="chat-compose"><textarea name="message" class="input" rows="2" placeholder="Type a command or question…"></textarea><button class="send-button" type="submit" ${state.stratiBusy?'disabled':''}>${state.stratiBusy?'…':icon('arrow')}</button></form><footer class="strati-footer"><span>${consultant?'Supportive guidance — not therapy or medical care.':'Works locally for competition demonstration.'}</span><button class="text-link" data-action="showcase">Open Showcase</button></footer></section></div>`;
}

function showcaseOverlay(){
  const [title,copy]=SHOWCASE[state.showcaseStep];
  return `<div class="showcase-overlay"><div class="showcase-light"></div><button class="showcase-exit" data-action="showcase-close">× EXIT</button><section class="showcase-panel"><span class="showcase-number">${String(state.showcaseStep+1).padStart(2,'0')}</span><span class="kicker">SHOWCASE MODE · ${String(state.showcaseStep+1).padStart(2,'0')} / ${String(SHOWCASE.length).padStart(2,'0')}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p><div class="showcase-steps">${SHOWCASE.map((_,i)=>`<i class="${i<=state.showcaseStep?'active':''}"></i>`).join('')}</div><div class="showcase-actions">${state.showcaseStep>0?'<button class="btn secondary" data-showcase-step="-1">← Back</button>':'<span></span>'}<button class="btn primary" data-showcase-step="1">${state.showcaseStep<SHOWCASE.length-1?'Next step':'Finish'} ${icon('arrow')}</button></div></section></div>`;
}

function render(){
  let page='';
  if(state.section==='planner')page=plannerPage();else if(state.section==='focus')page=focusPage();else if(state.section==='progress')page=progressPage();else if(state.section==='social')page=socialPage();else if(state.section==='profile')page=profilePage();else page=homePage();
  root.innerHTML=appShell(page);bindApp();
}
function navigate(section){if(state.data?.focus?.started&&section!=='focus'){showToast('Locked-In session active. No side quests.');return;}state.section=section;state.showcaseStep=-1;render();window.scrollTo({top:0,left:0,behavior:'instant'});document.querySelector('.workspace')?.scrollTo({top:0,left:0,behavior:'instant'});}

function bindApp(){
  root.querySelectorAll('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.nav)));
  root.querySelectorAll('[data-action="strati"]').forEach(btn=>btn.addEventListener('click',openStrati));
  root.querySelector('[data-action="strati-close"]')?.addEventListener('click',()=>{state.stratiOpen=false;render();});
  root.querySelectorAll('[data-action="showcase"]').forEach(btn=>btn.addEventListener('click',()=>{state.stratiOpen=false;state.showcaseStep=0;state.section=SHOWCASE[0][2];render();}));
  root.querySelectorAll('[data-action="showcase-close"]').forEach(btn=>btn.addEventListener('click',()=>{state.showcaseStep=-1;render();}));
  root.querySelectorAll('[data-showcase-step]').forEach(btn=>btn.addEventListener('click',()=>{const d=Number(btn.dataset.showcaseStep);const next=state.showcaseStep+d;if(next>=SHOWCASE.length)state.showcaseStep=-1;else if(next>=0){state.showcaseStep=next;state.section=SHOWCASE[next][2];}render();}));
  root.querySelector('#planner-form')?.addEventListener('submit',addPlannerItem);
  root.querySelectorAll('[data-toggle-task]').forEach(btn=>btn.addEventListener('click',()=>toggleTask(btn.dataset.toggleTask)));
  root.querySelectorAll('[data-delete-task]').forEach(btn=>btn.addEventListener('click',()=>deleteTask(btn.dataset.deleteTask)));
  root.querySelectorAll('[data-action="focus-next"]').forEach(btn=>btn.addEventListener('click',prepareNextFocus));
  root.querySelector('[data-action="focus-start"]')?.addEventListener('click',startFocus);
  root.querySelector('[data-action="focus-toggle"]')?.addEventListener('click',toggleFocus);
  root.querySelector('[data-action="focus-complete"]')?.addEventListener('click',completeFocus);
  root.querySelector('[data-action="focus-exit"]')?.addEventListener('click',exitFocus);
  root.querySelector('#focus-subject')?.addEventListener('change',e=>{state.data.focus.subject=e.target.value;saveState();});
  root.querySelector('#focus-mode')?.addEventListener('change',e=>{state.data.focus.mode=e.target.value;saveState();});
  root.querySelector('#focus-goal')?.addEventListener('input',e=>{state.data.focus.goal=e.target.value;saveState();});
  root.querySelector('#focus-scratch')?.addEventListener('input',e=>{state.data.focus.scratch=e.target.value;saveState();});
  root.querySelectorAll('[data-duration]').forEach(btn=>btn.addEventListener('click',()=>{const d=Number(btn.dataset.duration);Object.assign(state.data.focus,{duration:d,secondsLeft:d*60});saveState();render();}));
  root.querySelectorAll('[data-music]').forEach(btn=>btn.addEventListener('click',()=>{const was=state.data.music.playing;state.data.music.modeLabel=btn.dataset.music;saveState();if(was)startAmbientAudio(btn.dataset.music);else render();}));
  root.querySelector('[data-action="music-toggle"]')?.addEventListener('click',toggleAmbientAudio);
  root.querySelectorAll('[data-encourage]').forEach(btn=>btn.addEventListener('click',()=>showToast(`Encouragement sent to ${btn.dataset.encourage} 🔥`)));
  root.querySelectorAll('[data-strati-mode]').forEach(btn=>btn.addEventListener('click',()=>{state.stratiMode=btn.dataset.stratiMode;state.stratiMessages=[];render();}));
  root.querySelector('#strati-form')?.addEventListener('submit',sendStratiMessage);
}

async function addPlannerItem(e){e.preventDefault();const form=new FormData(e.currentTarget);const title=String(form.get('title')||'').trim();if(!title)return;state.data.plannerItems.push({id:uid(),title,type:String(form.get('type')||'Other'),date:String(form.get('date')||''),time:String(form.get('time')||''),done:false});saveState();render();showToast('Planner layer added.');}
async function toggleTask(id){const item=state.data.plannerItems.find(x=>String(x.id)===String(id));if(item){item.done=!item.done;saveState();render();}}
async function deleteTask(id){state.data.plannerItems=state.data.plannerItems.filter(x=>String(x.id)!==String(id));saveState();render();}
function prepareNextFocus(){const next=state.data.plannerItems.find(x=>!x.done&&x.type==='Study')||state.data.plannerItems.find(x=>!x.done);if(next){state.data.focus.subject=next.title.split(/[·:-]/)[0].trim()||'Study';state.data.focus.goal=next.title;}state.section='focus';render();}
function startFocus(){const f=state.data.focus;f.started=true;f.running=true;f.secondsLeft=f.duration*60;saveState();startTimer();render();}
function startTimer(){clearInterval(state.focusTimer);state.focusTimer=setInterval(()=>{const f=state.data?.focus;if(!f?.running)return;if(f.secondsLeft>0){f.secondsLeft--;const el=document.querySelector('.focus-timer');if(el)el.textContent=formatClock(f.secondsLeft);}else completeFocus();},1000);}
function toggleFocus(){state.data.focus.running=!state.data.focus.running;if(state.data.focus.running)startTimer();saveState();render();}
function completeFocus(){clearInterval(state.focusTimer);state.focusTimer=null;const f=state.data.focus;(state.data.focusHistory||=[]).push({subject:f.subject,minutes:f.duration,completedAt:new Date().toISOString()});Object.assign(f,{started:false,running:false,secondsLeft:f.duration*60});saveState();render();showToast('Session complete ✦');}
function exitFocus(){clearInterval(state.focusTimer);state.focusTimer=null;const f=state.data.focus;Object.assign(f,{started:false,running:false,secondsLeft:f.duration*60});saveState();render();}
function openStrati(){state.stratiOpen=true;render();}

function addPlannerFromMessage(message){const match=message.match(/(?:add|schedule|put)\s+(.+?)(?:\s+(?:today|tomorrow))?(?:\s+at\s+([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?))?$/i);if(!match)return null;let title=match[1].trim().replace(/\s+to\s+(?:my\s+)?planner$/i,'').trim();if(!title)return null;const item={id:uid(),title:title[0].toUpperCase()+title.slice(1),date:/tomorrow/i.test(message)?'Tomorrow':'',time:(match[2]||'').trim(),type:/homework/i.test(title)?'Homework':'Study',done:false};state.data.plannerItems.push(item);saveState();return item;}
function completePlannerFromMessage(message){const m=message.match(/(?:finished|completed|done with|mark)\s+(.+?)(?:\s+done)?$/i);if(!m)return null;const q=m[1].toLowerCase();const item=state.data.plannerItems.find(x=>x.title.toLowerCase().includes(q)||q.includes(x.title.toLowerCase()));if(item){item.done=true;saveState();return item;}return null;}
function startFocusFromMessage(message){const mins=clamp(Number(message.match(/(\d{1,2})\s*(?:min|minute)/i)?.[1])||25,10,60);const subject=['Physics','Chemistry','Biology','Mathematics','Math','English','ICT'].find(x=>new RegExp(x,'i').test(message));if(!/(?:start|focus|study|lock)/i.test(message)||!subject)return null;const normalized=subject==='Math'?'Mathematics':subject;Object.assign(state.data.focus,{subject:normalized,mode:'Study',goal:`Focused ${normalized} session`,duration:mins,secondsLeft:mins*60,started:false,running:false});state.section='focus';saveState();return{subject:normalized,minutes:mins};}
function offlineStratiReply(message){const text=message.trim();const lower=text.toLowerCase();if(state.stratiMode==='consultant'){if(/overwhelm|stress|tired|burn|fail|anxious|pressure/.test(lower))return 'That sounds like a lot at once. Make the next step smaller: choose one urgent subject, work for 15–25 minutes, then take a real break.';return 'Tell me what feels hardest right now — workload, motivation, time, or confidence — and I’ll reduce it to one manageable next step.';}const added=addPlannerFromMessage(text);if(added)return `Added “${added.title}” to your Planner${added.time?` at ${added.time}`:''}.`;const completed=completePlannerFromMessage(text);if(completed)return `Marked “${completed.title}” complete ✓`;const focus=startFocusFromMessage(text);if(focus)return `Prepared a ${focus.minutes}-minute ${focus.subject} session. Open Focus when you are ready.`;for(const mode of Object.keys(OFFLINE_SOUNDTRACKS)){if(lower.includes(mode.toLowerCase())){state.data.music.modeLabel=mode;saveState();return `${mode} selected for your next focus session.`;}}if(/what.*left|left today|remaining/.test(lower)){const left=state.data.plannerItems.filter(x=>!x.done);return left.length?`You have ${left.length} things left: ${left.slice(0,3).map(x=>x.title).join(', ')}${left.length>3?'…':''}.`:'You are clear for today.';}if(/planner|plan my day|what should i do/.test(lower)){const next=state.data.plannerItems.find(x=>!x.done);return next?`Your next unfinished task is “${next.title}”. Finish that first, then reassess.`:'Your plan is clear right now.';}return 'I’m running in offline competition mode. Try: “Add Biology revision at 7 PM”, “I finished Chemistry”, “Start 25 minute Physics focus”, or “What’s left today?”';}
function sendStratiMessage(e){e?.preventDefault();const textarea=root.querySelector('#strati-form textarea');const message=String(textarea?.value||'').trim();if(!message)return;state.stratiMessages.push({role:'user',content:message});state.stratiBusy=true;render();setTimeout(()=>{state.stratiMessages.push({role:'assistant',content:offlineStratiReply(message)});state.stratiBusy=false;render();},180);}

bootstrapOffline();
