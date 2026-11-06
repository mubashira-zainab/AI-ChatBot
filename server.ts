import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { UNIVERSITY_KNOWLEDGE } from './src/universityKnowledge.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parser
app.use(express.json({ limit: '1mb' }));

// Free-tier compatible models in order of speed and stability
const SUPPORTED_MODELS = [
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', tag: 'Ultra-Fast & Stable (Recommended)' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', tag: 'Fast & Comprehensive' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', tag: 'Deep Reasoning (High Demand)' },
];

const FALLBACK_CANDIDATES = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

// In-memory rate limiting map
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;

function rateLimitMiddleware(req: Request, res: Response, next: () => void) {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const clientRecord = requestCounts.get(clientIp);

  if (!clientRecord || now > clientRecord.resetTime) {
    requestCounts.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (clientRecord.count >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Too many requests. Please pause for a few seconds before asking another question.',
    });
  }

  clientRecord.count += 1;
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, 60 * 1000);

// Initialize Google Gemini Client safely
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMsg: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMsg));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Build comprehensive University AI System Instruction
function buildSystemInstruction(): string {
  const uni = UNIVERSITY_KNOWLEDGE;
  return `You are UniAssist AI, a professional, friendly, knowledgeable, and helpful university assistant for ${uni.name}.
Your purpose is to assist students, prospective applicants, faculty, and campus visitors with university-related information, academic guidance, courses, campus resources, and general educational questions.

### PERSONALITY & TONE
- Professional, welcoming, encouraging, structured, and student-centered.
- Use clean Markdown with headers (###), bullet points, bold key terms, and concise tables when comparing options.
- Give concrete, actionable next steps (e.g., specific office to contact, deadlines to mark, links to look out for).

### OFFICIAL UNIVERSITY KNOWLEDGE BASE:
- University: ${uni.name} (${uni.tagline}), Founded ${uni.founded}, ${uni.campusType}.
- Student Body: ~${uni.studentBody.toLocaleString()} students.
- Key Offices & Directory:
  * Admissions: ${uni.contacts.admissions.email} | ${uni.contacts.admissions.phone} | ${uni.contacts.admissions.location}
  * Registrar: ${uni.contacts.registrar.email} | ${uni.contacts.registrar.phone} | ${uni.contacts.registrar.location}
  * Financial Aid: ${uni.contacts.financialAid.email} | ${uni.contacts.financialAid.phone} | ${uni.contacts.financialAid.location}
  * Academic Advising: ${uni.contacts.academicAdvising.email} | ${uni.contacts.academicAdvising.location}
  * International Students Office (ISO): ${uni.contacts.internationalOffice.email} | ${uni.contacts.internationalOffice.location}
  * Career Services: ${uni.contacts.careerServices.email} | ${uni.contacts.careerServices.location}
  * Campus Health & Counseling: ${uni.contacts.campusHealth.email} | ${uni.contacts.campusHealth.phone}
  * Campus Police / Emergency (24/7): ${uni.contacts.campusPolice.phone}

- Academic Calendar Overview:
  * Fall Semester: ${uni.academicCalendar.fallSemester.dates} (Add/Drop: ${uni.academicCalendar.fallSemester.addDrop}; Finals: ${uni.academicCalendar.fallSemester.finals})
  * Spring Semester: ${uni.academicCalendar.springSemester.dates} (Add/Drop: ${uni.academicCalendar.springSemester.addDrop}; Break: ${uni.academicCalendar.springSemester.break}; Finals: ${uni.academicCalendar.springSemester.finals})
  * Summer Term: ${uni.academicCalendar.summerTerm.dates}

- Colleges & Schools:
  ${uni.colleges.map((c) => `* ${c.name} (${c.code}): ${c.popularPrograms.join(', ')}`).join('\n  ')}

- Admissions Deadlines & Criteria:
  * Early Action (Undergrad): ${uni.admissions.deadlines.undergradEarlyAction}
  * Regular Decision (Undergrad): ${uni.admissions.deadlines.undergradRegularDecision}
  * Transfer Fall: ${uni.admissions.deadlines.transferFall}
  * Graduate Priority: ${uni.admissions.deadlines.graduatePriority}
  * Undergrad Requirements: ${uni.admissions.requirementsUndergrad.join('; ')}
  * International Requirements: ${uni.admissions.internationalInfo.join('; ')}

- Grading System & Academic Policies:
  * 4.0 GPA scale (A=4.0, A-=3.7, B+=3.3, B=3.0, B-=2.7, C+=2.3, C=2.0, D=1.0, F=0.0).
  * Dean's List: ${uni.gradingAndPolicies.deansListCriteria}
  * Academic Probation: ${uni.gradingAndPolicies.probationThreshold}
  * Standard Credit Load: ${uni.gradingAndPolicies.standardCreditLoad}

- Scholarships:
  ${uni.scholarships.map((s) => `* ${s.name}: ${s.amount} (${s.eligibility})`).join('\n  ')}

- Major Campus Facilities:
  ${uni.facilities.map((f) => `* ${f.name}: Hours: ${f.hours} | ${f.features}`).join('\n  ')}

### CRITICAL RULES:
1. Accuracy: Do not fabricate official university policies, dates, fees, or private grade records. If a student asks for exact personal billing numbers or official transcripts, politely explain that UniAssist cannot access private student records and direct them to the Office of the Registrar (${uni.contacts.registrar.email}) or Student Portal.
2. Unverified Data: If a question pertains to a specific university topic not covered by the verified knowledge base or asks about another university, answer helpfully with general academic best practices and explicitly advise the user to confirm exact details with the relevant university office.
3. Student Support: If a student asks about stress, exam anxiety, or mental health, warmly share the Campus Health & Counseling Center details (${uni.contacts.campusHealth.phone}) and offer structured, calming study frameworks.`;
}

