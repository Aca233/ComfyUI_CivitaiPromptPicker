export const GRID_MIN_CARD_WIDTH = 110;
export const GRID_GAP = 8;
export const MIN_PREFILL_ROWS = 2;
export const PREFILL_SCROLL_THRESHOLD = 24;


function toPositiveNumber(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
}


export function computePrefillItemTarget(gridWidth, gridHeight) {
    const width = toPositiveNumber(gridWidth, GRID_MIN_CARD_WIDTH);
    const height = toPositiveNumber(gridHeight, 0);
    const columns = Math.max(1, Math.floor((width + GRID_GAP) / (GRID_MIN_CARD_WIDTH + GRID_GAP)));
    const rows = height >= 180 ? MIN_PREFILL_ROWS : 1;
    return columns * rows;
}


export function shouldPrefillMore({ gridWidth, gridHeight, scrollHeight, itemCount }) {
    const height = toPositiveNumber(gridHeight, 0);
    const scroll = toPositiveNumber(scrollHeight, 0);
    const items = Math.max(0, Number(itemCount) || 0);
    const target = computePrefillItemTarget(gridWidth, gridHeight);

    if (items < target) {
        return true;
    }

    if (!height || !scroll) {
        return false;
    }

    return scroll <= height + PREFILL_SCROLL_THRESHOLD;
}


export function shouldDeferPrefillAfterFirstBatch({
    isReset,
    appendedCount,
    hasMore,
    needsViewportPrefill,
}) {
    return Boolean(isReset && appendedCount > 0 && hasMore && needsViewportPrefill);
}
