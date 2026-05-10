'use client';

import { useState, useMemo } from 'react';
import { Version } from '@/lib/store';
import { Highlight } from 'prism-react-renderer';
import { FileTree } from './FileTree';

interface PreviewPanelProps {
  versions: Version[];
  currentVersion: Version | null;
  onSelectVersion: (version: Version) => void;
}

type TabId = 'preview' | 'html' | 'css' | 'js';

interface OpenTab {
  id: TabId;
  label: string;
  icon: string;
}

function extractParts(html: string) {
  const cssBlocks: string[] = [];
  const jsBlocks: string[] = [];

  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRegex.exec(html)) !== null) {
    const content = match[1].trim();
    if (content) cssBlocks.push(content);
  }

  const scriptRegex = /<script(?![^>]*\btype\s*=\s*["'](?:application\/ld\+json|application\/json)["'])[^>]*>([\s\S]*?)<\/script>/gi;
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1].trim();
    if (content) jsBlocks.push(content);
  }

  return {
    html,
    css: cssBlocks.length > 0 ? cssBlocks.join('\n\n') : null,
    js: jsBlocks.length > 0 ? jsBlocks.join('\n\n') : null,
  };
}

const LANGUAGE_MAP: Record<string, string> = {
  html: 'html',
  css: 'css',
  js: 'javascript',
};

export function PreviewPanel({
  versions,
  currentVersion,
  onSelectVersion,
}: PreviewPanelProps) {
  // 预览 tab 始终打开，文件 tab 从文件树点击打开
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([
    { id: 'preview', label: '预览', icon: '▶' },
  ]);
  const [activeTab, setActiveTab] = useState<TabId>('preview');

  const parts = useMemo(
    () => (currentVersion ? extractParts(currentVersion.code) : null),
    [currentVersion]
  );

  const handleFileSelect = (fileId: string) => {
    const tabId = fileId as TabId;
    if (!openTabs.find(t => t.id === tabId)) {
      const labels: Record<string, { label: string; icon: string }> = {
        html: { label: 'index.html', icon: '📄' },
        css: { label: 'styles.css', icon: '🎨' },
        js: { label: 'script.js', icon: '⚡' },
      };
      const info = labels[tabId];
      if (info) {
        setOpenTabs(prev => [...prev, { id: tabId, ...info }]);
      }
    }
    setActiveTab(tabId);
  };

  const handleCloseTab = (tabId: TabId) => {
    if (tabId === 'preview') return; // 预览 tab 不能关
    const newTabs = openTabs.filter(t => t.id !== tabId);
    setOpenTabs(newTabs);
    if (activeTab === tabId) {
      setActiveTab(newTabs[newTabs.length - 1].id);
    }
  };

  const getCode = (tabId: TabId): string => {
    if (!parts) return '';
    switch (tabId) {
      case 'html': return parts.html;
      case 'css': return parts.css || '';
      case 'js': return parts.js || '';
      default: return '';
    }
  };

  const handleDownload = () => {
    if (!currentVersion) return;
    const blob = new Blob([currentVersion.code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'app.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Top bar: version + actions */}
      <div className="border-b border-gray-200 px-3 py-1.5 flex items-center justify-between bg-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          {versions.length > 0 && (
            <select
              className="bg-white text-gray-700 text-xs border border-gray-300 rounded px-2 py-1 outline-none"
              value={currentVersion?.id || ''}
              onChange={e => {
                const v = versions.find(v => v.id === e.target.value);
                if (v) onSelectVersion(v);
              }}
            >
              {versions.map((v, i) => (
                <option key={v.id} value={v.id}>版本 {i + 1} — {v.description}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => currentVersion && navigator.clipboard.writeText(currentVersion.code)}
            disabled={!currentVersion}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-40"
          >
            复制
          </button>
          <button
            onClick={handleDownload}
            disabled={!currentVersion}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-40"
          >
            下载
          </button>
        </div>
      </div>

      {/* File tree + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <FileTree
          onSelectFile={handleFileSelect}
          activeFile={activeTab}
          htmlCode={currentVersion?.code}
        />

        {/* Tabs + content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex bg-gray-50 border-b border-gray-200 shrink-0 overflow-x-auto">
            {openTabs.map(tab => (
              <div
                key={tab.id}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer border-r border-gray-200 shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 border-b-2 border-b-blue-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id !== 'preview' && (
                  <button
                    onClick={e => { e.stopPropagation(); handleCloseTab(tab.id); }}
                    className="ml-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded p-0.5"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 2l6 6M8 2l-6 6" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {!currentVersion ? (
              <div className="flex items-center justify-center h-full text-gray-500 bg-white">
                <div className="text-center">
                  <p className="text-lg font-medium">暂无代码</p>
                  <p className="text-sm mt-2">在左侧对话框中描述你想要的应用</p>
                </div>
              </div>
            ) : activeTab === 'preview' ? (
              <div className="h-full overflow-hidden bg-white">
                <iframe
                  srcDoc={currentVersion.code}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                  title="Preview"
                />
              </div>
            ) : (
              <div className="h-full overflow-auto bg-white">
                <Highlight
                  theme={undefined}
                  code={getCode(activeTab)}
                  language={(LANGUAGE_MAP[activeTab] || 'html') as any}
                >
                  {({ className, style, tokens, getLineProps, getTokenProps }) => (
                    <pre className={`${className} p-4 text-sm`} style={{ ...style, margin: 0, background: '#ffffff', minHeight: '100%', color: '#1f2937' }}>
                      {tokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line })} className="table-row">
                          <span className="table-cell pr-4 text-right select-none text-xs w-10 border-r border-gray-200" style={{ color: '#9ca3af' }}>
                            {i + 1}
                          </span>
                          <span className="table-cell pl-4">
                            {line.map((token, key) => (
                              <span key={key} {...getTokenProps({ token })} />
                            ))}
                          </span>
                        </div>
                      ))}
                    </pre>
                  )}
                </Highlight>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="border-t border-gray-200 px-3 py-1 flex items-center justify-between bg-gray-50 text-gray-500 text-xs shrink-0">
        <span>Atoms Demo</span>
        <div className="flex items-center gap-3">
          <span>{activeTab === 'preview' ? '预览' : (LANGUAGE_MAP[activeTab] || '').toUpperCase()}</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
}
