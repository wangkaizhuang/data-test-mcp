#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/tools/elementParser.ts
function parseDOMPath(domPath) {
  const parts = domPath.split(" > ").filter((part) => part.trim());
  const selectors = parts.map((part) => {
    const trimmed = part.trim();
    const idMatch = trimmed.match(/#([\w-]+)/);
    const classMatches = trimmed.matchAll(/\.([\w:\[\]-]+)/g);
    const classes = [];
    for (const match of classMatches) {
      classes.push(match[1]);
    }
    const tagMatch = trimmed.match(/^(\w+)/);
    return {
      tag: tagMatch?.[1],
      id: idMatch?.[1],
      classes: classes.length > 0 ? classes : []
    };
  });
  return {
    selectors,
    fullPath: domPath
  };
}
function extractClassName(domPath) {
  const location = parseDOMPath(domPath);
  const lastSelector = location.selectors[location.selectors.length - 1];
  if (lastSelector?.classes && lastSelector.classes.length > 0) {
    return lastSelector.classes[0];
  }
  if (lastSelector?.id) {
    return lastSelector.id;
  }
  return null;
}
function extractTagName(domPath) {
  const location = parseDOMPath(domPath);
  const lastSelector = location.selectors[location.selectors.length - 1];
  return lastSelector?.tag || null;
}
var init_elementParser = __esm({
  "src/tools/elementParser.ts"() {
    "use strict";
  }
});

// src/utils/testIdHelper.ts
var testIdHelper_exports = {};
__export(testIdHelper_exports, {
  addTestIdToConstant: () => addTestIdToConstant,
  checkTestIdsConstant: () => checkTestIdsConstant,
  findTestConstantFiles: () => findTestConstantFiles,
  generateConstantName: () => generateConstantName,
  generateTestIdSuggestions: () => generateTestIdSuggestions
});
import { readFile as readFile4, writeFile as writeFile2 } from "fs/promises";
import { glob as glob2 } from "glob";
import { join as join3 } from "path";
async function findTestConstantFiles(rootDir = process.cwd()) {
  const patterns = [
    "**/test*.constant*.ts",
    "**/test*.constant*.tsx",
    "**/test*.constants*.ts",
    "**/test*.constants*.tsx",
    "**/constants/test*.ts",
    "**/constants/test*.tsx",
    "**/testIds.ts",
    "**/testIds.tsx",
    "**/test-ids.ts",
    "**/test-ids.tsx"
  ];
  const results = [];
  for (const pattern of patterns) {
    const files = await glob2(pattern, {
      cwd: rootDir,
      ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"]
    });
    results.push(...files.map((f) => join3(rootDir, f)));
  }
  return Array.from(new Set(results));
}
async function checkTestIdsConstant(filePath) {
  try {
    const content = await readFile4(filePath, "utf-8");
    const testIdsMatch = content.match(
      /(?:export\s+)?(?:const|let)\s+(?:TEST_IDS|TESTIDS|TestIds|testIds)\s*[:=]\s*\{([^}]*)\}/s
    );
    if (testIdsMatch) {
      const testIdsContent = testIdsMatch[1];
      const testIds = {};
      const pairs = testIdsContent.match(/(\w+)\s*:\s*['"]([^'"]+)['"]/g);
      if (pairs) {
        pairs.forEach((pair) => {
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
  } catch (error) {
    return { exists: false };
  }
}
function generateConstantName(elementPath, testId, componentName) {
  if (componentName) {
    return componentName.replace(/([A-Z])/g, "_$1").replace(/^_/, "").toUpperCase();
  }
  if (testId) {
    return testId.replace(/-/g, "_").toUpperCase();
  }
  const tagName = extractTagName(elementPath);
  const className = extractClassName(elementPath);
  if (className) {
    return className.replace(/[.:-]/g, "_").toUpperCase();
  }
  if (tagName) {
    return `${tagName.toUpperCase()}_ELEMENT`;
  }
  return "ELEMENT";
}
async function generateTestIdSuggestions(elementPath, testId, componentName, componentFilePath, rootDir = process.cwd()) {
  const suggestions = [];
  const constantFiles = await findTestConstantFiles(rootDir);
  let constantFile;
  let constantName;
  let constantValue;
  if (constantFiles.length > 0) {
    constantFile = constantFiles[0];
    const constantInfo = await checkTestIdsConstant(constantFile);
    if (constantInfo.exists) {
      constantName = "TEST_IDS";
      constantValue = testId;
      const suggestedKey = generateConstantName(elementPath, testId, componentName);
      suggestions.push(
        `\u5728 \`${constantFile}\` \u4E2D\u7684 \`TEST_IDS\` \u5BF9\u8C61\u4E2D\u6DFB\u52A0\uFF1A\`${suggestedKey}: '${testId}'\``
      );
      if (constantInfo.testIds) {
        const existingKey = Object.entries(constantInfo.testIds).find(
          ([_, value]) => value === testId
        );
        if (existingKey) {
          suggestions.push(
            `\u26A0\uFE0F \u6CE8\u610F\uFF1AtestId "${testId}" \u5DF2\u5B58\u5728\u4E8E\u5E38\u91CF\u4E2D\uFF0C\u952E\u540D\u4E3A "${existingKey[0]}"`
          );
        }
      }
    } else {
      suggestions.push(
        `\u5728 \`${constantFile}\` \u4E2D\u521B\u5EFA \`TEST_IDS\` \u5E38\u91CF\u5BF9\u8C61\uFF0C\u5E76\u6DFB\u52A0\uFF1A\`${generateConstantName(elementPath, testId, componentName)}: '${testId}'\``
      );
    }
  } else {
    const suggestedFileName = "test.constant.ts";
    suggestions.push(
      `\u5EFA\u8BAE\u521B\u5EFA \`${suggestedFileName}\` \u6587\u4EF6\uFF0C\u5B9A\u4E49 \`TEST_IDS\` \u5E38\u91CF\u5BF9\u8C61`
    );
    constantFile = join3(rootDir, suggestedFileName);
  }
  if (componentFilePath) {
    suggestions.push(
      `\u5728\u7EC4\u4EF6\u6587\u4EF6 \`${componentFilePath}\` \u4E2D\u6DFB\u52A0 \`data-testid={TEST_IDS.${generateConstantName(elementPath, testId, componentName)}}\``
    );
  } else if (componentName) {
    suggestions.push(
      `\u627E\u5230\u7EC4\u4EF6 \`${componentName}\` \u7684\u6587\u4EF6\uFF0C\u6DFB\u52A0 \`data-testid={TEST_IDS.${generateConstantName(elementPath, testId, componentName)}}\``
    );
  }
  suggestions.push(
    `\u4F7F\u7528\u65B9\u5F0F\uFF1A\`import { TEST_IDS } from './test.constant';\` \u7136\u540E\u5728 JSX \u4E2D\u4F7F\u7528 \`data-testid={TEST_IDS.${generateConstantName(elementPath, testId, componentName)}}\``
  );
  return {
    constantFile,
    constantName: constantName || "TEST_IDS",
    constantValue: testId,
    componentFile: componentFilePath,
    suggestions
  };
}
async function addTestIdToConstant(constantFile, constantKey, testId) {
  try {
    let content;
    let exists = false;
    try {
      content = await readFile4(constantFile, "utf-8");
      exists = true;
    } catch {
      content = `export const TEST_IDS = {
  ${constantKey}: '${testId}'
} as const;
`;
      await writeFile2(constantFile, content, "utf-8");
      return {
        success: true,
        message: `\u5DF2\u521B\u5EFA\u5E38\u91CF\u6587\u4EF6 ${constantFile} \u5E76\u6DFB\u52A0 ${constantKey}`,
        content
      };
    }
    const testIdsMatch = content.match(
      /(?:export\s+)?(?:const|let)\s+(?:TEST_IDS|TESTIDS|TestIds|testIds)\s*[:=]\s*\{([^}]*)\}/s
    );
    if (testIdsMatch) {
      const beforeMatch = content.substring(0, testIdsMatch.index + testIdsMatch[0].indexOf("{") + 1);
      const afterMatch = content.substring(testIdsMatch.index + testIdsMatch[0].lastIndexOf("}"));
      const existingContent = testIdsMatch[1].trim();
      if (existingContent.includes(`${constantKey}:`)) {
        return {
          success: false,
          message: `\u5E38\u91CF ${constantKey} \u5DF2\u5B58\u5728`
        };
      }
      const newContent = existingContent ? `${existingContent},
  ${constantKey}: '${testId}'` : `  ${constantKey}: '${testId}'`;
      content = beforeMatch + newContent + "\n" + afterMatch;
    } else {
      content += `

export const TEST_IDS = {
  ${constantKey}: '${testId}'
} as const;
`;
    }
    await writeFile2(constantFile, content, "utf-8");
    return {
      success: true,
      message: `\u5DF2\u5728 ${constantFile} \u4E2D\u6DFB\u52A0 ${constantKey}: '${testId}'`,
      content
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}
var init_testIdHelper = __esm({
  "src/utils/testIdHelper.ts"() {
    "use strict";
    init_elementParser();
  }
});

// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";

// src/tools/addTestId.ts
init_elementParser();
import { readFile, writeFile } from "fs/promises";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import * as t from "@babel/types";
var traverse;
var generate;
if (typeof _traverse === "function") {
  traverse = _traverse;
} else if (_traverse.default && typeof _traverse.default === "function") {
  traverse = _traverse.default;
} else {
  traverse = _traverse;
}
if (typeof _generate === "function") {
  generate = _generate;
} else if (_generate.default && typeof _generate.default === "function") {
  generate = _generate.default;
} else {
  generate = _generate;
}
if (typeof traverse !== "function") {
  console.error("[addTestId] Failed to import traverse:", typeof traverse, _traverse);
  throw new Error(`Failed to import @babel/traverse: ${typeof traverse}`);
}
if (typeof generate !== "function") {
  console.error("[addTestId] Failed to import generate:", typeof generate, _generate);
  throw new Error(`Failed to import @babel/generator: ${typeof generate}`);
}
function hasTestId(node, testId) {
  const openingElement = node.openingElement;
  const attributes = openingElement.attributes;
  for (const attr of attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
      if (attr.name.name === "data-testid") {
        if (testId) {
          if (t.isStringLiteral(attr.value)) {
            return attr.value.value === testId;
          }
        }
        return true;
      }
    }
  }
  return false;
}
function matchesElement(node, elementInfo) {
  const openingElement = node.openingElement;
  const tagName = openingElement.name;
  const expectedTag = extractTagName(elementInfo.domPath);
  if (expectedTag) {
    if (t.isJSXIdentifier(tagName)) {
      if (tagName.name.toLowerCase() !== expectedTag.toLowerCase()) {
        return false;
      }
    } else if (t.isJSXMemberExpression(tagName)) {
      return false;
    }
  }
  const expectedClass = extractClassName(elementInfo.domPath);
  if (expectedClass) {
    let hasClass = false;
    for (const attr of openingElement.attributes) {
      if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
        if (attr.name.name === "className" || attr.name.name === "class") {
          if (t.isStringLiteral(attr.value)) {
            hasClass = attr.value.value.includes(expectedClass);
          } else if (t.isJSXExpressionContainer(attr.value)) {
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
function addTestIdAttribute(node, testId) {
  const openingElement = node.openingElement;
  if (hasTestId(node, testId)) {
    return;
  }
  const testIdAttr = t.jsxAttribute(
    t.jsxIdentifier("data-testid"),
    t.stringLiteral(testId)
  );
  openingElement.attributes.push(testIdAttr);
}
function addTestIdUsingStringManipulation(fileContent, path, testId) {
  const node = path.node;
  const openingElement = node.openingElement;
  const start = openingElement.start;
  const end = openingElement.end;
  if (start === null || start === void 0 || end === null || end === void 0) {
    addTestIdAttribute(node, testId);
    if (typeof generate !== "function") {
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
  const beforeTag = fileContent.substring(0, start);
  const tagContent = fileContent.substring(start, end);
  const afterTag = fileContent.substring(end);
  const tagEndMatch = tagContent.match(/(\s*)([>\/])/);
  if (!tagEndMatch || tagEndMatch.index === void 0) {
    addTestIdAttribute(node, testId);
    if (typeof generate !== "function") {
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
  const beforeEnd = tagContent.substring(0, tagEndMatch.index);
  const whitespace = tagEndMatch[1];
  const endChar = tagEndMatch[2];
  const tagNameMatch = beforeEnd.match(/^<(\w+)/);
  const hasAttributes = beforeEnd.trim().length > (tagNameMatch ? tagNameMatch[0].length : 0);
  let newAttribute = "";
  if (beforeEnd.includes("\n")) {
    const lastNewline = beforeEnd.lastIndexOf("\n");
    const indent = beforeEnd.slice(lastNewline + 1).match(/^\s*/)?.[0] ?? "";
    const insertIndent = indent || " ";
    newAttribute = `${beforeEnd.endsWith("\n") ? "" : "\n"}${insertIndent}data-testid="${testId}"`;
  } else {
    newAttribute = hasAttributes ? ` data-testid="${testId}"` : ` data-testid="${testId}"`;
  }
  const newTagContent = beforeEnd + newAttribute + whitespace + endChar;
  return beforeTag + newTagContent + afterTag;
}
function findMatchingJSXElementWithPath(ast, elementInfo) {
  let target = null;
  if (typeof traverse !== "function") {
    console.error("[findMatchingJSXElement] traverse is not a function:", typeof traverse, traverse);
    return null;
  }
  try {
    traverse(ast, {
      JSXElement(path) {
        if (matchesElement(path.node, elementInfo)) {
          if (!target) {
            target = { node: path.node, path };
          }
        }
      }
    });
  } catch (error) {
    console.error("[findMatchingJSXElement] traverse error:", error);
    return null;
  }
  return target;
}
async function addTestIdToElement(filePath, elementInfo, testId) {
  try {
    if (typeof traverse !== "function") {
      throw new Error(`traverse is not a function, type: ${typeof traverse}, value: ${traverse}`);
    }
    if (typeof generate !== "function") {
      throw new Error(`generate is not a function, type: ${typeof generate}, value: ${generate}`);
    }
    const fileContent = await readFile(filePath, "utf-8");
    const ast = parse(fileContent, {
      sourceType: "module",
      plugins: [
        "jsx",
        "typescript",
        "decorators-legacy",
        "classProperties",
        "objectRestSpread",
        "asyncGenerators",
        "functionBind",
        "exportDefaultFrom",
        "exportNamespaceFrom",
        "dynamicImport",
        "nullishCoalescingOperator",
        "optionalChaining"
      ]
    });
    const targetResult = findMatchingJSXElementWithPath(ast, elementInfo);
    if (!targetResult) {
      return {
        success: false,
        message: `\u672A\u627E\u5230\u5339\u914D\u7684\u5143\u7D20\u3002DOM \u8DEF\u5F84: ${elementInfo.domPath}`
      };
    }
    const { node: targetNode, path: targetPath } = targetResult;
    if (hasTestId(targetNode, testId)) {
      return {
        success: false,
        message: `\u5143\u7D20\u5DF2\u5B58\u5728 data-testid="${testId}"`
      };
    }
    const newCode = addTestIdUsingStringManipulation(
      fileContent,
      targetPath,
      testId
    );
    const diff = generateSimpleDiff(fileContent, newCode);
    return {
      success: true,
      filePath,
      diff,
      preview: newCode
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : void 0;
    console.error("[addTestId] \u9519\u8BEF\u8BE6\u60C5:", {
      filePath,
      elementPath: elementInfo.domPath,
      testId,
      error: errorMessage,
      stack: errorStack
    });
    return {
      success: false,
      error: errorMessage,
      message: `\u4EE3\u7801\u4FEE\u6539\u5931\u8D25: ${errorMessage}`,
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
function generateSimpleDiff(oldCode, newCode) {
  const oldLines = oldCode.split("\n");
  const newLines = newCode.split("\n");
  let diff = "";
  const maxLines = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] || "";
    const newLine = newLines[i] || "";
    if (oldLine !== newLine) {
      if (oldLine) {
        diff += `- ${oldLine}
`;
      }
      if (newLine) {
        diff += `+ ${newLine}
`;
      }
    } else {
      diff += `  ${oldLine}
`;
    }
  }
  return diff;
}
async function applyCodeModification(filePath, newCode) {
  await writeFile(filePath, newCode, "utf-8");
}

// src/utils/fileLocator.ts
init_elementParser();
import { glob } from "glob";
import { readFile as readFile2 } from "fs/promises";
import { join } from "path";
async function searchFiles(pattern, rootDir = process.cwd(), fileExtensions = [".tsx", ".ts", ".jsx", ".js"]) {
  const results = [];
  for (const ext of fileExtensions) {
    const globPattern = `**/*${ext}`;
    const files = await glob(globPattern, {
      cwd: rootDir,
      ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"]
    });
    for (const file of files) {
      try {
        const content = await readFile2(join(rootDir, file), "utf-8");
        if (content.includes(pattern) || new RegExp(pattern, "i").test(content)) {
          results.push(join(rootDir, file));
        }
      } catch (error) {
        continue;
      }
    }
  }
  return results;
}
async function locateComponentFile(componentName, rootDir = process.cwd()) {
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
  return Array.from(new Set(allResults));
}
async function locateFileByClassName(className, rootDir = process.cwd()) {
  return searchFiles(className, rootDir);
}
async function locateComponentFileByInfo(componentName, domPath, rootDir = process.cwd()) {
  const candidates = [];
  if (componentName) {
    const filesByComponent = await locateComponentFile(componentName, rootDir);
    candidates.push(...filesByComponent);
  }
  if (domPath) {
    const className = extractClassName(domPath);
    if (className) {
      const filesByClass = await locateFileByClassName(className, rootDir);
      candidates.push(...filesByClass);
    }
  }
  const tsxFiles = candidates.filter((f) => f.endsWith(".tsx") || f.endsWith(".jsx"));
  if (tsxFiles.length > 0) {
    return tsxFiles[0];
  }
  if (candidates.length > 0) {
    return candidates[0];
  }
  return null;
}

// src/tools/gitOps.ts
import simpleGit from "simple-git";
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
var GitOperations = class {
  git;
  rootDir;
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
    this.git = simpleGit(rootDir);
  }
  /**
   * 检查工作区状态
   */
  async getStatus() {
    const status = await this.git.status();
    return status.files.map((f) => `${f.path} (${f.index})`).join("\n");
  }
  /**
   * 拉取远程最新代码
   */
  async pullFromRemote(remote = "origin", branch) {
    try {
      const targetBranch = branch || await this.getCurrentBranch();
      await this.git.pull(remote, targetBranch);
      return {
        success: true,
        branch: targetBranch,
        message: `\u6210\u529F\u4ECE ${remote}/${targetBranch} \u62C9\u53D6\u6700\u65B0\u4EE3\u7801`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("conflict") || errorMessage.includes("CONFLICT") || errorMessage.includes("merge conflict") || errorMessage.includes("Automatic merge failed")) {
        return {
          success: false,
          error: errorMessage,
          message: `\u62C9\u53D6\u65F6\u53D1\u73B0\u51B2\u7A81\uFF0C\u8BF7\u5148\u89E3\u51B3\u51B2\u7A81\u540E\u518D\u63D0\u4EA4`
        };
      }
      if (errorMessage.includes("Could not read from remote") || errorMessage.includes("does not exist") || errorMessage.includes("not found")) {
        return {
          success: false,
          error: errorMessage,
          message: `\u65E0\u6CD5\u62C9\u53D6\u8FDC\u7A0B\u4EE3\u7801\uFF08\u53EF\u80FD\u662F\u7F51\u7EDC\u95EE\u9898\u6216\u8FDC\u7A0B\u5206\u652F\u4E0D\u5B58\u5728\uFF09\uFF0C\u5C06\u7EE7\u7EED\u63D0\u4EA4\u672C\u5730\u66F4\u6539`
        };
      }
      return {
        success: false,
        error: errorMessage,
        message: `\u62C9\u53D6\u5931\u8D25: ${branch || "\u5F53\u524D\u5206\u652F"}`
      };
    }
  }
  /**
   * 执行 lint 检查
   */
  async runLint() {
    try {
      const { stdout, stderr } = await execAsync("pnpm lint", {
        cwd: this.rootDir,
        maxBuffer: 10 * 1024 * 1024
        // 10MB buffer for large output
      });
      const hasError = stdout.toLowerCase().includes("error") || stderr.toLowerCase().includes("error");
      if (hasError) {
        return {
          success: false,
          error: stderr || stdout,
          message: "Lint \u68C0\u67E5\u53D1\u73B0\u9519\u8BEF\uFF0C\u8BF7\u4FEE\u590D\u540E\u91CD\u8BD5"
        };
      }
      if (stderr && !hasError) {
        return {
          success: true,
          message: "Lint \u68C0\u67E5\u5B8C\u6210\uFF08\u6709\u8B66\u544A\uFF09",
          error: stderr
        };
      }
      return {
        success: true,
        message: "Lint \u68C0\u67E5\u901A\u8FC7"
      };
    } catch (error) {
      const errorMessage = error.stderr || error.stdout || error.message || String(error);
      return {
        success: false,
        error: errorMessage,
        message: "Lint \u68C0\u67E5\u5931\u8D25\uFF0C\u8BF7\u4FEE\u590D\u9519\u8BEF\u540E\u91CD\u8BD5"
      };
    }
  }
  /**
   * 获取修改过的文件列表（包括已暂存和未暂存的）
   */
  async getModifiedFiles() {
    try {
      const status = await this.git.status();
      const modifiedFiles = status.files.filter((f) => f.index !== " " || f.working_dir !== " ").map((f) => f.path);
      return modifiedFiles;
    } catch (error) {
      return [];
    }
  }
  /**
   * 提交更改
   * 只提交指定的文件，不提交其他更改
   */
  async commitChanges(files, message) {
    try {
      if (files.length === 0) {
        return {
          success: false,
          message: "\u6CA1\u6709\u6307\u5B9A\u8981\u63D0\u4EA4\u7684\u6587\u4EF6"
        };
      }
      await this.git.add(files);
      const status = await this.git.status();
      const stagedFiles = status.files.filter((f) => f.index !== " " && f.index !== "?");
      if (stagedFiles.length === 0) {
        return {
          success: false,
          message: "\u6307\u5B9A\u7684\u6587\u4EF6\u6CA1\u6709\u9700\u8981\u63D0\u4EA4\u7684\u66F4\u6539"
        };
      }
      await this.git.commit(message);
      return {
        success: true,
        message: `\u6210\u529F\u63D0\u4EA4: ${message}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: "\u63D0\u4EA4\u5931\u8D25"
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
    } catch {
      return false;
    }
  }
  /**
   * 获取当前分支
   */
  async getCurrentBranch() {
    try {
      const status = await this.git.status();
      return status.current || "main";
    } catch {
      return "main";
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
      } else {
        await this.git.checkout(branch);
      }
      return {
        success: true,
        branch,
        message: `\u5DF2\u5207\u6362\u5230\u5206\u652F: ${branch}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `\u521B\u5EFA\u5206\u652F\u5931\u8D25: ${branch}`
      };
    }
  }
  /**
   * 推送到远程仓库
   * 直接执行 git push，使用 Git 的默认行为
   */
  async pushToRemote(branch, remote) {
    try {
      if (branch) {
        const currentBranch2 = await this.getCurrentBranch();
        if (currentBranch2 !== branch) {
          const branchResult = await this.createBranch(branch);
          if (!branchResult.success) {
            return branchResult;
          }
        }
      }
      try {
        await execAsync("git push", { cwd: this.rootDir });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("no upstream") || errorMessage.includes("no tracking information")) {
          throw error;
        }
        throw error;
      }
      const currentBranch = await this.getCurrentBranch();
      return {
        success: true,
        branch: currentBranch,
        message: `\u6210\u529F\u63A8\u9001\u5F53\u524D\u5206\u652F ${currentBranch}`
      };
    } catch (error) {
      const currentBranch = await this.getCurrentBranch().catch(() => "\u672A\u77E5\u5206\u652F");
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `\u63A8\u9001\u5931\u8D25: ${currentBranch}`
      };
    }
  }
  /**
   * 从远程 URL 解析 Bitbucket Server 信息
   */
  parseBitbucketUrl(url) {
    const usersMatch = url.match(/https?:\/\/([^\/]+)\/users\/([^\/]+)\/repos\/([^\/]+)/i);
    if (usersMatch) {
      return {
        baseUrl: `https://${usersMatch[1]}`,
        projectKey: usersMatch[2],
        // 对于用户仓库，projectKey 使用 username
        repositorySlug: usersMatch[3],
        isUserRepo: true,
        username: usersMatch[2]
      };
    }
    const scmMatch = url.match(/https?:\/\/([^\/]+)\/scm\/([^\/]+)\/([^\/]+?)(?:\.git)?$/i);
    if (scmMatch) {
      const projectKey = scmMatch[2];
      const repositorySlug = scmMatch[3];
      const isUserRepo = projectKey.startsWith("~");
      return {
        baseUrl: `https://${scmMatch[1]}`,
        projectKey,
        repositorySlug,
        isUserRepo,
        username: isUserRepo ? projectKey.replace(/^~/, "") : void 0
      };
    }
    const projectsMatch = url.match(/https?:\/\/([^\/]+)\/projects\/([^\/]+)\/repos\/([^\/]+)/i);
    if (projectsMatch) {
      return {
        baseUrl: `https://${projectsMatch[1]}`,
        projectKey: projectsMatch[2],
        repositorySlug: projectsMatch[3]
      };
    }
    const sshMatch = url.match(/ssh:\/\/git@([^:]+):?(\d+)?\/([^\/]+)\/([^\/]+?)(?:\.git)?/i);
    if (sshMatch) {
      const port = sshMatch[2] ? `:${sshMatch[2]}` : "";
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
      return log.latest?.message || "";
    } catch (error) {
      return "";
    }
  }
  async createPullRequest(title, description, baseBranch = "develop", bitbucketConfig) {
    try {
      const username = bitbucketConfig?.username || process.env.BITBUCKET_USERNAME;
      const password = bitbucketConfig?.password || process.env.BITBUCKET_PASSWORD || process.env.BITBUCKET_TOKEN;
      if (!username || !password) {
        return {
          success: false,
          message: "\u9700\u8981\u8BBE\u7F6E BITBUCKET_USERNAME \u548C BITBUCKET_PASSWORD (\u6216 BITBUCKET_TOKEN) \u73AF\u5883\u53D8\u91CF\u6765\u521B\u5EFA PR"
        };
      }
      const headBranch = await this.getCurrentBranch();
      let remoteUrl;
      try {
        const { stdout } = await execAsync("git config --get remote.origin.url", { cwd: this.rootDir });
        remoteUrl = stdout.trim();
      } catch (error) {
        return {
          success: false,
          message: "\u65E0\u6CD5\u83B7\u53D6\u8FDC\u7A0B\u4ED3\u5E93\u5730\u5740\uFF0C\u8BF7\u786E\u4FDD\u5DF2\u914D\u7F6E origin \u8FDC\u7A0B\u4ED3\u5E93"
        };
      }
      const bitbucketInfo = bitbucketConfig?.projectKey && bitbucketConfig?.repositorySlug ? {
        baseUrl: bitbucketConfig.baseUrl || process.env.BITBUCKET_BASE_URL || "",
        projectKey: bitbucketConfig.projectKey,
        repositorySlug: bitbucketConfig.repositorySlug
      } : this.parseBitbucketUrl(remoteUrl);
      if (!bitbucketInfo) {
        return {
          success: false,
          message: "\u65E0\u6CD5\u4ECE\u8FDC\u7A0B\u4ED3\u5E93 URL \u89E3\u6790 Bitbucket Server \u4FE1\u606F\u3002\u8BF7\u63D0\u4F9B projectKey \u548C repositorySlug\uFF0C\u6216\u786E\u4FDD\u8FDC\u7A0B URL \u683C\u5F0F\u6B63\u786E\u3002"
        };
      }
      const baseUrl = bitbucketInfo.baseUrl || process.env.BITBUCKET_BASE_URL;
      if (!baseUrl) {
        return {
          success: false,
          message: "\u9700\u8981\u8BBE\u7F6E BITBUCKET_BASE_URL \u73AF\u5883\u53D8\u91CF\u6216\u63D0\u4F9B baseUrl \u914D\u7F6E"
        };
      }
      const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
      let fromProjectKey;
      let toProjectKey;
      if (bitbucketInfo.isUserRepo && bitbucketInfo.username) {
        fromProjectKey = `~${bitbucketInfo.username}`;
        toProjectKey = process.env.BITBUCKET_TARGET_PROJECT || "MUX";
      } else {
        fromProjectKey = bitbucketInfo.projectKey;
        toProjectKey = bitbucketInfo.projectKey;
      }
      const apiUrl = `${normalizedBaseUrl}/rest/api/1.0/projects/${toProjectKey}/repos/${bitbucketInfo.repositorySlug}/pull-requests`;
      const auth = Buffer.from(`${username}:${password}`).toString("base64");
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          description: description || "",
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
          }
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.errors?.[0]?.message || errorData.message || `HTTP ${response.status}`;
        return {
          success: false,
          error: errorMessage,
          message: "\u521B\u5EFA Pull Request \u5931\u8D25"
        };
      }
      const pr = await response.json();
      const prUrl = pr.links?.self?.[0]?.href || (bitbucketInfo.isUserRepo && bitbucketInfo.username ? `${normalizedBaseUrl}/users/${bitbucketInfo.username}/repos/${bitbucketInfo.repositorySlug}/pull-requests/${pr.id}` : `${normalizedBaseUrl}/projects/${bitbucketInfo.projectKey}/repos/${bitbucketInfo.repositorySlug}/pull-requests/${pr.id}`);
      return {
        success: true,
        prUrl,
        message: `\u6210\u529F\u521B\u5EFA Pull Request: ${prUrl}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: "\u521B\u5EFA Pull Request \u5931\u8D25"
      };
    }
  }
  /**
   * 完整的提交流程：commit -> push -> create PR
   */
  async completeWorkflow(files, commitMessage, branch, prTitle, prDescription, baseBranch = "develop", bitbucketConfig) {
    const branchResult = await this.createBranch(branch);
    if (!branchResult.success) {
      return branchResult;
    }
    const commitResult = await this.commitChanges(files, commitMessage);
    if (!commitResult.success) {
      return commitResult;
    }
    const pushResult = await this.pushToRemote(branch);
    if (!pushResult.success) {
      return pushResult;
    }
    const username = bitbucketConfig?.username || process.env.BITBUCKET_USERNAME;
    const password = bitbucketConfig?.password || process.env.BITBUCKET_PASSWORD || process.env.BITBUCKET_TOKEN;
    if (username && password) {
      const prResult = await this.createPullRequest(
        prTitle,
        prDescription,
        baseBranch,
        bitbucketConfig
      );
      return prResult;
    }
    return {
      success: true,
      branch,
      message: `\u4EE3\u7801\u5DF2\u63D0\u4EA4\u5E76\u63A8\u9001\u5230 ${branch}\uFF0C\u4F46\u672A\u521B\u5EFA PR\uFF08\u9700\u8981 Bitbucket \u8BA4\u8BC1\u4FE1\u606F\uFF09`
    };
  }
};

// src/tools/previewServer.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { URL } from "url";
import { readFile as readFile3 } from "fs/promises";
import { join as join2, dirname } from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var PreviewServer = class {
  httpServer = null;
  wsServer = null;
  port;
  targetUrl;
  clients = /* @__PURE__ */ new Set();
  selectedElement = null;
  constructor(config = {}) {
    this.port = config.port || 3001;
    this.targetUrl = config.targetUrl || "http://localhost:3000";
  }
  /**
   * 启动预览服务器
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.httpServer = createServer(async (req, res) => {
        try {
          await this.handleRequest(req, res);
        } catch (error) {
          console.error("Request error:", error);
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Internal Server Error");
        }
      });
      this.wsServer = new WebSocketServer({ server: this.httpServer });
      this.wsServer.on("connection", (ws) => {
        this.clients.add(ws);
        console.error("WebSocket client connected");
        if (this.selectedElement) {
          ws.send(JSON.stringify({
            type: "element-selected",
            data: this.selectedElement
          }));
        }
        ws.on("message", async (message) => {
          try {
            const data = JSON.parse(message.toString());
            await this.handleWebSocketMessage(ws, data);
          } catch (error) {
            console.error("WebSocket message error:", error);
          }
        });
        ws.on("close", () => {
          this.clients.delete(ws);
          console.error("WebSocket client disconnected");
        });
      });
      this.httpServer.listen(this.port, () => {
        const url = `http://localhost:${this.port}`;
        console.error(`Preview server started at ${url}`);
        resolve({ url, port: this.port });
      });
      this.httpServer.on("error", (error) => {
        reject(error);
      });
    });
  }
  /**
   * 处理 HTTP 请求
   */
  async handleRequest(req, res) {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }
    if (url.pathname === "/" || url.pathname === "/preview") {
      const html = await this.getPreviewHTML();
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }
    if (url.pathname === "/inject-script.js") {
      const script = this.getInjectScript();
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(script);
      return;
    }
    if (url.pathname === "/bookmarklet.js") {
      const bookmarklet = this.getBookmarklet();
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(bookmarklet);
      return;
    }
    if (url.pathname === "/element-picker.js") {
      const script = await this.getElementPickerScript();
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(script);
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
  /**
   * 处理 WebSocket 消息
   */
  async handleWebSocketMessage(ws, data) {
    switch (data.type) {
      case "element-selected":
        this.selectedElement = {
          elementPath: data.elementPath,
          componentName: data.componentName,
          testId: data.testId
        };
        this.broadcast({
          type: "element-selected",
          data: this.selectedElement
        });
        break;
      case "get-selected-element":
        if (this.selectedElement) {
          ws.send(JSON.stringify({
            type: "element-selected",
            data: this.selectedElement
          }));
        }
        break;
      default:
        console.error("Unknown message type:", data.type);
    }
  }
  /**
   * 广播消息给所有客户端
   */
  broadcast(message) {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
  /**
   * 获取控制页面 HTML（新方案：脚本注入）
   */
  async getPreviewHTML() {
    const injectScriptUrl = `http://localhost:${this.port}/inject-script.js`;
    const bookmarkletUrl = `http://localhost:${this.port}/bookmarklet.js`;
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TestID Helper - \u5143\u7D20\u9009\u62E9\u5668\u63A7\u5236\u9762\u677F</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header {
      background: #252526;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .header h1 {
      color: #4ec9b0;
      margin-bottom: 12px;
      font-size: 24px;
    }
    
    .header p {
      color: #858585;
      font-size: 14px;
      line-height: 1.6;
    }
    
    .section {
      background: #252526;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .section h2 {
      color: #4ec9b0;
      margin-bottom: 16px;
      font-size: 18px;
    }
    
    .section h3 {
      color: #d4d4d4;
      margin-bottom: 12px;
      font-size: 16px;
      margin-top: 16px;
    }
    
    .step {
      margin-bottom: 16px;
      padding: 12px;
      background: #1e1e1e;
      border-radius: 4px;
      border-left: 3px solid #007acc;
    }
    
    .step-number {
      display: inline-block;
      background: #007acc;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      text-align: center;
      line-height: 24px;
      font-size: 12px;
      font-weight: bold;
      margin-right: 8px;
    }
    
    .code-block {
      background: #1e1e1e;
      border: 1px solid #3e3e42;
      border-radius: 4px;
      padding: 12px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      overflow-x: auto;
      margin: 12px 0;
      position: relative;
    }
    
    .code-block code {
      color: #d4d4d4;
      white-space: pre;
    }
    
    .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #0e639c;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    }
    
    .copy-btn:hover {
      background: #1177bb;
    }
    
    .btn {
      background: #0e639c;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
      margin-right: 8px;
      margin-bottom: 8px;
    }
    
    .btn:hover {
      background: #1177bb;
    }
    
    .btn-secondary {
      background: #3c3c3c;
    }
    
    .btn-secondary:hover {
      background: #4a4a4a;
    }
    
    .info-item {
      margin-bottom: 16px;
    }
    
    .info-label {
      font-size: 12px;
      color: #858585;
      margin-bottom: 4px;
    }
    
    .info-value {
      background: #1e1e1e;
      padding: 8px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      word-break: break-all;
      border: 1px solid #3e3e42;
    }
    
    .testid-input {
      width: 100%;
      background: #3c3c3c;
      border: 1px solid #3e3e42;
      color: #d4d4d4;
      padding: 8px;
      border-radius: 4px;
      font-size: 14px;
      margin-top: 8px;
    }
    
    .status {
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    
    .status.info {
      background: #1e3a5f;
      color: #4fc3f7;
    }
    
    .status.success {
      background: #1e4d2e;
      color: #81c784;
    }
    
    .status.error {
      background: #5a1e1e;
      color: #e57373;
    }
    
    .status.warning {
      background: #5a4d1e;
      color: #ffd54f;
    }
    
    .bookmarklet-link {
      display: inline-block;
      background: #0e639c;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      text-decoration: none;
      margin-top: 8px;
    }
    
    .bookmarklet-link:hover {
      background: #1177bb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>\u{1F3AF} TestID Helper - \u5143\u7D20\u9009\u62E9\u5668\u63A7\u5236\u9762\u677F</h1>
    <p>\u5728\u76EE\u6807\u7F51\u9875\u4E2D\u6CE8\u5165\u811A\u672C\uFF0C\u76F4\u63A5\u9009\u62E9\u5143\u7D20\uFF0C\u65E0\u9700 iframe\uFF0C\u907F\u514D\u8DE8\u57DF\u95EE\u9898\u3002</p>
  </div>
  
  <div class="section">
    <h2>\u{1F4CB} \u4F7F\u7528\u6B65\u9AA4</h2>
    
    <div class="step">
      <span class="step-number">1</span>
      <strong>\u6253\u5F00\u76EE\u6807\u7F51\u9875</strong>
      <p style="margin-top: 8px; color: #858585;">\u5728\u6D4F\u89C8\u5668\u4E2D\u6253\u5F00\u4F60\u8981\u6DFB\u52A0 testid \u7684\u7F51\u9875\uFF08\u4F8B\u5982\uFF1A${this.targetUrl}\uFF09</p>
    </div>
    
    <div class="step">
      <span class="step-number">2</span>
      <strong>\u6CE8\u5165\u811A\u672C</strong>
      <p style="margin-top: 8px; color: #858585;">\u9009\u62E9\u4EE5\u4E0B\u4EFB\u4E00\u65B9\u5F0F\u6CE8\u5165\u811A\u672C\uFF1A</p>
      
      <h3 style="margin-top: 16px;">\u65B9\u5F0F A\uFF1A\u63A7\u5236\u53F0\u8FD0\u884C\uFF08\u63A8\u8350\uFF09</h3>
      <p style="margin-bottom: 8px; color: #858585;">\u5728\u76EE\u6807\u7F51\u9875\u7684\u63A7\u5236\u53F0\uFF08F12\uFF09\u4E2D\u8FD0\u884C\u4EE5\u4E0B\u4EE3\u7801\uFF1A</p>
      <div class="code-block">
        <button class="copy-btn" onclick="copyToClipboard(this)">\u590D\u5236</button>
        <code id="consoleScript">fetch('${injectScriptUrl}').then(r => r.text()).then(eval);</code>
      </div>
      
      <h3 style="margin-top: 16px;">\u65B9\u5F0F B\uFF1A\u4E66\u7B7E\u5DE5\u5177</h3>
      <p style="margin-bottom: 8px; color: #858585;">\u5C06\u4EE5\u4E0B\u94FE\u63A5\u62D6\u62FD\u5230\u6D4F\u89C8\u5668\u4E66\u7B7E\u680F\uFF0C\u7136\u540E\u5728\u76EE\u6807\u7F51\u9875\u4E2D\u70B9\u51FB\u8BE5\u4E66\u7B7E\uFF1A</p>
      <a href="javascript:(function(){var s=document.createElement('script');s.src='${injectScriptUrl}';document.head.appendChild(s);})();" class="bookmarklet-link">\u{1F4CC} TestID Helper</a>
      <p style="margin-top: 8px; color: #858585; font-size: 12px;">\u6216\u8005\u624B\u52A8\u521B\u5EFA\u4E66\u7B7E\uFF0CURL \u8BBE\u7F6E\u4E3A\uFF1A</p>
      <div class="code-block">
        <button class="copy-btn" onclick="copyToClipboard(this)">\u590D\u5236</button>
        <code>javascript:(function(){var s=document.createElement('script');s.src='${injectScriptUrl}';document.head.appendChild(s);})();</code>
      </div>
    </div>
    
    <div class="step">
      <span class="step-number">3</span>
      <strong>\u9009\u62E9\u5143\u7D20</strong>
      <p style="margin-top: 8px; color: #858585;">\u811A\u672C\u6CE8\u5165\u540E\uFF0C\u9F20\u6807\u60AC\u505C\u5728\u9875\u9762\u5143\u7D20\u4E0A\u4F1A\u9AD8\u4EAE\u663E\u793A\uFF0C\u70B9\u51FB\u5143\u7D20\u5373\u53EF\u9009\u62E9</p>
    </div>
    
    <div class="step">
      <span class="step-number">4</span>
      <strong>\u586B\u5199\u4FE1\u606F\u5E76\u53D1\u9001</strong>
      <p style="margin-top: 8px; color: #858585;">\u5728\u4E0B\u65B9\u8868\u5355\u4E2D\u586B\u5199 testid \u7B49\u4FE1\u606F\uFF0C\u7136\u540E\u70B9\u51FB"\u6DFB\u52A0\u5230 Cursor"</p>
    </div>
  </div>
  
  <div class="section">
    <h2>\u{1F4DD} \u5143\u7D20\u4FE1\u606F</h2>
    
    <div class="status info" id="status">
      \u7B49\u5F85\u9009\u62E9\u5143\u7D20... \u8BF7\u5148\u5728\u76EE\u6807\u7F51\u9875\u4E2D\u6CE8\u5165\u811A\u672C\u5E76\u9009\u62E9\u5143\u7D20
    </div>
    
    <div class="info-item">
      <div class="info-label">DOM \u8DEF\u5F84:</div>
      <div class="info-value" id="elementPath">-</div>
    </div>
    
    <div class="info-item">
      <div class="info-label">\u7EC4\u4EF6\u540D\u79F0 (\u53EF\u9009):</div>
      <input type="text" class="testid-input" id="componentName" placeholder="\u4F8B\u5982: SubmitButton\u3001UserAvatar\u3001MenuItem">
    </div>
    
    <div class="info-item">
      <div class="info-label">data-testid \u503C:</div>
      <input type="text" class="testid-input" id="testId" placeholder="\u4F8B\u5982: submit-button\u3001user-avatar\u3001menu-item">
    </div>
    
    <button class="btn" id="addTestIdBtn" style="width: 100%; margin-top: 8px;">\u6DFB\u52A0\u5230 Cursor</button>
  </div>
  
  <script src="/element-picker.js"></script>
</body>
</html>`;
  }
  /**
   * 获取可注入到目标网页的脚本
   */
  getInjectScript() {
    return `(function() {
  // \u907F\u514D\u91CD\u590D\u6CE8\u5165
  if (window.__testidHelperInjected) {
    console.warn('TestID Helper \u811A\u672C\u5DF2\u6CE8\u5165\uFF0C\u8DF3\u8FC7\u91CD\u590D\u6CE8\u5165');
    return;
  }
  window.__testidHelperInjected = true;
  
  const wsPort = ${this.port};
  const ws = new WebSocket('ws://localhost:' + wsPort);
  let isSelecting = false;
  let highlightEl = null;
  let selectedElement = null;
  let panel = null;
  
  // \u521B\u5EFA\u53F3\u4FA7\u63A7\u5236\u9762\u677F
  function createControlPanel() {
    if (panel) return panel;
    
    panel = document.createElement('div');
    panel.id = '__testidHelperPanel';
    panel.style.cssText = \`
      position: fixed;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      width: 280px;
      background: #252526;
      border: 1px solid #3e3e42;
      border-radius: 8px;
      padding: 16px;
      z-index: 999998;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #d4d4d4;
      display: none;
    \`;
    
    panel.innerHTML = \`
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 16px; color: #4ec9b0;">TestID Helper</h3>
        <button id="__testidHelperClose" style="background: transparent; border: none; color: #858585; cursor: pointer; font-size: 18px; padding: 0; width: 24px; height: 24px; line-height: 1;">\xD7</button>
      </div>
      <div id="__testidHelperStatus" style="padding: 8px; background: #1e3a5f; border-radius: 4px; margin-bottom: 12px; font-size: 12px; color: #4fc3f7;">
        \u7B49\u5F85\u8FDE\u63A5...
      </div>
      <div style="display: flex; gap: 8px; flex-direction: column;">
        <button id="__testidHelperStart" style="background: #0e639c; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">
          \u5F00\u59CB\u9009\u62E9\u5143\u7D20
        </button>
        <button id="__testidHelperCancel" style="background: #3c3c3c; color: #d4d4d4; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; display: none;">
          \u53D6\u6D88\u9009\u62E9
        </button>
      </div>
    \`;
    
    document.body.appendChild(panel);
    
    // \u7ED1\u5B9A\u4E8B\u4EF6
    document.getElementById('__testidHelperStart').addEventListener('click', () => {
      enableElementPicker();
    });
    
    document.getElementById('__testidHelperCancel').addEventListener('click', () => {
      disableElementPicker();
    });
    
    document.getElementById('__testidHelperClose').addEventListener('click', () => {
      panel.style.display = 'none';
      disableElementPicker();
    });
    
    return panel;
  }
  
  // \u66F4\u65B0\u9762\u677F\u72B6\u6001
  function updatePanelStatus(message, type = 'info') {
    if (!panel) return;
    const statusEl = document.getElementById('__testidHelperStatus');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.background = type === 'success' ? '#1e4d2e' : type === 'error' ? '#5a1e1e' : '#1e3a5f';
      statusEl.style.color = type === 'success' ? '#81c784' : type === 'error' ? '#e57373' : '#4fc3f7';
    }
  }
  
  // \u521B\u5EFA\u6D6E\u52A8\u63D0\u793A\u6846
  function createToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = \`
      position: fixed;
      top: 20px;
      right: 20px;
      background: \${type === 'success' ? '#1e4d2e' : type === 'error' ? '#5a1e1e' : '#1e3a5f'};
      color: \${type === 'success' ? '#81c784' : type === 'error' ? '#e57373' : '#4fc3f7'};
      padding: 12px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
    \`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  function highlight(element) {
    if (highlightEl) {
      highlightEl.style.outline = '';
      highlightEl.style.outlineOffset = '';
    }
    highlightEl = element;
    element.style.outline = '2px solid #007acc';
    element.style.outlineOffset = '2px';
  }
  
  function getDOMPath(element) {
    const path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();
      
      if (element.id) {
        selector += '#' + element.id;
        path.unshift(selector);
        break;
      } else {
        let sibling = element;
        let nth = 1;
        while (sibling.previousElementSibling) {
          sibling = sibling.previousElementSibling;
          if (sibling.nodeName === element.nodeName) {
            nth++;
          }
        }
        if (nth > 1) {
          selector += ':nth-of-type(' + nth + ')';
        } else {
          const classes = Array.from(element.classList).filter(c => c && !c.startsWith('_')).join('.');
          if (classes) {
            selector += '.' + classes.split(' ')[0];
          }
        }
        path.unshift(selector);
        element = element.parentElement;
      }
    }
    return path.join(' > ');
  }
  
  function enableElementPicker() {
    if (isSelecting) return;
    isSelecting = true;
    
    // \u663E\u793A\u9762\u677F
    if (!panel) createControlPanel();
    panel.style.display = 'block';
    updatePanelStatus('\u5143\u7D20\u9009\u62E9\u5668\u5DF2\u542F\u7528\uFF0C\u9F20\u6807\u60AC\u505C\u9009\u62E9\u5143\u7D20', 'info');
    
    // \u66F4\u65B0\u6309\u94AE\u72B6\u6001
    const startBtn = document.getElementById('__testidHelperStart');
    const cancelBtn = document.getElementById('__testidHelperCancel');
    if (startBtn) startBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'block';
    
    createToast('\u5143\u7D20\u9009\u62E9\u5668\u5DF2\u542F\u7528\uFF0C\u9F20\u6807\u60AC\u505C\u9009\u62E9\u5143\u7D20', 'info');
    
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('click', handleClick, true);
    document.body.style.cursor = 'crosshair';
  }
  
  function disableElementPicker() {
    if (!isSelecting) return;
    isSelecting = false;
    
    // \u66F4\u65B0\u6309\u94AE\u72B6\u6001
    const startBtn = document.getElementById('__testidHelperStart');
    const cancelBtn = document.getElementById('__testidHelperCancel');
    if (startBtn) startBtn.style.display = 'block';
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    updatePanelStatus('\u5DF2\u53D6\u6D88\u9009\u62E9', 'info');
    
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('click', handleClick, true);
    document.body.style.cursor = '';
    if (highlightEl) {
      highlightEl.style.outline = '';
      highlightEl.style.outlineOffset = '';
      highlightEl = null;
    }
    createToast('\u5143\u7D20\u9009\u62E9\u5668\u5DF2\u7981\u7528', 'info');
  }
  
  function handleMouseOver(e) {
    if (!isSelecting) return;
    e.stopPropagation();
    if (e.target !== document.body && e.target !== document.documentElement) {
      highlight(e.target);
    }
  }
  
  function handleClick(e) {
    if (!isSelecting) return;
    e.preventDefault();
    e.stopPropagation();
    
    const path = getDOMPath(e.target);
    selectedElement = {
      elementPath: path,
      element: e.target
    };
    
    // \u53D1\u9001\u5230 WebSocket
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'element-selected',
        elementPath: path
      }));
      updatePanelStatus('\u5143\u7D20\u5DF2\u9009\u62E9\uFF0C\u4FE1\u606F\u5DF2\u53D1\u9001\u5230 Cursor', 'success');
      createToast('\u5143\u7D20\u5DF2\u9009\u62E9\uFF0C\u4FE1\u606F\u5DF2\u53D1\u9001\u5230 Cursor', 'success');
      
      // \u66F4\u65B0\u6309\u94AE\u72B6\u6001
      const startBtn = document.getElementById('__testidHelperStart');
      const cancelBtn = document.getElementById('__testidHelperCancel');
      if (startBtn) startBtn.style.display = 'block';
      if (cancelBtn) cancelBtn.style.display = 'none';
    } else {
      updatePanelStatus('WebSocket \u672A\u8FDE\u63A5', 'error');
      createToast('WebSocket \u672A\u8FDE\u63A5\uFF0C\u8BF7\u786E\u4FDD MCP \u670D\u52A1\u5668\u6B63\u5728\u8FD0\u884C', 'error');
    }
    
    // \u7981\u7528\u9009\u62E9\u5668
    disableElementPicker();
  }
  
  // WebSocket \u8FDE\u63A5
  ws.onopen = () => {
    console.log('[TestID Helper] \u5DF2\u8FDE\u63A5\u5230 MCP \u670D\u52A1\u5668');
    
    // \u521B\u5EFA\u5E76\u663E\u793A\u9762\u677F
    if (!panel) createControlPanel();
    panel.style.display = 'block';
    updatePanelStatus('\u5DF2\u8FDE\u63A5\u5230 MCP \u670D\u52A1\u5668', 'success');
    
    createToast('\u5DF2\u8FDE\u63A5\u5230 MCP \u670D\u52A1\u5668', 'success');
    // \u4E0D\u81EA\u52A8\u542F\u7528\u9009\u62E9\u5668\uFF0C\u7B49\u5F85\u7528\u6237\u70B9\u51FB\u6309\u94AE
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'enable-picker') {
        enableElementPicker();
      } else if (data.type === 'disable-picker') {
        disableElementPicker();
      }
    } catch (e) {
      console.error('[TestID Helper] \u6D88\u606F\u89E3\u6790\u9519\u8BEF:', e);
    }
  };
  
  ws.onerror = (error) => {
    console.error('[TestID Helper] WebSocket \u9519\u8BEF:', error);
    if (panel) updatePanelStatus('WebSocket \u8FDE\u63A5\u9519\u8BEF', 'error');
    createToast('WebSocket \u8FDE\u63A5\u9519\u8BEF\uFF0C\u8BF7\u786E\u4FDD MCP \u670D\u52A1\u5668\u6B63\u5728\u8FD0\u884C', 'error');
  };
  
  ws.onclose = () => {
    console.log('[TestID Helper] WebSocket \u8FDE\u63A5\u5DF2\u5173\u95ED');
    disableElementPicker();
    if (panel) updatePanelStatus('\u8FDE\u63A5\u5DF2\u65AD\u5F00', 'error');
    createToast('\u4E0E MCP \u670D\u52A1\u5668\u7684\u8FDE\u63A5\u5DF2\u65AD\u5F00', 'error');
  };
  
  // \u952E\u76D8\u5FEB\u6377\u952E\uFF1ACtrl+Shift+T \u542F\u7528/\u7981\u7528\u9009\u62E9\u5668
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      if (isSelecting) {
        disableElementPicker();
      } else {
        enableElementPicker();
      }
    }
  });
  
  console.log('[TestID Helper] \u811A\u672C\u5DF2\u6CE8\u5165\uFF0C\u7B49\u5F85\u8FDE\u63A5\u5230 MCP \u670D\u52A1\u5668...');
  
  // \u521B\u5EFA\u9762\u677F\uFF08\u5373\u4F7F\u672A\u8FDE\u63A5\u4E5F\u663E\u793A\uFF09
  createControlPanel();
  panel.style.display = 'block';
  updatePanelStatus('\u7B49\u5F85\u8FDE\u63A5\u5230 MCP \u670D\u52A1\u5668...', 'info');
  
  createToast('TestID Helper \u811A\u672C\u5DF2\u6CE8\u5165\uFF0C\u7B49\u5F85\u8FDE\u63A5...', 'info');
})();`;
  }
  /**
   * 获取书签工具（bookmarklet）
   */
  getBookmarklet() {
    return `javascript:(function(){if(window.__testidHelperInjected){alert('TestID Helper \u5DF2\u6CE8\u5165');return;}var s=document.createElement('script');s.src='http://localhost:${this.port}/inject-script.js';document.head.appendChild(s);})();`;
  }
  /**
   * 获取元素选择器脚本（控制页面使用）
   */
  async getElementPickerScript() {
    try {
      const scriptPath = join2(__dirname, "../../public/element-picker.js");
      return await readFile3(scriptPath, "utf-8");
    } catch {
      return this.getInlineElementPickerScript();
    }
  }
  /**
   * 内联元素选择器脚本（控制页面使用）
   */
  getInlineElementPickerScript() {
    return `
(function() {
  const ws = new WebSocket('ws://localhost:${this.port}');
  let selectedElement = null;
  
  // \u590D\u5236\u5230\u526A\u8D34\u677F\u529F\u80FD
  window.copyToClipboard = function(button) {
    const codeBlock = button.parentElement;
    const code = codeBlock.querySelector('code');
    const text = code.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
      const originalText = button.textContent;
      button.textContent = '\u5DF2\u590D\u5236!';
      button.style.background = '#1e4d2e';
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
      }, 2000);
    }).catch(err => {
      console.error('\u590D\u5236\u5931\u8D25:', err);
      alert('\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u590D\u5236');
    });
  };
  
  function updateUI(data) {
    if (data.elementPath) {
      document.getElementById('elementPath').textContent = data.elementPath;
    }
    if (data.componentName) {
      document.getElementById('componentName').value = data.componentName;
    }
    if (data.testId) {
      document.getElementById('testId').value = data.testId;
    }
    
    // \u66F4\u65B0\u72B6\u6001
    const statusEl = document.getElementById('status');
    if (data.elementPath) {
      statusEl.textContent = '\u5DF2\u9009\u62E9\u5143\u7D20\uFF0C\u8BF7\u586B\u5199 testid \u5E76\u53D1\u9001\u5230 Cursor';
      statusEl.className = 'status success';
    } else {
      statusEl.textContent = '\u7B49\u5F85\u9009\u62E9\u5143\u7D20... \u8BF7\u5148\u5728\u76EE\u6807\u7F51\u9875\u4E2D\u6CE8\u5165\u811A\u672C\u5E76\u9009\u62E9\u5143\u7D20';
      statusEl.className = 'status info';
    }
  }
  
  ws.onopen = () => {
    console.log('[\u63A7\u5236\u9762\u677F] \u5DF2\u8FDE\u63A5\u5230\u9884\u89C8\u670D\u52A1\u5668');
    const statusEl = document.getElementById('status');
    statusEl.textContent = '\u5DF2\u8FDE\u63A5\u5230\u670D\u52A1\u5668\uFF0C\u8BF7\u5728\u76EE\u6807\u7F51\u9875\u4E2D\u6CE8\u5165\u811A\u672C';
    statusEl.className = 'status success';
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'element-selected') {
        selectedElement = data.data || data;
        updateUI(selectedElement);
      }
    } catch (e) {
      console.error('[\u63A7\u5236\u9762\u677F] \u6D88\u606F\u89E3\u6790\u9519\u8BEF:', e);
    }
  };
  
  ws.onerror = (error) => {
    console.error('[\u63A7\u5236\u9762\u677F] WebSocket \u9519\u8BEF:', error);
    const statusEl = document.getElementById('status');
    statusEl.textContent = 'WebSocket \u8FDE\u63A5\u9519\u8BEF';
    statusEl.className = 'status error';
  };
  
  ws.onclose = () => {
    console.log('[\u63A7\u5236\u9762\u677F] WebSocket \u8FDE\u63A5\u5DF2\u5173\u95ED');
    const statusEl = document.getElementById('status');
    statusEl.textContent = '\u8FDE\u63A5\u5DF2\u65AD\u5F00\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u91CD\u8BD5';
    statusEl.className = 'status error';
  };
  
  // \u53D1\u9001\u5230 Cursor \u6309\u94AE
  document.getElementById('addTestIdBtn').addEventListener('click', () => {
    const elementPath = document.getElementById('elementPath').textContent;
    const componentName = document.getElementById('componentName').value;
    const testId = document.getElementById('testId').value;
    
    if (!elementPath || elementPath === '-') {
      const statusEl = document.getElementById('status');
      statusEl.textContent = '\u8BF7\u5148\u9009\u62E9\u4E00\u4E2A\u5143\u7D20\uFF08\u5728\u76EE\u6807\u7F51\u9875\u4E2D\u6CE8\u5165\u811A\u672C\u5E76\u9009\u62E9\u5143\u7D20\uFF09';
      statusEl.className = 'status warning';
      return;
    }
    
    if (!testId) {
      const statusEl = document.getElementById('status');
      statusEl.textContent = '\u8BF7\u8F93\u5165 data-testid \u503C';
      statusEl.className = 'status warning';
      return;
    }
    
    // \u53D1\u9001\u5230 WebSocket
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'element-selected',
        elementPath: elementPath,
        componentName: componentName || undefined,
        testId: testId
      }));
      
      const statusEl = document.getElementById('status');
      statusEl.textContent = '\u5DF2\u53D1\u9001\u5230 Cursor\uFF0C\u8BF7\u5728 Cursor \u4E2D\u67E5\u770B';
      statusEl.className = 'status success';
    } else {
      const statusEl = document.getElementById('status');
      statusEl.textContent = 'WebSocket \u672A\u8FDE\u63A5\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u91CD\u8BD5';
      statusEl.className = 'status error';
    }
  });
  
  // \u9875\u9762\u52A0\u8F7D\u5B8C\u6210
  window.addEventListener('load', () => {
    console.log('[\u63A7\u5236\u9762\u677F] \u9875\u9762\u5DF2\u52A0\u8F7D');
  });
})();
`;
  }
  /**
   * 停止服务器
   */
  stop() {
    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
    }
    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }
    this.clients.clear();
  }
  /**
   * 获取选中的元素
   */
  getSelectedElement() {
    return this.selectedElement;
  }
  /**
   * 清除选中的元素
   */
  clearSelectedElement() {
    this.selectedElement = null;
  }
};

// src/index.ts
init_testIdHelper();
import { exec as exec2 } from "child_process";
import { promisify as promisify2 } from "util";
import { platform } from "os";
var execAsync2 = promisify2(exec2);
async function openBrowser(url) {
  try {
    const osPlatform = platform();
    let command;
    if (osPlatform === "darwin") {
      command = `open "${url}"`;
    } else if (osPlatform === "win32") {
      command = `start "" "${url}"`;
    } else {
      command = `xdg-open "${url}"`;
    }
    await execAsync2(command);
  } catch (error) {
    console.error("Failed to open browser:", error);
  }
}
var pendingChanges = null;
var previewServer = null;
async function createServer2() {
  const server = new Server(
    {
      name: "testid-helper-mcp",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "add_testid",
          description: "\u4E3A\u6307\u5B9A\u5143\u7D20\u6DFB\u52A0 data-testid \u5C5E\u6027\u3002\u9700\u8981\u63D0\u4F9B\u5143\u7D20\u7684 DOM \u8DEF\u5F84\u548C testid \u503C\u3002\u6CE8\u610F\uFF1A\u8BF7\u6839\u636E\u7528\u6237\u5B9E\u9645\u9009\u62E9\u7684\u5143\u7D20\u586B\u5199\u53C2\u6570\uFF0C\u4E0D\u8981\u4F7F\u7528\u793A\u4F8B\u4E2D\u7684\u5360\u4F4D\u7B26\u503C\uFF08\u5982 share-button\uFF09\u3002",
          inputSchema: {
            type: "object",
            properties: {
              elementPath: {
                type: "string",
                description: "DOM \u8DEF\u5F84\uFF08\u4ECE\u6D4F\u89C8\u5668\u5F00\u53D1\u8005\u5DE5\u5177\u83B7\u53D6\uFF0C\u4F8B\u5982\uFF1Adiv#app > button.submit-btn \u6216 div.container > form > input#username\uFF0C\u6839\u636E\u5B9E\u9645\u9009\u62E9\u7684\u5143\u7D20\u8DEF\u5F84\u586B\u5199\uFF09"
              },
              testId: {
                type: "string",
                description: "\u8981\u6DFB\u52A0\u7684 data-testid \u503C\uFF08\u4F8B\u5982\uFF1Asubmit-button\u3001user-avatar\u3001menu-item \u7B49\uFF0C\u6839\u636E\u5B9E\u9645\u5143\u7D20\u7528\u9014\u547D\u540D\uFF09"
              },
              componentName: {
                type: "string",
                description: "React \u7EC4\u4EF6\u540D\u79F0\uFF08\u53EF\u9009\uFF0C\u7528\u4E8E\u66F4\u7CBE\u786E\u7684\u6587\u4EF6\u5B9A\u4F4D\uFF09"
              },
              componentFilePath: {
                type: "string",
                description: "\u7EC4\u4EF6\u6587\u4EF6\u8DEF\u5F84\uFF08\u53EF\u9009\uFF0C\u5982\u679C\u5DF2\u77E5\u53EF\u76F4\u63A5\u63D0\u4F9B\uFF0C\u4F8B\u5982\uFF1Asrc/components/Button.tsx\u3001src/pages/Login.tsx\uFF0C\u6839\u636E\u5B9E\u9645\u6587\u4EF6\u8DEF\u5F84\u586B\u5199\uFF09"
              }
            },
            required: ["elementPath", "testId"]
          }
        },
        {
          name: "confirm_and_commit",
          description: "\u786E\u8BA4\u4FEE\u6539\u5E76\u63D0\u4EA4\u4EE3\u7801\u5230 Git\u3002\u4F1A\u521B\u5EFA\u65B0\u5206\u652F\u3001\u63D0\u4EA4\u66F4\u6539\u5E76\u63A8\u9001\u5230\u8FDC\u7A0B\u4ED3\u5E93\u3002",
          inputSchema: {
            type: "object",
            properties: {
              commitMessage: {
                type: "string",
                description: "\u63D0\u4EA4\u4FE1\u606F\uFF08\u4F8B\u5982\uFF1Atest: add data-testid to market\uFF09"
              },
              branch: {
                type: "string",
                description: "\u76EE\u6807\u5206\u652F\u540D\u79F0\uFF08\u5DF2\u5E9F\u5F03\uFF0C\u73B0\u5728\u76F4\u63A5\u5728\u5F53\u524D\u5206\u652F\u63D0\u4EA4\uFF09"
              },
              autoPush: {
                type: "boolean",
                description: "\u662F\u5426\u81EA\u52A8\u63A8\u9001\u5230\u8FDC\u7A0B\u4ED3\u5E93\uFF08\u9ED8\u8BA4\uFF1Atrue\uFF09"
              }
            },
            required: ["commitMessage"]
          }
        },
        {
          name: "create_pr",
          description: "\u521B\u5EFA Pull Request\uFF08Bitbucket Server\uFF09\u3002\u9700\u8981\u5728 confirm_and_commit \u4E4B\u540E\u8C03\u7528\uFF0C\u6216\u786E\u4FDD\u4EE3\u7801\u5DF2\u63D0\u4EA4\u5E76\u63A8\u9001\u3002PR \u5C06\u4ECE\u5F53\u524D\u5206\u652F\u5408\u5E76\u5230\u76EE\u6807\u5206\u652F\uFF08\u9ED8\u8BA4\uFF1Adevelop\uFF09\u3002\u5982\u679C\u4E0D\u63D0\u4F9B title\uFF0C\u5C06\u4F7F\u7528\u6700\u540E\u4E00\u6B21 commit \u7684 message\u3002\u5982\u679C\u4E0D\u63D0\u4F9B description\uFF0C\u5C06\u4F7F\u7528\u9ED8\u8BA4\u683C\u5F0F\uFF08\u3010\u95EE\u9898\u539F\u56E0\u3011\u548C\u3010\u6539\u52A8\u601D\u8DEF\u3011\uFF09\u3002",
          inputSchema: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "PR \u6807\u9898\uFF08\u53EF\u9009\uFF0C\u5982\u679C\u4E0D\u63D0\u4F9B\u5219\u4F7F\u7528\u6700\u540E\u4E00\u6B21 commit \u7684 message\uFF09"
              },
              description: {
                type: "string",
                description: "PR \u63CF\u8FF0\uFF08\u53EF\u9009\uFF0C\u5982\u679C\u4E0D\u63D0\u4F9B\u5219\u4F7F\u7528\u9ED8\u8BA4\u683C\u5F0F\uFF1A\n\u3010\u95EE\u9898\u539F\u56E0\u3011\n\u3010\u6539\u52A8\u601D\u8DEF\u3011\uFF09"
              },
              baseBranch: {
                type: "string",
                description: "\u76EE\u6807\u5206\u652F\uFF08\u9ED8\u8BA4\uFF1Adevelop\uFF0CPR \u5C06\u4ECE\u5F53\u524D\u5206\u652F\u5408\u5E76\u5230\u6B64\u5206\u652F\uFF09"
              },
              projectKey: {
                type: "string",
                description: "Bitbucket \u9879\u76EE Key\uFF08\u53EF\u9009\uFF0C\u4F1A\u81EA\u52A8\u4ECE\u8FDC\u7A0B URL \u89E3\u6790\uFF09"
              },
              repositorySlug: {
                type: "string",
                description: "Bitbucket \u4ED3\u5E93 Slug\uFF08\u53EF\u9009\uFF0C\u4F1A\u81EA\u52A8\u4ECE\u8FDC\u7A0B URL \u89E3\u6790\uFF09"
              },
              baseUrl: {
                type: "string",
                description: "Bitbucket Server \u57FA\u7840 URL\uFF08\u53EF\u9009\uFF0C\u4F18\u5148\u4F7F\u7528\u73AF\u5883\u53D8\u91CF BITBUCKET_BASE_URL\uFF09"
              }
            },
            required: []
          }
        },
        {
          name: "start_preview",
          description: "\u542F\u52A8\u7F51\u9875\u9884\u89C8\u670D\u52A1\u5668\uFF0C\u53EF\u4EE5\u5728\u6D4F\u89C8\u5668\u4E2D\u9009\u62E9\u5143\u7D20\u5E76\u81EA\u52A8\u6DFB\u52A0\u5230 Cursor\u3002\u6CE8\u610F\uFF1AtargetUrl \u5FC5\u987B\u662F http://localhost:3000\uFF0C\u670D\u52A1\u5668\u542F\u52A8\u540E\u4F1A\u81EA\u52A8\u6253\u5F00\u9884\u89C8\u6D4F\u89C8\u5668\u3002",
          inputSchema: {
            type: "object",
            properties: {
              targetUrl: {
                type: "string",
                description: "\u8981\u9884\u89C8\u7684\u7F51\u9875 URL\uFF08\u5FC5\u987B\u662F http://localhost:3000\uFF09"
              },
              port: {
                type: "number",
                description: "\u9884\u89C8\u670D\u52A1\u5668\u7AEF\u53E3\uFF08\u9ED8\u8BA4\uFF1A3001\uFF09"
              }
            },
            required: ["targetUrl"]
          }
        },
        {
          name: "get_selected_element",
          description: "\u83B7\u53D6\u9884\u89C8\u670D\u52A1\u5668\u4E2D\u9009\u4E2D\u7684\u5143\u7D20\u4FE1\u606F\u3002",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "add_testid_to_constant",
          description: "\u5728\u5E38\u91CF\u6587\u4EF6\u4E2D\u6DFB\u52A0 testId \u5B9A\u4E49\u3002\u5EFA\u8BAE\u5728\u6DFB\u52A0 data-testid \u540E\u4F7F\u7528\uFF0C\u53EF\u4EE5\u81EA\u52A8\u5728 test.constant.ts \u7B49\u6587\u4EF6\u4E2D\u6DFB\u52A0\u5E38\u91CF\u5B9A\u4E49\u3002\u6CE8\u610F\uFF1A\u8BF7\u6839\u636E\u7528\u6237\u5B9E\u9645\u63D0\u4F9B\u7684 testId \u548C\u7EC4\u4EF6\u4FE1\u606F\u586B\u5199\u53C2\u6570\uFF0C\u4E0D\u8981\u4F7F\u7528\u793A\u4F8B\u4E2D\u7684\u5360\u4F4D\u7B26\u503C\u3002",
          inputSchema: {
            type: "object",
            properties: {
              constantFile: {
                type: "string",
                description: "\u5E38\u91CF\u6587\u4EF6\u8DEF\u5F84\uFF08\u53EF\u9009\uFF0C\u4F1A\u81EA\u52A8\u67E5\u627E test.constant.ts \u7B49\u6587\u4EF6\uFF09"
              },
              constantKey: {
                type: "string",
                description: "\u5E38\u91CF\u952E\u540D\uFF08\u4F8B\u5982\uFF1ASUBMIT_BUTTON\u3001USER_AVATAR\u3001MENU_ITEM \u7B49\uFF0C\u6839\u636E\u5B9E\u9645\u7EC4\u4EF6\u6216\u5143\u7D20\u7528\u9014\u547D\u540D\uFF09"
              },
              testId: {
                type: "string",
                description: "testId \u503C\uFF08\u4F8B\u5982\uFF1Asubmit-button\u3001user-avatar\u3001menu-item \u7B49\uFF0C\u6839\u636E\u5B9E\u9645\u5143\u7D20\u7528\u9014\u547D\u540D\uFF09"
              }
            },
            required: ["constantKey", "testId"]
          }
        }
      ]
    };
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      switch (name) {
        case "add_testid": {
          const { elementPath, testId, componentName, componentFilePath } = args;
          if (!elementPath || !testId) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "elementPath \u548C testId \u662F\u5FC5\u9700\u7684\u53C2\u6570"
            );
          }
          let filePath = componentFilePath;
          if (!filePath) {
            const elementInfo2 = {
              domPath: elementPath,
              componentInfo: componentName ? { name: componentName } : void 0
            };
            const locatedPath = await locateComponentFileByInfo(
              componentName,
              elementPath,
              process.cwd()
            );
            if (!locatedPath) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      success: false,
                      message: `\u65E0\u6CD5\u5B9A\u4F4D\u7EC4\u4EF6\u6587\u4EF6\u3002\u8BF7\u63D0\u4F9B componentName \u6216 componentFilePath \u53C2\u6570\u3002
DOM \u8DEF\u5F84: ${elementPath}`
                    }, null, 2)
                  }
                ]
              };
            }
            filePath = locatedPath;
          }
          const elementInfo = {
            domPath: elementPath,
            componentInfo: componentName ? { name: componentName, filePath } : { filePath }
          };
          const result = await addTestIdToElement(filePath, elementInfo, testId);
          if (!result.success) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: false,
                    message: result.message || result.error || "\u4EE3\u7801\u4FEE\u6539\u5931\u8D25",
                    error: result.error,
                    details: result.details || {
                      filePath,
                      elementPath,
                      testId
                    }
                  }, null, 2)
                }
              ]
            };
          }
          pendingChanges = {
            filePath: result.filePath,
            testId,
            elementInfo
          };
          if (result.preview) {
            await applyCodeModification(result.filePath, result.preview);
          }
          const suggestions = await generateTestIdSuggestions(
            elementPath,
            testId,
            componentName,
            filePath,
            process.cwd()
          );
          const constantKey = generateConstantName(elementPath, testId, componentName);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  message: `\u6210\u529F\u4E3A\u5143\u7D20\u6DFB\u52A0 data-testid="${testId}"`,
                  filePath: result.filePath,
                  diff: result.diff,
                  preview: "\u4EE3\u7801\u5DF2\u4FEE\u6539\uFF0C\u8BF7\u68C0\u67E5\u6587\u4EF6\u786E\u8BA4\u65E0\u8BEF\u540E\u8C03\u7528 confirm_and_commit \u63D0\u4EA4\u66F4\u6539\u3002",
                  suggestions: {
                    constantFile: suggestions.constantFile,
                    constantName: suggestions.constantName,
                    constantKey,
                    constantValue: suggestions.constantValue,
                    componentFile: suggestions.componentFile,
                    tips: suggestions.suggestions,
                    nextSteps: [
                      `1. \u5728\u5E38\u91CF\u6587\u4EF6 \`${suggestions.constantFile}\` \u4E2D\u6DFB\u52A0\uFF1A\`${suggestions.constantName}.${constantKey} = '${testId}'\``,
                      `2. \u5728\u7EC4\u4EF6\u4E2D\u4F7F\u7528\uFF1A\`data-testid={${suggestions.constantName}.${constantKey}}\``,
                      `3. \u6216\u4F7F\u7528\u5DE5\u5177\uFF1A\`add_testid_to_constant\` \u81EA\u52A8\u6DFB\u52A0\u5E38\u91CF`,
                      `4. \u786E\u8BA4\u4FEE\u6539\u540E\u8C03\u7528 \`confirm_and_commit\` \u63D0\u4EA4\u4EE3\u7801`
                    ]
                  }
                }, null, 2)
              }
            ]
          };
        }
        case "confirm_and_commit": {
          const { commitMessage, branch, autoPush = true } = args;
          if (!commitMessage) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "commitMessage \u662F\u5FC5\u9700\u7684\u53C2\u6570"
            );
          }
          if (!pendingChanges) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: false,
                    message: "\u6CA1\u6709\u5F85\u63D0\u4EA4\u7684\u66F4\u6539\u3002\u8BF7\u5148\u8C03\u7528 add_testid \u6DFB\u52A0 testid\u3002"
                  }, null, 2)
                }
              ]
            };
          }
          const gitOps = new GitOperations(process.cwd());
          const lintResult = await gitOps.runLint();
          if (!lintResult.success) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: false,
                    message: lintResult.message,
                    error: lintResult.error,
                    nextStep: "\u8BF7\u4FEE\u590D lint \u9519\u8BEF\u540E\u91CD\u8BD5"
                  }, null, 2)
                }
              ]
            };
          }
          const currentBranch = await gitOps.getCurrentBranch();
          const pullResult = await gitOps.pullFromRemote("origin", currentBranch);
          if (!pullResult.success) {
            if (pullResult.message?.includes("\u51B2\u7A81")) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      success: false,
                      message: pullResult.message,
                      error: pullResult.error,
                      nextStep: "\u8BF7\u5148\u89E3\u51B3\u51B2\u7A81\uFF1A1. \u624B\u52A8\u89E3\u51B3\u51B2\u7A81\u6587\u4EF6 2. git add \u51B2\u7A81\u6587\u4EF6 3. \u518D\u6B21\u8C03\u7528 confirm_and_commit"
                    }, null, 2)
                  }
                ]
              };
            }
          }
          const filesToCommit = [];
          const { relative } = await import("path");
          const rootDir = process.cwd();
          const codeFileRelative = relative(rootDir, pendingChanges.filePath);
          filesToCommit.push(codeFileRelative);
          const modifiedFiles = await gitOps.getModifiedFiles();
          const constantFiles = await findTestConstantFiles(rootDir);
          for (const constantFile of constantFiles) {
            const constantFileRelative = relative(rootDir, constantFile);
            if (modifiedFiles.includes(constantFileRelative) || modifiedFiles.includes(constantFile)) {
              if (!filesToCommit.includes(constantFileRelative)) {
                filesToCommit.push(constantFileRelative);
              }
            }
          }
          const result = await gitOps.commitChanges(
            filesToCommit,
            commitMessage
          );
          if (!result.success) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }
          if (autoPush) {
            const pushResult = await gitOps.pushToRemote();
            if (pushResult.success) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      success: true,
                      message: `\u4EE3\u7801\u5DF2\u63D0\u4EA4\u5E76\u63A8\u9001`,
                      branch: currentBranch,
                      nextStep: "\u53EF\u4EE5\u8C03\u7528 create_pr \u521B\u5EFA Pull Request"
                    }, null, 2)
                  }
                ]
              };
            } else {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      success: true,
                      message: `\u4EE3\u7801\u5DF2\u63D0\u4EA4\u5230\u5206\u652F ${currentBranch}\uFF0C\u4F46\u63A8\u9001\u5931\u8D25`,
                      branch: currentBranch,
                      pushError: pushResult.error,
                      nextStep: "\u53EF\u4EE5\u624B\u52A8\u6267\u884C git push \u6216\u8C03\u7528 create_pr \u521B\u5EFA Pull Request"
                    }, null, 2)
                  }
                ]
              };
            }
          }
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  message: result.message,
                  branch: currentBranch,
                  nextStep: autoPush ? "\u53EF\u4EE5\u8C03\u7528 create_pr \u521B\u5EFA Pull Request" : "\u53EF\u4EE5\u624B\u52A8\u6267\u884C git push \u6216\u8C03\u7528 create_pr \u521B\u5EFA Pull Request"
                }, null, 2)
              }
            ]
          };
        }
        case "create_pr": {
          const {
            title,
            description,
            baseBranch = "develop",
            projectKey,
            repositorySlug,
            baseUrl
          } = args;
          if (!title) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "title \u662F\u5FC5\u9700\u7684\u53C2\u6570"
            );
          }
          const username = process.env.BITBUCKET_USERNAME;
          const password = process.env.BITBUCKET_PASSWORD || process.env.BITBUCKET_TOKEN;
          if (!username || !password) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: false,
                    message: "\u9700\u8981\u8BBE\u7F6E BITBUCKET_USERNAME \u548C BITBUCKET_PASSWORD (\u6216 BITBUCKET_TOKEN) \u73AF\u5883\u53D8\u91CF\u6765\u521B\u5EFA PR"
                  }, null, 2)
                }
              ]
            };
          }
          const gitOps = new GitOperations(process.cwd());
          const currentBranch = await gitOps.getCurrentBranch();
          let prTitle = title;
          if (!prTitle) {
            prTitle = await gitOps.getLastCommitMessage();
            if (!prTitle) {
              throw new McpError(
                ErrorCode.InvalidParams,
                "\u65E0\u6CD5\u83B7\u53D6\u6700\u540E\u4E00\u6B21\u63D0\u4EA4\u4FE1\u606F\uFF0C\u8BF7\u63D0\u4F9B title \u53C2\u6570"
              );
            }
          }
          let prDescription = description;
          if (!prDescription) {
            prDescription = `\u3010\u95EE\u9898\u539F\u56E0\u3011
\u3010\u6539\u52A8\u601D\u8DEF\u3011`;
          } else {
            if (!prDescription.includes("\u3010\u95EE\u9898\u539F\u56E0\u3011") && !prDescription.includes("\u3010\u6539\u52A8\u601D\u8DEF\u3011")) {
              prDescription = `\u3010\u95EE\u9898\u539F\u56E0\u3011
${prDescription}

\u3010\u6539\u52A8\u601D\u8DEF\u3011`;
            }
          }
          const result = await gitOps.createPullRequest(
            prTitle,
            prDescription,
            void 0,
            // baseBranch 已废弃，使用当前分支作为目标分支
            {
              baseUrl,
              username,
              password,
              projectKey,
              repositorySlug
            }
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }
        case "start_preview": {
          const { targetUrl, port } = args;
          if (!targetUrl) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "targetUrl \u662F\u5FC5\u9700\u7684\u53C2\u6570"
            );
          }
          const normalizedUrl = targetUrl.trim().toLowerCase();
          if (normalizedUrl !== "http://localhost:3000" && normalizedUrl !== "http://127.0.0.1:3000") {
            throw new McpError(
              ErrorCode.InvalidParams,
              `targetUrl \u5FC5\u987B\u662F http://localhost:3000\uFF0C\u5F53\u524D\u503C\uFF1A${targetUrl}`
            );
          }
          try {
            if (previewServer) {
              previewServer.stop();
            }
            previewServer = new PreviewServer({
              targetUrl: "http://localhost:3000",
              port: port || 3001
            });
            const { url, port: actualPort } = await previewServer.start();
            await openBrowser(url);
            const injectScriptCode = `fetch('http://localhost:${actualPort}/inject-script.js').then(r => r.text()).then(eval);`;
            const injectScriptUrl = `http://localhost:${actualPort}/inject-script.js`;
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: true,
                    message: `\u9884\u89C8\u670D\u52A1\u5668\u5DF2\u542F\u52A8\uFF08\u7AEF\u53E3 ${actualPort}\uFF09\uFF0C\u6D4F\u89C8\u5668\u5DF2\u81EA\u52A8\u6253\u5F00`,
                    previewUrl: url,
                    targetUrl: "http://localhost:3000",
                    injectScriptUrl,
                    injectScriptCode,
                    instructions: `\u9884\u89C8\u6D4F\u89C8\u5668\u5DF2\u81EA\u52A8\u6253\u5F00\u3002\u8BF7\u5728\u76EE\u6807\u7F51\u9875\uFF08http://localhost:3000\uFF09\u7684\u63A7\u5236\u53F0\u4E2D\u6267\u884C\u4EE5\u4E0B\u4EE3\u7801\u6765\u6CE8\u5165\u811A\u672C\uFF1A`,
                    autoInject: {
                      url: "http://localhost:3000",
                      script: injectScriptCode,
                      description: "\u4F7F\u7528\u6D4F\u89C8\u5668\u6269\u5C55\u5DE5\u5177\u81EA\u52A8\u5728\u76EE\u6807\u7F51\u9875\u7684\u63A7\u5236\u53F0\u4E2D\u6267\u884C\u811A\u672C"
                    },
                    manualFallback: `\u5982\u679C\u81EA\u52A8\u6CE8\u5165\u5931\u8D25\uFF0C\u53EF\u4EE5\u624B\u52A8\u5728\u76EE\u6807\u7F51\u9875\u7684\u63A7\u5236\u53F0\u4E2D\u8FD0\u884C\uFF1A${injectScriptCode}`,
                    nextStep: '\u811A\u672C\u6CE8\u5165\u540E\uFF0C\u9875\u9762\u53F3\u4FA7\u4F1A\u663E\u793A\u63A7\u5236\u9762\u677F\uFF0C\u70B9\u51FB"\u5F00\u59CB\u9009\u62E9\u5143\u7D20"\u6309\u94AE\u5373\u53EF\u5F00\u59CB\u9009\u62E9'
                  }, null, 2)
                }
              ]
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                    message: "\u542F\u52A8\u9884\u89C8\u670D\u52A1\u5668\u5931\u8D25"
                  }, null, 2)
                }
              ]
            };
          }
        }
        case "get_selected_element": {
          if (!previewServer) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: false,
                    message: "\u9884\u89C8\u670D\u52A1\u5668\u672A\u542F\u52A8\u3002\u8BF7\u5148\u8C03\u7528 start_preview \u542F\u52A8\u670D\u52A1\u5668\u3002"
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
                  type: "text",
                  text: JSON.stringify({
                    success: false,
                    message: "\u5C1A\u672A\u9009\u62E9\u5143\u7D20\u3002\u8BF7\u5728\u9884\u89C8\u9875\u9762\u4E2D\u9009\u62E9\u4E00\u4E2A\u5143\u7D20\u3002"
                  }, null, 2)
                }
              ]
            };
          }
          if (selectedElement.testId && selectedElement.elementPath) {
            const suggestions = await generateTestIdSuggestions(
              selectedElement.elementPath,
              selectedElement.testId,
              selectedElement.componentName,
              void 0,
              process.cwd()
            );
            const constantKey = generateConstantName(
              selectedElement.elementPath,
              selectedElement.testId,
              selectedElement.componentName
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: true,
                    element: selectedElement,
                    message: `\u5DF2\u9009\u62E9\u5143\u7D20\uFF0CDOM \u8DEF\u5F84: ${selectedElement.elementPath}\uFF0CtestId: ${selectedElement.testId}`,
                    suggestions: {
                      constantFile: suggestions.constantFile,
                      constantName: suggestions.constantName,
                      constantKey,
                      constantValue: suggestions.constantValue,
                      tips: suggestions.suggestions,
                      nextSteps: [
                        `1. \u8C03\u7528 \`add_testid\` \u5DE5\u5177\u6DFB\u52A0 data-testid \u5C5E\u6027`,
                        `2. \u5728\u5E38\u91CF\u6587\u4EF6 \`${suggestions.constantFile}\` \u4E2D\u6DFB\u52A0\uFF1A\`${suggestions.constantName}.${constantKey} = '${selectedElement.testId}'\``,
                        `3. \u5728\u7EC4\u4EF6\u4E2D\u4F7F\u7528\u5E38\u91CF\uFF1A\`data-testid={${suggestions.constantName}.${constantKey}}\``,
                        `4. \u6216\u4F7F\u7528\u5DE5\u5177\uFF1A\`add_testid_to_constant\` \u81EA\u52A8\u6DFB\u52A0\u5E38\u91CF`,
                        `5. \u786E\u8BA4\u4FEE\u6539\u540E\u8C03\u7528 \`confirm_and_commit\` \u63D0\u4EA4\u4EE3\u7801`
                      ]
                    },
                    quickAction: `\u53EF\u4EE5\u8C03\u7528 add_testid \u5DE5\u5177\u6DFB\u52A0 testid\uFF0C\u53C2\u6570\uFF1AelementPath="${selectedElement.elementPath}", testId="${selectedElement.testId}"`
                  }, null, 2)
                }
              ]
            };
          }
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  element: selectedElement,
                  message: `\u5DF2\u9009\u62E9\u5143\u7D20\uFF0CDOM \u8DEF\u5F84: ${selectedElement.elementPath}`
                }, null, 2)
              }
            ]
          };
        }
        case "add_testid_to_constant": {
          const { constantFile, constantKey, testId } = args;
          if (!constantKey || !testId) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "constantKey \u548C testId \u662F\u5FC5\u9700\u7684\u53C2\u6570"
            );
          }
          let targetFile = constantFile;
          if (!targetFile) {
            const { findTestConstantFiles: findTestConstantFiles2 } = await Promise.resolve().then(() => (init_testIdHelper(), testIdHelper_exports));
            const files = await findTestConstantFiles2(process.cwd());
            if (files.length > 0) {
              targetFile = files[0];
            } else {
              const { join: join4 } = await import("path");
              targetFile = join4(process.cwd(), "test.constant.ts");
            }
          }
          const result = await addTestIdToConstant(targetFile, constantKey, testId);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: result.success,
                  message: result.message,
                  constantFile: targetFile,
                  constantKey,
                  testId,
                  content: result.content,
                  nextStep: result.success ? "\u5E38\u91CF\u5DF2\u6DFB\u52A0\uFF0C\u53EF\u4EE5\u5728\u7EC4\u4EF6\u4E2D\u4F7F\u7528\u3002\u786E\u8BA4\u4FEE\u6539\u540E\u8C03\u7528 confirm_and_commit \u63D0\u4EA4\u4EE3\u7801\u3002" : "\u6DFB\u52A0\u5E38\u91CF\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u9519\u8BEF\u4FE1\u606F\u3002"
                }, null, 2)
              }
            ]
          };
        }
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `\u672A\u77E5\u7684\u5DE5\u5177: ${name}`
          );
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `\u5DE5\u5177\u6267\u884C\u5931\u8D25: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
  return server;
}
async function main() {
  const server = await createServer2();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TestID Helper MCP Server \u5DF2\u542F\u52A8");
}
process.on("uncaughtException", (error) => {
  console.error("\u672A\u6355\u83B7\u7684\u5F02\u5E38:", error);
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("\u672A\u5904\u7406\u7684 Promise \u62D2\u7EDD:", reason);
  process.exit(1);
});
main().catch((error) => {
  console.error("\u542F\u52A8\u5931\u8D25:", error);
  process.exit(1);
});
