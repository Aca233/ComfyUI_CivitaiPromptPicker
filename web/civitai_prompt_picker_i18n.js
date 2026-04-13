const STRINGS = {
    zh: {
        allTime: "全部时间",
        pastDay: "一天内",
        pastWeek: "一周内",
        pastMonth: "一月内",
        pastYear: "一年内",
        allVisibilityLevels: "全部可见级别",
        safeOnly: "仅安全内容",
        anyNsfw: "任意 NSFW",
        softOnly: "仅 Soft",
        matureOnly: "仅 Mature",
        xOnly: "仅 X",
        defaultSort: "默认排序",
        allBaseModels: "全部基础模型",
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
        baseModelPlaceholder: "输入未出现在下拉中的基础模型名",
        baseModelLabel: "基础模型",
        modelIdPlaceholder: "例如 257749",
        modelVersionIdPlaceholder: "例如 290640",
        apiKeyPlaceholder: "可选，用于登录可见图片或 NSFW 内容",
        metadataOnlyToggle: "仅显示带 metadata/prompt 的图片",
        periodLabel: "时间段",
        sortLabel: "排序",
        nsfwLabel: "NSFW",
        tagsLabel: "标签",
        modelIdLabel: "模型 ID",
        modelVersionIdLabel: "模型版本 ID",
        apiKeyLabel: "Civitai API Key",
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
    },
    en: {
        allTime: "All time",
        pastDay: "Past day",
        pastWeek: "Past week",
        pastMonth: "Past month",
        pastYear: "Past year",
        allVisibilityLevels: "All visibility levels",
        safeOnly: "Safe only",
        anyNsfw: "Any NSFW",
        softOnly: "Soft only",
        matureOnly: "Mature only",
        xOnly: "X only",
        defaultSort: "Default sort",
        allBaseModels: "All base models",
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
        baseModelPlaceholder: "Enter a base model name not shown in the dropdown",
        baseModelLabel: "Base model",
        modelIdPlaceholder: "Example: 257749",
        modelVersionIdPlaceholder: "Example: 290640",
        apiKeyPlaceholder: "Optional, used for logged-in or NSFW-visible images",
        metadataOnlyToggle: "Only show images with metadata/prompt",
        periodLabel: "Time range",
        sortLabel: "Sort",
        nsfwLabel: "NSFW",
        tagsLabel: "Tags",
        modelIdLabel: "Model ID",
        modelVersionIdLabel: "Model version ID",
        apiKeyLabel: "Civitai API Key",
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
