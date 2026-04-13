import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
import {
    buildAspectRatioOptions,
    buildBaseModelOptions,
    buildNsfwOptions,
    buildPeriodOptions,
    buildResolutionOptions,
    buildSortOptions,
    resolveUiLanguage,
    translate,
} from "./civitai_prompt_picker_i18n.js";
import {
    hasFavorite,
    parseFavorites,
    removeFavorite,
    serializeFavorites,
    upsertFavorite,
} from "./civitai_prompt_picker_favorites.js";
import { buildImageFallbackChain } from "./civitai_prompt_picker_image_fallback.js";
import { buildCivitaiImagePageUrl } from "./civitai_prompt_picker_links.js";
import {
    buildTagFilterOptions,
    normalizeSelectedTags,
    toggleTagSelection,
} from "./civitai_prompt_picker_tags.js";
import {
    shouldDeferPrefillAfterFirstBatch,
    shouldPrefillMore,
    shouldScheduleViewportPrefill,
} from "./civitai_prompt_picker_prefill.js";
import {
    createViewCacheState,
    markViewDirty,
    markViewHydrated,
    rememberViewScrollTop,
    shouldHydrateView,
    switchViewMode,
} from "./civitai_prompt_picker_view_cache.js";
import {
    createRequestControlState,
    markResetRequestedWhileLoading,
    shouldAbortActiveLoadForReset,
} from "./civitai_prompt_picker_request_control.js";


const EXTENSION_NAME = "Comfy.CivitaiPromptPicker";
const NODE_NAME = "Civitai Prompt Picker";
const STYLE_ID = "civitai-prompt-picker-styles";
const DEFAULT_NODE_SIZE = [520, 560];
const MIN_WIDGET_HEIGHT = 220;
const MAX_WIDGET_HEIGHT = 1800;
const NODE_CHROME_HEIGHT = 122;
const DEFAULT_EMPTY_PAGE_CHAIN_LIMIT = 12;
const FILTERED_EMPTY_PAGE_CHAIN_LIMIT = 40;
const DEFAULT_REQUEST_BATCH_SIZE = 16;
const FILTERED_REQUEST_BATCH_SIZE = 24;
const FILTER_INPUT_DEBOUNCE_MS = 350;
const MODEL_SEARCH_DEBOUNCE_MS = 220;
const MODEL_SEARCH_RESULT_LIMIT = 8;
const BASE_MODEL_CUSTOM_VALUE = "__custom__";
const STORAGE_KEYS = {
    apiKey: "comfy.civitaiPromptPicker.apiKey",
    favorites: "comfy.civitaiPromptPicker.favorites",
    nsfw: "comfy.civitaiPromptPicker.nsfw",
};
const OUTPUT_SCHEMA = [
    { name: "prompt", type: "STRING" },
    { name: "negative_prompt", type: "STRING" },
    { name: "width", type: "INT" },
    { name: "height", type: "INT" },
    { name: "image", type: "IMAGE" },
];
const BASE_MODEL_SUGGESTIONS = [
    "Pony",
    "SDXL",
    "SDXL Turbo",
    "SDXL Lightning",
    "Flux",
    "SD 1.5",
    "SD 2.0",
    "SD 2.1",
    "SD 3",
    "SD 3.5",
    "Illustrious",
    "NoobAI",
    "HiDream",
    "Hunyuan",
    "Hunyuan Video",
    "PixArt a",
    "Playground v2",
    "Stable Cascade",
    "Kolors",
    "Lumina",
    "Wan",
    "Wan Video",
    "Cosmos",
];


