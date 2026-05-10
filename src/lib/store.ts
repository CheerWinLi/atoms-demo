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

export function useStore() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const [config, setConfig] = useState<ApiConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load config from DB on mount
  useEffect(() => {
    fetch('/api/user-config')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.apiKey) {
          setConfig({
            apiFormat: data.apiFormat || 'openai',
            baseUrl: data.baseUrl || DEFAULT_CONFIG.baseUrl,
            apiKey: data.apiKey,
            model: data.model || DEFAULT_CONFIG.model,
          });
        }
      })
      .catch(() => {});
  }, []);

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

  // Send message and generate code (with streaming)
  const sendMessage = useCallback(async (content: string) => {
    if (!currentProject || isGenerating) return;

    // Check if API is configured
    if (!config.apiKey) {
      const errorMsg: Message = {
        id: 'error-' + Date.now(),
        projectId: currentProject.id,
        role: 'assistant',
        content: '请先在右上角设置中配置 API Key 和模型信息，然后再开始对话。',
        createdAt: new Date().toISOString(),
      };
      // Save user message first
      const userRes = await fetch(`/api/projects/${currentProject.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content }),
      });
      const userMessage = await userRes.json();
      setMessages(prev => [...prev, userMessage, errorMsg]);
      return;
    }

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

    // Create a temporary assistant message for streaming
    const tempId = 'streaming-' + Date.now();
    const tempMessage: Message = {
      id: tempId,
      projectId: currentProject.id,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMessage]);

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

      // Read stream and update message in real-time
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;

          // Update the streaming message in real-time
          setMessages(prev => prev.map(m =>
            m.id === tempId ? { ...m, content: fullContent } : m
          ));
        }
      }

      // Save the final assistant message to database
      const assistantRes = await fetch(`/api/projects/${currentProject.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'assistant', content: fullContent }),
      });
      const assistantMessage = await assistantRes.json();

      // Replace temp message with the saved one
      setMessages(prev => prev.map(m =>
        m.id === tempId ? assistantMessage : m
      ));

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
      // Update temp message with error
      setMessages(prev => prev.map(m =>
        m.id === tempId ? {
          ...m,
          id: 'error-' + Date.now(),
          content: `Error: ${error instanceof Error ? error.message : 'Failed to generate code'}`,
        } : m
      ));
    } finally {
      setIsGenerating(false);
    }
  }, [currentProject, messages, config, isGenerating]);

  // Regenerate last response
  const regenerate = useCallback(async () => {
    if (!currentProject || isGenerating) return;
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'assistant') {
        setMessages(prev => prev.slice(0, -1));
      }
      await sendMessage(lastUserMessage.content);
    }
  }, [currentProject, messages, isGenerating, sendMessage]);

  // Save config to DB
  const saveConfigToDb = useCallback(async (newConfig: ApiConfig) => {
    setConfig(newConfig);
    try {
      await fetch('/api/user-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
    } catch (e) {
      console.error('Failed to save config:', e);
    }
  }, []);

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
    setConfig: saveConfigToDb,
    createProject,
    deleteProject,
    selectProject,
    sendMessage,
    regenerate,
    setCurrentVersion,
    fetchProjects,
  };
}
