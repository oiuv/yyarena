import { NextRequest, NextResponse } from 'next/server';
import db from '@/database.js';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = parseInt(params.id, 10);

  try {
    const matches = await new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          m.*,
          p1.character_name as player1_character_name,
          p2.character_name as player2_character_name,
          w.character_name as winner_character_name
        FROM Matches m
        LEFT JOIN Users p1 ON m.player1_id = p1.id
        LEFT JOIN Users p2 ON m.player2_id = p2.id
        LEFT JOIN Users w ON m.winner_id = w.id
        WHERE m.tournament_id = ?
        ORDER BY m.round_number, m.id
      `;
      db.all(sql, [tournamentId], (err, rows) => {
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