'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileTree } from './FileTree';
import { CodeHighlight } from './CodeHighlight';
import { Version } from '@/lib/store';

interface OpenTab {
  name: string;
  content: string;
}

interface PreviewPanelProps {
  versions: Version[];
  currentVersion: Version | null;
  onSelectVersion: (version: Version) => void;
}

export function PreviewPanel({
  versions,
  currentVersion,
  onSelectVersion,
}: PreviewPanelProps) {
  const [showPreview, setShowPreview] = useState(true);
  const [showFileTree, setShowFileTree] = useState(true);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleIframeLoad = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
              e.stopPropagation();
            }
          });
        }
      } catch {
        // Cross-origin restriction, ignore
      }
    };

    iframe.addEventListener('load', handleIframeLoad);
    return () => iframe.removeEventListener('load', handleIframeLoad);
  }, [currentVersion]);

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

  const handleCopyCode = () => {
    if (!currentVersion) return;
    const codeToCopy = activeTab
      ? openTabs.find(t => t.name === activeTab)?.content || currentVersion.code
      : currentVersion.code;
    navigator.clipboard.writeText(codeToCopy);
  };

  const handleSelectFile = (name: string, content: string) => {
    if (!openTabs.find(t => t.name === name)) {
      setOpenTabs(prev => [...prev, { name, content }]);
    }
    setActiveTab(name);
    setShowPreview(false);
  };

  const handleCloseTab = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs(prev => prev.filter(t => t.name !== name));
    if (activeTab === name) {
      const remaining = openTabs.filter(t => t.name !== name);
      setActiveTab(remaining.length > 0 ? remaining[remaining.length - 1].name : null);
      if (remaining.length === 0) {
        setShowPreview(true);
      }
    }
  };

  const displayContent = activeTab
    ? openTabs.find(t => t.name === activeTab)?.content || ''
    : currentVersion?.code || '';

  return (
    <div className="flex h-full">
      {/* 文件树 */}
      {showFileTree && currentVersion && (
        <div className="w-52 flex-shrink-0">
          <FileTree
            code={currentVersion.code}
            onSelectFile={handleSelectFile}
            openFiles={openTabs.map(t => t.name)}
          />
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 标签栏 */}
        <div className="border-b bg-muted/20 flex items-center min-h-[36px]">
          <div className="flex items-center overflow-x-auto">
            {openTabs.map(tab => (
              <div
                key={tab.name}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs border-r cursor-pointer transition-colors ${
                  activeTab === tab.name
                    ? 'bg-background text-foreground border-b-2 border-b-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
                onClick={() => setActiveTab(tab.name)}
              >
                <span className="text-sm">
                  {tab.name.endsWith('.html') ? '🌐' : tab.name.endsWith('.css') ? '🎨' : '⚡'}
                </span>
                <span>{tab.name}</span>
                <button
                  className="ml-1 hover:bg-accent rounded p-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100"
                  onClick={(e) => handleCloseTab(tab.name, e)}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1 px-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFileTree(!showFileTree)}
              className="h-6 px-2 text-xs"
            >
              {showFileTree ? '📁−' : '📁+'}
            </Button>
          </div>
        </div>

        {/* 工具栏 */}
        <div className="border-b px-3 py-1.5 flex items-center justify-between bg-background">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-6 px-2">
                v{versions.length || 0}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 max-h-[300px] overflow-auto">
                {versions.map((version, index) => (
                  <DropdownMenuItem
                    key={version.id}
                    onClick={() => {
                      onSelectVersion(version);
                      setOpenTabs([]);
                      setActiveTab(null);
                      setShowPreview(true);
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">版本 {index + 1}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {version.description}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
                {versions.length === 0 && (
                  <DropdownMenuItem disabled>
                    暂无版本
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={showPreview ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowPreview(true)}
              className="h-6 px-2 text-xs"
            >
              预览
            </Button>
            <Button
              variant={!showPreview ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                if (openTabs.length === 0 && currentVersion) {
                  handleSelectFile('index.html', currentVersion.code);
                } else {
                  setShowPreview(false);
                }
              }}
              className="h-6 px-2 text-xs"
            >
              代码
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              disabled={!currentVersion}
              className="h-6 px-2 text-xs"
            >
              复制
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={!currentVersion}
              className="h-6 px-2 text-xs"
            >
              下载
            </Button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-hidden">
          {showPreview ? (
            <div className="h-full">
              {currentVersion ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={currentVersion.code}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                  title="Preview"
                  tabIndex={0}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <p className="text-lg font-medium">暂无预览</p>
                    <p className="text-sm mt-2">
                      在左侧对话框中描述你想要的应用
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full overflow-auto bg-[#fafafa] p-4">
              <CodeHighlight code={displayContent || '// 暂无代码'} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
