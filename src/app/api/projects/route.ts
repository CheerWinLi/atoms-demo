import { NextRequest, NextResponse } from 'next/server';
import { getUserProjects, createProject } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const projects = await getUserProjects(session.userId);
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { name } = await request.json();
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const project = await createProject(session.userId, name);
  return NextResponse.json(project, { status: 201 });
}
