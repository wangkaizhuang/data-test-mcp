# 安装指南

## 前置要求

- Node.js >= 18.0.0
- npm 或 yarn
- Git
- Cursor IDE

## 安装步骤

### 1. 安装项目依赖

```bash
cd data-testid-mcp
npm install
```

### 2. 编译项目

```bash
npm run build
```

### 3. 配置 Cursor MCP

#### 方法一：全局配置（推荐）

编辑 `~/.cursor/mcp.json`（如果不存在则创建）：

```json
{
  "mcpServers": {
    "testid-helper": {
      "command": "node",
      "args": ["/绝对路径/to/data-testid-mcp/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}",
        "GIT_REMOTE": "origin",
        "DEFAULT_BRANCH": "develop"
      }
    }
  }
}
```

**重要**: 将 `/绝对路径/to/data-testid-mcp/dist/index.js` 替换为实际的项目路径。

#### 方法二：项目级配置

在项目根目录创建 `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "testid-helper": {
      "command": "node",
      "args": ["${workspaceFolder}/data-testid-mcp/dist/index.js"],
      "env": {
        "BITBUCKET_BASE_URL": "https://code.fineres.com",
        "BITBUCKET_USERNAME": "kevin.king",
        "BITBUCKET_TOKEN": "BITBUCKET_TOKEN",
        "BITBUCKET_TARGET_PROJECT": "MUX",
        "GIT_REMOTE": "origin",
        "DEFAULT_BRANCH": "develop"
      }
    }
  }
}
```

### 4. 设置环境变量

#### macOS/Linux

在 `~/.zshrc` 或 `~/.bashrc` 中添加：

```bash
export BITBUCKET_BASE_URL=https://code.fineres.com
export BITBUCKET_USERNAME=kevin.king
# 使用 Personal Access Token (推荐)
export BITBUCKET_TOKEN=BITBUCKET_TOKEN
# 目标项目（Fork 仓库创建 PR 时的目标项目）
export BITBUCKET_TARGET_PROJECT=MUX
export GIT_REMOTE=origin
export DEFAULT_BRANCH=develop
```

然后执行：

```bash
source ~/.zshrc  # 或 source ~/.bashrc
```

#### Windows

在系统环境变量中设置，或在 PowerShell 中：

```powershell
$env:BITBUCKET_BASE_URL="https://code.fineres.com"
$env:BITBUCKET_USERNAME="kevin.king"
# 使用 Personal Access Token (推荐)
$env:BITBUCKET_TOKEN="BITBUCKET_TOKEN"
$env:GIT_REMOTE="origin"
$env:DEFAULT_BRANCH="develop"
```

### 5. 获取 Bitbucket 认证信息

#### 方法一：使用用户名和密码（不推荐，安全性较低）

直接使用 Bitbucket 用户名和密码，但建议使用方法二。

#### 方法二：使用 App Password（推荐）

1. 登录 Bitbucket Server
2. 进入个人设置 -> App Passwords
3. 创建新的 App Password，选择权限：
   - `Pull requests: Write` (创建 PR 需要)
   - `Repositories: Read` (读取仓库信息需要)
4. 复制生成的 App Password 并设置到 `BITBUCKET_TOKEN` 环境变量

**注意**: 
- `BITBUCKET_BASE_URL` 需要设置为你的 Bitbucket Server 地址（例如：`https://bitbucket.example.com`）
- 如果使用 App Password，设置 `BITBUCKET_TOKEN` 即可，不需要同时设置 `BITBUCKET_PASSWORD`

### 6. 重启 Cursor

完全关闭并重新打开 Cursor IDE，让 MCP 配置生效。

### 7. 验证安装

在 Cursor 的聊天界面中，尝试：

```
列出可用的 MCP 工具
```

或者直接测试：

```
使用 add_testid 工具添加 testid
```

如果看到工具列表或能够调用工具，说明安装成功！

## 故障排除

### 问题：MCP Server 无法启动

**检查项**:
1. 确认 `dist/index.js` 文件存在（运行 `npm run build`）
2. 确认路径配置正确（使用绝对路径）
3. 检查 Node.js 版本：`node --version`（需要 >= 18）

### 问题：找不到工具

**检查项**:
1. 确认 Cursor 已重启
2. 检查 `mcp.json` 格式是否正确（JSON 语法）
3. 查看 Cursor 的日志输出（通常在开发者工具中）

### 问题：Git 操作失败

**检查项**:
1. 确认当前目录是 Git 仓库
2. 检查 Git 配置：`git config --list`
3. 确认有推送到远程的权限

### 问题：无法创建 PR

**检查项**:
1. 确认 `BITBUCKET_USERNAME` 和 `BITBUCKET_PASSWORD` (或 `BITBUCKET_TOKEN`) 环境变量已设置
2. 确认 `BITBUCKET_BASE_URL` 环境变量已设置且正确
3. 确认认证信息有创建 Pull Request 的权限
4. 检查远程仓库 URL 格式是否正确（支持 scm、projects/repos、SSH 格式）
5. 如果自动解析失败，可以在调用 `create_pr` 时手动提供 `projectKey` 和 `repositorySlug`

## 开发模式

如果你想修改代码并实时测试：

```bash
# 开发模式（自动重新编译）
npm run dev
```

在另一个终端中，可以测试 MCP Server：

```bash
# 直接运行（用于测试）
node dist/index.js
```

## 更新

```bash
git pull
npm install
npm run build
```

然后重启 Cursor。

