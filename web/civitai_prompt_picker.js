import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
import { shouldDeferPrefillAfterFirstBatch, shouldPrefillMore } from "./civitai_prompt_picker_prefill.js";


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
const BASE_MODEL_CUSTOM_VALUE = "__custom__";
const STORAGE_KEYS = {
    apiKey: "comfy.civitaiPromptPicker.apiKey",
    nsfw: "comfy.civitaiPromptPicker.nsfw",
};
const PERIOD_OPTIONS = [
    { value: "", label: "全部时间" },
    { value: "Day", label: "一天内" },
    { value: "Week", label: "一周内" },
    { value: "Month", label: "一月内" },
    { value: "Year", label: "一年内" },
];
const NSFW_OPTIONS = [
    { value: "", label: "全部可见级别" },
    { value: "false", label: "仅安全内容" },
    { value: "true", label: "任意 NSFW" },
    { value: "Soft", label: "仅 Soft" },
    { value: "Mature", label: "仅 Mature" },
    { value: "X", label: "仅 X" },
];
const SORT_OPTIONS = [
    { value: "", label: "默认排序" },
    { value: "Most Reactions", label: "Most Reactions" },
    { value: "Most Comments", label: "Most Comments" },
    { value: "Most Collected", label: "Most Collected" },
    { value: "Newest", label: "Newest" },
    { value: "Oldest", label: "Oldest" },
];
const OUTPUT_SCHEMA = [
    { name: "prompt", type: "STRING" },
    { name: "negative_prompt", type: "STRING" },
    { name: "width", type: "INT" },
    { name: "height", type: "INT" },
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
            --civitai-grid-height: 320px;
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
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
            min-height: 0;
            height: var(--civitai-grid-height);
            max-height: none;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 4px;
            align-content: start;
            align-items: start;
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
            transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
        }
        .civitai-picker-card:hover {
            transform: translateY(-1px);
            border-color: rgba(118, 200, 255, 0.46);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
        }
        .civitai-picker-card.is-selected {
            border-color: rgba(86, 184, 255, 0.92);
            box-shadow: 0 0 0 1px rgba(86, 184, 255, 0.65);
        }
        .civitai-picker-image {
            display: block;
            width: 100%;
            height: auto;
            object-fit: contain;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.06);
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


