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
                console.log('WebSocket client connected');
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
                    console.log('WebSocket client disconnected');
                });
            });
            this.httpServer.listen(this.port, () => {
                const url = `http://localhost:${this.port}`;
                console.log(`Preview server started at ${url}`);
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
        // 提供元素选择器脚本
        if (url.pathname === '/element-picker.js') {
            const script = await this.getElementPickerScript();
            res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
            res.end(script);
            return;
        }
        // 代理目标 URL（如果需要）
        if (url.pathname.startsWith('/proxy/')) {
            // 这里可以实现代理逻辑，或者直接重定向
            res.writeHead(302, { Location: this.targetUrl });
            res.end();
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
                console.log('Unknown message type:', data.type);
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
     * 获取预览页面 HTML
     */
    async getPreviewHTML() {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TestID Helper - 元素选择器</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #1e1e1e;
      color: #d4d4d4;
    }
    
    .header {
      background: #252526;
      padding: 12px 20px;
      border-bottom: 1px solid #3e3e42;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .url-input {
      flex: 1;
      background: #3c3c3c;
      border: 1px solid #3e3e42;
      color: #d4d4d4;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .url-input:focus {
      outline: none;
      border-color: #007acc;
    }
    
    .btn {
      background: #0e639c;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    
    .btn:hover {
      background: #1177bb;
    }
    
    .btn:disabled {
      background: #3c3c3c;
      cursor: not-allowed;
    }
    
    .btn-secondary {
      background: #3c3c3c;
    }
    
    .btn-secondary:hover {
      background: #4a4a4a;
    }
    
    .preview-container {
      flex: 1;
      display: flex;
      flex-direction: row;
      overflow: hidden;
    }
    
    .iframe-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      position: relative;
    }
    
    iframe {
      flex: 1;
      border: none;
      background: white;
      width: 100%;
      height: 100%;
    }
    
    /* 选择模式下的鼠标样式 */
    .iframe-wrapper.selecting iframe {
      cursor: crosshair !important;
    }
    
    .sidebar {
      width: 400px;
      min-width: 400px;
      background: #252526;
      border-left: 1px solid #3e3e42;
      padding: 20px;
      overflow-y: auto;
      display: none;
      flex-direction: column;
    }
    
    .sidebar.open {
      display: flex;
    }
    
    .sidebar h3 {
      margin-bottom: 16px;
      color: #4ec9b0;
    }
    
    .info-item {
      margin-bottom: 12px;
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
    
    .toggle-sidebar {
      position: absolute;
      right: 20px;
      top: 20px;
      z-index: 1001;
    }
    
    /* 选择模式提示 */
    .selecting-hint {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      pointer-events: none;
      z-index: 1000;
      display: none;
    }
    
    .iframe-wrapper.selecting .selecting-hint {
      display: block;
    }
  </style>
</head>
<body>
  <div class="header">
    <input type="text" class="url-input" id="urlInput" placeholder="输入要预览的 URL (例如: http://localhost:3000)" value="${this.targetUrl}">
    <button class="btn" id="loadBtn">加载</button>
    <button class="btn btn-secondary" id="toggleSidebar">显示选择器</button>
  </div>
  
  <div class="preview-container">
    <div class="iframe-wrapper" id="iframeWrapper">
      <iframe id="previewFrame" src="${this.targetUrl}"></iframe>
      <div class="selecting-hint">点击页面中的元素进行选择</div>
    </div>
    
    <div class="sidebar" id="sidebar">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0;">元素选择器</h3>
        <button class="btn btn-secondary" id="closeSidebar" style="padding: 4px 12px; font-size: 12px;">✕</button>
      </div>
      
      <div class="status info" id="status">
        点击页面中的元素进行选择
      </div>
      
      <div class="info-item">
        <div class="info-label">DOM 路径:</div>
        <div class="info-value" id="elementPath">-</div>
      </div>
      
      <div class="info-item">
        <div class="info-label">组件名称 (可选):</div>
        <input type="text" class="testid-input" id="componentName" placeholder="例如: ShareButton">
      </div>
      
      <div class="info-item">
        <div class="info-label">data-testid 值:</div>
        <input type="text" class="testid-input" id="testId" placeholder="例如: share-button">
      </div>
      
      <button class="btn" id="addTestIdBtn" style="width: 100%; margin-top: 16px;">添加到 Cursor</button>
    </div>
  </div>
  
  <script src="/element-picker.js"></script>
</body>
</html>`;
    }
    /**
     * 获取元素选择器脚本
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
     * 内联元素选择器脚本
     */
    getInlineElementPickerScript() {
        return `
(function() {
  const ws = new WebSocket('ws://localhost:${this.port}');
  let isSelecting = false;
  let selectedElement = null;
  
  ws.onopen = () => {
    console.log('Connected to preview server');
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'element-selected') {
      updateUI(data.data);
    }
  };
  
  function updateUI(data) {
    document.getElementById('elementPath').textContent = data.elementPath || '-';
    if (data.componentName) {
      document.getElementById('componentName').value = data.componentName;
    }
    if (data.testId) {
      document.getElementById('testId').value = data.testId;
    }
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
    const iframe = document.getElementById('previewFrame');
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!iframeDoc) {
      alert('无法访问 iframe 内容。请确保目标页面允许跨域访问。');
      isSelecting = false;
      return;
    }
    
    // 注入选择器脚本到 iframe
    const script = iframeDoc.createElement('script');
    script.setAttribute('data-element-picker', 'true');
    script.textContent = \`
      (function() {
        let highlightEl = null;
        
        function highlight(element) {
          if (highlightEl) {
            highlightEl.style.outline = '';
          }
          highlightEl = element;
          element.style.outline = '2px solid #007acc';
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
        
        document.addEventListener('mouseover', (e) => {
          if (e.target !== document.body) {
            highlight(e.target);
          }
        });
        
        document.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const path = getDOMPath(e.target);
          window.parent.postMessage({
            type: 'element-selected',
            elementPath: path,
            element: e.target
          }, '*');
        });
      })();
    \`;
    iframeDoc.head.appendChild(script);
    
    document.getElementById('status').textContent = '点击页面中的元素进行选择';
    document.getElementById('status').className = 'status info';
  }
  
  function disableElementPicker() {
    isSelecting = false;
    const iframeWrapper = document.getElementById('iframeWrapper');
    iframeWrapper.classList.remove('selecting');
    const iframe = document.getElementById('previewFrame');
    iframe.contentWindow?.postMessage({ type: 'disable-picker' }, '*');
  }
  
  // 监听来自 iframe 的消息（全局监听，避免重复注册）
  if (!window.elementPickerMessageListener) {
    window.elementPickerMessageListener = true;
    window.addEventListener('message', (event) => {
      if (event.data.type === 'element-selected') {
        selectedElement = {
          elementPath: event.data.elementPath
        };
        updateUI(selectedElement);
        
        // 发送到 WebSocket
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'element-selected',
            elementPath: event.data.elementPath
          }));
        }
      }
    });
  }
  
  // UI 事件处理
  document.getElementById('loadBtn').addEventListener('click', () => {
    const url = document.getElementById('urlInput').value;
    if (url) {
      const sidebar = document.getElementById('sidebar');
      const iframe = document.getElementById('previewFrame');
      
      // 先打开侧边栏
      if (!sidebar.classList.contains('open')) {
        sidebar.classList.add('open');
      }
      
      // 加载 URL
      iframe.src = url;
      
      // iframe 加载完成后会自动启用选择器（通过 load 事件监听）
    }
  });
  
  document.getElementById('toggleSidebar').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
    if (sidebar.classList.contains('open')) {
      enableElementPicker();
    } else {
      disableElementPicker();
    }
  });
  
  document.getElementById('closeSidebar').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('open');
    disableElementPicker();
  });
  
  document.getElementById('addTestIdBtn').addEventListener('click', () => {
    const elementPath = document.getElementById('elementPath').textContent;
    const componentName = document.getElementById('componentName').value;
    const testId = document.getElementById('testId').value;
    
    if (!elementPath || elementPath === '-') {
      alert('请先选择一个元素');
      return;
    }
    
    if (!testId) {
      alert('请输入 data-testid 值');
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
      
      document.getElementById('status').textContent = '已发送到 Cursor，请在 Cursor 中查看';
      document.getElementById('status').className = 'status success';
    } else {
      document.getElementById('status').textContent = 'WebSocket 未连接';
      document.getElementById('status').className = 'status error';
    }
  });
  
  // 监听 iframe 加载完成事件（包括刷新后）
  const iframe = document.getElementById('previewFrame');
  iframe.addEventListener('load', () => {
    // iframe 加载完成后，自动打开侧边栏并启用选择器
    const sidebar = document.getElementById('sidebar');
    if (!sidebar.classList.contains('open')) {
      sidebar.classList.add('open');
    }
    setTimeout(() => {
      enableElementPicker();
    }, 500);
  });
  
  // 页面加载完成后，如果 iframe 已有内容，自动打开侧边栏并启用选择器
  window.addEventListener('load', () => {
    const iframe = document.getElementById('previewFrame');
    if (iframe.src && iframe.src !== 'about:blank') {
      const sidebar = document.getElementById('sidebar');
      if (!sidebar.classList.contains('open')) {
        sidebar.classList.add('open');
      }
      // 检查 iframe 是否已经加载完成
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc && iframeDoc.readyState === 'complete') {
          setTimeout(() => {
            enableElementPicker();
          }, 300);
        }
      } catch (e) {
        // 跨域限制，等待 load 事件
        console.log('等待 iframe load 事件');
      }
    }
  });
  
  // DOMContentLoaded 时也检查（更早触发）
  document.addEventListener('DOMContentLoaded', () => {
    const iframe = document.getElementById('previewFrame');
    if (iframe.src && iframe.src !== 'about:blank') {
      const sidebar = document.getElementById('sidebar');
      if (!sidebar.classList.contains('open')) {
        sidebar.classList.add('open');
      }
    }
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