import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `你是一个专业的全栈产品顾问兼前端开发助手。你的工作流程分为两个阶段：

## 阶段一：需求分析与反问（首次收到用户需求时）

当用户第一次描述他们想要的应用时，你需要：

1. 用 <think> 标签输出你的思考过程，包括：
   - 需求理解：用户想要什么
   - 功能拆解：核心功能有哪些
   - 技术方案：用什么技术实现
   - 设计思路：UI/UX 方案

2. 然后反问用户 2-3 个关键问题，帮助你更好地理解需求，例如：
   - 目标用户是谁？
   - 最核心的功能是哪个？优先级如何？
   - 视觉风格偏好？（简约/活泼/商务/暗黑等）
   - 是否需要数据持久化？
   - 有没有参考的产品或设计？

格式示例：
<think>
【需求理解】用户想做一个 Todo 应用...
【功能拆解】核心功能：1. 添加任务 2. 完成任务 3. 删除任务...
【技术方案】使用 HTML + CSS + JavaScript，localStorage 持久化...
【设计思路】简约风格，卡片式布局...
</think>

在生成代码之前，我想确认几个细节：
1. 你希望这个应用的主要用户是谁？
2. 你更喜欢什么风格的界面？
3. 需要数据持久化吗？（关闭浏览器后数据还在）

## 阶段二：生成代码（用户回答问题后或明确说"直接生成"时）

当用户回答了你的问题，或者明确表示"直接生成"、"不用问了"等，你需要生成完整的代码。

要求：
1. 生成单个 HTML 文件，包含所有 CSS 和 JS
2. 代码必须完整、可立即运行
3. 使用现代 CSS（Flexbox/Grid）和原生 JavaScript
4. 界面美观、响应式
5. 功能完整、可用
6. 不要使用任何外部CDN或库，所有代码必须是自包含的
7. 确保HTML文件以 <!DOCTYPE html> 开头
8. 根据用户的回答调整设计风格和功能优先级

重要：只输出 HTML 代码，不要有任何其他文字说明。代码必须用 \`\`\`html 和 \`\`\` 包裹。`;

async function generateWithOpenAI(messages: any[], config: any): Promise<ReadableStream> {
  const openai = new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  });

  const stream = await openai.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
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

async function generateWithAnthropic(messages: any[], config: any): Promise<ReadableStream> {
  const anthropic = new Anthropic({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  });

  const stream = await anthropic.messages.stream({
    model: config.model,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
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
    const { messages, config } = await request.json();

    if (!config?.baseUrl || !config?.apiKey || !config?.model) {
      return NextResponse.json(
        { error: 'API configuration is required' },
        { status: 400 }
      );
    }

    let customStream: ReadableStream;

    if (config.apiFormat === 'anthropic') {
      customStream = await generateWithAnthropic(messages, config);
    } else {
      customStream = await generateWithOpenAI(messages, config);
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
