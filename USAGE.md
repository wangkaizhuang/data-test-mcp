# TestID Helper MCP 使用指南

## 安装与配置

### 1. 安装依赖

```bash
npm install
npm run build
```

### 2. 配置 Cursor MCP

在 Cursor 的配置目录（通常是 `~/.cursor/mcp.json` 或项目根目录的 `.cursor/mcp.json`）中添加：

```json
{
  "mcpServers": {
    "testid-helper": {
      "command": "node",
      "args": ["/path/to/data-testid-mcp/dist/index.js"],
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

**注意**: 将 `/path/to/data-testid-mcp/dist/index.js` 替换为实际的项目路径。

### 3. 设置环境变量

创建 `.env` 文件或设置系统环境变量：

```bash
export BITBUCKET_BASE_URL=https://bitbucket.example.com
export BITBUCKET_USERNAME=your-username
export BITBUCKET_PASSWORD=your-password
# 或者使用 App Password (推荐)
export BITBUCKET_TOKEN=your-app-password
export GIT_REMOTE=origin
export DEFAULT_BRANCH=develop
```

## 使用流程

### 步骤 1: 在浏览器中选择元素

1. 打开浏览器开发者工具（F12）
2. 使用元素选择器选择目标元素
3. 在 Elements 面板中右键点击元素，选择 "Copy" -> "Copy selector" 或手动构建 DOM 路径

DOM 路径示例：
```
div#__next > div > div.fam:min-h-[100vh] > button.x-button
```

### 步骤 2: 在 Cursor 中调用 add_testid

在 Cursor 的聊天界面中，你可以这样表达需求：

```
请为这个元素添加 data-testid="share-button"：
DOM 路径: div#__next > button.x-button
组件名: ShareButton (可选)
```

或者直接使用工具：

```
使用 add_testid 工具：
- elementPath: "div#__next > button.x-button"
- testId: "share-button"
- componentName: "ShareButton" (可选)
```

### 步骤 3: 确认修改

Cursor 会自动：
1. 定位组件文件
2. 解析代码（使用 AST）
3. 找到匹配的元素
4. 添加 `data-testid` 属性
5. 显示修改预览

**请检查修改是否正确**，确认无误后继续下一步。

### 步骤 4: 提交代码

在 Cursor 中调用 `confirm_and_commit`：

```
使用 confirm_and_commit 工具：
- commitMessage: "test: add data-testid to market"
- branch: "feature/testid-share-button" (可选，会自动生成)
- autoPush: true (默认)
```

这会自动：
1. 创建新的 feature 分支
2. 提交更改
3. 推送到远程仓库

### 步骤 5: 创建 Pull Request

在 Cursor 中调用 `create_pr`：

```
使用 create_pr 工具：
- title: "Add data-testid to market"
- description: "为分享按钮添加 data-testid 属性，便于自动化测试"
- baseBranch: "develop" (默认)
```

## 工具说明

### add_testid

为指定元素添加 `data-testid` 属性。

**参数**:
- `elementPath` (必需): DOM 路径，例如 `"div#__next > button.x-button"`
- `testId` (必需): data-testid 的值，例如 `"share-button"`
- `componentName` (可选): React 组件名称，用于更精确的文件定位
- `componentFilePath` (可选): 组件文件路径，如果已知可直接提供

**示例**:
```json
{
  "elementPath": "div#__next > button.x-button",
  "testId": "share-button",
  "componentName": "ShareButton"
}
```

### confirm_and_commit

确认修改并提交代码到 Git。

**参数**:
- `commitMessage` (必需): 提交信息
- `branch` (可选): 分支名称，默认自动生成 `feature/testid-{timestamp}`
- `autoPush` (可选): 是否自动推送，默认 `true`

**示例**:
```json
{
  "commitMessage": "test: add data-testid to market",
  "branch": "feature/testid-share-button",
  "autoPush": true
}
```

### create_pr

创建 Pull Request。

**参数**:
- `title` (必需): PR 标题
- `description` (可选): PR 描述
- `baseBranch` (可选): 目标分支，默认 `develop`

**示例**:
```json
{
  "title": "Add data-testid to market",
  "description": "为分享按钮添加 data-testid 属性，便于自动化测试",
  "baseBranch": "develop"
}
```

## 注意事项

1. **元素定位**: 如果无法自动定位文件，请提供 `componentName` 或 `componentFilePath` 参数
2. **Git 权限**: 确保有推送到远程仓库的权限
3. **Bitbucket 认证**: 创建 PR 需要设置 `BITBUCKET_USERNAME` 和 `BITBUCKET_PASSWORD` (或 `BITBUCKET_TOKEN`) 环境变量
4. **Bitbucket URL**: 需要设置 `BITBUCKET_BASE_URL` 环境变量（例如：`https://bitbucket.example.com`）
5. **代码检查**: 修改代码后请仔细检查，确保没有破坏现有功能
6. **分支管理**: 每次修改会自动创建新的 feature 分支，避免冲突
7. **远程 URL 格式**: 支持以下格式的 Bitbucket Server URL：
   - `https://bitbucket.example.com/scm/PROJECT/REPO.git`
   - `https://bitbucket.example.com/projects/PROJECT/repos/REPO/browse`
   - `ssh://git@bitbucket.example.com:7999/PROJECT/REPO.git`

## 故障排除

### 问题: 无法定位组件文件

**解决方案**:
- 提供 `componentName` 参数
- 或直接提供 `componentFilePath` 参数

### 问题: 找不到匹配的元素

**可能原因**:
- DOM 路径不准确
- 元素是动态生成的
- 类名或 ID 在运行时才添加

**解决方案**:
- 检查 DOM 路径是否正确
- 尝试使用更具体的组件名称
- 手动指定文件路径

### 问题: Git 操作失败

**检查项**:
- 是否在 Git 仓库中
- 是否有未提交的更改冲突
- 是否有推送到远程的权限
- Bitbucket 认证信息是否正确

### 问题: 无法创建 Pull Request

**检查项**:
- `BITBUCKET_USERNAME` 和 `BITBUCKET_PASSWORD` (或 `BITBUCKET_TOKEN`) 是否已设置
- `BITBUCKET_BASE_URL` 是否已设置且正确
- 认证信息是否有创建 Pull Request 的权限
- 远程仓库 URL 格式是否正确
- 如果自动解析失败，尝试手动提供 `projectKey` 和 `repositorySlug`

## 完整示例

```
用户: 请为分享按钮添加 data-testid="share"

AI: 我来帮你添加 data-testid。请提供元素的 DOM 路径。

用户: div#app > header > button.share-btn

AI: [调用 add_testid 工具]
    成功！已为元素添加 data-testid="share"
    文件: src/components/Header.tsx
    请检查修改是否正确。

用户: 看起来没问题，提交代码吧

AI: [调用 confirm_and_commit 工具]
    代码已提交并推送到分支 feature/testid-1234567890

用户: 创建 PR

AI: [调用 create_pr 工具]
    成功创建 PR: https://github.com/owner/repo/pull/123
```

