import { NextRequest, NextResponse } from 'next/server';
import { db, query } from '@/database.mjs';
import { verifyToken } from '@/utils/auth';

export async function GET(request: NextRequest) {
  // 1. Verify Organizer
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ message: '需要认证' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  const decodedToken = verifyToken(token);

  if (!decodedToken || typeof decodedToken === 'string' || decodedToken.role !== 'organizer') {
    return NextResponse.json({ message: '无权限' }, { status: 403 });
  }
  const organizerId = decodedToken.id;

  try {
    const tournaments = await new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          t.id,
          t.name,
          t.start_time,
          t.registration_deadline,
          t.status,
          t.min_players,
          t.max_players,
          t.event_description,
          u.character_name as organizer_name
        FROM Tournaments t
        JOIN Users u ON t.organizer_id = u.id
        WHERE t.organizer_id = ?
        ORDER BY t.start_time DESC
      `;
      db.all(sql, [organizerId], (err: Error | null, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    return NextResponse.json(tournaments);
  } catch (error) {
    console.error('Error fetching organizer tournaments:', error);
    return NextResponse.json({ message: '获取比赛列表失败' }, { status: 500 });
  }
}
