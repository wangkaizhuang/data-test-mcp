/**
 * 文件定位工具
 * 用于根据组件名称、类名等信息定位源代码文件
 */
/**
 * 在指定目录中搜索包含特定文本的文件
 */
export declare function searchFiles(pattern: string, rootDir?: string, fileExtensions?: string[]): Promise<string[]>;
/**
 * 通过组件名称搜索文件
 */
export declare function locateComponentFile(componentName: string, rootDir?: string): Promise<string[]>;
/**
 * 通过类名搜索文件
 */
export declare function locateFileByClassName(className: string, rootDir?: string): Promise<string[]>;
/**
 * 综合定位组件文件
 * 结合多种策略找到最可能的文件
 */
export declare function locateComponentFileByInfo(componentName?: string, domPath?: string, rootDir?: string): Promise<string | null>;
//# sourceMappingURL=fileLocator.d.ts.map