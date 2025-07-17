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
    case 'ongoing': return '进行中';
    case 'finished': return '已结束';
    case 'failed': return '已失败';
    case 'extended_registration': return '延期报名中';
    default: return status;
  }
};
