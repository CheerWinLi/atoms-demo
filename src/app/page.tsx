'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { useStore } from '@/lib/store';

interface User {
  userId: string;
  username: string;
  email: string;
}

export default function Home() {
  const [showNewProject, setShowNewProject] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const {
    projects,
    currentProject,
    messages,
    versions,
    currentVersion,
    config,
    isGenerating,
    currentThinking,
    setConfig,
    createProject,
    deleteProject,
    selectProject,
    sendMessage,
    setCurrentVersion,
  } = useStore();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.userId) {
          setUser(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleCreateProject = async (name: string) => {
    await createProject(name);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header
        projects={projects}
        currentProject={currentProject}
        config={config}
        user={user}
        onSelectProject={selectProject}
        onCreateProject={() => setShowNewProject(true)}
        onDeleteProject={deleteProject}
        onSaveConfig={setConfig}
      />
      <main className="flex-1 flex">
        {currentProject ? (
          <>
            {/* 左侧：对话 */}
            <div className="flex-1 border-r min-w-0">
              <ChatPanel
                messages={messages}
                isGenerating={isGenerating}
                currentThinking={currentThinking}
                onSend={sendMessage}
              />
            </div>

            {/* 右侧：预览 */}
            <div className="flex-1 min-w-0">
              <PreviewPanel
                versions={versions}
                currentVersion={currentVersion}
                onSelectVersion={setCurrentVersion}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-2xl mx-auto p-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
                <svg
                  className="w-10 h-10 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-4">
                欢迎使用 Atoms Demo{user ? `, ${user.username}` : ''}
              </h2>
              <p className="text-muted-foreground mb-8 text-lg">
                AI 驱动的产品构建系统
              </p>

              {/* 特性展示 */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { icon: '💬', label: '智能对话', desc: '描述你的产品想法' },
                  { icon: '⚡', label: '快速生成', desc: 'AI 自动生成代码' },
                  { icon: '👁️', label: '实时预览', desc: '即时查看效果' },
                ].map(item => (
                  <div
                    key={item.label}
                    className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowNewProject(true)}
                className="inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 py-3 text-lg"
              >
                开始创建项目
              </button>
            </div>
          </div>
        )}
      </main>
      <NewProjectDialog
        open={showNewProject}
        onOpenChange={setShowNewProject}
        onCreate={handleCreateProject}
      />
    </div>
  );
}
