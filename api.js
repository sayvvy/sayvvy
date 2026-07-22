// ===========================
// ANTHROPIC API
// ===========================

async function callClaude(system, messages) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.anthropic,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: CONFIG.model,
        max_tokens: CONFIG.max_tokens,
        system: system,
        messages: messages
      })
    });
    const data = await res.json();
    return data.content[0].text;
  } catch(e) {
    console.error('Claude API error:', e);
    return null;
  }
}

// ===========================
// PRESENCE ANALYSIS
// ===========================

async function analysePresence() {
  const system = `You are Sayvvy's AI presence analyser. Based on user's goals and voice transcript, generate their communication presence profile. Return ONLY valid JSON, no markdown.`;

  const prompt = `User name: ${STATE.name}. Goals: ${STATE.goals.join(', ')}. Voice transcript: ${STATE.voiceTranscript}. Filler words detected: ${STATE.fillerCount}. Speaking pace: ${STATE.pace} words per minute.

Generate presence profile as JSON:
{
  "type": "<2-4 word personality type name>",
  "description": "<2-3 honest sentences about their communication style and what holds them back, address them by name>",
  "confidence": <0-100>,
  "persuasion": <0-100>,
  "first_impression": <0-100>,
  "emotional_appeal": <0-100>,
  "trust_building": <0-100>,
  "composure": <0-100>,
  "training_start": "<what Rao teaches first, cite specific expert>",
  "rao_insight": "<personalised daily insight from Rao, 1-2 sentences, use their name>"
}`;

  if(CONFIG.anthropic === 'YOUR_ANTHROPIC_KEY_HERE') {
    return buildDemoPresence();
  }

  const result = await callClaude(system, [{role: 'user', content: prompt}]);
  if(!result) return buildDemoPresence();

  try {
    return JSON.parse(result.replace(/```json|```/g, '').trim());
  } catch(e) {
    return buildDemoPresence();
  }
}

function buildDemoPresence() {
  const profiles = {
    confidence: {
      type: 'The Quiet Powerhouse',
      description: `${STATE.name}, your thinking is strong but your voice doesn't carry it yet. You hold back when you should speak. The room underestimates you — Rao fixes that.`,
      confidence: 32, persuasion: 55, first_impression: 48,
      emotional_appeal: 52, trust_building: 61, composure: 44
    },
    persuade: {
      type: 'The Unheard Thinker',
      description: `${STATE.name}, you have real arguments but people don't feel them. You lead with logic when you need to move people emotionally first.`,
      confidence: 58, persuasion: 34, first_impression: 62,
      emotional_appeal: 38, trust_building: 55, composure: 60
    },
    default: {
      type: 'The Hesitant Strategist',
      description: `${STATE.name}, your ideas are sharp. Your delivery holds them back. The gap between your mind and your mouth is costing you rooms you deserve to own.`,
      confidence: 38, persuasion: 52, first_impression: 61,
      emotional_appeal: 44, trust_building: 57, composure: 29
    }
  };

  const key = STATE.goals[0] || 'default';
  const p = profiles[key] || profiles.default;
  return {
    ...p,
    training_start: "Voss's tactical empathy to hold your ground. Then Cialdini's social proof to land your ideas with authority.",
    rao_insight: `Your confidence is your biggest lever right now, ${STATE.name}. Today's challenge hits it directly. You're more ready than you think.`
  };
}

// ===========================
// LIVE CONVERSATION ENGINE
// ===========================

