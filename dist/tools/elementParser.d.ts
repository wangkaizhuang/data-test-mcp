/**
 * DOM 路径解析工具
 */
import type { ElementLocation } from '../types/element.js';
/**
 * 解析 DOM 路径字符串
 * 支持格式：div#__next > div > div.fam:min-h-[100vh] > button.x-button
 */
export declare function parseDOMPath(domPath: string): ElementLocation;
/**
 * 从 DOM 路径中提取类名（用于文件搜索）
 */
export declare function extractClassName(domPath: string): string | null;
/**
 * 从 DOM 路径中提取标签名
 */
export declare function extractTagName(domPath: string): string | null;
//# sourceMappingURL=elementParser.d.ts.map