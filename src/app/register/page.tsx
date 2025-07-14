'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gameId, setGameId] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [streamUrl, setStreamUrl] = useState(''); // New state for stream URL
  const [role, setRole] = useState('player'); // Default role
  const [error, setError] = useState('');
  const [characterNameInputError, setCharacterNameInputError] = useState(''); // New state for character name input error
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCharacterNameInputError(''); // Clear character name input error on submit

    if (role === 'player' && !/^[\u4e00-\u9fa5]+$/.test(characterName)) {
      setError('角色名称必须全部为中文汉字。');
      return;
    }

    let body = {};
    if (role === 'organizer') {
      body = { username, password, game_id: gameId, character_name: characterName, phone_number: phoneNumber, role, stream_url: streamUrl };
    } else if (role === 'player') {
      body = { game_id: gameId, character_name: characterName, phone_number: phoneNumber, role };
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        window.location.href = '/'; // Redirect to home page after successful registration
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">注册</h1>
      <p className="text-center text-sm text-gray-600 mb-4">
        请务必如实填写您在燕云十六声游戏中的角色ID和角色名称。报名成功后，您必须使用报名的角色参加比赛，所有奖品也将只发放至对应ID的角色。
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">
        {error && <p className="text-red-500 text-center">{error}</p>}
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="p-2 border rounded text-black mb-4"
        >
          <option value="player">玩家</option>
          <option value="organizer">主办方</option>
        </select>

        {role === 'organizer' ? (
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
            <input
              type="text"
              placeholder="燕云十六声角色编号 (10位数字UID)"
              value={gameId}
              onChange={(e) => {
                const value = e.target.value;
                if (/^\d*$/.test(value)) {
                  setGameId(value);
                }
              }}
              className="p-2 border rounded text-black"
              maxLength={10}
              minLength={10}
              required
            />
            <input
              type="text"
              placeholder="燕云十六声角色名称"
              value={characterName}
              onChange={(e) => {
                setCharacterName(e.target.value);
                if (!/^[\u4e00-\u9fa5]*$/.test(e.target.value)) {
                  setCharacterNameInputError('角色名称只能包含中文汉字。');
                } else {
                  setCharacterNameInputError('');
                }
              }}
              className="p-2 border rounded text-black"
              required
            />
            {characterNameInputError && <p className="text-red-500 text-sm">{characterNameInputError}</p>}
            <input
              type="url"
              placeholder="直播间/主页地址 (可选)"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              className="p-2 border rounded text-black"
            />
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="燕云十六声角色编号 (10位数字UID)"
              value={gameId}
              onChange={(e) => {
                const value = e.target.value;
                if (/^\d*$/.test(value)) { // Only allow digits
                  setGameId(value);
                }
              }}
              className="p-2 border rounded text-black"
              maxLength={10}
              minLength={10}
              required
            />
            <input
              type="text"
              placeholder="燕云十六声角色名称"
              value={characterName}
              onChange={(e) => {
                setCharacterName(e.target.value);
                if (!/^[\u4e00-\u9fa5]*$/.test(e.target.value)) {
                  setCharacterNameInputError('角色名称只能包含中文汉字。');
                } else {
                  setCharacterNameInputError('');
                }
              }}
              className="p-2 border rounded text-black"
              required // Make character name required
            />
            {characterNameInputError && <p className="text-red-500 text-sm">{characterNameInputError}</p>}
            <input
              type="tel"
              placeholder="手机号 (可选)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="p-2 border rounded text-black"
            />
          </>
        )}

        <button type="submit" className="p-2 bg-blue-500 text-white rounded">
          注册
        </button>
      </form>
      <p className="mt-4">
        已有账号？ <a href="/login" className="text-blue-500">点击此处登录</a>
      </p>
    </div>
  );
}

