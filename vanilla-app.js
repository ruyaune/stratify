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
  ['dashboard','⌂','Home'],
  ['planner','◫','Planner'],
  ['focus','◉','Focus'],
  ['progress','↗','Progress'],
  ['social','◎','Social']
];

const SHOWCASE = [
  ['Why Stratify','Stratify brings planning, focus, progress, and social accountability into one calm Student Life OS.','dashboard'],
  ['Planner','Students can add real plans, complete them, and keep daily work in one connected place.','planner'],
  ['Strati Assistant','Strati demonstrates how one command surface can operate Planner, Focus, music, and navigation.','dashboard'],
  ['Locked-In Focus','Focus combines a timer, one clear goal, soundtrack, and a distraction-resistant study environment.','focus'],
  ['Progress','Progress turns completed work into useful signals about consistency, focus and subject performance.','progress'],
  ['Social','Social supports accountability: live study presence, encouragement, and focused connection without a noisy feed.','social']
];

const demoPlanner = [
  {id:'dinner',title:'Dinner',time:'18:30',date:'',type:'Personal',done:true},
  {id:'math',title:'Math homework',time:'19:00',date:'',type:'Homework',done:true},
  {id:'physics',title:'Physics · Electromagnetism',time:'19:40',date:'',type:'Study',done:false},
  {id:'chemistry',title:'Chemistry recall',time:'20:30',date:'',type:'Study',done:false},
  {id:'winddown',title:'Pack bag + wind down',time:'22:15',date:'',type:'Other',done:false}
];

const state = {
  phase:'app',
  user:{name:'User'},
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
  stratiDraft:'',
  stratiBusy:false,
  stratiError:'',
  showcaseStep:-1,
  focusTimer:null,
  toast:''
};

const defaultData = () => ({
  profileConfigured:true,
  profile:{name:'User',grade:'Grade 10',curriculum:'National Curriculum — Science',goal:'Exam excellence'},
  plannerItems:demoPlanner.map(x=>({...x})),
  focus:{subject:'Physics',mode:'Practice',goal:'Complete Electromagnetism questions 1–10',duration:40,secondsLeft:2400,running:false,started:false},
  music:{modeLabel:'Lo-fi',playing:false},
  focusHistory:[],
  notes:[],
  theme:'apple'
});

function escapeHtml(value=''){
  return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}
