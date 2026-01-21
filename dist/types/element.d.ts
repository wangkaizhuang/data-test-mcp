/**
 * 元素信息类型定义
 */
export interface ElementSelector {
    tag?: string;
    id?: string;
    classes: string[];
}
export interface ElementLocation {
    selectors: ElementSelector[];
    fullPath: string;
}
export interface ComponentInfo {
    name?: string;
    filePath?: string;
    props?: Record<string, any>;
}
export interface ElementInfo {
    domPath: string;
    componentInfo?: ComponentInfo;
    attributes?: Array<{
        name: string;
        value: string;
    }>;
    position?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export interface ModificationResult {
    success: boolean;
    filePath?: string;
    diff?: string;
    preview?: string;
    message?: string;
    error?: string;
    location?: {
        filePath: string;
        line: number;
        column: number;
    };
    details?: {
        domPath?: string;
        candidates?: string[];
        suggestions?: string[];
    };
}
export interface GitOperationResult {
    success: boolean;
    message?: string;
    branch?: string;
    prUrl?: string;
    error?: string;
    details?: {
        gitRoot?: string;
        currentDir?: string;
        filesCount?: number;
        hint?: string;
    };
}
//# sourceMappingURL=element.d.ts.map