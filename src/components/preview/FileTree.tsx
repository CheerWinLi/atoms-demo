'use client';

import { useState, useMemo } from 'react';

interface FileTreeProps {
  onSelectFile: (file: string) => void;
  activeFile: string;
  htmlCode?: string;
}

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  icon: string;
  children?: FileItem[];
  tab?: string;
}

function buildFileTree(html: string): FileItem[] {
  const hasStyle = /<style[\s>]/i.test(html);
  const hasScript = /<script[\s>]/i.test(html);

  const children: FileItem[] = [
    { name: 'index.html', type: 'file', icon: '📄', tab: 'html' },
  ];
  if (hasStyle) children.push({ name: 'styles.css', type: 'file', icon: '🎨', tab: 'css' });
  if (hasScript) children.push({ name: 'script.js', type: 'file', icon: '⚡', tab: 'js' });

  return [{ name: 'project', type: 'folder', icon: '📁', children }];
}

function FileTreeItem({
  item,
  depth = 0,
  onSelectFile,
  activeFile,
}: {
  item: FileItem;
  depth?: number;
  onSelectFile: (file: string) => void;
  activeFile: string;
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (item.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 w-full px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <span className="text-gray-400 text-[10px]">{isOpen ? '▼' : '▶'}</span>
          <span>{item.icon}</span>
          <span className="font-medium">{item.name}</span>
        </button>
        {isOpen && item.children?.map((child, i) => (
          <FileTreeItem
            key={i}
            item={child}
            depth={depth + 1}
            onSelectFile={onSelectFile}
            activeFile={activeFile}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => item.tab && onSelectFile(item.tab)}
      className={`flex items-center gap-1.5 w-full px-2 py-1 text-xs transition-colors ${
        activeFile === item.tab
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <span>{item.icon}</span>
      <span>{item.name}</span>
    </button>
  );
}

export function FileTree({ onSelectFile, activeFile, htmlCode }: FileTreeProps) {
  const fileStructure = useMemo(
    () => (htmlCode ? buildFileTree(htmlCode) : []),
    [htmlCode]
  );

  return (
    <div className="w-48 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
      <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
        资源管理器
      </div>
      <div className="flex-1 overflow-auto py-1">
        {fileStructure.length > 0 ? (
          fileStructure.map((item, i) => (
            <FileTreeItem key={i} item={item} onSelectFile={onSelectFile} activeFile={activeFile} />
          ))
        ) : (
          <div className="px-3 py-2 text-xs text-gray-400">暂无文件</div>
        )}
      </div>
    </div>
  );
}
