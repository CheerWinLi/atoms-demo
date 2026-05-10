import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `你是一个专业的前端开发助手。用户会描述他们想要的网页应用，你需要生成完整的、可运行的 HTML/CSS/JS 代码。

要求：
1. 生成单个 HTML 文件，包含所有 CSS 和 JS
2. 代码必须完整、可立即运行
3. 使用现代 CSS（Flexbox/Grid）和原生 JavaScript
4. 界面美观、响应式
5. 功能完整、可用
6. 不要使用任何外部CDN或库，所有代码必须是自包含的
7. 确保HTML文件以 <!DOCTYPE html> 开头

重要：只输出 HTML 代码，不要有任何其他文字说明。代码必须用 \`\`\`html 和 \`\`\` 包裹。`;

export async function POST(request: NextRequest) {
  try {
    const { messages, config } = await request.json();

    if (!config?.baseUrl || !config?.apiKey || !config?.model) {
      return NextResponse.json(
        { error: 'API configuration is required' },
        { status: 400 }
      );
    }

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
    const customStream = new ReadableStream({
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
