# API接口文档

本文档为燕云十六声1v1竞技比赛管理平台的完整REST API接口文档。

## 认证

所有需要认证的接口都使用JWT令牌，令牌存储在cookies中，有效期8小时。

**认证头格式：**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 认证接口

### POST /api/auth/login
用户登录，支持多种登录方式

**请求格式：**
```json
{
  "username": "string",      // 主办方登录用
  "password": "string",      // 主办方登录用
  "game_id": "string",       // 玩家登录用
  "phone_number": "string"   // 玩家登录用
}
```

**响应：**
- `200`: 登录成功，JWT令牌存储在cookie
- `401`: 无效凭证
- `403`: 账户被封禁或登录方式错误

### POST /api/auth/register
用户注册

**请求格式：**
```json
{
  "role": "organizer|player",
  "username": "string",        // 主办方必填
  "password": "string",        // 主办方必填
  "game_id": "string",         // 必填
  "character_name": "string",  // 必填
  "phone_number": "string",    // 可选
  "stream_url": "string",      // 可选
  "avatar": "string"           // 可选，默认"000.webp"
}
```

## 比赛管理接口

### GET /api/tournaments
获取所有比赛列表

**响应：** 比赛对象数组，包含奖品设置解析

### POST /api/tournaments
创建新比赛（主办方专用）

**Content-Type:** `multipart/form-data`
**表单字段：**
- `name`: 比赛名称
- `start_time`: ISO日期字符串
- `registration_deadline`: ISO日期字符串（默认等于start_time）
- `min_players`: 最少参赛人数（≥10）
- `max_players`: 最多参赛人数（≤48）
- `event_description`: 比赛描述
- `prize_settings`: JSON格式的奖品配置
- `wechat_qr_code_image`: 微信群二维码文件（可选）
- `cover_image`: 封面图片文件（可选）
- `default_match_format`: 默认赛制（如"3局2胜"）
- `registration_code`: 参赛验证码（可选，私密比赛用）

### GET /api/tournaments/[id]
获取特定比赛详情

**响应：** 完整比赛对象，包含解析后的奖品和最终排名

### PUT /api/tournaments/[id]
更新比赛信息（主办方专用，只能修改未开始的比赛）

### DELETE /api/tournaments/[id]
删除比赛（禁止操作）

## 比赛操作接口

### POST /api/tournaments/[id]/start
开始比赛（主办方专用）

**请求体：**
```json
{
  "room_name": "string",
  "room_number": "string",
  "room_password": "string"
}
```

### GET /api/tournaments/[id]/matches
获取比赛所有对阵

### GET /api/tournaments/[id]/room-info
获取砺兵台房间信息

**访问权限：** 仅主办方或已报名玩家

### GET /api/tournaments/[id]/registration-status
检查当前用户对比赛的报名状态

**响应：**
```json
{"isRegistered": true}
```

## 报名管理接口

### POST /api/registrations
报名比赛（玩家专用）

**请求体：**
```json
{
  "tournamentId": 123,
  "registrationCode": "1314"  // 可选，私密比赛需要
}
```

### POST /api/registrations/[id]/withdraw
取消比赛报名

## 比赛结果接口

### POST /api/matches/[id]/winner
设置比赛获胜者（主办方专用）

**请求体：**
```json
{
  "winner_id": 123,
  "match_format": "3局2胜",
  "forfeit_type": "player1"  // 可选：both|player1|player2
}
```

## 奖品管理接口

### GET /api/prizes
获取所有可用奖品

### GET /api/prizes/prizeById?id=[id]
获取特定奖品详情

### PUT /api/prizes/prizeById?id=[id]
更新奖品信息（主办方专用）

### DELETE /api/prizes/prizeById?id=[id]
删除奖品（主办方专用）

## 奖品发放接口

### POST /api/tournaments/[id]/award
发放奖品给玩家（主办方专用）

**请求体：**
```json
{
  "player_id": 123,
  "prize_id": 456,
  "remark": "备注信息"
}
```

### GET /api/tournaments/[id]/awards
获取比赛已发放奖品

### GET /api/tournaments/[id]/extra-awards
获取比赛额外奖品记录

### POST /api/tournaments/[id]/extra-awards
添加额外奖品记录（主办方专用）

**请求体：**
```json
{
  "game_id": "player123",
  "prize_id": 456,
  "prize_description": "奖品描述",
  "remark": "备注"
}
```

### PUT /api/tournaments/[id]/extra-awards/[awardId]
更新额外奖品记录（主办方专用）

### DELETE /api/tournaments/[id]/extra-awards/[awardId]
删除额外奖品记录（主办方专用）

## 用户管理接口

### GET /api/users/me
获取当前用户信息

### PUT /api/users/me
更新用户信息

**可更新字段：** `stream_url`, `avatar`

### GET /api/users/me/stats
获取用户统计数据

**响应：**
```json
{
  "total_tournaments": 5,
  "wins": 3,
  "forfeits": 0
}
```

### GET /api/users/me/registrations
获取用户报名记录

### GET /api/users/me/tournaments
获取用户创建的比赛（主办方专用）

### POST /api/users/me/avatar
上传用户头像

**Content-Type:** `multipart/form-data`
**表单字段：**
- `avatar`: 头像图片文件

## 玩家公开接口

### GET /api/players/[uuid]
获取玩家公开信息

### GET /api/players/[uuid]/match-history
获取玩家对战历史

## 管理员接口

### GET /api/admin/users
获取所有用户（管理员专用）

### POST /api/admin/ban
封禁用户（管理员专用）

**请求体：**
```json
{
  "user_id": 123,
  "reason": "违规原因",
  "expires_at": "2024-12-31"
}
```

### POST /api/admin/unban
解封用户（管理员专用）

**请求体：**
```json
{"user_id": 123}
```

## 文件上传接口

### POST /api/avatars
上传头像图片

**Content-Type:** `multipart/form-data`
**表单字段：**
- `avatar`: 头像图片文件

**响应：**
```json
{"avatar": "filename.png"}
```

## 错误处理

所有接口都返回统一的错误响应格式：

```json
{
  "message": "错误描述",
  "error": "详细错误信息"  // 部分接口
}
```

## 测试示例

### 登录测试
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"game_id": 