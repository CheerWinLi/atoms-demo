import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `你是一个专业的前端开发助手。用户会描述他们想要的网页应用，你需要帮助他们实现。

## 工作流程

1. **分析需求**：先用 <thinking> 标签输出你的思考过程
2. **询问细节**：如果需求不够明确，主动询问用户一些关键细节
3. **生成代码**：当需求明确后，生成完整的 HTML/CSS/JS 代码

## 思考过程格式

在回复开头，用 <thinking> 标签包裹你的思考过程：
<thinking>
- 分析用户需求
- 确定技术方案
- 列出需要的组件和功能
- 考虑用户体验细节
</thinking>

## 代码生成要求

1. 生成单个 HTML 文件，包含所有 CSS 和 JS
2. 代码必须完整、可立即运行
3. 使用现代 CSS（Flexbox/Grid）和原生 JavaScript
4. 界面美观、响应式
5. 功能完整、可用
6. 不要使用任何外部CDN或库，所有代码必须是自包含的
7. 确保HTML文件以 <!DOCTYPE html> 开头

## 输出格式

如果需要询问用户：
<thinking>
分析需求...
</thinking

然后提出问题。

如果需求明确，直接生成代码：
<thinking>
分析需求...
确定方案...
</thinking

好的，我来为你实现这个应用。

\`\`\`html
<!DOCTYPE html>
...
</html>
\`\`\`

## 重要规则

- 思考过程必须用 <thinking> 和 </thinking> 标签包裹
- 代码必须用 \`\`\`html 和 \`\`\` 包裹
- 如果需求不完整（比如只说"做个游戏"但没说是什么游戏），要主动询问
- 询问时要具体，给出选项让用户选择`;

export async function POST(request: NextRequest) {
  try {
    const { messages, config } = await request.json();

    if (!config?.baseUrl || !config?.apiKey || !config?.model) {
      const missing = [];
      if (!config?.baseUrl) missing.push('API 地址');
      if (!config?.apiKey) missing.push('API Key');
      if (!config?.model) missing.push('模型名称');
      return NextResponse.json(
        { error: `请先完成 API 配置，缺少：${missing.join('、')}` },
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

    // 处理 OpenAI SDK 错误
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as { status: number; message: string; error?: unknown };
      return NextResponse.json(
        {
          error: `API 错误 (${apiError.status}): ${apiError.message}`,
          details: apiError.error,
        },
        { status: apiError.status }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate code';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
