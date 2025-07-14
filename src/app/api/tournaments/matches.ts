import { NextResponse } from 'next/server';
import db from '@/database.js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get('tournamentId');

  if (!tournamentId) {
    return NextResponse.json({ error: 'Tournament ID is required.' }, { status: 400 });
  }

  try {
    const matches = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM Matches WHERE tournament_id = ? ORDER BY round_number, id', [tournamentId], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
    return NextResponse.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json({ error: 'Failed to fetch matches.' }, { status: 500 });
  }
}