// API Health Check & Info
app.get('/api/health', (req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  res.json({
    status: 'ok',
    service: 'UniAssist AI Server',
    university: UNIVERSITY_KNOWLEDGE.name,
    hasApiKey: hasKey,
    defaultModel: 'gemini-3.1-flash-lite',
    supportedModels: SUPPORTED_MODELS,
  });
});

// API Direct Diagnostic Test
app.get('/api/test-direct', async (req: Request, res: Response) => {
  const modelToTest = (req.query.model as string) || 'gemini-3.1-flash-lite';
  const key = process.env.GEMINI_API_KEY;
  const keyPrefix = key ? `${key.substring(0, 4)}...${key.substring(key.length - 4)} (len: ${key.length})` : 'MISSING';

  try {
    const ai = getGeminiClient();
    const t0 = Date.now();
    const result = await ai.models.generateContent({
      model: modelToTest,
      contents: 'Say hello in 3 words.',
    });
    return res.json({
      success: true,
      timeMs: Date.now() - t0,
      model: modelToTest,
      keyPrefix,
      text: result.text,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      model: modelToTest,
      keyPrefix,
      message: err?.message,
      status: err?.status,
      code: err?.code,
    });
  }
});

// API Knowledge Base endpoint for modal viewer
app.get('/api/knowledge', (req: Request, res: Response) => {
  res.json(UNIVERSITY_KNOWLEDGE);
});

