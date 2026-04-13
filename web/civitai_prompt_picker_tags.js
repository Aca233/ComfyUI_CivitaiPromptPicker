const TAG_FILTER_OPTION_DEFS = [
    { value: "ANIMAL", labels: { zh: "动物", en: "ANIMAL" } },
    { value: "ANIME", labels: { zh: "动漫", en: "ANIME" } },
    { value: "ARCHITECTURE", labels: { zh: "建筑", en: "ARCHITECTURE" } },
    { value: "ARMOR", labels: { zh: "盔甲", en: "ARMOR" } },
    { value: "ASTRONOMY", labels: { zh: "天文", en: "ASTRONOMY" } },
    { value: "CAR", labels: { zh: "汽车", en: "CAR" } },
    { value: "CARTOON", labels: { zh: "卡通", en: "CARTOON" } },
    { value: "CAT", labels: { zh: "猫", en: "CAT" } },
    { value: "CITY", labels: { zh: "城市", en: "CITY" } },
    { value: "CLOTHING", labels: { zh: "服装", en: "CLOTHING" } },
    { value: "COMICS", labels: { zh: "漫画", en: "COMICS" } },
    { value: "COSTUME", labels: { zh: "戏服", en: "COSTUME" } },
    { value: "DOG", labels: { zh: "狗", en: "DOG" } },
    { value: "DRAGON", labels: { zh: "龙", en: "DRAGON" } },
    { value: "FANTASY", labels: { zh: "奇幻", en: "FANTASY" } },
    { value: "FOOD", labels: { zh: "食物", en: "FOOD" } },
    { value: "GAME CHARACTER", labels: { zh: "游戏角色", en: "GAME CHARACTER" } },
    { value: "LANDSCAPE", labels: { zh: "风景", en: "LANDSCAPE" } },
    { value: "LATEX CLOTHING", labels: { zh: "乳胶服装", en: "LATEX CLOTHING" } },
    { value: "MAN", labels: { zh: "男性", en: "MAN" } },
    { value: "MODERN ART", labels: { zh: "现代艺术", en: "MODERN ART" } },
    { value: "OUTDOORS", labels: { zh: "户外", en: "OUTDOORS" } },
    { value: "PHOTOGRAPHY", labels: { zh: "摄影", en: "PHOTOGRAPHY" } },
    { value: "PHOTOREALISTIC", labels: { zh: "照片级写实", en: "PHOTOREALISTIC" } },
    { value: "POST APOCALYPTIC", labels: { zh: "后启示录", en: "POST APOCALYPTIC" } },
    { value: "ROBOT", labels: { zh: "机器人", en: "ROBOT" } },
    { value: "SCI-FI", labels: { zh: "科幻", en: "SCI-FI" } },
    { value: "SPORTS CAR", labels: { zh: "跑车", en: "SPORTS CAR" } },
    { value: "SWIMWEAR", labels: { zh: "泳装", en: "SWIMWEAR" } },
    { value: "TRANSPORTATION", labels: { zh: "交通工具", en: "TRANSPORTATION" } },
    { value: "WOMAN", labels: { zh: "女性", en: "WOMAN" } },
];


export const TAG_FILTER_OPTIONS = TAG_FILTER_OPTION_DEFS.map((option) => ({
    value: option.value,
    label: option.labels.en,
}));


const KNOWN_TAGS = new Set(TAG_FILTER_OPTIONS.map((option) => option.value));


export function buildTagFilterOptions(language) {
    const normalizedLanguage = String(language || "").toLowerCase().startsWith("zh") ? "zh" : "en";
    return TAG_FILTER_OPTION_DEFS.map((option) => ({
        value: option.value,
        label: option.labels[normalizedLanguage] || option.labels.en,
    }));
}


export function normalizeSelectedTags(values) {
    const sourceValues = Array.isArray(values) ? values : String(values || "").split(",");
    const normalized = [];
    const seen = new Set();
    for (const value of sourceValues) {
        const normalizedValue = String(value || "").trim().toUpperCase();
        if (!normalizedValue || !KNOWN_TAGS.has(normalizedValue) || seen.has(normalizedValue)) {
            continue;
        }
        seen.add(normalizedValue);
        normalized.push(normalizedValue);
    }
    return normalized;
}


export function toggleTagSelection(currentValues, value) {
    const normalizedCurrent = normalizeSelectedTags(currentValues);
    const normalizedValue = normalizeSelectedTags([value])[0] || "";
    if (!normalizedValue) {
        return normalizedCurrent;
    }
    if (normalizedCurrent.includes(normalizedValue)) {
        return normalizedCurrent.filter((currentValue) => currentValue !== normalizedValue);
    }
    return [...normalizedCurrent, normalizedValue];
}
