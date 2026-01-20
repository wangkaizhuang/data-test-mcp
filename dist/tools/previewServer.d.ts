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
     * 获取控制页面 HTML（新方案：脚本注入）
     */
    private getPreviewHTML;
    /**
     * 获取可注入到目标网页的脚本
     */
    private getInjectScript;
    /**
     * 获取书签工具（bookmarklet）
     */
    private getBookmarklet;
    /**
     * 获取元素选择器脚本（控制页面使用）
     */
    private getElementPickerScript;
    /**
     * 内联元素选择器脚本（控制页面使用）
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