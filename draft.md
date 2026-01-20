# 测试元素 data-testid 自动化添加 MCP 方案设计

## 一、方案概述

设计一个基于 MCP (Model Context Protocol) 的自动化工具，让测试人员能够通过简单的交互流程，自动为前端元素添加 `data-testid` 属性，并完成代码提交、推送和 PR 创建。

## 二、系统架构

### 2.1 整体架构图

```
┌─────────────────┐
│   测试人员      │
│  (浏览器环境)   │
└────────┬────────┘
         │ 1. 选择元素
         │ 2. 输入 testid 值
         ▼
┌─────────────────┐
│  浏览器扩展/    │
│  开发者工具     │
│  (Element Picker)│
└────────┬────────┘
         │ 3. 发送元素信息
         ▼
┌─────────────────┐
│  MCP Server     │
│  (TestID Helper)│
└────────┬────────┘
         │ 4. 调用 Cursor API
         ▼
┌─────────────────┐
│   Cursor AI     │
│  (代码修改)     │
└────────┬────────┘
         │ 5. 修改代码
         ▼
┌─────────────────┐
│   测试人员      │
│  (确认修改)     │
└────────┬────────┘
         │ 6. 确认无误
         ▼
┌─────────────────┐
│  Git 自动化     │
│  (Commit/Push/PR)│
└─────────────────┘
```

### 2.2 核心组件

1. **MCP Server (testid-helper-mcp)**
   - 接收元素选择信息
   - 解析 DOM 路径和组件信息
   - 调用 Cursor 进行代码修改
   - 执行 Git 操作

2. **浏览器扩展/工具**
   - 元素选择器
   - DOM 路径提取
   - React 组件信息获取
   - 与 MCP Server 通信

3. **Cursor 集成**
   - 接收修改请求
   - 定位代码文件
   - 自动添加 data-testid
   - 代码格式化

4. **Git 自动化**
   - 自动 commit
   - 自动 push
   - 自动创建 PR

## 三、技术实现方案

### 3.1 MCP Server 实现

#### 3.1.1 项目结构

```
testid-helper-mcp/
├── src/
│   ├── index.ts              # MCP Server 入口
│   ├── tools/
│   │   ├── addTestId.ts      # 添加 testid 工具
│   │   ├── gitOps.ts         # Git 操作工具
│   │   └── elementParser.ts  # 元素解析工具
│   ├── utils/
│   │   ├── cursorClient.ts   # Cursor API 客户端
│   │   └── fileLocator.ts    # 文件定位工具
│   └── types/
│       └── element.ts        # 类型定义
├── package.json
└── tsconfig.json
```

#### 3.1.2 MCP Tools 定义

```typescript
// MCP Tools 列表
{
  "add_testid": {
    description: "为指定元素添加 data-testid 属性",
    inputSchema: {
      type: "object",
      properties: {
        elementPath: {
          type: "string",
          description: "DOM 路径（从浏览器开发者工具获取）"
        },
        testId: {
          type: "string",
          description: "要添加的 data-testid 值"
        },
        componentInfo: {
          type: "object",
          description: "React 组件信息（可选）"
        }
      },
      required: ["elementPath", "testId"]
    }
  },
  "confirm_and_commit": {
    description: "确认修改并提交代码",
    inputSchema: {
      type: "object",
      properties: {
        commitMessage: {
          type: "string",
          description: "提交信息"
        },
        branch: {
          type: "string",
          description: "目标分支（默认：feature/testid-{timestamp}）"
        }
      }
    }
  },
  "create_pr": {
    description: "创建 Pull Request",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "PR 标题"
        },
        description: {
          type: "string",
          description: "PR 描述"
        },
        baseBranch: {
          type: "string",
          description: "目标分支（默认：develop）"
        }
      }
    }
  }
}
```

### 3.2 浏览器扩展实现

#### 3.2.1 功能需求

1. **元素选择器**
   - 鼠标悬停高亮
   - 点击选择元素
   - 显示元素信息

2. **信息提取**
   - DOM 路径（完整选择器路径）
   - React 组件名称
   - 组件文件路径（通过 source map）
   - 当前属性列表

3. **与 MCP 通信**
   - WebSocket 或 HTTP 连接
   - 发送元素信息
   - 接收修改结果

