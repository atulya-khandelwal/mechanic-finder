import { config } from '../config.js';
import { query } from '../db.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function loadCategoriesForPrompt() {
  const result = await query(
    'SELECT id, name, description, type FROM service_categories ORDER BY type, name'
  );
  return result.rows;
}

function parseJsonFromContent(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  const text = fence ? fence[1].trim() : trimmed;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * @param {{ problemText: string, vehicleMake?: string, vehicleModel?: string }} input
 */
export async function suggestTriage(input) {
  if (!config.groqApiKey) {
    const err = new Error('AI triage is not configured');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }

  const problemText = String(input.problemText || '').trim();
  if (problemText.length < 8) {
    const err = new Error('Please describe the problem in a bit more detail (at least 8 characters)');
    err.code = 'VALIDATION';
    throw err;
  }

  const categories = await loadCategoriesForPrompt();
  if (!categories.length) {
    const err = new Error('No service categories available');
    err.code = 'NO_CATEGORIES';
    throw err;
  }

  const categoryLines = categories.map(
    (c) =>
      `- id: ${c.id}\n  name: ${c.name}\n  type: ${c.type}\n  description: ${(c.description || '').slice(0, 500)}`
  );

  const system = `You are a triage assistant for a mobile mechanic booking app. Your job is to map the customer's free-text vehicle problem to exactly one service category from the list provided in the user message.

Rules:
- You MUST set categoryId to one of the exact UUIDs from the list — copy the id string exactly.
- serviceType MUST be either "emergency" or "scheduled" and MUST match the chosen category's type field.
- Prefer "emergency" for immediate safety risks: stranded vehicle, won't start in dangerous place, smoke, fire smell, brake failure suspicion, steering loss, highway breakdown, severe fluid leak while driving, etc.
- Prefer "scheduled" for routine maintenance, non-urgent repairs, inspections, AC, oil change when car is driveable, etc.
- safetyTips: 2–5 short bullet-style strings with general safety reminders (pull over safely, do not drive if brakes failed, etc.). Not a diagnosis.
- briefReason: one short sentence explaining the mapping.
- confidence: "high" | "medium" | "low"

Respond with a single JSON object only, no markdown, no extra keys beyond: categoryId, serviceType, safetyTips (array of strings), briefReason, confidence.`;

  const vehicleBits = [];
  if (input.vehicleMake?.trim()) vehicleBits.push(`Vehicle make: ${input.vehicleMake.trim()}`);
  if (input.vehicleModel?.trim()) vehicleBits.push(`Vehicle model: ${input.vehicleModel.trim()}`);
  const userBlock = `${vehicleBits.length ? vehicleBits.join('\n') + '\n\n' : ''}Customer problem:\n${problemText}\n\nAvailable categories (choose exactly one id):\n${categoryLines.join('\n')}`;

  const body = {
    model: config.groqModel,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userBlock },
    ],
    temperature: 0.2,
    max_tokens: 600,
    response_format: { type: 'json_object' },
  };

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `Groq request failed (${res.status})`;
    const err = new Error(msg);
    err.code = 'GROQ_ERROR';
    err.status = res.status;
    throw err;
  }

  const content = data?.choices?.[0]?.message?.content;
  const parsed = parseJsonFromContent(typeof content === 'string' ? content : '');
  if (!parsed || typeof parsed !== 'object') {
    const err = new Error('Could not parse AI response');
    err.code = 'PARSE';
    throw err;
  }

  const rawId = parsed.categoryId ?? parsed.category_id;
  const categoryId = rawId != null ? String(rawId).trim() : '';
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) {
    const err = new Error('The AI picked an invalid category. Please try again or choose a service manually.');
    err.code = 'INVALID_CATEGORY';
    throw err;
  }

  const serviceType = cat.type;

  let safetyTips = Array.isArray(parsed.safetyTips)
    ? parsed.safetyTips.map((s) => String(s).trim()).filter(Boolean).slice(0, 8)
    : [];
  if (!safetyTips.length) {
    safetyTips = ['If you feel unsafe, stop in a safe place and seek help.'];
  }

  const briefReason =
    typeof parsed.briefReason === 'string' && parsed.briefReason.trim()
      ? parsed.briefReason.trim()
      : 'Suggested from your description.';

  const confidence =
    parsed.confidence === 'high' || parsed.confidence === 'medium' || parsed.confidence === 'low'
      ? parsed.confidence
      : 'medium';

  return {
    categoryId: cat.id,
    categoryName: cat.name,
    serviceType: cat.type,
    safetyTips,
    briefReason,
    confidence,
    disclaimer:
      'Suggestions are not a professional diagnosis. A mechanic will assess your vehicle.',
  };
}
