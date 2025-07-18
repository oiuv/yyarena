import { NextResponse } from 'next/server';
import db from '@/database.js';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const tournamentId = params.id;
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit');

  try {
    const registeredPlayers: any[] = await new Promise((resolve, reject) => {
      let query = `SELECT u.character_name, u.avatar FROM Registrations r JOIN Users u ON r.player_id = u.id WHERE r.tournament_id = ? AND r.status = 'active'`;
      const queryParams = [tournamentId];

      if (limit && !isNaN(parseInt(limit))) {
        query += ` LIMIT ?`;
        queryParams.push(parseInt(limit));
      }

      db.all(
        query,
        queryParams,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    return NextResponse.json(registeredPlayers);
  } catch (error) {
    console.error('Error fetching registered players avatars:', error);
    return NextResponse.json({ message: '获取已报名玩家头像失败' }, { status: 500 });
  }
}