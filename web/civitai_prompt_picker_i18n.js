const STRINGS = {
    zh: {
        allTime: "全部时间",
        pastDay: "一天内",
        pastWeek: "一周内",
        pastMonth: "一月内",
        pastYear: "一年内",
        allVisibilityLevels: "全部可见级别",
        safeOnly: "仅安全内容",
        anyNsfw: "仅 NSFW",
        softOnly: "仅 Soft",
        matureOnly: "仅 Mature",
        xOnly: "仅 X",
        defaultSort: "默认排序",
        allBaseModels: "全部基础模型",
        allRatios: "全部比例",
        portraitOnly: "竖图",
        landscapeOnly: "横图",
        squareOnly: "方图",
        allSizes: "全部尺寸",
        longEdge1024: "长边 >= 1024",
        longEdge1536: "长边 >= 1536",
        longEdge2048: "长边 >= 2048",
        longEdge3072: "长边 >= 3072",
        customInput: "自定义输入...",
        noMetadataAvailable: "有图片，但都没有可用 prompt metadata。关闭 metadata only 会看到更多。",
        noPublicModelVersionImages:
            "模型版本 {modelVersionId} 在 Civitai 图片接口里没有公开图库图，或这些图需要登录/API Key/NSFW 可见权限。",
        noCurrentModelVersionImages: "当前模型版本没有公开图库图。",
        noPublicModelImages:
            "模型 {modelId} 在 Civitai 图片接口里没有公开图库图，或这些图需要登录/API Key/NSFW 可见权限。",
        noCurrentModelImages: "当前模型没有公开图库图。",
        noImagesForFilters: "当前时间段、基础模型或 NSFW 筛选下没有公开图片。",
        filteredOutByCombination:
            "接口里有图片，但被当前筛选组合压空了。先放宽 metadata only、时间段或基础模型会更容易命中。",
        noImagesReturned: "Civitai 当前没有返回可显示图片。",
        baseModelPlaceholder: "输入基础模型名，或输入模型名并从建议中选择",
        baseModelLabel: "基础模型",
        modelIdPlaceholder: "例如 257749",
        modelVersionIdPlaceholder: "例如 290640",
        usernamePlaceholder: "例如 civitai 用户名",
        postIdPlaceholder: "例如 12345",
        modelTagPlaceholder: "例如 anime",
        usernameHint: "作者用户名：直接作为图片上游筛选，也会参与模型搜索。",
        postIdHint: "帖子 ID：直接作为图片上游筛选。",
        modelTagHint: "模型标签：作用于模型搜索和生态模型版本抓图，不是图片接口原生筛选。",
        apiKeyPlaceholder: "可选，用于登录可见图片或 NSFW 内容",
        metadataOnlyToggle: "仅显示带 metadata/prompt 的图片",
        periodLabel: "时间段",
        sortLabel: "排序",
        nsfwLabel: "NSFW",
        aspectRatioLabel: "图片比例",
        resolutionLabel: "最小分辨率",
        tagsLabel: "标签",
        blockTagsLabel: "屏蔽标签",
        modelIdLabel: "模型 ID",
        modelVersionIdLabel: "模型版本 ID",
        usernameLabel: "作者用户名",
        postIdLabel: "帖子 ID",
        modelTagLabel: "模型标签",
        apiKeyLabel: "Civitai API Key",
        imageUpstreamScope: "图片上游：{items}",
        modelUpstreamScope: "模型上游：{items}",
        modelTagLimited: "{tag}（当前仅模型搜索/生态模型抓图生效）",
        readyStatus: "准备加载 Civitai 缩略图...",
        applyFilters: "应用筛选",
        loadingMore: "正在加载更多图片...",
        favoritesButton: "收藏夹 ({count})",
        browseButton: "返回图片流",
        favoriteAdd: "收藏这张图",
        favoriteRemove: "取消收藏",
        favoritesEmpty: "收藏夹还是空的。先在上面的图片里点星标。",
        favoritesStatus: "正在查看 {count} 张收藏图片。点击即可直接复用。",
        favoriteSaved: "已收藏图片 #{id}",
        favoriteRemoved: "已取消收藏图片 #{id}",
        previewLabel: "选中图片的 Prompt",
        previewPlaceholder: "点击上面的图片后，这里会出现 prompt。",
        loadingThumbnails: "正在加载缩略图...",
        noVisibleImages: "当前没有可显示的图片。",
        loadingByFilters: "正在按筛选条件加载缩略图...",
        loadingMoreStatus: "正在加载更多缩略图...",
        tooManyEmptyPages: "连续空页过多，先停在这里。继续滚动可再向后抓取。",
        emptyPageContinue: "当前页没有命中结果，继续向后抓取第 {page} 页...",
        continuePrefill: "当前可视区域还没填满，继续自动抓取下一页...",
        hasMoreReason: "{reasonMessage} 当前还可以继续向后抓取更多页。",
        continueScrolling: "暂时还没找到命中结果，继续滚动会再向后抓取。",
        noMatchingImages: "没有符合筛选条件的图片。",
        loadedBottom: "已加载 {count} 张图片，已经到底了。",
        loadedMore: "已加载 {count} 张图片。继续滚动会自动加载更多。",
        loadFailed: "加载失败：{error}",
        loadFailedRetry: "加载失败，请稍后重试。",
        continuePrefillFirstScreen: "已加载 {count} 张图片，正在继续补齐首屏...",
        hasNegativePrompt: "带负面 prompt",
        noNegativePrompt: "无负面 prompt",
        selectedImageStatus: "已选择图片 #{id}{sizeSegment} · {negativeStatus}",
        modelSearchResolved: "已自动锁定模型版本 {modelVersionId}，正在重新抓图...",
        modelSearchChooseCandidate: "找到 {count} 个相关模型，请在建议里选一个具体模型版本。",
    },
    en: {
        allTime: "All time",
        pastDay: "Past day",
        pastWeek: "Past week",
        pastMonth: "Past month",
        pastYear: "Past year",
        allVisibilityLevels: "All visibility levels",
        safeOnly: "Safe only",
        anyNsfw: "NSFW only",
        softOnly: "Soft only",
        matureOnly: "Mature only",
        xOnly: "X only",
        defaultSort: "Default sort",
        allBaseModels: "All base models",
        allRatios: "All ratios",
        portraitOnly: "Portrait only",
        landscapeOnly: "Landscape only",
        squareOnly: "Square only",
        allSizes: "All sizes",
        longEdge1024: "Long edge >= 1024",
        longEdge1536: "Long edge >= 1536",
        longEdge2048: "Long edge >= 2048",
        longEdge3072: "Long edge >= 3072",
        customInput: "Custom input...",
        noMetadataAvailable: "Images exist, but none contain usable prompt metadata. Disable metadata only to see more.",
        noPublicModelVersionImages:
            "Model version {modelVersionId} has no public gallery images in the Civitai images API, or they require login/API key/NSFW visibility.",
        noCurrentModelVersionImages: "This model version has no public gallery images.",
        noPublicModelImages:
            "Model {modelId} has no public gallery images in the Civitai images API, or they require login/API key/NSFW visibility.",
        noCurrentModelImages: "This model has no public gallery images.",
        noImagesForFilters: "No public images match the current period, base model, or NSFW filters.",
        filteredOutByCombination:
            "The API returned images, but the current filter combination removed them all. Relax metadata only, time range, or base model to get more hits.",
        noImagesReturned: "Civitai returned no displayable images right now.",
        baseModelPlaceholder: "Enter a base model name, or type a model name and pick a suggestion",
        baseModelLabel: "Base model",
        modelIdPlaceholder: "Example: 257749",
        modelVersionIdPlaceholder: "Example: 290640",
        usernamePlaceholder: "Example: civitai username",
        postIdPlaceholder: "Example: 12345",
        modelTagPlaceholder: "Example: anime",
        usernameHint: "Author username: applied directly as an upstream image filter and reused for model search.",
        postIdHint: "Post ID: applied directly as an upstream image filter.",
        modelTagHint: "Model tag: applied to model search and family model-version fetching, not as a native images API filter.",
        apiKeyPlaceholder: "Optional, used for logged-in or NSFW-visible images",
        metadataOnlyToggle: "Only show images with metadata/prompt",
        periodLabel: "Time range",
        sortLabel: "Sort",
        nsfwLabel: "NSFW",
        aspectRatioLabel: "Aspect ratio",
        resolutionLabel: "Min resolution",
        tagsLabel: "Tags",
        blockTagsLabel: "Blocked tags",
        modelIdLabel: "Model ID",
        modelVersionIdLabel: "Model version ID",
        usernameLabel: "Author username",
        postIdLabel: "Post ID",
        modelTagLabel: "Model tag",
        apiKeyLabel: "Civitai API Key",
        imageUpstreamScope: "Image upstream: {items}",
        modelUpstreamScope: "Model upstream: {items}",
        modelTagLimited: "{tag} (currently only active for model search/family model fetching)",
        readyStatus: "Ready to load Civitai thumbnails...",
        applyFilters: "Apply filters",
        loadingMore: "Loading more images...",
        favoritesButton: "Favorites ({count})",
        browseButton: "Back to feed",
        favoriteAdd: "Add to favorites",
        favoriteRemove: "Remove from favorites",
        favoritesEmpty: "Favorites is empty. Click the star on any image above first.",
        favoritesStatus: "Viewing {count} favorite images. Click one to reuse it.",
        favoriteSaved: "Saved image #{id} to favorites",
        favoriteRemoved: "Removed image #{id} from favorites",
        previewLabel: "Prompt from selected image",
        previewPlaceholder: "Click an image above to show its prompt here.",
        loadingThumbnails: "Loading thumbnails...",
        noVisibleImages: "No images are currently visible.",
        loadingByFilters: "Loading thumbnails with current filters...",
        loadingMoreStatus: "Loading more thumbnails...",
        tooManyEmptyPages: "Too many empty pages in a row. Stopping here for now. Keep scrolling to continue.",
        emptyPageContinue: "No matches on this page, continuing to upstream page {page}...",
        continuePrefill: "Visible area is not full yet, automatically fetching the next page...",
        hasMoreReason: "{reasonMessage} More pages are still available upstream.",
        continueScrolling: "No hits yet. Keep scrolling to continue searching upstream.",
        noMatchingImages: "No images match the current filters.",
        loadedBottom: "Loaded {count} images. Reached the end.",
        loadedMore: "Loaded {count} images. Keep scrolling to load more.",
        loadFailed: "Load failed: {error}",
        loadFailedRetry: "Load failed. Please try again shortly.",
        continuePrefillFirstScreen: "Loaded {count} images. Continuing to fill the first screen...",
        hasNegativePrompt: "Has negative prompt",
        noNegativePrompt: "No negative prompt",
        selectedImageStatus: "Selected image #{id}{sizeSegment} · {negativeStatus}",
        modelSearchResolved: "Auto-selected model version {modelVersionId}. Reloading images...",
        modelSearchChooseCandidate: "Found {count} related models. Pick a specific model version from the suggestions.",
    },
};


