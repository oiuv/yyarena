// src/utils/statusTranslators.ts

// 辅助函数：将报名状态英文转换为中文
export const getRegistrationStatusText = (status: string) => {
  switch (status) {
    case 'active': return { text: '已报名', className: 'text-brand-gold' };
    case 'withdrawn': return { text: '已退出', className: 'text-brand-ivory/70' };
    case 'forfeited': return { text: '已弃权', className: 'text-brand-red' };
    default: return { text: status, className: 'text-brand-ivory' };
  }
};

// 辅助函数：将比赛状态英文转换为中文
export const getTournamentStatusText = (status: string) => {
  switch (status) {
    case 'pending': return { text: '待定', className: 'text-brand-gold' };
    case 'ongoing': return { text: '正在比赛中', className: 'text-brand-red' };
    case 'finished': return { text: '已结束', className: 'text-brand-ivory/80' };
    case 'failed': return { text: '已失败', className: 'text-brand-red' };
    default: return { text: status, className: 'text-brand-ivory' };
  }
};

export const getDynamicTournamentStatusText = (tournament: any) => {
  const now = new Date();
  const startTime = new Date(tournament.start_time);
  const registrationDeadline = new Date(tournament.registration_deadline);
  const registeredPlayersCount = tournament.registeredPlayersCount || 0;
  const minPlayers = tournament.min_players;

  // 1. 优先判断数据库中的明确状态
  if (tournament.status === 'finished') return '已结束';
  if (tournament.status === 'ongoing') return '正在比赛中';
  if (tournament.status === 'failed') return '活动组织失败'; // 数据库明确标记为失败

  // 2. 判断“火热报名中”
  if (now < registrationDeadline) {
    return '火热报名中';
  }

  // 从这里开始，当前时间已过报名截止时间。

  // 3. 判断“活动组织失败” (报名截止，人数未达标)
  if (registeredPlayersCount < minPlayers) {
    return '活动组织失败';
  }

  // 从这里开始，报名已截止，且人数已达标。

  // 4. 判断“即将开始” (报名截止，人数达标，但未到开始时间)
  if (now < startTime) {
    return '即将开始';
  }

  // 从这里开始，当前时间已过比赛开始时间，且人数已达标。

  // 5. 最后判断“比赛准备中” (报名截止，人数达标，已过开始时间，但未启动)
  if (tournament.status === 'pending' || tournament.status === 'registration_closed') {
    return '比赛准备中';
  }

  // Fallback to static status text (should ideally not be reached if all states are covered)
  return getTournamentStatusText(tournament.status).text;
};
