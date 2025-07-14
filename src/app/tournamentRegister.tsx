'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function getToken() {
  const name = 'token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
}

export default function TournamentRegisterPage() {
  const router = useRouter();
  const [tournamentId, setTournamentId] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [characterId, setCharacterId] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const token = getToken();

    if (!token) {
      setMessage('请登录后报名比赛。');
      return;
    }

    const res = await fetch('/api/tournaments/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        tournament_id: parseInt(tournamentId),
        character_name: characterName,
        character_id: characterId,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage(data.message || '报名成功！');
      // Optionally redirect or clear form
      setTournamentId('');
      setCharacterName('');
      setCharacterId('');
    } else {
      setMessage(data.error || '报名失败。');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-4xl font-bold mb-8">报名比赛</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">
        <input
          type="number"
          placeholder="比赛ID"
          value={tournamentId}
          onChange={(e) => setTournamentId(e.target.value)}
          className="p-2 border rounded text-black"
          required
        />
        <input
          type="text"
          placeholder="角色名称"
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
          className="p-2 border rounded text-black"
          required
        />
        <input
          type="text"
          placeholder="10位游戏ID"
          value={characterId}
          onChange={(e) => setCharacterId(e.target.value)}
          className="p-2 border rounded text-black"
          maxLength={10}
          minLength={10}
          required
        />
        <button type="submit" className="p-2 bg-blue-500 text-white rounded">
          报名
        </button>
      </form>
      {message && <p className="mt-4 text-lg">{message}</p>}
    </main>
  );
}
