/**
 * TestID 辅助工具
 * 提供智能提示和建议
 */
import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import { join } from 'path';
import { extractTagName, extractClassName } from '../tools/elementParser.js';
/**
 * 查找测试常量文件
 */
export async function findTestConstantFiles(rootDir = process.cwd()) {
    const patterns = [
        '**/test*.constant*.ts',
        '**/test*.constant*.tsx',
        '**/test*.constants*.ts',
        '**/test*.constants*.tsx',
        '**/constants/test*.ts',
        '**/constants/test*.tsx',
        '**/testIds.ts',
        '**/testIds.tsx',
        '**/test-ids.ts',
        '**/test-ids.tsx'
    ];
    const results = [];
    for (const pattern of patterns) {
        const files = await glob(pattern, {
            cwd: rootDir,
            ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
        });
        results.push(...files.map(f => join(rootDir, f)));
    }
    return Array.from(new Set(results));
}
/**
 * 检查常量文件中是否已有 TEST_IDS 定义
 */
export async function checkTestIdsConstant(filePath) {
    try {
        const content = await readFile(filePath, 'utf-8');
        // 检查是否有 TEST_IDS 或类似的定义
        const testIdsMatch = content.match(/(?:export\s+)?(?:const|let)\s+(?:TEST_IDS|TESTIDS|TestIds|testIds)\s*[:=]\s*\{([^}]*)\}/s);
        if (testIdsMatch) {
            // 尝试解析已有的 testIds
            const testIdsContent = testIdsMatch[1];
            const testIds = {};
            // 简单解析 key: value 对
            const pairs = testIdsContent.match(/(\w+)\s*:\s*['"]([^'"]+)['"]/g);
            if (pairs) {
                pairs.forEach(pair => {
                    const match = pair.match(/(\w+)\s*:\s*['"]([^'"]+)['"]/);
                    if (match) {
                        testIds[match[1]] = match[2];
                    }
                });
            }
            return {
                exists: true,
                content,
                testIds
            };
        }
        return { exists: false, content };
    }
    catch (error) {
        return { exists: false };
    }
}
/**
 * 生成常量名称建议
 */
export function generateConstantName(elementPath, testId, componentName) {
    // 如果提供了组件名，优先使用
    if (componentName) {
        // 将组件名转换为常量格式：SubmitButton -> SUBMIT_BUTTON, UserAvatar -> USER_AVATAR
        return componentName
            .replace(/([A-Z])/g, '_$1')
            .replace(/^_/, '')
            .toUpperCase();
    }
    // 从 testId 生成：submit-button -> SUBMIT_BUTTON, user-avatar -> USER_AVATAR
    if (testId) {
        return testId
            .replace(/-/g, '_')
            .toUpperCase();
    }
    // 从 DOM 路径生成
    const tagName = extractTagName(elementPath);
    const className = extractClassName(elementPath);
    if (className) {
        return className
            .replace(/[.:-]/g, '_')
            .toUpperCase();
    }
    if (tagName) {
        return `${tagName.toUpperCase()}_ELEMENT`;
    }
    return 'ELEMENT';
}
/**
 * 生成智能提示
 */
