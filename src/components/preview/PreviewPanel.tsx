'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Version } from '@/lib/store';

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
  const [showCode, setShowCode] = useState(false);

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
    navigator.clipboard.writeText(currentVersion.code);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
              版本历史 ({versions.length})
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-[300px] overflow-auto">
              {versions.map((version, index) => (
                <DropdownMenuItem
                  key={version.id}
                  onSelect={() => onSelectVersion(version)}
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCode(!showCode)}
          >
            {showCode ? '预览' : '查看代码'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
            disabled={!currentVersion}
          >
            复制代码
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!currentVersion}
          >
            下载 ZIP
          </Button>
        </div>
      </div>
      <div className="flex-1">
        {showCode ? (
          <div className="h-full overflow-auto p-4 bg-muted">
            <pre className="text-sm whitespace-pre-wrap break-words">
              {currentVersion?.code || '// 暂无代码'}
            </pre>
          </div>
        ) : (
          <div className="h-full">
            {currentVersion ? (
              <iframe
                srcDoc={currentVersion.code}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
                title="Preview"
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
        )}
      </div>
    </div>
  );
}
