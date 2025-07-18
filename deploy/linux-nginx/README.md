## Linux (Ubuntu/CentOS) & Nginx 部署指南

本指南概述了在 Linux 服务器（例如 Ubuntu 或 CentOS）上使用 Nginx 作为反向代理和 PM2 作为进程管理器部署 YYArena Next.js 应用程序的步骤。

### 先决条件

-   Linux 服务器 (Ubuntu/CentOS)。
-   SSH 访问服务器。
-   对 Linux 命令行有基本了解。

### 1. 服务器环境准备

#### 安装 Node.js 和 npm/yarn

建议使用 `nvm` (Node Version Manager) 以方便管理 Node.js 版本。

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
source ~/.bashrc # 或 ~/.zshrc，取决于您的 shell
nvm install --lts
nvm use --lts
```

#### 安装 Git

```bash
sudo apt update
sudo apt install git # 适用于 Debian/Ubuntu
# 或 sudo yum install git # 适用于 CentOS/RHEL
```

#### 安装 Nginx

```bash
sudo apt install nginx # 适用于 Debian/Ubuntu
# 或 sudo yum install nginx # 适用于 CentOS/RHEL
```

### 2. 获取项目代码

在您的服务器上选择一个合适的目录（例如 `/var/www/`），然后克隆您的 Git 仓库：

```bash
cd /var/www/
git clone <您的Git仓库URL> yyarena
cd yyarena
```

### 3. 安装依赖并构建项目

导航到您的项目目录，安装生产依赖，并构建 Next.js 应用程序：

```bash
npm install --production # 或 yarn install --production
npm run build # 或 yarn build
```

### 4. 配置环境变量

Next.js 应用程序在生产环境中需要环境变量，特别是数据库连接信息等敏感数据。

**请勿将 `.env.local` 提交到您的 Git 仓库。**

在服务器上您的项目根目录中创建或编辑 `.env.production` 文件，或者在启动应用程序时直接设置它们（例如，使用 PM2 的环境变量选项）。

`.env.production` 示例：

```
DATABASE_URL="您的数据库连接字符串"
# 您需要的其他环境变量，例如 API 密钥等
```

### 5. 运行应用程序 (使用 PM2)

PM2 是一个 Node.js 进程管理器，可以保持您的应用程序持续运行，并在崩溃时自动重启。

#### 安装 PM2

```bash
npm install -g pm2
```

#### 启动 Next.js 应用程序

```bash
pm2 start npm --name "yyarena-app" -- start
```

-   `--name "yyarena-app"`: 为您的应用程序进程指定一个易于识别的名称。
-   `-- start`: 告诉 PM2 运行 `npm start` 命令，这将启动 Next.js 生产服务器。

#### 配置 PM2 开机自启

```bash
pm2 startup systemd # 或 pm2 startup init.d，根据您的系统选择
pm2 save
```

按照 PM2 提供的说明操作，以确保您的应用程序在服务器重启后自动启动。

### 6. 配置反向代理 (使用 Nginx)

Nginx 将充当反向代理，将外部请求转发到您的 Next.js 应用程序（通常在 3000 端口上运行）。

#### 创建 Nginx 配置

创建一个新的 Nginx 配置文件，例如 `/etc/nginx/sites-available/yyarena`：

```nginx
server {
    listen 80;
    server_name your_domain.com www.your_domain.com; # 替换为您的域名

    location / {
        proxy_pass http://localhost:3000; # Next.js 默认端口
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 可选：如果您希望 Nginx 直接提供静态文件服务（例如，为了更好的性能）
    # location /_next/static {
    #     alias /var/www/yyarena/.next/static;
    #     expires 30d;
    #     access_log off;
    # }
}
```

#### 启用 Nginx 配置

创建软链接到 `sites-enabled` 目录以激活配置：

```bash
sudo ln -s /etc/nginx/sites-available/yyarena /etc/nginx/sites-enabled/
```

#### 测试并重启 Nginx

```bash
sudo nginx -t
sudo systemctl restart nginx
```

#### 配置 HTTPS (推荐)

使用 Certbot 可以轻松为您的域名配置免费的 Let's Encrypt SSL 证书：

```bash
sudo apt install certbot python3-certbot-nginx # 适用于 Debian/Ubuntu
sudo certbot --nginx -d your_domain.com -d www.your_domain.com
```

按照提示完成配置。

### 7. 数据库设置

确保您的数据库（例如 SQLite、PostgreSQL、MySQL）已在服务器上正确安装和配置，并且您的 Next.js 应用程序可以通过 `.env.production` 中配置的 `DATABASE_URL` 访问它。

如果使用 SQLite，请确保数据库文件对 Node.js 进程可写，并在部署期间正确包含在您的项目目录中。