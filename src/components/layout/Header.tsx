'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { Project, ApiConfig } from '@/lib/store';

interface HeaderProps {
  projects: Project[];
  currentProject: Project | null;
  config: ApiConfig;
  user: { userId: string; username: string; email: string } | null;
  onSelectProject: (project: Project) => void;
  onCreateProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onSaveConfig: (config: ApiConfig) => void;
}

export function Header({
  projects,
  currentProject,
  config,
  user,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onSaveConfig,
}: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <header className="border-b bg-background px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">Atoms Demo</h1>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
            {currentProject?.name || '选择项目'}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                className="flex justify-between"
                onClick={() => onSelectProject(project)}
              >
                <span>{project.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`确定要删除项目「${project.name}」吗？`)) {
                      onDeleteProject(project.id);
                    }
                  }}
                >
                  ×
                </Button>
              </DropdownMenuItem>
            ))}
            {projects.length === 0 && (
              <DropdownMenuItem disabled>
                暂无项目
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onCreateProject}>新建项目</Button>
        <SettingsDialog config={config} onSave={onSaveConfig} />
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 w-10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {user && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleLogout}>
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
