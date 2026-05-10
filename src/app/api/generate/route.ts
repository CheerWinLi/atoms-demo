import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { STAGE_PROMPTS, WorkflowStage } from '@/lib/prompts';

async function generateWithOpenAI(messages: any[], config: any, systemPrompt: string): Promise<ReadableStream> {
  const openai = new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  });

  const stream = await openai.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    stream: true,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          controller.enqueue(encoder.encode(content));
        }
      }
      controller.close();
    },
  });
}

async function generateWithAnthropic(messages: any[], config: any, systemPrompt: string): Promise<ReadableStream> {
  const anthropic = new Anthropic({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  });

  const stream = await anthropic.messages.stream({
    model: config.model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: messages.map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { messages, config, stage } = await request.json();

    if (!config?.baseUrl || !config?.apiKey || !config?.model) {
      return NextResponse.json(
        { error: 'API configuration is required' },
        { status: 400 }
      );
    }

    // Select prompt based on stage, default to analysis
    const validStage = stage && stage in STAGE_PROMPTS ? stage as WorkflowStage : 'analysis';
    const systemPrompt = STAGE_PROMPTS[validStage];

    let customStream: ReadableStream;

    if (config.apiFormat === 'anthropic') {
      customStream = await generateWithAnthropic(messages, config, systemPrompt);
    } else {
      customStream = await generateWithOpenAI(messages, config, systemPrompt);
    }

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: unknown) {
    console.error('Generate error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate code';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
