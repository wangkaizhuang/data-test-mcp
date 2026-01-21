/**
 * 端口管理工具
 * 用于检查和清理端口占用
 */
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export class PortManager {
    /**
     * 检查端口是否被占用（macOS/Linux）
     */
    async isPortInUse(port) {
        try {
            await execAsync(`lsof -i :${port}`);
            return true; // 如果命令成功，端口被占用
        }
        catch {
            return false; // 命令失败，端口未被占用
        }
    }
    /**
     * 杀死占用端口的进程
     */
    async killPort(port) {
        try {
            // macOS/Linux: 使用 lsof 和 kill
            const { stdout } = await execAsync(`lsof -ti :${port}`);
            const pids = stdout.trim().split('\n').filter(Boolean);
            for (const pid of pids) {
                try {
                    await execAsync(`kill -9 ${pid}`);
                    console.error(`Killed process ${pid} on port ${port}`);
                }
                catch (e) {
                    console.error(`Failed to kill process ${pid}:`, e);
                }
            }
        }
        catch (error) {
            // 端口未被占用或命令失败
            console.error(`No process found on port ${port}`);
        }
    }
    /**
     * 清理端口（如果被占用则杀死）
     */
    async cleanPort(port) {
        const inUse = await this.isPortInUse(port);
        if (inUse) {
            console.error(`Port ${port} is in use, cleaning...`);
            await this.killPort(port);
            // 等待端口释放
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        else {
            console.error(`Port ${port} is free`);
        }
    }
}
//# sourceMappingURL=portManager.js.map