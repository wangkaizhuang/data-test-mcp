/**
 * 预览服务器工具
 * 提供网页预览和元素选择功能
 */
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export class PreviewServer {
    httpServer = null;
    wsServer = null;
    port;
    targetUrl;
    clients = new Set();
    selectedElement = null;
    constructor(config = {}) {
        this.port = config.port || 3001;
        this.targetUrl = config.targetUrl || 'http://localhost:3000';
    }
    /**
     * 启动预览服务器
     */
    async start() {
        return new Promise((resolve, reject) => {
            this.httpServer = createServer(async (req, res) => {
                try {
                    await this.handleRequest(req, res);
                }
                catch (error) {
                    console.error('Request error:', error);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                }
            });
            // 启动 WebSocket 服务器
            this.wsServer = new WebSocketServer({ server: this.httpServer });
            this.wsServer.on('connection', (ws) => {
                this.clients.add(ws);
                console.error('WebSocket client connected');
                // 发送当前选中的元素（如果有）
                if (this.selectedElement) {
                    ws.send(JSON.stringify({
                        type: 'element-selected',
                        data: this.selectedElement
                    }));
                }
                ws.on('message', async (message) => {
                    try {
                        const data = JSON.parse(message.toString());
                        await this.handleWebSocketMessage(ws, data);
                    }
                    catch (error) {
                        console.error('WebSocket message error:', error);
                    }
                });
                ws.on('close', () => {
                    this.clients.delete(ws);
                    console.error('WebSocket client disconnected');
                });
            });
            this.httpServer.listen(this.port, () => {
                const url = `http://localhost:${this.port}`;
                console.error(`Preview server started at ${url}`);
                resolve({ url, port: this.port });
            });
            this.httpServer.on('error', (error) => {
                reject(error);
            });
        });
    }
    /**
     * 处理 HTTP 请求
     */
    async handleRequest(req, res) {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        // CORS 头
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        // 提供预览页面
        if (url.pathname === '/' || url.pathname === '/preview') {
            const html = await this.getPreviewHTML();
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
            return;
        }
        // 提供可注入到目标网页的脚本
        if (url.pathname === '/inject-script.js') {
            const script = this.getInjectScript();
            res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
            res.end(script);
            return;
        }
        // 提供书签工具（bookmarklet）
        if (url.pathname === '/bookmarklet.js') {
            const bookmarklet = this.getBookmarklet();
            res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
            res.end(bookmarklet);
            return;
        }
        // 提供元素选择器脚本（控制页面使用）
        if (url.pathname === '/element-picker.js') {
            const script = await this.getElementPickerScript();
            res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
            res.end(script);
            return;
        }
        // 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
    /**
     * 处理 WebSocket 消息
     */
    async handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'element-selected':
                this.selectedElement = {
                    elementPath: data.elementPath,
                    componentName: data.componentName,
                    testId: data.testId
                };
                // 广播给所有客户端
                this.broadcast({
                    type: 'element-selected',
                    data: this.selectedElement
                });
                break;
            case 'get-selected-element':
                if (this.selectedElement) {
                    ws.send(JSON.stringify({
                        type: 'element-selected',
                        data: this.selectedElement
                    }));
                }
                break;
            default:
                console.error('Unknown message type:', data.type);
        }
    }
    /**
     * 广播消息给所有客户端
     */
    broadcast(message) {
        const data = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }
    /**
     * 获取控制页面 HTML（新方案：脚本注入）
     */
    async getPreviewHTML() {
        const injectScriptUrl = `http://localhost:${this.port}/inject-script.js`;
        const bookmarkletUrl = `http://localhost:${this.port}/bookmarklet.js`;
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TestID Helper - 元素选择器控制面板</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header {
      background: #252526;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .header h1 {
      color: #4ec9b0;
      margin-bottom: 12px;
      font-size: 24px;
    }
    
    .header p {
      color: #858585;
      font-size: 14px;
      line-height: 1.6;
    }
    
    .section {
      background: #252526;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .section h2 {
      color: #4ec9b0;
      margin-bottom: 16px;
      font-size: 18px;
    }
    
    .section h3 {
      color: #d4d4d4;
      margin-bottom: 12px;
      font-size: 16px;
      margin-top: 16px;
    }
    
    .step {
      margin-bottom: 16px;
      padding: 12px;
      background: #1e1e1e;
      border-radius: 4px;
      border-left: 3px solid #007acc;
    }
    
    .step-number {
      display: inline-block;
      background: #007acc;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      text-align: center;
      line-height: 24px;
      font-size: 12px;
      font-weight: bold;
      margin-right: 8px;
    }
    
    .code-block {
      background: #1e1e1e;
      border: 1px solid #3e3e42;
      border-radius: 4px;
      padding: 12px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      overflow-x: auto;
      margin: 12px 0;
      position: relative;
    }
    
    .code-block code {
      color: #d4d4d4;
      white-space: pre;
    }
    
    .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #0e639c;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    }
    
    .copy-btn:hover {
      background: #1177bb;
    }
    
    .btn {
      background: #0e639c;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
      margin-right: 8px;
      margin-bottom: 8px;
    }
    
    .btn:hover {
      background: #1177bb;
    }
    
    .btn-secondary {
      background: #3c3c3c;
    }
    
    .btn-secondary:hover {
      background: #4a4a4a;
    }
    
    .info-item {
      margin-bottom: 16px;
    }
    
    .info-label {
      font-size: 12px;
      color: #858585;
      margin-bottom: 4px;
    }
    
    .info-value {
      background: #1e1e1e;
      padding: 8px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      word-break: break-all;
      border: 1px solid #3e3e42;
    }
    
    .testid-input {
      width: 100%;
      background: #3c3c3c;
      border: 1px solid #3e3e42;
      color: #d4d4d4;
      padding: 8px;
      border-radius: 4px;
      font-size: 14px;
      margin-top: 8px;
    }
    
    .status {
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    
    .status.info {
      background: #1e3a5f;
      color: #4fc3f7;
    }
    
    .status.success {
      background: #1e4d2e;
      color: #81c784;
    }
    
    .status.error {
      background: #5a1e1e;
      color: #e57373;
    }
    
    .status.warning {
      background: #5a4d1e;
      color: #ffd54f;
    }
    
    .bookmarklet-link {
      display: inline-block;
      background: #0e639c;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      text-decoration: none;
      margin-top: 8px;
    }
    
    .bookmarklet-link:hover {
      background: #1177bb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 TestID Helper - 元素选择器控制面板</h1>
    <p>在目标网页中注入脚本，直接选择元素，无需 iframe，避免跨域问题。</p>
  </div>
  
  <div class="section">
    <h2>📋 使用步骤</h2>
    
    <div class="step">
      <span class="step-number">1</span>
      <strong>打开目标网页</strong>
      <p style="margin-top: 8px; color: #858585;">在浏览器中打开你要添加 testid 的网页（例如：${this.targetUrl}）</p>
    </div>
    
    <div class="step">
      <span class="step-number">2</span>
      <strong>注入脚本</strong>
      <p style="margin-top: 8px; color: #858585;">选择以下任一方式注入脚本：</p>
      
      <h3 style="margin-top: 16px;">方式 A：控制台运行（推荐）</h3>
      <p style="margin-bottom: 8px; color: #858585;">在目标网页的控制台（F12）中运行以下代码：</p>
      <div class="code-block">
        <button class="copy-btn" onclick="copyToClipboard(this)">复制</button>
        <code id="consoleScript">fetch('${injectScriptUrl}').then(r => r.text()).then(eval);</code>
      </div>
      
      <h3 style="margin-top: 16px;">方式 B：书签工具</h3>
      <p style="margin-bottom: 8px; color: #858585;">将以下链接拖拽到浏览器书签栏，然后在目标网页中点击该书签：</p>
      <a href="javascript:(function(){var s=document.createElement('script');s.src='${injectScriptUrl}';document.head.appendChild(s);})();" class="bookmarklet-link">📌 TestID Helper</a>
      <p style="margin-top: 8px; color: #858585; font-size: 12px;">或者手动创建书签，URL 设置为：</p>
      <div class="code-block">
        <button class="copy-btn" onclick="copyToClipboard(this)">复制</button>
        <code>javascript:(function(){var s=document.createElement('script');s.src='${injectScriptUrl}';document.head.appendChild(s);})();</code>
      </div>
    </div>
    
    <div class="step">
      <span class="step-number">3</span>
      <strong>选择元素</strong>
      <p style="margin-top: 8px; color: #858585;">脚本注入后，鼠标悬停在页面元素上会高亮显示，点击元素即可选择</p>
    </div>
    
    <div class="step">
      <span class="step-number">4</span>
      <strong>填写信息并发送</strong>
      <p style="margin-top: 8px; color: #858585;">在下方表单中填写 testid 等信息，然后点击"添加到 Cursor"</p>
    </div>
  </div>
  
  <div class="section">
    <h2>📝 元素信息</h2>
    
    <div class="status info" id="status">
      等待选择元素... 请先在目标网页中注入脚本并选择元素
    </div>
    
    <div class="info-item">
      <div class="info-label">DOM 路径:</div>
      <div class="info-value" id="elementPath">-</div>
    </div>
    
    <div class="info-item">
      <div class="info-label">组件名称 (可选):</div>
      <input type="text" class="testid-input" id="componentName" placeholder="例如: SubmitButton、UserAvatar、MenuItem">
    </div>
    
    <div class="info-item">
      <div class="info-label">data-testid 值:</div>
      <input type="text" class="testid-input" id="testId" placeholder="例如: submit-button、user-avatar、menu-item">
    </div>
    
    <button class="btn" id="addTestIdBtn" style="width: 100%; margin-top: 8px;">添加到 Cursor</button>
  </div>
  
  <script src="/element-picker.js"></script>
</body>
</html>`;
    }
    /**
     * 获取可注入到目标网页的脚本
     */
    getInjectScript() {
        return `(function() {
  // 避免重复注入
  if (window.__testidHelperInjected) {
    console.warn('TestID Helper 脚本已注入，跳过重复注入');
    return;
  }
  window.__testidHelperInjected = true;
  
  const wsPort = ${this.port};
  const ws = new WebSocket('ws://localhost:' + wsPort);
  let isSelecting = false;
  let highlightEl = null;
  let selectedElement = null;
  let panel = null;
  
  // 创建右侧控制面板
  function createControlPanel() {
    if (panel) return panel;
    
    panel = document.createElement('div');
    panel.id = '__testidHelperPanel';
    panel.style.cssText = \`
      position: fixed;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      width: 280px;
      background: #252526;
      border: 1px solid #3e3e42;
      border-radius: 8px;
      padding: 16px;
      z-index: 999998;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #d4d4d4;
      display: none;
    \`;
    
    panel.innerHTML = \`
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 16px; color: #4ec9b0;">TestID Helper</h3>
        <button id="__testidHelperClose" style="background: transparent; border: none; color: #858585; cursor: pointer; font-size: 18px; padding: 0; width: 24px; height: 24px; line-height: 1;">×</button>
      </div>
      <div id="__testidHelperStatus" style="padding: 8px; background: #1e3a5f; border-radius: 4px; margin-bottom: 12px; font-size: 12px; color: #4fc3f7;">
        等待连接...
      </div>
      <div style="display: flex; gap: 8px; flex-direction: column;">
        <button id="__testidHelperStart" style="background: #0e639c; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">
          开始选择元素
        </button>
        <button id="__testidHelperCancel" style="background: #3c3c3c; color: #d4d4d4; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; display: none;">
          取消选择
        </button>
      </div>
    \`;
    
    document.body.appendChild(panel);
    
    // 绑定事件
    document.getElementById('__testidHelperStart').addEventListener('click', () => {
      enableElementPicker();
    });
    
    document.getElementById('__testidHelperCancel').addEventListener('click', () => {
      disableElementPicker();
    });
    
    document.getElementById('__testidHelperClose').addEventListener('click', () => {
      panel.style.display = 'none';
      disableElementPicker();
    });
    
    return panel;
  }
  
  // 更新面板状态
  function updatePanelStatus(message, type = 'info') {
    if (!panel) return;
    const statusEl = document.getElementById('__testidHelperStatus');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.background = type === 'success' ? '#1e4d2e' : type === 'error' ? '#5a1e1e' : '#1e3a5f';
      statusEl.style.color = type === 'success' ? '#81c784' : type === 'error' ? '#e57373' : '#4fc3f7';
    }
  }
  
  // 创建浮动提示框
  function createToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = \`
      position: fixed;
      top: 20px;
      right: 20px;
      background: \${type === 'success' ? '#1e4d2e' : type === 'error' ? '#5a1e1e' : '#1e3a5f'};
      color: \${type === 'success' ? '#81c784' : type === 'error' ? '#e57373' : '#4fc3f7'};
      padding: 12px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
    \`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  function highlight(element) {
    if (highlightEl) {
      highlightEl.style.outline = '';
      highlightEl.style.outlineOffset = '';
    }
    highlightEl = element;
    element.style.outline = '2px solid #007acc';
    element.style.outlineOffset = '2px';
  }
  
  function getDOMPath(element) {
    const path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();
      
      if (element.id) {
        selector += '#' + element.id;
        path.unshift(selector);
        break;
      } else {
        let sibling = element;
        let nth = 1;
        while (sibling.previousElementSibling) {
          sibling = sibling.previousElementSibling;
          if (sibling.nodeName === element.nodeName) {
            nth++;
          }
        }
        if (nth > 1) {
          selector += ':nth-of-type(' + nth + ')';
        } else {
          const classes = Array.from(element.classList).filter(c => c && !c.startsWith('_')).join('.');
          if (classes) {
            selector += '.' + classes.split(' ')[0];
          }
        }
        path.unshift(selector);
        element = element.parentElement;
      }
    }
    return path.join(' > ');
  }
  
  function enableElementPicker() {
    if (isSelecting) return;
    isSelecting = true;
    
    // 显示面板
    if (!panel) createControlPanel();
    panel.style.display = 'block';
    updatePanelStatus('元素选择器已启用，鼠标悬停选择元素', 'info');
    
    // 更新按钮状态
    const startBtn = document.getElementById('__testidHelperStart');
    const cancelBtn = document.getElementById('__testidHelperCancel');
    if (startBtn) startBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'block';
    
    createToast('元素选择器已启用，鼠标悬停选择元素', 'info');
    
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('click', handleClick, true);
    document.body.style.cursor = 'crosshair';
  }
  
  function disableElementPicker() {
    if (!isSelecting) return;
    isSelecting = false;
    
    // 更新按钮状态
    const startBtn = document.getElementById('__testidHelperStart');
    const cancelBtn = document.getElementById('__testidHelperCancel');
    if (startBtn) startBtn.style.display = 'block';
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    updatePanelStatus('已取消选择', 'info');
    
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('click', handleClick, true);
    document.body.style.cursor = '';
    if (highlightEl) {
      highlightEl.style.outline = '';
      highlightEl.style.outlineOffset = '';
      highlightEl = null;
    }
    createToast('元素选择器已禁用', 'info');
  }
  
  function handleMouseOver(e) {
    if (!isSelecting) return;
    e.stopPropagation();
    if (e.target !== document.body && e.target !== document.documentElement) {
      highlight(e.target);
    }
  }
  
  function handleClick(e) {
    if (!isSelecting) return;
    e.preventDefault();
    e.stopPropagation();
    
    const path = getDOMPath(e.target);
    selectedElement = {
      elementPath: path,
      element: e.target
    };
    
    // 发送到 WebSocket
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'element-selected',
        elementPath: path
      }));
      updatePanelStatus('元素已选择，信息已发送到 Cursor', 'success');
      createToast('元素已选择，信息已发送到 Cursor', 'success');
      
      // 更新按钮状态
      const startBtn = document.getElementById('__testidHelperStart');
      const cancelBtn = document.getElementById('__testidHelperCancel');
      if (startBtn) startBtn.style.display = 'block';
      if (cancelBtn) cancelBtn.style.display = 'none';
    } else {
      updatePanelStatus('WebSocket 未连接', 'error');
      createToast('WebSocket 未连接，请确保 MCP 服务器正在运行', 'error');
    }
    
    // 禁用选择器
    disableElementPicker();
  }
  
  // WebSocket 连接
  ws.onopen = () => {
    console.log('[TestID Helper] 已连接到 MCP 服务器');
    
    // 创建并显示面板
    if (!panel) createControlPanel();
    panel.style.display = 'block';
    updatePanelStatus('已连接到 MCP 服务器', 'success');
    
    createToast('已连接到 MCP 服务器', 'success');
    // 不自动启用选择器，等待用户点击按钮
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'enable-picker') {
        enableElementPicker();
      } else if (data.type === 'disable-picker') {
        disableElementPicker();
      }
    } catch (e) {
      console.error('[TestID Helper] 消息解析错误:', e);
    }
  };
  
  ws.onerror = (error) => {
    console.error('[TestID Helper] WebSocket 错误:', error);
    if (panel) updatePanelStatus('WebSocket 连接错误', 'error');
    createToast('WebSocket 连接错误，请确保 MCP 服务器正在运行', 'error');
  };
  
  ws.onclose = () => {
    console.log('[TestID Helper] WebSocket 连接已关闭');
    disableElementPicker();
    if (panel) updatePanelStatus('连接已断开', 'error');
    createToast('与 MCP 服务器的连接已断开', 'error');
  };
  
  // 键盘快捷键：Ctrl+Shift+T 启用/禁用选择器
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      if (isSelecting) {
        disableElementPicker();
      } else {
        enableElementPicker();
      }
    }
  });
  
  console.log('[TestID Helper] 脚本已注入，等待连接到 MCP 服务器...');
  
  // 创建面板（即使未连接也显示）
  createControlPanel();
  panel.style.display = 'block';
  updatePanelStatus('等待连接到 MCP 服务器...', 'info');
  
  createToast('TestID Helper 脚本已注入，等待连接...', 'info');
})();`;
    }
    /**
     * 获取书签工具（bookmarklet）
     */
    getBookmarklet() {
        // 书签工具版本：直接加载注入脚本
        return `javascript:(function(){if(window.__testidHelperInjected){alert('TestID Helper 已注入');return;}var s=document.createElement('script');s.src='http://localhost:${this.port}/inject-script.js';document.head.appendChild(s);})();`;
    }
    /**
     * 获取元素选择器脚本（控制页面使用）
     */
    async getElementPickerScript() {
        // 尝试从文件读取，如果不存在则返回内联脚本
        try {
            const scriptPath = join(__dirname, '../../public/element-picker.js');
            return await readFile(scriptPath, 'utf-8');
        }
        catch {
            // 返回内联脚本
            return this.getInlineElementPickerScript();
        }
    }
    /**
     * 内联元素选择器脚本（控制页面使用）
     */
    getInlineElementPickerScript() {
        return `
(function() {
  const ws = new WebSocket('ws://localhost:${this.port}');
  let selectedElement = null;
  
  // 复制到剪贴板功能
  window.copyToClipboard = function(button) {
    const codeBlock = button.parentElement;
    const code = codeBlock.querySelector('code');
    const text = code.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
      const originalText = button.textContent;
      button.textContent = '已复制!';
      button.style.background = '#1e4d2e';
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
      }, 2000);
    }).catch(err => {
      console.error('复制失败:', err);
      alert('复制失败，请手动复制');
    });
  };
  
  function updateUI(data) {
    if (data.elementPath) {
      document.getElementById('elementPath').textContent = data.elementPath;
    }
    if (data.componentName) {
      document.getElementById('componentName').value = data.componentName;
    }
    if (data.testId) {
      document.getElementById('testId').value = data.testId;
    }
    
    // 更新状态
    const statusEl = document.getElementById('status');
    if (data.elementPath) {
      statusEl.textContent = '已选择元素，请填写 testid 并发送到 Cursor';
      statusEl.className = 'status success';
    } else {
      statusEl.textContent = '等待选择元素... 请先在目标网页中注入脚本并选择元素';
      statusEl.className = 'status info';
    }
  }
  
  ws.onopen = () => {
    console.log('[控制面板] 已连接到预览服务器');
    const statusEl = document.getElementById('status');
    statusEl.textContent = '已连接到服务器，请在目标网页中注入脚本';
    statusEl.className = 'status success';
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'element-selected') {
        selectedElement = data.data || data;
        updateUI(selectedElement);
      }
    } catch (e) {
      console.error('[控制面板] 消息解析错误:', e);
    }
  };
  
  ws.onerror = (error) => {
    console.error('[控制面板] WebSocket 错误:', error);
    const statusEl = document.getElementById('status');
    statusEl.textContent = 'WebSocket 连接错误';
    statusEl.className = 'status error';
  };
  
  ws.onclose = () => {
    console.log('[控制面板] WebSocket 连接已关闭');
    const statusEl = document.getElementById('status');
    statusEl.textContent = '连接已断开，请刷新页面重试';
    statusEl.className = 'status error';
  };
  
  // 发送到 Cursor 按钮
  document.getElementById('addTestIdBtn').addEventListener('click', () => {
    const elementPath = document.getElementById('elementPath').textContent;
    const componentName = document.getElementById('componentName').value;
    const testId = document.getElementById('testId').value;
    
    if (!elementPath || elementPath === '-') {
      const statusEl = document.getElementById('status');
      statusEl.textContent = '请先选择一个元素（在目标网页中注入脚本并选择元素）';
      statusEl.className = 'status warning';
      return;
    }
    
    if (!testId) {
      const statusEl = document.getElementById('status');
      statusEl.textContent = '请输入 data-testid 值';
      statusEl.className = 'status warning';
      return;
    }
    
    // 发送到 WebSocket
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'element-selected',
        elementPath: elementPath,
        componentName: componentName || undefined,
        testId: testId
      }));
      
      const statusEl = document.getElementById('status');
      statusEl.textContent = '已发送到 Cursor，请在 Cursor 中查看';
      statusEl.className = 'status success';
    } else {
      const statusEl = document.getElementById('status');
      statusEl.textContent = 'WebSocket 未连接，请刷新页面重试';
      statusEl.className = 'status error';
    }
  });
  
  // 页面加载完成
  window.addEventListener('load', () => {
    console.log('[控制面板] 页面已加载');
  });
})();
`;
    }
    /**
     * 停止服务器
     */
    stop() {
        if (this.wsServer) {
            this.wsServer.close();
            this.wsServer = null;
        }
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
        }
        this.clients.clear();
    }
    /**
     * 获取选中的元素
     */
    getSelectedElement() {
        return this.selectedElement;
    }
    /**
     * 清除选中的元素
     */
    clearSelectedElement() {
        this.selectedElement = null;
    }
}
//# sourceMappingURL=previewServer.js.map