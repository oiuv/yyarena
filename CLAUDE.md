# CLAUDE.md

此文件为Claude Code (claude.ai/code)在此代码库中工作时提供指导。

## 项目概述

这是一个为游戏"燕云十六声"设计的1v1竞技比赛管理平台。该平台主要服务于两类用户角色：比赛主办方和参赛玩家。真实的比赛在游戏创建的"砺兵台"房间中进行。

## 关键技术和架构

- **框架**: Next.js 14 with App Router
- **语言**: TypeScript
- **样式**: Tailwind CSS with custom color palette
- **数据库**: SQLite with sqlite3 package
- **认证**: JWT tokens with jose/jsonwebtoken
- **状态管理**: React hooks (useState, useEffect, etc.)
- **文件上传**: Manual file handling with UUID-based filenames
- **API**: RESTful API routes under src/app/api/

## 代码库结构

- `src/app/`: Next.js应用目录，包含页面和API路由
- `src/components/`: 可复用的React组件
- `src/utils/`: 认证、日期时间等工具函数
- `public/`: 静态资源，包括图片、头像和上传文件
- `docs/`: 项目文档
- `scripts/`: 开发和测试脚本

## 开发命令

- `npm run dev`: 启动开发服务器
- `npm run build`: 构建生产版本
- `npm run start`: 启动生产服务器
- `npm run lint`: 运行ESLint

## 数据库模式

主要数据表包括：
- Users: 玩家和主办方，包含角色、游戏ID和统计数据
- Tournaments: 比赛信息，关联主办方
- Registrations: 玩家比赛报名信息
- Matches: 单场比赛配对和结果
- Prizes: 可用的比赛奖品
- TournamentPrizes: 比赛的奖品分配
- PlayerAwards: 授予玩家的奖品

### 数据库状态字段
- **比赛状态（Tournaments.status）**: 4种核心状态
  - `pending`: 待定状态，比赛创建后的初始状态（自动更新）
  - `ongoing`: 进行中状态，比赛开始后的状态（自动更新）
  - `finished`: 已结束状态，比赛完成后的状态（自动更新）
  - `failed`: 活动组织失败状态，由系统管理员手动设置的特殊状态

- **报名状态（Registrations.status）**: 3种状态
  - `active`: 正常报名状态
  - `withdrawn`: 已退出报名
  - `forfeited`: 视为弃权

- **对阵状态（Matches.status）**: 3种状态
  - `pending`: 待开始
  - `finished`: 已完成
  - `forfeited`: 已弃权

## 认证流程

- 玩家支持游戏ID或手机号登录
- 主办方通过用户名/密码登录
- JWT令牌存储在cookies中
- 中间件根据角色处理路由保护

## 核心功能

- 比赛创建和管理
- 玩家报名和退出
- 自动化比赛对阵图生成
- 主办方手动选择获胜者
- 奖品管理和发放
- 玩家统计数据和排名
- 用户封禁/解禁管理（管理员功能）
- 额外获奖发放（管理员功能）
- 比赛页面访问统计
- 弃赛惩罚机制（3次弃赛限制）
- 响应式设计，采用国风武侠主题

## 重要常量和约定

- 配色方案: 深砉灰 (#1A1A1A), 暗金 (#B89766), 朱砂红 (#C83C23), 象牙白 (#F5F5F5)
- 比赛人数限制: 10-48人
- 数据库状态: pending, ongoing, finished, failed（4种核心状态）
- 数据库模式中定义的默认奖品
- 所有数据库操作应使用src/database.mjs中的查询辅助函数
- 文件上传使用基于UUID的文件名以避免兼容性问题

## 数据库命名规范（未来开发标准）

### 用户标识字段统一
- **主键**: `id` (Users表主键)
- **外键引用**: `user_id` (所有引用Users.id的字段统一使用)
- **角色特定引用**: `{role}_user_id` (如organizer_user_id, winner_user_id)
- **操作者ID**: `operator_user_id` (用于记录操作执行者)

### 游戏角色标识统一
- **游戏角色编号**: `character_id` (燕云十六声游戏内角色唯一编号)
- **游戏角色名称**: `character_name` (游戏内角色昵称)

### 命名规范对照表
| 当前实际命名 | 推荐规范命名 | 适用场景 |
|-------------|-------------|----------|
| `game_id` | `character_id` | 游戏角色唯一编号 |
| `character_id` | `character_id` | ✅ 已符合规范 |
| `player_id` | `user_id` | 引用Users表主键 |
| `organizer_id` | `organizer_user_id` | 比赛主办方用户ID |
| `winner_id` | `winner_user_id` | 比赛获胜者用户ID |
| `banned_by` | `operator_user_id` | 执行封禁的管理员ID |
| `awarded_by` | `operator_user_id` | 发放奖品的管理员ID |

### 字段类型规范
- 用户ID字段: INTEGER 类型
- 角色ID字段: TEXT 类型 (游戏角色编号为字符串)
- 时间字段: DATETIME 类型
- 状态字段: TEXT 类型 (使用预定义枚举值)

## 测试

- 通过UI进行手动测试
- 可直接测试API端点
- 在scripts/comprehensiveTest.js中有完整的测试脚本

## API文档维护规范

### 文档更新要求
- **每次新增或修改API接口时，必须同步更新 `docs/api_documentation.md`**
- **新增接口需包含：**
  - 请求方法（GET/POST/PUT/DELETE）
  - 完整路径
  - 描述说明
  - 认证要求
  - 请求参数格式
  - 响应格式
  - 错误处理说明
  - 使用示例

### 文档检查清单
当新增或修改接口时，请确认：
- [ ] 已在 `docs/api_documentation.md` 中添加新接口文档
- [ ] 已更新接口分类目录（如果有新增分类）
- [ ] 已检查并更新相关接口的认证要求
- [ ] 已提供请求和响应示例
- [ ] 已检查接口路径是否与现有接口冲突

### 文档标准格式
```markdown
### METHOD /api/path
接口描述

**认证要求：** 无/已认证/主办方/玩家/管理员

**请求格式：**
```json
// 请求体格式
```

**响应格式：**
```json
// 响应体格式
```

**示例：**
```bash
curl -X METHOD http://localhost:3000/api/path ...
```
```

### 变更记录
请在 `docs/api_documentation.md` 文件底部添加变更记录，包括：
- 变更日期
- 变更内容
- 变更原因
- 影响范围