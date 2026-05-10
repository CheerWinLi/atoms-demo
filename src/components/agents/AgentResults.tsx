'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAgents, AgentType, AgentResult } from '@/lib/agents';

interface AgentResultsProps {
  results: Record<AgentType, AgentResult>;
  onGenerateCode: () => void;
  isGenerating: boolean;
}

export function AgentResults({
  results,
  onGenerateCode,
  isGenerating,
}: AgentResultsProps) {
  const agents = getAgents();
  const [activeTab, setActiveTab] = useState<AgentType>('research');

  const completedAgents = agents.filter(a => results[a.id]?.status === 'completed');
  const hasAllCompleted = completedAgents.length === agents.length;

  return (
    <div className="flex flex-col h-full">
      {/* 标签栏 */}
      <div className="border-b flex items-center bg-muted/30">
        {agents.map(agent => {
          const result = results[agent.id];
          const isActive = activeTab === agent.id;
          const isCompleted = result?.status === 'completed';

          return (
            <button
              key={agent.id}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              } ${!isCompleted ? 'opacity-50' : ''}`}
              onClick={() => setActiveTab(agent.id)}
              disabled={!isCompleted}
            >
              <span className="mr-1">{agent.icon}</span>
              {agent.name.split(' ')[0]}
              {isCompleted && (
                <span className="ml-1 text-green-500">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 内容区 */}
      <ScrollArea className="flex-1 p-4">
        {results[activeTab]?.content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
              {results[activeTab].content}
            </pre>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">
                {agents.find(a => a.id === activeTab)?.icon}
              </p>
              <p className="text-sm mt-2">
                {results[activeTab]?.status === 'running'
                  ? '正在分析...'
                  : '等待执行'}
              </p>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* 底部操作 */}
      {hasAllCompleted && (
        <div className="p-3 border-t">
          <Button
            className="w-full"
            onClick={onGenerateCode}
            disabled={isGenerating}
          >
            {isGenerating ? '生成中...' : '生成完整代码'}
          </Button>
        </div>
      )}
    </div>
  );
}
