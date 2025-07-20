import { NextRequest, NextResponse } from 'next/server';
const { db, query } = require('@/database.js');
import { jwtDecode } from 'jwt-decode';

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.split(' ')[1];

  if (!token) {
    return NextResponse.json({ message: '未授权' }, { status: 401 });
  }

  let decodedToken: any;
  try {
    decodedToken = jwtDecode(token);
  } catch (e) {
    return NextResponse.json({ message: '无效的令牌' }, { status: 401 });
  }

  const userId = decodedToken.id;

  try {
    const userStats: any = await new Promise((resolve, reject) => {
      db.get(
        `SELECT total_participations, first_place_count, second_place_count, third_place_count, forfeit_count
         FROM Users WHERE id = ?`,
        [userId],
        (err: Error | null, row: any) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });

    if (!userStats) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json(userStats);
  } catch (error: any) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ message: error.message || '获取用户统计数据失败' }, { status: 500 });
  }
}