#### 3.2.2 实现方式

**方案 A：浏览器扩展（推荐）**

```javascript
// content-script.js
class ElementPicker {
  constructor() {
    this.selectedElement = null;
    this.mcpClient = new MCPClient('ws://localhost:3001');
  }

  enable() {
    document.addEventListener('mouseover', this.highlightElement);
    document.addEventListener('click', this.selectElement);
  }

  highlightElement(e) {
    // 高亮当前元素
    e.target.style.outline = '2px solid #007bff';
  }

  selectElement(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const elementInfo = this.extractElementInfo(e.target);
    this.showDialog(elementInfo);
  }

  extractElementInfo(element) {
    return {
      domPath: this.getDOMPath(element),
      componentName: this.getReactComponent(element),
      attributes: Array.from(element.attributes).map(attr => ({
        name: attr.name,
        value: attr.value
      })),
      position: element.getBoundingClientRect()
    };
  }

  async sendToMCP(elementInfo, testId) {
    const result = await this.mcpClient.call('add_testid', {
      elementPath: elementInfo.domPath,
      testId: testId,
      componentInfo: elementInfo
    });
    return result;
  }
}
```

**方案 B：开发者工具面板**

使用 Chrome DevTools Protocol 或 React DevTools 扩展 API。

### 3.3 元素定位策略

#### 3.3.1 DOM 路径解析

```typescript
// elementParser.ts
export function parseDOMPath(domPath: string): ElementLocation {
  // 解析类似这样的路径：
  // "div#__next > div > div.fam:min-h-[100vh] > button.x-button"
  
  const parts = domPath.split(' > ');
  const selectors = parts.map(part => {
    // 提取 ID、类名、标签名
    const idMatch = part.match(/#([\w-]+)/);
    const classMatch = part.match(/\.([\w:-]+)/);
    const tagMatch = part.match(/^(\w+)/);
    
    return {
      tag: tagMatch?.[1],
      id: idMatch?.[1],
      classes: classMatch ? [classMatch[1]] : []
    };
  });
  
  return { selectors, fullPath: domPath };
}
```

#### 3.3.2 代码文件定位

```typescript
// fileLocator.ts
export async function locateComponentFile(
  componentName: string,
  domPath: string
): Promise<string | null> {
  // 策略 1: 通过组件名称搜索
  const filesByComponent = await searchFiles(`export.*${componentName}`);
  
  // 策略 2: 通过 DOM 路径中的类名搜索
  const className = extractClassName(domPath);
  const filesByClass = await searchFiles(className);
  
  // 策略 3: 通过 React DevTools 获取组件文件路径
  const reactPath = await getReactComponentPath(componentName);
  
  // 综合判断，返回最可能的文件
  return selectBestMatch(filesByComponent, filesByClass, reactPath);
}
```

### 3.4 Cursor 集成

#### 3.4.1 代码修改流程

```typescript
// addTestId.ts
export async function addTestIdToElement(
  filePath: string,
  elementInfo: ElementInfo,
  testId: string
): Promise<ModificationResult> {
  // 1. 读取文件
  const fileContent = await readFile(filePath);
  
  // 2. 解析 AST（使用 @babel/parser 或 TypeScript compiler API）
  const ast = parseCode(fileContent);
  
  // 3. 定位目标元素对应的 JSX
  const targetNode = findJSXNode(ast, elementInfo);
  
  // 4. 检查是否已有 data-testid
  if (hasTestId(targetNode, testId)) {
    return { success: false, message: 'data-testid already exists' };
  }
  
  // 5. 添加 data-testid 属性
  const modifiedAst = addAttribute(targetNode, 'data-testid', testId);
  
  // 6. 生成新代码
  const newCode = generateCode(modifiedAst);
  
  // 7. 格式化代码
  const formattedCode = formatCode(newCode);
  
  return {
    success: true,
    filePath,
    diff: generateDiff(fileContent, formattedCode),
    preview: formattedCode
  };
}
```

#### 3.4.2 使用 Cursor API

