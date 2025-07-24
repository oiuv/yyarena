import { NextRequest, NextResponse } from 'next/server';
import { db, query } from '@/database.mjs';
import { jwtDecode } from 'jwt-decode';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;

export async function PUT(request: NextRequest) {
  const token = request.headers.get('Authorization')?.split(' ')[1];

  if (!token) {
    return NextResponse.json({ message: '未授权' }, { status: 401 });
  }

  let decodedToken: any;
  try {
    decodedToken = jwtDecode(token);
  } catch (e) {
    return NextResponse.json({ message: '无效的令牌' }, { status: 401 });
  }

  const userId = decodedToken.id;
  const { stream_url, avatar, username, password, role, currentPassword, newPassword } = await request.json();

  try {
    let updateFields = [];
    let updateValues = [];

    // Fetch the user from the database to get their current password hash
    const user: any = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM Users WHERE id = ?`, [userId], (err: Error | null, row: any) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!user) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 });
    }

    // Handle password change for organizers
    if (currentPassword && newPassword) {
      if (user.role !== 'organizer') {
        return NextResponse.json({ message: '只有主办方可以修改密码' }, { status: 403 });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ message: '当前密码不正确' }, { status: 401 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
    }

    // Check if the user is trying to upgrade to organizer
    if (role === 'organizer' && decodedToken.role === 'player') {
      if (!username || !password) {
        return NextResponse.json({ message: '升级为主办方需要提供用户名和密码' }, { status: 400 });
      }

      // Check if username already exists for another organizer
      const existingUser: any = await new Promise((resolve, reject) => {
        db.get(`SELECT id FROM Users WHERE username = ? AND role = 'organizer'`, [username], (err: Error | null, row: any) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json({ message: '该用户名已被占用' }, { status: 409 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('username = ?', 'password = ?', 'role = ?');
      updateValues.push(username, hashedPassword, 'organizer');
    }

    if (stream_url !== undefined) {
      updateFields.push('stream_url = ?');
      updateValues.push(stream_url);
    }
    if (avatar !== undefined) {
      updateFields.push('avatar = ?');
      updateValues.push(avatar);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ message: '没有提供更新字段' }, { status: 400 });
    }

    updateValues.push(userId);

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE Users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues,
        function (this: any, err: Error | null) {
          if (err) reject(err);
          resolve(this.changes);
        }
      );
    });

    // Re-fetch user to get updated data and generate new token
    const updatedUser: any = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM Users WHERE id = ?`, [userId], (err: Error | null, row: any) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!updatedUser) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 });
    }

    const newToken = jwt.sign(
      { 
        id: updatedUser.id,
        username: updatedUser.username,
        game_id: updatedUser.game_id,
        character_name: updatedUser.character_name,
        role: updatedUser.role, // Use the updated role from DB
        stream_url: updatedUser.stream_url,
        avatar: updatedUser.avatar
      },
      JWT_SECRET!,
      { expiresIn: '8h' }
    );

    const response = NextResponse.json({ message: '资料更新成功', token: newToken });
    response.cookies.set('token', newToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ message: error.message || '更新资料失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.split(' ')[1];

  if (!token) {
    return NextResponse.json({ message: '未授权' }, { status: 401 });
  }

  let decodedToken: any;
  try {
    decodedToken = jwtDecode(token);
  } catch (e) {
    return NextResponse.json({ message: '无效的令牌' }, { status: 401 });
  }

  const userId = decodedToken.id;

  try {
    const user: any = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM Users WHERE id = ?`, [userId], (err: Error | null, row: any) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!user) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 });
    }

    // Do not return password or other sensitive info
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ message: error.message || '获取资料失败' }, { status: 500 });
  }
}
