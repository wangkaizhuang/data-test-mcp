/**
 * 前端项目启动管理
 * 用于启动和管理 pnpm run dev 进程
 */
export declare class DevServer {
    private process;
    private port;
    private projectPath;
    constructor(projectPath: string, port?: number);
    /**
     * 启动前端项目 (pnpm run dev)
     */
    start(): Promise<void>;
    /**
     * 停止服务器
     */
    stop(): void;
    /**
     * 获取端口
     */
    getPort(): number;
}
//# sourceMappingURL=devServer.d.ts.map