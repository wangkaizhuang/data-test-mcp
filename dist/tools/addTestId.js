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
 * 检查 JSX 元素是否匹配目标元素
 */
function matchesElement(node, elementInfo) {
    const openingElement = node.openingElement;
    const tagName = openingElement.name;
    // 检查标签名
    const expectedTag = extractTagName(elementInfo.domPath);
    if (expectedTag) {
        if (t.isJSXIdentifier(tagName)) {
            if (tagName.name.toLowerCase() !== expectedTag.toLowerCase()) {
                return false;
            }
        }
        else if (t.isJSXMemberExpression(tagName)) {
            // 处理 Component.SubComponent 的情况
            return false; // 暂时不支持
        }
    }
    // 检查类名
    const expectedClass = extractClassName(elementInfo.domPath);
    if (expectedClass) {
        let hasClass = false;
        for (const attr of openingElement.attributes) {
            if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
                if (attr.name.name === 'className' || attr.name.name === 'class') {
                    if (t.isStringLiteral(attr.value)) {
                        hasClass = attr.value.value.includes(expectedClass);
                    }
                    else if (t.isJSXExpressionContainer(attr.value)) {
                        // 处理 className={...} 的情况，暂时跳过
                        hasClass = true;
                    }
                    break;
                }
            }
        }
        if (expectedClass && !hasClass) {
            return false;
        }
    }
    return true;
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
 * 查找匹配的 JSX 元素
 */
function findMatchingJSXElement(ast, elementInfo) {
    let targetNode = null;
    traverse(ast, {
        JSXElement(path) {
            if (matchesElement(path.node, elementInfo)) {
                // 找到第一个匹配的元素
                if (!targetNode) {
                    targetNode = path.node;
                }
            }
        }
    });
    return targetNode;
}
/**
 * 为指定元素添加 data-testid 属性
 */
export async function addTestIdToElement(filePath, elementInfo, testId) {
    try {
        // 1. 读取文件
        const fileContent = await readFile(filePath, 'utf-8');
        // 2. 解析 AST
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
            ]
        });
        // 3. 查找匹配的 JSX 元素
        const targetNode = findMatchingJSXElement(ast, elementInfo);
        if (!targetNode) {
            return {
                success: false,
                message: `未找到匹配的元素。DOM 路径: ${elementInfo.domPath}`
            };
        }
        // 4. 检查是否已有 data-testid
        if (hasTestId(targetNode, testId)) {
            return {
                success: false,
                message: `元素已存在 data-testid="${testId}"`
            };
        }
        // 5. 添加 data-testid 属性
        addTestIdAttribute(targetNode, testId);
        // 6. 生成新代码
        const output = generate(ast, {
            retainLines: false,
            compact: false,
            comments: true
        }, fileContent);
        const newCode = output.code;
        // 7. 生成 diff（简单版本）
        const diff = generateSimpleDiff(fileContent, newCode);
        return {
            success: true,
            filePath,
            diff,
            preview: newCode
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