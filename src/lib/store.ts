'use client';

import { useState, useEffect, useCallback } from 'react';
import { WorkflowStage, STAGE_ORDER, ADVANCE_KEYWORDS } from './prompts';

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
  const [currentStage, setCurrentStage] = useState<WorkflowStage>('analysis');

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
      setCurrentStage('analysis');
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
        setCurrentStage('analysis');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  }, [currentProject]);

  // Select project
  const selectProject = useCallback(async (project: Project) => {
    setCurrentProject(project);
    setCurrentVersion(null);
    setCurrentStage('analysis');
    await fetchMessages(project.id);
    await fetchVersions(project.id);
  }, [fetchMessages, fetchVersions]);

  // Advance to next stage
  const advanceStage = useCallback(() => {
    setCurrentStage(prev => {
      const idx = STAGE_ORDER.indexOf(prev);
      if (idx < STAGE_ORDER.length - 1) {
        return STAGE_ORDER[idx + 1];
      }
      return prev;
    });
  }, []);

  // Check if message is a confirmation keyword
  const isAdvanceKeyword = useCallback((text: string): boolean => {
    const trimmed = text.trim().toLowerCase();
    return ADVANCE_KEYWORDS.some(kw => trimmed === kw.toLowerCase());
  }, []);

  // Send message and generate (with streaming)
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
      const userRes = await fetch(`/api/projects/${currentProject.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content }),
      });
      const userMessage = await userRes.json();
      setMessages(prev => [...prev, userMessage, errorMsg]);
      return;
    }

    // Check if user is confirming to advance to next stage
    const shouldAdvance = isAdvanceKeyword(content) && currentStage !== 'generate';
    if (shouldAdvance) {
      advanceStage();
    }

    setIsGenerating(true);

    // Determine which stage to use for this request
    const stageForRequest = shouldAdvance
      ? STAGE_ORDER[Math.min(STAGE_ORDER.indexOf(currentStage) + 1, STAGE_ORDER.length - 1)]
      : currentStage;

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

    // Create streaming temp message
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
      // Call generate API with stage
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: aiMessages, config, stage: stageForRequest }),
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
          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;

          setMessages(prev => prev.map(m =>
            m.id === tempId ? { ...m, content: fullContent } : m
          ));
        }
      }

      // Save final assistant message
      const assistantRes = await fetch(`/api/projects/${currentProject.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'assistant', content: fullContent }),
      });
      const assistantMessage = await assistantRes.json();

      setMessages(prev => prev.map(m =>
        m.id === tempId ? assistantMessage : m
      ));

      // Extract HTML and create version (only in generate stage)
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
  }, [currentProject, messages, config, isGenerating, currentStage, advanceStage, isAdvanceKeyword]);

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
    currentStage,
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
