// ===========================
// NAVIGATION
// ===========================

function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active', 'fade-in');
  });
  const target = document.getElementById(id);
  target.classList.add('active');
  setTimeout(() => target.classList.add('fade-in'), 10);
  target.scrollTop = 0;
  onScreenLoad(id);
}

function onScreenLoad(id) {
  if(id === 'screen-home') {
    document.getElementById('home-name').textContent = STATE.name || 'there';
    document.getElementById('avatar-initial').textContent = (STATE.name || 'S').charAt(0).toUpperCase();
    document.getElementById('profile-name').textContent = STATE.name || 'there';
    document.getElementById('streak-count').textContent = STATE.streak;
    document.getElementById('presence-score').textContent = STATE.presenceScore;
    loadTodayChallenge();
  }
}

// ===========================
// BASIC INFO
// ===========================

document.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.getElementById('name-input');
  if(nameInput) {
    nameInput.addEventListener('input', () => {
      STATE.name = nameInput.value.trim();
      checkInfoBtn();
    });
  }
});

function checkInfoBtn() {
  const btn = document.getElementById('info-btn');
  if(btn) btn.disabled = STATE.name.length < 2 || STATE.goals.length === 0;
}

function toggleGoal(el, goal) {
  if(el.classList.contains('selected')) {
    el.classList.remove('selected');
    STATE.goals = STATE.goals.filter(g => g !== goal);
  } else {
    if(STATE.goals.length >= 3) return;
    el.classList.add('selected');
    STATE.goals.push(goal);
  }
  checkInfoBtn();
}

// ===========================
// VOICE RECORDING
// ===========================

let isRecording = false;
let mediaRecorder = null;
let recordingInterval = null;
let recordingSeconds = 0;
let waveInterval = null;
const MAX_RECORDING = 300;

async function toggleRecording() {
  if(isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}
let convIsRecording = false;
let convMediaRecorder = null;
let convWaveInterval = null;
let convUserText = '';

async function toggleConvRecording() {
  if(convIsRecording) {
    stopConvRecording();
  } else {
    startConvRecording();
  }
}

async function startConvRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio: true});
    convMediaRecorder = new MediaRecorder(stream);
    const chunks = [];
    convMediaRecorder.ondataavailable = e => chunks.push(e.data);
    convMediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, {type: 'audio/webm'});
      document.getElementById('conv-rec-status').textContent = 'Processing your response...';
      const text = await transcribeConvAudio(blob);
      convUserText = text;
      document.getElementById('conv-rec-status').textContent = `"${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`;
      document.getElementById('conv-send-btn').disabled = false;
    };
    convMediaRecorder.start();
    convIsRecording = true;
    document.getElementById('conv-rec-btn').classList.add('recording');
    document.getElementById('conv-rec-status').textContent = 'Recording... tap to stop';
    convWaveInterval = setInterval(() => {
      document.querySelectorAll('#conv-waveform .wave-bar').forEach(b => {
        b.style.height = (Math.random() * 32 + 6) + 'px';
      });
    }, 120);
  } catch(e) {
    document.getElementById('conv-rec-status').textContent = 'Microphone access needed.';
  }
}

function stopConvRecording() {
  if(convMediaRecorder && convMediaRecorder.state !== 'inactive') convMediaRecorder.stop();
  if(convMediaRecorder) convMediaRecorder.stream.getTracks().forEach(t => t.stop());
  convIsRecording = false;
  clearInterval(convWaveInterval);
  document.getElementById('conv-rec-btn').classList.remove('recording');
}

