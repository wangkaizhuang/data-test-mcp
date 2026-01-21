/**
 * Git 操作工具
 */
import type { GitOperationResult } from '../types/element.js';
/**
 * 查找 Git 仓库根目录
 * 从指定目录开始向上查找，直到找到 .git 目录
 */
export declare function findGitRoot(startDir?: string): string | null;
/**
 * 从文件路径中提取 Git 仓库根目录
 * 例如：C:\Users\...\project\src\components\Button.tsx -> C:\Users\...\project
 */
export declare function findGitRootFromFile(filePath: string): string | null;
export declare class GitOperations {
    private git;
    private rootDir;
    constructor(rootDir?: string);
    /**
     * 检查工作区状态
     */
    getStatus(): Promise<string>;
    /**
     * 检查是否有未提交的改动（工作区或暂存区）
     * 跨平台兼容，适用于 Mac、Windows、Linux
     */
    hasUncommittedChanges(): Promise<boolean>;
    /**
     * 获取未提交的改动文件列表
     */
    getUncommittedFiles(): Promise<string[]>;
    /**
     * 添加所有改动到暂存区 (git add --all)
     */
    addAll(): Promise<{
        success: boolean;
        filesAdded: string[];
    }>;
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
     * 提交暂存区的所有更改
     * 用于 git add --all 后的提交
     */
    commitAllStaged(message: string): Promise<GitOperationResult>;
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
        reviewers?: string[];
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
        reviewers?: string[];
    }): Promise<GitOperationResult>;
}
//# sourceMappingURL=gitOps.d.ts.map