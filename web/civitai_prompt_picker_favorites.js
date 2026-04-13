const FAVORITE_KEYS = [
    "id",
    "prompt",
    "negative_prompt",
    "thumbnail_url",
    "image_url",
    "size_text",
    "width_text",
    "height_text",
    "width",
    "height",
    "has_metadata",
    "base_model",
    "nsfw",
    "nsfw_level",
    "model_version_ids",
];


function toText(value) {
    return value == null ? "" : String(value);
}


function toInt(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.trunc(value);
    }
    const text = toText(value).trim();
    if (!text) {
        return 0;
    }
    const parsed = Number.parseInt(text, 10);
    return Number.isFinite(parsed) ? parsed : 0;
}


function normalizeFavoriteItem(item, savedAt = Date.now()) {
    const id = toText(item?.id).trim();
    if (!id) {
        return null;
    }

    return {
        id,
        prompt: toText(item?.prompt),
        negative_prompt: toText(item?.negative_prompt),
        thumbnail_url: toText(item?.thumbnail_url),
        image_url: toText(item?.image_url),
        size_text: toText(item?.size_text),
        width_text: toText(item?.width_text),
        height_text: toText(item?.height_text),
        width: toInt(item?.width),
        height: toInt(item?.height),
        has_metadata: Boolean(item?.has_metadata),
        base_model: toText(item?.base_model),
        nsfw: Boolean(item?.nsfw),
        nsfw_level: toText(item?.nsfw_level),
        model_version_ids: Array.isArray(item?.model_version_ids)
            ? item.model_version_ids.map((value) => toText(value)).filter(Boolean)
            : [],
        saved_at: toInt(savedAt),
    };
}


export function parseFavorites(rawValue) {
    if (!rawValue) {
        return [];
    }

    try {
        const parsed = JSON.parse(rawValue);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((item) => normalizeFavoriteItem(item, item?.saved_at))
            .filter(Boolean)
            .sort((left, right) => right.saved_at - left.saved_at);
    } catch {
        return [];
    }
}


export function serializeFavorites(items) {
    return JSON.stringify(
        (Array.isArray(items) ? items : [])
            .map((item) => normalizeFavoriteItem(item, item?.saved_at))
            .filter(Boolean)
    );
}


export function hasFavorite(items, imageId) {
    const wantedId = toText(imageId).trim();
    return Array.isArray(items) && Boolean(wantedId) && items.some((item) => item?.id === wantedId);
}


export function upsertFavorite(items, item, savedAt = Date.now()) {
    const normalized = normalizeFavoriteItem(item, savedAt);
    if (!normalized) {
        return Array.isArray(items) ? [...items] : [];
    }

    const next = (Array.isArray(items) ? items : []).filter((entry) => entry?.id !== normalized.id);
    next.unshift(normalized);
    return next;
}


export function removeFavorite(items, imageId) {
    const wantedId = toText(imageId).trim();
    if (!wantedId || !Array.isArray(items)) {
        return Array.isArray(items) ? [...items] : [];
    }
    return items.filter((item) => item?.id !== wantedId);
}


export { FAVORITE_KEYS, normalizeFavoriteItem };
