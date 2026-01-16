/**
 * 预览服务器工具
 * 提供网页预览和元素选择功能
 */
interface PreviewServerConfig {
    port?: number;
    targetUrl?: string;
}
export declare class PreviewServer {
    private httpServer;
    private wsServer;
    private port;
    private targetUrl;
    private clients;
    private selectedElement;
    constructor(config?: PreviewServerConfig);
    /**
     * 启动预览服务器
     */
    start(): Promise<{
        url: string;
        port: number;
    }>;
    /**
     * 处理 HTTP 请求
     */
    private handleRequest;
    /**
     * 处理 WebSocket 消息
     */
    private handleWebSocketMessage;
    /**
     * 广播消息给所有客户端
     */
    private broadcast;
    /**
     * 获取预览页面 HTML
     */
    private getPreviewHTML;
    /**
     * 获取元素选择器脚本
     */
    private getElementPickerScript;
    /**
     * 内联元素选择器脚本
     */
    private getInlineElementPickerScript;
    /**
     * 停止服务器
     */
    stop(): void;
    /**
     * 获取选中的元素
     */
    getSelectedElement(): typeof this.selectedElement;
    /**
     * 清除选中的元素
     */
    clearSelectedElement(): void;
}
export {};
//# sourceMappingURL=previewServer.d.ts.map