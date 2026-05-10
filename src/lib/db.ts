import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://atoms:atoms2026@localhost:5432/atoms_demo',
});

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

// Helper to map DB row to camelCase
function mapUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    password: row.password,
    createdAt: row.created_at,
  };
}

function mapProject(row: any): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: any): Message {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

function mapVersion(row: any): Version {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    code: row.code,
    description: row.description,
    createdAt: row.created_at,
  };
}

// User operations
export async function getUsers(): Promise<User[]> {
  const result = await pool.query('SELECT * FROM users');
  return result.rows.map(mapUser);
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function createUser(username: string, email: string, password: string): Promise<User> {
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();
  const result = await pool.query(
    'INSERT INTO users (id, username, email, password) VALUES ($1, $2, $3, $4) RETURNING *',
    [id, username, email, hashedPassword]
  );
  return mapUser(result.rows[0]);
}

export async function verifyUser(email: string, password: string): Promise<User | null> {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const row = result.rows[0];
  if (!row) return null;

  const isValid = await bcrypt.compare(password, row.password);
  if (!isValid) return null;

  return mapUser(row);
}

// Project operations
export async function getUserProjects(userId: string): Promise<Project[]> {
  const result = await pool.query('SELECT * FROM projects WHERE user_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC', [userId]);
  return result.rows.map(mapProject);
}

export async function getProject(id: string, userId: string): Promise<Project | null> {
  const result = await pool.query('SELECT * FROM projects WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL', [id, userId]);
  return result.rows[0] ? mapProject(result.rows[0]) : null;
}

export async function createProject(userId: string, name: string): Promise<Project> {
  const id = crypto.randomUUID();
  const result = await pool.query(
    'INSERT INTO projects (id, user_id, name) VALUES ($1, $2, $3) RETURNING *',
    [id, userId, name]
  );
  return mapProject(result.rows[0]);
}

export async function updateProject(id: string, userId: string, name: string): Promise<Project | null> {
  const result = await pool.query(
    'UPDATE projects SET name = $3, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, userId, name]
  );
  return result.rows[0] ? mapProject(result.rows[0]) : null;
}

export async function deleteProject(id: string, userId: string): Promise<boolean> {
  const result = await pool.query('UPDATE projects SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL', [id, userId]);
  return (result.rowCount ?? 0) > 0;
}

// Message operations
export async function getProjectMessages(projectId: string, userId: string): Promise<Message[]> {
  const result = await pool.query(
    'SELECT * FROM messages WHERE project_id = $1 AND user_id = $2 ORDER BY created_at',
    [projectId, userId]
  );
  return result.rows.map(mapMessage);
}

export async function createMessage(projectId: string, userId: string, role: 'user' | 'assistant', content: string): Promise<Message> {
  const id = crypto.randomUUID();
  const result = await pool.query(
    'INSERT INTO messages (id, project_id, user_id, role, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [id, projectId, userId, role, content]
  );
  return mapMessage(result.rows[0]);
}

// Version operations
export async function getProjectVersions(projectId: string, userId: string): Promise<Version[]> {
  const result = await pool.query(
    'SELECT * FROM versions WHERE project_id = $1 AND user_id = $2 ORDER BY created_at',
    [projectId, userId]
  );
  return result.rows.map(mapVersion);
}

export async function createVersion(projectId: string, userId: string, code: string, description: string): Promise<Version> {
  const id = crypto.randomUUID();
  const result = await pool.query(
    'INSERT INTO versions (id, project_id, user_id, code, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [id, projectId, userId, code, description]
  );
  return mapVersion(result.rows[0]);
}

export async function getVersion(id: string, userId: string): Promise<Version | null> {
  const result = await pool.query('SELECT * FROM versions WHERE id = $1 AND user_id = $2', [id, userId]);
  return result.rows[0] ? mapVersion(result.rows[0]) : null;
}

// User config operations
export interface UserConfig {
  apiFormat: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export async function getUserConfig(userId: string): Promise<UserConfig> {
  const result = await pool.query('SELECT * FROM user_configs WHERE user_id = $1', [userId]);
  if (result.rows[0]) {
    return {
      apiFormat: result.rows[0].api_format || 'openai',
      baseUrl: result.rows[0].base_url || '',
      apiKey: result.rows[0].api_key || '',
      model: result.rows[0].model || '',
    };
  }
  return { apiFormat: 'openai', baseUrl: '', apiKey: '', model: '' };
}

export async function saveUserConfig(userId: string, config: UserConfig): Promise<void> {
  await pool.query(
    `INSERT INTO user_configs (user_id, api_format, base_url, api_key, model, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id) DO UPDATE SET api_format = $2, base_url = $3, api_key = $4, model = $5, updated_at = NOW()`,
    [userId, config.apiFormat, config.baseUrl, config.apiKey, config.model]
  );
}
