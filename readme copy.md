# TestID Helper MCP

一个基于 MCP (Model Context Protocol) 的自动化工具，让测试人员能够通过简单的交互流程，自动为前端元素添加 `data-testid` 属性，并完成代码提交、推送和 PR 创建。

## 功能特性

- ✅ **内置网页预览**: 在 Cursor 中启动预览服务器，直接在浏览器中预览前端应用
- ✅ **可视化元素选择**: 点击页面元素即可选择，无需手动复制 DOM 路径
- ✅ **自动元素定位**: 根据 DOM 路径和组件信息自动定位源代码文件
- ✅ **AST 代码修改**: 使用 Babel AST 精确修改代码，确保语法正确
- ✅ **Git 自动化**: 自动创建分支、提交、推送和创建 PR
- ✅ **安全确认机制**: 修改前预览，确认后才提交
- ✅ **支持 React/TypeScript**: 支持 JSX/TSX 文件

## 快速开始

### 安装

```bash
# 克隆或下载项目
cd data-testid-mcp

# 安装依赖
npm install

# 编译 TypeScript
npm run build
```

### 配置 Cursor

1. 在 Cursor 配置目录（`~/.cursor/mcp.json` 或项目 `.cursor/mcp.json`）中添加：

```json
{
  "mcpServers": {
    "testid-helper": {
      "command": "node",
      "args": ["/绝对路径/to/data-testid-mcp/dist/index.js"],
      "env": {
        "BITBUCKET_BASE_URL": "https://bitbucket.example.com",
        "BITBUCKET_USERNAME": "${BITBUCKET_USERNAME}",
        "BITBUCKET_PASSWORD": "${BITBUCKET_PASSWORD}",
        "BITBUCKET_TOKEN": "${BITBUCKET_TOKEN}",
        "GIT_REMOTE": "origin",
        "DEFAULT_BRANCH": "develop"
      }
    }
  }
}
```

2. 设置环境变量（创建 PR 需要）：

```bash
export BITBUCKET_BASE_URL=https://bitbucket.example.com
export BITBUCKET_USERNAME=your-username
export BITBUCKET_PASSWORD=your-password
# 或者使用 App Password (推荐)
export BITBUCKET_TOKEN=your-app-password
```

3. 重启 Cursor

### 使用流程

#### 方式一：使用内置预览（推荐）✨

1. **启动预览服务器**：
   ```
   启动预览服务器，目标 URL: http://localhost:3000
   ```

2. **在浏览器中打开预览页面**（通常是 `http://localhost:3001`）

3. **选择元素**：
   - 点击页面中的元素（元素会被高亮显示）
   - 在侧边栏中输入 `data-testid` 值
   - 点击"添加到 Cursor"按钮

4. **在 Cursor 中处理**：
   ```
   为刚才选中的元素添加 data-testid
   ```
   或使用 `get_selected_element` 工具获取元素信息

5. **检查修改预览**，确认无误

6. **提交代码**：
   ```
   确认并提交，提交信息：test: add data-testid to market
   ```

7. **创建 PR**（可选）：
   ```
   创建 PR，标题：Add data-testid to market
   ```

#### 方式二：手动提供 DOM 路径

1. **在浏览器中选择元素**，获取 DOM 路径（例如：`div#__next > button.x-button`）

2. **在 Cursor 中表达需求**：
   ```
   请为这个元素添加 data-testid="share-button"：
   DOM 路径: div#__next > button.x-button
   ```

3. **检查修改预览**，确认无误

4. **提交代码**：
   ```
   确认并提交，提交信息：test: add data-testid to market
   ```

5. **创建 PR**（可选）：
   ```
   创建 PR，标题：Add data-testid to market
   ```

详细使用说明请参考：
- [USAGE.md](./USAGE.md) - 基础使用指南
- [PREVIEW.md](./PREVIEW.md) - 预览功能详细说明

## 项目结构

```
data-testid-mcp/
├── src/
│   ├── index.ts              # MCP Server 入口
│   ├── tools/
│   │   ├── addTestId.ts      # 添加 testid 工具
│   │   ├── gitOps.ts         # Git 操作工具
│   │   ├── elementParser.ts  # 元素解析工具
│   │   └── previewServer.ts  # 预览服务器工具
│   ├── utils/
│   │   └── fileLocator.ts    # 文件定位工具
│   └── types/
│       └── element.ts        # 类型定义
├── package.json
├── tsconfig.json
├── README.md
├── USAGE.md                  # 基础使用指南
└── PREVIEW.md                # 预览功能详细说明
```

