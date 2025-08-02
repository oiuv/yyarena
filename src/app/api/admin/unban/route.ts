import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database.mjs';
import { verifyToken } from '@/utils/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: '需要认证' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = verifyToken(token);

    if (!decodedToken || typeof decodedToken === 'string' || decodedToken.role !== 'admin') {
      return NextResponse.json({ message: '无权限，仅限系统管理员' }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ message: '用户ID必填' }, { status: 400 });
    }

    // Update all active bans to expired
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE UserBans SET expires_at = datetime("now") WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime("now"))',
        [userId],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    return NextResponse.json({ message: '解禁成功' }, { status: 200 });
  } catch (error) {
    console.error('Error unbanning user:', error);
    return NextResponse.json({ message: '解禁失败' }, { status: 500 });
  }
}