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
  const [eventDescription, setEventDescription] = useState(
    `1. 主办方会在比赛前30分钟创建砺兵台并更新房间编号在比赛详情页
2. 玩家请从比赛详情页获取砺兵台房间编号并提前至少15分钟进入砺兵台
3. 比赛对阵图会在比赛开始时自动生成在比赛详情页，请及时关注
4. 参赛玩家必须修改个人头像为游戏角色图像，否则主办方有权取消奖励
5. 本次比赛最终解释权归主办方所有，预祝各位赛事顺利`
  );
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

    // Custom prize validation
    for (const cp of customPrizes) {
      if (cp.rangeStart < 0 || cp.rangeStart > 50 || cp.rangeEnd < 0 || cp.rangeEnd > 50) {
        alert('自定义奖项的排名范围必须在 0 到 50 之间。');
        return;
      }
      if (cp.rangeStart > cp.rangeEnd) {
        alert('自定义奖项的起始名次不能大于结束名次。');
        return;
      }
    }

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
    <main className="flex min-h-screen flex-col items-center p-4 md:p-6 lg:p-12 bg-brand-charcoal text-brand-ivory">
      <div className="w-full max-w-6xl mx-auto p-4 md:p-6 bg-brand-charcoal/80 rounded-lg shadow-lg shadow-brand-gold/20 border border-brand-gold/50">
        <h2 className="text-3xl font-bold mb-6 text-center text-brand-gold">创建比赛</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label htmlFor="name" className="block text-brand-ivory text-sm font-bold mb-2">
            比赛名称:
          </label>
          <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="p-3 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory w-full placeholder-brand-ivory/50 focus:ring-2 focus:ring-brand-gold focus:outline-none" placeholder="例如：燕云十六声第一届比武大会" required />

          <label htmlFor="startTime" className="block text-brand-ivory text-sm font-bold mb-2">
            比赛开始时间:
          </label>
          <input type="datetime-local" id="startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="p-3 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory w-full focus:ring-2 focus:ring-brand-gold focus:outline-none" required />

          <label htmlFor="registrationDeadline" className="block text-brand-ivory text-sm font-bold mb-2">
            报名截止时间 (可选):
          </label>
          <input type="datetime-local" id="registrationDeadline" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} className="p-3 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory w-full focus:ring-2 focus:ring-brand-gold focus:outline-none" />

          <label htmlFor="minPlayers" className="block text-brand-ivory text-sm font-bold mb-2">
            最少参赛人数:
          </label>
          <input type="number" id="minPlayers" value={minPlayers} onChange={(e) => setMinPlayers(parseInt(e.target.value))} className="p-3 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory w-full focus:ring-2 focus:ring-brand-gold focus:outline-none" required />

          <label htmlFor="maxPlayers" className="block text-brand-ivory text-sm font-bold mb-2">
            最多参赛人数:
          </label>
          <input type="number" id="maxPlayers" value={maxPlayers} onChange={(e) => setMaxPlayers(parseInt(e.target.value))} className="p-3 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory w-full focus:ring-2 focus:ring-brand-gold focus:outline-none" required />

          <label htmlFor="eventDescription" className="block text-brand-ivory text-sm font-bold mb-2">
            赛事说明:
          </label>
          <textarea id="eventDescription" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} className="p-3 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory w-full focus:ring-2 focus:ring-brand-gold focus:outline-none" rows={5} placeholder="示例：1. 主办方会在比赛前30分钟创建砺兵台并更新房间编号在比赛详情页
