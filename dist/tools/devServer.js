/**
 * 前端项目启动管理
 * 用于启动和管理 pnpm run dev 进程
 */
import { spawn } from 'child_process';
export class DevServer {
    process = null;
    port;
    projectPath;
    constructor(projectPath, port = 3000) {
        this.projectPath = projectPath;
        this.port = port;
    }
    /**
     * 启动前端项目 (pnpm run dev)
     */
    async start() {
        return new Promise((resolve, reject) => {
            console.error(`Starting dev server: pnpm run dev in ${this.projectPath}`);
            this.process = spawn('pnpm', ['run', 'dev'], {
                cwd: this.projectPath,
                shell: true,
                stdio: 'pipe'
            });
            this.process.stdout?.on('data', (data) => {
                console.error(`[Dev Server] ${data.toString()}`);
            });
            this.process.stderr?.on('data', (data) => {
                console.error(`[Dev Server] ${data.toString()}`);
            });
            this.process.on('error', (error) => {
                reject(new Error(`Failed to start dev server: ${error.message}`));
            });
            this.process.on('close', (code) => {
                console.error(`Dev server exited with code ${code}`);
            });
            // 简单等待 - 假设命令成功执行
            setTimeout(() => {
                console.error(`Dev server process started`);
                resolve();
            }, 1000);
        });
    }
    /**
     * 停止服务器
     */
    stop() {
        if (this.process) {
            this.process.kill('SIGTERM');
            this.process = null;
            console.error('Dev server stopped');
        }
    }
    /**
     * 获取端口
     */
    getPort() {
        return this.port;
    }
}
//# sourceMappingURL=devServer.js.map