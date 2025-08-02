# 安全检查报告

以下是对项目主要 API 路由的详细安全检查结果：

**总结发现的潜在安全漏洞：**

1.  ~~**硬编码的 `JWT_SECRET` (严重):**~~
    ~~*   `src/app/api/auth/register/route.ts`~~
    ~~*   `src/app/api/auth/login/route.ts`~~
    ~~*   `src/app/api/prizes/prizeById.ts`~~
    ~~*   `src/app/api/users/me/route.ts`~~
    ~~*   `src/utils/auth.ts`~~
    ~~*   **风险:** 在生产环境中使用硬编码的密钥会使系统极易受到攻击，攻击者可以伪造 JWT 令牌，从而绕过认证和授权。~~
    *   **状态:** ✅ **已修复** - 所有JWT_SECRET已改为从环境变量获取

2.  **输入验证不足 (中等):
    *   `src/app/api/users/me/avatar/route.ts` (PUT 方法中的 `avatar` 字段)
    *   `src/app/api/tournaments/[id]/route.ts` (PUT 方法中的文件上传类型)
    *   `src/app/api/users/me/route.ts` (PUT 方法中的 `stream_url` 和 `avatar` 字段)
    *   `src/app/api/prizes/prizeById.ts` (PUT 方法中的 `name`, `description`, `image_url` 字段)
    *   **风险:** 缺乏对用户输入（尤其是 URL 或文件路径）的严格验证，可能导致：
        *   **XSS (跨站脚本攻击):** 如果前端直接渲染这些未经验证的 URL，可能导致恶意脚本执行。
        *   **加载恶意资源:** 如果 `image_url` 或 `avatar` 指向恶意外部资源，可能导致安全问题。
        *   **数据不一致/滥用:** 允许上传非图片文件可能导致存储空间滥用。

3.  **`registration_code` 暴露 (已修复):**
    *   `src/app/api/tournaments/route.ts` (GET 方法)
    *   **状态:** 已修复。

---

**详细检查结果：**

**检查文件 1: `src/app/api/tournaments/route.ts`**

*   **GET 方法:**
    *   **认证/授权:** 公开接口，不需要认证。
    *   **敏感数据暴露:** 已经修复了 `registration_code` 的暴露问题，现在只返回明确列出的字段。
    *   **输入验证:** 无用户输入。
*   **POST 方法:**
    *   **认证/授权:** 需要 `organizer` 角色认证，并通过 `verifyToken` 检查。
    *   **输入验证:** 对 `minPlayers` 和 `maxPlayers` 进行了范围验证（10-48）。
    *   **文件上传:** `wechatQrCodeFile` 和 `coverImageFile` 的上传处理：
        *   使用了 `uuidv4()` 生成文件名，避免了路径遍历和文件名冲突。
        *   `fs.mkdir(uploadDir, { recursive: true })` 确保目录存在，但没有对文件类型进行严格验证，理论上可以上传非图片文件。这可能导致存储空间滥用或潜在的客户端渲染问题，但不是直接的安全漏洞。
    *   **SQL 注入:** 使用参数化查询 `db.run('INSERT INTO Tournaments ... VALUES (?, ?, ?, ...)', [...])`，有效防止了 SQL 注入。
    *   **硬编码敏感信息:** 未发现硬编码敏感信息。

**初步结论：** `src/app/api/tournaments/route.ts` 在 `GET` 方法中修复了 `registration_code` 的暴露问题，并且 `POST` 方法的认证、输入验证和文件上传处理（文件名生成）方面做得比较好。文件上传类型未严格验证，但这不是直接的安全漏洞。

---

**检查文件 2: `src/app/api/users/me/tournaments/route.ts`**

*   **GET 方法:**
    *   **认证/授权:** 需要有效的 token，并通过 `decodedToken.id` 获取用户 ID。
    *   **敏感数据暴露:** 返回用户创建的比赛列表，不包含敏感信息。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/users/me/tournaments/route.ts` 未发现明显安全漏洞。

---

**检查文件 3: `src/app/api/users/me/registrations/route.ts`**

*   **GET 方法:**
    *   **认证/授权:** 需要有效的 token，并通过 `decodedToken.id` 获取用户 ID。
    *   **敏感数据暴露:** 返回用户报名的比赛列表，不包含敏感信息。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/users/me/registrations/route.ts` 未发现明显安全漏洞。

