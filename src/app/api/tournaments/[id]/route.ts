import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { jwtDecode } from 'jwt-decode';
import { db, query } from '@/database.mjs';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const tournamentId = parseInt(params.id, 10);

  if (isNaN(tournamentId)) {
    return NextResponse.json({ message: '无效的比赛ID' }, { status: 400 });
  }

  try {
    const tournament: any = await new Promise((resolve, reject) => {
      db.get(
        `SELECT T.*, U.stream_url AS organizer_stream_url, U.character_name AS organizer_character_name, U.avatar AS organizer_avatar,
                CAST(COUNT(CASE WHEN r.status != 'withdrawn' THEN r.id ELSE NULL END) AS INTEGER) as registeredPlayersCount
         FROM Tournaments T
         JOIN Users U ON T.organizer_id = U.id
         LEFT JOIN Registrations r ON T.id = r.tournament_id
         WHERE T.id = ?
         GROUP BY T.id`,
        [tournamentId],
        (err: Error | null, row: any) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });

    if (!tournament) {
      return NextResponse.json({ message: '比赛不存在' }, { status: 404 });
    }

    // Increment view_count
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE Tournaments SET view_count = view_count + 1 WHERE id = ?`,
        [tournamentId],
        function (this: any, err: Error | null) {
          if (err) { 
            console.error('Error incrementing view_count:', err); // 添加错误日志
            reject(err);
          } else {
            console.log(`Tournament ID ${tournamentId} view_count incremented. Current changes: ${this.changes}`); // 添加成功日志
            resolve(this);
          }
        }
      );
    });

    console.log('Tournament start_time from DB:', tournament.start_time);
    console.log('Tournament registration_deadline from DB:', tournament.registration_deadline);

    // Parse prize_settings and fetch prize details
    let parsedPrizes: any[] = [];
    if (tournament.prize_settings) {
      let prizeSettings;
      try {
        prizeSettings = JSON.parse(tournament.prize_settings);
      } catch (parseError) {
        console.error('Error parsing prize_settings:', parseError);
        prizeSettings = {}; // Default to empty object on parse error
      }

      const processPrize = async (setting: any, rankStart: number | null = null, rankEnd: number | null = null, isParticipation: boolean = false) => {
        console.log(`Processing prize: ${JSON.stringify(setting)}, rankStart: ${rankStart}, rankEnd: ${rankEnd}, isParticipation: ${isParticipation}`);
        let prizeData: any = {}; // Start with an empty object to build prizeData
        prizeData.rank_start = rankStart;
        prizeData.rank_end = rankEnd;

        // Prioritize customName for custom prizes, or set "参与奖" for participation
        if (setting.customName) {
          prizeData.custom_prize_name = setting.customName;
        } else if (isParticipation) {
          prizeData.custom_prize_name = "参与奖";
        }

        // Fetch prize details if prizeId is present
        if (setting.prizeId) {
          const prizeDetail: any = await new Promise((resolve, reject) => {
            db.get('SELECT name, description FROM Prizes WHERE id = ?', [setting.prizeId], (err: Error | null, row: any) => {
              if (err) reject(err);
              resolve(row);
            });
          });
          if (prizeDetail) {
            prizeData.prize_name = prizeDetail.name;
            prizeData.prize_description = prizeDetail.description;
          }
        }
        prizeData.quantity = setting.quantity; // Ensure quantity is always included
        parsedPrizes.push(prizeData);
      };

      if (prizeSettings.ranked && Array.isArray(prizeSettings.ranked)) {
        for (const prize of prizeSettings.ranked) {
          await processPrize(prize, prize.rank, prize.rank);
        }
      }

      if (prizeSettings.participation) {
        await processPrize(prizeSettings.participation, null, null, true); // Participation prize has no specific rank range
      }

      if (prizeSettings.custom && Array.isArray(prizeSettings.custom)) {
        for (const prize of prizeSettings.custom) {
          await processPrize(prize, prize.rangeStart, prize.rangeEnd);
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
      db.get('SELECT organizer_id, status, wechat_qr_code_url, cover_image_url FROM Tournaments WHERE id = ?', [tournamentId], (err: Error | null, row: any) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    console.log('Existing tournament data:', existingTournament);

    if (!existingTournament || existingTournament.organizer_id !== currentUser.id) {
      return NextResponse.json({ message: '无权修改此比赛' }, { status: 403 });
    }

    if (existingTournament.status === 'ongoing' || existingTournament.status === 'finished') {
      return NextResponse.json({ message: '比赛已开始或已结束，无法编辑' }, { status: 403 });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const start_time = formData.get('start_time') as string;
    const registration_deadline = formData.get('registration_deadline') as string;
    const min_players = parseInt(formData.get('min_players') as string, 10);
    const max_players = parseInt(formData.get('max_players') as string, 10);
    const event_description = formData.get('event_description') as string;
    const default_match_format = formData.get('default_match_format') as string;
    const registration_code = formData.get('registration_code') as string;

    if (min_players < 10) {
      return NextResponse.json({ message: '最少参赛人数不得少于10人。' }, { status: 400 });
    }
    if (max_players > 48) {
      return NextResponse.json({ message: '最大参赛人数不得超过48人。' }, { status: 400 });
    }

    let wechat_qr_code_url = formData.get('wechat_qr_code_url') as string | null;
    let cover_image_url = formData.get('cover_image_url') as string | null;

    const wechatQrCodeFile = formData.get('wechat_qr_code_image') as File | null;
    if (wechatQrCodeFile && wechatQrCodeFile.size > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'qrcodes');
      await fs.mkdir(uploadDir, { recursive: true });
      const uniqueFilename = `${uuidv4()}${path.extname(wechatQrCodeFile.name)}`;
      const filePath = path.join(uploadDir, uniqueFilename);
      await fs.writeFile(filePath, Buffer.from(await wechatQrCodeFile.arrayBuffer()));
      wechat_qr_code_url = `/uploads/qrcodes/${uniqueFilename}`;
    }

    const coverImageFile = formData.get('cover_image') as File | null;
    if (coverImageFile && coverImageFile.size > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'covers');
      await fs.mkdir(uploadDir, { recursive: true });
      const uniqueFilename = `${uuidv4()}${path.extname(coverImageFile.name)}`;
      const filePath = path.join(uploadDir, uniqueFilename);
      await fs.writeFile(filePath, Buffer.from(await coverImageFile.arrayBuffer()));
      cover_image_url = `/uploads/covers/${uniqueFilename}`;
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
           cover_image_url = ?,
           default_match_format = ?,
           registration_code = ?
         WHERE id = ?`,
        [
          name,
          start_time,
          registration_deadline,
          min_players,
          max_players,
          event_description,
          wechat_qr_code_url,
          cover_image_url,
          default_match_format,
          registration_code,
          tournamentId,
        ],
        function (this: any, err: Error | null) {
          if (err) reject(err);
          resolve(this.changes);
        }
      );
    });

    return NextResponse.json({ message: '比赛更新成功' });
  } catch (error: any) {
    console.error('Error updating tournament:', error);
    return NextResponse.json({ message: error.message || '更新失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({ message: '不允许删除比赛' }, { status: 403 });
}