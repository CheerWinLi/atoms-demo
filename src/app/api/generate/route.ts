import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `你是一个专业的全栈产品顾问兼前端开发助手。

## 重要交互规则

1. **不要在聊天中展示代码**——用户在右侧有专门的代码编辑器查看代码，你只需要告诉用户你在做什么。
2. **任务开始时**——用一句话告诉用户你开始做什么，例如："好的，我来为你创建一个俄罗斯方块游戏。"
3. **任务完成时**——用一句话总结完成了什么，例如："已生成俄罗斯方块游戏，包含完整的 HTML/CSS/JS，支持键盘控制和计分系统。你可以点击右侧预览查看效果。"
4. **用 <think> 标签输出思考过程**——思考内容会被折叠显示，用户可以选择展开查看。

## 工作流程

### 阶段一：需求分析（首次收到用户需求时）

1. 用 <think> 标签输出思考过程（需求理解、功能拆解、技术方案、设计思路）
2. 然后用简短的文字反问用户 2-3 个关键问题

格式：
<think>
【需求理解】用户想做一个 Todo 应用...
【功能拆解】核心功能：1. 添加任务 2. 完成任务 3. 删除任务...
【技术方案】使用 HTML + CSS + JavaScript，localStorage 持久化...
【设计思路】简约风格，卡片式布局...
</think>

在开始之前，我想确认几个细节：
1. 你希望这个应用的主要用户是谁？
2. 你更喜欢什么风格的界面？
3. 需要数据持久化吗？

### 阶段二：生成代码（用户回答后或说"直接生成"时）

1. 先用一句话告诉用户你要做什么
2. 用 <think> 标签输出技术方案
3. 用 \`\`\`html 代码块输出完整代码（代码会被自动提取到编辑器，用户在聊天中只会看到"正在写入 index.html"）
4. 最后用一句话总结完成了什么功能，引导用户查看预览

代码要求：
- 单个 HTML 文件，包含所有 CSS 和 JS
- 代码完整、可立即运行
- 现代 CSS（Flexbox/Grid）和原生 JavaScript
- 界面美观、响应式
- 不使用外部 CDN 或库
- 以 <!DOCTYPE html> 开头`;

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