async function getOpponentResponse(character, conversationHistory, userMessage) {
  const char = CHARACTERS[character];

  const system = `You are ${char.name}, playing the role of ${char.role} in a communication training scenario for Sayvvy app.

Your personality: ${char.personality}
Escalation pattern: ${char.escalation}

CRITICAL RULES:
- You are a REAL person, not an AI. Never break character.
- React SPECIFICALLY to exactly what the user just said — not generic responses
- Keep responses SHORT — 1-3 sentences maximum
- Be realistic and human — use natural speech patterns
- Escalate pressure gradually as conversation continues
- Never be helpful or encouraging — stay in character
- Make the user work for every inch`;

  const messages = [
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  if(CONFIG.anthropic === 'YOUR_ANTHROPIC_KEY_HERE') {
    return getDemoOpponentResponse(character, conversationHistory.length);
  }

  const result = await callClaude(system, messages);
  return result || getDemoOpponentResponse(character, conversationHistory.length);
}

function getDemoOpponentResponse(character, exchangeCount) {
  const responses = {
    dismisser: [
      "We've tried something similar before. It didn't work.",
      "I don't see how that addresses the core problem.",
      "Look, I appreciate the effort but we need to move on.",
      "That's not what we're looking for right now.",
      "I think you're overcomplicating this."
    ],
    skeptic: [
      "But who exactly is your target customer? Be specific.",
      "What makes you think people will pay for this?",
      "Your competitor does exactly this. Why are you different?",
      "That's an assumption. What's your data?",
      "How do you plan to acquire your first 1000 users?"
    ],
    intimidator: [
      "I've heard this pitch before. What's actually new here?",
      "One minute left. Get to the point.",
      "Numbers. I need numbers, not ideas.",
      "Why should I care about this specifically?",
      "That's not a plan. That's a hope."
    ]
  };

  const options = responses[character] || responses.dismisser;
  return options[Math.min(exchangeCount, options.length - 1)];
}

// ===========================
// CONVERSATION BREAKDOWN
// ===========================

async function getConversationBreakdown(scenario, character, conversation) {
  const char = CHARACTERS[character];
  const conversationText = conversation
    .map(m => `${m.role === 'user' ? 'You' : char.name}: ${m.content}`)
    .join('\n');

  const system = `You are Rao, Sayvvy's elite communication coach. Analyse a complete conversation and give precise, honest, actionable feedback. You blend directness with warmth. Reference specific moments from the conversation. Return ONLY valid JSON.`;

  const prompt = `User: ${STATE.name}. Presence type: ${STATE.presenceType}.
Scenario: ${scenario.title} — ${scenario.context}
Character they faced: ${char.name} (${char.role})
Technique being trained: ${scenario.technique}

Full conversation:
${conversationText}

Analyse the entire conversation and return JSON:
{
  "overall": <40-100>,
  "persuasion": <1-10>,
  "confidence": <1-10>,
  "clarity": <1-10>,
  "composure": <1-10>,
  "headline": "<one punchy sentence summarising their performance>",
  "best_moment": "<specific quote or moment from conversation that worked best>",
  "worst_moment": "<specific quote or moment that needs most work>",
  "pattern": "<the communication pattern Rao noticed across the whole conversation>",
  "worked": "<2 sentences on what they did right>",
  "fix": "<2 sentences on the single most important thing to improve, very specific>",
  "technique_name": "<exact technique name and expert>",
  "technique_short": "<one sentence what it is>",
  "technique_long": "<3-4 sentences deeper explanation with how to practise it>",
  "next_challenge": "<what Rao recommends they work on next>"
}`;

  if(CONFIG.anthropic === 'YOUR_ANTHROPIC_KEY_HERE') {
    return getDemoBreakdown();
  }

  const result = await callClaude(system, [{role: 'user', content: prompt}]);
  if(!result) return getDemoBreakdown();

  try {
    return JSON.parse(result.replace(/```json|```/g, '').trim());
  } catch(e) {
    return getDemoBreakdown();
  }
}

function getDemoBreakdown() {
  return {
    overall: 72,
    persuasion: 7,
    confidence: 7,
    clarity: 8,
    composure: 6,
    headline: "You stayed in the room — but gave ground too easily.",
    best_moment: "Your opening response showed awareness of the dynamic.",
    worst_moment: "When pushed back on, you explained instead of held frame.",
    pattern: "You default to over-explaining under pressure. Logic when you need presence.",
    worked: "You engaged directly instead of going quiet. That takes more courage than it looks. Your clarity improved as the conversation went on.",
    fix: "Stop explaining yourself when challenged. State your position once, cleanly, then ask a question. 'It sounds like you have a specific concern — what is it?' puts the pressure back on them.",
    technique_name: "Labelling — Chris Voss",
    technique_short: "Name what the other person feels. They confirm or correct. Either way you stay in control.",
    technique_long: "Labelling is from Never Split the Difference by Chris Voss. Say 'It seems like...' or 'It sounds like...' followed by what you observe them feeling. This makes the other person feel heard, lowers their defenses, and keeps you inside the conversation without being confrontational. The key is to state it as an observation, then go completely silent.",
    next_challenge: "Practice the same scenario again — this time use one label per exchange. Nothing else."
  };
}

// ===========================
// PEOPLE DECODER
// ===========================

async function decodePerson(input) {
  const system = `You are Rao, Sayvvy's people-intelligence engine. Decode people's communication patterns using Cialdini, Carnegie, Voss, and behavioural psychology. Be precise and actionable. Return ONLY valid JSON.`;

  const prompt = `Decode this person or situation: "${input}"

Return JSON:
{
  "type": "<personality/communication type, 3-5 words>",
  "want": "<what they actually want beneath the surface, 1-2 sentences>",
  "fear": "<what they are afraid of, 1 sentence>",
  "approach": "<exactly how to approach and handle them, 1-2 sentences citing specific expert technique>",
  "avoid": "<what NOT to do with this person, 1 sentence>",
  "words": "<exact words or phrases to use with them, in quotes>"
}`;

  if(CONFIG.anthropic === 'YOUR_ANTHROPIC_KEY_HERE') {
    return {
      type: 'Defensive-competitive type',
      want: 'To maintain credibility and status. They feel threatened and responded by dismissing rather than engaging.',
      fear: 'Being exposed as wrong or losing authority in front of others.',
      approach: "Give them a face-saving bridge privately. Use Carnegie's principle — let them feel the idea was partly theirs.",
      avoid: "Never challenge them publicly — it triggers defensiveness and they will never back down.",
      words: '"I think you raised something important — can we look at it together? I\'d value your read on this."'
    };
  }

  const result = await callClaude(system, [{role: 'user', content: prompt}]);
  if(!result) return null;

  try {
    return JSON.parse(result.replace(/```json|```/g, '').trim());
  } catch(e) {
    return null;
  }
}

// ===========================
// VOICE TRANSCRIPTION
// ===========================

async function transcribeAudio(blob) {
  try {
    const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {'authorization': CONFIG.assemblyai},
      body: blob
    });
    const uploadData = await uploadRes.json();

    const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': CONFIG.assemblyai,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: uploadData.upload_url,
        sentiment_analysis: true,
        filler_words: true,
        speech_threshold: 0.2
      })
    });
    const transcriptData = await transcriptRes.json();
    const transcriptId = transcriptData.id;

    const poll = async () => {
      const pollRes = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        { headers: {'authorization': CONFIG.assemblyai} }
      );
      const pollData = await pollRes.json();

      if(pollData.status === 'completed') {
        const fillerCount = (pollData.text.match(
          /\b(um|uh|like|you know|basically|literally|right)\b/gi
        ) || []).length;
        const wordCount = pollData.words?.length || 0;
        const duration = pollData.audio_duration || 60;
        const pace = Math.round((wordCount / duration) * 60);

        STATE.voiceTranscript = pollData.text;
        STATE.fillerCount = fillerCount;
        STATE.pace = pace;
      } else if(pollData.status === 'error') {
        STATE.voiceTranscript = 'Transcription failed. Goals: ' + STATE.goals.join(', ');
      } else {
        setTimeout(poll, 2000);
      }
    };
    poll();

  } catch(e) {
    STATE.voiceTranscript = 'Voice recorded. Goals: ' + STATE.goals.join(', ');
  }
}
