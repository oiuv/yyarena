import { NextRequest, NextResponse } from 'next/server';
import db from '@/database.js';
import { jwtDecode } from 'jwt-decode';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = parseInt(params.id, 10);

  if (isNaN(tournamentId)) {
    return NextResponse.json({ message: '无效的比赛ID' }, { status: 400 });
  }

  try {
    const tournament: any = await new Promise((resolve, reject) => {
      db.get(
        `SELECT T.*, U.stream_url AS organizer_stream_url, U.character_name AS organizer_character_name, U.avatar AS organizer_avatar
         FROM Tournaments T
         JOIN Users U ON T.organizer_id = U.id
         WHERE T.id = ?`,
        [tournamentId],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });

    if (!tournament) {
      return NextResponse.json({ message: '比赛不存在' }, { status: 404 });
    }

    console.log('Tournament start_time from DB:', tournament.start_time);
    console.log('Tournament registration_deadline from DB:', tournament.registration_deadline);

    // Parse prize_settings and fetch prize details
    let parsedPrizes = [];
    if (tournament.prize_settings) {
      let prizeSettings;
      try {
        prizeSettings = JSON.parse(tournament.prize_settings);
        // Ensure prizeSettings is an array before iterating
        if (!Array.isArray(prizeSettings)) {
          prizeSettings = [];
        }
      } catch (parseError) {
        console.error('Error parsing prize_settings:', parseError);
        prizeSettings = []; // Default to empty array on parse error
      }
      for (const setting of prizeSettings) {
        if (setting.prize_id) {
          const prizeDetail: any = await new Promise((resolve, reject) => {
            db.get('SELECT name, description FROM Prizes WHERE id = ?', [setting.prize_id], (err, row) => {
              if (err) reject(err);
              resolve(row);
            });
          });
          if (prizeDetail) {
            parsedPrizes.push({ ...setting, prize_name: prizeDetail.name, prize_description: prizeDetail.description });
          }
        } else if (setting.custom_prize_name) {
          parsedPrizes.push(setting);
        }
      }
    }
    tournament.prizes = parsedPrizes;

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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = parseInt(params.id, 10);
  const { name, start_time, registration_deadline, min_players, max_players, event_description, wechat_qr_code_url, room_name, room_number, room_password, livestream_url, registration_code } = await request.json();

  if (isNaN(tournamentId)) {
    return NextResponse.json({ message: '无效的比赛ID' }, { status: 400 });
  }

  const token = request.headers.get('Authorization')?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ message: '未授权' }, { status: 401 });
  }

  let currentUser: any;
  try {
    currentUser = jwtDecode(token);
  } catch (e) {
    return NextResponse.json({ message: '无效的令牌' }, { status: 401 });
  }

  try {
    const existingTournament: any = await new Promise((resolve, reject) => {
      db.get('SELECT organizer_id FROM Tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!existingTournament || existingTournament.organizer_id !== currentUser.id) {
      return NextResponse.json({ message: '无权修改此比赛' }, { status: 403 });
    }

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE Tournaments SET
           name = ?,
           start_time = ?,
           registration_deadline = ?,
           min_players = ?,
           max_players = ?,
           event_description = ?,
           wechat_qr_code_url = ?,
           room_name = ?,
           room_number = ?,
           room_password = ?,
           livestream_url = ?,
           registration_code = ?
         WHERE id = ?`,
        [name, start_time, registration_deadline, min_players, max_players, event_description, wechat_qr_code_url, room_name, room_number, room_password, livestream_url, registration_code, tournamentId],
        function (err) {
          if (err) reject(err);
          resolve(this.changes);
        }
      );
    });

    return NextResponse.json({ message: '比赛更新成功' });
  } catch (error: any) {
    console.error('Error updating tournament:', error);
    return NextResponse.json({ message: error.message || '更新比赛失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({ message: '不允许删除比赛' }, { status: 403 });
}
