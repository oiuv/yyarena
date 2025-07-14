import { NextResponse } from 'next/server';
import db from '@/database.js';
import { generateMatchesAndStartTournament } from '@/tournamentUtils';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-default-secret-key');

export async function POST(request: Request) {
  const { tournament_id, character_name, character_id } = await request.json();

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
  }

  let player_id: number;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    player_id = payload.id as number;
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
  }

  try {
    // 1. Validate tournament_id and check tournament status and max_players
    const tournament: any = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Tournaments WHERE id = ?', [tournament_id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found.' }, { status: 404 });
    }

    if (tournament.status !== 'pending') {
      return NextResponse.json({ error: 'Tournament is not open for registration.' }, { status: 400 });
    }

    const currentRegistrations: any = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM Registrations WHERE tournament_id = ?', [tournament_id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (currentRegistrations.count >= tournament.max_players) {
      return NextResponse.json({ error: 'Tournament registration is full.' }, { status: 400 });
    }

    // 2. Insert player registration
    const result: any = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO Registrations (tournament_id, player_id, character_name, character_id) VALUES (?, ?, ?, ?)',
        [tournament_id, player_id, character_name, character_id],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID });
          }
        }
      );
    });

    // 3. Check if min_players reached and start tournament (logic to be implemented later)
    const updatedRegistrations: any = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM Registrations WHERE tournament_id = ?', [tournament_id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (updatedRegistrations.count >= tournament.min_players && tournament.status === 'pending') {
      await generateMatchesAndStartTournament(tournament_id);
    }

    return NextResponse.json({ message: 'Registration successful.', registrationId: result.id }, { status: 201 });
  } catch (error) {
    console.error('Error during registration:', error);
    return NextResponse.json({ error: 'Failed to register for tournament.' }, { status: 500 });
  }
}
