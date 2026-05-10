import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  projectId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface Version {
  id: string;
  projectId: string;
  userId: string;
  code: string;
  description: string;
  createdAt: string;
}

// Helper to read JSON file
async function readJsonFile<T>(filename: string): Promise<T[]> {
  await ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  try {
    const data = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Helper to write JSON file
async function writeJsonFile<T>(filename: string, data: T[]): Promise<void> {
  await ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
}

// User operations
export async function getUsers(): Promise<User[]> {
  return readJsonFile<User>('users.json');
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(u => u.id === id) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(u => u.email === email) || null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(u => u.username === username) || null;
}

export async function createUser(username: string, email: string, password: string): Promise<User> {
  const users = await getUsers();

  // Check if user already exists
  if (users.find(u => u.email === email)) {
    throw new Error('Email already exists');
  }
  if (users.find(u => u.username === username)) {
    throw new Error('Username already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const user: User = {
    id: uuidv4(),
    username,
    email,
    password: hashedPassword,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  await writeJsonFile('users.json', users);
  return user;
}

export async function verifyUser(email: string, password: string): Promise<User | null> {
  const users = await getUsers();
  const user = users.find(u => u.email === email);
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  return user;
}

// Project operations
export async function getUserProjects(userId: string): Promise<Project[]> {
  const projects = await readJsonFile<Project>('projects.json');
  return projects.filter(p => p.userId === userId);
}

export async function getProject(id: string, userId: string): Promise<Project | null> {
  const projects = await readJsonFile<Project>('projects.json');
  return projects.find(p => p.id === id && p.userId === userId) || null;
}

export async function createProject(userId: string, name: string): Promise<Project> {
  const projects = await readJsonFile<Project>('projects.json');
  const project: Project = {
    id: uuidv4(),
    userId,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.push(project);
  await writeJsonFile('projects.json', projects);
  return project;
}

export async function updateProject(id: string, userId: string, name: string): Promise<Project | null> {
  const projects = await readJsonFile<Project>('projects.json');
  const index = projects.findIndex(p => p.id === id && p.userId === userId);
  if (index === -1) return null;
  projects[index].name = name;
  projects[index].updatedAt = new Date().toISOString();
  await writeJsonFile('projects.json', projects);
  return projects[index];
}

export async function deleteProject(id: string, userId: string): Promise<boolean> {
  const projects = await readJsonFile<Project>('projects.json');
  const project = projects.find(p => p.id === id && p.userId === userId);
  if (!project) return false;

  const filtered = projects.filter(p => p.id !== id);
  await writeJsonFile('projects.json', filtered);

  // Also delete related messages and versions
  const messages = await readJsonFile<Message>('messages.json');
  await writeJsonFile('messages.json', messages.filter(m => m.projectId !== id));

  const versions = await readJsonFile<Version>('versions.json');
  await writeJsonFile('versions.json', versions.filter(v => v.projectId !== id));

  return true;
}

// Message operations
export async function getProjectMessages(projectId: string, userId: string): Promise<Message[]> {
  const messages = await readJsonFile<Message>('messages.json');
  return messages.filter(m => m.projectId === projectId && m.userId === userId);
}

export async function createMessage(projectId: string, userId: string, role: 'user' | 'assistant', content: string): Promise<Message> {
  const messages = await readJsonFile<Message>('messages.json');
  const message: Message = {
    id: uuidv4(),
    projectId,
    userId,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
  messages.push(message);
  await writeJsonFile('messages.json', messages);
  return message;
}

// Version operations
export async function getProjectVersions(projectId: string, userId: string): Promise<Version[]> {
  const versions = await readJsonFile<Version>('versions.json');
  return versions.filter(v => v.projectId === projectId && v.userId === userId);
}

export async function createVersion(projectId: string, userId: string, code: string, description: string): Promise<Version> {
  const versions = await readJsonFile<Version>('versions.json');
  const version: Version = {
    id: uuidv4(),
    projectId,
    userId,
    code,
    description,
    createdAt: new Date().toISOString(),
  };
  versions.push(version);
  await writeJsonFile('versions.json', versions);
  return version;
}

export async function getVersion(id: string, userId: string): Promise<Version | null> {
  const versions = await readJsonFile<Version>('versions.json');
  return versions.find(v => v.id === id && v.userId === userId) || null;
}