function interpolate(template, params = {}) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ""));
}


export function resolveUiLanguage(browserLanguage) {
    const normalized = String(browserLanguage || "").toLowerCase();
    return normalized.startsWith("zh") ? "zh" : "en";
}


export function translate(language, key, params = {}) {
    const table = STRINGS[language] || STRINGS.zh;
    const fallback = STRINGS.zh[key] ?? key;
    return interpolate(table[key] ?? fallback, params);
}


export function buildPeriodOptions(language) {
    return [
        { value: "", label: translate(language, "allTime") },
        { value: "Day", label: translate(language, "pastDay") },
        { value: "Week", label: translate(language, "pastWeek") },
        { value: "Month", label: translate(language, "pastMonth") },
        { value: "Year", label: translate(language, "pastYear") },
    ];
}


export function buildNsfwOptions(language) {
    return [
        { value: "", label: translate(language, "allVisibilityLevels") },
        { value: "false", label: translate(language, "safeOnly") },
        { value: "true", label: translate(language, "anyNsfw") },
        { value: "Soft", label: translate(language, "softOnly") },
        { value: "Mature", label: translate(language, "matureOnly") },
        { value: "X", label: translate(language, "xOnly") },
    ];
}


export function buildSortOptions(language) {
    return [
        { value: "", label: translate(language, "defaultSort") },
        { value: "Most Reactions", label: "Most Reactions" },
        { value: "Most Comments", label: "Most Comments" },
        { value: "Most Collected", label: "Most Collected" },
        { value: "Newest", label: "Newest" },
        { value: "Oldest", label: "Oldest" },
    ];
}


