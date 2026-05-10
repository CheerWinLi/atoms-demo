'use client';

import { useState } from 'react';

interface ThinkingBlockProps {
  thinking: string;
  isThinking: boolean;
}

function summarizeCodeBlock(code: string): string {
  const trimmed = code.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.includes('<head>')) {
    return '写入 index.html';
  }
  if (trimmed.includes('{') && trimmed.includes(':') && trimmed.includes(';') && !trimmed.includes('function')) {
    return '写入 styles.css';
  }
  if (trimmed.includes('function') || trimmed.includes('const ') || trimmed.includes('let ') || trimmed.includes('var ')) {
    return '写入 script.js';
  }
  return '写入代码文件';
}

function processThinking(thinking: string): string {
  // 替换代码块为文件操作摘要
  return thinking.replace(/```[\w]*\n([\s\S]*?)```/g, (match, code) => {
    return summarizeCodeBlock(code);
  });
}

export function ThinkingBlock({ thinking, isThinking }: ThinkingBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (!thinking && !isThinking) return null;

  const processedThinking = processThinking(thinking);

  return (
    <div className="border-b border-border/30">
      <div
        className="px-3 py-2 flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span className="text-muted-foreground w-4">
          {isCollapsed ? '▸' : '▾'}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-blue-500 ${isThinking ? 'animate-pulse' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <span>AI 思考过程</span>
        {isThinking && (
          <span className="ml-auto flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]" />
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
          </span>
        )}
        {!isThinking && (
          <span className="ml-auto text-xs text-muted-foreground/50">
            {isCollapsed ? '点击展开' : '点击收起'}
          </span>
        )}
      </div>
      {!isCollapsed && (
        <div className="px-3 pb-3 text-sm text-muted-foreground">
          {thinking ? (
            <pre className="whitespace-pre-wrap break-words font-sans leading-relaxed">
              {processedThinking}
            </pre>
          ) : (
            <span className="text-muted-foreground/50">正在分析需求...</span>
          )}
        </div>
      )}
    </div>
  );
}
