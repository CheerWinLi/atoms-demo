import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSession } from '@/lib/auth';
import { getAgent, AgentType, AGENT_ORDER } from '@/lib/agents';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  try {
    const { agentType, message, config, previousResults } = await request.json();

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

    const agent = getAgent(agentType as AgentType);
    if (!agent) {
      return NextResponse.json({ error: `无效的 Agent 类型: ${agentType}` }, { status: 400 });
    }

    const openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
    });

    // 构建消息，包含前序 Agent 的结果
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: agent.prompt },
    ];

    // 添加前序 Agent 的结果作为上下文
    if (previousResults && Object.keys(previousResults).length > 0) {
      let context = '## 前序分析结果\n\n';
      for (const [agentId, result] of Object.entries(previousResults)) {
        const prevAgent = getAgent(agentId as AgentType);
        if (prevAgent && result) {
          context += `### ${prevAgent.icon} ${prevAgent.name}\n\n${result}\n\n---\n\n`;
        }
      }
      messages.push({ role: 'user' as const, content: context });
    }

    // 添加用户消息
    messages.push({ role: 'user' as const, content: message });

    const stream = await openai.chat.completions.create({
      model: config.model,
      messages,
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
    console.error('Agent error:', error);

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

    const errorMessage = error instanceof Error ? error.message : 'Agent 执行失败';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
