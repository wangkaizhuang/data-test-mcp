/**
 * Git 操作工具
 */
import simpleGit from 'simple-git';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';
const execAsync = promisify(exec);
/**
 * 获取项目根目录
 * 优先级：环境变量 PROJECT_ROOT > process.cwd()
 */
function getProjectRoot() {
    // 优先使用环境变量
    const envRoot = process.env.PROJECT_ROOT || process.env.MCP_PROJECT_ROOT;
    if (envRoot) {
        console.error(`[GitOps] Using project root from env: ${envRoot}`);
        return envRoot;
    }
    // 降级到 process.cwd()
    const cwd = process.cwd();
    console.error(`[GitOps] Using project root from cwd: ${cwd}`);
    return cwd;
}
/**
 * 验证路径是否为有效的 Git 仓库
 */
function isGitRepository(path) {
    const gitPath = join(path, '.git');
    return existsSync(gitPath);
}
export class GitOperations {
    git;
    rootDir;
    constructor(rootDir) {
        // 使用提供的路径，或从环境变量/cwd 获取
        const projectRoot = rootDir || getProjectRoot();
        // 验证是否为 Git 仓库
        if (!isGitRepository(projectRoot)) {
            throw new Error(`未找到 Git 仓库。当前目录: ${projectRoot}\n` +
                `请确保在 Git 仓库目录中运行，或提供正确的项目路径。\n\n` +
                `提示：\n` +
                `1. 确保 Cursor 在正确的项目目录中打开\n` +
                `2. 或在 MCP 配置中设置环境变量：\n` +
                `   "env": { "PROJECT_ROOT": "你的项目路径" }`);
        }
        this.rootDir = projectRoot;
        this.git = simpleGit(projectRoot);
        console.error(`[GitOps] Initialized with Git repository: ${projectRoot}`);
    }
    /**
     * 检查工作区状态
     */
    async getStatus() {
        const status = await this.git.status();
        return status.files.map(f => `${f.path} (${f.index})`).join('\n');
    }
    /**
     * 检查是否有未提交的改动（工作区或暂存区）
     * 跨平台兼容，适用于 Mac、Windows、Linux
     */
    async hasUncommittedChanges() {
        try {
            const status = await this.git.status();
            // isClean() 返回 true 表示没有任何改动
            // 返回 false 表示工作区干净
            return !status.isClean();
        }
        catch (error) {
            console.error('[GitOps] Failed to check uncommitted changes:', error);
            return false;
        }
    }
    /**
     * 获取未提交的改动文件列表
     */
    async getUncommittedFiles() {
        try {
            const status = await this.git.status();
            // 返回所有有改动的文件（包括工作区和暂存区）
            return status.files.map(f => f.path);
        }
        catch (error) {
            console.error('[GitOps] Failed to get uncommitted files:', error);
            return [];
        }
    }
    /**
     * 添加所有改动到暂存区 (git add --all)
     */
    async addAll() {
        try {
            // 先获取有改动的文件列表
            const filesBefore = await this.getUncommittedFiles();
            // 执行 git add --all
            await this.git.add('--all');
            // 检查暂存区文件
            const status = await this.git.status();
            const stagedFiles = status.files
                .filter(f => f.index !== ' ' && f.index !== '?')
                .map(f => f.path);
            return {
                success: stagedFiles.length > 0,
                filesAdded: stagedFiles
            };
        }
        catch (error) {
            console.error('[GitOps] Failed to add all files:', error);
            return {
                success: false,
                filesAdded: []
            };
        }
    }
    /**
     * 拉取远程最新代码
     */
    async pullFromRemote(remote = 'origin', branch) {
        try {
            const targetBranch = branch || await this.getCurrentBranch();
            // 拉取远程代码（Git 会自动处理合并）
            await this.git.pull(remote, targetBranch);
            return {
                success: true,
                branch: targetBranch,
                message: `成功从 ${remote}/${targetBranch} 拉取最新代码`
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // 检查是否是冲突错误
            if (errorMessage.includes('conflict') ||
                errorMessage.includes('CONFLICT') ||
                errorMessage.includes('merge conflict') ||
                errorMessage.includes('Automatic merge failed')) {
                return {
                    success: false,
                    error: errorMessage,
                    message: `拉取时发现冲突，请先解决冲突后再提交`
                };
            }
            // 检查是否是网络问题或分支不存在（这些情况下可以继续提交）
            if (errorMessage.includes('Could not read from remote') ||
                errorMessage.includes('does not exist') ||
                errorMessage.includes('not found')) {
                return {
                    success: false,
                    error: errorMessage,
                    message: `无法拉取远程代码（可能是网络问题或远程分支不存在），将继续提交本地更改`
                };
            }
            // 其他错误
            return {
                success: false,
                error: errorMessage,
                message: `拉取失败: ${branch || '当前分支'}`
            };
        }
    }
    /**
     * 提交更改
     * 只提交指定的文件，不提交其他更改
     */
    async commitChanges(files, message) {
        try {
            // 1. 检查是否有指定的文件需要提交
            if (files.length === 0) {
                return {
                    success: false,
                    message: '没有指定要提交的文件'
                };
            }
            // 2. 只添加指定的文件
            await this.git.add(files);
            // 3. 检查是否有实际更改（可能文件没有修改）
            const status = await this.git.status();
            const stagedFiles = status.files.filter(f => f.index !== ' ' && f.index !== '?');
            if (stagedFiles.length === 0) {
                return {
                    success: false,
                    message: '指定的文件没有需要提交的更改'
                };
            }
            // 4. 提交
            await this.git.commit(message);
            return {
                success: true,
                message: `成功提交: ${message}`
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                message: '提交失败'
            };
        }
    }
    /**
     * 提交暂存区的所有更改
     * 用于 git add --all 后的提交
     */
    async commitAllStaged(message) {
        try {
            // 1. 检查暂存区是否有文件
            const status = await this.git.status();
            const stagedFiles = status.files.filter(f => f.index !== ' ' && f.index !== '?');
            if (stagedFiles.length === 0) {
                return {
                    success: false,
                    message: '暂存区没有需要提交的更改'
                };
            }
            // 2. 提交暂存区的所有文件
            await this.git.commit(message);
            return {
                success: true,
                message: `成功提交 ${stagedFiles.length} 个文件: ${message}`,
                filesCommitted: stagedFiles.map(f => f.path)
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                message: '提交失败'
            };
        }
    }
    /**
     * 检查分支是否存在
     */
    async branchExists(branch) {
        try {
            const branches = await this.git.branchLocal();
            return branches.all.includes(branch);
        }
        catch {
            return false;
        }
    }
    /**
     * 获取当前分支
     */
    async getCurrentBranch() {
        try {
            const status = await this.git.status();
            return status.current || 'main';
        }
        catch {
            return 'main';
        }
    }
    /**
     * 创建并切换到新分支
     */
    async createBranch(branch) {
        try {
            const exists = await this.branchExists(branch);
            if (!exists) {
                await this.git.checkoutLocalBranch(branch);
            }
            else {
                await this.git.checkout(branch);
            }
            return {
                success: true,
                branch,
                message: `已切换到分支: ${branch}`
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                message: `创建分支失败: ${branch}`
            };
        }
    }
    /**
     * 推送到远程仓库
     * 直接执行 git push，使用 Git 的默认行为
     */
    async pushToRemote(branch, remote) {
        try {
            // 如果指定了分支，确保在正确的分支上
            if (branch) {
                const currentBranch = await this.getCurrentBranch();
                if (currentBranch !== branch) {
                    const branchResult = await this.createBranch(branch);
                    if (!branchResult.success) {
                        return branchResult;
                    }
                }
            }
            // 直接执行 git push，不指定任何参数，使用 Git 默认行为
            // 使用 exec 直接执行命令，避免 simple-git 自动添加参数
            try {
                await execAsync('git push', { cwd: this.rootDir });
            }
            catch (error) {
                // 如果直接 push 失败（可能是没有 upstream），尝试设置 upstream 后再 push
                // 但这里我们仍然不使用 -u，让 Git 自己决定
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (errorMessage.includes('no upstream') || errorMessage.includes('no tracking information')) {
                    // 分支没有 upstream，但用户要求不使用 -u，所以直接抛出错误
                    throw error;
                }
                throw error;
            }
            const currentBranch = await this.getCurrentBranch();
            return {
                success: true,
                branch: currentBranch,
                message: `成功推送当前分支 ${currentBranch}`
            };
        }
        catch (error) {
            const currentBranch = await this.getCurrentBranch().catch(() => '未知分支');
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                message: `推送失败: ${currentBranch}`
            };
        }
    }
    /**
     * 从远程 URL 解析 Bitbucket Server 信息
     */
    parseBitbucketUrl(url) {
        // 支持格式:
        // https://bitbucket.example.com/scm/PROJECT/REPO.git
        // https://bitbucket.example.com/projects/PROJECT/repos/REPO/browse
        // https://bitbucket.example.com/users/USERNAME/repos/REPO/browse (用户仓库/Fork)
        // ssh://git@bitbucket.example.com:7999/PROJECT/REPO.git
        // http://bitbucket.example.com/scm/PROJECT/REPO.git
        // 匹配 users/repos 路径格式（用户仓库/Fork 仓库）
        // 例如: https://code.fineres.com/users/kevin.king/repos/template-app-market/browse
        const usersMatch = url.match(/https?:\/\/([^\/]+)\/users\/([^\/]+)\/repos\/([^\/]+)/i);
        if (usersMatch) {
            return {
                baseUrl: `https://${usersMatch[1]}`,
                projectKey: usersMatch[2], // 对于用户仓库，projectKey 使用 username
                repositorySlug: usersMatch[3],
                isUserRepo: true,
                username: usersMatch[2]
            };
        }
        // 匹配 scm 路径格式
        // 例如: https://code.fineres.com/scm/~kevin.king/data-testid-mcp.git
        const scmMatch = url.match(/https?:\/\/([^\/]+)\/scm\/([^\/]+)\/([^\/]+?)(?:\.git)?$/i);
        if (scmMatch) {
            const projectKey = scmMatch[2];
            const repositorySlug = scmMatch[3];
            // 检查是否是用户仓库（以 ~ 开头）
            const isUserRepo = projectKey.startsWith('~');
            return {
                baseUrl: `https://${scmMatch[1]}`,
                projectKey: projectKey,
                repositorySlug: repositorySlug,
                isUserRepo: isUserRepo,
                username: isUserRepo ? projectKey.replace(/^~/, '') : undefined
            };
        }
        // 匹配 projects/repos 路径格式
        // 例如: https://code.fineres.com/projects/MUX/repos/template-app-market/browse
        const projectsMatch = url.match(/https?:\/\/([^\/]+)\/projects\/([^\/]+)\/repos\/([^\/]+)/i);
        if (projectsMatch) {
            return {
                baseUrl: `https://${projectsMatch[1]}`,
                projectKey: projectsMatch[2],
                repositorySlug: projectsMatch[3]
            };
        }
        // 匹配 SSH 格式 (ssh://git@host:port/PROJECT/REPO.git)
        const sshMatch = url.match(/ssh:\/\/git@([^:]+):?(\d+)?\/([^\/]+)\/([^\/]+?)(?:\.git)?/i);
        if (sshMatch) {
            const port = sshMatch[2] ? `:${sshMatch[2]}` : '';
            return {
                baseUrl: `https://${sshMatch[1]}${port}`,
                projectKey: sshMatch[3],
                repositorySlug: sshMatch[4]
            };
        }
        return null;
    }
    /**
     * 创建 Pull Request（Bitbucket Server）
     */
    /**
     * 获取最后一次提交的 message
     */
    async getLastCommitMessage() {
        try {
            const log = await this.git.log({ maxCount: 1 });
            return log.latest?.message || '';
        }
        catch (error) {
            return '';
        }
    }
    async createPullRequest(title, description, baseBranch = 'develop', bitbucketConfig) {
        try {
            // 获取认证信息
            const username = bitbucketConfig?.username || process.env.BITBUCKET_USERNAME;
            const password = bitbucketConfig?.password || process.env.BITBUCKET_PASSWORD || process.env.BITBUCKET_TOKEN;
            if (!username || !password) {
                return {
                    success: false,
                    message: '需要设置 BITBUCKET_USERNAME 和 BITBUCKET_PASSWORD (或 BITBUCKET_TOKEN) 环境变量来创建 PR'
                };
            }
            // 获取当前分支
            const headBranch = await this.getCurrentBranch();
            // 使用 git config 获取远程仓库地址
            let remoteUrl;
            try {
                const { stdout } = await execAsync('git config --get remote.origin.url', { cwd: this.rootDir });
                remoteUrl = stdout.trim();
            }
            catch (error) {
                return {
                    success: false,
                    message: '无法获取远程仓库地址，请确保已配置 origin 远程仓库'
                };
            }
            // 解析 Bitbucket 信息
            const bitbucketInfo = bitbucketConfig?.projectKey && bitbucketConfig?.repositorySlug
                ? {
                    baseUrl: bitbucketConfig.baseUrl || process.env.BITBUCKET_BASE_URL || '',
                    projectKey: bitbucketConfig.projectKey,
                    repositorySlug: bitbucketConfig.repositorySlug
                }
                : this.parseBitbucketUrl(remoteUrl);
            if (!bitbucketInfo) {
                return {
                    success: false,
                    message: '无法从远程仓库 URL 解析 Bitbucket Server 信息。请提供 projectKey 和 repositorySlug，或确保远程 URL 格式正确。'
                };
            }
            // 如果没有 baseUrl，尝试从环境变量获取
            const baseUrl = bitbucketInfo.baseUrl || process.env.BITBUCKET_BASE_URL;
            if (!baseUrl) {
                return {
                    success: false,
                    message: '需要设置 BITBUCKET_BASE_URL 环境变量或提供 baseUrl 配置'
                };
            }
            // 构建 API URL
            // Bitbucket Server API: 
            // - 项目仓库: /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests
            // - 用户仓库: /rest/api/1.0/projects/~{username}/repos/{repositorySlug}/pull-requests
            // 参考文档: https://docs.atlassian.com/bitbucket-server/rest/5.16.0/bitbucket-rest.html
            const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
            // 确定源仓库（fromRef）和目标仓库（toRef）
            // 对于 Fork 仓库，fromRef 指向用户仓库，toRef 指向原项目仓库
            let fromProjectKey;
            let toProjectKey;
            if (bitbucketInfo.isUserRepo && bitbucketInfo.username) {
                // 用户仓库（Fork 仓库）
                fromProjectKey = `~${bitbucketInfo.username}`;
                // 目标仓库从环境变量或配置中获取，默认为 MUX（原项目）
                toProjectKey = process.env.BITBUCKET_TARGET_PROJECT || 'MUX';
            }
            else {
                // 项目仓库
                fromProjectKey = bitbucketInfo.projectKey;
                toProjectKey = bitbucketInfo.projectKey;
            }
            // API URL 使用目标仓库（toRef）的路径
            const apiUrl = `${normalizedBaseUrl}/rest/api/1.0/projects/${toProjectKey}/repos/${bitbucketInfo.repositorySlug}/pull-requests`;
            // 创建 HTTP Basic Auth header
            // Bitbucket Server 支持 Basic Auth 和 OAuth
            // Personal Access Token 可以直接作为密码使用
            const auth = Buffer.from(`${username}:${password}`).toString('base64');
            // 评审人（默认三人）
            const reviewers = bitbucketConfig?.reviewers || ['Kevin.King', 'johntsai', 'Roy.Liu'];
            const reviewersArray = reviewers.map(name => ({
                user: { name }
            }));
            // 调用 Bitbucket Server API 创建 Pull Request
            // 请求体格式参考: https://docs.atlassian.com/bitbucket-server/rest/5.16.0/bitbucket-rest.html#idm8297063984
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    description: description || '',
                    fromRef: {
                        id: headBranch,
                        repository: {
                            slug: bitbucketInfo.repositorySlug,
                            project: {
                                key: fromProjectKey
                            }
                        }
                    },
                    toRef: {
                        id: headBranch,
                        repository: {
                            slug: bitbucketInfo.repositorySlug,
                            project: {
                                key: toProjectKey
                            }
                        }
                    },
                    reviewers: reviewersArray
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.errors?.[0]?.message || errorData.message || `HTTP ${response.status}`;
                return {
                    success: false,
                    error: errorMessage,
                    message: '创建 Pull Request 失败'
                };
            }
            const pr = await response.json();
            // Bitbucket Server PR URL 格式: 
            // - 项目仓库: {baseUrl}/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{id}
            // - 用户仓库: {baseUrl}/users/{username}/repos/{repositorySlug}/pull-requests/{id}
            const prUrl = pr.links?.self?.[0]?.href ||
                (bitbucketInfo.isUserRepo && bitbucketInfo.username
                    ? `${normalizedBaseUrl}/users/${bitbucketInfo.username}/repos/${bitbucketInfo.repositorySlug}/pull-requests/${pr.id}`
                    : `${normalizedBaseUrl}/projects/${bitbucketInfo.projectKey}/repos/${bitbucketInfo.repositorySlug}/pull-requests/${pr.id}`);
            return {
                success: true,
                prUrl,
                message: `成功创建 Pull Request: ${prUrl}`
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                message: '创建 Pull Request 失败'
            };
        }
    }
    /**
     * 完整的提交流程：commit -> push -> create PR
     */
    async completeWorkflow(files, commitMessage, branch, prTitle, prDescription, baseBranch = 'develop', bitbucketConfig) {
        // 1. 创建分支
        const branchResult = await this.createBranch(branch);
        if (!branchResult.success) {
            return branchResult;
        }
        // 2. 提交
        const commitResult = await this.commitChanges(files, commitMessage);
        if (!commitResult.success) {
            return commitResult;
        }
        // 3. 推送
        const pushResult = await this.pushToRemote(branch);
        if (!pushResult.success) {
            return pushResult;
        }
        // 4. 创建 PR（如果提供了配置）
        const username = bitbucketConfig?.username || process.env.BITBUCKET_USERNAME;
        const password = bitbucketConfig?.password || process.env.BITBUCKET_PASSWORD || process.env.BITBUCKET_TOKEN;
        if (username && password) {
            const prResult = await this.createPullRequest(prTitle, prDescription, baseBranch, bitbucketConfig);
            return prResult;
        }
        return {
            success: true,
            branch,
            message: `代码已提交并推送到 ${branch}，但未创建 PR（需要 Bitbucket 认证信息）`
        };
    }
}
//# sourceMappingURL=gitOps.js.map