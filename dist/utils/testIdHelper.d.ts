/**
 * TestID 辅助工具
 * 提供智能提示和建议
 */
export interface TestIdSuggestion {
    constantFile?: string;
    constantName?: string;
    constantValue?: string;
    componentFile?: string;
    suggestions: string[];
}
/**
 * 查找测试常量文件
 */
export declare function findTestConstantFiles(rootDir?: string): Promise<string[]>;
/**
 * 检查常量文件中是否已有 TEST_IDS 定义
 */
export declare function checkTestIdsConstant(filePath: string): Promise<{
    exists: boolean;
    content?: string;
    testIds?: Record<string, string>;
}>;
/**
 * 生成常量名称建议
 */
export declare function generateConstantName(elementPath: string, testId: string, componentName?: string): string;
/**
 * 生成智能提示
 */
export declare function generateTestIdSuggestions(elementPath: string, testId: string, componentName?: string, componentFilePath?: string, rootDir?: string): Promise<TestIdSuggestion>;
/**
 * 在常量文件中添加 testId
 */
export declare function addTestIdToConstant(constantFile: string, constantKey: string, testId: string): Promise<{
    success: boolean;
    message: string;
    content?: string;
}>;
//# sourceMappingURL=testIdHelper.d.ts.map