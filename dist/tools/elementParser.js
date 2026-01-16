/**
 * DOM 路径解析工具
 */
/**
 * 解析 DOM 路径字符串
 * 支持格式：div#__next > div > div.fam:min-h-[100vh] > button.x-button
 */
export function parseDOMPath(domPath) {
    const parts = domPath.split(' > ').filter(part => part.trim());
    const selectors = parts.map(part => {
        const trimmed = part.trim();
        // 提取 ID
        const idMatch = trimmed.match(/#([\w-]+)/);
        // 提取所有类名（可能有多个）
        const classMatches = trimmed.matchAll(/\.([\w:\[\]-]+)/g);
        const classes = [];
        for (const match of classMatches) {
            classes.push(match[1]);
        }
        // 提取标签名
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
/**
 * 从 DOM 路径中提取类名（用于文件搜索）
 */
export function extractClassName(domPath) {
    const location = parseDOMPath(domPath);
    // 优先使用最后一个选择器的类名
    const lastSelector = location.selectors[location.selectors.length - 1];
    if (lastSelector?.classes && lastSelector.classes.length > 0) {
        return lastSelector.classes[0];
    }
    // 如果没有类名，尝试使用 ID
    if (lastSelector?.id) {
        return lastSelector.id;
    }
    return null;
}
/**
 * 从 DOM 路径中提取标签名
 */
export function extractTagName(domPath) {
    const location = parseDOMPath(domPath);
    const lastSelector = location.selectors[location.selectors.length - 1];
    return lastSelector?.tag || null;
}
//# sourceMappingURL=elementParser.js.map