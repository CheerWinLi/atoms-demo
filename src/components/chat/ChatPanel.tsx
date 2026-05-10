'use client';

import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Message } from '@/lib/store';

interface ChatPanelProps {
  messages: Message[];
  isGenerating: boolean;
  hasApiKey: boolean;
  onSend: (content: string) => void;
  onRegenerate?: () => void;
}

// Parse message content into segments (thinking, code, text)
function parseContent(content: string) {
  const segments: { type: 'thinking' | 'code' | 'text'; content: string; language?: string }[] = [];
  // Support: <think>...</think>, <thinking>...</thinking>, and 【思考】...【/思考】
  const regex = /<think>([\s\S]*?)<\/think>|<thinking>([\s\S]*?)<\/thinking>|```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) segments.push({ type: 'text', content: text });
    }

    if (match[1] !== undefined) {
      segments.push({ type: 'thinking', content: match[1].trim() });
    } else if (match[2] !== undefined) {
      segments.push({ type: 'thinking', content: match[2].trim() });
    } else if (match[4]) {
      segments.push({ type: 'code', content: match[4].trim(), language: match[3] || 'html' });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) segments.push({ type: 'text', content: text });
  }

  return segments;
}

// Guess filename from language
function getFileName(language: string): string {
  switch (language) {
    case 'css': return 'styles.css';
    case 'javascript': case 'js': return 'script.js';
    case 'html': default: return 'index.html';
  }
}

function ThinkingBlock({ content }: { content: string }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="my-2 rounded-lg border border-amber-200 bg-amber-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
      >
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>AI 思考过程</span>
        <span className="ml-auto text-xs text-amber-500">
          {isOpen ? '收起' : '展开'}
        </span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 pt-1">
          <pre className="whitespace-pre-wrap break-words text-sm text-amber-800 font-mono">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

function WritingIndicator({ language }: { language: string }) {
  const fileName = getFileName(language);
  return (
    <div className="my-2 flex items-center gap-2 text-sm text-gray-500 bg-gray-100 rounded-lg px-3 py-2">
      <div className="flex space-x-1">
        <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]" />
        <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]" />
        <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" />
      </div>
      <span>正在写入 <span className="font-mono text-blue-600">{fileName}</span></span>
    </div>
  );
}

function MessageContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const segments = parseContent(content);

  if (segments.length === 0) {
    return (
      <pre className="whitespace-pre-wrap break-words text-sm">
        {content}
      </pre>
    );
  }

  // Check if the last segment is code and message is still streaming
  const lastSegment = segments[segments.length - 1];

  return (
    <div className="space-y-1">
      {segments.map((segment, i) => {
        if (segment.type === 'thinking') {
          return <ThinkingBlock key={i} content={segment.content} />;
        }
        if (segment.type === 'code') {
          // If streaming and this is the last segment, show writing indicator
          if (isStreaming && i === segments.length - 1) {
            return <WritingIndicator key={i} language={segment.language || 'html'} />;
          }
          // Completed code: show file name indicator
          return <WritingIndicator key={i} language={segment.language || 'html'} />;
        }
        return (
          <p key={i} className="text-sm whitespace-pre-wrap break-words">
            {segment.content}
          </p>
        );
      })}
    </div>
  );
}

export function ChatPanel({ messages, isGenerating, hasApiKey, onSend, onRegenerate }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  // Check if a message is currently streaming (temporary ID)
  const isStreaming = (msg: Message) => msg.id.startsWith('streaming-');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-lg font-medium">欢迎使用 Atoms Demo</p>
              <p className="text-sm mt-2">
                描述你想要创建的网页应用，AI 将为你分析需求并生成代码
              </p>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.role === 'assistant' ? (
                  <MessageContent content={message.content} isStreaming={isStreaming(message)} />
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
              </div>
              {message.role === 'assistant' &&
                index === messages.length - 1 &&
                !isGenerating &&
                onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="mt-1 ml-1 text-xs text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1"
                  title="重新生成"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  重新生成
                </button>
              )}
            </div>
          ))}
          {isGenerating && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                  </div>
                  <span className="text-sm text-muted-foreground">AI 正在思考...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t p-4 shrink-0">
        {!hasApiKey ? (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <svg className="h-5 w-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm text-amber-700">
              请先点击右上角设置图标，配置 API Key 和模型信息后再开始对话
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述你想要创建的网页应用..."
              className="min-h-[60px] resize-none"
              disabled={isGenerating}
            />
            <Button onClick={handleSend} disabled={!input.trim() || isGenerating} className="self-end">
              发送
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
