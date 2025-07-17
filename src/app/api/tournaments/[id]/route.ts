import { NextRequest, NextResponse } from 'next/server';
import db from '@/database.js';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = parseInt(params.id, 10);

  if (isNaN(tournamentId)) {
    return NextResponse.json({ message: '无效的比赛ID' }, { status: 400 });
  }

  try {
    const tournament: any = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!tournament) {
      return NextResponse.json({ message: '比赛不存在' }, { status: 404 });
    }

    // If tournament is finished, parse final_rankings
    if (tournament.status === 'finished' && tournament.final_rankings) {
      tournament.final_rankings = JSON.parse(tournament.final_rankings);
    }

    return NextResponse.json(tournament);
  } catch (error: any) {
    console.error('Error fetching tournament details:', error);
    return NextResponse.json({ message: error.message || '获取比赛详情失败' }, { status: 500 });
  }
}