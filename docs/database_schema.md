## 数据库设计

### 核心数据表

#### Users (用户表)
- `id` (INTEGER, 主键)
- `username` (TEXT, 唯一) - 主办方账号
- `password` (TEXT) - 主办方密码（bcrypt哈希）
- `game_id` (TEXT, 唯一) - 燕云十六声角色编号
- `character_name` (TEXT, 唯一) - 燕云十六声角色名称
- `phone_number` (TEXT, 可选)
- `role` (TEXT) - 角色：organizer, player, admin
- `stream_url` (TEXT, 可选) - 主播直播间/主页地址
- `avatar` (TEXT, 默认 '000.webp')
- `total_participations` (INTEGER, 默认 0) - 总参赛次数
- `first_place_count` (INTEGER, 默认 0) - 冠军次数
- `second_place_count` (INTEGER, 默认 0) - 亚军次数
- `third_place_count` (INTEGER, 默认 0) - 季军次数
- `forfeit_count` (INTEGER, 默认 0) - 弃权次数
- `last_login_ip` (TEXT) - 最后登录IP
- `last_login_time` (TEXT) - 最后登录时间
- `login_count` (INTEGER, 默认 0) - 登录次数
- `uuid` (TEXT) - 公开主页唯一标识

#### Tournaments (比赛表)
- `id` (INTEGER, 主键)
- `name` (TEXT) - 比赛名称
- `organizer_id` (INTEGER, 外键) - 主办方ID
- `start_time` (TEXT) - 开始时间
- `registration_deadline` (TEXT) - 报名截止时间
- `min_players` (INTEGER) - 最少参赛人数（1v1为玩家数，5v5为队伍数）
- `max_players` (INTEGER) - 最多参赛人数（最大48）
- `status` (TEXT) - 状态：pending, ongoing, finished, failed
- `prize_settings` (TEXT) - JSON格式的奖品配置
- `event_description` (TEXT) - 赛事说明
- `wechat_qr_code_url` (TEXT, 可选) - 微信群二维码
- `cover_image_url` (TEXT, 可选) - 封面图URL
- `room_name` (TEXT) - 砺兵台房间名
- `room_number` (TEXT) - 砺兵台房间号
- `room_password` (TEXT, 可选) - 房间密码
- `livestream_url` (TEXT, 可选) - 直播间地址
- `registration_code` (TEXT, 可选) - 参赛验证码
- `winner_id` (INTEGER, 可选) - 获胜者ID
- `default_match_format` (TEXT) - 默认赛制
- `final_rankings` (TEXT) - JSON格式的最终排名
- `view_count` (INTEGER, 默认 0) - 页面访问统计

#### Prizes (奖品表)
- `id` (INTEGER, 主键)
- `name` (TEXT, 唯一) - 奖品名称
- `description` (TEXT) - 奖品描述
- `image_url` (TEXT) - 奖品图片URL

**默认奖品列表：**
- 八音窍（价值1580元）
- 2580长鸣珠时装（价值258元）
- 1280长鸣珠时装/武学特效/坐骑（价值128元）
- 980长鸣珠奇术特效（价值98元）
- 680长鸣珠时装/武器外观/坐骑（价值68元）
- 60长鸣珠时装/武器外观/坐骑（价值6元）
- 128元典藏战令（价值128元）
- 68元精英战令（价值68元）
- 30元月卡（价值30元）

#### TournamentPrizes (比赛奖品表)
- `id` (INTEGER, 主键)
- `tournament_id` (INTEGER, 外键) - 关联比赛
- `prize_id` (INTEGER, 外键, 可选) - 关联奖品
- `rank_start` (INTEGER) - 起始名次
- `rank_end` (INTEGER) - 结束名次
- `custom_prize_name` (TEXT) - 自定义奖品名称
- `quantity` (INTEGER) - 奖品数量

