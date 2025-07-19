// src/utils/statusTranslators.ts

// 辅助函数：将报名状态英文转换为中文
export const getRegistrationStatusText = (status: string) => {
  switch (status) {
    case 'active': return '已报名';
    case 'withdrawn': return '已退出';
    case 'forfeited': return '已弃权';
    default: return status;
  }
};

// 辅助函数：将比赛状态英文转换为中文
export const getTournamentStatusText = (status: string) => {
  switch (status) {
    case 'pending': return '待定';
    case 'registration_closed': return '报名已截止';
    case 'ongoing': return '正在比赛中';
    case 'finished': return '已结束';
    case 'failed': return '已失败';
    case 'extended_registration': return '延期报名中';
    default: return status;
  }
};

export const getDynamicTournamentStatusText = (tournament: any) => {
  const now = new Date();
  const startTime = new Date(tournament.start_time);
  const registrationDeadline = new Date(tournament.registration_deadline);
  const registeredPlayersCount = tournament.registeredPlayersCount || 0;

  if (tournament.status === 'finished') {
    return '已结束';
  } else if (tournament.status === 'ongoing') {
    return '正在比赛中';
  } else if (tournament.status === 'failed') {
    return '活动组织失败';
  } else if (tournament.status === 'extended_registration') {
    return '延期报名中';
  } else if (now < registrationDeadline) {
    return '火热报名中';
  } else if (now >= registrationDeadline && now < startTime) {
    return '即将开始';
  } else if (now >= startTime && registeredPlayersCount >= tournament.min_players) {
    return '进行中'; // Fallback for ongoing if status not updated yet
  } else if (now >= registrationDeadline && registeredPlayersCount < tournament.min_players) {
    return '活动组织失败'; // If registration closed and not enough players
  }
  return '待定';
};
