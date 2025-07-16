import { NextResponse } from 'next/server';
import db from '@/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; // Import jsonwebtoken

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key'; // Ensure this is defined

export async function POST(request: Request) {
  try {
    const { username, password, game_id, character_name, phone_number, role, stream_url } = await request.json();

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
          'INSERT INTO Users (username, password, game_id, character_name, phone_number, role, stream_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [username, hashedPassword, game_id, character_name, phone_number, role, stream_url],
          function (err) {
            if (err) {
              if (err.message.includes('UNIQUE constraint failed')) {
                reject(new Error('Username or Game ID or Character Name already exists'));
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
        db.get('SELECT * FROM Users WHERE game_id = ?', [game_id], (err, row) => {
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
              function (err) {
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
              function (err) {
                if (err) reject(err);
                resolve(this);
              }
            );
          });
        }
        user = { ...existingPlayer, character_name: existingPlayer.character_name || character_name, phone_number: existingPlayer.phone_number || phone_number };
      } else {
        // New player, insert new record
        if (!character_name) {
          return NextResponse.json({ message: '新玩家必须提供角色名称。' }, { status: 400 });
        }
        user = await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO Users (game_id, character_name, phone_number, role) VALUES (?, ?, ?, ?)',
            [game_id, character_name, phone_number, role],
            function (err) {
              if (err) reject(err);
              resolve({ id: this.lastID, game_id, character_name, phone_number, role });
            }
          );
        });
      }
    }

    // Generate JWT token and set as cookie
    const token = jwt.sign(
      { id: user.id, username: user.username, game_id: user.game_id, character_name: user.character_name, role: user.role, stream_url: user.stream_url },
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
