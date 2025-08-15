import { NextResponse } from 'next/server';
import { db } from '@/database.mjs';
import { verifyToken } from '@/utils/auth';

// PUT: 更新额外奖品记录
export async function PUT(request: Request, { params }: { params: { id: string, awardId: string } }) {
  const tournamentId = parseInt(params.id, 10);
  const awardId = parseInt(params.awardId, 10);

  if (isNaN(tournamentId) || isNaN(awardId)) {
    return NextResponse.json({ message: '无效的比赛ID或奖品ID' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ message: '需要认证' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const decodedToken = verifyToken(token);

  if (!decodedToken || typeof decodedToken === 'string' || decodedToken.role !== 'organizer') {
    return NextResponse.json({ message: '无权限' }, { status: 403 });
  }
  const organizerId = decodedToken.id;

  try {
    // 验证比赛是否存在且属于当前主办方
    const tournament: any = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Tournaments WHERE id = ?', [tournamentId], (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return NextResponse.json({ message: '比赛不存在' }, { status: 404 });
    }

    if (tournament.organizer_id !== organizerId) {
      return NextResponse.json({ message: '无权操作此比赛' }, { status: 403 });
    }

    // 验证奖品记录是否存在
    const award: any = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM ExtraAwards WHERE id = ? AND tournament_id = ?', [awardId, tournamentId], (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!award) {
      return NextResponse.json({ message: '奖品记录不存在' }, { status: 404 });
    }

    const { game_id, prize_id, prize_description, remark } = await request.json();

    // 验证必填字段
    if (!game_id || !prize_id) {
      return NextResponse.json({ message: '游戏ID和奖品ID为必填项' }, { status: 400 });
    }

    // 验证奖品ID是否为有效数字
    const parsedPrizeId = parseInt(prize_id, 10);
    if (isNaN(parsedPrizeId)) {
      return NextResponse.json({ message: '奖品ID必须是有效数字' }, { status: 400 });
    }

    // 验证玩家是否存在
    const player = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM Users WHERE game_id = ?', [game_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!player) {
      return NextResponse.json({ message: '玩家不存在' }, { status: 404 });
    }

    // 更新记录
    await new Promise<void>((resolve, reject) => {
      db.run(
        'UPDATE ExtraAwards SET game_id = ?, prize_id = ?, prize_description = ?, remark = ? WHERE id = ? AND tournament_id = ?',
        [game_id, parsedPrizeId, prize_description || null, remark || null, awardId, tournamentId],
        function(err: Error | null) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    return NextResponse.json({ message: '额外奖品更新成功' }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating extra award:', error);
    return NextResponse.json({ message: error.message || '更新失败' }, { status: 500 });
  }
}

// DELETE: 删除额外奖品记录
export async function DELETE(request: Request, { params }: { params: { id: string, awardId: string } }) {
  const tournamentId = parseInt(params.id, 10);
  const awardId = parseInt(params.awardId, 10);

  if (isNaN(tournamentId) || isNaN(awardId)) {
    return NextResponse.json({ message: '无效的比赛ID或奖品ID' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ message: '需要认证' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const decodedToken = verifyToken(token);

  if (!decodedToken || typeof decodedToken === 'string' || decodedToken.role !== 'organizer') {
    return NextResponse.json({ message: '无权限' }, { status: 403 });
  }
  const organizerId = decodedToken.id;

  try {
    // 验证比赛是否存在且属于当前主办方
    const tournament: any = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM Tournaments WHERE id = ?', [tournamentId], (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return NextResponse.json({ message: '比赛不存在' }, { status: 404 });
    }

    if (tournament.organizer_id !== organizerId) {
      return NextResponse.json({ message: '无权操作此比赛' }, { status: 403 });
    }

    // 删除记录
    await new Promise<void>((resolve, reject) => {
      db.run(
        'DELETE FROM ExtraAwards WHERE id = ? AND tournament_id = ?',
        [awardId, tournamentId],
        function(err: Error | null) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    return NextResponse.json({ message: '额外奖品删除成功' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting extra award:', error);
    return NextResponse.json({ message: error.message || '删除失败' }, { status: 500 });
  }
}