function ensureStyles() {
    if (document.getElementById(STYLE_ID)) {
        return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .civitai-picker {
            --civitai-preview-height: 150px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: 100%;
            height: 100%;
            min-height: 0;
            overflow: hidden;
            padding: 8px;
            box-sizing: border-box;
            color: #e8eef7;
            font-family: system-ui, sans-serif;
        }
        .civitai-picker-toolbar {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 8px;
            flex: 0 0 auto;
        }
        .civitai-picker-field {
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 0;
        }
        .civitai-picker-field label {
            font-size: 11px;
            color: rgba(232, 238, 247, 0.72);
        }
        .civitai-picker-tags-section {
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-width: 0;
        }
        .civitai-picker-tags-label {
            font-size: 11px;
            color: rgba(232, 238, 247, 0.72);
        }
        .civitai-picker-tag-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            align-items: flex-start;
        }
        .civitai-picker-tag-chip {
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: rgba(27, 33, 43, 0.94);
            color: rgba(247, 251, 255, 0.88);
            border-radius: 999px;
            padding: 4px 9px;
            font-size: 11px;
            line-height: 1.2;
            cursor: pointer;
        }
        .civitai-picker-tag-chip.is-active {
            border-color: rgba(86, 184, 255, 0.85);
            background: rgba(18, 53, 82, 0.96);
            color: #f7fbff;
        }
        .civitai-picker-tag-chip:disabled {
            opacity: 0.5;
            cursor: default;
        }
        .civitai-picker-input,
        .civitai-picker-select {
            width: 100%;
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: rgba(17, 22, 30, 0.96);
            color: #f7fbff;
            border-radius: 8px;
            padding: 7px 9px;
            font-size: 12px;
            box-sizing: border-box;
        }
        .civitai-picker-toggle {
            display: flex;
            align-items: center;
            gap: 6px;
            min-height: 34px;
            font-size: 12px;
            padding-top: 18px;
            color: rgba(232, 238, 247, 0.88);
        }
        .civitai-picker-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
            flex: 0 0 auto;
        }
        .civitai-picker-status {
            flex: 1 1 240px;
            font-size: 12px;
            color: rgba(232, 238, 247, 0.78);
            min-height: 18px;
        }
        .civitai-picker-button {
            border: 1px solid rgba(255, 255, 255, 0.16);
            background: rgba(36, 42, 52, 0.96);
            color: #f5f8ff;
            border-radius: 8px;
            padding: 7px 12px;
            font-size: 12px;
            cursor: pointer;
        }
        .civitai-picker-button:disabled {
            opacity: 0.45;
            cursor: default;
        }
        .civitai-picker-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
            gap: 8px;
            flex: 1 1 auto;
            min-height: 120px;
            max-height: none;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 4px;
            align-content: start;
            align-items: start;
        }
        .civitai-picker-grid[hidden],
        .civitai-picker-loader[hidden] {
            display: none !important;
        }
        .civitai-picker-card {
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(18, 24, 33, 0.96);
            border-radius: 12px;
            padding: 6px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-width: 0;
            cursor: pointer;
            position: relative;
            text-align: left;
            transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
        }
        .civitai-picker-card:hover {
            transform: translateY(-1px);
            border-color: rgba(118, 200, 255, 0.46);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
        }
        .civitai-picker-card:focus-visible {
            outline: 1px solid rgba(86, 184, 255, 0.88);
            outline-offset: 1px;
        }
        .civitai-picker-card.is-selected {
            border-color: rgba(86, 184, 255, 0.92);
            box-shadow: 0 0 0 1px rgba(86, 184, 255, 0.65);
        }
        .civitai-picker-card-media {
            position: relative;
        }
        .civitai-picker-image {
            display: block;
            width: 100%;
            height: auto;
            object-fit: contain;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.06);
        }
        .civitai-picker-favorite {
            position: absolute;
            top: 6px;
            right: 6px;
            width: 28px;
            height: 28px;
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.16);
            background: rgba(13, 17, 24, 0.86);
            color: rgba(255, 255, 255, 0.78);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 15px;
            line-height: 1;
            padding: 0;
            z-index: 2;
        }
        .civitai-picker-favorite.is-active {
            color: #ffd45c;
            border-color: rgba(255, 212, 92, 0.46);
            background: rgba(52, 41, 0, 0.88);
        }
        .civitai-picker-favorite:hover {
            border-color: rgba(255, 255, 255, 0.32);
        }
        .civitai-picker-card-id,
        .civitai-picker-card-meta {
            font-size: 11px;
            color: rgba(232, 238, 247, 0.72);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .civitai-picker-empty,
        .civitai-picker-loader {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 120px;
            border: 1px dashed rgba(255, 255, 255, 0.18);
            border-radius: 12px;
            color: rgba(232, 238, 247, 0.68);
            font-size: 13px;
            text-align: center;
            padding: 20px;
            box-sizing: border-box;
        }
        .civitai-picker-loader {
            min-height: 52px;
            flex: 0 0 auto;
        }
        .civitai-picker-preview-label {
            font-size: 12px;
            color: rgba(232, 238, 247, 0.82);
            flex: 0 0 auto;
        }
        .civitai-picker-preview {
            width: 100%;
            height: var(--civitai-preview-height);
            min-height: 110px;
            resize: none;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(10, 14, 20, 0.92);
            color: #f7fbff;
            padding: 10px;
            line-height: 1.45;
            font-size: 12px;
            box-sizing: border-box;
            flex: 0 0 auto;
        }
    `;
    document.head.appendChild(style);
}


function chainCallback(target, property, callback) {
    const original = target[property];
    target[property] = function chainedCallback() {
        const result = original?.apply(this, arguments);
        callback.apply(this, arguments);
        return result;
    };
}


function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}


function createAbortError() {
    if (typeof DOMException !== "undefined") {
        return new DOMException("Request aborted", "AbortError");
    }
    const error = new Error("Request aborted");
    error.name = "AbortError";
    return error;
}


function isAbortError(error) {
    return error?.name === "AbortError";
}


function computeLayoutMetrics(nodeSize) {
    const width = Math.max(DEFAULT_NODE_SIZE[0], Number(nodeSize?.[0] || DEFAULT_NODE_SIZE[0]));
    const rawHeight = Number(nodeSize?.[1] || DEFAULT_NODE_SIZE[1]);
    const widgetHeight = clamp(rawHeight - NODE_CHROME_HEIGHT, MIN_WIDGET_HEIGHT, MAX_WIDGET_HEIGHT);
    const previewHeight = clamp(Math.round(widgetHeight * 0.14), 64, 112);
    return {
        width,
        widgetHeight,
        previewHeight,
    };
}


function readStoredValue(key) {
    try {
        return window.localStorage?.getItem(key) || "";
    } catch {
        return "";
    }
}


function writeStoredValue(key, value) {
    try {
        if (!value) {
            window.localStorage?.removeItem(key);
        } else {
            window.localStorage?.setItem(key, value);
        }
    } catch {
        // Ignore storage failures in embedded browsers.
    }
}


function readStoredFavorites() {
    return parseFavorites(readStoredValue(STORAGE_KEYS.favorites));
}


function writeStoredFavorites(items) {
    writeStoredValue(
        STORAGE_KEYS.favorites,
        Array.isArray(items) && items.length ? serializeFavorites(items) : ""
    );
}


function findWidget(node, name) {
    return node.widgets?.find((widget) => widget.name === name);
}


function hideWidget(widget) {
    if (!widget) {
        return;
    }
    widget.hidden = true;
    widget.computeSize = () => [0, -4];
}


function normalizeOutputType(type) {
    return String(type || "").trim().toUpperCase();
}


function ensureExpectedOutputs(node) {
    const existingOutputs = Array.isArray(node.outputs) ? [...node.outputs] : [];
    const usedIndexes = new Set();
    const nextOutputs = OUTPUT_SCHEMA.map(({ name, type }) => {
        let index = existingOutputs.findIndex((output, outputIndex) =>
            !usedIndexes.has(outputIndex) &&
            output?.name === name &&
            normalizeOutputType(output?.type) === type
        );

        if (index < 0) {
            index = existingOutputs.findIndex((output, outputIndex) =>
                !usedIndexes.has(outputIndex) && output?.name === name
            );
        }

        const existing = index >= 0 ? existingOutputs[index] : null;
        if (index >= 0) {
            usedIndexes.add(index);
        }

        return {
            ...(existing || {}),
            name,
            type,
        };
    });

    const changed =
        nextOutputs.length !== existingOutputs.length ||
        nextOutputs.some((output, index) => {
            const current = existingOutputs[index];
            return !current || current.name !== output.name || normalizeOutputType(current.type) !== output.type;
        });

    if (changed) {
        node.outputs = nextOutputs;
    }
}


function migrateLegacyNodeSize(node) {
    node.properties = node.properties || {};
    const version = Number(node.properties.civitaiPromptPickerUiVersion || 0);
    const currentWidth = Math.max(DEFAULT_NODE_SIZE[0], Number(node.size?.[0] || DEFAULT_NODE_SIZE[0]));
    const currentHeight = Number(node.size?.[1] || DEFAULT_NODE_SIZE[1]);
    if (version < 2 && currentHeight > DEFAULT_NODE_SIZE[1]) {
        node.setSize?.([currentWidth, DEFAULT_NODE_SIZE[1]]);
    }
    node.properties.civitaiPromptPickerUiVersion = 2;
}


function buildEndpoint(limit, nextPage, filters) {
    const params = new URLSearchParams();
    params.set("limit", String(limit || 12));
    if (nextPage) {
        params.set("next_page", nextPage);
    }
    if (filters.period) {
        params.set("period", filters.period);
    }
    if (filters.baseModel) {
        params.set("base_model", filters.baseModel);
    }
    if (filters.metadataOnly) {
        params.set("metadata_only", "true");
    }
    if (filters.modelId) {
        params.set("model_id", filters.modelId);
    }
    if (filters.modelVersionId) {
        params.set("model_version_id", filters.modelVersionId);
    }
    if (filters.nsfw) {
        params.set("nsfw", filters.nsfw);
    }
    if (filters.sort) {
        params.set("sort", filters.sort);
    }
    if (filters.aspectRatio) {
        params.set("aspect_ratio", filters.aspectRatio);
    }
    if (filters.minResolution) {
        params.set("min_resolution", filters.minResolution);
    }
    if (filters.tags?.length) {
        params.set("tags", filters.tags.join(","));
    }
    if (filters.blockTags?.length) {
        params.set("block_tags", filters.blockTags.join(","));
    }
    return `/civitai-prompt-picker/images?${params.toString()}`;
}


function buildModelSearchEndpoint(query, limit = MODEL_SEARCH_RESULT_LIMIT) {
    const params = new URLSearchParams();
    params.set("limit", String(limit || MODEL_SEARCH_RESULT_LIMIT));
    params.set("query", String(query || "").trim());
    return `/civitai-prompt-picker/models?${params.toString()}`;
}


function normalizeLookupText(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}


function makeSelect(options) {
    const select = document.createElement("select");
    select.className = "civitai-picker-select";
    for (const option of options) {
        const element = document.createElement("option");
        element.value = option.value;
        element.textContent = option.label;
        select.appendChild(element);
    }
    return select;
}


function makeField(labelText, inputElement) {
    const field = document.createElement("div");
    field.className = "civitai-picker-field";
    const label = document.createElement("label");
    label.textContent = labelText;
    field.append(label, inputElement);
    return field;
}


function createEmptyElement(message) {
    const empty = document.createElement("div");
    empty.className = "civitai-picker-empty";
    empty.textContent = message;
    return empty;
}


function describeEmptyReason(t, diagnostics, filters) {
    const reason = diagnostics?.empty_reason || "";
    switch (reason) {
    case "metadata_only_filtered_all":
        return t("noMetadataAvailable");
    case "no_public_model_version_images":
        return filters.modelVersionId
            ? t("noPublicModelVersionImages", { modelVersionId: filters.modelVersionId })
            : t("noCurrentModelVersionImages");
    case "no_public_model_images":
        return filters.modelId
            ? t("noPublicModelImages", { modelId: filters.modelId })
            : t("noCurrentModelImages");
    case "no_images_for_filters":
        return t("noImagesForFilters");
    case "filtered_out_by_combination":
        return t("filteredOutByCombination");
    case "no_images_returned":
        return t("noImagesReturned");
    default:
        return "";
    }
}


class CivitaiPromptPickerUI {
    constructor(node, element) {
        this.node = node;
        this.element = element;
        this.language = resolveUiLanguage(window.navigator?.language || window.navigator?.languages?.[0]);
        this.t = (key, params) => translate(this.language, key, params);
        this.layout = computeLayoutMetrics(node.size);
        this.state = {
            items: [],
            favorites: readStoredFavorites(),
            loading: false,
            selectedId: "",
            nextPage: "",
            hasMore: true,
            viewMode: "feed",
            filters: {
                period: "",
                baseModel: "",
                metadataOnly: true,
                modelId: "",
                modelVersionId: "",
                nsfw: "",
                sort: "",
                aspectRatio: "",
                minResolution: "",
                tags: [],
                blockTags: [],
            },
        };
        this.loadingMore = false;
        this.scrollTicking = false;
        this.reloadTimer = null;
        this.requestControl = createRequestControlState();
        this.activeAbortController = null;
        this.activeLoadToken = 0;
        this.baseModelSearchTimer = null;
        this.baseModelSearchAbortController = null;
        this.baseModelSearchToken = 0;
        this.baseModelSearchResults = [];
        this.autoResolvedModelSuggestion = null;
        this.deferredPrefillRequested = false;
        this.viewportPrefillScheduled = false;
        this.cardElementsByMode = {
            feed: new Map(),
            favorites: new Map(),
        };
        this.favoriteElements = new Map();
        this.lastSelectedCardByMode = {
            feed: null,
            favorites: null,
        };
        this.lastDiagnostics = null;
        this.baseModelValues = new Set(BASE_MODEL_SUGGESTIONS);
        this.viewCacheState = createViewCacheState();

        this.promptWidget = findWidget(node, "selected_prompt");
        this.negativePromptWidget = findWidget(node, "selected_negative_prompt");
        this.widthTextWidget = findWidget(node, "selected_width_text");
        this.heightTextWidget = findWidget(node, "selected_height_text");
        this.imageIdWidget = findWidget(node, "selected_image_id");
        this.nextPageWidget = findWidget(node, "next_page");
        this.imageUrlWidget = findWidget(node, "selected_image_url");
        this.limitWidget = findWidget(node, "limit");

        this.renderShell();
        this.rememberBaseModels(this.state.favorites);
        this.syncFromWidgets();
        this.attachWidgetCallbacks();
        this.syncLayout();
        this.loadImages(true);
    }

    renderShell() {
        this.element.replaceChildren();
        this.element.style.width = "100%";
        this.element.style.height = "100%";
        this.element.style.display = "flex";
        this.element.style.minHeight = "0";

        this.root = document.createElement("div");
        this.root.className = "civitai-picker";

        this.periodSelect = makeSelect(buildPeriodOptions(this.language));
        this.sortSelect = makeSelect(buildSortOptions(this.language));
        this.nsfwSelect = makeSelect(buildNsfwOptions(this.language));
        this.aspectRatioSelect = makeSelect(buildAspectRatioOptions(this.language));
        this.resolutionSelect = makeSelect(buildResolutionOptions(this.language));
        this.nsfwSelect.value = readStoredValue(STORAGE_KEYS.nsfw);

        this.baseModelSelect = makeSelect(
            buildBaseModelOptions(BASE_MODEL_SUGGESTIONS, this.language, BASE_MODEL_CUSTOM_VALUE)
        );
        this.baseModelInput = document.createElement("input");
        this.baseModelInput.className = "civitai-picker-input";
        this.baseModelInput.placeholder = this.t("baseModelPlaceholder");
        this.baseModelInput.autocomplete = "off";
        this.baseModelInput.spellcheck = false;
        this.baseModelInput.hidden = true;
        this.baseModelSuggestionsEl = document.createElement("datalist");
        this.baseModelSuggestionsEl.id = `civitai-picker-model-search-${String(this.node?.id || "node")}`;
        this.baseModelInput.setAttribute("list", this.baseModelSuggestionsEl.id);

        const baseModelField = document.createElement("div");
        baseModelField.className = "civitai-picker-field";
        const baseModelLabel = document.createElement("label");
        baseModelLabel.textContent = this.t("baseModelLabel");
        baseModelField.append(
            baseModelLabel,
            this.baseModelSelect,
            this.baseModelInput,
            this.baseModelSuggestionsEl
        );

        this.modelIdInput = document.createElement("input");
        this.modelIdInput.className = "civitai-picker-input";
        this.modelIdInput.placeholder = this.t("modelIdPlaceholder");

        this.modelVersionIdInput = document.createElement("input");
        this.modelVersionIdInput.className = "civitai-picker-input";
        this.modelVersionIdInput.placeholder = this.t("modelVersionIdPlaceholder");

        this.apiKeyInput = document.createElement("input");
        this.apiKeyInput.type = "password";
        this.apiKeyInput.className = "civitai-picker-input";
        this.apiKeyInput.placeholder = this.t("apiKeyPlaceholder");
        this.apiKeyInput.value = readStoredValue(STORAGE_KEYS.apiKey);

        this.metadataOnlyInput = document.createElement("input");
        this.metadataOnlyInput.type = "checkbox";
        this.metadataOnlyInput.checked = true;

        const toggleWrap = document.createElement("label");
        toggleWrap.className = "civitai-picker-toggle";
        toggleWrap.append(
            this.metadataOnlyInput,
            document.createTextNode(this.t("metadataOnlyToggle")),
        );

        const toolbar = document.createElement("div");
        toolbar.className = "civitai-picker-toolbar";
        toolbar.append(
            makeField(this.t("periodLabel"), this.periodSelect),
            makeField(this.t("sortLabel"), this.sortSelect),
            makeField(this.t("nsfwLabel"), this.nsfwSelect),
            makeField(this.t("aspectRatioLabel"), this.aspectRatioSelect),
            makeField(this.t("resolutionLabel"), this.resolutionSelect),
            baseModelField,
            makeField(this.t("modelIdLabel"), this.modelIdInput),
            makeField(this.t("modelVersionIdLabel"), this.modelVersionIdInput),
            makeField(this.t("apiKeyLabel"), this.apiKeyInput),
            toggleWrap,
        );

        const tagsSection = document.createElement("div");
        tagsSection.className = "civitai-picker-tags-section";
        const tagsLabel = document.createElement("div");
        tagsLabel.className = "civitai-picker-tags-label";
        tagsLabel.textContent = this.t("tagsLabel");
        this.tagBarEl = document.createElement("div");
        this.tagBarEl.className = "civitai-picker-tag-bar";
        this.tagButtons = new Map();
        for (const option of buildTagFilterOptions(this.language)) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "civitai-picker-tag-chip";
            button.textContent = option.label;
            button.addEventListener("click", () => this.toggleTagFilter(option.value));
            this.tagButtons.set(option.value, button);
            this.tagBarEl.appendChild(button);
        }
        const blockTagsLabel = document.createElement("div");
        blockTagsLabel.className = "civitai-picker-tags-label";
        blockTagsLabel.textContent = this.t("blockTagsLabel");
        this.blockTagBarEl = document.createElement("div");
        this.blockTagBarEl.className = "civitai-picker-tag-bar";
        this.blockTagButtons = new Map();
        for (const option of buildTagFilterOptions(this.language)) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "civitai-picker-tag-chip";
            button.textContent = option.label;
            button.addEventListener("click", () => this.toggleBlockTagFilter(option.value));
            this.blockTagButtons.set(option.value, button);
            this.blockTagBarEl.appendChild(button);
        }
        tagsSection.append(tagsLabel, this.tagBarEl, blockTagsLabel, this.blockTagBarEl);

        const actions = document.createElement("div");
        actions.className = "civitai-picker-actions";

        this.statusEl = document.createElement("div");
        this.statusEl.className = "civitai-picker-status";
        this.statusEl.textContent = this.t("readyStatus");

        this.refreshButton = document.createElement("button");
        this.refreshButton.type = "button";
        this.refreshButton.className = "civitai-picker-button";
        this.refreshButton.textContent = this.t("applyFilters");
        this.refreshButton.addEventListener("click", () => this.requestReload({ immediate: true }));

        this.favoritesButton = document.createElement("button");
        this.favoritesButton.type = "button";
        this.favoritesButton.className = "civitai-picker-button";
        this.favoritesButton.addEventListener("click", () => this.toggleViewMode());

        actions.append(this.statusEl, this.refreshButton, this.favoritesButton);

        this.feedGridEl = document.createElement("div");
        this.feedGridEl.className = "civitai-picker-grid";
        this.feedGridEl.addEventListener("scroll", () => this.onGridScroll());

        this.favoritesGridEl = document.createElement("div");
        this.favoritesGridEl.className = "civitai-picker-grid";
        this.favoritesGridEl.hidden = true;

        this.gridEl = this.feedGridEl;

        this.loaderEl = document.createElement("div");
        this.loaderEl.className = "civitai-picker-loader";
        this.loaderEl.textContent = this.t("loadingMore");
        this.loaderEl.hidden = true;

        const previewLabel = document.createElement("div");
        previewLabel.className = "civitai-picker-preview-label";
        previewLabel.textContent = this.t("previewLabel");

        this.previewEl = document.createElement("textarea");
        this.previewEl.className = "civitai-picker-preview";
        this.previewEl.readOnly = true;
        this.previewEl.placeholder = this.t("previewPlaceholder");

        this.root.append(
            toolbar,
            tagsSection,
            actions,
            this.feedGridEl,
            this.favoritesGridEl,
            this.loaderEl,
            previewLabel,
            this.previewEl,
        );
        this.element.appendChild(this.root);
        this.syncTagFilterUi();
        this.syncBlockTagFilterUi();
        this.syncBaseModelControls();
        this.syncViewModeUi();
        this.renderState();
    }

    attachWidgetCallbacks() {
        if (this.limitWidget) {
            const originalCallback = this.limitWidget.callback;
            this.limitWidget.callback = (...args) => {
                originalCallback?.apply(this.limitWidget, args);
                this.requestReload({ immediate: true });
            };
        }

        const triggerReload = () => this.requestReload({ immediate: true });
        const scheduleReload = () => this.requestReload();
        const triggerReloadOnEnter = (event) => {
            if (event.key === "Enter") {
                triggerReload();
            }
        };

        this.periodSelect.addEventListener("change", triggerReload);
        this.sortSelect.addEventListener("change", triggerReload);
        this.aspectRatioSelect.addEventListener("change", triggerReload);
        this.resolutionSelect.addEventListener("change", triggerReload);
        this.nsfwSelect.addEventListener("change", () => {
            writeStoredValue(STORAGE_KEYS.nsfw, this.nsfwSelect.value);
            triggerReload();
        });
        this.baseModelSelect.addEventListener("change", () => {
            this.syncBaseModelControls();
            triggerReload();
        });
        this.baseModelInput.addEventListener("input", () => {
            this.handleBaseModelInputEdit();
            scheduleReload();
        });
        this.baseModelInput.addEventListener("change", async () => {
            await this.commitBaseModelInputSelection();
            triggerReload();
        });
        this.baseModelInput.addEventListener("keydown", async (event) => {
            if (event.key !== "Enter") {
                return;
            }
            event.preventDefault();
            await this.commitBaseModelInputSelection();
            triggerReload();
        });
        this.metadataOnlyInput.addEventListener("change", triggerReload);
        this.modelIdInput.addEventListener("input", () => {
            this.autoResolvedModelSuggestion = null;
            scheduleReload();
        });
        this.modelVersionIdInput.addEventListener("input", () => {
            this.autoResolvedModelSuggestion = null;
            scheduleReload();
        });
        this.apiKeyInput.addEventListener("input", () => {
            writeStoredValue(STORAGE_KEYS.apiKey, this.apiKeyInput.value.trim());
            scheduleReload();
        });
        this.modelIdInput.addEventListener("change", () => {
            this.autoResolvedModelSuggestion = null;
            triggerReload();
        });
        this.modelVersionIdInput.addEventListener("change", () => {
            this.autoResolvedModelSuggestion = null;
            triggerReload();
        });
        this.apiKeyInput.addEventListener("change", () => {
            writeStoredValue(STORAGE_KEYS.apiKey, this.apiKeyInput.value.trim());
            triggerReload();
        });
        this.modelIdInput.addEventListener("keydown", triggerReloadOnEnter);
        this.modelVersionIdInput.addEventListener("keydown", triggerReloadOnEnter);
        this.apiKeyInput.addEventListener("keydown", triggerReloadOnEnter);
    }

    requestReload({ immediate = false } = {}) {
        if (this.isFavoritesView()) {
            return;
        }

        if (this.reloadTimer) {
            window.clearTimeout(this.reloadTimer);
            this.reloadTimer = null;
        }

        if (immediate) {
            const { abortRequested } = markResetRequestedWhileLoading(this.requestControl);
            if (abortRequested) {
                this.activeAbortController?.abort();
                this.setStatus(this.t("loadingByFilters"));
                return;
            }
            this.loadImages(true);
            return;
        }

        this.reloadTimer = window.setTimeout(() => {
            this.reloadTimer = null;
            this.requestReload({ immediate: true });
        }, FILTER_INPUT_DEBOUNCE_MS);
    }

    isCustomBaseModelMode() {
        return this.baseModelSelect.value === BASE_MODEL_CUSTOM_VALUE;
    }

    renderBaseModelSearchSuggestions() {
        this.baseModelSuggestionsEl.replaceChildren();
        for (const item of this.baseModelSearchResults) {
            const option = document.createElement("option");
            option.value = item.name || item.label || "";
            option.label = item.label || item.name || "";
            this.baseModelSuggestionsEl.appendChild(option);
        }
    }

    clearAutoResolvedModelSuggestion() {
        if (!this.autoResolvedModelSuggestion) {
            return;
        }

        if (this.modelVersionIdInput?.value?.trim() === this.autoResolvedModelSuggestion.modelVersionId) {
            this.modelVersionIdInput.value = "";
        }
        this.autoResolvedModelSuggestion = null;
    }

    resetBaseModelSearchState({ clearResolved = true } = {}) {
        if (this.baseModelSearchTimer) {
            window.clearTimeout(this.baseModelSearchTimer);
            this.baseModelSearchTimer = null;
        }
        this.baseModelSearchAbortController?.abort?.();
        this.baseModelSearchAbortController = null;
        this.baseModelSearchResults = [];
        this.renderBaseModelSearchSuggestions();
        if (clearResolved) {
            this.clearAutoResolvedModelSuggestion();
        }
    }

    handleBaseModelInputEdit() {
        if (!this.isCustomBaseModelMode()) {
            return;
        }

        const query = this.baseModelInput.value.trim();
        const lastResolvedName = this.autoResolvedModelSuggestion?.name || "";
        if (lastResolvedName && normalizeLookupText(query) !== normalizeLookupText(lastResolvedName)) {
            this.clearAutoResolvedModelSuggestion();
        }
        this.scheduleBaseModelSearch();
    }

    scheduleBaseModelSearch() {
        if (!this.isCustomBaseModelMode()) {
            this.resetBaseModelSearchState({ clearResolved: false });
            return;
        }

        if (this.baseModelSearchTimer) {
            window.clearTimeout(this.baseModelSearchTimer);
        }
        this.baseModelSearchTimer = window.setTimeout(() => {
            this.baseModelSearchTimer = null;
            this.loadBaseModelSuggestions({ preferSingle: false, setStatus: false });
        }, MODEL_SEARCH_DEBOUNCE_MS);
    }

    findBaseModelSuggestionMatch(query) {
        const lookup = normalizeLookupText(query);
        if (!lookup) {
            return null;
        }
        return this.baseModelSearchResults.find((item) =>
            normalizeLookupText(item?.name) === lookup ||
            normalizeLookupText(item?.label) === lookup
        ) || null;
    }

    applyAutoResolvedModelSuggestion(item, { setStatus = false } = {}) {
        const modelVersionId = String(item?.model_version_id || "").trim();
        const name = String(item?.name || "").trim();
        const canOverwriteVersion = !this.modelVersionIdInput.value.trim() ||
            this.modelVersionIdInput.value.trim() === (this.autoResolvedModelSuggestion?.modelVersionId || "");
        if (!modelVersionId || !name || !canOverwriteVersion) {
            return null;
        }

        this.modelVersionIdInput.value = modelVersionId;
        this.autoResolvedModelSuggestion = {
            modelVersionId,
            name,
        };
        if (setStatus) {
            this.setStatus(
                this.t("modelSearchResolved", {
                    name,
                    modelVersionId,
                })
            );
        }
        return item;
    }

    async loadBaseModelSuggestions({ query = this.baseModelInput.value.trim(), preferSingle = false, setStatus = false } = {}) {
        if (!this.isCustomBaseModelMode()) {
            this.resetBaseModelSearchState({ clearResolved: false });
            return [];
        }

        const trimmedQuery = String(query || "").trim();
        if (!trimmedQuery || trimmedQuery.length < 2) {
            this.baseModelSearchResults = [];
            this.renderBaseModelSearchSuggestions();
            if (!trimmedQuery) {
                this.clearAutoResolvedModelSuggestion();
            }
            return [];
        }

        this.baseModelSearchAbortController?.abort?.();
        const abortController = typeof AbortController !== "undefined" ? new AbortController() : null;
        this.baseModelSearchAbortController = abortController;
        const searchToken = ++this.baseModelSearchToken;
        const apiKey = this.apiKeyInput.value.trim();

        try {
            const response = await api.fetchApi(
                buildModelSearchEndpoint(trimmedQuery, MODEL_SEARCH_RESULT_LIMIT),
                {
                    cache: "no-store",
                    headers: apiKey ? { "X-Civitai-Api-Key": apiKey } : undefined,
                    signal: abortController?.signal,
                }
            );
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || `HTTP ${response.status}`);
            }
            if (searchToken !== this.baseModelSearchToken) {
                return this.baseModelSearchResults;
            }

            this.baseModelSearchResults = Array.isArray(payload?.items) ? payload.items : [];
            this.renderBaseModelSearchSuggestions();

            const matched = this.findBaseModelSuggestionMatch(trimmedQuery);
            if (matched) {
                this.applyAutoResolvedModelSuggestion(matched, { setStatus });
            } else if (preferSingle && this.baseModelSearchResults.length === 1) {
                this.applyAutoResolvedModelSuggestion(this.baseModelSearchResults[0], { setStatus });
            }

            if (
                setStatus &&
                !matched &&
                !this.autoResolvedModelSuggestion &&
                this.baseModelSearchResults.length > 1
            ) {
                this.setStatus(
                    this.t("modelSearchChooseCandidate", {
                        count: this.baseModelSearchResults.length,
                    })
                );
            }

            return this.baseModelSearchResults;
        } catch (error) {
            if (!isAbortError(error)) {
                this.baseModelSearchResults = [];
                this.renderBaseModelSearchSuggestions();
            }
            return [];
        } finally {
            if (this.baseModelSearchAbortController === abortController) {
                this.baseModelSearchAbortController = null;
            }
        }
    }

    async commitBaseModelInputSelection() {
        await this.loadBaseModelSuggestions({ preferSingle: true, setStatus: true });
    }

    async maybeResolveCustomModelSearch(filters) {
        if (
            !this.isCustomBaseModelMode() ||
            !filters?.baseModel ||
            filters?.modelId ||
            filters?.modelVersionId
        ) {
            return "";
        }

        const suggestions = await this.loadBaseModelSuggestions({
            query: filters.baseModel,
            preferSingle: false,
            setStatus: false,
        });
        if (suggestions.length === 1) {
            const applied = this.applyAutoResolvedModelSuggestion(suggestions[0], { setStatus: true });
            if (applied) {
                this.requestControl.pendingReset = true;
                return "reloading";
            }
        }
        if (suggestions.length > 1) {
            return "candidates";
        }
        return "";
    }

    syncFromWidgets() {
        this.state.selectedId = String(this.imageIdWidget?.value || "");
        this.state.nextPage = String(this.nextPageWidget?.value || "");
        this.previewEl.value = String(this.promptWidget?.value || "");
        this.updateSelectionState();
    }

    getWidgetHeight() {
        return computeLayoutMetrics(this.node.size).widgetHeight;
    }

    syncLayout(size = this.node.size) {
        this.layout = computeLayoutMetrics(size);
        this.element.style.height = `${this.layout.widgetHeight}px`;
        this.root.style.setProperty("--civitai-preview-height", `${this.layout.previewHeight}px`);
        this.markDirty();
        if (!this.deferredPrefillRequested) {
            this.scheduleViewportPrefill();
        }
    }

    renderBaseModelSuggestions() {
        const knownDefaults = new Set(BASE_MODEL_SUGGESTIONS);
        const extras = [...this.baseModelValues]
            .filter((value) => value && !knownDefaults.has(value))
            .sort((left, right) => left.localeCompare(right));
        const currentValue = this.baseModelSelect?.value || "";
        const customValue = this.baseModelInput?.value || "";
        const options = buildBaseModelOptions(
            [...BASE_MODEL_SUGGESTIONS, ...extras],
            this.language,
            BASE_MODEL_CUSTOM_VALUE
        );
        const rebuiltSelect = makeSelect(options);
        rebuiltSelect.addEventListener("change", () => {
            this.syncBaseModelControls();
            this.requestReload({ immediate: true });
        });
        rebuiltSelect.className = this.baseModelSelect.className;

        this.baseModelSelect.replaceWith(rebuiltSelect);
        this.baseModelSelect = rebuiltSelect;

        if (currentValue && options.some((option) => option.value === currentValue)) {
            this.baseModelSelect.value = currentValue;
        } else if (customValue) {
            this.baseModelSelect.value = BASE_MODEL_CUSTOM_VALUE;
        }

        if (this.baseModelInput) {
            this.baseModelInput.value = customValue;
        }
        this.syncBaseModelControls();
    }

    syncBaseModelControls() {
        const customSelected = this.baseModelSelect.value === BASE_MODEL_CUSTOM_VALUE;
        this.baseModelInput.hidden = !customSelected;
        if (!customSelected) {
            this.resetBaseModelSearchState();
        }
    }

    rememberBaseModels(items) {
        let changed = false;
        for (const item of items) {
            const baseModel = String(item?.base_model || "").trim();
            if (baseModel && !this.baseModelValues.has(baseModel)) {
                this.baseModelValues.add(baseModel);
                changed = true;
            }
        }

        if (changed) {
            this.renderBaseModelSuggestions();
        }
    }

    readFilters() {
        const rawBaseModel =
            this.baseModelSelect.value === BASE_MODEL_CUSTOM_VALUE
                ? this.baseModelInput.value.trim()
                : this.baseModelSelect.value;
        const usesAutoResolvedModelVersion = Boolean(
            this.autoResolvedModelSuggestion &&
            this.modelVersionIdInput.value.trim() === this.autoResolvedModelSuggestion.modelVersionId &&
            normalizeLookupText(this.baseModelInput.value) === normalizeLookupText(this.autoResolvedModelSuggestion.name)
        );
        return {
            period: this.periodSelect.value,
            baseModel: usesAutoResolvedModelVersion ? "" : rawBaseModel,
            metadataOnly: this.metadataOnlyInput.checked,
            modelId: this.modelIdInput.value.trim(),
            modelVersionId: this.modelVersionIdInput.value.trim(),
            nsfw: this.nsfwSelect.value,
            sort: this.sortSelect.value,
            aspectRatio: this.aspectRatioSelect.value,
            minResolution: this.resolutionSelect.value,
            tags: normalizeSelectedTags(this.state.filters.tags),
            blockTags: normalizeSelectedTags(this.state.filters.blockTags),
        };
    }

    toggleTagFilter(value) {
        this.state.filters.tags = toggleTagSelection(this.state.filters.tags, value);
        this.syncTagFilterUi();
        this.requestReload({ immediate: true });
    }

    syncTagFilterUi() {
        const selectedTags = new Set(normalizeSelectedTags(this.state.filters.tags));
        for (const [value, button] of this.tagButtons?.entries?.() || []) {
            if (!button) {
                continue;
            }
            button.classList.toggle("is-active", selectedTags.has(value));
        }
    }

    toggleBlockTagFilter(value) {
        this.state.filters.blockTags = toggleTagSelection(this.state.filters.blockTags, value);
        this.syncBlockTagFilterUi();
        this.requestReload({ immediate: true });
    }

    syncBlockTagFilterUi() {
        const selectedTags = new Set(normalizeSelectedTags(this.state.filters.blockTags));
        for (const [value, button] of this.blockTagButtons?.entries?.() || []) {
            if (!button) {
                continue;
            }
            button.classList.toggle("is-active", selectedTags.has(value));
        }
    }

    isFavoritesView() {
        return this.state.viewMode === "favorites";
    }

    getVisibleItems() {
        return this.isFavoritesView() ? this.state.favorites : this.state.items;
    }

    getGridForView(viewMode = this.state.viewMode) {
        return viewMode === "favorites" ? this.favoritesGridEl : this.feedGridEl;
    }

    getCardMapForView(viewMode = this.state.viewMode) {
        return viewMode === "favorites"
            ? this.cardElementsByMode.favorites
            : this.cardElementsByMode.feed;
    }

    updateFavoritesButtonLabel() {
        if (!this.favoritesButton) {
            return;
        }
        this.favoritesButton.textContent = this.isFavoritesView()
            ? this.t("browseButton")
            : this.t("favoritesButton", { count: this.state.favorites.length });
    }

    syncViewModeUi() {
        const disabled = this.isFavoritesView();
        this.refreshButton.hidden = disabled;
        this.feedGridEl.hidden = disabled;
        this.favoritesGridEl.hidden = !disabled;
        for (const control of [
            this.periodSelect,
            this.sortSelect,
            this.nsfwSelect,
            this.aspectRatioSelect,
            this.resolutionSelect,
            this.baseModelSelect,
            this.baseModelInput,
            this.modelIdInput,
            this.modelVersionIdInput,
            this.apiKeyInput,
            this.metadataOnlyInput,
        ]) {
            if (control) {
                control.disabled = disabled;
            }
        }
        for (const button of this.tagButtons?.values?.() || []) {
            button.disabled = disabled;
        }
        for (const button of this.blockTagButtons?.values?.() || []) {
            button.disabled = disabled;
        }
        this.updateFavoritesButtonLabel();
        this.loaderEl.hidden = disabled || !(this.loadingMore && this.state.items.length > 0);
    }

    restoreFeedStatus() {
        if (this.state.loading) {
            this.setStatus(this.t("loadingByFilters"));
            return;
        }
        if (!this.state.items.length) {
            this.setStatus(this.t("readyStatus"));
            return;
        }
        if (!this.state.hasMore) {
            this.setStatus(this.t("loadedBottom", { count: this.state.items.length }));
            return;
        }
        this.setStatus(this.t("loadedMore", { count: this.state.items.length }));
    }

    toggleViewMode() {
        const currentMode = this.state.viewMode;
        const currentGrid = this.getGridForView(currentMode);
        switchViewMode(
            this.viewCacheState,
            this.isFavoritesView() ? "feed" : "favorites",
            Number(currentGrid?.scrollTop || 0)
        );
        this.state.viewMode = this.viewCacheState.currentMode;
        this.syncViewModeUi();
        this.renderState();
        requestAnimationFrame(() => {
            const nextGrid = this.getGridForView();
            if (nextGrid) {
                nextGrid.scrollTop = this.viewCacheState.scrollTopByMode[this.state.viewMode] || 0;
            }
        });
        if (this.isFavoritesView()) {
            const count = this.state.favorites.length;
            this.setStatus(count ? this.t("favoritesStatus", { count }) : this.t("favoritesEmpty"));
            return;
        }
        this.restoreFeedStatus();
        this.scheduleViewportPrefill();
    }

    persistFavorites() {
        writeStoredFavorites(this.state.favorites);
        this.updateFavoritesButtonLabel();
    }

    updateFavoriteButtonState(imageId) {
        const key = String(imageId || "");
        const buttons = this.favoriteElements.get(key);
        if (!buttons?.size) {
            return;
        }
        const active = hasFavorite(this.state.favorites, key);
        const nextLabel = active ? this.t("favoriteRemove") : this.t("favoriteAdd");
        for (const button of [...buttons]) {
            if (!button?.isConnected) {
                buttons.delete(button);
                continue;
            }
            button.classList.toggle("is-active", active);
            button.textContent = active ? "★" : "☆";
            button.title = nextLabel;
            button.setAttribute("aria-label", nextLabel);
        }
        if (!buttons.size) {
            this.favoriteElements.delete(key);
        }
    }

    toggleFavorite(item) {
        const imageId = String(item?.id || "");
        if (!imageId) {
            return;
        }

        const active = hasFavorite(this.state.favorites, imageId);
        this.state.favorites = active
            ? removeFavorite(this.state.favorites, imageId)
            : upsertFavorite(this.state.favorites, item);
        this.persistFavorites();
        markViewDirty(this.viewCacheState, "favorites");
        this.updateFavoriteButtonState(imageId);

        if (this.isFavoritesView()) {
            this.clearGrid("favorites");
            this.renderState();
        } else {
            this.setStatus(this.t(active ? "favoriteRemoved" : "favoriteSaved", { id: imageId }));
        }
        this.markDirty();
    }

    setStatus(message) {
        this.statusEl.textContent = message;
    }

    openImagePage(imageId) {
        const url = buildCivitaiImagePageUrl(imageId);
        if (!url) {
            return;
        }
        window.open?.(url, "_blank", "noopener,noreferrer");
    }

    getRequestBatchSize(filters) {
        const isFilteredLookup = Boolean(
            filters?.baseModel ||
            filters?.modelId ||
            filters?.modelVersionId ||
            filters?.metadataOnly ||
            filters?.nsfw ||
            filters?.aspectRatio ||
            filters?.minResolution ||
            filters?.tags?.length ||
            filters?.blockTags?.length
        );
        const batchSize = isFilteredLookup ? FILTERED_REQUEST_BATCH_SIZE : DEFAULT_REQUEST_BATCH_SIZE;
        if (this.limitWidget) {
            this.limitWidget.value = batchSize;
        }
        return batchSize;
    }

    getEmptyPageChainLimit(filters) {
        return filters?.baseModel ||
            filters?.modelId ||
            filters?.modelVersionId ||
            filters?.metadataOnly ||
            filters?.nsfw ||
            filters?.aspectRatio ||
            filters?.minResolution ||
            filters?.tags?.length ||
            filters?.blockTags?.length
            ? FILTERED_EMPTY_PAGE_CHAIN_LIMIT
            : DEFAULT_EMPTY_PAGE_CHAIN_LIMIT;
    }

    needsViewportPrefill() {
        return shouldPrefillMore({
            gridWidth: Number(this.feedGridEl?.clientWidth || 0),
            gridHeight: Number(this.feedGridEl?.clientHeight || 0),
            scrollHeight: Number(this.feedGridEl?.scrollHeight || 0),
            itemCount: this.getCardMapForView("feed").size || this.state.items.length,
        });
    }

    scheduleViewportPrefill() {
        if (!shouldScheduleViewportPrefill({
            isFeedView: !this.isFavoritesView(),
            isLoading: this.state.loading,
            hasMore: this.state.hasMore,
            itemCount: this.state.items.length,
            needsViewportPrefill: this.needsViewportPrefill(),
            alreadyScheduled: this.viewportPrefillScheduled,
        })) {
            return;
        }

        this.viewportPrefillScheduled = true;
        requestAnimationFrame(() => {
            this.viewportPrefillScheduled = false;
            if (!shouldScheduleViewportPrefill({
                isFeedView: !this.isFavoritesView(),
                isLoading: this.state.loading,
                hasMore: this.state.hasMore,
                itemCount: this.state.items.length,
                needsViewportPrefill: this.needsViewportPrefill(),
                alreadyScheduled: false,
            })) {
                return;
            }
            this.setStatus(this.t("continuePrefill"));
            this.loadImages(false);
        });
    }

    clearGrid(viewMode = this.state.viewMode) {
        const cardMap = this.getCardMapForView(viewMode);
        for (const [id, card] of cardMap.entries()) {
            const button = card.querySelector?.(".civitai-picker-favorite");
            const buttons = this.favoriteElements.get(id);
            if (button && buttons) {
                buttons.delete(button);
                if (!buttons.size) {
                    this.favoriteElements.delete(id);
                }
            }
        }
        cardMap.clear();
        this.lastSelectedCardByMode[viewMode] = null;
        this.getGridForView(viewMode).replaceChildren();
        markViewDirty(this.viewCacheState, viewMode);
    }

    renderEmptyState(message, viewMode = this.state.viewMode) {
        this.clearGrid(viewMode);
        this.getGridForView(viewMode).appendChild(createEmptyElement(message));
        markViewHydrated(this.viewCacheState, viewMode);
    }

    createCard(item, viewMode = this.state.viewMode) {
        const card = document.createElement("div");
        card.className = "civitai-picker-card";
        card.dataset.itemId = String(item.id);
        card.tabIndex = 0;
        card.setAttribute("role", "button");

        const image = document.createElement("img");
        image.className = "civitai-picker-image";
        image.alt = `Civitai ${item.id}`;
        const currentIndex = this.getCardMapForView(viewMode).size;
        image.loading = currentIndex < 6 ? "eager" : "lazy";
        image.decoding = "async";
        image.setAttribute("fetchpriority", currentIndex < 6 ? "high" : "low");
        image.referrerPolicy = "no-referrer";
        const imageFallbackChain = buildImageFallbackChain(item);
        image.dataset.fallbackIndex = "0";
        image.addEventListener("error", () => {
            const currentIndexValue = Number(image.dataset.fallbackIndex || 0);
            const nextIndex = currentIndexValue + 1;
            const nextUrl = imageFallbackChain[nextIndex] || "";
            if (!nextUrl) {
                return;
            }
            image.dataset.fallbackIndex = String(nextIndex);
            image.src = nextUrl;
        });
        image.src = imageFallbackChain[0] || "";
        const width = Math.max(1, Number(item.width || 0) || 1);
        const height = Math.max(1, Number(item.height || 0) || 1);
        image.width = width;
        image.height = height;

        const media = document.createElement("div");
        media.className = "civitai-picker-card-media";
        const favoriteButton = document.createElement("button");
        favoriteButton.type = "button";
        favoriteButton.className = "civitai-picker-favorite";
        favoriteButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.toggleFavorite(item);
        });
        media.append(image, favoriteButton);

        const metaId = document.createElement("div");
        metaId.className = "civitai-picker-card-id";
        metaId.textContent = `#${item.id}`;

        const metaInfo = document.createElement("div");
        metaInfo.className = "civitai-picker-card-meta";
        const markers = [];
        if (item.base_model) {
            markers.push(item.base_model);
        }
        if (item.size_text) {
            markers.push(item.size_text);
        }
        if (item.has_metadata) {
            markers.push("metadata");
        }
        if (item.nsfw_level) {
            markers.push(`NSFW:${item.nsfw_level}`);
        }
        if (item.model_version_ids?.length) {
            markers.push(`VID:${item.model_version_ids[0]}`);
        }
        metaInfo.textContent = markers.join(" · ");

        card.append(media, metaId, metaInfo);
        card.addEventListener("click", () => this.selectItem(item));
        card.addEventListener("dblclick", (event) => {
            if (event.target?.closest?.(".civitai-picker-favorite")) {
                return;
            }
            this.openImagePage(item.id);
        });
        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                this.selectItem(item);
            }
        });
        const key = String(item.id);
        const buttons = this.favoriteElements.get(key) || new Set();
        buttons.add(favoriteButton);
        this.favoriteElements.set(key, buttons);
        this.updateFavoriteButtonState(item.id);
        return card;
    }

    appendItems(items, viewMode = this.state.viewMode) {
        if (!items.length) {
            return;
        }

        const gridEl = this.getGridForView(viewMode);
        const cardMap = this.getCardMapForView(viewMode);

        if (gridEl.firstElementChild?.classList.contains("civitai-picker-empty")) {
            gridEl.replaceChildren();
        }

        const fragment = document.createDocumentFragment();
        for (const item of items) {
            const id = String(item.id);
            if (!id || cardMap.has(id)) {
                continue;
            }
            const card = this.createCard(item, viewMode);
            cardMap.set(id, card);
            fragment.appendChild(card);
        }

        if (fragment.childNodes.length) {
            gridEl.appendChild(fragment);
        }
        markViewHydrated(this.viewCacheState, viewMode);
        this.updateSelectionState(viewMode);
    }

    updateSelectionState(viewMode = this.state.viewMode) {
        const lastSelectedCard = this.lastSelectedCardByMode[viewMode];
        if (lastSelectedCard && lastSelectedCard.isConnected) {
            lastSelectedCard.classList.remove("is-selected");
        }

        const nextSelectedCard = this.getCardMapForView(viewMode).get(String(this.state.selectedId || "")) || null;
        this.lastSelectedCardByMode[viewMode] = nextSelectedCard;
        if (nextSelectedCard) {
            nextSelectedCard.classList.add("is-selected");
        }
    }

    renderState() {
        this.previewEl.value = String(this.promptWidget?.value || this.previewEl.value || "");
        this.refreshButton.disabled = this.state.loading;
        this.syncViewModeUi();

        if (this.isFavoritesView()) {
            const favorites = this.getVisibleItems();
            if (!favorites.length) {
                if (shouldHydrateView(this.viewCacheState, "favorites")) {
                    this.renderEmptyState(this.t("favoritesEmpty"), "favorites");
                }
                this.setStatus(this.t("favoritesEmpty"));
                return;
            }
            if (shouldHydrateView(this.viewCacheState, "favorites") || !this.getCardMapForView("favorites").size) {
                this.clearGrid("favorites");
                this.appendItems(favorites, "favorites");
            } else {
                this.updateSelectionState("favorites");
            }
            this.setStatus(this.t("favoritesStatus", { count: favorites.length }));
            return;
        }

        if (this.state.loading && !this.state.items.length) {
            this.renderEmptyState(this.t("loadingThumbnails"), "feed");
            return;
        }

        if (!this.state.items.length) {
            this.renderEmptyState(this.t("noVisibleImages"), "feed");
            return;
        }

        if (shouldHydrateView(this.viewCacheState, "feed") || !this.getCardMapForView("feed").size) {
            this.clearGrid("feed");
            this.appendItems(this.state.items, "feed");
        } else {
            this.updateSelectionState("feed");
        }
    }

    async loadImages(reset) {
        if (this.isFavoritesView()) {
            return;
        }

        if (this.state.loading) {
            if (reset) {
                const { abortRequested } = markResetRequestedWhileLoading(this.requestControl);
                if (abortRequested) {
                    this.activeAbortController?.abort();
                }
            }
            return;
        }

        const filters = this.readFilters();
        const limit = this.getRequestBatchSize(filters);
        const emptyPageChainLimit = this.getEmptyPageChainLimit(filters);
        const apiKey = this.apiKeyInput.value.trim();
        let nextPage = reset ? "" : String(this.nextPageWidget?.value || this.state.nextPage || "");
        const seenPageTokens = new Set();
        const knownIds = new Set(reset ? [] : this.state.items.map((item) => String(item.id)));
        let appendedAny = false;
        let traversedEmptyPages = 0;
        this.deferredPrefillRequested = false;

        if (reset) {
            this.state.items = [];
            this.state.hasMore = true;
            this.state.nextPage = "";
            this.lastDiagnostics = null;
            this.clearGrid();
            if (this.nextPageWidget) {
                this.nextPageWidget.value = "";
            }
            if (this.gridEl) {
                this.gridEl.scrollTop = 0;
            }
        }

        this.state.filters = filters;
        this.requestControl.pendingReset = false;
        this.state.loading = true;
        this.requestControl.loading = true;
        this.loadingMore = !reset;
        this.renderState();
        this.setStatus(reset ? this.t("loadingByFilters") : this.t("loadingMoreStatus"));
        const loadToken = ++this.activeLoadToken;
        const abortController = typeof AbortController !== "undefined" ? new AbortController() : null;
        this.activeAbortController = abortController;

        try {
            while (true) {
                if (shouldAbortActiveLoadForReset(this.requestControl)) {
                    throw createAbortError();
                }
                const pageToken = nextPage || "__FIRST__";
                if (seenPageTokens.has(pageToken)) {
                    this.state.hasMore = false;
                    this.state.nextPage = "";
                    break;
                }
                seenPageTokens.add(pageToken);

                const response = await api.fetchApi(buildEndpoint(limit, nextPage, filters), {
                    cache: "no-store",
                    headers: apiKey ? { "X-Civitai-Api-Key": apiKey } : undefined,
                    signal: abortController?.signal,
                });
                const payload = await response.json();
                if (shouldAbortActiveLoadForReset(this.requestControl)) {
                    throw createAbortError();
                }
                if (!response.ok) {
                    throw new Error(payload?.error || `HTTP ${response.status}`);
                }
                this.lastDiagnostics = payload?.diagnostics || null;

                const incoming = Array.isArray(payload.items) ? payload.items : [];
                const uniqueIncoming = [];
                for (const item of incoming) {
                    const id = String(item?.id || "");
                    if (!id || knownIds.has(id)) {
                        continue;
                    }
                    knownIds.add(id);
                    uniqueIncoming.push(item);
                }

                if (uniqueIncoming.length) {
                    this.state.items.push(...uniqueIncoming);
                    this.rememberBaseModels(uniqueIncoming);
                    this.appendItems(uniqueIncoming);
                    appendedAny = true;
                }

                this.state.nextPage = String(payload.next_page || "");
                this.state.hasMore = Boolean(this.state.nextPage);
                if (this.nextPageWidget) {
                    this.nextPageWidget.value = this.state.nextPage;
                }

                if (!uniqueIncoming.length && this.state.hasMore) {
                    traversedEmptyPages += 1;
                    if (traversedEmptyPages >= emptyPageChainLimit) {
                        this.setStatus(this.t("tooManyEmptyPages"));
                        break;
                    }
                    nextPage = this.state.nextPage;
                    this.setStatus(this.t("emptyPageContinue", { page: traversedEmptyPages + 1 }));
                    continue;
                }

                if (shouldDeferPrefillAfterFirstBatch({
                    isReset: reset,
                    appendedCount: uniqueIncoming.length,
                    hasMore: this.state.hasMore,
                    needsViewportPrefill: this.needsViewportPrefill(),
                })) {
                    this.deferredPrefillRequested = true;
                    break;
                }

                if (uniqueIncoming.length && this.state.hasMore && this.needsViewportPrefill()) {
                    nextPage = this.state.nextPage;
                    this.setStatus(this.t("continuePrefill"));
                    continue;
                }

                break;
            }

            if (!this.state.items.length) {
                const modelSearchState = await this.maybeResolveCustomModelSearch(filters);
                if (modelSearchState === "reloading") {
                    this.renderEmptyState(this.t("loadingThumbnails"));
                } else {
                    this.renderEmptyState(this.t("noVisibleImages"));
                    const reasonMessage = describeEmptyReason(this.t, this.lastDiagnostics, filters);
                    const guidanceMessage = modelSearchState === "candidates"
                        ? this.t("modelSearchChooseCandidate", {
                            count: this.baseModelSearchResults.length,
                        })
                        : reasonMessage;
                    if (this.state.hasMore) {
                        this.setStatus(
                            guidanceMessage
                                ? this.t("hasMoreReason", { reasonMessage: guidanceMessage })
                                : this.t("continueScrolling"),
                        );
                    } else {
                        this.setStatus(guidanceMessage || this.t("noMatchingImages"));
                    }
                }
            } else if (!this.state.hasMore) {
                this.setStatus(this.t("loadedBottom", { count: this.state.items.length }));
            } else if (appendedAny || reset) {
                this.setStatus(this.t("loadedMore", { count: this.state.items.length }));
            }
        } catch (error) {
            if (!isAbortError(error)) {
                this.setStatus(this.t("loadFailed", { error: error.message || error }));
                if (!this.state.items.length) {
                    this.renderEmptyState(this.t("loadFailedRetry"));
                }
            }
        } finally {
            this.state.loading = false;
            this.requestControl.loading = false;
            this.loadingMore = false;
            if (this.activeLoadToken === loadToken) {
                this.activeAbortController = null;
            }
            this.renderState();
            this.syncFromWidgets();
            this.syncLayout();
            if (this.deferredPrefillRequested && this.state.hasMore && !this.requestControl.pendingReset) {
                this.deferredPrefillRequested = false;
                this.setStatus(this.t("continuePrefillFirstScreen", { count: this.state.items.length }));
                requestAnimationFrame(() => this.loadImages(false));
            }
            if (this.requestControl.pendingReset) {
                this.requestControl.pendingReset = false;
                this.requestReload({ immediate: true });
            }
        }
    }

    onGridScroll() {
        if (this.scrollTicking) {
            return;
        }
        this.scrollTicking = true;
        requestAnimationFrame(() => {
            this.scrollTicking = false;
            const threshold = 160;
            const distanceToBottom =
                this.gridEl.scrollHeight - this.gridEl.scrollTop - this.gridEl.clientHeight;
            if (distanceToBottom <= threshold && this.state.hasMore && !this.state.loading) {
                this.loadImages(false);
            }
        });
    }

    selectItem(item) {
        const selectedId = String(item.id);
        this.state.selectedId = selectedId;

        if (this.promptWidget) {
            this.promptWidget.value = item.prompt || "";
        }
        if (this.negativePromptWidget) {
            this.negativePromptWidget.value = item.negative_prompt || "";
        }
        if (this.widthTextWidget) {
            this.widthTextWidget.value = item.width_text || "";
        }
        if (this.heightTextWidget) {
            this.heightTextWidget.value = item.height_text || "";
        }
        if (this.imageIdWidget) {
            this.imageIdWidget.value = selectedId;
        }
        if (this.imageUrlWidget) {
            this.imageUrlWidget.value = item.image_url || "";
        }

        this.previewEl.value = item.prompt || "";
        const sizeText = item.size_text || [item.width_text, item.height_text].filter(Boolean).join("x");
        const negativeStatus = item.negative_prompt ? this.t("hasNegativePrompt") : this.t("noNegativePrompt");
        this.setStatus(
            this.t("selectedImageStatus", {
                id: selectedId,
                sizeSegment: sizeText ? ` · ${sizeText}` : "",
                negativeStatus,
            })
        );
        this.updateSelectionState();
        this.markDirty();
    }

    markDirty() {
        this.node.setDirtyCanvas?.(true, true);
        app.graph.setDirtyCanvas(true, false);
    }
}


