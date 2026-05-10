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
  baseUrl: '',
  apiKey: '',
  model: '',
};

// Load config from localStorage
function loadConfig(): ApiConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  const saved = localStorage.getItem('atoms-config');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      // 验证配置完整性，如果缺少字段则返回默认值
      if (!config.baseUrl || !config.apiKey || !config.model) {
        return DEFAULT_CONFIG;
      }
      return config;
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
  const [currentThinking, setCurrentThinking] = useState('');

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
    // 先清空旧数据
    setCurrentProject(project);
    setMessages([]);
    setVersions([]);
    setCurrentVersion(null);
    // 再加载新数据
    await fetchMessages(project.id);
    await fetchVersions(project.id);
  }, [fetchMessages, fetchVersions]);

  // Send message and generate code
  const sendMessage = useCallback(async (content: string) => {
    if (!currentProject || isGenerating) return;

    // 前端检查 API 配置
    const missing = [];
    if (!config.baseUrl) missing.push('API 地址');
    if (!config.apiKey) missing.push('API Key');
    if (!config.model) missing.push('模型名称');
    if (missing.length > 0) {
      const errorMsg = {
        id: Date.now().toString(),
        projectId: currentProject.id,
        role: 'assistant' as const,
        content: `⚠️ 请先完成 API 配置，缺少：${missing.join('、')}\n\n请点击右上角齿轮图标打开设置`,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
      return;
    }

    setIsGenerating(true);
    setCurrentThinking('');

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
        let errorMsg = '生成失败';
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch {
          errorMsg = `请求失败 (${res.status})`;
        }
        throw new Error(errorMsg);
      }

      // Read stream with thinking extraction
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let thinkingBuffer = '';
      let isInThinking = false;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;

          // Extract thinking process in real-time
          for (let i = 0; i < chunk.length; i++) {
            if (chunk[i] === '<' && chunk.substring(i, i + 9) === '<thinking') {
              isInThinking = true;
              thinkingBuffer = '';
              i += 8; // Skip '<thinking'
              continue;
            }
            if (chunk[i] === '<' && chunk.substring(i, i + 10) === '</thinking') {
              isInThinking = false;
              i += 9; // Skip '</thinking'
              continue;
            }
            if (isInThinking) {
              thinkingBuffer += chunk[i];
              setCurrentThinking(thinkingBuffer);
            }
          }
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
      // Save error message with user-friendly description
      let errorContent = '生成失败，请重试';
      if (error instanceof Error) {
        const msg = error.message;
        if (msg.includes('API 配置') || msg.includes('API configuration')) {
          errorContent = `⚠️ ${msg}\n\n请点击右上角齿轮图标，在设置中配置 API 信息`;
        } else if (msg.includes('401') || msg.includes('Unauthorized')) {
          errorContent = '⚠️ API Key 无效，请检查设置中的 API Key 是否正确';
        } else if (msg.includes('404') || msg.includes('Not Found')) {
          errorContent = '⚠️ 模型不存在，请检查设置中的模型名称是否正确';
        } else if (msg.includes('429') || msg.includes('Rate limit')) {
          errorContent = '⚠️ 请求过于频繁，请稍后再试';
        } else if (msg.includes('500') || msg.includes('Internal')) {
          errorContent = '⚠️ API 服务异常，请稍后再试';
        } else {
          errorContent = `⚠️ ${msg}`;
        }
      }
      const errorMessage = {
        id: Date.now().toString(),
        projectId: currentProject.id,
        role: 'assistant' as const,
        content: errorContent,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
      setCurrentThinking('');
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
    currentThinking,
    setConfig,
    createProject,
    deleteProject,
    selectProject,
    sendMessage,
    setCurrentVersion,
    fetchProjects,
  };
}
