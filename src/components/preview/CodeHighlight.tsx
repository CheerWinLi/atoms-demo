'use client';

import { useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import html from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import './code-theme.css';

// 注册语言
hljs.registerLanguage('html', html);
hljs.registerLanguage('css', css);
hljs.registerLanguage('javascript', javascript);

interface CodeHighlightProps {
  code: string;
  language?: string;
}

export function CodeHighlight({ code, language }: CodeHighlightProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      // 清除之前的高亮
      codeRef.current.removeAttribute('data-highlighted');
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  // 自动检测语言
  const detectLanguage = (code: string): string => {
    if (code.trim().startsWith('<!DOCTYPE') || code.trim().startsWith('<html') || code.includes('<div')) {
      return 'html';
    }
    if (code.includes('{') && code.includes(':') && code.includes(';') && !code.includes('function')) {
      return 'css';
    }
    return 'javascript';
  };

  const lang = language || detectLanguage(code);

  return (
    <pre className="text-sm whitespace-pre-wrap break-words font-mono leading-relaxed m-0">
      <code
        ref={codeRef}
        className={`language-${lang}`}
        style={{
          background: 'transparent',
          padding: 0,
        }}
      >
        {code}
      </code>
    </pre>
  );
}