---

**检查文件 4: `src/app/api/users/me/avatar/route.ts`**

*   **PUT 方法:**
    *   **认证/授权:** 需要有效的 token，并通过 `decodedToken.id` 获取用户 ID。
    *   **输入验证:** `avatar` 字段直接从请求体获取，没有对 `avatar` 的值进行验证，理论上可以设置为任意字符串。如果前端没有严格限制，这可能导致用户头像显示异常或加载恶意外部资源（如果前端直接将此值作为图片URL）。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/users/me/avatar/route.ts` 存在**潜在的输入验证不足**，`avatar` 字段未进行有效性检查。

---

**检查文件 5: `src/app/api/tournaments/register/route.ts`**

*   **POST 方法:**
    *   **认证/授权:** 需要有效的 token，并通过 `decodedToken.id` 获取用户 ID。
    *   **输入验证:** 验证 `tournamentId` 是否存在。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/tournaments/register/route.ts` 未发现明显安全漏洞。

---

**检查文件 6: `src/app/api/tournaments/[id]/registered-players-avatars/route.ts`**

*   **GET 方法:**
    *   **认证/授权:** 公开接口，不需要认证。
    *   **敏感数据暴露:** 返回已报名玩家的头像和部分 ID 信息（`id`, `character_name`, `avatar`），`game_id` 只显示部分。符合产品需求。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/tournaments/[id]/registered-players-avatars/route.ts` 未发现明显安全漏洞。

---

**检查文件 7: `src/app/api/players/[uuid]/route.ts`**

*   **GET 方法:**
    *   **认证/授权:** 公开接口，不需要认证。通过 URL 参数 `uuid` 获取玩家信息。
    *   **敏感数据暴露:** 返回玩家的公开信息（`character_name`, `avatar`, `total_participations`, `first_place_count`, `second_place_count`, `third_place_count`, `forfeit_count`）。不包含敏感信息。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/players/[uuid]/route.ts` 未发现明显安全漏洞。

---

**检查文件 8: `src/app/api/players/[uuid]/match-history/route.ts`**

*   **GET 方法:**
    *   **认证/授权:** 公开接口，不需要认证。通过 URL 参数 `uuid` 获取玩家比赛历史。
    *   **敏感数据暴露:** 返回比赛历史，包含比赛名称、对局信息、玩家名称等。不包含敏感信息。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/players/[uuid]/match-history/route.ts` 未发现明显安全漏洞。

---

**检查文件 9: `src/app/api/tournaments/[id]/registration-status/route.ts`**

*   **GET 方法:**
    *   **认证/授权:** 需要有效的 token。如果未提供 token 或 token 无效，则返回 `isRegistered: false`。
    *   **敏感数据暴露:** 只返回 `isRegistered` 布尔值。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/tournaments/[id]/registration-status/route.ts` 未发现明显安全漏洞。

---

**检查文件 10: `src/app/api/registrations/[id]/withdraw/route.ts`**

*   **POST 方法:**
    *   **认证/授权:** 需要有效的 token，并通过 `decodedToken.id` 验证用户是否拥有该报名记录。
    *   **输入验证:** 验证 `registrationId` 是否存在，以及报名状态是否允许退出。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/registrations/[id]/withdraw/route.ts` 未发现明显安全漏洞。

---

**检查文件 11: `src/app/api/tournaments/[id]/award/route.ts`**

*   **POST 方法:**
    *   **认证/授权:** 需要 `organizer` 角色认证，并通过 `organizerId` 验证是否拥有该比赛。
    *   **输入验证:** 验证 `player_id` 和 `prize_id` 是否存在。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/tournaments/[id]/award/route.ts` 未发现明显安全漏洞。

---

**检查文件 12: `src/app/api/matches/[id]/winner/route.ts`**