2. 玩家请从比赛详情页获取砺兵台房间编号并提前至少15分钟进入砺兵台
3. 比赛对阵图会在比赛开始时自动生成在比赛详情页，请及时关注
4. 参赛玩家必须修改个人头像为游戏角色图像，否则主办方有权取消奖励
5. 本次比赛最终解释权归主办方所有，预祝各位赛事顺利" required />
          <label className="block text-brand-ivory text-sm font-bold mb-2">
            微信群二维码 (可选):
          </label>
          <input type="file" accept="image/*" onChange={(e) => setWechatQrCodeFile(e.target.files ? e.target.files[0] : null)} className="p-3 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory w-full focus:ring-2 focus:ring-brand-gold focus:outline-none" />

          <label className="block text-brand-ivory text-sm font-bold mb-2">
            比赛封面图 (可选):
          </label>
          <input type="file" accept="image/*" onChange={(e) => setCoverImageFile(e.target.files ? e.target.files[0] : null)} className="p-3 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory w-full focus:ring-2 focus:ring-brand-gold focus:outline-none" />

          <label htmlFor="registrationCode" className="block text-brand-ivory text-sm font-bold mb-2">
            参赛验证码 (可选):
          </label>
          <input type="text" id="registrationCode" value={registrationCode} onChange={(e) => setRegistrationCode(e.target.value)} className="p-3 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory w-full placeholder-brand-ivory/50 focus:ring-2 focus:ring-brand-gold focus:outline-none" placeholder="用于非公开赛报名验证，如百业内部赛" />
          
          <label className="block text-brand-ivory text-sm font-bold mb-2">
            默认比赛赛制:
          </label>
          <select
            className="p-3 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory w-full focus:ring-2 focus:ring-brand-gold focus:outline-none"
            value={defaultMatchFormat}
            onChange={(e) => setDefaultMatchFormat(e.target.value)}
          >
            <option value="1局1胜">1局1胜</option>
            <option value="3局2胜">3局2胜</option>
            <option value="5局3胜">5局3胜</option>
          </select>

          <h3 className="text-xl font-bold mb-2 mt-4 text-center text-brand-gold">奖品设置</h3>
          {rankedPrizes.map((rp, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <span className="w-20 flex-shrink-0 text-left text-brand-ivory">第 {rp.rank} 名:</span>
              <select value={rp.prizeId} onChange={(e) => setRankedPrizes(rankedPrizes.map((p, i) => i === index ? { ...p, prizeId: e.target.value } : p))} className="p-3 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory flex-grow w-full focus:ring-2 focus:ring-brand-gold focus:outline-none">
                <option value="">无奖品</option>
                {prizes.map(prize => <option key={prize.id} value={prize.id}>{prize.name}</option>)}
              </select>
              <input type="number" min="1" value={rp.quantity} onChange={(e) => setRankedPrizes(rankedPrizes.map((p, i) => i === index ? { ...p, quantity: parseInt(e.target.value) } : p))} className="p-3 w-full sm:w-20 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory focus:ring-2 focus:ring-brand-gold focus:outline-none" />
            </div>
          ))}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center mt-2">
            <span className="w-20 flex-shrink-0 text-left text-brand-ivory">参与奖:</span>
            <select value={participationPrize.prizeId} onChange={(e) => setParticipationPrize({ ...participationPrize, prizeId: e.target.value })} className="p-3 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory flex-grow w-full focus:ring-2 focus:ring-brand-gold focus:outline-none">
              <option value="">无奖品</option>
              {prizes.map(prize => <option key={prize.id} value={prize.id}>{prize.name}</option>)}
            </select>
            <input type="number" min="1" value={participationPrize.quantity} onChange={(e) => setParticipationPrize({ ...participationPrize, quantity: parseInt(e.target.value) })} className="p-3 w-full sm:w-20 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory focus:ring-2 focus:ring-brand-gold focus:outline-none" />
          </div>
          {customPrizes.map((cp, index) => (
            <div key={index} className="p-4 border border-brand-gold/50 rounded mt-2 bg-brand-charcoal/70 flex flex-col gap-2">
              <input type="text" placeholder="奖项名称" value={cp.customName} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, customName: e.target.value } : p))} className="p-3 w-full border border-brand-gold/50 rounded bg-brand-charcoal/60 text-brand-ivory placeholder-brand-ivory/50 focus:ring-2 focus:ring-brand-gold focus:outline-none" required/>
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="number" placeholder="起始名次 (0-50)" value={cp.rangeStart} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, rangeStart: parseInt(e.target.value) } : p))} className="p-3 w-full border border-brand-gold/50 rounded bg-brand-charcoal/60 text-brand-ivory placeholder-brand-ivory/50 focus:ring-2 focus:ring-brand-gold focus:outline-none" required min="0" max="50"/>
                <input type="number" placeholder="结束名次 (0-50)" value={cp.rangeEnd} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, rangeEnd: parseInt(e.target.value) } : p))} className="p-3 w-full border border-brand-gold/50 rounded bg-brand-charcoal/60 text-brand-ivory placeholder-brand-ivory/50 focus:ring-2 focus:ring-brand-gold focus:outline-none" required min="0" max="50"/>
              </div>
              <select value={cp.prizeId} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, prizeId: e.target.value } : p))} className="p-3 w-full border border-brand-gold/50 rounded mt-2 bg-brand-charcoal/60 text-brand-ivory focus:ring-2 focus:ring-brand-gold focus:outline-none" required>
                <option value="">无奖品</option>
                {prizes.map(prize => <option key={prize.id} value={prize.id}>{prize.name}</option>)}
              </select>
              <input type="number" min="1" placeholder="数量" value={cp.quantity} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, quantity: parseInt(e.target.value) } : p))} className="p-3 w-full border border-brand-gold/50 rounded mt-2 bg-brand-charcoal/60 text-brand-ivory placeholder-brand-ivory/50 focus:ring-2 focus:ring-brand-gold focus:outline-none" required/>
              <button type="button" onClick={() => handleRemoveCustomPrize(index)} className="p-3 bg-brand-red hover:bg-brand-red/80 text-brand-ivory rounded mt-2 w-full transition-colors duration-300">移除自定义奖项</button>
            </div>
          ))}
          <button type="button" onClick={handleAddCustomPrize} className="p-3 bg-brand-gold hover:bg-brand-gold/80 text-brand-charcoal font-bold rounded mt-2 w-full transition-colors duration-300">添加自定义奖项</button>
          <button type="submit" className="p-3 bg-brand-gold hover:bg-brand-gold/80 text-brand-charcoal font-bold rounded mt-4 w-full transition-colors duration-300">创建比赛</button>
        </form>
      </div>
    </main>
  );
}