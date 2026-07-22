// ===========================
// PASTE YOUR API KEYS HERE
// ===========================
const ANTHROPIC_KEY = 'YOUR_ANTHROPIC_KEY_HERE';
const ASSEMBLYAI_KEY = 'YOUR_ASSEMBLYAI_KEY_HERE';
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_KEY = 'YOUR_SUPABASE_KEY_HERE';
// ===========================

const CONFIG = {
  anthropic: ANTHROPIC_KEY,
  assemblyai: ASSEMBLYAI_KEY,
  supabase_url: SUPABASE_URL,
  supabase_key: SUPABASE_KEY,
  model: 'claude-sonnet-4-6',
  max_tokens: 1000
};

const STATE = {
  name: '',
  goals: [],
  presenceType: '',
  presenceDesc: '',
  voiceTranscript: '',
  fillerCount: 0,
  pace: 0,
  streak: 1,
  presenceScore: 64,
  dayCount: 1,
  conversation: [],
  currentCharacter: null,
  sessionActive: false
};

const CHARACTERS = {
  dismisser: {
    name: 'The Dismisser',
    role: 'Senior Manager',
    personality: 'You dismiss ideas without explanation, move on quickly, show mild contempt. You are not aggressive but completely dismissive. Short responses. Never validate. React specifically to what the user said.',
    opener: '"That won\'t work. Moving on."',
    escalation: 'Gets more impatient and dismissive as conversation continues'
  },
  skeptic: {
    name: 'The Skeptic',
    role: 'Investor',
    personality: 'You question everything with sharp precision. Every answer gets another question. You are intelligent and probing, not rude. React specifically to what the user said.',
    opener: '"Interesting. But why would anyone pay for this?"',
    escalation: 'Questions get harder and more specific as conversation continues'
  },
  intimidator: {
    name: 'The Intimidator',
    role: 'Senior Executive',
    personality: 'You are powerful, busy, slightly impatient. You make people feel small without trying. Short authoritative responses. React specifically to what the user said.',
    opener: '"You have two minutes. Make it count."',
    escalation: 'Becomes more impatient and authoritative as conversation continues'
  }
};

const SCENARIOS = [
  {
    id: 1,
    title: 'Dismissed in a meeting',
    context: 'You pitched an idea in a team meeting. Your manager dismissed it immediately without explanation.',
    character: 'dismisser',
    technique: 'Labelling — Chris Voss',
    hint: 'Label what they seem to feel: "It sounds like you have concerns about this approach?" Then stay silent.'
  },
  {
    id: 2,
    title: 'Investor pitch',
    context: 'You are pitching Sayvvy to an angel investor. They seem unimpressed after your opening.',
    character: 'skeptic',
    technique: 'Social proof — Cialdini',
    hint: 'Name who else believes in it. Specifics beat vague claims every time.'
  },
  {
    id: 3,
    title: 'Executive meeting',
    context: 'You have two minutes with a powerful executive to make your case for a project.',
    character: 'intimidator',
    technique: 'Tactical empathy — Voss',
    hint: 'Acknowledge their time constraint first. Then lead with your strongest point immediately.'
  },
  {
    id: 4,
    title: 'Salary negotiation',
    context: 'You are negotiating your salary. The HR manager says the budget is fixed.',
    character: 'skeptic',
    technique: 'Anchoring — Voss',
    hint: 'Never accept the first frame. Ask what flexibility exists before accepting any constraint.'
  },
  {
    id: 5,
    title: 'Idea stolen in meeting',
    context: 'You said something in a meeting. A senior colleague repeated it as their own idea five minutes later.',
    character: 'intimidator',
    technique: 'Frame control — Greene',
    hint: 'Reclaim your frame calmly and publicly. "That builds on what I mentioned earlier about..."'
  }
];