export function buildBaseModelOptions(values, language, customValue) {
    const options = [{ value: "", label: translate(language, "allBaseModels") }];
    for (const value of values) {
        options.push({ value, label: value });
    }
    options.push({ value: customValue, label: translate(language, "customInput") });
    return options;
}


export function buildAspectRatioOptions(language) {
    return [
        { value: "", label: translate(language, "allRatios") },
        { value: "PORTRAIT", label: translate(language, "portraitOnly") },
        { value: "LANDSCAPE", label: translate(language, "landscapeOnly") },
        { value: "SQUARE", label: translate(language, "squareOnly") },
        { value: "9:16", label: "9:16" },
        { value: "3:4", label: "3:4" },
        { value: "2:3", label: "2:3" },
        { value: "1:1", label: "1:1" },
        { value: "3:2", label: "3:2" },
        { value: "4:3", label: "4:3" },
        { value: "16:9", label: "16:9" },
    ];
}


export function buildResolutionOptions(language) {
    return [
        { value: "", label: translate(language, "allSizes") },
        { value: "1024", label: translate(language, "longEdge1024") },
        { value: "1536", label: translate(language, "longEdge1536") },
        { value: "2048", label: translate(language, "longEdge2048") },
        { value: "3072", label: translate(language, "longEdge3072") },
    ];
}
