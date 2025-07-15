import { NextRequest, NextResponse } from 'next/server';
import db from '@/database.js';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = parseInt(params.id, 10);

  try {
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return NextResponse.json({ message: '比赛不存在' }, { status: 404 });
    }

    return NextResponse.json(tournament);
  } catch (error) {
    console.error(`Error fetching tournament ${tournamentId}:`, error);
    return NextResponse.json({ message: '获取比赛信息失败' }, { status: 500 });
  }
}