#### PlayerAwards (玩家获奖表)
- `id` (INTEGER, 主键)
- `tournament_id` (INTEGER, 外键) - 关联比赛
- `player_id` (INTEGER, 外键) - 关联玩家
- `prize_id` (INTEGER, 外键) - 关联奖品
- `awarded_at` (TEXT) - 发放时间
- `remark` (TEXT) - 备注信息
- UNIQUE(tournament_id, player_id)

#### Registrations (报名表)
- `id` (INTEGER, 主键)
- `tournament_id` (INTEGER, 外键) - 关联比赛
- `player_id` (INTEGER, 外键) - 关联玩家
- `character_name` (TEXT) - 报名时的角色名称
- `character_id` (TEXT) - 报名时的角色ID
- `registration_time` (TEXT) - 报名时间
- `status` (TEXT) - 状态：active, withdrawn, forfeited
- UNIQUE (tournament_id, player_id)

**状态说明：**
- `active`: 正常报名
- `withdrawn`: 主动退出报名
- `forfeited`: 视为弃权

#### Matches (对阵表)
- `id` (INTEGER, 主键)
- `tournament_id` (INTEGER, 外键) - 关联比赛
- `round_number` (INTEGER) - 轮次编号
- `player1_id` (INTEGER, 可选) - 玩家1ID
- `player2_id` (INTEGER, 可选) - 玩家2ID
- `winner_id` (INTEGER, 可选) - 获胜者ID
- `status` (TEXT) - 状态：pending, finished, forfeited
- `finished_at` (TEXT) - 完成时间
- `match_format` (TEXT) - 比赛赛制

### 扩展数据表

#### UserBans (用户封禁表)
- `id` (INTEGER, 主键)
- `user_id` (INTEGER, 外键) - 被禁用户ID
- `reason` (TEXT) - 封禁原因
- `banned_at` (TEXT) - 封禁时间
- `banned_by` (INTEGER, 外键) - 操作管理员ID
- `expires_at` (TEXT, 可选) - 解封时间

#### ExtraAwards (额外获奖表)
- `id` (INTEGER, 主键)
- `tournament_id` (INTEGER, 外键, 可选) - 关联比赛
- `game_id` (TEXT) - 获奖玩家游戏ID
- `prize_id` (INTEGER, 外键) - 关联奖品
- `prize_description` (TEXT) - 奖品描述
- `remark` (TEXT) - 备注
- `awarded_at` (TEXT) - 发放时间
- `awarded_by` (INTEGER, 外键) - 操作管理员ID

### 数据库状态规范

#### 比赛状态 (Tournaments.status)
- `pending`: 待定状态，比赛创建后的初始状态
- `ongoing`: 进行中状态，比赛开始后的状态
- `finished`: 已结束状态，比赛完成后的状态
- `failed`: 活动组织失败状态，由系统管理员手动设置

#### 报名状态 (Registrations.status)
- `active`: 正常报名状态
- `withdrawn`: 已退出报名
- `forfeited`: 视为弃权

#### 对阵状态 (Matches.status)
- `pending`: 待开始
- `finished`: 已完成
- `forfeited`: 已弃权

### 数据库命名规范

#### 表命名规范
- 使用大驼峰命名法：`Users`, `Tournaments`, `Prizes`
- 关联表使用组合命名：`TournamentPrizes`, `PlayerAwards`
- 避免缩写，使用完整单词

#### 字段命名规范
- 使用小写下划线命名法：`user_id`, `start_time`
- 外键字段格式：`{关联表}_{主键}`
- 布尔类型使用`is_`前缀：`is_active`
- 时间类型使用`_at`后缀：`created_at`
- 状态字段使用`_status`后缀：`registration_status`

#### 索引规范
- 所有外键字段建立索引
- 常用查询字段建立索引
- 唯一约束字段建立唯一索引

#### 约束规范
- 使用NOT NULL约束确保数据完整性
- 使用CHECK约束限制字段取值范围
- 使用FOREIGN KEY约束维护数据一致性
- 使用UNIQUE约束确保唯一性