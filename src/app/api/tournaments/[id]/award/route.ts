import { NextRequest, NextResponse } from 'next/server';
import { db, query } from '@/database.mjs';
import { verifyToken } from '@/utils/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'organizer') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const tournamentId = params.id;
  const { player_id, prize_id, remark } = await req.json();

  if (!player_id || !prize_id) {
    return NextResponse.json({ message: 'Missing player_id or prize_id' }, { status: 400 });
  }

  try {
    // First, check if the user is the organizer of this tournament
    const tournament: any = await new Promise((resolve, reject) => {
      db.get('SELECT organizer_id FROM Tournaments WHERE id = ?', [tournamentId], (err: Error | null, row: any) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!tournament || tournament.organizer_id !== decoded.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Insert the award into the database
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO PlayerAwards (tournament_id, player_id, prize_id, awarded_at, remark) VALUES (?, ?, ?, ?, ?)',
        [tournamentId, player_id, prize_id, new Date().toISOString(), remark || null],
        function (this: any, err: Error | null) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });

    return NextResponse.json({ message: 'Prize awarded successfully' });
  } catch (error) {
    console.error('Error awarding prize:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
