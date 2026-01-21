/**
 * Cursor 浏览器工具
 * 使用 Cursor 内置浏览器打开开发工程并支持元素选择
 */
interface CursorBrowserConfig {
    targetUrl: string;
    wsPort?: number;
}
export declare class CursorBrowserHelper {
    private wsServer;
    private httpServer;
    private wsPort;
    private targetUrl;
    private clients;
    private selectedElement;
    constructor(config: CursorBrowserConfig);
    /**
     * 检查端口是否被占用
     */
    private isPortInUse;
    /**
     * 释放端口
     */
    private killPortProcess;
    /**
     * 启动 WebSocket 服务器用于接收选中元素信息
     */
    startWebSocketServer(): Promise<{
        wsUrl: string;
        port: number;
    }>;
    /**
     * 处理 WebSocket 消息
     */
    private handleWebSocketMessage;
    /**
     * 广播消息给所有客户端
     */
    private broadcast;
    /**
     * 获取元素选择器注入脚本
     */
    getElementPickerScript(wsUrl: string): string;
    /**
     * 获取选中的元素
     */
    getSelectedElement(): typeof this.selectedElement;
    /**
     * 清除选中的元素
     */
    clearSelectedElement(): void;
    /**
     * 停止服务器
     */
    stop(): void;
}
export {};
//# sourceMappingURL=cursorBrowser.d.ts.map