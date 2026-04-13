export function createRequestControlState() {
    return {
        loading: false,
        pendingReset: false,
    };
}


export function markResetRequestedWhileLoading(state) {
    if (!state || !state.loading) {
        return { abortRequested: false };
    }
    state.pendingReset = true;
    return { abortRequested: true };
}


export function shouldAbortActiveLoadForReset(state) {
    return Boolean(state?.loading && state?.pendingReset);
}
