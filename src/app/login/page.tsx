'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gameId, setGameId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loginType, setLoginType] = useState('organizer'); // 'organizer' or 'player'
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let body = {};
    if (loginType === 'organizer') {
      body = { username, password };
    } else if (loginType === 'player') {
      if (gameId) {
        body = { game_id: gameId };
      } else if (phoneNumber) {
        body = { phone_number: phoneNumber };
      } else {
        setError('Please enter Game ID or Phone Number for player login.');
        return;
      }
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        window.location.href = '/'; // Force full page reload to update layout state
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">登录</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">
        {error && <p className="text-red-500 text-center">{error}</p>}

        <div className="flex justify-center gap-4 mb-4">
          <label>
            <input
              type="radio"
              value="organizer"
              checked={loginType === 'organizer'}
              onChange={() => setLoginType('organizer')}
              className="mr-2"
            />
            主办方登录
          </label>
          <label>
            <input
              type="radio"
              value="player"
              checked={loginType === 'player'}
              onChange={() => setLoginType('player')}
              className="mr-2"
            />
            玩家登录
          </label>
        </div>

        {loginType === 'organizer' ? (
          <>
            <input
              type="text"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="p-2 border rounded text-black"
              required
            />
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="p-2 border rounded text-black"
              required
            />
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="游戏ID (10位数字)"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="p-2 border rounded text-black"
              maxLength={10}
              minLength={10}
            />
            <p className="text-center text-sm text-gray-400">或</p>
            <input
              type="tel"
              placeholder="手机号"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="p-2 border rounded text-black"
            />
          </>
        )}

        <button type="submit" className="p-2 bg-blue-500 text-white rounded">
          登录
        </button>
      </form>
      <p className="mt-4">
        没有账号？ <a href="/register" className="text-blue-500">点击此处注册</a>
      </p>
    </div>
  );
}
