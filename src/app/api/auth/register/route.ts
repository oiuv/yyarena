import { NextResponse } from 'next/server';
const { db, query } = require('@/database.js');
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; // Import jsonwebtoken

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key'; // Ensure this is defined

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'; // Get client IP
    const currentTime = new Date().toISOString(); // Get current time in ISO format
    const { username, password, game_id, character_name, phone_number, role, stream_url, avatar } = await request.json();

    if (!role || !['organizer', 'player'].includes(role)) {
      return NextResponse.json({ message: 'Invalid or missing role' }, { status: 400 });
    }

    let user: any;

    if (role === 'organizer') {
      if (!username || !password || !game_id || !character_name) {
        return NextResponse.json({ message: 'Missing required fields for organizer' }, { status: 400 });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO Users (username, password, game_id, character_name, phone_number, role, stream_url, avatar, last_login_ip, last_login_time, login_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [username, hashedPassword, game_id, character_name, phone_number, role, stream_url, avatar || '000.webp', clientIp, currentTime, 1],
          function (this: any, err: Error | null) {
            if (err) {
              if (err.message.includes('UNIQUE constraint failed: Users.character_name')) {
                reject(new Error('角色名称已被占用'));
              } else if (err.message.includes('UNIQUE constraint failed: Users.username')) {
                reject(new Error('用户名已被占用'));
              } else if (err.message.includes('UNIQUE constraint failed: Users.game_id')) {
                reject(new Error('游戏ID已被占用'));
              } else {
                reject(err);
              }
            } else {
              resolve({ id: this.lastID, username, game_id, character_name, phone_number, role, stream_url });
            }
          }
        );
      });
    } else if (role === 'player') {
      if (!game_id) {
        return NextResponse.json({ message: 'Missing game_id for player' }, { status: 400 });
      }

      const existingPlayer: any = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM Users WHERE game_id = ?', [game_id], (err: Error | null, row: any) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (existingPlayer) {
        // Game ID exists, update character_name if provided and missing
        if (character_name && !existingPlayer.character_name) {
          await new Promise((resolve, reject) => {
            db.run(
              'UPDATE Users SET character_name = ? WHERE id = ?',
              [character_name, existingPlayer.id],
              function (this: any, err: Error | null) {
                if (err) reject(err);
                resolve(this);
              }
            );
          });
        }
        // Update phone_number if provided
        if (phone_number) {
          await new Promise((resolve, reject) => {
            db.run(
              'UPDATE Users SET phone_number = ? WHERE id = ?',
              [phone_number, existingPlayer.id],
              function (this: any, err: Error | null) {
                if (err) reject(err);
                resolve(this);
              }
            );
          });
        }
        // Update avatar if provided
        if (avatar) {
          await new Promise((resolve, reject) => {
            db.run(
              'UPDATE Users SET avatar = ? WHERE id = ?',
              [avatar, existingPlayer.id],
              function (this: any, err: Error | null) {
                if (err) reject(err);
                resolve(this);
              }
            );
          });
        }
        // Update login information for existing player
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE Users SET last_login_ip = ?, last_login_time = ?, login_count = login_count + 1 WHERE id = ?',
            [clientIp, currentTime, existingPlayer.id],
            function (this: any, err: Error | null) {
              if (err) reject(err);
              resolve(this);
            }
          );
        });
        user = { ...existingPlayer, character_name: existingPlayer.character_name || character_name, phone_number: existingPlayer.phone_number || phone_number, avatar: existingPlayer.avatar || avatar };
      } else {
        // New player, insert new record
        if (!character_name) {
          return NextResponse.json({ message: '新玩家必须提供角色名称。' }, { status: 400 });
        }
        user = await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO Users (game_id, character_name, phone_number, role, avatar, last_login_ip, last_login_time, login_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [game_id, character_name, phone_number, role, avatar || '000.webp', clientIp, currentTime, 1],
            function (this: any, err: Error | null) {
              if (err) {
                if (err.message.includes('UNIQUE constraint failed: Users.character_name')) {
                  reject(new Error('角色名称已被占用'));
                } else {
                  reject(err);
                }
              } else {
                resolve({ id: this.lastID, game_id, character_name, phone_number, role, avatar: avatar || '000.webp' });
              }
            }
          );
        });
      }
    }

    // Generate JWT token and set as cookie
    const token = jwt.sign(
      { id: user.id, username: user.username, game_id: user.game_id, character_name: user.character_name, role: user.role, stream_url: user.stream_url, avatar: user.avatar },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const response = NextResponse.json({ message: 'Registration successful!', user, token }, { status: 201 });
    response.cookies.set('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    return response;
  } catch (error: any) {
    const status = error.message === 'Username already exists' ? 409 : 500;
    return NextResponse.json({ message: error.message }, { status });
  }
}
