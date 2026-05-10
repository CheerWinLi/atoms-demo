import { NextRequest, NextResponse } from 'next/server';
import { getProjectMessages, createMessage } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const messages = await getProjectMessages(id, session.userId);
  return NextResponse.json(messages);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const { role, content } = await request.json();
  if (!role || !content) {
    return NextResponse.json({ error: 'Role and content are required' }, { status: 400 });
  }

  const message = await createMessage(id, session.userId, role, content);
  return NextResponse.json(message, { status: 201 });
}
