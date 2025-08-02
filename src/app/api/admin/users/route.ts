import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database.mjs';
import { verifyToken } from '@/utils/auth';

export async function GET(request: NextRequest) {
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

    const users = await new Promise((resolve, reject) => {
      db.all(
        'SELECT id, username, game_id, character_name, role, created_at FROM Users ORDER BY id DESC',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error('Error getting users:', error);
    return NextResponse.json({ message: '获取用户列表失败' }, { status: 500 });
  }
}