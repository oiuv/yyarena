'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

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

export default function EditPrizePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prizeId = searchParams.get('id');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!prizeId) {
      setError('奖品ID缺失。');
      setLoading(false);
      return;
    }

    const fetchPrize = async () => {
      const token = getToken();
      if (!token) {
        setError('未授权：请以主办方身份登录。');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/prizes/prizeById?id=${prizeId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setName(data.name);
          setDescription(data.description);
          setImageUrl(data.image_url);
        } else {
          const data = await res.json();
          setError(data.error || '获取奖品详情失败。');
        }
      } catch (err: any) {
        setError(err.message || '获取奖品详情时发生错误。');
      } finally {
        setLoading(false);
      }
    };

    fetchPrize();
  }, [prizeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const token = getToken();
    if (!token) {
      setMessage('未授权：请以主办方身份登录。');
      return;
    }

    try {
      const res = await fetch(`/api/prizes/prizeById?id=${prizeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, image_url: imageUrl }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || '奖品更新成功！');
        router.push('/prizes/manage'); // Redirect back to manage page
      } else {
        setMessage(data.error || '更新奖品失败。');
      }
    } catch (error) {
      setMessage('更新奖品时发生错误。');
    }
  };

  if (loading) {
    return <main className="flex min-h-screen flex-col items-center p-24"><p>正在加载奖品详情...</p></main>;
  }

  if (error) {
    return <main className="flex min-h-screen flex-col items-center p-24"><p className="text-red-500">错误: {error}</p></main>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-4xl font-bold mb-8">编辑奖品</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">
        <input
          type="text"
          placeholder="奖品名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-2 border rounded text-black"
          required
        />
        <textarea
          placeholder="描述"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="p-2 border rounded text-black"
        />
        <input
          type="text"
          placeholder="图片URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="p-2 border rounded text-black"
        />
        <button type="submit" className="p-2 bg-blue-500 text-white rounded">
          更新奖品
        </button>
      </form>
      {message && <p className="mt-4 text-lg">{message}</p>}
    </main>
  );
}