function attr(value=''){ return escapeHtml(value); }
function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
function uid(){ return `item-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }
function formatClock(seconds){ const s=Math.max(0,Number(seconds)||0); return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
const STORAGE_KEY = 'stratify_offline_competition_v1';
let audioCtx=null;
let audioNodes=[];

function showToast(message){
  state.toast=message; render();
  clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>{state.toast='';render();},1800);
}

function safeLoad(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch{return null;}
}

function saveState(){
  if(!state.data)return;
  try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(state.data)); }catch{}
}

function bootstrapOffline(){
  try{if(new URLSearchParams(location.search).has('reset')) localStorage.removeItem(STORAGE_KEY);}catch{}
  const stored=safeLoad()||{};
  state.data={...defaultData(),...stored};
  state.data.profile={...defaultData().profile,...(stored.profile||{}),name:'User'};
  state.data.plannerItems=Array.isArray(stored.plannerItems)&&stored.plannerItems.length ? stored.plannerItems : demoPlanner.map(x=>({...x}));
  state.data.focus={...defaultData().focus,...(stored.focus||{}),running:false,started:false};
  state.data.music={...defaultData().music,...(stored.music||{}),playing:false};
  state.data.focusHistory=Array.isArray(stored.focusHistory)?stored.focusHistory:[];
  render();
}

function stopAmbientAudio(){
  for(const node of audioNodes){try{node.stop?.();}catch{}try{node.disconnect?.();}catch{}}
  audioNodes=[];
  if(state.data?.music) state.data.music.playing=false;
}

function makeNoise(ctx,seconds=2){
  const buffer=ctx.createBuffer(1,ctx.sampleRate*seconds,ctx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*0.35;
  const src=ctx.createBufferSource();src.buffer=buffer;src.loop=true;return src;
}

function startAmbientAudio(label){
  stopAmbientAudio();
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx){showToast('Audio is unavailable in this browser.');return;}
  audioCtx=audioCtx||new Ctx();
  if(audioCtx.state==='suspended') audioCtx.resume();
  const gain=audioCtx.createGain();gain.gain.value=.055;gain.connect(audioCtx.destination);audioNodes.push(gain);
  if(['Rain','Café','Brown Noise'].includes(label)){
    const noise=makeNoise(audioCtx);const filter=audioCtx.createBiquadFilter();
    filter.type='lowpass';filter.frequency.value=label==='Rain'?1400:label==='Café'?700:350;
    noise.connect(filter);filter.connect(gain);noise.start();audioNodes.push(noise,filter);
  }else{
    const base=label==='Deep Space'?82:label==='Piano'?261.63:174.61;
    [1,1.5,2].forEach((ratio,i)=>{const osc=audioCtx.createOscillator();const g=audioCtx.createGain();osc.type=label==='Lo-fi'?'triangle':'sine';osc.frequency.value=base*ratio;g.gain.value=.025/(i+1);osc.connect(g);g.connect(gain);osc.start();audioNodes.push(osc,g);});
  }
  state.data.music.playing=true;saveState();render();
}

function toggleAmbientAudio(){
  const music=state.data.music;
  if(music.playing){stopAmbientAudio();saveState();render();showToast('Soundtrack paused.');}
  else{startAmbientAudio(music.modeLabel);showToast(`${music.modeLabel} ambient playing.`);}
}

function appShell(content){
  const locked=Boolean(state.data?.focus?.started);
  const userName='User';
  return `
  <div class="app-shell stitch-shell ${locked?'locked-mode':''}">
    <aside class="sidebar sidebar-minimal stitch-sidebar">
      <button class="brand-lockup brand-button" data-nav="dashboard" aria-label="Home"><span class="logo-mark compact"><span class="logo-layer l1"></span><span class="logo-layer l2"></span><span class="logo-layer l3"></span></span><span>STRATIFY</span></button>
      <nav class="nav-list stitch-nav-list">
        ${NAV.map(([id,icon,label])=>`<button class="nav-item ${state.section===id?'active':''}" data-nav="${id}"><span class="icon">${icon}</span><span>${label}</span></button>`).join('')}
      </nav>
      <div class="sidebar-spacer"></div>
      <button class="nav-item showcase-nav" data-action="showcase"><span class="icon">✦</span><span>Showcase Mode</span></button>
      <button class="nav-item sidebar-profile sidebar-profile-button ${state.section==='profile'?'active':''}" data-nav="profile"><span class="avatar small">US</span><div><strong>${userName}</strong><span>${escapeHtml(state.data?.profile?.grade||'Student')}</span></div></button>
    </aside>
    <div class="app-main">
      <header class="topbar topbar-minimal stitch-topbar">
        <div class="mobile-brand"><strong>STRATIFY</strong></div><div class="topbar-spacer"></div>
        ${locked?'<span class="locked-top-pill">🔒 LOCKED IN</span>':''}
        <button class="strati-top-trigger stitch-strati-trigger" data-action="strati">✦ <span>Strati</span></button>
        <button class="top-profile top-profile-button" data-nav="profile"><span class="avatar small">US</span></button>
      </header>
      ${content}
    </div>
    ${state.stratiOpen?stratiModal():''}
    ${state.showcaseStep>=0?showcaseOverlay():''}
    ${state.toast?`<div class="toast">${escapeHtml(state.toast)}</div>`:''}
  </div>`;
}

function homePage(){
  const items=state.data.plannerItems||[]; const done=items.filter(x=>x.done).length; const percent=items.length?Math.round(done/items.length*100):0; const next=items.find(x=>!x.done);
  const hour=new Date().getHours(); const part=hour<12?'morning':hour<18?'afternoon':'evening';
  return `<main class="page dashboard-page dashboard-minimal stitch-home-page">
    <header class="stitch-home-head"><h1>Good ${part},<br>User.</h1><p>A calm system for planning, focusing, improving, and staying consistent.</p></header>
    <section class="stitch-home-grid">
      <section class="card stitch-why-card"><span class="eyebrow">WHY STRATIFY</span><h2>Clarity for your academic life.</h2><p>Students often use separate tools for planning, focusing, progress and staying consistent. Stratify brings them together into one connected Student Life OS.</p><div class="stitch-flow"><span><i class="flow-dot dot-a"></i>PLAN</span><b>›</b><span><i class="flow-dot dot-b"></i>FOCUS</span><b>›</b><span><i class="flow-dot dot-c"></i>IMPROVE</span><b>›</b><span><i class="flow-dot dot-d"></i>REPEAT</span></div></section>
      <section class="card stitch-today-card"><span class="eyebrow">TODAY</span><div class="stitch-today-value"><strong>${done}</strong><span>/ ${items.length} complete</span></div><div class="progress-track large"><span style="width:${percent}%"></span></div><button class="minimal-link" data-nav="planner">Open planner →</button></section>
      <section class="card stitch-next-card"><span class="eyebrow">UP NEXT</span><h2>${next?escapeHtml(next.title):'You are clear.'}</h2><p>${next?`${escapeHtml(next.time||'Any time')} · ${escapeHtml(next.type||'Task')}`:'No unfinished tasks.'}</p><button class="btn primary" data-action="focus-next">Start Focus →</button></section>
    </section>
  </main>`;
}

function plannerPage(){
  const items=state.data.plannerItems||[]; const done=items.filter(x=>x.done).length;
  return `<main class="page planner-page stitch-planner-page">
    <div class="page-title planner-title"><div><span class="eyebrow">YOUR DAY, WITHOUT THE NOISE</span><h1>Planner</h1><p>Add real tasks, finish them, and keep the next move obvious.</p></div><button class="btn primary" data-action="strati">✦ Ask Strati to plan</button></div>
    <section class="stitch-planner-grid">
      <section class="card planner-list-card">
        <div class="card-head"><div><span class="eyebrow">TODAY</span><h3>${done}/${items.length} complete</h3></div><span class="badge info">${done===items.length?'Done':'In progress'}</span></div>
        <details class="stitch-add-plan" open><summary>+ Add Plan</summary>
          <form id="planner-form" class="stitch-add-plan-form planner-add-form">
            <input class="input" name="title" placeholder="What do you need to do?" required>
            <select class="input" name="type">${['Study','Homework','Meal','Personal','Break','Other'].map(x=>`<option>${x}</option>`).join('')}</select>
            <input class="input" name="date" type="date"><input class="input" name="time" type="time"><button class="btn primary planner-add-btn" type="submit">Add to planner</button>
          </form>
        </details>
        <div class="planner-list">${items.map(item=>`<div class="planner-item-row ${item.done?'done':''}"><button class="planner-item ${item.done?'done':''}" data-toggle-task="${attr(item.id)}"><span class="planner-check">${item.done?'✓':''}</span><div class="planner-item-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.time||'Any time')}${item.date?` · ${escapeHtml(item.date)}`:''} · ${escapeHtml(item.type||'Other')}</span></div></button><button class="planner-delete-btn" data-delete-task="${attr(item.id)}" title="Delete">×</button></div>`).join('')}</div>
      </section>
      <section class="card planner-next-card stitch-strati-suggest"><span class="eyebrow">STRATI’S NEXT MOVE</span><h2>${escapeHtml(items.find(x=>!x.done)?.title||'Plan complete')}</h2><p>${items.find(x=>!x.done)?'This is the next unfinished item in your plan.':'Everything planned for now is complete.'}</p><button class="btn primary full" data-action="focus-next">Prepare focus →</button><button class="minimal-link" data-action="strati">Tell Strati my situation instead →</button></section>
    </section>
  </main>`;
}

function focusPage(){
  const f=state.data.focus; const music=state.data.music||{modeLabel:'Lo-fi',playing:false};
  return `<main class="page focus-page stitch-focus-page ${f.started?'focus-immersive':''}">
    <header class="stitch-focus-head"><span class="eyebrow">${f.started?'NO SIDE QUESTS':'DEEP WORK MODE'}</span><h1>${f.started?'Stay with the one thing.':'Focus without friction.'}</h1><p>${escapeHtml(f.goal)}</p></header>
    <section class="stitch-focus-stage">
      <div class="stitch-focus-core"><div class="stitch-focus-timer">${formatClock(f.secondsLeft)}</div><div class="stitch-focus-status">${f.started?'LOCKED IN':'READY'}</div><h2>${escapeHtml(f.subject)}</h2><p>${escapeHtml(f.mode)} · ${escapeHtml(f.goal)}</p><div class="focus-controls">${!f.started?'<button class="btn primary" data-action="focus-start">ENTER LOCKED-IN</button>':`<button class="btn primary" data-action="focus-toggle">${f.running?'Pause':'Resume'}</button><button class="btn ghost" data-action="focus-complete">Complete session</button><button class="exit-focus-btn" data-action="focus-exit">Exit</button>`}</div></div>
      <section class="card session-setup"><span class="eyebrow">SESSION BLUEPRINT</span><label class="field-label">Subject<select id="focus-subject" class="input" ${f.started?'disabled':''}>${['Physics','Mathematics','Chemistry','Biology','English','ICT'].map(s=>`<option ${s===f.subject?'selected':''}>${s}</option>`).join('')}</select></label><label class="field-label">Mode<select id="focus-mode" class="input" ${f.started?'disabled':''}>${['Learn','Practice','Revise','Assignment'].map(s=>`<option ${s===f.mode?'selected':''}>${s}</option>`).join('')}</select></label><label class="field-label">Goal<textarea id="focus-goal" class="input textarea" ${f.started?'disabled':''}>${escapeHtml(f.goal)}</textarea></label><div class="duration-grid">${[15,25,35,40,50].map(d=>`<button class="${d===f.duration?'selected':''}" data-duration="${d}" ${f.started?'disabled':''}><strong>${d}</strong><span>min</span></button>`).join('')}</div></section>
    </section>
    <section class="card music-dock stitch-music-card"><div class="card-head"><div><span class="eyebrow">STUDY SOUNDTRACK</span><h3>${escapeHtml(music.modeLabel)}</h3></div><span class="badge purple">Offline ambient</span></div><div class="sound-pills">${Object.keys(OFFLINE_SOUNDTRACKS).map(name=>`<button class="${name===music.modeLabel?'selected':''}" data-music="${attr(name)}">${escapeHtml(name)}</button>`).join('')}</div><div class="offline-audio-panel"><div class="audio-reactive-visualizer ${music.playing?'active':''}">${Array.from({length:12},(_,i)=>`<span style="height:${20+((i*17)%58)}%"></span>`).join('')}</div><div><strong>${escapeHtml(OFFLINE_SOUNDTRACKS[music.modeLabel]||music.modeLabel)}</strong><p>No internet required.</p></div><button class="btn ${music.playing?'ghost':'primary'}" data-action="music-toggle">${music.playing?'Pause':'Play ambient'}</button></div></section>
    ${f.started?`<section class="card scratchpad-card"><span class="eyebrow">LOCKED-IN SCRATCHPAD</span><h3>Park the thought. Don’t chase it.</h3><textarea id="focus-scratch" class="input textarea" placeholder="A formula, question, or thought to revisit…">${escapeHtml(f.scratch||'')}</textarea></section>`:''}
  </main>`;
}

function progressPage(){
  const items=state.data.plannerItems||[]; const completion=items.length?Math.round(items.filter(x=>x.done).length/items.length*100):0; const history=state.data.focusHistory||[]; const minutes=history.reduce((a,x)=>a+(x.minutes||0),0); const consistency=clamp(60+history.length*4,0,96);
  return `<main class="page stitch-progress-page"><div class="page-title"><span class="eyebrow">PROGRESS INTELLIGENCE</span><h1>Understand how you study.</h1><p>Useful signals, not a wall of analytics.</p></div>
    <section class="stitch-progress-insights"><section class="card stitch-insight-main"><span class="stitch-insight-icon">⌖</span><div><span class="eyebrow">BEST WINDOW</span><h2>Your best focus window is 7:30–9:00 PM.</h2><p>Keep your hardest analytical work inside the time you are most likely to sustain focus.</p></div></section><section class="card stitch-insight-alert"><span class="eyebrow">NEXT IMPROVEMENT</span><h3>Consistency beats longer sessions.</h3><p>Complete the planned session before adding more time.</p></section></section>
    <section class="stitch-progress-metrics"><section class="card stitch-metric-card"><span>CONSISTENCY</span><strong>${consistency}%</strong><i style="height:${consistency}%"></i></section><section class="card stitch-metric-card"><span>FOCUS TIME</span><strong>${Math.floor(minutes/60)}h</strong><small>${minutes%60}m</small></section><section class="card stitch-metric-card"><span>COMPLETION</span><strong>${completion}%</strong><i style="height:${completion}%"></i></section><section class="card stitch-metric-card"><span>ATTENTION</span><strong class="metric-subject">Physics</strong><small>Top priority</small></section></section>
    <section class="card stitch-trajectory-card"><div class="card-head"><div><span class="eyebrow">RECENT FOCUS</span><h2>Your completed Locked-In sessions</h2></div></div><div class="vanilla-history">${history.length?history.slice(-8).map(x=>`<div><strong>${escapeHtml(x.subject)}</strong><span>${x.minutes} min</span></div>`).join(''):'<p class="muted-copy">Complete a Locked-In session to start building your focus history.</p>'}</div></section>
  </main>`;
}

function socialPage(){
  const real=state.peers||[];
  const people=real.length?real:[{id:'demo1',name:'Nadia',lockedIn:true,subject:'Physics'},{id:'demo2',name:'Rafi',lockedIn:false,subject:'Chemistry'}];
  return `<main class="page stitch-social-page"><div class="page-title"><span class="eyebrow">SOCIAL, WITHOUT THE NOISE</span><h1>Stay connected. Stay focused.</h1><p>See who is studying, encourage each other, and keep the interaction useful.</p></div>
    <section class="stitch-social-grid"><section class="card social-card"><div class="card-head"><div><span class="eyebrow">ACCOUNTABILITY DEMO</span><h3>Study presence</h3></div><span class="badge success">Offline demo</span></div><div class="friend-list">${people.map(p=>`<div class="friend-row"><span class="avatar small">${escapeHtml((p.name||'U').slice(0,2).toUpperCase())}</span><div class="friend-main"><strong>${escapeHtml(p.name)}</strong><span>${p.lockedIn?`🔒 LOCKED IN · ${escapeHtml(p.subject||'Focus')}`:`${escapeHtml(p.subject||'Available')}`}</span></div><button class="encourage-btn" data-encourage="${attr(p.name)}">🔥</button></div>`).join('')}</div></section>
      <section class="card focus-room-card"><span class="eyebrow">FOCUS TOGETHER</span><h2>Study alongside friends, not inside a feed.</h2><p>Use this section to demonstrate how focused social accountability can work without turning into a distracting feed.</p><button class="btn primary" data-nav="focus">Open Focus →</button></section></section>
  </main>`;
}

function profilePage(){
  return `<main class="page"><div class="page-title"><span class="eyebrow">YOUR STRATIFY</span><h1>User</h1><p>Offline competition profile</p></div><section class="card profile-hero upgraded-profile"><div class="profile-avatar-ring"><span class="avatar">US</span></div><div class="profile-copy"><span class="eyebrow">STUDENT PROFILE</span><h2>User</h2><p>${escapeHtml(state.data.profile?.grade||'Student')} · ${escapeHtml(state.data.profile?.curriculum||'')}</p></div></section><section class="card"><span class="eyebrow">TECH STACK</span><h3>Vanilla web development</h3><p class="muted-copy">HTML + CSS + plain JavaScript. Planner, Focus and Progress are saved locally in this browser, so this competition build works without internet or a server.</p></section></main>`;
}

function stratiModal(){
  const consultant=state.stratiMode==='consultant';
  return `<div class="modal-backdrop ai-sheet-backdrop stitch-strati-backdrop"><section class="strati-sheet online-strati-sheet stitch-strati-command"><div class="ai-sheet-head"><div class="ai-avatar-mark">✦</div><div><span class="eyebrow">STRATI ASSISTANT · OFFLINE DEMO</span><h2>Strati Command</h2><p>${consultant?'Support for motivation, stress, overwhelm, and realistic next steps.':'A local competition assistant that can operate Planner, Focus, music, and navigation.'}</p></div><button class="close-btn" data-action="strati-close">×</button></div>
    <div class="strati-mode-tabs"><button class="${!consultant?'active':''}" data-strati-mode="study">✦ Study Buddy</button><button class="${consultant?'active':''}" data-strati-mode="consultant">♡ Consultant</button></div>
    <div class="strati-chat-body">${state.stratiMessages.length?state.stratiMessages.map(msg=>`<div class="strati-chat-message ${msg.role==='user'?'user':'assistant'}"><strong>${msg.role==='user'?'YOU':'STRATI'}</strong><p>${escapeHtml(msg.content)}</p></div>`).join(''):`<div class="strati-empty-chat"><span>✦</span><h3>${consultant?'What’s weighing on you?':'Welcome back to Stratify — your Study OS ✦'}</h3><p>${consultant?'Tell me what’s been hard. We can make the next step smaller and more realistic.':'Wanna dive into studying? Tell me what’s going on today.'}</p></div>`}${state.stratiError?`<div class="auth-error">${escapeHtml(state.stratiError)}</div>`:''}</div>
    <form id="strati-form" class="strati-chat-compose"><textarea class="input" name="message" rows="2" placeholder="Type a command or ask a question…">${escapeHtml(state.stratiDraft)}</textarea><button class="primary" type="submit" ${state.stratiBusy?'disabled':''}>${state.stratiBusy?'Thinking…':'➤'}</button></form><div class="strati-sheet-footer"><span>${consultant?'Supportive guidance — not therapy or medical care.':'Strati can operate Planner, Focus, music, and navigation.'}</span><button class="text-btn" data-action="showcase">Showcase mode</button></div></section></div>`;
}

function showcaseOverlay(){
  const [title,copy]=SHOWCASE[state.showcaseStep];
  return `<div class="showcase-overlay stitch-showcase-stage"><button class="stitch-showcase-exit" data-action="showcase-close">✕ EXIT SHOWCASE</button><div class="stitch-showcase-focus"><span class="stitch-showcase-dot"></span></div><section class="showcase-card stitch-showcase-card"><div class="showcase-count">STEP ${String(state.showcaseStep+1).padStart(2,'0')} / ${String(SHOWCASE.length).padStart(2,'0')}</div><button class="close-btn" data-action="showcase-close">×</button><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p><div class="showcase-progress">${SHOWCASE.map((_,i)=>`<span class="${i<=state.showcaseStep?'active':''}"></span>`).join('')}</div><div class="showcase-actions">${state.showcaseStep>0?'<button class="btn ghost" data-showcase-step="-1">← Back</button>':'<span></span>'}<button class="btn primary" data-showcase-step="1">${state.showcaseStep<SHOWCASE.length-1?'Next →':'Finish ✦'}</button></div></section></div>`;
}

function render(){
  let page='';
  if(state.section==='planner') page=plannerPage();
  else if(state.section==='focus') page=focusPage();
  else if(state.section==='progress') page=progressPage();
  else if(state.section==='social') page=socialPage();
  else if(state.section==='profile') page=profilePage();
  else page=homePage();
  root.innerHTML=appShell(page);
  bindApp();
}

function navigate(section){
  if(state.data?.focus?.started && section!=='focus'){ showToast('Locked-In session active. No side quests 🔒'); return; }
  state.section=section; state.showcaseStep=-1; render(); document.querySelector('.app-main')?.scrollTo({top:0});
}


function bindApp(){
  root.querySelectorAll('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.nav)));
  root.querySelectorAll('[data-action="strati"]').forEach(btn=>btn.addEventListener('click',openStrati));
  root.querySelector('[data-action="strati-close"]')?.addEventListener('click',()=>{state.stratiOpen=false;render();});
  root.querySelectorAll('[data-action="showcase"]').forEach(btn=>btn.addEventListener('click',()=>{state.stratiOpen=false;state.showcaseStep=0;state.section=SHOWCASE[0][2];render();}));
  root.querySelectorAll('[data-action="showcase-close"]').forEach(btn=>btn.addEventListener('click',()=>{state.showcaseStep=-1;render();}));
  root.querySelectorAll('[data-showcase-step]').forEach(btn=>btn.addEventListener('click',()=>{const d=Number(btn.dataset.showcaseStep);const next=state.showcaseStep+d;if(next>=SHOWCASE.length){state.showcaseStep=-1;}else if(next>=0){state.showcaseStep=next;state.section=SHOWCASE[next][2];}render();}));
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
  root.querySelectorAll('[data-music]').forEach(btn=>btn.addEventListener('click',()=>{const wasPlaying=state.data.music.playing;state.data.music.modeLabel=btn.dataset.music;saveState();if(wasPlaying)startAmbientAudio(btn.dataset.music);else render();}));
  root.querySelector('[data-action="music-toggle"]')?.addEventListener('click',toggleAmbientAudio);
  root.querySelectorAll('[data-encourage]').forEach(btn=>btn.addEventListener('click',()=>showToast(`🔥 Encouragement sent to ${btn.dataset.encourage}`)));
  root.querySelectorAll('[data-strati-mode]').forEach(btn=>btn.addEventListener('click',()=>{state.stratiMode=btn.dataset.stratiMode;state.stratiMessages=[];render();}));
  root.querySelector('#strati-form')?.addEventListener('submit',sendStratiMessage);
}

async function addPlannerItem(e){
  e.preventDefault(); const form=new FormData(e.currentTarget); const title=String(form.get('title')||'').trim(); if(!title)return;
  state.data.plannerItems.push({id:uid(),title,type:String(form.get('type')||'Other'),date:String(form.get('date')||''),time:String(form.get('time')||''),done:false}); await saveState(); render(); showToast('Planner item added.');
}
async function toggleTask(id){ const item=state.data.plannerItems.find(x=>String(x.id)===String(id)); if(item){item.done=!item.done;await saveState();render();} }
async function deleteTask(id){ state.data.plannerItems=state.data.plannerItems.filter(x=>String(x.id)!==String(id)); await saveState(); render(); }
function prepareNextFocus(){ const next=state.data.plannerItems.find(x=>!x.done&&x.type==='Study')||state.data.plannerItems.find(x=>!x.done); if(next){state.data.focus.subject=next.title.split(/[·:-]/)[0].trim()||'Study';state.data.focus.goal=next.title;} state.section='focus'; render(); }

function startFocus(){
  const f=state.data.focus; f.started=true;f.running=true;f.secondsLeft=f.duration*60; saveState(); startTimer(); render();
}
function startTimer(){
  clearInterval(state.focusTimer);
  state.focusTimer=setInterval(()=>{
    const f=state.data?.focus;if(!f?.running)return;
    if(f.secondsLeft>0){f.secondsLeft--;const el=document.querySelector('.stitch-focus-timer');if(el)el.textContent=formatClock(f.secondsLeft);}
    else completeFocus();
  },1000);
}
function toggleFocus(){ state.data.focus.running=!state.data.focus.running; if(state.data.focus.running)startTimer(); saveState(); render(); }
function completeFocus(){
  clearInterval(state.focusTimer);state.focusTimer=null;const f=state.data.focus;
  (state.data.focusHistory||=[]).push({subject:f.subject,minutes:f.duration,completedAt:new Date().toISOString()});
  Object.assign(f,{started:false,running:false,secondsLeft:f.duration*60});saveState();render();showToast('Session complete ✦');
}
function exitFocus(){ clearInterval(state.focusTimer);state.focusTimer=null;const f=state.data.focus;Object.assign(f,{started:false,running:false,secondsLeft:f.duration*60});saveState();render(); }

function openStrati(){ state.stratiOpen=true;state.stratiError='';render(); }

function addPlannerFromMessage(message){
  const match=message.match(/(?:add|schedule|put)\s+(.+?)(?:\s+(?:today|tomorrow))?(?:\s+at\s+([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?))?$/i);
  if(!match)return null;
  let title=match[1].trim().replace(/\s+to\s+(?:my\s+)?planner$/i,'').trim();
  if(!title)return null;
  const item={id:uid(),title:title[0].toUpperCase()+title.slice(1),date:/tomorrow/i.test(message)?'Tomorrow':'',time:(match[2]||'').trim(),type:/homework/i.test(title)?'Homework':'Study',done:false};
  state.data.plannerItems.push(item);saveState();return item;
}

function completePlannerFromMessage(message){
  const m=message.match(/(?:finished|completed|done with|mark)\s+(.+?)(?:\s+done)?$/i);if(!m)return null;
  const q=m[1].toLowerCase();const item=state.data.plannerItems.find(x=>x.title.toLowerCase().includes(q)||q.includes(x.title.toLowerCase()));
  if(item){item.done=true;saveState();return item;}return null;
}

function startFocusFromMessage(message){
  const mins=clamp(Number(message.match(/(\d{1,2})\s*(?:min|minute)/i)?.[1])||25,10,60);
  const subject=['Physics','Chemistry','Biology','Mathematics','Math','English','ICT'].find(x=>new RegExp(x,'i').test(message));
  if(!/(?:start|focus|study|lock)/i.test(message)||!subject)return null;
  const normalized=subject==='Math'?'Mathematics':subject;
  Object.assign(state.data.focus,{subject:normalized,mode:'Study',goal:`Focused ${normalized} session`,duration:mins,secondsLeft:mins*60,started:false,running:false});
  state.section='focus';saveState();return {subject:normalized,minutes:mins};
}

function offlineStratiReply(message){
  const text=message.trim();const lower=text.toLowerCase();
  if(state.stratiMode==='consultant'){
    if(/overwhelm|stress|tired|burn|fail|anxious|pressure/.test(lower)) return 'That sounds like a lot at once. Let’s make the next step smaller: choose one urgent subject, work for 15–25 minutes, then take a real break. You do not need to solve the whole week tonight.';
    return 'Tell me what feels hardest right now — workload, motivation, time, or confidence — and I’ll help you reduce it to one manageable next step.';
  }
  const added=addPlannerFromMessage(text);if(added)return `Added “${added.title}” to your Planner${added.time?` at ${added.time}`:''}.`;
  const completed=completePlannerFromMessage(text);if(completed)return `Marked “${completed.title}” complete ✓`;
  const focus=startFocusFromMessage(text);if(focus)return `I prepared a ${focus.minutes}-minute ${focus.subject} session. Open Focus when you’re ready to lock in.`;
  for(const mode of Object.keys(OFFLINE_SOUNDTRACKS)){if(lower.includes(mode.toLowerCase())){state.data.music.modeLabel=mode;saveState();return `${mode} selected for your next focus session.`;}}
  if(/what.*left|left today|remaining/.test(lower)){const left=state.data.plannerItems.filter(x=>!x.done);return left.length?`You have ${left.length} things left: ${left.slice(0,3).map(x=>x.title).join(', ')}${left.length>3?'…':''}.`:'You’re clear for today — everything in the Planner is complete.';}
  if(/planner|plan my day|what should i do/.test(lower)){const next=state.data.plannerItems.find(x=>!x.done);return next?`Your next unfinished task is “${next.title}”. I’d keep it simple: finish that first, then reassess.`:'Your plan is clear right now. Add the next important task and I’ll help you focus it.';}
  return 'I’m running in offline competition mode. Try: “Add Biology revision at 7 PM”, “I finished Chemistry”, “Start 25 minute Physics focus”, or “What’s left today?”';
}

function sendStratiMessage(e){
  e?.preventDefault();const textarea=root.querySelector('#strati-form textarea');const message=String(textarea?.value||'').trim();if(!message)return;
  state.stratiMessages.push({role:'user',content:message});state.stratiBusy=true;render();
  setTimeout(()=>{const reply=offlineStratiReply(message);state.stratiMessages.push({role:'assistant',content:reply});state.stratiBusy=false;render();},180);
}

bootstrapOffline();
