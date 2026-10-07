const Event = require('../models/Event');
const Club = require('../models/Club');
const { env } = require('../config/env');

class GeminiError extends Error {
  constructor(message, code = 'AI_GENERATION_FAILED', statusCode = 500, details = {}) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Verify organizer or admin authorization to generate descriptions for a given club/event.
 */
const assertAIGenerationAccess = async (user, { eventId, clubId }) => {
  if (user.role !== 'admin' && user.role !== 'organizer') {
    throw new GeminiError(
      'Access denied: Only event organizers and administrators can generate AI event descriptions.',
      'UNAUTHORIZED_AI_GENERATION',
      403
    );
  }

  let targetClubId = clubId;

  if (eventId) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new GeminiError('Event not found.', 'EVENT_NOT_FOUND', 404);
    }
    targetClubId = event.club;
  }

  if (targetClubId) {
    const club = await Club.findById(targetClubId);
    if (!club) {
      throw new GeminiError('Club not found.', 'CLUB_NOT_FOUND', 404);
    }

    if (user.role === 'admin') {
      return { club };
    }

    const isAssigned =
      club.organizers &&
      club.organizers.some((orgId) => orgId.toString() === user._id.toString());

    if (!isAssigned) {
      throw new GeminiError(
        'You are not authorized to generate event descriptions for clubs you do not manage.',
        'UNAUTHORIZED_AI_GENERATION',
        403
      );
    }

    return { club };
  }

  if (user.role === 'admin') {
    return true;
  }

  throw new GeminiError(
    'Club identification is required to verify organizer permissions.',
    'UNAUTHORIZED_AI_GENERATION',
    400
  );
};

/**
 * Build the controlled prompt for Gemini.
 */
const buildGeminiPrompt = ({ title, category, clubName, venue, startDateTime, endDateTime, highlights, audience, details }) => {
  const parts = [];

  parts.push(
    `You are a professional campus event copywriter. Your task is to write an engaging, informative, and student-friendly event description.`
  );
  parts.push(`\nStrict Generation Guidelines:`);
  parts.push(`- Rely strictly on the event information provided below.`);
  parts.push(`- DO NOT invent external facts, guest speakers, celebrity guests, sponsors, prizes, dates, or venues.`);
  parts.push(`- DO NOT make unsupported claims or guarantees.`);
  parts.push(`- Keep the tone clear, enthusiastic, welcoming, and college student-appropriate.`);
  parts.push(`- Format the output as clean plain text with standard paragraphs. DO NOT use markdown headers (# or ##), executable code, or JSON.`);
  parts.push(`- The description should be between 100 and 350 words.`);

  parts.push(`\nEvent Details:`);
  parts.push(`- Title: ${title}`);
  if (clubName) parts.push(`- Organizing Club: ${clubName}`);
  if (category) parts.push(`- Category: ${category}`);
  if (venue) parts.push(`- Venue: ${venue}`);
  if (startDateTime) parts.push(`- Start Time: ${startDateTime}`);
  if (endDateTime) parts.push(`- End Time: ${endDateTime}`);
  if (highlights) parts.push(`- Key Highlights: ${highlights}`);
  if (audience) parts.push(`- Intended Audience: ${audience}`);
  if (details) parts.push(`- Additional Organizer Notes: ${details}`);

  parts.push(`\nReturn ONLY the event description text.`);

  return parts.join('\n');
};

/**
 * Call Gemini API with timeout, validation, and error normalization.
 */
const generateDescription = async (user, input) => {
  // 1. Authorize user
  const authResult = await assertAIGenerationAccess(user, {
    eventId: input.eventId,
    clubId: input.clubId,
  });

  const clubName = authResult?.club?.name || input.clubName || 'Campus Club';

  // 2. Check API Key configuration
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    throw new GeminiError(
      'AI description generation is currently unconfigured or unavailable. You can write the description manually.',
      'AI_CONFIG_ERROR',
      503
    );
  }

  // 3. Construct prompt
  const prompt = buildGeminiPrompt({
    ...input,
    clubName,
  });

  const model = env.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // 4. Execute request with strict 15-second timeout via AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }

      const status = response.status;
      const providerMsg = errorData?.error?.message || 'Upstream provider error';

      if (status === 429) {
        throw new GeminiError(
          'Gemini rate limit or quota exceeded. Please try again shortly or write the description manually.',
          'AI_PROVIDER_ERROR',
          429
        );
      }

      if (status === 400 || status === 403) {
        throw new GeminiError(
          'Gemini service configuration error. Please write the description manually.',
          'AI_CONFIG_ERROR',
          status === 403 ? 503 : 502
        );
      }

      throw new GeminiError(
        'AI description generation is currently unavailable. You can write the description manually.',
        'AI_PROVIDER_ERROR',
        502
      );
    }

    const json = await response.json();

    // 5. Validate Gemini output
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
      throw new GeminiError(
        'Gemini returned an empty or invalid response. Please write the description manually.',
        'AI_INVALID_RESPONSE',
        502
      );
    }

    const trimmedDescription = rawText.trim();
    if (trimmedDescription.length < 10) {
      throw new GeminiError(
        'Generated description was too brief. Please write the description manually.',
        'AI_INVALID_RESPONSE',
        502
      );
    }

    // Cap at reasonable maximum length (3000 chars matching Event model)
    const finalDescription = trimmedDescription.length > 3000
      ? trimmedDescription.slice(0, 3000)
      : trimmedDescription;

    // Notice: Event document is NOT automatically modified or published!
    return {
      description: finalDescription,
      isAIGenerated: true,
      model,
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new GeminiError(
        'AI description request timed out after 15 seconds. Please try again or write the description manually.',
        'AI_TIMEOUT',
        504
      );
    }

    if (err instanceof GeminiError) {
      throw err;
    }

    throw new GeminiError(
      'AI description generation is currently unavailable. You can write the description manually.',
      'AI_PROVIDER_ERROR',
      502
    );
  }
};

module.exports = {
  GeminiError,
  assertAIGenerationAccess,
  buildGeminiPrompt,
  generateDescription,
};
