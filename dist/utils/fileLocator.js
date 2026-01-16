/**
 * 文件定位工具
 * 用于根据组件名称、类名等信息定位源代码文件
 */
import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { extractClassName } from '../tools/elementParser.js';
/**
 * 在指定目录中搜索包含特定文本的文件
 */
export async function searchFiles(pattern, rootDir = process.cwd(), fileExtensions = ['.tsx', '.ts', '.jsx', '.js']) {
    const results = [];
    for (const ext of fileExtensions) {
        const globPattern = `**/*${ext}`;
        const files = await glob(globPattern, {
            cwd: rootDir,
            ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
        });
        for (const file of files) {
            try {
                const content = await readFile(join(rootDir, file), 'utf-8');
                // 简单的文本匹配（可以优化为正则表达式）
                if (content.includes(pattern) || new RegExp(pattern, 'i').test(content)) {
                    results.push(join(rootDir, file));
                }
            }
            catch (error) {
                // 忽略读取失败的文件
                continue;
            }
        }
    }
    return results;
}
/**
 * 通过组件名称搜索文件
 */
export async function locateComponentFile(componentName, rootDir = process.cwd()) {
    // 搜索包含组件导出的文件
    const patterns = [
        `export.*${componentName}`,
        `function ${componentName}`,
        `const ${componentName}`,
        `class ${componentName}`,
        `<${componentName}`
    ];
    const allResults = [];
    for (const pattern of patterns) {
        const results = await searchFiles(pattern, rootDir);
        allResults.push(...results);
    }
    // 去重
    return Array.from(new Set(allResults));
}
/**
 * 通过类名搜索文件
 */
export async function locateFileByClassName(className, rootDir = process.cwd()) {
    // 搜索包含类名的文件
    return searchFiles(className, rootDir);
}
/**
 * 综合定位组件文件
 * 结合多种策略找到最可能的文件
 */
export async function locateComponentFileByInfo(componentName, domPath, rootDir = process.cwd()) {
    const candidates = [];
    // 策略 1: 通过组件名称搜索
    if (componentName) {
        const filesByComponent = await locateComponentFile(componentName, rootDir);
        candidates.push(...filesByComponent);
    }
    // 策略 2: 通过 DOM 路径中的类名搜索
    if (domPath) {
        const className = extractClassName(domPath);
        if (className) {
            const filesByClass = await locateFileByClassName(className, rootDir);
            candidates.push(...filesByClass);
        }
    }
    // 策略 3: 综合判断，返回最可能的文件
    // 优先返回 .tsx 和 .jsx 文件
    const tsxFiles = candidates.filter(f => f.endsWith('.tsx') || f.endsWith('.jsx'));
    if (tsxFiles.length > 0) {
        return tsxFiles[0];
    }
    // 如果没有 tsx/jsx，返回第一个结果
    if (candidates.length > 0) {
        return candidates[0];
    }
    return null;
}
//# sourceMappingURL=fileLocator.js.map