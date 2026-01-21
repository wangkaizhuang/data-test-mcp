/**
 * Cursor 浏览器工具
 * 使用 Cursor 内置浏览器打开开发工程并支持元素选择
 */
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { createConnection } from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export class CursorBrowserHelper {
    wsServer = null;
    httpServer = null;
    wsPort;
    targetUrl;
    clients = new Set();
    selectedElement = null;
    constructor(config) {
        this.targetUrl = config.targetUrl;
        this.wsPort = config.wsPort || 3002;
    }
    /**
     * 检查端口是否被占用
     */
    async isPortInUse(port) {
        return new Promise((resolve) => {
            const server = createConnection({ port }, () => {
                server.end();
                resolve(true);
            });
            server.on('error', (err) => {
                if (err.code === 'ECONNREFUSED') {
                    resolve(false);
                }
                else {
                    resolve(true);
                }
            });
            setTimeout(() => {
                server.destroy();
                resolve(false);
            }, 1000);
        });
    }
    /**
     * 释放端口
     */
    async killPortProcess(port) {
        try {
            const { stdout } = await execAsync(`lsof -ti:${port}`);
            const pids = stdout.trim().split('\n').filter(pid => pid);
            if (pids.length > 0) {
                for (const pid of pids) {
                    try {
                        await execAsync(`kill -9 ${pid}`);
                        console.error(`已终止占用端口 ${port} 的进程 (PID: ${pid})`);
                    }
                    catch (error) {
                        console.warn(`无法终止进程 ${pid}:`, error);
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        catch (error) {
            if (error.code !== 1) {
                console.warn(`检查端口 ${port} 时出错:`, error.message);
            }
        }
    }
    /**
     * 启动 WebSocket 服务器用于接收选中元素信息
     */
    async startWebSocketServer() {
        const portInUse = await this.isPortInUse(this.wsPort);
        if (portInUse) {
            console.error(`端口 ${this.wsPort} 被占用，正在释放...`);
            await this.killPortProcess(this.wsPort);
            const stillInUse = await this.isPortInUse(this.wsPort);
            if (stillInUse) {
                throw new Error(`无法释放端口 ${this.wsPort}`);
            }
        }
        return new Promise((resolve, reject) => {
            this.httpServer = createServer();
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
                ws.on('message', (message) => {
                    try {
                        const data = JSON.parse(message.toString());
                        this.handleWebSocketMessage(ws, data);
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
            this.httpServer.listen(this.wsPort, () => {
                const wsUrl = `ws://localhost:${this.wsPort}`;
                console.error(`WebSocket server started at ${wsUrl}`);
                resolve({ wsUrl, port: this.wsPort });
            });
            this.httpServer.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    reject(new Error(`端口 ${this.wsPort} 已被占用`));
                }
                else {
                    reject(error);
                }
            });
        });
    }
    /**
     * 处理 WebSocket 消息
     */
    handleWebSocketMessage(ws, data) {
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
     * 获取元素选择器注入脚本
     */
    getElementPickerScript(wsUrl) {
        return `
(function() {
  // 检查是否已经注入过
  if (window.__testidHelperInjected) {
    console.log('TestID Helper 脚本已注入');
    return;
  }
  window.__testidHelperInjected = true;

  let highlightEl = null;
  let isSelecting = false;
  let ws = null;

  // 连接到 WebSocket 服务器
  function connectWebSocket() {
    try {
      ws = new WebSocket('${wsUrl}');
      
      ws.onopen = () => {
        console.log('TestID Helper WebSocket 已连接');
        showNotification('TestID Helper 已连接，可以开始选择元素了', 'success');
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
        showNotification('WebSocket 连接失败，请检查服务器是否运行', 'error');
      };
      
      ws.onclose = () => {
        console.log('WebSocket 连接已关闭');
        // 尝试重连
        setTimeout(connectWebSocket, 3000);
      };
    } catch (error) {
      console.error('无法创建 WebSocket 连接:', error);
    }
  }

  // 显示通知
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = \`
      position: fixed;
      top: 20px;
      right: 20px;
      background: \${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 400px;
    \`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // 高亮元素
  function highlight(element) {
    if (highlightEl) {
      highlightEl.style.outline = '';
      highlightEl.style.outlineOffset = '';
    }
    highlightEl = element;
    element.style.outline = '2px solid #007acc';
    element.style.outlineOffset = '2px';
  }

  // 获取 DOM 路径
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
          const classes = Array.from(element.classList)
            .filter(c => c && !c.startsWith('_') && !c.startsWith('testid-'))
            .join('.');
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

  // 启用选择器
  function enablePicker() {
    if (isSelecting) return;
    isSelecting = true;
    document.body.style.cursor = 'crosshair';
    showNotification('元素选择模式已启用，点击页面元素进行选择', 'info');
  }

  // 禁用选择器
  function disablePicker() {
    isSelecting = false;
    document.body.style.cursor = '';
    if (highlightEl) {
      highlightEl.style.outline = '';
      highlightEl.style.outlineOffset = '';
      highlightEl = null;
    }
  }

  // 鼠标悬停事件
  document.addEventListener('mouseover', (e) => {
    if (!isSelecting) return;
    
    const target = e.target;
    if (target === document.body || target === document.documentElement) {
      return;
    }
    
    // 忽略交互元素
    if (target.tagName === 'BUTTON' || 
        target.tagName === 'INPUT' || 
        target.tagName === 'SELECT' || 
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea')) {
      return;
    }
    
    highlight(target);
  }, true);

  // 点击事件
  document.addEventListener('click', (e) => {
    if (!isSelecting) return;
    
    const target = e.target;
    
    // 忽略交互元素
    if (target.tagName === 'BUTTON' || 
        target.tagName === 'INPUT' || 
        target.tagName === 'SELECT' || 
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    const path = getDOMPath(target);
    
    // 发送到 WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'element-selected',
        elementPath: path
      }));
      showNotification('元素已选中，信息已发送到 Cursor', 'success');
    } else {
      showNotification('WebSocket 未连接，无法发送元素信息', 'error');
    }
    
    disablePicker();
  }, true);

  // 键盘快捷键：Ctrl/Cmd + Shift + E 启用/禁用选择器
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      if (isSelecting) {
        disablePicker();
        showNotification('元素选择模式已禁用', 'info');
      } else {
        enablePicker();
      }
    }
  });

  // 初始化
  connectWebSocket();
  enablePicker();
  
  showNotification('TestID Helper 已加载，按 Ctrl+Shift+E 切换选择模式', 'info');
})();
`;
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
}
//# sourceMappingURL=cursorBrowser.js.map