*   **POST 方法:**
    *   **认证/授权:** 需要 `organizer` 角色认证，并通过 `organizerId` 验证是否拥有该比赛。
    *   **输入验证:** 验证 `matchId` 是否存在，`winner_id` 是否有效，以及 `forfeit_type` 是否合法。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/matches/[id]/winner/route.ts` 未发现明显安全漏洞。

---

**检查文件 13: `src/app/api/tournaments/[id]/matches/route.ts`**

*   **GET 方法:**
    *   **认证/授权:** 公开接口，不需要认证。
    *   **敏感数据暴露:** 返回比赛对阵信息，包含玩家名称和头像。不包含敏感信息。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/tournaments/[id]/matches/route.ts` 未发现明显安全漏洞。

---

**检查文件 14: `src/app/api/tournaments/[id]/room-info/route.ts`**

*   **GET 方法:**
    *   **认证/授权:** 需要有效的 token。仅主办方或已报名的活跃玩家可查看房间信息。
    *   **敏感数据暴露:** 返回 `room_name`, `room_number`, `room_password`。`room_password` 是敏感信息，但根据产品需求，它只对授权用户可见。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/tournaments/[id]/room-info/route.ts` 在授权方面符合产品需求，未发现明显安全漏洞。

---

**检查文件 15: `src/app/api/tournaments/[id]/start/route.ts`**

*   **POST 方法:**
    *   **认证/授权:** 需要 `organizer` 角色认证，并通过 `organizerId` 验证是否拥有该比赛。
    *   **输入验证:** 验证 `tournamentId` 是否存在，比赛状态是否允许启动，以及报名人数是否达到最低要求。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/tournaments/[id]/start/route.ts` 未发现明显安全漏洞。

---

**检查文件 16: `src/app/api/tournaments/[id]/route.ts`**

*   **GET 方法:**
    *   **认证/授权:** 公开接口，不需要认证。
    *   **敏感数据暴露:** 返回比赛详情，包括奖品设置、已报名玩家数量、最终排名等。不包含敏感信息。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。
*   **PUT 方法:**
    *   **认证/授权:** 需要 `organizer` 角色认证，并通过 `organizerId` 验证是否拥有该比赛。
    *   **输入验证:** 对 `minPlayers` 和 `maxPlayers` 进行了范围验证。验证比赛状态是否允许修改。
    *   **文件上传:** `wechatQrCodeFile` 和 `coverImageFile` 的上传处理与 `POST /api/tournaments` 类似，存在文件类型未严格验证的问题。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/tournaments/[id]/route.ts` 的 `PUT` 方法存在**潜在的文件上传类型验证不足**。

---

**检查文件 17: `src/app/api/users/me/stats/route.ts`**

*   **GET 方法:**
    *   **认证/授权:** 需要有效的 token，并通过 `decodedToken.id` 获取用户 ID。
    *   **敏感数据暴露:** 返回用户统计数据，不包含敏感信息。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/users/me/stats/route.ts` 未发现明显安全漏洞。

---

**检查文件 18: `src/app/api/users/me/route.ts`**

*   **PUT 方法:**
    *   **认证/授权:** 需要有效的 token，并通过 `decodedToken.id` 验证用户身份。
    *   **敏感数据暴露:** 不会直接暴露敏感数据。
    *   **输入验证:**
        *   `stream_url` 和 `avatar` 直接从请求体获取，没有进行有效性验证。`avatar` 字段与 `src/app/api/users/me/avatar/route.ts` 存在相同的问题。
        *   密码修改：验证旧密码，并对新密码进行哈希。
        *   升级为主办方：检查用户名是否被占用。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。
*   **GET 方法:**
    *   **认证/授权:** 需要有效的 token，并通过 `decodedToken.id` 获取用户 ID。
    *   **敏感数据暴露:** 返回用户资料，排除了 `password`。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/users/me/route.ts` 的 `PUT` 方法存在**潜在的输入验证不足**，`stream_url` 和 `avatar` 字段未进行有效性检查。

---

**检查文件 19: `src/app/api/registrations/route.ts`**

*   **POST 方法:**
    *   **认证/授权:** 需要有效的 token，并通过 `decodedToken.id` 获取用户 ID。验证主办方不能报名自己组织的比赛。
    *   **输入验证:** 验证 `tournamentId` 是否存在，`registrationCode` 是否正确，报名人数是否已满，以及玩家弃赛次数是否超过限制。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/registrations/route.ts` 未发现明显安全漏洞。

