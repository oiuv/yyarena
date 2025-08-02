import { NextRequest, NextResponse } from 'next/server';
import { db, query } from '@/database.mjs';
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

    const { userId, reason, expiresAt } = await request.json();

    if (!userId || !reason) {
      return NextResponse.json({ message: '用户ID和封禁原因必填' }, { status: 400 });
    }

    // Check if user exists
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!user) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 });
    }

    // Check if already banned
    const existingBan = await new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM UserBans 
        WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
      `, [userId], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (existingBan) {
      return NextResponse.json({ message: '用户已被封禁' }, { status: 400 });
    }

    // Create ban record
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO UserBans (user_id, reason, banned_by, expires_at) VALUES (?, ?, ?, ?)',
        [userId, reason, decodedToken.id, expiresAt || null],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    return NextResponse.json({ message: '封禁成功' }, { status: 200 });
  } catch (error) {
    console.error('Error banning user:', error);
    return NextResponse.json({ message: '封禁失败' }, { status: 500 });
  }
}

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

    const bannedUsers = await new Promise((resolve, reject) => {
      db.all(`
        SELECT u.id, u.username, u.game_id, u.character_name, u.role, 
               ub.reason, ub.banned_at, ub.expires_at,
               admin.username as banned_by_username
        FROM Users u
        JOIN UserBans ub ON u.id = ub.user_id
        JOIN Users admin ON ub.banned_by = admin.id
        WHERE ub.expires_at IS NULL OR ub.expires_at > datetime('now')
        ORDER BY ub.banned_at DESC
      `, (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });

    return NextResponse.json({ bannedUsers }, { status: 200 });
  } catch (error) {
    console.error('Error getting banned users:', error);
    return NextResponse.json({ message: '获取封禁列表失败' }, { status: 500 });
  }
}