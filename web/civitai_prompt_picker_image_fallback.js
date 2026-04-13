function normalizeUrl(value) {
    return String(value || "").trim();
}


export function buildImageFallbackChain(item) {
    const candidates = [
        normalizeUrl(item?.thumbnail_url),
        normalizeUrl(item?.image_url),
    ];
    const unique = [];
    for (const candidate of candidates) {
        if (!candidate || unique.includes(candidate)) {
            continue;
        }
        unique.push(candidate);
    }
    return unique;
}