---

**检查文件 20: `src/app/api/prizes/route.ts`**

*   **GET 方法:**
    *   **认证/授权:** 公开接口，不需要认证。
    *   **敏感数据暴露:** 返回奖品列表，不包含敏感信息。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/prizes/route.ts` 未发现明显安全漏洞。

---

**检查文件 21: `src/app/api/prizes/prizeById.ts`**

*   **GET 方法:**
    *   **认证/授权:** 公开接口，不需要认证。
    *   **敏感数据暴露:** 返回单个奖品详情，不包含敏感信息。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。
*   **PUT 方法:**
    *   **认证/授权:** 需要有效的 token，并验证 `organizer` 角色。
    *   **输入验证:** 验证 `id` 是否存在。`name`, `description`, `image_url` 直接从请求体获取，没有进行有效性验证。`image_url` 字段未进行有效性检查，可能导致加载恶意外部资源。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。
*   **DELETE 方法:**
    *   **认证/授权:** 需要有效的 token，并验证 `organizer` 角色。
    *   **输入验证:** 验证 `id` 是否存在。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/prizes/prizeById.ts` 的 `PUT` 方法存在**潜在的输入验证不足**，`name`, `description`, `image_url` 字段未进行有效性检查。

---

**检查文件 22: `src/app/api/auth/register/route.ts`**

*   **POST 方法:**
    *   **认证/授权:** 无需认证，用于注册。
    *   **敏感数据处理:** 密码进行哈希存储。
    *   **输入验证:** 验证 `role` 是否合法，`game_id` 是否存在，新玩家是否提供 `character_name`。对 `game_id`, `character_name`, `username` 进行了唯一性检查。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** `JWT_SECRET` 仍然是硬编码的默认值 `your-default-secret-key`，这在生产环境中是**严重的安全漏洞**。应该从环境变量中获取。
    *   **用户行为日志:** 记录了 `last_login_ip`, `last_login_time`, `login_count`。

**初步结论：** `src/app/api/auth/register/route.ts` 存在**硬编码的 `JWT_SECRET`**，这是一个**严重的安全漏洞**。

---

**检查文件 23: `src/app/api/auth/login/route.ts`**

*   **POST 方法:**
    *   **认证/授权:** 无需认证，用于登录。
    *   **敏感数据处理:** 密码进行哈希比对。
    *   **输入验证:** 验证 `username`, `password`, `game_id`, `phone_number`。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** `JWT_SECRET` 仍然是硬编码的默认值 `your-default-secret-key`，这在生产环境中是**严重的安全漏洞**。应该从环境变量中获取。
    *   **用户行为日志:** 记录了 `last_login_ip`, `last_login_time`, `login_count`。

**初步结论：** `src/app/api/auth/login/route.ts` 存在**硬编码的 `JWT_SECRET`**，这是一个**严重的安全漏洞**。

---

**检查文件 24: `src/app/api/avatars/route.ts`**

*   **GET 方法:**
    *   **认证/授权:** 公开接口，不需要认证。
    *   **敏感数据暴露:** 返回头像文件列表，不包含敏感信息。
    *   **输入验证:** 无用户输入。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/avatars/route.ts` 未发现明显安全漏洞。

---

**检查文件 25: `src/app/api/player-awards/[id]/route.ts`**

*   **GET 方法:**
    *   **认证/授权:** 公开接口，不需要认证。
    *   **敏感数据暴露:** 返回玩家获奖记录，不包含敏感信息。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/player-awards/[id]/route.ts` 未发现明显安全漏洞。

---

**检查文件 26: `src/app/api/tournaments/[id]/awards/route.ts`**

*   **GET 方法:**
    *   **认证/授权:** 公开接口，不需要认证。
    *   **敏感数据暴露:** 返回比赛的获奖记录，不包含敏感信息。
    *   **SQL 注入:** 使用参数化查询。
    *   **硬编码敏感信息:** 未发现。

**初步结论：** `src/app/api/tournaments/[id]/awards/route.ts` 未发现明显安全漏洞。