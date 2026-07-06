import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateFallbackAnswer } from './tutorFallback';

export interface TutorHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TutorContext {
  phase?: string;
  targetCareer?: string;
  relatedTopics?: string[];
  longDescription?: string;
  shortDescription?: string;
  whatToLearn?: string[];
  whyItMatters?: string;
  prerequisites?: string[];
  projects?: { title: string; description: string; difficulty: string }[];
}

export interface TutorRequest {
  topic: string;
  roadmap: string;
  roadmapId?: string;
  topicId?: string;
  level?: string;
  question: string;
  history?: TutorHistoryMessage[];
  context?: TutorContext;
}

export interface TutorResponse {
  answer: string;
  source: 'ai' | 'fallback';
}

const OPENROUTER_API_KEY = 'REDACTED';
const OPENROUTER_MODEL = 'google/gemini-2.5-flash:free';
const GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash'];
const NVIDIA_MODEL = 'nvidia/nemotron-3-super-120b-a12b';

export function buildSystemPrompt(req: TutorRequest): string {
  const ctx = req.context || {};
  const learnList = ctx.whatToLearn?.length ? ctx.whatToLearn.join(', ') : 'See topic overview';
  const prereqList = ctx.prerequisites?.length ? ctx.prerequisites.join(', ') : 'None specified';
  const relatedList = ctx.relatedTopics?.length ? ctx.relatedTopics.join(', ') : 'See roadmap';

  return `You are Sara, a friendly, professional AI tutor embedded inside a career roadmap platform.  
Explain the selected topic clearly, adapt to the user’s level, answer in a natural teaching style, give examples, suggest related resources, and help the user learn step by step.  
Stay focused only on the current topic and roadmap.  
If the user asks for beginner help, keep the explanation simple.  
If the user asks for deeper help, provide advanced detail.  
Also offer project ideas, interview questions, and next learning steps.

CURRENT SESSION CONTEXT:
- Topic: ${req.topic}
- Roadmap: ${req.roadmap}
- User Level: ${req.level || 'beginner'}
- Career Goal: ${ctx.targetCareer || 'Not specified'}
- Roadmap Phase: ${ctx.phase || 'Current phase'}
- Topic Overview: ${ctx.longDescription || ctx.shortDescription || req.topic}
- Why It Matters: ${ctx.whyItMatters || 'Important for career growth'}
- What To Learn: ${learnList}
- Prerequisites: ${prereqList}
- Related Topics: ${relatedList}

RULES:
- Start with a 2-3 sentence summary, then expand if needed
- Use markdown formatting for readability
- Keep responses practical and encouraging
- Stay under 600 words unless code examples are requested
- Never mention you are an AI unless asked
- Focus ONLY on "${req.topic}" within the "${req.roadmap}" roadmap`;
}

function buildGeminiHistory(req: TutorRequest) {
  return (req.history || []).slice(-10).map(msg => ({
    role: msg.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: msg.content }],
  }));
}

// 1. Primary AI Call - OpenRouter
async function callOpenRouter(req: TutorRequest): Promise<string | null> {
  const systemPrompt = buildSystemPrompt(req);
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of (req.history || []).slice(-10)) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }
  messages.push({ role: 'user', content: req.question });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://nexus-career-os.app',
        'X-Title': 'Nexus Career OS - AI Tutor',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      console.warn('OpenRouter API call failed status:', response.status);
      return null;
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('Failed calling OpenRouter:', err);
    return null;
  }
}

// 2. Fallback AI Call - Gemini
async function callGemini(req: TutorRequest): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const systemPrompt = buildSystemPrompt(req);
  const history = buildGeminiHistory(req);

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
      });
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(req.question);
      const text = result.response.text();
      if (text?.trim()) return text;
    } catch (err) {
      console.warn(`Gemini model ${modelName} failed:`, err);
    }
  }
  return null;
}

// 3. Fallback AI Call - Nvidia
async function callNvidia(req: TutorRequest): Promise<string | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;

  const systemPrompt = buildSystemPrompt(req);
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of (req.history || []).slice(-10)) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }
  messages.push({ role: 'user', content: req.question });

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: false,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export async function generateTutorAnswer(req: TutorRequest): Promise<TutorResponse> {
  // Try OpenRouter first
  let answer = await callOpenRouter(req);
  if (!answer) {
    // Fallback to direct Gemini
    answer = await callGemini(req);
  }
  if (!answer) {
    // Fallback to direct Nvidia
    answer = await callNvidia(req);
  }

  if (answer) {
    return { answer, source: 'ai' };
  }

  // Fallback to predefined local explanations
  const fallback = generateFallbackAnswer(
    req.question,
    req.topic,
    req.roadmap,
    req.level || 'beginner',
    req.context
  );
  return { answer: fallback, source: 'fallback' };
}

export async function* streamTutorAnswer(req: TutorRequest): AsyncGenerator<string, TutorResponse> {
  // Primary OpenRouter stream
  const systemPrompt = buildSystemPrompt(req);
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of (req.history || []).slice(-10)) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }
  messages.push({ role: 'user', content: req.question });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://nexus-career-os.app',
        'X-Title': 'Nexus Career OS - AI Tutor',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: true
      }),
    });

    if (response.ok && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleaned = line.trim();
          if (!cleaned || cleaned === 'data: [DONE]') continue;
          if (cleaned.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(cleaned.substring(6));
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullText += content;
                yield content;
              }
            } catch (e) {
              // ignore malformed line
            }
          }
        }
      }

      if (fullText.trim()) {
        return { answer: fullText, source: 'ai' };
      }
    }
  } catch (error) {
    console.error('OpenRouter stream error:', error);
  }

  // Fallback to static call
  const result = await generateTutorAnswer(req);
  if (result.source === 'fallback') {
    yield result.answer;
  }
  return result;
}

export function normalizeLegacyRequest(body: Record<string, unknown>): TutorRequest {
  const topicDescription = body.topicDescription as string | undefined;
  const existingContext = body.context as TutorContext | undefined;

  return {
    topic: (body.topic as string) || (body.topicTitle as string) || '',
    roadmap: (body.roadmap as string) || (body.roadmapTitle as string) || '',
    roadmapId: body.roadmapId as string | undefined,
    topicId: body.topicId as string | undefined,
    level: (body.level as string) || (body.userLevel as string) || 'beginner',
    question: (body.question as string) || '',
    history: (body.history as TutorHistoryMessage[]) || [],
    context: existingContext || (topicDescription ? { shortDescription: topicDescription } : undefined),
  };
}