app.registerExtension({
    name: EXTENSION_NAME,
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) {
            return;
        }

        chainCallback(nodeType.prototype, "onNodeCreated", function () {
            ensureStyles();
            this.serialize_widgets = true;
            ensureExpectedOutputs(this);

            hideWidget(findWidget(this, "selected_prompt"));
            hideWidget(findWidget(this, "selected_negative_prompt"));
            hideWidget(findWidget(this, "selected_width_text"));
            hideWidget(findWidget(this, "selected_height_text"));
            hideWidget(findWidget(this, "selected_image_id"));
            hideWidget(findWidget(this, "next_page"));
            hideWidget(findWidget(this, "selected_image_url"));
            hideWidget(findWidget(this, "limit"));

            const element = document.createElement("div");
            this.civitaiPromptPickerWidget = this.addDOMWidget(
                "civitai_prompt_picker",
                "custom",
                element,
                {
                    serialize: false,
                    hideOnZoom: false,
                    getMinHeight: () => MIN_WIDGET_HEIGHT,
                    getMaxHeight: () => MAX_WIDGET_HEIGHT,
                    getHeight: () => this.civitaiPromptPickerUI?.getWidgetHeight() || MIN_WIDGET_HEIGHT,
                }
            );
            this.civitaiPromptPickerWidget.computeSize = (width) => [
                Math.max(DEFAULT_NODE_SIZE[0], width || this.size?.[0] || DEFAULT_NODE_SIZE[0]),
                this.civitaiPromptPickerUI?.getWidgetHeight() || MIN_WIDGET_HEIGHT,
            ];

            this.civitaiPromptPickerUI = new CivitaiPromptPickerUI(this, element);
            migrateLegacyNodeSize(this);
            this.setSize(DEFAULT_NODE_SIZE);
            this.civitaiPromptPickerUI.syncLayout(this.size);
        });

        chainCallback(nodeType.prototype, "onConfigure", function () {
            requestAnimationFrame(() => {
                ensureExpectedOutputs(this);
                migrateLegacyNodeSize(this);
                this.civitaiPromptPickerUI?.syncFromWidgets();
                this.civitaiPromptPickerUI?.renderState();
                this.civitaiPromptPickerUI?.syncLayout(this.size);
                this.setDirtyCanvas?.(true, true);
            });
        });

        chainCallback(nodeType.prototype, "onResize", function (size) {
            this.civitaiPromptPickerUI?.syncLayout(size || this.size);
        });
    },
});
