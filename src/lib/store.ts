'use client';

import { useState, useEffect, useCallback } from 'react';

// Types
export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  projectId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface Version {
  id: string;
  projectId: string;
  code: string;
  description: string;
  createdAt: string;
}

export interface ApiConfig {
  apiFormat: 'openai' | 'anthropic';
  baseUrl: string;
  apiKey: string;
  model: string;
}

const DEFAULT_CONFIG: ApiConfig = {
  apiFormat: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4',
};

// Load config from localStorage
function loadConfig(): ApiConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  const saved = localStorage.getItem('atoms-config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

// Save config to localStorage
function saveConfig(config: ApiConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('atoms-config', JSON.stringify(config));
}

export function useStore() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const [config, setConfig] = useState<ApiConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load config on mount
  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  // Save config when it changes
  useEffect(() => {
    if (config !== DEFAULT_CONFIG) {
      saveConfig(config);
    }
  }, [config]);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, []);

  // Fetch messages for current project
  const fetchMessages = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`);
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, []);

  // Fetch versions for current project
  const fetchVersions = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`);
      const data = await res.json();
      setVersions(data);
      if (data.length > 0 && !currentVersion) {
        setCurrentVersion(data[data.length - 1]);
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    }
  }, [currentVersion]);

  // Create new project
  const createProject = useCallback(async (name: string) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const project = await res.json();
      setProjects(prev => [...prev, project]);
      setCurrentProject(project);
      setMessages([]);
      setVersions([]);
      setCurrentVersion(null);
      return project;
    } catch (error) {
      console.error('Failed to create project:', error);
      return null;
    }
  }, []);

  // Delete project
  const deleteProject = useCallback(async (projectId: string) => {
    try {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
        setMessages([]);
        setVersions([]);
        setCurrentVersion(null);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  }, [currentProject]);

  // Select project
  const selectProject = useCallback(async (project: Project) => {
    setCurrentProject(project);
    setCurrentVersion(null);
    await fetchMessages(project.id);
    await fetchVersions(project.id);
  }, [fetchMessages, fetchVersions]);

  // Send message and generate code
  const sendMessage = useCallback(async (content: string) => {
    if (!currentProject || isGenerating) return;

    setIsGenerating(true);

    // Save user message
    const userRes = await fetch(`/api/projects/${currentProject.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user', content }),
    });
    const userMessage = await userRes.json();
    setMessages(prev => [...prev, userMessage]);

    // Prepare messages for AI
    const aiMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content },
    ];

    try {
      // Call generate API
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: aiMessages, config }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate');
      }

      // Read stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullContent += decoder.decode(value, { stream: true });
        }
      }

      // Save assistant message
      const assistantRes = await fetch(`/api/projects/${currentProject.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'assistant', content: fullContent }),
      });
      const assistantMessage = await assistantRes.json();
      setMessages(prev => [...prev, assistantMessage]);

      // Extract HTML code and save as version
      const htmlMatch = fullContent.match(/```html\n([\s\S]*?)```/);
      if (htmlMatch) {
        const code = htmlMatch[1].trim();
        const versionRes = await fetch(`/api/projects/${currentProject.id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            description: content.substring(0, 100),
          }),
        });
        const version = await versionRes.json();
        setVersions(prev => [...prev, version]);
        setCurrentVersion(version);
      }
    } catch (error) {
      console.error('Failed to generate:', error);
      // Save error message
      const errorMessage = {
        id: Date.now().toString(),
        projectId: currentProject.id,
        role: 'assistant' as const,
        content: `Error: ${error instanceof Error ? error.message : 'Failed to generate code'}`,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  }, [currentProject, messages, config, isGenerating]);

  // Load projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    currentProject,
    messages,
    versions,
    currentVersion,
    config,
    isLoading,
    isGenerating,
    setConfig,
    createProject,
    deleteProject,
    selectProject,
    sendMessage,
    setCurrentVersion,
    fetchProjects,
  };
}
