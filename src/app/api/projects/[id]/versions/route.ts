import { NextRequest, NextResponse } from 'next/server';
import { getProjectVersions, createVersion } from '@/lib/db';
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
  const versions = await getProjectVersions(id, session.userId);
  return NextResponse.json(versions);
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
  const { code, description } = await request.json();
  if (!code) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 });
  }

  const version = await createVersion(id, session.userId, code, description || 'Generated code');
  return NextResponse.json(version, { status: 201 });
}
