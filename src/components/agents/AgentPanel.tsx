'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAgents, AgentType, AgentResult } from '@/lib/agents';

interface AgentPanelProps {
  onRunAgent: (agentType: AgentType) => void;
  results: Record<AgentType, AgentResult>;
  isRunning: boolean;
  currentAgent: AgentType | null;
}

export function AgentPanel({
  onRunAgent,
  results,
  isRunning,
  currentAgent,
}: AgentPanelProps) {
  const agents = getAgents();
  const [expandedAgent, setExpandedAgent] = useState<AgentType | null>(null);

  const getStatusIcon = (agentId: AgentType) => {
    const result = results[agentId];
    if (!result || result.status === 'pending') return '⏳';
    if (result.status === 'running') return '🔄';
    if (result.status === 'completed') return '✅';
    if (result.status === 'error') return '❌';
    return '⏳';
  };

  const getStatusColor = (agentId: AgentType) => {
    const result = results[agentId];
    if (!result || result.status === 'pending') return 'text-muted-foreground';
    if (result.status === 'running') return 'text-blue-500 animate-pulse';
    if (result.status === 'completed') return 'text-green-500';
    if (result.status === 'error') return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="flex flex-col h-full border-r bg-muted/30">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Agent Pipeline</h3>
        <p className="text-xs text-muted-foreground mt-1">
          多 Agent 协作流程
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {agents.map((agent, index) => (
            <div key={agent.id}>
              {/* 连接线 */}
              {index > 0 && (
                <div className="flex justify-center py-1">
                  <div className="w-0.5 h-4 bg-border" />
                </div>
              )}

              {/* Agent 卡片 */}
              <div
                className={`rounded-lg border p-3 cursor-pointer transition-all ${
                  currentAgent === agent.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-accent'
                }`}
                onClick={() =>
                  setExpandedAgent(expandedAgent === agent.id ? null : agent.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{agent.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {agent.description}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm ${getStatusColor(agent.id)}`}>
                    {getStatusIcon(agent.id)}
                  </span>
                </div>

                {/* 展开的内容 */}
                {expandedAgent === agent.id && (
                  <div className="mt-3 pt-3 border-t">
                    {results[agent.id]?.content ? (
                      <div className="text-xs text-muted-foreground max-h-[200px] overflow-auto">
                        <pre className="whitespace-pre-wrap break-words font-sans">
                          {results[agent.id].content.substring(0, 500)}
                          {results[agent.id].content.length > 500 && '...'}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        等待执行...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* 操作按钮 */}
      <div className="p-3 border-t space-y-2">
        <Button
          className="w-full"
          onClick={() => {
            // 找到第一个未完成的 Agent
            const nextAgent = agents.find(a => !results[a.id] || results[a.id].status === 'pending');
            if (nextAgent) {
              onRunAgent(nextAgent.id);
            }
          }}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              {currentAgent ? `执行中: ${currentAgent}` : '执行中...'}
            </>
          ) : (
            '开始分析'
          )}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            // 依次执行所有 Agent
            agents.forEach(a => onRunAgent(a.id));
          }}
          disabled={isRunning}
        >
          执行全部
        </Button>
      </div>
    </div>
  );
}