```typescript
// cursorClient.ts
export class CursorClient {
  async applyCodeChange(
    filePath: string,
    changes: CodeChange[]
  ): Promise<void> {
    // 通过 Cursor 的 MCP 接口或直接文件操作
    // 方案 1: 使用 Cursor 的编辑 API（如果提供）
    // 方案 2: 直接修改文件，Cursor 会自动检测
    
    for (const change of changes) {
      await this.writeFile(filePath, change.content);
    }
  }
  
  async showPreview(diff: string): Promise<void> {
    // 在 Cursor 中显示预览
    // 可以通过 MCP 的 prompt 功能
  }
}
```

### 3.5 Git 自动化

#### 3.5.1 Git 操作流程

```typescript
// gitOps.ts
export class GitOperations {
  async commitChanges(
    files: string[],
    message: string
  ): Promise<void> {
    // 1. 检查工作区状态
    const status = await exec('git status --porcelain');
    
    // 2. 添加文件
    await exec(`git add ${files.join(' ')}`);
    
    // 3. 提交
    await exec(`git commit -m "${message}"`);
  }
  
  async pushToRemote(
    branch: string,
    remote: string = 'origin'
  ): Promise<void> {
    // 1. 创建分支（如果不存在）
    const branchExists = await this.branchExists(branch);
    if (!branchExists) {
      await exec(`git checkout -b ${branch}`);
    }
    
    // 2. 推送
    await exec(`git push ${remote} ${branch}`);
  }
  
  async createPullRequest(
    title: string,
    description: string,
    baseBranch: string = 'develop'
  ): Promise<string> {
    // 使用 GitHub/GitLab API 创建 PR
    const response = await fetch('https://api.github.com/repos/owner/repo/pulls', {
      method: 'POST',
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        body: description,
        head: await this.getCurrentBranch(),
        base: baseBranch
      })
    });
    
    const pr = await response.json();
    return pr.html_url;
  }
}
```

## 四、使用流程

### 4.1 完整交互流程

```
1. 测试人员打开浏览器，访问应用
   ↓
2. 打开浏览器扩展/开发者工具
   ↓
3. 启用"元素选择模式"
   ↓
4. 鼠标悬停在目标元素上（高亮显示）
   ↓
5. 点击选择元素
   ↓
6. 弹出对话框，显示元素信息：
   - DOM 路径
   - React 组件名称
   - 当前属性
   ↓
7. 输入 data-testid 值（例如："share"）
   ↓
8. 点击"添加 testid"按钮
   ↓
9. 扩展将信息发送到 MCP Server
   ↓
10. MCP Server 调用 Cursor 进行代码修改
   ↓
11. Cursor 在编辑器中打开相关文件，显示修改预览
   ↓
12. 测试人员确认修改无误
   ↓
13. 点击"确认并提交"
   ↓
14. 自动执行：
    - git commit -m "test: add data-testid='share' to market"
    - git push origin feature/testid-20250101-001
    - 创建 PR
   ↓
15. 返回 PR 链接，测试人员可以查看和合并
```

### 4.2 命令行使用（备选方案）

如果浏览器扩展实现复杂，也可以提供命令行工具：

```bash
# 安装 MCP Server
npm install -g testid-helper-mcp

# 启动服务
testid-helper-mcp start

# 在浏览器控制台中使用
window.testidHelper.addTestId({
  elementPath: "div#__next > button.x-button",
  testId: "share"
});
```

## 五、配置与部署

### 5.1 MCP Server 配置

在 `.cursor/mcp.json` 中添加：

```json
{
  "mcpServers": {
    "testid-helper": {
      "command": "npx",
      "args": ["-y", "testid-helper-mcp"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}",
        "GIT_REMOTE": "origin",
        "DEFAULT_BRANCH": "develop"
      }
    }
  }
}
```

### 5.2 环境变量

```bash
# .env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GIT_REMOTE=origin
DEFAULT_BRANCH=develop
AUTO_COMMIT=true
AUTO_PUSH=true
AUTO_CREATE_PR=true
```

### 5.3 浏览器扩展配置

```json
{
  "manifest_version": 3,
  "name": "TestID Helper",
  "version": "1.0.0",
  "permissions": ["activeTab", "storage"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content-script.js"]
  }],
  "background": {
    "service_worker": "background.js"
  }
}
```

## 六、技术难点与解决方案

