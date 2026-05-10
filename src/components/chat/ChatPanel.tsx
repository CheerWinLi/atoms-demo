'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThinkingBlock } from './ThinkingBlock';
import { Message } from '@/lib/store';

interface ChatPanelProps {
  messages: Message[];
  isGenerating: boolean;
  currentThinking: string;
  onSend: (content: string) => void;
}

function extractSummary(content: string): string {
  // 移除 thinking 标签
  const withoutThinking = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
  // 移除代码块
  const withoutCode = withoutThinking.replace(/```[\s\S]*?```/g, '').trim();
  // 取前100个字符作为摘要
  if (withoutCode.length > 100) {
    return withoutCode.substring(0, 100) + '...';
  }
  return withoutCode || '代码已生成';
}

function hasCodeBlock(content: string): boolean {
  return content.includes('```');
}

export function ChatPanel({ messages, isGenerating, currentThinking, onSend }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [collapsedMessages, setCollapsedMessages] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentThinking]);

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleCollapse = (messageId: string) => {
    setCollapsedMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  // 自动折叠已完成的 AI 回复（包含代码的）
  useEffect(() => {
    const newCollapsed = new Set(collapsedMessages);
    messages.forEach(msg => {
      if (msg.role === 'assistant' && hasCodeBlock(msg.content) && !collapsedMessages.has(msg.id)) {
        newCollapsed.add(msg.id);
      }
    });
    if (newCollapsed.size !== collapsedMessages.size) {
      setCollapsedMessages(newCollapsed);
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* 对话区域 */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium">欢迎使用 Atoms Demo</p>
              <p className="text-sm mt-2 max-w-md mx-auto">
                描述你想要创建的网页应用，AI 将为你生成代码
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {['Todo 应用', '计算器', '俄罗斯方块', '天气应用'].map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    size="sm"
                    onClick={() => onSend(`帮我创建一个${example}`)}
                    className="text-xs"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message) => {
            const isCollapsed = collapsedMessages.has(message.id);
            const isAssistant = message.role === 'assistant';
            const hasThinking = message.content.includes('<thinking>');
            const hasCode = hasCodeBlock(message.content);

            return (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground px-4 py-2.5'
                      : 'bg-muted/50 border'
                  }`}
                >
                  {isAssistant ? (
                    <div className="text-sm">
                      {/* 思考过程 */}
                      {hasThinking && (
                        <ThinkingBlock
                          thinking={
                            message.content.match(/<thinking>([\s\S]*?)<\/thinking>/)?.[1] || ''
                          }
                          isThinking={false}
                        />
                      )}

                      {/* 折叠状态显示摘要 */}
                      {isCollapsed ? (
                        <div
                          className="px-3 py-2.5 cursor-pointer hover:bg-accent/30 transition-colors"
                          onClick={() => toggleCollapse(message.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">▸</span>
                            <span className="text-sm text-foreground">
                              {extractSummary(message.content)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="px-3 pb-3">
                            <pre className="whitespace-pre-wrap break-words font-sans leading-relaxed">
                              {message.content
                                .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
                                .replace(/```[\s\S]*?```/g, '')
                                .trim() || '代码已生成，请查看右侧预览'}
                            </pre>
                          </div>
                          {/* 展开/折叠按钮 */}
                          {hasCode && (
                            <div
                              className="px-3 py-1.5 border-t text-xs text-muted-foreground cursor-pointer hover:bg-accent/50 flex items-center gap-1"
                              onClick={() => toggleCollapse(message.id)}
                            >
                              <span>▾</span>
                              <span>收起</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
              </div>
            );
          })}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-muted/50 border rounded-lg">
                <ThinkingBlock
                  thinking={currentThinking}
                  isThinking={true}
                />
                {!currentThinking && (
                  <div className="px-3 py-2.5 flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    <span className="text-sm text-muted-foreground">正在分析需求...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 输入区域 */}
      <div className="border-t p-4 bg-background">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述你想要创建的网页应用..."
              className="min-h-[48px] max-h-[120px] resize-none text-sm"
              disabled={isGenerating}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              className="self-end px-4"
            >
              {isGenerating ? (
                <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
              ) : (
                '发送'
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            按 Enter 发送，Shift + Enter 换行
          </p>
        </div>
      </div>
    </div>
  );
}
