'use client';

import { useState } from 'react';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
  icon?: string;
}

interface FileTreeProps {
  code: string;
  onSelectFile: (name: string, content: string) => void;
  openFiles: string[];
}

function getFileIcon(name: string): string {
  if (name.endsWith('.html')) return '🌐';
  if (name.endsWith('.css')) return '🎨';
  if (name.endsWith('.js')) return '⚡';
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return '📘';
  if (name.endsWith('.json')) return '📋';
  return '📄';
}

function parseCodeToFiles(code: string): FileNode[] {
  const files: FileNode[] = [];

  files.push({
    name: 'index.html',
    type: 'file',
    content: code,
    icon: '🌐',
  });

  const cssMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (cssMatch) {
    files.push({
      name: 'styles.css',
      type: 'file',
      content: cssMatch[1].trim(),
      icon: '🎨',
    });
  }

  const jsMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (jsMatch && jsMatch[1].trim()) {
    files.push({
      name: 'script.js',
      type: 'file',
      content: jsMatch[1].trim(),
      icon: '⚡',
    });
  }

  return [
    {
      name: 'project',
      type: 'folder',
      children: files,
    },
  ];
}

function FileNodeComponent({
  node,
  depth = 0,
  onSelectFile,
  openFiles,
}: {
  node: FileNode;
  depth?: number;
  onSelectFile: (name: string, content: string) => void;
  openFiles: string[];
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (node.type === 'folder') {
    return (
      <div>
        <div
          className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-accent/50 cursor-pointer text-sm group"
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-muted-foreground text-xs w-4">
            {isOpen ? '▾' : '▸'}
          </span>
          <span className="text-base">{isOpen ? '📂' : '📁'}</span>
          <span className="font-medium text-foreground">{node.name}</span>
        </div>
        {isOpen &&
          node.children?.map((child, index) => (
            <FileNodeComponent
              key={index}
              node={child}
              depth={depth + 1}
              onSelectFile={onSelectFile}
              openFiles={openFiles}
            />
          ))}
      </div>
    );
  }

  const isActive = openFiles.includes(node.name);

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer text-sm group transition-colors ${
        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-foreground'
      }`}
      style={{ paddingLeft: `${depth * 16 + 32}px` }}
      onClick={() => node.content && onSelectFile(node.name, node.content)}
    >
      <span className="text-base">{node.icon || getFileIcon(node.name)}</span>
      <span className={isActive ? 'font-medium' : ''}>{node.name}</span>
    </div>
  );
}

export function FileTree({ code, onSelectFile, openFiles }: FileTreeProps) {
  const files = parseCodeToFiles(code);

  return (
    <div className="h-full overflow-auto bg-background border-r">
      <div className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b bg-muted/30">
        Explorer
      </div>
      <div className="py-1">
        {files.map((node, index) => (
          <FileNodeComponent
            key={index}
            node={node}
            onSelectFile={onSelectFile}
            openFiles={openFiles}
          />
        ))}
      </div>
    </div>
  );
}
