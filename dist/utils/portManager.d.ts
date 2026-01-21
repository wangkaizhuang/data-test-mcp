/**
 * 端口管理工具
 * 用于检查和清理端口占用
 */
export declare class PortManager {
    /**
     * 检查端口是否被占用（macOS/Linux）
     */
    isPortInUse(port: number): Promise<boolean>;
    /**
     * 杀死占用端口的进程
     */
    killPort(port: number): Promise<void>;
    /**
     * 清理端口（如果被占用则杀死）
     */
    cleanPort(port: number): Promise<void>;
}
//# sourceMappingURL=portManager.d.ts.map