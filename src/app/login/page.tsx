'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gameId, setGameId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loginType, setLoginType] = useState('player'); // 'organizer' or 'player'
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
    <div className="flex min-h-screen flex-col items-center justify-start pt-12 bg-[#1A1A1A] text-[#F5F5F5]">
      <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[#B89766]">登录</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md p-8 bg-[#2A2A2A] rounded-lg shadow-lg border border-[#B89766]/50">
        {error && <p className="text-[#C83C23] text-center mb-4">{error}</p>}

        <div className="flex justify-center gap-8 mb-4 text-lg">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="organizer"
              checked={loginType === 'organizer'}
              onChange={() => setLoginType('organizer')}
              className="hidden"
            />
            <span className={`relative w-5 h-5 inline-block mr-2 rounded-full border-2 ${loginType === 'organizer' ? 'border-[#B89766]' : 'border-[#F5F5F5]'} flex-shrink-0`}>
              {loginType === 'organizer' && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#B89766] rounded-full"></span>}
            </span>
            <span className={`${loginType === 'organizer' ? 'text-[#B89766] font-bold' : 'text-[#F5F5F5]'}`}>主办方登录</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="player"
              checked={loginType === 'player'}
              onChange={() => setLoginType('player')}
              className="hidden"
            />
            <span className={`relative w-5 h-5 inline-block mr-2 rounded-full border-2 ${loginType === 'player' ? 'border-[#B89766]' : 'border-[#F5F5F5]'} flex-shrink-0`}>
              {loginType === 'player' && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#B89766] rounded-full"></span>}
            </span>
            <span className={`${loginType === 'player' ? 'text-[#B89766] font-bold' : 'text-[#F5F5F5]'}`}>玩家登录</span>
          </label>
        </div>

        {loginType === 'organizer' ? (
          <>
            <input
              type="text"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="p-3 border border-[#B89766]/50 rounded bg-[#1A1A1A] text-[#F5F5F5] placeholder-[#F5F5F5]/70 focus:ring-2 focus:ring-[#B89766] focus:outline-none"
              required
            />
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="p-3 border border-[#B89766]/50 rounded bg-[#1A1A1A] text-[#F5F5F5] placeholder-[#F5F5F5]/70 focus:ring-2 focus:ring-[#B89766] focus:outline-none"
              required
            />
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="游戏角色编号 (10位数字)"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="p-3 border border-[#B89766]/50 rounded bg-[#1A1A1A] text-[#F5F5F5] placeholder-[#F5F5F5]/70 focus:ring-2 focus:ring-[#B89766] focus:outline-none"
              maxLength={10}
              minLength={10}
            />
            <p className="text-center text-sm text-[#F5F5F5]/70">或</p>
            <input
              type="tel"
              placeholder="手机号"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="p-3 border border-[#B89766]/50 rounded bg-[#1A1A1A] text-[#F5F5F5] placeholder-[#F5F5F5]/70 focus:ring-2 focus:ring-[#B89766] focus:outline-none"
            />
          </>
        )}

        <button type="submit" className="p-3 bg-[#B89766] text-[#1A1A1A] rounded-lg font-bold hover:bg-[#A0855A] transition-colors duration-300 shadow-md">
          登录
        </button>
      </form>
      <p className="mt-6 text-lg">
        没有账号？ <a href="/register" className="text-[#B89766] hover:underline">点击此处注册</a>
      </p>
    </div>
  );
}
