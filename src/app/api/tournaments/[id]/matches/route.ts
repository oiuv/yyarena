import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../../utils/auth';
import { generateMatchesAndStartTournament } from '../../../../../tournamentUtils';
import db from '@/database.js';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = parseInt(params.id, 10);

  // 1. Authorization
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ message: '需要认证' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  const decodedToken = verifyToken(token);

  if (!decodedToken || typeof decodedToken === 'string' || decodedToken.role !== 'organizer') {
    return NextResponse.json({ message: '无权限' }, { status: 403 });
  }

  try {
    // 2. Verify the user is the organizer of this specific tournament
    const tournament: any = await new Promise((resolve, reject) => {
      db.get('SELECT organizer_id FROM Tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return NextResponse.json({ message: '未找到比赛' }, { status: 404 });
    }
    if (tournament.organizer_id !== decodedToken.userId) {
      return NextResponse.json({ message: '无权限操作此比赛' }, { status: 403 });
    }

    // 3. Call the utility function to generate matches
    await generateMatchesAndStartTournament(tournamentId);

    return NextResponse.json({ message: '对阵已成功生成，比赛已开始。' });

  } catch (error) {
    console.error(`Error generating matches for tournament ${tournamentId}:`, error);
    return NextResponse.json({ message: '生成对阵失败' }, { status: 500 });
  }
}
