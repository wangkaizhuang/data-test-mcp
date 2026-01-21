/**
 * 添加 data-testid 工具
 * 使用 AST 解析和修改代码
 */
import { readFile, writeFile } from 'fs/promises';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { extractTagName, extractClassName } from './elementParser.js';
/**
 * 检查 JSX 元素是否已有 data-testid 属性
 */
function hasTestId(node, testId) {
    const openingElement = node.openingElement;
    const attributes = openingElement.attributes;
    for (const attr of attributes) {
        if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
            if (attr.name.name === 'data-testid') {
                if (testId) {
                    // 检查值是否匹配
                    if (t.isStringLiteral(attr.value)) {
                        return attr.value.value === testId;
                    }
                }
                return true; // 已有 data-testid
            }
        }
    }
    return false;
}
/**
 * 从 DOM 路径中提取 ID
 */
function extractId(domPath) {
    const idMatch = domPath.match(/#([\w-]+)/);
    return idMatch ? idMatch[1] : null;
}
/**
 * 计算元素匹配分数（0-100，分数越高越匹配）
 */
function calculateMatchScore(node, elementInfo) {
    const openingElement = node.openingElement;
    const tagName = openingElement.name;
    let score = 0;
    let maxScore = 0;
    // 1. 标签名匹配（权重：30）
    maxScore += 30;
    const expectedTag = extractTagName(elementInfo.domPath);
    if (expectedTag) {
        if (t.isJSXIdentifier(tagName)) {
            if (tagName.name.toLowerCase() === expectedTag.toLowerCase()) {
                score += 30;
            }
        }
        else if (t.isJSXMemberExpression(tagName)) {
            // 组件名匹配（部分匹配）
            const componentName = tagName.object && t.isJSXIdentifier(tagName.object)
                ? tagName.object.name
                : '';
            if (componentName.toLowerCase().includes(expectedTag.toLowerCase())) {
                score += 15; // 部分匹配给一半分数
            }
        }
    }
    else {
        score += 30; // 如果没有期望标签，给满分
    }
    // 2. ID 匹配（权重：40，最高优先级）
    maxScore += 40;
    const expectedId = extractId(elementInfo.domPath);
    if (expectedId) {
        for (const attr of openingElement.attributes) {
            if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
                if (attr.name.name === 'id') {
                    if (t.isStringLiteral(attr.value)) {
                        if (attr.value.value === expectedId) {
                            score += 40;
                        }
                    }
                    else if (t.isJSXExpressionContainer(attr.value)) {
                        // 对于表达式，给部分分数
                        score += 20;
                    }
                    break;
                }
            }
        }
    }
    else {
        score += 40; // 如果没有期望 ID，给满分
    }
    // 3. 类名匹配（权重：30）
    maxScore += 30;
    const expectedClass = extractClassName(elementInfo.domPath);
    if (expectedClass) {
        for (const attr of openingElement.attributes) {
            if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
                if (attr.name.name === 'className' || attr.name.name === 'class') {
                    if (t.isStringLiteral(attr.value)) {
                        const className = attr.value.value;
                        if (className === expectedClass) {
                            score += 30; // 完全匹配
                        }
                        else if (className.includes(expectedClass)) {
                            score += 20; // 包含匹配
                        }
                        else {
                            // 检查是否是 Tailwind 类名（可能包含特殊字符）
                            const normalizedClass = expectedClass.replace(/[:\[\]]/g, '');
                            if (className.includes(normalizedClass)) {
                                score += 15; // 部分匹配
                            }
                        }
                    }
                    else if (t.isJSXExpressionContainer(attr.value)) {
                        // 对于表达式，给部分分数（可能是动态类名）
                        score += 10;
                    }
                    break;
                }
            }
        }
    }
    else {
        score += 30; // 如果没有期望类名，给满分
    }
    // 计算百分比分数
    return maxScore > 0 ? (score / maxScore) * 100 : 0;
}
/**
 * 检查 JSX 元素是否匹配目标元素（宽松匹配）
 */
function matchesElement(node, elementInfo, minScore = 50) {
    const score = calculateMatchScore(node, elementInfo);
    return score >= minScore;
}
/**
 * 为 JSX 元素添加 data-testid 属性
 */
function addTestIdAttribute(node, testId) {
    const openingElement = node.openingElement;
    // 检查是否已存在
    if (hasTestId(node, testId)) {
        return;
    }
    // 创建新的 data-testid 属性
    const testIdAttr = t.jsxAttribute(t.jsxIdentifier('data-testid'), t.stringLiteral(testId));
    // 添加到属性列表
    openingElement.attributes.push(testIdAttr);
}
/**
 * 获取节点的位置信息（行号和列号）
 */
function getNodeLocation(node) {
    if (node.loc) {
        return {
            line: node.loc.start.line,
            column: node.loc.start.column + 1 // 列号从 1 开始
        };
    }
    return null;
}
/**
 * 查找匹配的 JSX 元素（返回最佳匹配和所有候选，包含位置信息）
 */
