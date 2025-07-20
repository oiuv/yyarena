import { NextRequest, NextResponse } from 'next/server';
const { db, query } = require('@/database.js');

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = parseInt(params.id, 10);

  try {
    const matches = await new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          m.*,
          p1.character_name as player1_character_name,
          p1.avatar as player1_avatar,
          p2.character_name as player2_character_name,
          p2.avatar as player2_avatar,
          w.character_name as winner_character_name,
          r1.status as player1_registration_status,
          r2.status as player2_registration_status
        FROM Matches m
        LEFT JOIN Users p1 ON m.player1_id = p1.id
        LEFT JOIN Users p2 ON m.player2_id = p2.id
        LEFT JOIN Users w ON m.winner_id = w.id
        LEFT JOIN Registrations r1 ON m.tournament_id = r1.tournament_id AND m.player1_id = r1.player_id
        LEFT JOIN Registrations r2 ON m.tournament_id = r2.tournament_id AND m.player2_id = r2.player_id
        WHERE m.tournament_id = ?
        ORDER BY m.round_number, m.id
      `;
      db.all(sql, [tournamentId], (err: Error | null, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    return NextResponse.json(matches);
  } catch (error) {
    console.error(`Error fetching matches for tournament ${tournamentId}:`, error);
    return NextResponse.json({ message: '获取对阵信息失败' }, { status: 500 });
  }
}