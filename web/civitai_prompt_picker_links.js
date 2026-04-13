export function buildCivitaiImagePageUrl(imageId) {
    const normalizedId = String(imageId || "").trim();
    if (!normalizedId) {
        return "";
    }
    return `https://civitai.com/images/${encodeURIComponent(normalizedId)}`;
}
