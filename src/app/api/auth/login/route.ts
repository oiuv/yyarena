import { NextResponse } from 'next/server';
import db from '@/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key'; // It's better to use an environment variable for the secret

export async function POST(request: Request) {
  try {
    const { username, password, game_id, phone_number } = await request.json();
    let user: any = null;

    if (username && password) {
      // Attempt to log in as organizer
      user = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM Users WHERE username = ? AND role = 'organizer'`, [username], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!user) {
        return NextResponse.json({ message: '账号不存在' }, { status: 401 });
      }

      if (!(await bcrypt.compare(password, user.password))) {
        return NextResponse.json({ message: '密码不正确' }, { status: 401 });
      }
    } else if (game_id) {
      // Attempt to log in as player using game_id
      user = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM Users WHERE game_id = ?`, [game_id], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });
      if (!user) {
        return NextResponse.json({ message: '玩家角色编号不存在' }, { status: 401 });
      }
      if (user && user.role === 'organizer') {
        return NextResponse.json({ message: '主办方请使用账号密码登录' }, { status: 403 });
      }
    } else if (phone_number) {
      // Attempt to log in as player using phone_number
      user = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM Users WHERE phone_number = ?`, [phone_number], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });
      if (!user) {
        return NextResponse.json({ message: '手机号不存在' }, { status: 401 });
      }
      if (user && user.role === 'organizer') {
        return NextResponse.json({ message: '主办方请使用账号密码登录' }, { status: 403 });
      }
    }

    let tokenRole = user.role;
    // If logging in via game_id or phone_number, the token role should always be 'player'
    if (game_id || phone_number) {
      tokenRole = 'player';
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, game_id: user.game_id, character_name: user.character_name, role: tokenRole, stream_url: user.stream_url, avatar: user.avatar },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const response = NextResponse.json({ message: 'Logged in successfully', role: user.role, username: user.username, game_id: user.game_id, token });
    response.cookies.set('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
