import { NextRequest, NextResponse } from 'next/server';
import db from '@/database';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = params.id;

  try {
    const awards = await new Promise((resolve, reject) => {
      db.all(
        `SELECT pa.player_id, pa.prize_id, p.name as prize_name
         FROM PlayerAwards pa
         JOIN Prizes p ON pa.prize_id = p.id
         WHERE pa.tournament_id = ?`,
        [tournamentId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
    return NextResponse.json(awards);
  } catch (error) {
    console.error('Error fetching awards:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
