## 部署配置

此目录包含将 YYArena 应用程序部署到各种环境所需的所有配置和指南。

每个子目录对应一个特定的部署目标或平台，提供详细的说明和相关的配置文件。

### 子目录：

-   **`iis/`**: 包含在 Windows Server 上使用 Internet Information Services (IIS) 作为反向代理部署应用程序的配置和 `README.md` 指南。
-   **`linux-nginx/`**: 包含在 Linux 服务器（例如 Ubuntu、CentOS）上使用 Nginx 作为反向代理和 PM2 作为进程管理器部署应用程序的配置和 `README.md` 指南。

### 如何使用：

导航到与您所需部署环境对应的特定子目录，以查找相关的说明和文件。

**注意：** 始终确保敏感信息（如数据库连接字符串、API 密钥）得到安全处理，最好通过环境变量，并且永远不要直接提交到仓库中。

---

## Next.js 项目线上部署指南

部署此 Next.js 项目到线上环境，主要涉及以下几个步骤：

1.  **构建项目:**
    在本地运行构建命令，生成生产环境所需的优化文件：
    ```bash
    npm run build
    ```
    这会在 `.next` 目录下生成所有静态资源和服务器端代码。

2.  **选择部署环境:**
    由于项目使用了 SQLite 数据库 (`database.js`)，这意味着你需要一个能够持久化文件系统并运行 Node.js 服务的环境。常见的选择有：
    *   **虚拟私有服务器 (VPS) / 云服务器 (如 AWS EC2, Azure VM, 阿里云 ECS)**: 你可以完全控制服务器环境，手动安装 Node.js、Nginx/Apache 等。
    *   **Docker 容器化部署**: 将应用打包成 Docker 镜像，更易于移植和管理。
    *   **支持 Node.js 和持久化存储的平台 (如 Render, Heroku)**: 这些平台提供更简化的部署流程，但可能需要配置数据库持久化。

3.  **服务器环境准备 (以 VPS 为例):**
    *   **安装 Node.js**: 确保服务器上安装了 Node.js 和 npm/yarn。
    *   **传输文件**: 将本地构建好的 `.next` 目录、`public` 目录、`package.json`、`package-lock.json` (或 `yarn.lock`) 以及 `src` 目录（如果你的 `src` 目录包含服务器端代码，例如 API 路由）传输到服务器。
    *   **安装依赖**: 在服务器的项目根目录下运行 `npm install` 或 `yarn install`。

4.  **数据库文件处理:**
    *   SQLite 数据库文件 (`database.js` 内部会引用一个 `.sqlite` 文件) 需要在服务器上保持持久化。确保你的部署策略允许这个文件在应用重启后依然存在。
    *   如果你的数据库文件是空的，首次启动应用时可能会自动创建。如果已有数据，需要将本地的 `.sqlite` 文件也传输到服务器。

5.  **启动应用:**
    在服务器的项目根目录下运行：
    ```bash
    npm start
    ```
    这会启动 Next.js 的生产服务器。默认情况下，它会在 `http://localhost:3000` 监听请求。

6.  **配置反向代理 (推荐，如 Nginx/Apache):**
    为了更好地管理流量、提供 SSL (HTTPS) 和处理域名，建议使用 Nginx 或 Apache 作为反向代理，将外部请求转发到 Next.js 应用监听的端口。

    **Nginx 示例配置 (`/etc/nginx/sites-available/your_domain`):**
    ```nginx
    server {
        listen 80;
        server_name yy.gameivy.com; # 替换为你的域名

        location / {
            proxy_pass http://localhost:3000; # Next.js 应用监听的地址和端口
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
    配置完成后，重启 Nginx (`sudo systemctl restart nginx`)。

7.  **解决 `ChunkLoadError` (重要):**
    你之前遇到的 `ChunkLoadError: Loading chunk _app-pages-browser_src_app_tournaments_details_TournamentDetailsClient_tsx failed. (error: https://yy.gameivy.com/_next/undefined)` 错误，通常是由于 Next.js 在部署环境中无法正确解析静态资源的路径造成的。

    *   **检查 `basePath`**: 如果你的应用不是直接部署在域名的根目录 (`yy.gameivy.com`)，而是部署在子路径下 (例如 `yy.gameivy.com/yyarena`)，你需要在 `next.config.mjs` 中添加 `basePath` 配置：
        ```javascript
        /** @type {import('next').NextConfig} */
        const nextConfig = {
          basePath: '/yyarena', // 如果你的应用部署在 yy.gameivy.com/yyarena
        };

        export default nextConfig;
        ```
        **请根据你的实际部署路径进行调整。**

    *   **检查 `output` 配置**: 确保 `next.config.mjs` 中没有 `output: 'export'`，因为你的应用是动态的（有 API 路由和服务器端渲染逻辑），不能导出为纯静态 HTML。

    *   **重新构建和部署**: 每次修改 `next.config.mjs` 后，都必须重新运行 `npm run build` 并重新部署。

请根据你的具体部署环境和需求，选择合适的部署方式，并特别注意路径配置问题。