/**
 * 添加 data-testid 工具
 * 使用 AST 解析和修改代码
 */
import { readFile, writeFile } from 'fs/promises';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import * as t from '@babel/types';
// 修复 ES 模块中 traverse 和 generate 的导入问题
// 在 ES 模块中，@babel/traverse 和 @babel/generator 的默认导出可能被包装
let traverse;
let generate;
// 处理 traverse 导入
if (typeof _traverse === 'function') {
    traverse = _traverse;
}
else if (_traverse.default && typeof _traverse.default === 'function') {
    traverse = _traverse.default;
}
else {
    traverse = _traverse;
}
// 处理 generate 导入
if (typeof _generate === 'function') {
    generate = _generate;
}
else if (_generate.default && typeof _generate.default === 'function') {
    generate = _generate.default;
}
else {
    generate = _generate;
}
// 验证导入是否成功
if (typeof traverse !== 'function') {
    console.error('[addTestId] Failed to import traverse:', typeof traverse, _traverse);
    throw new Error(`Failed to import @babel/traverse: ${typeof traverse}`);
}
if (typeof generate !== 'function') {
    console.error('[addTestId] Failed to import generate:', typeof generate, _generate);
    throw new Error(`Failed to import @babel/generator: ${typeof generate}`);
}
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
 * 使用字符串操作精确添加 data-testid，避免格式化整个文件
 */
function addTestIdUsingStringManipulation(fileContent, path, testId) {
    const node = path.node;
    const openingElement = node.openingElement;
    // 获取节点的源代码位置
    const start = openingElement.start;
    const end = openingElement.end;
    if (start === null || start === undefined || end === null || end === undefined) {
        // 如果无法获取位置信息，回退到 AST 方式，但使用 retainLines 保持格式
        addTestIdAttribute(node, testId);
        if (typeof generate !== 'function') {
            throw new Error(`generate is not a function, type: ${typeof generate}`);
        }
        // 只生成修改的部分，而不是整个文件
        const output = generate(path.parent, {
            retainLines: true,
            compact: false,
            comments: true,
            preserveComments: true
        }, fileContent);
        return output.code;
    }
    // 提取开始标签的源代码（此时 start 和 end 已确认不为 undefined）
    const beforeTag = fileContent.substring(0, start);
    const tagContent = fileContent.substring(start, end);
    const afterTag = fileContent.substring(end);
    // 查找开始标签的结束位置（> 或 />）
    const tagEndMatch = tagContent.match(/(\s*)([>\/])/);
    if (!tagEndMatch || tagEndMatch.index === undefined) {
        // 如果无法解析，回退到 AST 方式
        addTestIdAttribute(node, testId);
        if (typeof generate !== 'function') {
            throw new Error(`generate is not a function, type: ${typeof generate}`);
        }
        const output = generate(path.parent, {
            retainLines: true,
            compact: false,
            comments: true,
            preserveComments: true
        }, fileContent);
        return output.code;
    }
    // 在结束符前插入 data-testid 属性
    const beforeEnd = tagContent.substring(0, tagEndMatch.index);
    const whitespace = tagEndMatch[1];
    const endChar = tagEndMatch[2];
    // 检查是否已有属性，决定如何添加空格
    const tagNameMatch = beforeEnd.match(/^<(\w+)/);
    const hasAttributes = beforeEnd.trim().length > (tagNameMatch ? tagNameMatch[0].length : 0);
    // 添加属性，保持原有的空格格式
    const newAttribute = hasAttributes
        ? ` data-testid="${testId}"`
        : ` data-testid="${testId}"`;
    const newTagContent = beforeEnd + newAttribute + whitespace + endChar;
    return beforeTag + newTagContent + afterTag;
}
/**
 * 查找匹配的 JSX 元素及其路径信息
 */
function findMatchingJSXElementWithPath(ast, elementInfo) {
    let target = null;
    // 确保 traverse 是一个函数
    if (typeof traverse !== 'function') {
        console.error('[findMatchingJSXElement] traverse is not a function:', typeof traverse, traverse);
        return null;
    }
    try {
        traverse(ast, {
            JSXElement(path) {
                if (matchesElement(path.node, elementInfo)) {
                    // 找到第一个匹配的元素
                    if (!target) {
                        target = { node: path.node, path };
                    }
                }
            }
        });
    }
    catch (error) {
        console.error('[findMatchingJSXElement] traverse error:', error);
        return null;
    }
    return target;
}
/**
 * 查找匹配的 JSX 元素（向后兼容）
 */
function findMatchingJSXElement(ast, elementInfo) {
    const result = findMatchingJSXElementWithPath(ast, elementInfo);
    return result ? result.node : null;
}
/**
 * 为指定元素添加 data-testid 属性
 */
export async function addTestIdToElement(filePath, elementInfo, testId) {
    try {
        // 0. 验证 traverse 和 generate 是否可用
        if (typeof traverse !== 'function') {
            throw new Error(`traverse is not a function, type: ${typeof traverse}, value: ${traverse}`);
        }
        if (typeof generate !== 'function') {
            throw new Error(`generate is not a function, type: ${typeof generate}, value: ${generate}`);
        }
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
        // 3. 查找匹配的 JSX 元素及其路径信息
        const targetResult = findMatchingJSXElementWithPath(ast, elementInfo);
        if (!targetResult) {
            return {
                success: false,
                message: `未找到匹配的元素。DOM 路径: ${elementInfo.domPath}`
            };
        }
        const { node: targetNode, path: targetPath } = targetResult;
        // 4. 检查是否已有 data-testid
        if (hasTestId(targetNode, testId)) {
            return {
                success: false,
                message: `元素已存在 data-testid="${testId}"`
            };
        }
        // 5. 使用字符串操作精确修改，避免格式化整个文件
        const newCode = addTestIdUsingStringManipulation(fileContent, targetPath, testId);
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('[addTestId] 错误详情:', {
            filePath,
            elementPath: elementInfo.domPath,
            testId,
            error: errorMessage,
            stack: errorStack
        });
        return {
            success: false,
            error: errorMessage,
            message: `代码修改失败: ${errorMessage}`,
            details: {
                filePath,
                elementPath: elementInfo.domPath,
                testId,
                errorType: error instanceof Error ? error.constructor.name : typeof error,
                stack: errorStack
            }
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