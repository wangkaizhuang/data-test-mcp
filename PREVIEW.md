# 网页预览和元素选择功能

## 功能概述

现在你可以在 Cursor 中启动一个内置的预览服务器，直接在浏览器中预览你的前端应用，并通过可视化界面选择元素，然后自动将选中的元素信息发送到 Cursor。

## 使用步骤

### 1. 启动预览服务器

在 Cursor 的聊天界面中，输入：

```
启动预览服务器，目标 URL: http://localhost:3000
```

或者使用工具：

```
使用 start_preview 工具：
- targetUrl: "http://localhost:3000"
- port: 3001 (可选，默认 3001)
```

### 2. 打开预览页面

预览服务器启动后，会返回一个 URL（通常是 `http://localhost:3001`）。在浏览器中打开这个 URL。

### 3. 选择元素

1. 在预览页面中，你会看到你的前端应用
2. 点击页面右上角的"显示选择器"按钮，打开侧边栏
3. 鼠标悬停在页面元素上，元素会被高亮显示（蓝色边框）
4. 点击想要添加 `data-testid` 的元素
5. 在侧边栏中：
   - 查看自动生成的 DOM 路径
   - （可选）输入组件名称
   - 输入 `data-testid` 的值
6. 点击"添加到 Cursor"按钮

### 4. 在 Cursor 中处理

元素信息会自动发送到 Cursor。你可以：

1. **查看选中的元素**：
   ```
   获取选中的元素信息
   ```
   或使用 `get_selected_element` 工具

2. **添加 testid**：
   ```
   为刚才选中的元素添加 data-testid
   ```
   或直接使用 `add_testid` 工具，参数会自动填充

3. **确认并提交**：
   ```
   确认并提交，提交信息：test: add data-testid to button
   ```

## 功能特点

- ✅ **可视化选择**：直接在网页上点击选择元素，无需手动复制 DOM 路径
- ✅ **实时预览**：在 Cursor 中预览你的前端应用
- ✅ **自动填充**：选中的元素信息自动填充到 Cursor
- ✅ **无缝集成**：与现有的 `add_testid`、`confirm_and_commit`、`create_pr` 工具完美配合

## 技术实现

预览服务器使用以下技术：

- **HTTP 服务器**：提供预览页面和 API
- **WebSocket**：实现实时通信，将选中的元素信息发送到 Cursor
- **iframe**：嵌入目标网页进行预览
- **元素选择器脚本**：注入到目标页面，实现元素高亮和选择

## 注意事项

1. **跨域限制**：如果目标页面有跨域限制，可能无法完全访问 iframe 内容。建议：
   - 在开发环境中使用
   - 确保目标页面允许 iframe 嵌入
   - 或者使用代理模式

2. **端口冲突**：如果默认端口 3001 被占用，可以指定其他端口：
   ```
   启动预览服务器，目标 URL: http://localhost:3000，端口: 3002
   ```

3. **元素选择**：DOM 路径是自动生成的，如果不够准确，可以手动调整或提供 `componentName` 和 `componentFilePath` 参数。

## 完整工作流程示例

```
1. 用户：启动预览服务器，目标 URL: http://localhost:3000
   → Cursor: 预览服务器已启动，URL: http://localhost:3001

2. 用户在浏览器中打开 http://localhost:3001
   → 看到前端应用预览

3. 用户点击页面中的"分享"按钮
   → 侧边栏显示：DOM 路径: div#app > button.share-btn
   → 用户输入 testId: "share-button"
   → 点击"添加到 Cursor"

4. 用户：获取选中的元素
   → Cursor: 已选择元素，DOM 路径: div#app > button.share-btn，testId: share-button

5. 用户：为这个元素添加 data-testid
   → Cursor: 自动调用 add_testid 工具，添加成功

6. 用户：确认并提交，提交信息：test: add data-testid to market
   → Cursor: 代码已提交并推送到分支 feature/testid-xxx

7. 用户：创建 PR，标题：Add data-testid to market
   → Cursor: 成功创建 Pull Request
```

## 故障排除

### 问题：无法访问 iframe 内容

**原因**：跨域限制

**解决方案**：
- 确保目标页面允许 iframe 嵌入
- 在开发环境中使用（通常没有跨域限制）
- 检查浏览器控制台的错误信息

### 问题：WebSocket 连接失败

**原因**：预览服务器未启动或端口被占用

**解决方案**：
- 确认预览服务器已启动
- 检查端口是否被占用
- 尝试使用其他端口

### 问题：元素选择不准确

**原因**：DOM 路径生成算法限制

**解决方案**：
- 手动调整 DOM 路径
- 提供 `componentName` 参数帮助定位
- 直接提供 `componentFilePath` 参数