### 6.1 元素到代码的映射

**难点**: 从 DOM 元素定位到源代码文件中的具体位置。

**解决方案**:
1. 使用 React DevTools 获取组件信息
2. 通过 Source Map 映射到源文件
3. 使用 AST 解析定位 JSX 节点
4. 结合类名、ID、组件名多重匹配

### 6.2 代码修改的准确性

**难点**: 确保修改的代码位置正确，不影响其他功能。

**解决方案**:
1. 使用 AST 而非正则表达式
2. 检查修改前后的语法正确性
3. 提供预览和确认机制
4. 自动运行 lint 检查

### 6.3 Git 操作的安全性

**难点**: 自动化 Git 操作需要权限和安全性考虑。

**解决方案**:
1. 使用独立的 feature 分支
2. 需要用户确认后才执行 push
3. PR 需要人工审核
4. 记录所有操作日志

## 七、可行性分析

### 7.1 技术可行性 ✅

- **MCP Protocol**: 已成熟，Cursor 已支持
- **元素选择**: 浏览器 API 完善
- **代码解析**: Babel/TypeScript 工具链成熟
- **Git 操作**: Node.js 有完善的 Git 库（simple-git）

### 7.2 实现复杂度

| 组件 | 复杂度 | 预估时间 |
|------|--------|----------|
| MCP Server 基础框架 | 低 | 1-2天 |
| 元素解析与定位 | 中 | 3-5天 |
| Cursor 集成 | 中 | 2-3天 |
| 浏览器扩展 | 中高 | 5-7天 |
| Git 自动化 | 低 | 1-2天 |
| **总计** | **中** | **12-19天** |

### 7.3 潜在风险

1. **元素定位不准确**: 可能导致修改错误位置
   - 缓解: 提供预览和确认机制

2. **代码冲突**: 多人同时修改同一文件
   - 缓解: 使用分支，PR 前检查冲突

3. **权限问题**: Git 操作需要相应权限
   - 缓解: 使用个人 token，限制权限范围

## 八、MVP 版本（最小可行产品）

### 8.1 第一阶段：核心功能

1. ✅ MCP Server 基础框架
2. ✅ 命令行工具接收元素信息
3. ✅ 代码文件定位和修改
4. ✅ 手动确认后提交代码

### 8.2 第二阶段：增强体验

1. 浏览器扩展
2. 可视化元素选择
3. 自动 Git 操作
4. PR 自动创建

### 8.3 第三阶段：智能化

1. 智能 testid 命名建议
2. 批量添加 testid
3. testid 冲突检测
4. 测试用例自动生成

## 九、替代方案

### 9.1 简化方案：直接使用 Cursor 对话

如果 MCP Server 实现复杂，可以简化为：

1. 测试人员在浏览器中选择元素，复制 DOM 路径
2. 在 Cursor 中直接对话："给这个元素添加 data-testid='share'：`[粘贴 DOM 路径]`"
3. Cursor 自动修改代码
4. 手动执行 Git 操作

**优点**: 实现简单，无需额外开发
**缺点**: 需要手动操作，体验不够流畅

### 9.2 混合方案

结合两种方式：
- 简单场景：使用 Cursor 对话
- 批量场景：使用 MCP 工具

## 十、总结

### 10.1 方案优势

1. ✅ **自动化程度高**: 从元素选择到 PR 创建全流程自动化
2. ✅ **用户体验好**: 可视化操作，无需手动编辑代码
3. ✅ **准确性高**: 使用 AST 确保代码修改正确
4. ✅ **可扩展**: 可以扩展支持其他测试属性

### 10.2 推荐实施路径

1. **第一步**: 实现 MVP 版本（命令行工具 + Cursor 集成）
2. **第二步**: 开发浏览器扩展，提升用户体验
3. **第三步**: 完善 Git 自动化流程
4. **第四步**: 添加智能化和批量处理功能

### 10.3 结论

**该方案在技术上完全可行**，主要工作量在于：
- 元素定位的准确性（需要充分测试）
- 浏览器扩展的开发（可选，可先用命令行工具）
- Git 操作的安全性（需要权限管理和确认机制）

建议先实现 MVP 版本验证可行性，再逐步完善功能。

