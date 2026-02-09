import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildQueryContext } from '@/lib/demo-query-context';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';

const client = new Anthropic();
const isRateLimited = createRateLimiter('ask-ai', 10, 60_000);

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
    }

    // Authentication
    try {
      await authenticateRequest();
    } catch (response) {
      return response as NextResponse;
    }

    const { question } = await request.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const context = buildQueryContext();

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are HostFi AI, a financial analyst for short-term rental portfolios. You answer questions about the user's property expenses concisely and accurately.

Rules:
- Use ONLY the data provided below. Never make up numbers.
- Be concise — 2-4 sentences for simple questions, a short list for comparisons.
- Always include dollar amounts when relevant.
- Format currency as $X,XXX.XX
- If you can't answer from the data, say so clearly.
- Don't be chatty — be direct and financial.
- When comparing, use percentages.
- Current date context: February 2026.

USER'S FINANCIAL DATA:
${context}`,
      messages: [{ role: 'user', content: question }],
    });

    const textBlock = message.content.find(b => b.type === 'text');
    const answer = textBlock ? textBlock.text : 'Unable to generate a response.';

    return NextResponse.json({ answer });
  } catch (error: unknown) {
    console.error('Ask AI error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    
    // Return a helpful demo response if API key is missing
    if (errMsg.includes('API key') || errMsg.includes('authentication')) {
      return NextResponse.json({
        answer: 'Demo mode: Set ANTHROPIC_API_KEY to enable live AI responses. In the meantime, explore the example questions to see how this feature works.',
        demo: true,
      });
    }

    return NextResponse.json({ error: 'Failed to process question' }, { status: 500 });
  }
}
