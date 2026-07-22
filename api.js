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
- Never be helpful or encouraging — stay in
