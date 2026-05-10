import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserConfig, saveUserConfig } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await getUserConfig(session.userId);
  return NextResponse.json(config);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await request.json();
  await saveUserConfig(session.userId, {
    apiFormat: config.apiFormat || 'openai',
    baseUrl: config.baseUrl || '',
    apiKey: config.apiKey || '',
    model: config.model || '',
  });

  return NextResponse.json({ success: true });
}