## MCP 工具

### 1. start_preview ✨

启动网页预览服务器，可以在浏览器中可视化选择元素。

**参数**:

- `targetUrl` (必需): 要预览的网页 URL（例如：`http://localhost:3000`）
- `port` (可选): 预览服务器端口（默认：3001）

**示例**:
```
启动预览服务器，目标 URL: http://localhost:3000
```

### 2. get_selected_element ✨

获取预览服务器中选中的元素信息。

**参数**: 无

**示例**:
```
获取选中的元素信息
```

### 3. add_testid

为指定元素添加 `data-testid` 属性。

**参数**:

- `elementPath` (必需): DOM 路径
- `testId` (必需): data-testid 值
- `componentName` (可选): React 组件名称
- `componentFilePath` (可选): 组件文件路径

**示例**:
```
为这个元素添加 data-testid="share-button"：
DOM 路径: div#__next > button.x-button
```

### 4. confirm_and_commit

确认修改并提交代码。

**参数**:

- `commitMessage` (必需): 提交信息
- `branch` (可选): 分支名称（默认：`feature/testid-{timestamp}`）
- `autoPush` (可选): 是否自动推送（默认：true）

**示例**:
```
确认并提交，提交信息：test: add data-testid to market
```

### 5. create_pr

创建 Pull Request（Bitbucket Server）。

**参数**:

- `title` (必需): PR 标题
- `description` (可选): PR 描述
- `baseBranch` (可选): 目标分支（默认：develop）
- `projectKey` (可选): Bitbucket 项目 Key
- `repositorySlug` (可选): Bitbucket 仓库 Slug
- `baseUrl` (可选): Bitbucket Server 基础 URL

**示例**:
```
创建 PR，标题：Add data-testid to market
```

## 技术栈

- **MCP SDK**: Model Context Protocol 官方 SDK
- **Babel**: 代码解析和转换
- **simple-git**: Git 操作
- **WebSocket (ws)**: 实时通信
- **TypeScript**: 类型安全

## 开发

```bash
# 开发模式（自动重新编译）
npm run dev

# 构建
npm run build

# 运行
npm start
```

## 注意事项

1. **预览功能**: 推荐使用内置预览功能，可以可视化选择元素，无需手动复制 DOM 路径
2. **跨域限制**: 如果目标页面有跨域限制，可能无法完全访问 iframe 内容。建议在开发环境中使用
3. **元素定位**: 如果无法自动定位，请提供 `componentName` 或 `componentFilePath`
4. **Git 权限**: 确保有推送到远程仓库的权限
5. **Bitbucket 认证**: 创建 PR 需要设置 `BITBUCKET_USERNAME` 和 `BITBUCKET_PASSWORD` (或 `BITBUCKET_TOKEN`)
6. **Bitbucket URL**: 需要设置 `BITBUCKET_BASE_URL` 环境变量
7. **代码检查**: 修改后请仔细检查，确保没有破坏现有功能
8. **远程 URL 格式**: 支持 Bitbucket Server 的多种 URL 格式（scm、projects/repos、SSH）

## 故障排除

### 无法定位组件文件

- 提供 `componentName` 参数
- 或直接提供 `componentFilePath` 参数

### 找不到匹配的元素

- 检查 DOM 路径是否正确
- 尝试使用更具体的组件名称
- 手动指定文件路径

### Git 操作失败

- 检查是否在 Git 仓库中
- 检查是否有未提交的更改冲突
- 检查是否有推送到远程的权限
- 检查 Bitbucket 认证信息是否正确

### 无法创建 Pull Request

- 检查 `BITBUCKET_USERNAME` 和 `BITBUCKET_PASSWORD` (或 `BITBUCKET_TOKEN`) 是否已设置
- 检查 `BITBUCKET_BASE_URL` 是否已设置且正确
- 检查远程仓库 URL 格式是否正确
- 如果自动解析失败，尝试手动提供 `projectKey` 和 `repositorySlug`

### 预览服务器无法启动

- 检查端口是否被占用（默认 3001）
- 尝试使用其他端口：`启动预览服务器，目标 URL: http://localhost:3000，端口: 3002`
- 检查防火墙设置

### 无法在预览页面中选择元素

- 确保目标页面允许 iframe 嵌入
- 检查浏览器控制台的错误信息
- 如果目标页面有跨域限制，建议在开发环境中使用

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