function computeLayoutMetrics(nodeSize) {
    const width = Math.max(DEFAULT_NODE_SIZE[0], Number(nodeSize?.[0] || DEFAULT_NODE_SIZE[0]));
    const rawHeight = Number(nodeSize?.[1] || DEFAULT_NODE_SIZE[1]);
    const widgetHeight = clamp(rawHeight - NODE_CHROME_HEIGHT, MIN_WIDGET_HEIGHT, MAX_WIDGET_HEIGHT);
    const previewHeight = clamp(Math.round(widgetHeight * 0.15), 68, 120);
    const gridHeight = Math.max(120, widgetHeight - previewHeight - 176);
    return {
        width,
        widgetHeight,
        previewHeight,
        gridHeight,
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
    return `/civitai-prompt-picker/images?${params.toString()}`;
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


function makeBaseModelOptions(values) {
    const options = [{ value: "", label: "全部基础模型" }];
    for (const value of values) {
        options.push({ value, label: value });
    }
    options.push({ value: BASE_MODEL_CUSTOM_VALUE, label: "自定义输入..." });
    return options;
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


function describeEmptyReason(diagnostics, filters) {
    const reason = diagnostics?.empty_reason || "";
    switch (reason) {
    case "metadata_only_filtered_all":
        return "有图片，但都没有可用 prompt metadata。关闭 metadata only 会看到更多。";
    case "no_public_model_version_images":
        return filters.modelVersionId
            ? `模型版本 ${filters.modelVersionId} 在 Civitai 图片接口里没有公开图库图，或这些图需要登录/API Key/NSFW 可见权限。`
            : "当前模型版本没有公开图库图。";
    case "no_public_model_images":
        return filters.modelId
            ? `模型 ${filters.modelId} 在 Civitai 图片接口里没有公开图库图，或这些图需要登录/API Key/NSFW 可见权限。`
            : "当前模型没有公开图库图。";
    case "no_images_for_filters":
        return "当前时间段、基础模型或 NSFW 筛选下没有公开图片。";
    case "filtered_out_by_combination":
        return "接口里有图片，但被当前筛选组合压空了。先放宽 metadata only、时间段或基础模型会更容易命中。";
    case "no_images_returned":
        return "Civitai 当前没有返回可显示图片。";
    default:
        return "";
    }
}


class CivitaiPromptPickerUI {
    constructor(node, element) {
        this.node = node;
        this.element = element;
        this.layout = computeLayoutMetrics(node.size);
        this.state = {
            items: [],
            loading: false,
            selectedId: "",
            nextPage: "",
            hasMore: true,
            filters: {
                period: "",
                baseModel: "",
                metadataOnly: true,
                modelId: "",
                modelVersionId: "",
                nsfw: "",
                sort: "",
            },
        };
        this.loadingMore = false;
        this.scrollTicking = false;
        this.reloadTimer = null;
        this.pendingReset = false;
        this.deferredPrefillRequested = false;
        this.cardElements = new Map();
        this.lastSelectedCard = null;
        this.lastDiagnostics = null;
        this.baseModelValues = new Set(BASE_MODEL_SUGGESTIONS);

        this.promptWidget = findWidget(node, "selected_prompt");
        this.negativePromptWidget = findWidget(node, "selected_negative_prompt");
        this.widthTextWidget = findWidget(node, "selected_width_text");
        this.heightTextWidget = findWidget(node, "selected_height_text");
        this.imageIdWidget = findWidget(node, "selected_image_id");
        this.nextPageWidget = findWidget(node, "next_page");
        this.limitWidget = findWidget(node, "limit");

        this.renderShell();
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

        this.periodSelect = makeSelect(PERIOD_OPTIONS);
        this.sortSelect = makeSelect(SORT_OPTIONS);
        this.nsfwSelect = makeSelect(NSFW_OPTIONS);
        this.nsfwSelect.value = readStoredValue(STORAGE_KEYS.nsfw);

        this.baseModelSelect = makeSelect(makeBaseModelOptions(BASE_MODEL_SUGGESTIONS));
        this.baseModelInput = document.createElement("input");
        this.baseModelInput.className = "civitai-picker-input";
        this.baseModelInput.placeholder = "输入未出现在下拉中的基础模型名";
        this.baseModelInput.hidden = true;

        const baseModelField = document.createElement("div");
        baseModelField.className = "civitai-picker-field";
        const baseModelLabel = document.createElement("label");
        baseModelLabel.textContent = "基础模型";
        baseModelField.append(baseModelLabel, this.baseModelSelect, this.baseModelInput);

        this.modelIdInput = document.createElement("input");
        this.modelIdInput.className = "civitai-picker-input";
        this.modelIdInput.placeholder = "例如 257749";

        this.modelVersionIdInput = document.createElement("input");
        this.modelVersionIdInput.className = "civitai-picker-input";
        this.modelVersionIdInput.placeholder = "例如 290640";

        this.apiKeyInput = document.createElement("input");
        this.apiKeyInput.type = "password";
        this.apiKeyInput.className = "civitai-picker-input";
        this.apiKeyInput.placeholder = "可选，用于登录可见图片或 NSFW 内容";
        this.apiKeyInput.value = readStoredValue(STORAGE_KEYS.apiKey);

        this.metadataOnlyInput = document.createElement("input");
        this.metadataOnlyInput.type = "checkbox";
        this.metadataOnlyInput.checked = true;

        const toggleWrap = document.createElement("label");
        toggleWrap.className = "civitai-picker-toggle";
        toggleWrap.append(
            this.metadataOnlyInput,
            document.createTextNode("仅显示带 metadata/prompt 的图片"),
        );

        const toolbar = document.createElement("div");
        toolbar.className = "civitai-picker-toolbar";
        toolbar.append(
            makeField("时间段", this.periodSelect),
            makeField("排序", this.sortSelect),
            makeField("NSFW", this.nsfwSelect),
            baseModelField,
            makeField("模型 ID", this.modelIdInput),
            makeField("模型版本 ID", this.modelVersionIdInput),
            makeField("Civitai API Key", this.apiKeyInput),
            toggleWrap,
        );

        const actions = document.createElement("div");
        actions.className = "civitai-picker-actions";

        this.statusEl = document.createElement("div");
        this.statusEl.className = "civitai-picker-status";
        this.statusEl.textContent = "准备加载 Civitai 缩略图...";

        this.refreshButton = document.createElement("button");
        this.refreshButton.type = "button";
        this.refreshButton.className = "civitai-picker-button";
        this.refreshButton.textContent = "应用筛选";
        this.refreshButton.addEventListener("click", () => this.loadImages(true));

        actions.append(this.statusEl, this.refreshButton);

        this.gridEl = document.createElement("div");
        this.gridEl.className = "civitai-picker-grid";
        this.gridEl.addEventListener("scroll", () => this.onGridScroll());

        this.loaderEl = document.createElement("div");
        this.loaderEl.className = "civitai-picker-loader";
        this.loaderEl.textContent = "正在加载更多图片...";
        this.loaderEl.hidden = true;

        const previewLabel = document.createElement("div");
        previewLabel.className = "civitai-picker-preview-label";
        previewLabel.textContent = "选中图片的 Prompt";

        this.previewEl = document.createElement("textarea");
        this.previewEl.className = "civitai-picker-preview";
        this.previewEl.readOnly = true;
        this.previewEl.placeholder = "点击上面的图片后，这里会出现 prompt。";

        this.root.append(
            toolbar,
            actions,
            this.gridEl,
            this.loaderEl,
            previewLabel,
            this.previewEl,
        );
        this.element.appendChild(this.root);
        this.syncBaseModelControls();
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
        this.nsfwSelect.addEventListener("change", () => {
            writeStoredValue(STORAGE_KEYS.nsfw, this.nsfwSelect.value);
            triggerReload();
        });
        this.baseModelSelect.addEventListener("change", () => {
            this.syncBaseModelControls();
            triggerReload();
        });
        this.baseModelInput.addEventListener("input", scheduleReload);
        this.baseModelInput.addEventListener("change", triggerReload);
        this.baseModelInput.addEventListener("keydown", triggerReloadOnEnter);
        this.metadataOnlyInput.addEventListener("change", triggerReload);
        this.modelIdInput.addEventListener("input", scheduleReload);
        this.modelVersionIdInput.addEventListener("input", scheduleReload);
        this.apiKeyInput.addEventListener("input", () => {
            writeStoredValue(STORAGE_KEYS.apiKey, this.apiKeyInput.value.trim());
            scheduleReload();
        });
        this.modelIdInput.addEventListener("change", triggerReload);
        this.modelVersionIdInput.addEventListener("change", triggerReload);
        this.apiKeyInput.addEventListener("change", () => {
            writeStoredValue(STORAGE_KEYS.apiKey, this.apiKeyInput.value.trim());
            triggerReload();
        });
        this.modelIdInput.addEventListener("keydown", triggerReloadOnEnter);
        this.modelVersionIdInput.addEventListener("keydown", triggerReloadOnEnter);
        this.apiKeyInput.addEventListener("keydown", triggerReloadOnEnter);
    }

    requestReload({ immediate = false } = {}) {
        if (this.reloadTimer) {
            window.clearTimeout(this.reloadTimer);
            this.reloadTimer = null;
        }

        if (immediate) {
            this.loadImages(true);
            return;
        }

        this.reloadTimer = window.setTimeout(() => {
            this.reloadTimer = null;
            this.loadImages(true);
        }, FILTER_INPUT_DEBOUNCE_MS);
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
        this.root.style.setProperty("--civitai-grid-height", `${this.layout.gridHeight}px`);
        this.root.style.setProperty("--civitai-preview-height", `${this.layout.previewHeight}px`);
        this.markDirty();
    }

    renderBaseModelSuggestions() {
        const knownDefaults = new Set(BASE_MODEL_SUGGESTIONS);
        const extras = [...this.baseModelValues]
            .filter((value) => value && !knownDefaults.has(value))
            .sort((left, right) => left.localeCompare(right));
        const currentValue = this.baseModelSelect?.value || "";
        const customValue = this.baseModelInput?.value || "";
        const options = makeBaseModelOptions([...BASE_MODEL_SUGGESTIONS, ...extras]);
        const rebuiltSelect = makeSelect(options);
        rebuiltSelect.addEventListener("change", () => {
            this.syncBaseModelControls();
            this.loadImages(true);
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
        const baseModel =
            this.baseModelSelect.value === BASE_MODEL_CUSTOM_VALUE
                ? this.baseModelInput.value.trim()
                : this.baseModelSelect.value;
        return {
            period: this.periodSelect.value,
            baseModel,
            metadataOnly: this.metadataOnlyInput.checked,
            modelId: this.modelIdInput.value.trim(),
            modelVersionId: this.modelVersionIdInput.value.trim(),
            nsfw: this.nsfwSelect.value,
            sort: this.sortSelect.value,
        };
    }

    setStatus(message) {
        this.statusEl.textContent = message;
    }

    getRequestBatchSize(filters) {
        const isFilteredLookup = Boolean(
            filters?.baseModel ||
            filters?.modelId ||
            filters?.modelVersionId ||
            filters?.metadataOnly ||
            filters?.nsfw
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
            filters?.nsfw
            ? FILTERED_EMPTY_PAGE_CHAIN_LIMIT
            : DEFAULT_EMPTY_PAGE_CHAIN_LIMIT;
    }

    needsViewportPrefill() {
        return shouldPrefillMore({
            gridWidth: Number(this.gridEl?.clientWidth || 0),
            gridHeight: Number(this.gridEl?.clientHeight || 0),
            scrollHeight: Number(this.gridEl?.scrollHeight || 0),
            itemCount: this.cardElements.size || this.state.items.length,
        });
    }

    clearGrid() {
        this.cardElements.clear();
        this.lastSelectedCard = null;
        this.gridEl.replaceChildren();
    }

    renderEmptyState(message) {
        this.clearGrid();
        this.gridEl.appendChild(createEmptyElement(message));
    }

    createCard(item) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "civitai-picker-card";
        card.dataset.itemId = String(item.id);

        const image = document.createElement("img");
        image.className = "civitai-picker-image";
        image.src = item.thumbnail_url || item.image_url || "";
        image.alt = `Civitai ${item.id}`;
        const currentIndex = this.cardElements.size;
        image.loading = currentIndex < 6 ? "eager" : "lazy";
        image.decoding = "async";
        image.setAttribute("fetchpriority", currentIndex < 6 ? "high" : "low");
        image.referrerPolicy = "no-referrer";
        const width = Math.max(1, Number(item.width || 0) || 1);
        const height = Math.max(1, Number(item.height || 0) || 1);
        image.width = width;
        image.height = height;

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

        card.append(image, metaId, metaInfo);
        card.addEventListener("click", () => this.selectItem(item));
        return card;
    }

    appendItems(items) {
        if (!items.length) {
            return;
        }

        if (this.gridEl.firstElementChild?.classList.contains("civitai-picker-empty")) {
            this.gridEl.replaceChildren();
        }

        const fragment = document.createDocumentFragment();
        for (const item of items) {
            const id = String(item.id);
            if (!id || this.cardElements.has(id)) {
                continue;
            }
            const card = this.createCard(item);
            this.cardElements.set(id, card);
            fragment.appendChild(card);
        }

        if (fragment.childNodes.length) {
            this.gridEl.appendChild(fragment);
        }
        this.updateSelectionState();
    }

    updateSelectionState() {
        if (this.lastSelectedCard && this.lastSelectedCard.isConnected) {
            this.lastSelectedCard.classList.remove("is-selected");
        }

        this.lastSelectedCard = this.cardElements.get(String(this.state.selectedId || "")) || null;
        if (this.lastSelectedCard) {
            this.lastSelectedCard.classList.add("is-selected");
        }
    }

    renderState() {
        this.previewEl.value = String(this.promptWidget?.value || this.previewEl.value || "");
        this.refreshButton.disabled = this.state.loading;
        this.loaderEl.hidden = !(this.loadingMore && this.state.items.length > 0);

        if (this.state.loading && !this.state.items.length) {
            this.renderEmptyState("正在加载缩略图...");
            return;
        }

        if (!this.state.items.length) {
            this.renderEmptyState("当前没有可显示的图片。");
            return;
        }

        if (!this.cardElements.size) {
            this.appendItems(this.state.items);
        } else {
            this.updateSelectionState();
        }
    }

    async loadImages(reset) {
        if (this.state.loading) {
            if (reset) {
                this.pendingReset = true;
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
        this.state.loading = true;
        this.loadingMore = !reset;
        this.renderState();
        this.setStatus(reset ? "正在按筛选条件加载缩略图..." : "正在加载更多缩略图...");

        try {
            while (true) {
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
                });
                const payload = await response.json();
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
                        this.setStatus("连续空页过多，先停在这里。继续滚动可再向后抓取。");
                        break;
                    }
                    nextPage = this.state.nextPage;
                    this.setStatus(`当前页没有命中结果，继续向后抓取第 ${traversedEmptyPages + 1} 页...`);
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
                    this.setStatus("当前可视区域还没填满，继续自动抓取下一页...");
                    continue;
                }

                break;
            }

            if (!this.state.items.length) {
                this.renderEmptyState("当前没有可显示的图片。");
                const reasonMessage = describeEmptyReason(this.lastDiagnostics, filters);
                if (this.state.hasMore) {
                    this.setStatus(
                        reasonMessage
                            ? `${reasonMessage} 当前还可以继续向后抓取更多页。`
                            : "暂时还没找到命中结果，继续滚动会再向后抓取。",
                    );
                } else {
                    this.setStatus(reasonMessage || "没有符合筛选条件的图片。");
                }
            } else if (!this.state.hasMore) {
                this.setStatus(`已加载 ${this.state.items.length} 张图片，已经到底了。`);
            } else if (appendedAny || reset) {
                this.setStatus(`已加载 ${this.state.items.length} 张图片。继续滚动会自动加载更多。`);
            }
        } catch (error) {
            this.setStatus(`加载失败：${error.message || error}`);
            if (!this.state.items.length) {
                this.renderEmptyState("加载失败，请稍后重试。");
            }
        } finally {
            this.state.loading = false;
            this.loadingMore = false;
            this.renderState();
            this.syncFromWidgets();
            this.syncLayout();
            if (this.deferredPrefillRequested && this.state.hasMore && !this.pendingReset) {
                this.deferredPrefillRequested = false;
                this.setStatus(`已加载 ${this.state.items.length} 张图片，正在继续补齐首屏...`);
                requestAnimationFrame(() => this.loadImages(false));
            }
            if (this.pendingReset) {
                this.pendingReset = false;
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

        this.previewEl.value = item.prompt || "";
        const sizeText = item.size_text || [item.width_text, item.height_text].filter(Boolean).join("x");
        const negativeStatus = item.negative_prompt ? "带负面 prompt" : "无负面 prompt";
        this.setStatus(`已选择图片 #${selectedId}${sizeText ? ` · ${sizeText}` : ""} · ${negativeStatus}`);
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
