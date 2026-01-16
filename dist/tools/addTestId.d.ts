/**
 * 添加 data-testid 工具
 * 使用 AST 解析和修改代码
 */
import type { ElementInfo, ModificationResult } from '../types/element.js';
/**
 * 为指定元素添加 data-testid 属性
 */
export declare function addTestIdToElement(filePath: string, elementInfo: ElementInfo, testId: string): Promise<ModificationResult>;
/**
 * 应用代码修改（写入文件）
 */
export declare function applyCodeModification(filePath: string, newCode: string): Promise<void>;
//# sourceMappingURL=addTestId.d.ts.map