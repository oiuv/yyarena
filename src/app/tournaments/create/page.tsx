'use client';

import { useState, useEffect } from 'react';
import { getToken } from '@/utils/clientAuth';
import { useRouter } from 'next/navigation';

  export default function CreateTournamentPage() {
  const router = useRouter();
  const [prizes, setPrizes] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [minPlayers, setMinPlayers] = useState(10);
  const [maxPlayers, setMaxPlayers] = useState(48);
  const [eventDescription, setEventDescription] = useState('');
  const [wechatQrCodeFile, setWechatQrCodeFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null); // New state for cover image file
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [defaultMatchFormat, setDefaultMatchFormat] = useState<string>('1局1胜'); // New state for default match format
  const [registrationCode, setRegistrationCode] = useState(''); // New state for registration code

  const [rankedPrizes, setRankedPrizes] = useState<{ rank: number; prizeId: string; quantity: number }[]>([
    { rank: 1, prizeId: '', quantity: 1 },
    { rank: 2, prizeId: '', quantity: 1 },
    { rank: 3, prizeId: '', quantity: 1 },
    { rank: 4, prizeId: '', quantity: 1 },
    { rank: 5, prizeId: '', quantity: 1 },
  ]);
  const [participationPrize, setParticipationPrize] = useState<{ prizeId: string; quantity: number }>({ prizeId: '', quantity: 1 });
  const [customPrizes, setCustomPrizes] = useState<{ customName: string; rangeStart: number; rangeEnd: number; prizeId: string; quantity: number }[]>([]);

  useEffect(() => {
    const fetchPrizes = async () => {
      try {
        const prizesRes = await fetch('/api/prizes');
        const prizesData = await prizesRes.json();
        setPrizes(prizesData);
      } catch (error) {
        console.error('Error fetching prizes:', error);
      }
    };
    fetchPrizes();
  }, []);

  const handleAddCustomPrize = () => {
    setCustomPrizes([...customPrizes, { customName: '', rangeStart: 0, rangeEnd: 0, prizeId: '', quantity: 1 }]);
  };

  const handleRemoveCustomPrize = (index: number) => {
    setCustomPrizes(customPrizes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      alert('请登录后创建比赛。');
      return;
    }

    // Validation
    const startDateTime = new Date(startTime);
    const now = new Date();

    if (startDateTime < now) {
      alert('比赛开始时间不能是过去的时间。');
      return;
    }

    const registrationDeadlineDateTime = registrationDeadline ? new Date(registrationDeadline) : null;

    if (registrationDeadlineDateTime && registrationDeadlineDateTime > startDateTime) {
      alert('报名截止时间不得大于比赛开始时间。');
      return;
    }

    // No longer require minPlayers and maxPlayers to be even, as per new requirements.

    const formData = new FormData();
    formData.append('name', name);
    formData.append('start_time', new Date(startTime).toISOString());
    formData.append('registration_deadline', registrationDeadline ? new Date(registrationDeadline).toISOString() : new Date(startTime).toISOString());
    formData.append('min_players', String(minPlayers));
    formData.append('max_players', String(maxPlayers));
    formData.append('event_description', eventDescription);
    if (wechatQrCodeFile) {
      formData.append('wechat_qr_code_image', wechatQrCodeFile);
    }
    if (coverImageFile) {
      formData.append('cover_image', coverImageFile);
    }
    formData.append('default_match_format', defaultMatchFormat); // Add default match format
    if (registrationCode) {
      formData.append('registration_code', registrationCode);
    }

    const prize_settings = {
      ranked: rankedPrizes.filter(p => p.prizeId).map(p => ({ ...p, prize_id: parseInt(p.prizeId) })),
      participation: participationPrize.prizeId ? { ...participationPrize, prize_id: parseInt(participationPrize.prizeId) } : null,
      custom: customPrizes.filter(p => p.prizeId).map(p => ({ ...p, prize_id: parseInt(p.prizeId) })),
    };
    formData.append('prize_settings', JSON.stringify(prize_settings));

    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const newTournament = await res.json();
        router.push(`/tournaments/details?id=${newTournament.id}`);
      } else {
        const errorData = await res.json();
        alert(`创建比赛失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('提交时发生网络错误。');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-6 lg:p-12 bg-gray-900 text-white">
      <div className="w-full max-w-full md:max-w-2xl p-4 md:p-6 bg-gray-800 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-bold mb-4 text-center">创建比赛</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label htmlFor="name" className="block text-white text-sm font-bold mb-2">
            比赛名称:
          </label>
          <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="p-2 border rounded bg-gray-700 text-white w-full" placeholder="例如：燕云十六声第一届比武大会" required />

          <label htmlFor="startTime" className="block text-white text-sm font-bold mb-2">
            比赛开始时间:
          </label>
          <input type="datetime-local" id="startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="p-2 border rounded bg-gray-700 text-white w-full" required />

          <label htmlFor="registrationDeadline" className="block text-white text-sm font-bold mb-2">
            报名截止时间 (可选):
          </label>
          <input type="datetime-local" id="registrationDeadline" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} className="p-2 border rounded bg-gray-700 text-white w-full" />

          <label htmlFor="minPlayers" className="block text-white text-sm font-bold mb-2">
            最少参赛人数:
          </label>
          <input type="number" id="minPlayers" value={minPlayers} onChange={(e) => setMinPlayers(parseInt(e.target.value))} className="p-2 border rounded bg-gray-700 text-white w-full" required />

          <label htmlFor="maxPlayers" className="block text-white text-sm font-bold mb-2">
            最多参赛人数:
          </label>
          <input type="number" id="maxPlayers" value={maxPlayers} onChange={(e) => setMaxPlayers(parseInt(e.target.value))} className="p-2 border rounded bg-gray-700 text-white w-full" required />

          <label htmlFor="eventDescription" className="block text-white text-sm font-bold mb-2">
            赛事说明:
          </label>
          <textarea id="eventDescription" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} className="p-2 border rounded bg-gray-700 text-white w-full" rows={5} placeholder="例如:

1. 请提前5分钟进入比赛房间，房间ID在比赛开始时在本页面公示。
2. 对阵图在比赛开始时由系统自动生成，请关注本页了解自己对阵信息。
3. 本次比赛解释权归主办方所有." required />
          <label className="block text-white text-sm font-bold mb-2">
            微信群二维码 (可选):
          </label>
          <input type="file" accept="image/*" onChange={(e) => setWechatQrCodeFile(e.target.files ? e.target.files[0] : null)} className="p-2 border rounded bg-gray-700 text-white w-full" />

          <label className="block text-white text-sm font-bold mb-2">
            比赛封面图 (可选):
          </label>
          <input type="file" accept="image/*" onChange={(e) => setCoverImageFile(e.target.files ? e.target.files[0] : null)} className="p-2 border rounded bg-gray-700 text-white w-full" />

          <label htmlFor="registrationCode" className="block text-white text-sm font-bold mb-2">
            参赛验证码 (可选):
          </label>
          <input type="text" id="registrationCode" value={registrationCode} onChange={(e) => setRegistrationCode(e.target.value)} className="p-2 border rounded bg-gray-700 text-white w-full" placeholder="用于非公开比赛，如内部赛" />
          
          <label className="block text-white text-sm font-bold mb-2">
            默认比赛赛制:
          </label>
          <select
            className="p-2 border rounded bg-gray-700 text-white w-full"
            value={defaultMatchFormat}
            onChange={(e) => setDefaultMatchFormat(e.target.value)}
          >
            <option value="1局1胜">1局1胜</option>
            <option value="3局2胜">3局2胜</option>
            <option value="5局3胜">5局3胜</option>
          </select>

          <h3 className="text-xl font-bold mb-2 mt-4 text-center">奖品设置</h3>
          {rankedPrizes.map((rp, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <span className="w-full sm:w-auto">第 {rp.rank} 名:</span>
              <select value={rp.prizeId} onChange={(e) => setRankedPrizes(rankedPrizes.map((p, i) => i === index ? { ...p, prizeId: e.target.value } : p))} className="p-2 border rounded bg-gray-700 text-white flex-grow w-full">
                <option value="">无奖品</option>
                {prizes.map(prize => <option key={prize.id} value={prize.id}>{prize.name}</option>)}
              </select>
              <input type="number" min="1" value={rp.quantity} onChange={(e) => setRankedPrizes(rankedPrizes.map((p, i) => i === index ? { ...p, quantity: parseInt(e.target.value) } : p))} className="p-2 w-full sm:w-20 border rounded bg-gray-700 text-white" />
            </div>
          ))}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center mt-2">
            <span className="w-full sm:w-auto">参与奖:</span>
            <select value={participationPrize.prizeId} onChange={(e) => setParticipationPrize({ ...participationPrize, prizeId: e.target.value })} className="p-2 border rounded bg-gray-700 text-white flex-grow w-full">
              <option value="">无奖品</option>
              {prizes.map(prize => <option key={prize.id} value={prize.id}>{prize.name}</option>)}
            </select>
            <input type="number" min="1" value={participationPrize.quantity} onChange={(e) => setParticipationPrize({ ...participationPrize, quantity: parseInt(e.target.value) })} className="p-2 w-full sm:w-20 border rounded bg-gray-700 text-white" />
          </div>
          {customPrizes.map((cp, index) => (
            <div key={index} className="p-4 border rounded mt-2 bg-gray-700 flex flex-col gap-2">
              <input type="text" placeholder="奖项名称" value={cp.customName} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, customName: e.target.value } : p))} className="p-2 w-full border rounded bg-gray-600" required/>
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="number" placeholder="起始名次" value={cp.rangeStart} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, rangeStart: parseInt(e.target.value) } : p))} className="p-2 w-full border rounded bg-gray-600" required/>
                <input type="number" placeholder="结束名次" value={cp.rangeEnd} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, rangeEnd: parseInt(e.target.value) } : p))} className="p-2 w-full border rounded bg-gray-600" required/>
              </div>
              <select value={cp.prizeId} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, prizeId: e.target.value } : p))} className="p-2 w-full border rounded mt-2 bg-gray-600" required>
                <option value="">无奖品</option>
                {prizes.map(prize => <option key={prize.id} value={prize.id}>{prize.name}</option>)}
              </select>
              <input type="number" min="1" placeholder="数量" value={cp.quantity} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, quantity: parseInt(e.target.value) } : p))} className="p-2 w-full border rounded mt-2 bg-gray-600" required/>
              <button type="button" onClick={() => handleRemoveCustomPrize(index)} className="p-2 bg-red-500 text-white rounded mt-2 w-full">移除自定义奖项</button>
            </div>
          ))}
          <button type="button" onClick={handleAddCustomPrize} className="p-2 bg-green-500 text-white rounded mt-2 w-full">添加自定义奖项</button>
          <button type="submit" className="p-2 bg-blue-500 text-white rounded mt-4 w-full">创建比赛</button>
        </form>
      </div>
    </main>
  );
}