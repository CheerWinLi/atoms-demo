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
    setConfig,
    createProject,
    deleteProject,
    selectProject,
    sendMessage,
    regenerate,
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
    <div className="flex flex-col h-screen overflow-hidden">
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
      <main className="flex-1 flex overflow-hidden">
        {currentProject ? (
          <>
            {/* Chat Panel - Left side */}
            <div className="w-1/2 border-r flex flex-col overflow-hidden">
              <ChatPanel
                messages={messages}
                isGenerating={isGenerating}
                hasApiKey={!!config.apiKey}
                onSend={sendMessage}
                onRegenerate={regenerate}
              />
            </div>
            {/* Preview Panel - Right side */}
            <div className="w-1/2 flex flex-col overflow-hidden">
              <PreviewPanel
                versions={versions}
                currentVersion={currentVersion}
                onSelectVersion={setCurrentVersion}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">
                欢迎使用 Atoms Demo{user ? `, ${user.username}` : ''}
              </h2>
              <p className="text-muted-foreground mb-6">
                创建一个新项目开始使用
              </p>
              <button
                onClick={() => setShowNewProject(true)}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                新建项目
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
