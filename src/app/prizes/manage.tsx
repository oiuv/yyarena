'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Image from 'next/image';
import ConfirmationToast from '@/components/ConfirmationToast';

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

export default function ManagePrizesPage() {
  const [prizes, setPrizes] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const fetchPrizes = async () => {
    try {
      const res = await fetch('/api/prizes');
      if (res.ok) {
        const data = await res.json();
        setPrizes(data);
      } else {
        setMessage('Failed to fetch prizes.');
      }
    } catch (error) {
      setMessage('Error fetching prizes.');
    }
  };

  useEffect(() => {
    fetchPrizes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const token = getToken();
    if (!token) {
      setMessage('Unauthorized: Please log in as an organizer.');
      return;
    }

    try {
      const res = await fetch('/api/prizes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, image_url: imageUrl }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Prize created successfully!');
        setName('');
        setDescription('');
        setImageUrl('');
        fetchPrizes(); // Refresh the list
      } else {
        setMessage(data.error || 'Failed to create prize.');
      }
    } catch (error) {
      setMessage('Error creating prize.');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-4xl font-bold mb-8">管理奖品</h1>

      <div className="w-full max-w-2xl mb-8">
        <h2 className="text-2xl font-bold mb-4">创建新奖品</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            创建奖品
          </button>
        </form>
        {message && <p className="mt-4 text-lg">{message}</p>}
      </div>

      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">现有奖品</h2>
        {prizes.length === 0 ? (
          <p>未找到奖品。</p>
        ) : (
          <ul>
            {prizes.map((prize) => (
              <li key={prize.id} className="p-4 border rounded mb-2 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">{prize.name}</h3>
                  <p>{prize.description}</p>
                  {prize.image_url && <Image src={prize.image_url} alt={prize.name} width={96} height={96} className="w-24 h-24 object-cover mt-2" />}
                </div>
                <div>
                  <Link href={`/prizes/edit?id=${prize.id}`} className="text-blue-500 hover:underline mr-4">
                    编辑
                  </Link>
                  <button
                    onClick={() => {
                      toast.custom((t) => (
                        <ConfirmationToast
                          t={t}
                          message="确定要删除此奖品吗？删除后无法恢复。"
                          onConfirm={async () => {
                            const token = getToken();
                            if (!token) {
                              setMessage('未授权：请以主办方身份登录。');
                              return;
                            }

                            try {
                              const res = await fetch(`/api/prizes/prizeById?id=${prize.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` },
                              });
                              if (res.ok) {
                                toast.success('奖品删除成功！');
                                fetchPrizes();
                              } else {
                                const data = await res.json();
                                toast.error(data.error || '删除奖品失败。');
                              }
                            } catch (error) {
                              console.error('Error deleting prize:', error);
                              toast.error('删除奖品时发生错误。');
                            }
                          }}
                          onCancel={() => toast.dismiss(t.id)}
                        />
                      ));
                    }}
                    className="text-red-500 hover:underline"
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