function findMatchingJSXElement(ast, elementInfo) {
    const candidates = [];
    let bestMatch = null;
    traverse(ast, {
        JSXElement(path) {
            const score = calculateMatchScore(path.node, elementInfo);
            // 收集所有可能的候选（分数 >= 30）
            if (score >= 30) {
                const tagName = path.node.openingElement.name;
                const tag = t.isJSXIdentifier(tagName) ? tagName.name : 'Component';
                const location = getNodeLocation(path.node);
                const locationStr = location ? ` (行 ${location.line}, 列 ${location.column})` : '';
                const info = `标签: ${tag}, 匹配度: ${score.toFixed(1)}%${locationStr}`;
                candidates.push({
                    node: path.node,
                    score,
                    info,
                    location
                });
                // 更新最佳匹配
                if (!bestMatch || score > bestMatch.score) {
                    bestMatch = { node: path.node, score, location };
                }
            }
        }
    });
    // 按分数排序候选
    candidates.sort((a, b) => b.score - a.score);
    // 确定最佳匹配节点
    let resultNode = null;
    let resultLocation = null;
    if (bestMatch !== null) {
        const match = bestMatch;
        if (match.score >= 50) {
            resultNode = match.node;
            resultLocation = match.location;
        }
    }
    return {
        node: resultNode,
        location: resultLocation,
        candidates: candidates.slice(0, 5) // 只返回前 5 个候选
    };
}
/**
 * 为指定元素添加 data-testid 属性
 */
export async function addTestIdToElement(filePath, elementInfo, testId) {
    try {
        // 1. 读取文件
        const fileContent = await readFile(filePath, 'utf-8');
        // 2. 解析 AST（启用位置信息）
        const ast = parse(fileContent, {
            sourceType: 'module',
            plugins: [
                'jsx',
                'typescript',
                'decorators-legacy',
                'classProperties',
                'objectRestSpread',
                'asyncGenerators',
                'functionBind',
                'exportDefaultFrom',
                'exportNamespaceFrom',
                'dynamicImport',
                'nullishCoalescingOperator',
                'optionalChaining'
            ],
            tokens: false,
            ranges: false
        });
        // 3. 查找匹配的 JSX 元素（包含位置信息）
        const { node: targetNode, location: targetLocation, candidates } = findMatchingJSXElement(ast, elementInfo);
        if (!targetNode) {
            // 提供详细的错误信息和候选建议
            let errorMessage = `未找到匹配的元素（匹配度 >= 50%）。\nDOM 路径: ${elementInfo.domPath}\n\n`;
            if (candidates.length > 0) {
                errorMessage += `找到 ${candidates.length} 个可能的候选元素：\n`;
                candidates.forEach((candidate, index) => {
                    errorMessage += `${index + 1}. ${candidate.info}\n`;
                });
                errorMessage += `\n提示：\n`;
                errorMessage += `1. 请检查 DOM 路径是否正确\n`;
                errorMessage += `2. 如果路径过深，可以尝试简化路径（去掉中间层级）\n`;
                errorMessage += `3. 如果使用了动态类名（className={...}），可能需要手动指定 componentFilePath\n`;
                errorMessage += `4. 可以尝试提供 componentName 或 componentFilePath 参数以提高匹配精度\n`;
            }
            else {
                errorMessage += `未找到任何可能的候选元素。\n`;
                errorMessage += `可能的原因：\n`;
                errorMessage += `1. DOM 路径与源代码中的 JSX 结构不匹配\n`;
                errorMessage += `2. 元素可能是动态生成的，不在当前文件中\n`;
                errorMessage += `3. 类名或 ID 在运行时才添加，源代码中没有\n`;
                errorMessage += `\n建议：\n`;
                errorMessage += `- 尝试提供 componentName 或 componentFilePath 参数\n`;
                errorMessage += `- 检查元素是否在正确的组件文件中\n`;
                errorMessage += `- 如果路径包含 :nth-of-type，尝试简化路径\n`;
            }
            return {
                success: false,
                message: errorMessage,
                details: {
                    domPath: elementInfo.domPath,
                    candidates: candidates.map(c => c.info),
                    suggestions: [
                        '提供 componentName 参数',
                        '提供 componentFilePath 参数',
                        '简化 DOM 路径（去掉中间层级）',
                        '检查元素是否在正确的文件中'
                    ]
                }
            };
        }
        // 4. 检查是否已有 data-testid
        if (hasTestId(targetNode, testId)) {
            return {
                success: false,
                message: `元素已存在 data-testid="${testId}"`,
                location: targetLocation ? {
                    filePath,
                    line: targetLocation.line,
                    column: targetLocation.column
                } : undefined
            };
        }
        // 5. 先返回位置信息，让 Cursor 定位到代码位置
        // 注意：这里不立即修改，而是返回位置信息
        // 实际的修改会在用户确认后进行
        // 6. 添加 data-testid 属性
        addTestIdAttribute(targetNode, testId);
        // 7. 生成新代码
        const output = generate(ast, {
            retainLines: false,
            compact: false,
            comments: true
        }, fileContent);
        const newCode = output.code;
        // 8. 生成 diff（简单版本）
        const diff = generateSimpleDiff(fileContent, newCode);
        return {
            success: true,
            filePath,
            diff,
            preview: newCode,
            location: targetLocation ? {
                filePath,
                line: targetLocation.line,
                column: targetLocation.column
            } : undefined
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            message: '代码修改失败'
        };
    }
}
/**
 * 生成简单的 diff（用于预览）
 */
function generateSimpleDiff(oldCode, newCode) {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    let diff = '';
    const maxLines = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLines; i++) {
        const oldLine = oldLines[i] || '';
        const newLine = newLines[i] || '';
        if (oldLine !== newLine) {
            if (oldLine) {
                diff += `- ${oldLine}\n`;
            }
            if (newLine) {
                diff += `+ ${newLine}\n`;
            }
        }
        else {
            diff += `  ${oldLine}\n`;
        }
    }
    return diff;
}
/**
 * 应用代码修改（写入文件）
 */
export async function applyCodeModification(filePath, newCode) {
    await writeFile(filePath, newCode, 'utf-8');
}
//# sourceMappingURL=addTestId.js.map