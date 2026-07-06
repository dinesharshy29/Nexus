/**
 * Fallback tutor service for when AI APIs are unavailable
 */

import { TutorContext } from './tutorService';

export function generateFallbackAnswer(
  question: string,
  topic: string,
  roadmap: string,
  level: string,
  _context?: TutorContext
): string {
  return `I'm Sara, your AI tutor. I'm having trouble connecting to my AI backend right now, but I can still help you learn about "${topic}".

Your question was: "${question}"

Roadmap: ${roadmap} | Level: ${level}

Please try again in a moment, or feel free to explore other parts of your career roadmap. When the connection is restored, I'll be able to provide detailed, personalized tutoring.

Tips while you wait:
- Review your current learning roadmap
- Check out career resources and job market insights
- Practice your interview skills
- Update your resume`;
}
