import { NextResponse } from 'next/server';
import { db, query } from '@/database.mjs';

export async function GET(request: Request, { params }: { params: { uuid: string } }) {
  try {
    const { uuid } = params;

    if (!uuid) {
      return NextResponse.json({ message: 'UUID is required' }, { status: 400 });
    }

    const user = await query(
      'SELECT character_name, avatar, game_id, stream_url FROM Users WHERE uuid = ?',
      [uuid]
    );

    if (user.length === 0) {
      return NextResponse.json({ message: 'Player not found' }, { status: 404 });
    }

    const player = user[0];

    // Fetch player stats
    const stats = await query(
      'SELECT total_participations, first_place_count, second_place_count, third_place_count, forfeit_count FROM Users WHERE uuid = ?',
      [uuid]
    );

    const playerStats = stats.length > 0 ? stats[0] : {};

    return NextResponse.json({ player, stats: playerStats }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching player data:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
