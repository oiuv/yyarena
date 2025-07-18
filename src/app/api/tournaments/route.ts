import { NextRequest, NextResponse } from 'next/server';
import db from '@/database.js';
import { verifyToken } from '../../../utils/auth';
import fs from 'fs/promises';
import path from 'path';

// GET all tournaments
export async function GET() {
  try {
    const tournaments: any[] = await new Promise((resolve, reject) => {
      db.all(`
        SELECT t.*, u.username as organizerUsername, u.character_name as organizerCharacterName, u.avatar as organizerAvatar, CAST(COUNT(r.id) AS INTEGER) as registeredPlayersCount
        FROM Tournaments t
        LEFT JOIN Registrations r ON t.id = r.tournament_id
        LEFT JOIN Users u ON t.organizer_id = u.id
        GROUP BY t.id
        ORDER BY t.start_time DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else {
          const tournamentsWithParsedPrizes = rows.map((row: any) => {
            if (typeof row !== 'object' || row === null) {
              return row; // Return as is if not a valid object
            }
            return {
              ...row,
              prize_settings: row.prize_settings ? JSON.parse(row.prize_settings) : null,
            };
          });
          resolve(tournamentsWithParsedPrizes);
        }
      });
    });
    return NextResponse.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json({ message: '获取比赛列表失败' }, { status: 500 });
  }
}

// POST a new tournament
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const startTime = formData.get('start_time') as string;
  const registrationDeadline = (formData.get('registration_deadline') as string) || startTime;
  const minPlayers = parseInt(formData.get('min_players') as string, 10);
  const maxPlayers = parseInt(formData.get('max_players') as string, 10);
  const eventDescription = formData.get('event_description') as string;
  const prizeSettings = formData.get('prize_settings') as string;
  const wechatQrCodeFile = formData.get('wechat_qr_code_image') as File | null;
  const coverImageFile = formData.get('cover_image') as File | null; // Get cover image file
  const defaultMatchFormat = formData.get('default_match_format') as string; // Get default match format
  const registrationCode = formData.get('registration_code') as string; // Get registration code

  if (minPlayers < 10) {
    return NextResponse.json({ message: '最少参赛人数不得少于10人。' }, { status: 400 });
  }
  if (maxPlayers > 48) {
    return NextResponse.json({ message: '最大参赛人数不得超过48人。' }, { status: 400 });
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

  let wechatQrCodeUrl = null;
  if (wechatQrCodeFile) {
    try {
      const fileBuffer = Buffer.from(await wechatQrCodeFile.arrayBuffer());
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'qrcodes');
      await fs.mkdir(uploadDir, { recursive: true });
      const filename = `${Date.now()}-${wechatQrCodeFile.name}`;
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, fileBuffer);
      wechatQrCodeUrl = `/uploads/qrcodes/${filename}`;
    } catch (error) {
      console.error('Error saving QR code image:', error);
      return NextResponse.json({ message: '二维码图片保存失败' }, { status: 500 });
    }
  }

  let coverImageUrl = '/images/default_cover.jpg'; // Default cover image
  if (coverImageFile) {
    try {
      const fileBuffer = Buffer.from(await coverImageFile.arrayBuffer());
      const uploadDir = path.join(process.cwd(), 'public', 'tournament_covers');
      await fs.mkdir(uploadDir, { recursive: true });
      const filename = `${Date.now()}-${coverImageFile.name}`;
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, fileBuffer);
      coverImageUrl = `/tournament_covers/${filename}`;
    } catch (error) {
      console.error('Error saving cover image:', error);
      return NextResponse.json({ message: '封面图片保存失败' }, { status: 500 });
    }
  }

  try {
    const result: any = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO Tournaments (name, organizer_id, start_time, registration_deadline, min_players, max_players, prize_settings, event_description, wechat_qr_code_url, status, default_match_format, cover_image_url, registration_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, organizerId, startTime, registrationDeadline, minPlayers, maxPlayers, prizeSettings, eventDescription, wechatQrCodeUrl, 'pending', defaultMatchFormat, coverImageUrl, registrationCode],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tournament:', error);
    return NextResponse.json({ message: error.message || '创建比赛失败' }, { status: 500 });
  }
}
