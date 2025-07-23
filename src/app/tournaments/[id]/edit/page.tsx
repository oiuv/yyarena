'use client';

import { useState, useEffect } from 'react';
import { getToken } from '@/utils/clientAuth';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatDateToLocalISO } from '@/utils/datetime';

export default function EditTournamentPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params; // Get tournament ID from URL

  const [prizes, setPrizes] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [minPlayers, setMinPlayers] = useState(10);
  const [maxPlayers, setMaxPlayers] = useState(48);
  const [eventDescription, setEventDescription] = useState('');
  const [wechatQrCodeFile, setWechatQrCodeFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [currentWechatQrCodeUrl, setCurrentWechatQrCodeUrl] = useState<string | null>(null);
  const [currentCoverImageUrl, setCurrentCoverImageUrl] = useState<string | null>(null);
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [defaultMatchFormat, setDefaultMatchFormat] = useState<string>('1局1胜');
  const [registrationCode, setRegistrationCode] = useState('');

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
    const fetchPrizesAndTournament = async () => {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        // Fetch prizes
        const prizesRes = await fetch('/api/prizes');
        const prizesData = await prizesRes.json();
        setPrizes(prizesData);

        // Fetch tournament data
        if (id) {
          const tournamentRes = await fetch(`/api/tournaments/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (tournamentRes.ok) {
            const tournamentData = await tournamentRes.json();
            setName(tournamentData.name);

            setStartTime(formatDateToLocalISO(tournamentData.start_time));
            setMinPlayers(tournamentData.min_players);
            setMaxPlayers(tournamentData.max_players);
            setEventDescription(tournamentData.event_description);
            setRegistrationDeadline(formatDateToLocalISO(tournamentData.registration_deadline));
            setDefaultMatchFormat(tournamentData.default_match_format || '1局1胜');
            setRegistrationCode(tournamentData.registration_code || '');

            setCurrentWechatQrCodeUrl(tournamentData.wechat_qr_code_url);
            setCurrentCoverImageUrl(tournamentData.cover_image_url);

            // Note: prize_settings are not editable, so we don't populate them
          } else {
            const errorData = await tournamentRes.json();
            toast.error(`获取比赛数据失败: ${errorData.message || '未知错误'}`);
            router.push('/my-tournaments'); // Redirect if data fetch fails
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('获取数据时发生网络错误。');
        router.push('/my-tournaments');
      }
    };
    fetchPrizesAndTournament();
  }, [id, router]);

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
        toast.error('请登录后操作。');
        router.push('/login');
        return;
      }

    // Validation
    const startDateTime = new Date(startTime);
    const now = new Date();

    if (startDateTime < now) {
      toast.error('比赛开始时间不能是过去的时间。');
      return;
    }

    const registrationDeadlineDateTime = registrationDeadline ? new Date(registrationDeadline) : null;

    if (registrationDeadlineDateTime && registrationDeadlineDateTime > startDateTime) {
      toast.error('报名截止时间不得大于比赛开始时间。');
      return;
    }

    // Custom prize validation (still needed for form validation, even if not submitted)
    for (const cp of customPrizes) {
      if (cp.rangeStart < 0 || cp.rangeStart > 50 || cp.rangeEnd < 0 || cp.rangeEnd > 50) {
        toast.error('自定义奖项的排名范围必须在 0 到 50 之间。');
        return;
      }
      if (cp.rangeStart > cp.rangeEnd) {
        toast.error('自定义奖项的起始名次不能大于结束名次。');
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
    } else if (currentWechatQrCodeUrl) {
      formData.append('wechat_qr_code_url', currentWechatQrCodeUrl);
    }
    if (coverImageFile) {
      formData.append('cover_image', coverImageFile);
    } else if (currentCoverImageUrl) {
      formData.append('cover_image_url', currentCoverImageUrl);
    }
    formData.append('default_match_format', defaultMatchFormat);
    if (registrationCode) {
      formData.append('registration_code', registrationCode);
    }

    // Prize settings are NOT sent for editing
    // const prize_settings = { ... }; formData.append('prize_settings', JSON.stringify(prize_settings));

    try {
      const res = await fetch(`/api/tournaments/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        toast.success('比赛更新成功！');
        router.push(`/tournaments/details?id=${id}`);
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || '未知错误');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('提交时发生网络错误。');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-6 lg:p-12 bg-brand-charcoal text-brand-ivory">
      <div className="w-full max-w-6xl mx-auto p-4 md:p-6 bg-brand-charcoal/80 rounded-lg shadow-lg shadow-brand-gold/20 border border-brand-gold/50">
        <h2 className="text-3xl font-bold mb-6 text-center text-brand-gold">编辑比赛</h2>
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
          <textarea id="eventDescription" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} className="p-3 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory w-full focus:ring-2 focus:ring-brand-gold focus:outline-none" rows={5} placeholder="示例：1. 主办方会在比赛前30分钟创建砺兵台并更新房间编号在比赛详情页\n2. 玩家请从比赛详情页获取砺兵台房间编号并提前至少15分钟进入砺兵台\n3. 比赛对阵图会在比赛开始时自动生成在比赛详情页，请及时关注\n4. 参赛玩家必须修改个人头像为游戏角色图像，否则主办方有权取消奖励\n5. 本次比赛最终解释权归主办方所有，预祝各位赛事顺利" required />
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

          <h3 className="text-xl font-bold mb-2 mt-4 text-center text-brand-gold">奖品设置 (禁止更改)</h3>
          <p className="text-brand-red text-center mb-4">注意：奖品设置禁止更改，如需更新请联系系统管理员。</p>
          {rankedPrizes.map((rp, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <span className="w-20 flex-shrink-0 text-left text-brand-ivory">第 {rp.rank} 名:</span>
              <select value={rp.prizeId} onChange={(e) => setRankedPrizes(rankedPrizes.map((p, i) => i === index ? { ...p, prizeId: e.target.value } : p))} className="p-3 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory flex-grow w-full focus:ring-2 focus:ring-brand-gold focus:outline-none" disabled>
                <option value="">禁止更改</option>
                {prizes.map(prize => <option key={prize.id} value={prize.id}>{prize.name}</option>)}
              </select>
              <input type="number" min="1" value={rp.quantity} onChange={(e) => setRankedPrizes(rankedPrizes.map((p, i) => i === index ? { ...p, quantity: parseInt(e.target.value) } : p))} className="p-3 w-full sm:w-20 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory focus:ring-2 focus:ring-brand-gold focus:outline-none" disabled />
            </div>
          ))}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center mt-2">
            <span className="w-20 flex-shrink-0 text-left text-brand-ivory">参与奖:</span>
            <select value={participationPrize.prizeId} onChange={(e) => setParticipationPrize({ ...participationPrize, prizeId: e.target.value })} className="p-3 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory flex-grow w-full focus:ring-2 focus:ring-brand-gold focus:outline-none" disabled>
              <option value="">禁止更改</option>
              {prizes.map(prize => <option key={prize.id} value={prize.id}>{prize.name}</option>)}
            </select>
            <input type="number" min="1" value={participationPrize.quantity} onChange={(e) => setParticipationPrize({ ...participationPrize, quantity: parseInt(e.target.value) })} className="p-3 w-full sm:w-20 border border-brand-gold/50 rounded bg-brand-charcoal/70 text-brand-ivory focus:ring-2 focus:ring-brand-gold focus:outline-none" disabled />
          </div>
          {customPrizes.map((cp, index) => (
            <div key={index} className="p-4 border border-brand-gold/50 rounded mt-2 bg-brand-charcoal/70 flex flex-col gap-2">
              <input type="text" placeholder="奖项名称" value={cp.customName} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, customName: e.target.value } : p))} className="p-3 w-full border border-brand-gold/50 rounded bg-brand-charcoal/60 text-brand-ivory placeholder-brand-ivory/50 focus:ring-2 focus:ring-brand-gold focus:outline-none" required disabled/>
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="number" placeholder="起始名次 (0-50)" value={cp.rangeStart} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, rangeStart: parseInt(e.target.value) } : p))} className="p-3 w-full border border-brand-gold/50 rounded bg-brand-charcoal/60 text-brand-ivory placeholder-brand-ivory/50 focus:ring-2 focus:ring-brand-gold focus:outline-none" required min="0" max="50" disabled/>
                <input type="number" placeholder="结束名次 (0-50)" value={cp.rangeEnd} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, rangeEnd: parseInt(e.target.value) } : p))} className="p-3 w-full border border-brand-gold/50 rounded bg-brand-charcoal/60 text-brand-ivory placeholder-brand-ivory/50 focus:ring-2 focus:ring-brand-gold focus:outline-none" required min="0" max="50" disabled/>
              </div>
              <select value={cp.prizeId} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, prizeId: e.target.value } : p))} className="p-3 w-full border border-brand-gold/50 rounded mt-2 bg-brand-charcoal/60 text-brand-ivory focus:ring-2 focus:ring-brand-gold focus:outline-none" required disabled>
                <option value="">禁止更改</option>
                {prizes.map(prize => <option key={prize.id} value={prize.id}>{prize.name}</option>)}
              </select>
              <input type="number" min="1" placeholder="数量" value={cp.quantity} onChange={e => setCustomPrizes(customPrizes.map((p, i) => i === index ? { ...p, quantity: parseInt(e.target.value) } : p))} className="p-3 w-full border border-brand-gold/50 rounded mt-2 bg-brand-charcoal/60 text-brand-ivory placeholder-brand-ivory/50 focus:ring-2 focus:ring-brand-gold focus:outline-none" required disabled/>
              <button type="button" onClick={() => handleRemoveCustomPrize(index)} className="p-3 bg-brand-red hover:bg-brand-red/80 text-brand-ivory rounded mt-2 w-full transition-colors duration-300" disabled>移除自定义奖项</button>
            </div>
          ))}
          <button type="button" onClick={handleAddCustomPrize} className="p-3 bg-brand-gold hover:bg-brand-gold/80 text-brand-charcoal font-bold rounded mt-2 w-full transition-colors duration-300" disabled>添加自定义奖项</button>
          <button type="submit" className="p-3 bg-brand-gold hover:bg-brand-gold/80 text-brand-charcoal font-bold rounded mt-4 w-full transition-colors duration-300">更新比赛</button>
        </form>
      </div>
    </main>
  );
}