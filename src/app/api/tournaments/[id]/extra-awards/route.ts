import { NextResponse } from 'next/server';
import { db, query } from '@/database.mjs';
import { verifyToken } from '@/utils/auth';

// GET: 获取比赛的额外奖品记录
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const tournamentId = parseInt(params.id, 10);

  if (isNaN(tournamentId)) {
    return NextResponse.json({ message: '无效的比赛ID' }, { status: 400 });
  }

  try {
    const extraAwards = await new Promise((resolve, reject) => {
      db.all(`
        SELECT ea.id, ea.prize_id, ea.prize_description, ea.remark, ea.awarded_at,
               u.game_id, u.character_name, u.avatar,
               p.name as prize_name, p.description as prize_desc
        FROM ExtraAwards ea
        LEFT JOIN Users u ON ea.game_id = u.game_id
        LEFT JOIN Prizes p ON ea.prize_id = p.id
        WHERE ea.tournament_id = ?
        ORDER BY ea.awarded_at DESC
      `, [tournamentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    return NextResponse.json(extraAwards, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching extra awards:', error);
    return NextResponse.json({ message: '获取额外奖品失败' }, { status: 500 });
  }
}

// POST: 添加额外奖品记录
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const tournamentId = parseInt(params.id, 10);

  if (isNaN(tournamentId)) {
    return NextResponse.json({ message: '无效的比赛ID' }, { status: 400 });
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
    const { game_id, prize_id, prize_description, remark } = await request.json();

    // 验证必填字段
    if (!game_id || !prize_id) {
      return NextResponse.json({ message: '游戏ID和奖品ID为必填项' }, { status: 400 });
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

    // 添加记录
    const result = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO ExtraAwards (tournament_id, game_id, prize_id, prize_description, remark, awarded_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [tournamentId, game_id, prize_id, prize_description || null, remark || null, organizerId], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    return NextResponse.json({ message: '额外奖品添加成功', id: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding extra award:', error);
    return NextResponse.json({ message: error.message || '添加失败' }, { status: 500 });
  }
}