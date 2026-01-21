/**
 * Git 操作工具
 */
import type { GitOperationResult } from '../types/element.js';
export declare class GitOperations {
    private git;
    private rootDir;
    constructor(rootDir?: string);
    /**
     * 检查工作区状态
     */
    getStatus(): Promise<string>;
    /**
     * 获取所有未暂存的文件（包括修改和新增的文件）
     */
    getUnstagedFiles(): Promise<string[]>;
    /**
     * 拉取远程最新代码
     */
    pullFromRemote(remote?: string, branch?: string): Promise<GitOperationResult>;
    /**
     * 提交更改
     * 只提交指定的文件，不提交其他更改
     */
    commitChanges(files: string[], message: string): Promise<GitOperationResult>;
    /**
     * 检查分支是否存在
     */
    branchExists(branch: string): Promise<boolean>;
    /**
     * 获取当前分支
     */
    getCurrentBranch(): Promise<string>;
    /**
     * 创建并切换到新分支
     */
    createBranch(branch: string): Promise<GitOperationResult>;
    /**
     * 推送到远程仓库
     * 直接执行 git push，使用 Git 的默认行为
     */
    pushToRemote(branch?: string, remote?: string): Promise<GitOperationResult>;
    /**
     * 从远程 URL 解析 Bitbucket Server 信息
     */
    private parseBitbucketUrl;
    /**
     * 创建 Pull Request（Bitbucket Server）
     */
    /**
     * 获取最后一次提交的 message
     */
    getLastCommitMessage(): Promise<string>;
    createPullRequest(title: string, description: string, baseBranch?: string, bitbucketConfig?: {
        baseUrl?: string;
        username?: string;
        password?: string;
        projectKey?: string;
        repositorySlug?: string;
    }): Promise<GitOperationResult>;
    /**
     * 完整的提交流程：commit -> push -> create PR
     */
    completeWorkflow(files: string[], commitMessage: string, branch: string, prTitle: string, prDescription: string, baseBranch?: string, bitbucketConfig?: {
        baseUrl?: string;
        username?: string;
        password?: string;
        projectKey?: string;
        repositorySlug?: string;
    }): Promise<GitOperationResult>;
}
//# sourceMappingURL=gitOps.d.ts.map