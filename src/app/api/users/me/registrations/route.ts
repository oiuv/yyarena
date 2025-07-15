import { NextRequest, NextResponse } from 'next/server';
import db from '@/database.js';
import { verifyToken } from '@/utils/auth';

export async function GET(request: NextRequest) {
  // 1. Verify Player
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ message: '需要认证' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  const decodedToken = verifyToken(token);

  if (!decodedToken || typeof decodedToken === 'string' || (decodedToken.role !== 'player' && decodedToken.role !== 'organizer')) {
    return NextResponse.json({ message: '无权限' }, { status: 403 });
  }
  const playerId = decodedToken.id;

  try {
    const registrations = await new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          r.id as registration_id,
          r.registration_time,
          r.status as registration_status,
          t.id as tournament_id,
          t.name as tournament_name,
          t.start_time,
          t.registration_deadline,
          t.status as tournament_status,
          t.min_players,
          t.max_players,
          t.event_description,
          u.character_name as organizer_name
        FROM Registrations r
        JOIN Tournaments t ON r.tournament_id = t.id
        JOIN Users u ON t.organizer_id = u.id
        WHERE r.player_id = ?
        ORDER BY t.start_time DESC
      `;
      db.all(sql, [playerId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    return NextResponse.json(registrations);
  } catch (error) {
    console.error('Error fetching player registrations:', error);
    return NextResponse.json({ message: '获取报名列表失败' }, { status: 500 });
  }
}
