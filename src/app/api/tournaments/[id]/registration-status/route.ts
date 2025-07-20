import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/utils/auth';
import { query } from '@/database';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = params.id;

  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.id;

    const registration = await query(
      'SELECT id FROM Registrations WHERE tournament_id = ? AND player_id = ? AND status = ?',
      [tournamentId, userId, 'active']
    );

    const isRegistered = registration.length > 0;

    return NextResponse.json({ isRegistered });

  } catch (error) {
    console.error('Error checking registration status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