async function transcribeConvAudio(blob) {
  if(CONFIG.assemblyai === 'YOUR_ASSEMBLYAI_KEY_HERE') {
    return 'I understand your point but I think there is more to consider here.';
  }
  try {
    const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {'authorization': CONFIG.assemblyai},
      body: blob
    });
    const uploadData = await uploadRes.json();
    const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {'authorization': CONFIG.assemblyai, 'content-type': 'application/json'},
      body: JSON.stringify({audio_url: uploadData.upload_url})
    });
    const transcriptData = await transcriptRes.json();
    const poll = () => new Promise(resolve => {
      const check = async () => {
        const res = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptData.id}`,
          {headers: {'authorization': CONFIG.assemblyai}});
        const data = await res.json();
        if(data.status === 'completed') resolve(data.text);
        else if(data.status === 'error') resolve('Could not transcribe. Please try again.');
        else setTimeout(check, 2000);
      };
      check();
    });
    return await poll();
  } catch(e) {
    return 'Voice response recorded.';
  }
}
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio: true});
    mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, {type: 'audio/webm'});
      transcribeAudio(blob);
    };

    mediaRecorder.start();
    isRecording = true;
    recordingSeconds = 0;

    document.getElementById('rec-btn').classList.add('recording');
    document.getElementById('rec-status').textContent = 'Recording... tap to stop';

    recordingInterval = setInterval(() => {
      recordingSeconds++;
      const remaining = MAX_RECORDING - recordingSeconds;
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      document.getElementById('timer-display').textContent =
        `${m}:${s.toString().padStart(2, '0')}`;
      if(recordingSeconds >= 30) {
        document.getElementById('voice-next-btn').disabled = false;
      }
      if(recordingSeconds >= MAX_RECORDING) stopRecording();
    }, 1000);

    animateWave();
  } catch(e) {
    document.getElementById('rec-status').textContent =
      'Microphone access needed. Skip and continue.';
    document.getElementById('voice-next-btn').disabled = false;
    STATE.voiceTranscript = 'User skipped voice. Goals: ' + STATE.goals.join(', ');
  }
}

function stopRecording() {
  if(mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  if(mediaRecorder) mediaRecorder.stream.getTracks().forEach(t => t.stop());
  isRecording = false;
  clearInterval(recordingInterval);
  clearInterval(waveInterval);
  document.getElementById('rec-btn').classList.remove('recording');
  document.getElementById('rec-status').textContent = 'Recording saved. Ready to reveal your presence.';
  document.getElementById('voice-next-btn').disabled = false;
  resetWave();
}

function animateWave() {
  const bars = document.querySelectorAll('.wave-bar');
  waveInterval = setInterval(() => {
    bars.forEach(b => {
      b.style.height = (Math.random() * 32 + 6) + 'px';
    });
  }, 120);
}

function resetWave() {
  const bars = document.querySelectorAll('.wave-bar');
  const heights = [6, 10, 6, 14, 8, 18, 10, 6, 14, 8, 16, 6];
  bars.forEach((b, i) => b.style.height = heights[i % heights.length] + 'px');
}

async function startPresenceAnalysis() {
  goTo('screen-processing');
  const texts = [
    'Mapping your communication style',
    'Detecting your strengths',
    'Finding where to start',
    'Building your presence profile'
  ];
  let i = 0;
  const pInterval = setInterval(() => {
    const el = document.getElementById('processing-text');
    if(el) el.textContent = texts[i % texts.length];
    i++;
  }, 800);

  setTimeout(async () => {
    const profile = await analysePresence();
    clearInterval(pInterval);
    applyPresenceProfile(profile);
    goTo('screen-presence');
  }, 3000);
}

function skipVoice() {
  STATE.voiceTranscript = 'User skipped voice. Goals: ' + STATE.goals.join(', ');
  startPresenceAnalysis();
}

function applyPresenceProfile(p) {
  STATE.presenceType = p.type;
  STATE.presenceDesc = p.description;

  document.getElementById('presence-tag').textContent = p.type;
  document.getElementById('profile-type').textContent = p.type;
  document.getElementById('presence-title').textContent = 'Your Presence';
  document.getElementById('presence-desc').textContent = p.description;
  document.getElementById('training-start').textContent = p.training_start;

  const raoInsight = document.getElementById('rao-insight');
  if(raoInsight) raoInsight.textContent = p.rao_insight;

  const traits = [
    {label: 'Confidence', val: p.confidence, color: '#7F77DD'},
    {label: 'Persuasion', val: p.persuasion, color: '#1D9E75'},
    {label: 'First impression', val: p.first_impression, color: '#D85A30'},
    {label: 'Emotional appeal', val: p.emotional_appeal, color: '#BA7517'},
    {label: 'Trust building', val: p.trust_building, color: '#534AB7'},
    {label: 'Composure', val: p.composure, color: '#D4537E'}
  ];

  const rows = document.getElementById('trait-rows');
  if(rows) {
    rows.innerHTML = traits.map(t => `
      <div class="trait-row">
        <div class="trait-label">${t.label}</div>
        <div class="trait-bar-wrap">
          <div class="trait-bar-fill" style="width:${t.val}%;background:${t.color};"></div>
        </div>
        <div class="trait-val">${t.val}%</div>
      </div>`).join('');
  }
}

// ===========================
// HOME DASHBOARD
// ===========================

let currentScenarioIndex = 0;

function loadTodayChallenge() {
  const s = SCENARIOS[currentScenarioIndex % SCENARIOS.length];
  const el = document.getElementById('home-scenario-text');
  const tech = document.getElementById('home-technique');
  if(el) el.textContent = s.context;
  if(tech) tech.textContent = 'Technique: ' + s.technique;
}

// ===========================
// LIVE CONVERSATION ENGINE
// ===========================

let activeScenario = null;
let activeCharacter = null;
let conversationHistory = [];
let exchangeCount = 0;

function startConversation(scenarioIndex) {
  activeScenario = SCENARIOS[scenarioIndex || currentScenarioIndex % SCENARIOS.length];
  activeCharacter = activeScenario.character;
  conversationHistory = [];
  exchangeCount = 0;
  STATE.sessionActive = true;

  goTo('screen-conversation');

  const char = CHARACTERS[activeCharacter];
  document.getElementById('conv-scenario-title').textContent = activeScenario.title;
  document.getElementById('conv-scenario-context').textContent = activeScenario.context;
  document.getElementById('conv-character-name').textContent = char.name;
  document.getElementById('conv-character-role').textContent = char.role;
  document.getElementById('conv-technique').textContent = activeScenario.technique;

  const wrap = document.getElementById('conversation-wrap');
  wrap.innerHTML = '';

  addOpponentBubble(char.opener.replace(/"/g, ''), char.name);
  conversationHistory.push({
    role: 'assistant',
    content: char.opener.replace(/"/g, '')
  });
}

function addOpponentBubble(text, name) {
  const wrap = document.getElementById('conversation-wrap');
  const bubble = document.createElement('div');
  bubble.innerHTML = `
    <div class="bubble-role">${name}</div>
    <div class="bubble-opponent">${text}</div>`;
  wrap.appendChild(bubble);
  wrap.scrollTop = wrap.scrollHeight;
}

function addUserBubble(text) {
  const wrap = document.getElementById('conversation-wrap');
  const bubble = document.createElement('div');
  bubble.style.textAlign = 'right';
  bubble.innerHTML = `
    <div class="bubble-role" style="text-align:right;">You</div>
    <div class="bubble-user">${text}</div>`;
  wrap.appendChild(bubble);
  wrap.scrollTop = wrap.scrollHeight;
}

function addTypingIndicator() {
  const wrap = document.getElementById('conversation-wrap');
  const indicator = document.createElement('div');
  indicator.id = 'typing-indicator';
  indicator.innerHTML = `
    <div class="bubble-role">${CHARACTERS[activeCharacter].name}</div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
  wrap.appendChild(indicator);
  wrap.scrollTop = wrap.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if(indicator) indicator.remove();
}

function checkConvBtn() {
  const input = document.getElementById('conv-input');
  const btn = document.getElementById('conv-send-btn');
  if(input && btn) btn.disabled = input.value.trim().length < 3;
}

async function sendUserResponse() {
  const input = document.getElementById('conv-input');
  const userText = convUserText || document.getElementById('conv-input')?.value.trim() || '';
convUserText = '';
  if(!userText) return;

  input.value = '';
  document.getElementById('conv-send-btn').disabled = true;
  exchangeCount++;

  addUserBubble(userText);
  conversationHistory.push({role: 'user', content: userText});

  addTypingIndicator();

  const response = await getOpponentResponse(
    activeCharacter,
    conversationHistory.slice(0, -1),
    userText
  );

  removeTypingIndicator();

  if(response) {
    addOpponentBubble(response, CHARACTERS[activeCharacter].name);
    conversationHistory.push({role: 'assistant', content: response});
  }
}

function showHint() {
  const hintBox = document.getElementById('conv-hint-box');
  const hintText = document.getElementById('conv-hint-text');
  if(activeScenario && hintText) {
    hintText.textContent = activeScenario.hint;
    hintBox.style.display = hintBox.style.display === 'none' ? 'block' : 'none';
  }
}

async function endConversation() {
  if(conversationHistory.length < 2) {
    alert('Have at least one exchange before ending.');
    return;
  }

  goTo('screen-breakdown');
  document.getElementById('breakdown-loading').style.display = 'block';
  document.getElementById('breakdown-content').style.display = 'none';

  const breakdown = await getConversationBreakdown(
    activeScenario,
    activeCharacter,
    conversationHistory
  );

  showBreakdown(breakdown);
  STATE.presenceScore = Math.min(100, STATE.presenceScore + 2);
  STATE.streak++;
  currentScenarioIndex++;
}

function showBreakdown(b) {
  document.getElementById('breakdown-loading').style.display = 'none';
  document.getElementById('breakdown-content').style.display = 'block';

  document.getElementById('breakdown-score').textContent = b.overall;
  document.getElementById('breakdown-headline').textContent = b.headline;
  document.getElementById('breakdown-score-p').textContent = b.persuasion;
  document.getElementById('breakdown-score-c').textContent = b.confidence;
  document.getElementById('breakdown-score-cl').textContent = b.clarity;
  document.getElementById('breakdown-score-co').textContent = b.composure;
  document.getElementById('breakdown-best').textContent = b.best_moment;
  document.getElementById('breakdown-worst').textContent = b.worst_moment;
  document.getElementById('breakdown-pattern').textContent = b.pattern;
  document.getElementById('breakdown-worked').textContent = b.worked;
  document.getElementById('breakdown-fix').textContent = b.fix;
  document.getElementById('breakdown-technique-name').textContent = b.technique_name;
  document.getElementById('breakdown-technique-short').textContent = b.technique_short;
  document.getElementById('breakdown-technique-long').textContent = b.technique_long;
  document.getElementById('breakdown-next').textContent = b.next_challenge;
}

function toggleTechnique() {
  const detail = document.getElementById('technique-detail');
  if(detail) detail.classList.toggle('open');
}

function nextConversation() {
  startConversation(currentScenarioIndex % SCENARIOS.length);
}

// ===========================
// PEOPLE DECODER
// ===========================

function checkDecoderBtn() {
  const input = document.getElementById('decoder-input');
  const btn = document.getElementById('decoder-btn');
  if(input && btn) btn.disabled = input.value.trim().length < 10;
}

async function runDecoder() {
  const input = document.getElementById('decoder-input').value.trim();
  document.getElementById('decoder-loading').style.display = 'block';
  document.getElementById('decoder-result').style.display = 'none';
  document.getElementById('decoder-btn').disabled = true;

  const result = await decodePerson(input);

  document.getElementById('decoder-loading').style.display = 'none';
  document.getElementById('decoder-btn').disabled = false;

  if(result) {
    document.getElementById('decode-type').textContent = result.type;
    document.getElementById('decode-want').textContent = result.want;
    document.getElementById('decode-fear').textContent = result.fear;
    document.getElementById('decode-approach').textContent = result.approach;
    document.getElementById('decode-avoid').textContent = result.avoid;
    document.getElementById('decode-words').textContent = result.words;
    document.getElementById('decoder-result').style.display = 'block';
  }
}
