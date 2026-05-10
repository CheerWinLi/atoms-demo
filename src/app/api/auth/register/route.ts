import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/db';
import { setSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password, inviteCode } = await request.json();

    const validCode = process.env.INVITE_CODE || 'atoms2026';
    if (inviteCode !== validCode) {
      return NextResponse.json(
        { error: '邀请码不正确' },
        { status: 400 }
      );
    }

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const user = await createUser(username, email, password);

    // Set session cookie
    await setSession({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
