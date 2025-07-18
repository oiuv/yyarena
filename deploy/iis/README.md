## IIS 部署配置

此目录包含专门用于在 Windows Server 上使用 Internet Information Services (IIS) 部署 YYArena 应用程序的配置文件和说明。

### `web.config`

此目录中的 `web.config` 文件由 IIS 用于充当 Next.js 应用程序的反向代理。它包含 URL 重写规则，将传入的 HTTP 请求转发到运行 Next.js 应用程序的 Node.js 服务器（通常在 `http://localhost:3000` 上）。

**用法：**
1.  确保您的 Windows Server 上已安装 IIS。
2.  安装 IIS 的 URL 重写模块。
3.  将此 `web.config` 文件放置在您的 IIS 网站的根目录中（该目录应指向您的 Next.js 构建的 `public` 目录）。
4.  确保您的 Next.js 应用程序作为 Node.js 进程（例如，使用 NSSM 作为 Windows 服务）在 `web.config` 中指定的端口（默认为 3000）上运行。

有关详细的部署步骤，请参阅项目的部署文档或查阅 IIS 部署指南。