export async function generateTestIdSuggestions(elementPath, testId, componentName, componentFilePath, rootDir = process.cwd()) {
    const suggestions = [];
    // 1. 查找常量文件
    const constantFiles = await findTestConstantFiles(rootDir);
    let constantFile;
    let constantName;
    let constantValue;
    if (constantFiles.length > 0) {
        // 使用第一个找到的常量文件
        constantFile = constantFiles[0];
        const constantInfo = await checkTestIdsConstant(constantFile);
        if (constantInfo.exists) {
            constantName = 'TEST_IDS';
            constantValue = testId;
            // 生成建议的常量键名
            const suggestedKey = generateConstantName(elementPath, testId, componentName);
            suggestions.push(`在 \`${constantFile}\` 中的 \`TEST_IDS\` 对象中添加：\`${suggestedKey}: '${testId}'\``);
            // 检查是否已存在相同的值
            if (constantInfo.testIds) {
                const existingKey = Object.entries(constantInfo.testIds).find(([_, value]) => value === testId);
                if (existingKey) {
                    suggestions.push(`⚠️ 注意：testId "${testId}" 已存在于常量中，键名为 "${existingKey[0]}"`);
                }
            }
        }
        else {
            suggestions.push(`在 \`${constantFile}\` 中创建 \`TEST_IDS\` 常量对象，并添加：\`${generateConstantName(elementPath, testId, componentName)}: '${testId}'\``);
        }
    }
    else {
        // 没有找到常量文件，建议创建
        const suggestedFileName = 'test.constant.ts';
        suggestions.push(`建议创建 \`${suggestedFileName}\` 文件，定义 \`TEST_IDS\` 常量对象`);
        constantFile = join(rootDir, suggestedFileName);
    }
    // 2. 组件文件提示
    if (componentFilePath) {
        suggestions.push(`在组件文件 \`${componentFilePath}\` 中添加 \`data-testid={TEST_IDS.${generateConstantName(elementPath, testId, componentName)}}\``);
    }
    else if (componentName) {
        suggestions.push(`找到组件 \`${componentName}\` 的文件，添加 \`data-testid={TEST_IDS.${generateConstantName(elementPath, testId, componentName)}}\``);
    }
    // 3. 使用建议
    suggestions.push(`使用方式：\`import { TEST_IDS } from './test.constant';\` 然后在 JSX 中使用 \`data-testid={TEST_IDS.${generateConstantName(elementPath, testId, componentName)}}\``);
    return {
        constantFile,
        constantName: constantName || 'TEST_IDS',
        constantValue: testId,
        componentFile: componentFilePath,
        suggestions
    };
}
/**
 * 在常量文件中添加 testId
 */
export async function addTestIdToConstant(constantFile, constantKey, testId) {
    try {
        let content;
        let exists = false;
        try {
            content = await readFile(constantFile, 'utf-8');
            exists = true;
        }
        catch {
            // 文件不存在，创建新文件
            content = `export const TEST_IDS = {\n  ${constantKey}: '${testId}'\n} as const;\n`;
            await writeFile(constantFile, content, 'utf-8');
            return {
                success: true,
                message: `已创建常量文件 ${constantFile} 并添加 ${constantKey}`,
                content
            };
        }
        // 检查是否已存在 TEST_IDS
        const testIdsMatch = content.match(/(?:export\s+)?(?:const|let)\s+(?:TEST_IDS|TESTIDS|TestIds|testIds)\s*[:=]\s*\{([^}]*)\}/s);
        if (testIdsMatch) {
            // 已存在，添加新字段
            const beforeMatch = content.substring(0, testIdsMatch.index + testIdsMatch[0].indexOf('{') + 1);
            const afterMatch = content.substring(testIdsMatch.index + testIdsMatch[0].lastIndexOf('}'));
            const existingContent = testIdsMatch[1].trim();
            // 检查是否已存在相同的 key
            if (existingContent.includes(`${constantKey}:`)) {
                return {
                    success: false,
                    message: `常量 ${constantKey} 已存在`
                };
            }
            const newContent = existingContent
                ? `${existingContent},\n  ${constantKey}: '${testId}'`
                : `  ${constantKey}: '${testId}'`;
            content = beforeMatch + newContent + '\n' + afterMatch;
        }
        else {
            // 不存在，添加新的 TEST_IDS 定义
            // 尝试在文件末尾添加
            content += `\n\nexport const TEST_IDS = {\n  ${constantKey}: '${testId}'\n} as const;\n`;
        }
        await writeFile(constantFile, content, 'utf-8');
        return {
            success: true,
            message: `已在 ${constantFile} 中添加 ${constantKey}: '${testId}'`,
            content
        };
    }
    catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : String(error)
        };
    }
}
//# sourceMappingURL=testIdHelper.js.map