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
    case 'registration_closed': return { text: '报名已截止', className: 'text-brand-ivory/60' };
    case 'ongoing': return { text: '正在比赛中', className: 'text-brand-red' };
    case 'finished': return { text: '已结束', className: 'text-brand-ivory/80' };
    case 'failed': return { text: '已失败', className: 'text-brand-red' };
    case 'extended_registration': return { text: '延期报名中', className: 'text-brand-gold' };
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
  if (tournament.status === 'failed') return '活动组织失败';
  if (tournament.status === 'extended_registration') return '延期报名中';

  // 2. 然后判断“火热报名中”
  if (now < registrationDeadline) {
    return '火热报名中';
  }

  // 从这里开始，当前时间已过报名截止时间

  // 3. 其次判断“活动组织失败”
  if (registeredPlayersCount < minPlayers) {
    return '活动组织失败';
  }

  // 从这里开始，报名人数已达标

  // 4. 接着判断“即将开始”
  if (now < startTime) {
    return '即将开始';
  }

  // 从这里开始，当前时间已过比赛开始时间

  // 5. 最后判断“比赛准备中”
  if (tournament.status === 'pending' || tournament.status === 'registration_closed') {
    return '比赛准备中';
  }

  // Fallback to static status text
  return getTournamentStatusText(tournament.status).text;
};
