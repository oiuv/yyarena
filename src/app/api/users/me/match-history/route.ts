import { NextRequest, NextResponse } from 'next/server';
import db from '@/database.js';
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
    const matchHistory: any[] = await new Promise((resolve, reject) => {
      db.all(
        `SELECT
           R.id AS registration_id,
           R.registration_time,
           R.status AS registration_status,
           T.id AS tournament_id,
           T.name AS tournament_name,
           T.start_time,
           T.registration_deadline,
           T.status AS tournament_status,
           U.character_name AS organizer_name
         FROM Registrations R
         JOIN Tournaments T ON R.tournament_id = T.id
         JOIN Users U ON T.organizer_id = U.id
         WHERE R.player_id = ?
         ORDER BY R.registration_time DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });

    return NextResponse.json(matchHistory);
  } catch (error: any) {
    console.error('Error fetching match history:', error);
    return NextResponse.json({ message: error.message || '获取比赛记录失败' }, { status: 500 });
  }
}