// API Suggest Follow-ups (using fast model)
app.post('/api/suggest-followups', async (req: Request, res: Response) => {
  try {
    const { lastUserMessage, lastAiResponse } = req.body;
    if (!lastAiResponse || typeof lastAiResponse !== 'string') {
      return res.json({ suggestions: [] });
    }

    const ai = getGeminiClient();
    const prompt = `Based on this university assistance interaction, generate exactly 3 short, relevant follow-up questions a student might want to ask next.
Student: "${(lastUserMessage || '').slice(0, 300)}"
UniAssist AI: "${lastAiResponse.slice(0, 400)}"

Return ONLY a valid JSON array of 3 strings, each under 8 words. Example: ["How do I contact admissions?", "What are the dorm deadlines?", "Can I apply for a scholarship?"]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) {
      return res.json({ suggestions: parsed.slice(0, 3) });
    }
    return res.json({ suggestions: [] });
  } catch {
    return res.json({ suggestions: [] });
  }
});

// Primary Chat Endpoint (Supports SSE Streaming with automatic resilient model fallback)
app.post('/api/chat', rateLimitMiddleware, async (req: Request, res: Response) => {
  let streamHeadersSent = false;

  try {
    const { messages, model = 'gemini-3.1-flash-lite', stream = true } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required and cannot be empty.' });
    }

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || !lastMsg.content || typeof lastMsg.content !== 'string' || !lastMsg.content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    if (lastMsg.content.length > 4000) {
      return res.status(400).json({ error: 'Message exceeds the 4,000 character limit.' });
    }

    // Filter and sanitize conversation history
    const formattedContents = messages
      .filter((m: { role: string; content?: string }) => m && typeof m.content === 'string' && m.content.trim())
      .map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content.trim() }],
      }));

    if (formattedContents.length === 0) {
      return res.status(400).json({ error: 'No valid messages to send.' });
    }

    const ai = getGeminiClient();
    const systemInstruction = buildSystemInstruction();

    // Determine fallback order: requested model first, then alternate free models
    const requestedModel = typeof model === 'string' && model.trim() ? model.trim() : 'gemini-3.1-flash-lite';
    const modelsToTry = [
      requestedModel,
      ...FALLBACK_CANDIDATES.filter((m) => m !== requestedModel),
    ];

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();
      streamHeadersSent = true;

      let success = false;
      let lastErr: any = null;

      for (const currentModel of modelsToTry) {
        try {
          console.log(`[UniAssist AI] Initiating stream with model: ${currentModel}`);

          // Set 6-second timeout race on stream initialization
          const responseStream = await withTimeout(
            ai.models.generateContentStream({
              model: currentModel,
              contents: formattedContents,
              config: {
                systemInstruction,
              },
            }),
            6000,
            `Model ${currentModel} response connection timed out`
          );

          let chunkCount = 0;
          for await (const chunk of responseStream) {
            chunkCount++;
            const text = chunk.text;
            if (text) {
              res.write(`data: ${JSON.stringify({ text, model: currentModel })}\n\n`);
            }
          }

          if (chunkCount > 0) {
            console.log(`[UniAssist AI] Successfully streamed ${chunkCount} chunks with ${currentModel}`);
            res.write('data: [DONE]\n\n');
            res.end();
            success = true;
            break;
          }
        } catch (modelError: any) {
          console.warn(`[UniAssist AI] Model ${currentModel} returned error:`, modelError?.message || modelError);
          lastErr = modelError;

          const errStr = String(modelError?.message || modelError);
          const isRecoverable =
            modelError?.status === 503 ||
            modelError?.status === 404 ||
            modelError?.status === 429 ||
            errStr.includes('timed out') ||
            errStr.includes('high demand') ||
            errStr.includes('UNAVAILABLE') ||
            errStr.includes('RESOURCE_EXHAUSTED');

          if (!isRecoverable) {
            throw modelError;
          }
          // Continue to next candidate model in loop
        }
      }

      if (!success) {
        throw lastErr || new Error('All free-tier models are temporarily experiencing high demand. Please try again shortly.');
      }
      return;
    } else {
      // Non-streaming fallback
      let success = false;
      let lastErr: any = null;

      for (const currentModel of modelsToTry) {
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: currentModel,
              contents: formattedContents,
              config: {
                systemInstruction,
              },
            }),
            6000,
            `Model ${currentModel} timed out`
          );
          return res.json({ text: response.text || '', model: currentModel });
        } catch (modelError: any) {
          lastErr = modelError;
        }
      }

      throw lastErr || new Error('All models are currently busy. Please try again shortly.');
    }
  } catch (error: any) {
    console.error('[UniAssist AI] Chat Endpoint Error:', error);

    const errorMessage = error?.message || 'An unexpected error occurred while communicating with Gemini.';
    let clientError = 'UniAssist encountered a communication error with Google Gemini. Please try again.';

    if (errorMessage.includes('GEMINI_API_KEY')) {
      clientError = 'Gemini API key is not configured in the server environment. Please configure your API key in Settings > Secrets.';
    } else if (errorMessage.includes('RESOURCE_EXHAUSTED') || error?.status === 429) {
      clientError = 'Google Gemini free-tier rate limit reached. Please wait a few seconds before asking another question.';
    } else if (errorMessage.includes('PERMISSION_DENIED') || error?.status === 403) {
      clientError = 'Access denied by Google AI Studio. Please verify that your API key is active in Settings > Secrets.';
    } else if (errorMessage.includes('UNAVAILABLE') || error?.status === 503 || errorMessage.includes('high demand')) {
      clientError = 'Google Gemini servers are currently experiencing peak campus traffic. Please try again in 10-15 seconds.';
    }

    if (streamHeadersSent) {
      res.write(`data: ${JSON.stringify({ error: clientError })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    return res.status(500).json({ error: clientError, details: errorMessage });
  }
});

// Server boot logic with Vite dev middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[UniAssist AI] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[UniAssist AI] Failed to start server:', err);
  process.exit(1);
});
