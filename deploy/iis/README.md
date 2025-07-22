# 在 Windows IIS 上部署 Next.js 项目的最佳实践

本文档提供了在 Windows Server 的 Internet Information Services (IIS) 上部署此 Next.js 项目的详细步骤和最佳实践。遵循本指南可以确保您的应用安全、高效地运行，并能正确处理动态页面、API 路由以及用户上传的静态文件。

## 1. 环境准备

在开始部署之前，请确保您的服务器已满足以下条件：

- **Windows Server**: 已安装并正在运行。
- **IIS**: 已安装 IIS 角色。
- **Node.js**: 已安装适用于 Windows 的最新 LTS (长期支持) 版本的 Node.js。
- **IIS URL Rewrite Module**: 已安装 URL 重写模块。这是让 `web.config` 文件生效的**关键依赖**。您可以从 [IIS 官网](https://www.iis.net/downloads/microsoft/url-rewrite) 下载并安装。
- **Application Request Routing (ARR)**: 已安装 ARR 模块，它能启用反向代理功能。您可以从 [IIS 官网](https://www.iis.net/downloads/microsoft/application-request-routing) 下载并安装。

## 2. 部署步骤

### 第 1 步：准备项目文件

1.  将完整的项目代码复制到您的服务器上，例如 `C:\inetpub\wwwroot\yyarena`。
2.  打开命令行工具（如 PowerShell 或 CMD），进入项目根目录 (`C:\inetpub\wwwroot\yyarena`)。
3.  运行 `npm install` 来安装所有项目依赖。

### 第 2 步：配置环境变量

为了使应用能够在生产环境中正确运行，您需要配置环境变量。

1.  在项目根目录下，创建一个名为 `.env.production` 的文件。
2.  在该文件中，添加以下内容：

    ```env
    # 您的网站将要使用的公开域名
    PUBLIC_HOSTNAME=your-domain.com

    # 用于用户认证的 JWT 密钥 (请使用一个强大且随机的字符串)
    JWT_SECRET=your-super-strong-and-secret-jwt-key
    ```

    **注意**: 请将 `your-domain.com` 替换为您的真实域名，并为 `JWT_SECRET` 生成一个新的、安全的密钥。

### 第 3 步：构建生产版本的应用

在项目根目录的命令行中，运行以下命令：

```bash
npm run build
```

这个命令会创建一个经过高度优化的生产版本，并存放在 `.next` 文件夹中。

### 第 4 步：在 IIS 中创建网站

1.  打开 IIS 管理器。
2.  在左侧“连接”窗格中，右键点击“网站”文件夹，选择“添加网站”。
3.  **配置网站信息**:
    *   **站点名称**: 为您的网站起一个描述性的名称，例如 `yyarena`。
    *   **物理路径**: 将其指向您项目的**根目录**，例如 `C:\inetpub\wwwroot\yyarena`。
    *   **绑定**:
        *   **类型**: 选择 `https`。
        *   **IP 地址**: 选择“全部未分配”。
        *   **端口**: 输入 `443`。
        *   **主机名**: 输入您的域名，例如 `your-domain.com`。
        *   **SSL 证书**: 选择您已经为域名准备好的 SSL 证书。

4.  点击“确定”创建网站。

### 第 5 步：配置虚拟目录以服务静态文件

这是确保用户上传的图片能够被正确访问的**关键步骤**。

1.  在 IIS 管理器中，右键点击您刚刚创建的网站 (`yyarena`)，选择“添加虚拟目录”。
2.  **创建 `uploads` 虚拟目录**:
    *   **别名**: `uploads`
    *   **物理路径**: `C:\inetpub\wwwroot\yyarena\public\uploads`

    **注意**: 现在所有用户上传的文件（包括二维码和比赛封面）都将统一存储在 `public/uploads` 目录下。因此，您只需要创建这一个虚拟目录。

### 第 6 步：配置 `web.config`

将本项目中 `deploy/iis/web.config` 文件复制到您网站的根目录 (`C:\inetpub\wwwroot\yyarena`)。IIS 会自动加载它。

这个 `web.config` 文件包含了 4 条核心规则，用于协同 IIS 和 Next.js：
1.  **强制 HTTPS**: 将所有 `http` 请求重定向到 `https`。
2.  **处理根目录**: 专门处理对主页的访问，将其转发给 Next.js。
3.  **服务物理文件**: 让 IIS 直接处理对图片等静态文件的请求，这一步依赖您创建的虚拟目录。
4.  **代理其他请求**: 将所有其他页面和 API 请求转发给在后台运行的 Next.js 应用。

### 第 7 步：使用 PM2 运行 Next.js 应用

为了确保您的 Next.js 应用能够在后台持续运行，并在崩溃时自动重启，我们强烈推荐使用进程管理器 `PM2`。

1.  在服务器的命令行中，全局安装 PM2：

    ```bash
    npm install pm2 -g
    ```

2.  在您项目的根目录中，使用 PM2 启动您的应用：

    ```bash
    pm2 start npm --name "yyarena" -- run start
    ```

    *   `--name "yyarena"`: 为您的应用进程起一个容易识别的名称。
    *   `-- run start`: 告诉 PM2 使用 `npm run start` 命令来启动应用。

3.  **设置开机自启 (可选但推荐)**:
    *   运行 `pm2 startup`。
    *   它会生成一条命令，请复制并在一个新的、具有管理员权限的命令行窗口中运行它。

## 3. 验证

1.  打开浏览器，访问 `https://your-domain.com`。
2.  网站应该能正常显示。
3.  尝试上传一张图片，图片应该能立刻显示出来。
4.  尝试在浏览器地址栏输入 `http://your-domain.com`，它应该会自动跳转到 `https` 地址。

至此，您的 Next.js 应用已成功部署在 IIS 上。
