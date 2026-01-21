#!/usr/bin/env node
/**
 * TestID Helper MCP Server
 * 为前端元素自动添加 data-testid 属性的 MCP 工具
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { addTestIdToElement, applyCodeModification } from './tools/addTestId.js';
import { locateComponentFileByInfo } from './utils/fileLocator.js';
import { extractTagName, extractClassName } from './tools/elementParser.js';
import { GitOperations } from './tools/gitOps.js';
import { PreviewServer } from './tools/previewServer.js';
import { generateTestIdSuggestions, addTestIdToConstant, generateConstantName } from './utils/testIdHelper.js';
import { PortManager } from './utils/portManager.js';
import { DevServer } from './tools/devServer.js';
let pendingChanges = null;
let previewServer = null;
/**
 * 创建 MCP Server
 */
async function createServer() {
    const server = new Server({
        name: 'testid-helper-mcp',
        version: '1.0.0'
    }, {
        capabilities: {
            tools: {}
        }
    });
    // 列出可用工具
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: 'add_testid',
                    description: '为指定元素添加 data-testid 属性。需要提供元素的 DOM 路径和 testid 值。注意：请根据用户实际选择的元素填写参数，不要使用示例中的占位符值（如 share-button）。',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            elementPath: {
                                type: 'string',
                                description: 'DOM 路径（从浏览器开发者工具获取，例如：div#app > button.submit-btn 或 div.container > form > input#username，根据实际选择的元素路径填写）'
                            },
                            testId: {
                                type: 'string',
                                description: '要添加的 data-testid 值（例如：submit-button、user-avatar、menu-item 等，根据实际元素用途命名）'
                            },
                            componentName: {
                                type: 'string',
                                description: 'React 组件名称（可选，用于更精确的文件定位）'
                            },
                            componentFilePath: {
                                type: 'string',
                                description: '组件文件路径（可选，如果已知可直接提供，例如：src/components/Button.tsx、src/pages/Login.tsx，根据实际文件路径填写）'
                            }
                        },
                        required: ['elementPath', 'testId']
                    }
                },
                {
                    name: 'confirm_and_commit',
                    description: '确认修改并提交代码到 Git。会创建新分支、提交更改并推送到远程仓库。',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            commitMessage: {
                                type: 'string',
                                description: '提交信息（例如：test: add data-testid to market）'
                            },
                            branch: {
                                type: 'string',
                                description: '目标分支名称（已废弃，现在直接在当前分支提交）'
                            },
                            autoPush: {
                                type: 'boolean',
                                description: '是否自动推送到远程仓库（默认：true）'
                            }
                        },
                        required: ['commitMessage']
                    }
                },
                {
                    name: 'create_pr',
                    description: '创建 Pull Request（Bitbucket Server）。需要在 confirm_and_commit 之后调用，或确保代码已提交并推送。PR 将从当前分支合并到目标分支（默认：develop）。如果不提供 title，将使用最后一次 commit 的 message。如果不提供 description，将使用默认格式（【问题原因】和【改动思路】）。',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            title: {
                                type: 'string',
                                description: 'PR 标题（可选，如果不提供则使用最后一次 commit 的 message）'
                            },
                            description: {
                                type: 'string',
                                description: 'PR 描述（可选，如果不提供则使用默认格式：\n【问题原因】\n【改动思路】）'
                            },
                            baseBranch: {
                                type: 'string',
                                description: '目标分支（默认：develop，PR 将从当前分支合并到此分支）'
                            },
                            projectKey: {
                                type: 'string',
                                description: 'Bitbucket 项目 Key（可选，会自动从远程 URL 解析）'
                            },
                            repositorySlug: {
                                type: 'string',
                                description: 'Bitbucket 仓库 Slug（可选，会自动从远程 URL 解析）'
                            },
                            baseUrl: {
                                type: 'string',
                                description: 'Bitbucket Server 基础 URL（可选，优先使用环境变量 BITBUCKET_BASE_URL）'
                            }
                        },
                        required: []
                    }
                },
                {
                    name: 'start_preview',
                    description: '启动前端项目预览。会检查并清理 3000 端口，执行 pnpm run dev 启动前端代码工程，等待 5 秒后在 Cursor 内置浏览器中打开 localhost:3000，并自动注入元素选择脚本。',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            projectPath: {
                                type: 'string',
                                description: '前端项目根目录路径（包含 package.json 的目录，默认为当前工作目录）'
                            },
                            port: {
                                type: 'number',
                                description: '前端项目端口（默认：3000）'
                            }
                        },
                        required: []
                    }
                },
                {
                    name: 'start_debug',
                    description: '启动浏览器预览调试start_debug功能。会在 3001 端口启动一个完整的调试页面（包含使用说明和控制面板），用于手动在目标网页中注入脚本并选择元素。',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            targetUrl: {
                                type: 'string',
                                description: '要预览的目标网页 URL（例如：http://localhost:3000）'
                            },
                            port: {
                                type: 'number',
                                description: '调试服务器端口（默认：3001）'
                            }
                        },
                        required: ['targetUrl']
                    }
                },
                {
                    name: 'get_selected_element',
                    description: '获取预览服务器中选中的元素信息。',
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'add_testid_to_constant',
                    description: '在常量文件中添加 testId 定义。建议在添加 data-testid 后使用，可以自动在 test.constant.ts 等文件中添加常量定义。注意：请根据用户实际提供的 testId 和组件信息填写参数，不要使用示例中的占位符值。',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            constantFile: {
                                type: 'string',
                                description: '常量文件路径（可选，会自动查找 test.constant.ts 等文件）'
                            },
                            constantKey: {
                                type: 'string',
                                description: '常量键名（例如：SUBMIT_BUTTON、USER_AVATAR、MENU_ITEM 等，根据实际组件或元素用途命名）'
                            },
                            testId: {
                                type: 'string',
                                description: 'testId 值（例如：submit-button、user-avatar、menu-item 等，根据实际元素用途命名）'
                            }
                        },
                        required: ['constantKey', 'testId']
                    }
                }
            ]
        };
    });
    // 处理工具调用
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            switch (name) {
                case 'add_testid': {
                    let { elementPath, testId, componentName, componentFilePath } = args;
                    if (!elementPath) {
                        throw new McpError(ErrorCode.InvalidParams, 'elementPath 和 testId 是必需的参数');
                    }
                    // 自动生成 testId（如果未提供）
                    if (!testId) {
                        console.error('[add_testid] testId not provided, generating automatically...');
                        // 基于 componentName 和 elementPath 生成 testId
                        const tag = extractTagName(elementPath);
                        const className = extractClassName(elementPath);
                        if (componentName) {
                            // 将 PascalCase 转换为 kebab-case
                            const kebabComponent = componentName
                                .replace(/([a-z])([A-Z])/g, '$1-$2')
                                .toLowerCase();
                            testId = `${kebabComponent}-${tag || 'element'}`;
                        }
                        else if (className) {
                            // 使用类名生成
                            testId = `${className.replace(/[^a-zA-Z0-9]/g, '-')}-${tag || 'element'}`;
                        }
                        else {
                            // 使用标签名
                            testId = `${tag || 'element'}-${Date.now()}`;
                        }
                        console.error(`[add_testid] Generated testId: ${testId}`);
                    }
                    // 定位文件
                    let filePath = componentFilePath;
                    if (!filePath) {
                        const elementInfo = {
                            domPath: elementPath,
                            componentInfo: componentName ? { name: componentName } : undefined
                        };
                        const locatedPath = await locateComponentFileByInfo(componentName, elementPath, process.cwd());
                        if (!locatedPath) {
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({
                                            success: false,
                                            message: `无法定位组件文件。请提供 componentName 或 componentFilePath 参数。\nDOM 路径: ${elementPath}`
                                        }, null, 2)
                                    }
                                ]
                            };
                        }
                        filePath = locatedPath;
                    }
                    // 添加 testid
                    const elementInfo = {
                        domPath: elementPath,
                        componentInfo: componentName ? { name: componentName, filePath } : { filePath }
                    };
                    const result = await addTestIdToElement(filePath, elementInfo, testId);
                    if (!result.success) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        success: false,
                                        message: result.message || result.error
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                    // 保存待提交的信息
                    pendingChanges = {
                        filePath: result.filePath,
                        testId,
                        elementInfo
                    };
                    // 应用修改
                    if (result.preview) {
                        await applyCodeModification(result.filePath, result.preview);
                    }
                    // 生成智能提示
                    const suggestions = await generateTestIdSuggestions(elementPath, testId, componentName, filePath, process.cwd());
                    const constantKey = generateConstantName(elementPath, testId, componentName);
                    // 自动添加到常量文件
                    console.error('[add_testid] Attempting to add testId to constant file...');
                    let constantResult = null;
                    if (suggestions.constantFile) {
                        try {
                            constantResult = await addTestIdToConstant(suggestions.constantFile, constantKey, testId);
                            console.error(`[add_testid] Constant file update: ${constantResult.success ? 'SUCCESS' : 'FAILED'}`);
                        }
                        catch (error) {
                            console.error('[add_testid] Failed to add to constant file:', error);
                        }
                    }
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: true,
                                    message: `成功为元素添加 data-testid="${testId}"`,
                                    filePath: result.filePath,
                                    diff: result.diff,
                                    preview: '代码已修改，请检查文件确认无误后调用 confirm_and_commit 提交更改。',
                                    constantUpdate: constantResult ? {
                                        success: constantResult.success,
                                        constantFile: suggestions.constantFile,
                                        constantKey: constantKey,
                                        message: constantResult.success
                                            ? `✅ 已自动添加到常量文件：${suggestions.constantFile}`
                                            : `⚠️  常量文件更新失败：${constantResult.message}`
                                    } : {
                                        success: false,
                                        message: '未找到常量文件，可手动添加'
                                    },
                                    suggestions: {
                                        constantFile: suggestions.constantFile,
                                        constantName: suggestions.constantName,
                                        constantKey: constantKey,
                                        constantValue: suggestions.constantValue,
                                        componentFile: suggestions.componentFile,
                                        tips: suggestions.suggestions,
                                        nextSteps: constantResult?.success
                                            ? [
                                                `✅ testId 已添加到常量文件`,
                                                `✅ 可在组件中使用：data-testid={${suggestions.constantName}.${constantKey}}`,
                                                `确认修改后调用 confirm_and_commit 提交代码`
                                            ]
                                            : [
                                                `1. 在常量文件 \`${suggestions.constantFile}\` 中添加：\`${suggestions.constantName}.${constantKey} = '${testId}'\``,
                                                `2. 在组件中使用：\`data-testid={${suggestions.constantName}.${constantKey}}\``,
                                                `3. 或使用工具：\`add_testid_to_constant\` 手动添加常量`,
                                                `4. 确认修改后调用 \`confirm_and_commit\` 提交代码`
                                            ]
                                    }
                                }, null, 2)
                            }
                        ]
                    };
                }
                case 'confirm_and_commit': {
                    const { commitMessage, branch, autoPush = true } = args;
                    if (!commitMessage) {
                        throw new McpError(ErrorCode.InvalidParams, 'commitMessage 是必需的参数');
                    }
                    const gitOps = new GitOperations(process.cwd());
                    // 获取当前分支（不切换分支，直接在当前分支提交）
                    const currentBranch = await gitOps.getCurrentBranch();
                    // 提交前先拉取最新代码，避免冲突
                    console.error('[confirm_and_commit] Pulling from remote...');
                    const pullResult = await gitOps.pullFromRemote('origin', currentBranch);
                    if (!pullResult.success) {
                        // 如果是冲突错误，直接返回，不继续提交
                        if (pullResult.message?.includes('冲突')) {
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({
                                            success: false,
                                            message: pullResult.message,
                                            error: pullResult.error,
                                            nextStep: '请先解决冲突：1. 手动解决冲突文件 2. git add 冲突文件 3. 再次调用 confirm_and_commit'
                                        }, null, 2)
                                    }
                                ]
                            };
                        }
                        // 其他错误（网络问题、远程分支不存在等），记录警告但继续提交
                        console.error('[confirm_and_commit] Pull warning (will continue):', pullResult.message);
                    }
                    let result;
                    let commitMode = 'none';
                    // 判断提交模式
                    if (pendingChanges) {
                        // 模式 1: 有 pendingChanges，只提交指定文件
                        commitMode = 'pending';
                        console.error('[confirm_and_commit] Mode: pending changes');
                        console.error(`[confirm_and_commit] File to commit: ${pendingChanges.filePath}`);
                        result = await gitOps.commitChanges([pendingChanges.filePath], commitMessage);
                    }
                    else {
                        // 模式 2: 没有 pendingChanges，检查是否有其他改动
                        console.error('[confirm_and_commit] Mode: checking for uncommitted changes');
                        const hasChanges = await gitOps.hasUncommittedChanges();
                        if (!hasChanges) {
                            // 没有任何改动
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({
                                            success: false,
                                            message: '没有需要提交的更改。\n\n可能的原因：\n  1. 工作区和暂存区都是干净的\n  2. 还没有调用 add_testid 添加任何修改\n  3. 所有改动已经提交过了'
                                        }, null, 2)
                                    }
                                ]
                            };
                        }
                        // 有改动，执行 git add --all
                        commitMode = 'all';
                        console.error('[confirm_and_commit] Found uncommitted changes, executing git add --all');
                        const addResult = await gitOps.addAll();
                        if (!addResult.success) {
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({
                                            success: false,
                                            message: '执行 git add --all 失败，没有文件被添加到暂存区'
                                        }, null, 2)
                                    }
                                ]
                            };
                        }
                        console.error(`[confirm_and_commit] Added ${addResult.filesAdded.length} files to staging area`);
                        console.error(`[confirm_and_commit] Files: ${addResult.filesAdded.join(', ')}`);
                        // 提交所有暂存区的文件
                        result = await gitOps.commitAllStaged(commitMessage);
                    }
                    if (!result.success) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(result, null, 2)
                                }
                            ]
                        };
                    }
                    // 推送到远程（如果需要）
                    if (autoPush) {
                        console.error('[confirm_and_commit] Pushing to remote...');
                        // 不传递分支参数，使用当前分支，直接执行 git push
                        const pushResult = await gitOps.pushToRemote();
                        const filesInfo = result.filesCommitted
                            ? `\n  提交文件数: ${result.filesCommitted.length}\n  文件列表: ${result.filesCommitted.slice(0, 5).join(', ')}${result.filesCommitted.length > 5 ? '...' : ''}`
                            : '';
                        if (pushResult.success) {
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({
                                            success: true,
                                            message: `代码已提交并推送`,
                                            commitMode: commitMode === 'pending' ? '只提交指定文件' : '提交所有改动 (git add --all)',
                                            branch: currentBranch,
                                            filesCommitted: result.filesCommitted,
                                            summary: commitMode === 'pending'
                                                ? `已提交文件: ${pendingChanges.filePath}`
                                                : `已提交 ${result.filesCommitted?.length || 0} 个文件${filesInfo}`,
                                            nextStep: '可以调用 create_pr 创建 Pull Request'
                                        }, null, 2)
                                    }
                                ]
                            };
                        }
                        else {
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({
                                            success: true,
                                            message: `代码已提交到分支 ${currentBranch}，但推送失败`,
                                            commitMode: commitMode === 'pending' ? '只提交指定文件' : '提交所有改动 (git add --all)',
                                            branch: currentBranch,
                                            filesCommitted: result.filesCommitted,
                                            pushError: pushResult.error,
                                            nextStep: '可以手动执行 git push 或调用 create_pr 创建 Pull Request'
                                        }, null, 2)
                                    }
                                ]
                            };
                        }
                    }
                    const filesInfo = result.filesCommitted
                        ? `\n  提交文件数: ${result.filesCommitted.length}\n  文件列表: ${result.filesCommitted.slice(0, 5).join(', ')}${result.filesCommitted.length > 5 ? '...' : ''}`
                        : '';
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: true,
                                    message: result.message,
                                    commitMode: commitMode === 'pending' ? '只提交指定文件' : '提交所有改动 (git add --all)',
                                    branch: currentBranch,
                                    filesCommitted: result.filesCommitted,
                                    summary: commitMode === 'pending'
                                        ? `已提交文件: ${pendingChanges.filePath}`
                                        : `已提交 ${result.filesCommitted?.length || 0} 个文件${filesInfo}`,
                                    nextStep: autoPush ? '可以调用 create_pr 创建 Pull Request' : '可以手动执行 git push 或调用 create_pr 创建 Pull Request'
                                }, null, 2)
                            }
                        ]
                    };
                }
                case 'create_pr': {
                    const { title, description, baseBranch = 'develop', projectKey, repositorySlug, baseUrl } = args;
                    if (!title) {
                        throw new McpError(ErrorCode.InvalidParams, 'title 是必需的参数');
                    }
                    const username = process.env.BITBUCKET_USERNAME;
                    const password = process.env.BITBUCKET_PASSWORD || process.env.BITBUCKET_TOKEN;
                    if (!username || !password) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        success: false,
                                        message: '需要设置 BITBUCKET_USERNAME 和 BITBUCKET_PASSWORD (或 BITBUCKET_TOKEN) 环境变量来创建 PR'
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                    const gitOps = new GitOperations(process.cwd());
                    // 获取当前分支
                    const currentBranch = await gitOps.getCurrentBranch();
                    // 如果没有提供 title，使用最后一次 commit 的 message
                    let prTitle = title;
                    if (!prTitle) {
                        prTitle = await gitOps.getLastCommitMessage();
                        if (!prTitle) {
                            throw new McpError(ErrorCode.InvalidParams, '无法获取最后一次提交信息，请提供 title 参数');
                        }
                    }
                    // 格式化 PR 描述
                    let prDescription = description;
                    if (!prDescription) {
                        prDescription = `【问题原因】\n【改动思路】`;
                    }
                    else {
                        // 如果提供了描述但没有格式，自动添加格式
                        if (!prDescription.includes('【问题原因】') && !prDescription.includes('【改动思路】')) {
                            prDescription = `【问题原因】\n${prDescription}\n\n【改动思路】`;
                        }
                    }
                    // 从当前分支创建 PR 到当前分支（来源和目标都是当前分支）
                    const result = await gitOps.createPullRequest(prTitle, prDescription, undefined, // baseBranch 已废弃，使用当前分支作为目标分支
                    {
                        baseUrl,
                        username,
                        password,
                        projectKey,
                        repositorySlug
                    });
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result, null, 2)
                            }
                        ]
                    };
                }
                case 'start_preview': {
                    try {
                        const projectPath = args?.projectPath || process.cwd();
                        const port = args?.port || 3000;
                        const wsPort = 3001;
                        // 1. 检查并清理 3000 端口
                        const portManager = new PortManager();
                        await portManager.cleanPort(port);
                        // 2. 启动前端项目
                        const devServer = new DevServer(projectPath, port);
                        await devServer.start();
                        // 3. 等待 5 秒
                        console.error('Waiting 5 seconds for dev server to be ready...');
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        // 4. 确保 WebSocket 服务器已启动（使用 3001 端口）
                        if (!previewServer) {
                            previewServer = new PreviewServer({
                                targetUrl: `http://localhost:${port}`,
                                port: wsPort
                            });
                            await previewServer.start();
                            console.error(`WebSocket server started on port ${wsPort}`);
                        }
                        // 5. 生成注入脚本 URL
                        const targetUrl = `http://localhost:${port}`;
                        const injectScriptUrl = `http://localhost:${wsPort}/inject-script.js`;
                        const injectScriptCode = `fetch('${injectScriptUrl}').then(r => r.text()).then(eval);`;
                        return {
                            content: [{
                                    type: 'text',
                                    text: JSON.stringify({
                                        success: true,
                                        message: `前端项目已启动！`,
                                        projectPath: projectPath,
                                        targetUrl: targetUrl,
                                        wsPort: wsPort,
                                        injectScriptUrl: injectScriptUrl,
                                        injectScriptCode: injectScriptCode,
                                        instructions: [
                                            `✅ 前端项目已在端口 ${port} 启动`,
                                            `✅ WebSocket 服务器已在端口 ${wsPort} 启动`,
                                            ``,
                                            `请在 Cursor 内置浏览器中打开：${targetUrl}`,
                                            ``,
                                            `Cursor 会自动注入元素选择脚本，页面右侧会显示控制面板`,
                                            `点击"开始选择元素"按钮即可开始选择`,
                                            ``,
                                            `如果脚本未自动注入，可以在控制台手动执行：`,
                                            `${injectScriptCode}`
                                        ].join('\n'),
                                        autoInject: {
                                            url: targetUrl,
                                            script: injectScriptCode,
                                            description: 'Cursor 会自动在目标网页中注入脚本'
                                        },
                                        nextStep: `在 Cursor 中打开 ${targetUrl} 开始选择元素`
                                    }, null, 2)
                                }]
                        };
                    }
                    catch (error) {
                        return {
                            content: [{
                                    type: 'text',
                                    text: JSON.stringify({
                                        success: false,
                                        error: error instanceof Error ? error.message : String(error),
                                        message: '启动前端项目预览失败'
                                    }, null, 2)
                                }]
                        };
                    }
                }
                case 'start_debug': {
                    const { targetUrl, port } = args;
                    if (!targetUrl) {
                        throw new McpError(ErrorCode.InvalidParams, 'targetUrl 是必需的参数');
                    }
                    try {
                        // 如果已有服务器在运行，先停止
                        if (previewServer) {
                            previewServer.stop();
                        }
                        // 创建新的预览服务器
                        previewServer = new PreviewServer({
                            targetUrl,
                            port: port || 3001
                        });
                        const { url, port: actualPort } = await previewServer.start();
                        // 生成注入脚本代码
                        const injectScriptCode = `fetch('http://localhost:${actualPort}/inject-script.js').then(r => r.text()).then(eval);`;
                        const injectScriptUrl = `http://localhost:${actualPort}/inject-script.js`;
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        success: true,
                                        message: `调试页面已启动（端口 ${actualPort}）`,
                                        debugPageUrl: url,
                                        targetUrl: targetUrl,
                                        injectScriptUrl: injectScriptUrl,
                                        injectScriptCode: injectScriptCode,
                                        instructions: [
                                            `✅ 调试页面已启动：${url}`,
                                            `✅ 目标网页：${targetUrl}`,
                                            ``,
                                            `使用步骤：`,
                                            `1. 打开调试页面：${url}`,
                                            `2. 按照页面说明在目标网页中注入脚本`,
                                            `3. 在目标网页中选择元素`,
                                            `4. 在调试页面的控制面板中查看元素信息`
                                        ].join('\n'),
                                        nextStep: `打开浏览器访问 ${url} 查看完整使用说明`
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                    catch (error) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        success: false,
                                        error: error instanceof Error ? error.message : String(error),
                                        message: '启动调试页面失败'
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                }
                case 'get_selected_element': {
                    if (!previewServer) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        success: false,
                                        message: '预览服务器未启动。请先调用 start_preview 启动服务器。'
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                    const selectedElement = previewServer.getSelectedElement();
                    if (!selectedElement) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        success: false,
                                        message: '尚未选择元素。请在预览页面中选择一个元素。'
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                    // 如果已有 testId，生成智能提示
                    if (selectedElement.testId && selectedElement.elementPath) {
                        const suggestions = await generateTestIdSuggestions(selectedElement.elementPath, selectedElement.testId, selectedElement.componentName, undefined, process.cwd());
                        const constantKey = generateConstantName(selectedElement.elementPath, selectedElement.testId, selectedElement.componentName);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        success: true,
                                        element: selectedElement,
                                        message: `已选择元素，DOM 路径: ${selectedElement.elementPath}，testId: ${selectedElement.testId}`,
                                        suggestions: {
                                            constantFile: suggestions.constantFile,
                                            constantName: suggestions.constantName,
                                            constantKey: constantKey,
                                            constantValue: suggestions.constantValue,
                                            tips: suggestions.suggestions,
                                            nextSteps: [
                                                `1. 调用 \`add_testid\` 工具添加 data-testid 属性`,
                                                `2. 在常量文件 \`${suggestions.constantFile}\` 中添加：\`${suggestions.constantName}.${constantKey} = '${selectedElement.testId}'\``,
                                                `3. 在组件中使用常量：\`data-testid={${suggestions.constantName}.${constantKey}}\``,
                                                `4. 或使用工具：\`add_testid_to_constant\` 自动添加常量`,
                                                `5. 确认修改后调用 \`confirm_and_commit\` 提交代码`
                                            ]
                                        },
                                        quickAction: `可以调用 add_testid 工具添加 testid，参数：elementPath="${selectedElement.elementPath}", testId="${selectedElement.testId}"`
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: true,
                                    element: selectedElement,
                                    message: `已选择元素，DOM 路径: ${selectedElement.elementPath}`
                                }, null, 2)
                            }
                        ]
                    };
                }
                case 'add_testid_to_constant': {
                    const { constantFile, constantKey, testId } = args;
                    if (!constantKey || !testId) {
                        throw new McpError(ErrorCode.InvalidParams, 'constantKey 和 testId 是必需的参数');
                    }
                    // 如果没有提供文件路径，自动查找
                    let targetFile = constantFile;
                    if (!targetFile) {
                        const { findTestConstantFiles } = await import('./utils/testIdHelper.js');
                        const files = await findTestConstantFiles(process.cwd());
                        if (files.length > 0) {
                            targetFile = files[0];
                        }
                        else {
                            // 创建默认文件
                            const { join } = await import('path');
                            targetFile = join(process.cwd(), 'test.constant.ts');
                        }
                    }
                    const result = await addTestIdToConstant(targetFile, constantKey, testId);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: result.success,
                                    message: result.message,
                                    constantFile: targetFile,
                                    constantKey,
                                    testId,
                                    content: result.content,
                                    nextStep: result.success
                                        ? '常量已添加，可以在组件中使用。确认修改后调用 confirm_and_commit 提交代码。'
                                        : '添加常量失败，请检查错误信息。'
                                }, null, 2)
                            }
                        ]
                    };
                }
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `未知的工具: ${name}`);
            }
        }
        catch (error) {
            if (error instanceof McpError) {
                throw error;
            }
            throw new McpError(ErrorCode.InternalError, `工具执行失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    return server;
}
/**
 * 启动服务器
 */
async function main() {
    const server = await createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('TestID Helper MCP Server 已启动');
}
// 处理未捕获的错误
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的 Promise 拒绝:', reason);
    process.exit(1);
});
// 启动服务器
main().catch((error) => {
    console.error('启动失败:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map