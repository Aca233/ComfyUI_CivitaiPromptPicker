function normalizeViewMode(viewMode) {
    return viewMode === "favorites" ? "favorites" : "feed";
}


export function createViewCacheState() {
    return {
        currentMode: "feed",
        dirtyByMode: {
            feed: true,
            favorites: true,
        },
        hydratedByMode: {
            feed: false,
            favorites: false,
        },
        scrollTopByMode: {
            feed: 0,
            favorites: 0,
        },
    };
}


export function rememberViewScrollTop(state, viewMode, scrollTop) {
    const mode = normalizeViewMode(viewMode);
    state.scrollTopByMode[mode] = Math.max(0, Number(scrollTop || 0));
    return state;
}


export function markViewHydrated(state, viewMode) {
    const mode = normalizeViewMode(viewMode);
    state.hydratedByMode[mode] = true;
    state.dirtyByMode[mode] = false;
    return state;
}


export function markViewDirty(state, viewMode) {
    const mode = normalizeViewMode(viewMode);
    state.dirtyByMode[mode] = true;
    return state;
}


export function shouldHydrateView(state, viewMode) {
    const mode = normalizeViewMode(viewMode);
    return !state.hydratedByMode[mode] || state.dirtyByMode[mode];
}


export function switchViewMode(state, nextMode, currentScrollTop = 0) {
    rememberViewScrollTop(state, state.currentMode, currentScrollTop);
    state.currentMode = normalizeViewMode(nextMode);
    return state;
}
