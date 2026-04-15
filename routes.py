import base64
import asyncio
import json
import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import requests
from aiohttp import ClientError, ClientSession, ClientTimeout, web


CIVITAI_IMAGES_URL = "https://civitai.com/api/v1/images"
CIVITAI_MODELS_URL = "https://civitai.com/api/v1/models"
CIVITAI_MODEL_VERSION_URL = "https://civitai.com/api/v1/model-versions"
ALLOWED_PERIODS = {"Day", "Week", "Month", "Year", "AllTime"}
ALLOWED_NSFW_VALUES = {"true", "false", "None", "Soft", "Mature", "X"}
ALLOWED_SORT_VALUES = {
    "Most Reactions",
    "Most Comments",
    "Most Collected",
    "Newest",
    "Oldest",
}
ALLOWED_ASPECT_RATIO_VALUES = {
    "PORTRAIT",
    "LANDSCAPE",
    "SQUARE",
    "9:16",
    "3:4",
    "2:3",
    "1:1",
    "3:2",
    "4:3",
    "16:9",
}
ALLOWED_MIN_RESOLUTION_VALUES = {"1024", "1536", "2048", "3072"}
ALLOWED_MAX_RESOLUTION_VALUES = ALLOWED_MIN_RESOLUTION_VALUES
DEFAULT_TIMEOUT = ClientTimeout(total=35)
DEFAULT_HEADERS = {"User-Agent": "ComfyUI-CivitaiPromptPicker/1.0"}
IMAGE_PROXY_ROUTE = "/civitai-prompt-picker/image-proxy"
ALLOWED_PROXY_IMAGE_HOST_SUFFIX = ".civitai.com"
IMAGE_PROXY_CACHE_SECONDS = 300
IMAGE_PROXY_UPSTREAM_TIMEOUT_SECONDS = 10
MODEL_VERSION_TO_MODEL_ID_CACHE = {}
MODEL_VERSION_DETAILS_CACHE = {}
SIZE_PATTERN = re.compile(r"^\s*(\d+)\s*[xX]\s*(\d+)\s*$")
FETCH_RETRY_ATTEMPTS = 3
FETCH_RETRY_DELAY_SECONDS = 1.0
MAX_SOURCE_PAGES_PER_RESULT_PAGE = 8
EXPANDED_UPSTREAM_LIMIT_MULTIPLIER = 5
MAX_UPSTREAM_PAGE_LIMIT = 120
SQUARE_RATIO_TOLERANCE = 0.04
EXACT_RATIO_TOLERANCE = 0.05
TAG_FILTER_KEYWORDS = {
    "ANIMAL": ["animal", "wildlife", "beast", "creature", "pet"],
    "ANIME": ["anime", "manga", "animestyle"],
    "ARCHITECTURE": ["architecture", "building", "interior", "exterior", "house"],
    "ARMOR": ["armor", "armour", "helmet", "plate mail"],
    "ASTRONOMY": ["astronomy", "galaxy", "nebula", "planet", "starfield", "cosmos", "space"],
    "CAR": ["car", "automobile", "vehicle", "supercar", "sedan", "coupe"],
    "CARTOON": ["cartoon", "toon", "western animation"],
    "CAT": ["cat", "kitten", "feline"],
    "CITY": ["city", "urban", "downtown", "street", "skyline", "metropolis"],
    "CLOTHING": ["clothing", "outfit", "dress", "fashion", "apparel", "garment"],
    "COMICS": ["comics", "comic book", "comic panel"],
    "COSTUME": ["costume", "cosplay", "uniform"],
    "DOG": ["dog", "puppy", "canine"],
    "DRAGON": ["dragon", "drake", "wyvern"],
    "FANTASY": ["fantasy", "magical", "wizard", "sorcerer", "elf"],
    "FOOD": ["food", "meal", "dish", "dessert", "fruit", "drink"],
    "GAME CHARACTER": ["game character", "video game character", "playable character", "npc"],
    "LANDSCAPE": ["landscape", "scenery", "mountain", "forest", "river", "valley", "vista"],
    "LATEX CLOTHING": ["latex", "rubber suit", "pvc outfit"],
    "MAN": [" man ", "male", "boy", "gentleman"],
    "MODERN ART": ["modern art", "abstract", "conceptual art", "installation art"],
    "OUTDOORS": ["outdoors", "outdoor", "nature", "outside", "wilderness"],
    "PHOTOGRAPHY": ["photography", "photograph", "photo", "camera shot", "shot on"],
    "PHOTOREALISTIC": ["photorealistic", "photorealism", "ultra realistic", "realistic photo"],
    "POST APOCALYPTIC": ["post apocalyptic", "wasteland", "apocalypse", "ruined city"],
    "ROBOT": ["robot", "android", "mecha", "cyborg"],
    "SCI-FI": ["sci fi", "sci-fi", "science fiction", "futuristic", "cyberpunk", "spaceship"],
    "SPORTS CAR": ["sports car", "supercar", "race car", "performance car"],
    "SWIMWEAR": ["swimwear", "swimsuit", "bikini", "bathing suit", "beachwear"],
    "TRANSPORTATION": ["transportation", "transport", "vehicle", "train", "bus", "truck", "airplane", "aircraft", "motorcycle", "bicycle", "ship"],
    "WOMAN": ["woman", "women", "female", "lady"],
}
LOCAL_ONLY_BASE_MODEL_FILTERS = {
    "Flux",
    "SDXL",
    "SD 1.5",
    "SD 2.0",
    "SD 2.1",
    "SD 3",
    "SD 3.5",
    "Anima",
    "Illustrious",
    "NoobAI",
    "HiDream",
    "ZImage",
    "ZImageTurbo",
    "ZImageBase",
    "Hunyuan",
    "Hunyuan Video",
    "PixArt a",
    "Playground v2",
    "Stable Cascade",
    "Kolors",
    "Lumina",
    "Cosmos",
    "Wan",
    "Wan Video",
}
FAMILY_PREFIX_BASE_MODEL_KEYS = {"anima", "zimage"}
FAMILY_BASE_MODEL_QUERY_VALUES = {
    "SD 1.5": ["SD 1.5"],
    "SD 2.0": ["SD 2.0"],
    "SD 2.1": ["SD 2.1"],
    "Anima": ["Anima"],
    "Illustrious": ["Illustrious"],
    "NoobAI": ["NoobAI"],
    "HiDream": ["HiDream"],
    "Hunyuan Video": ["Hunyuan Video"],
    "PixArt a": ["PixArt a"],
    "Playground v2": ["Playground v2"],
    "Stable Cascade": ["Stable Cascade"],
    "Kolors": ["Kolors"],
    "Lumina": ["Lumina"],
    "Wan Video": ["Wan Video"],
    "ZImage": ["ZImageTurbo", "ZImageBase"],
    "ZImageTurbo": ["ZImageTurbo"],
    "ZImageBase": ["ZImageBase"],
}
FAMILY_MODEL_PAGE_LIMIT = 20
FAMILY_IMAGE_PAGE_LIMIT_MIN = 24
FAMILY_IMAGE_PAGE_LIMIT_MAX = 48
MAX_FAMILY_SOURCE_REQUESTS_PER_RESULT_PAGE = 12
CUSTOM_NEXT_PAGE_STRATEGY_KEY = "__cpp_strategy"
CUSTOM_NEXT_PAGE_STATE_KEY = "__cpp_state"
CUSTOM_NEXT_PAGE_STRATEGY_FAMILY = "family_base_model"


def is_allowed_next_page(next_page):
    return not next_page or next_page.startswith(CIVITAI_IMAGES_URL)


def is_allowed_models_next_page(next_page):
    return not next_page or next_page.startswith(CIVITAI_MODELS_URL)


def describe_error(error):
    if isinstance(error, TimeoutError):
        return "Civitai request timed out. Try again or narrow the filters."
    message = str(error).strip()
    if message:
        return message
    return error.__class__.__name__


def normalize_base_model(base_model):
    text = str(base_model or "").strip()
    if not text:
        return ""

    compact = text.lower().replace("_", " ").replace("-", " ")
    compact = " ".join(compact.split())
    aliases = {
        "sdxl": "SDXL",
        "flux": "Flux",
        "flux1": "Flux",
        "flux 1": "Flux",
        "pony": "Pony",
        "anima": "Anima",
        "illustrious": "Illustrious",
        "noobai": "NoobAI",
        "noob ai": "NoobAI",
        "hidream": "HiDream",
        "hi dream": "HiDream",
        "sd 1.5": "SD 1.5",
        "sd1.5": "SD 1.5",
        "sd 2.0": "SD 2.0",
        "sd2.0": "SD 2.0",
        "sd 2.1": "SD 2.1",
        "sd2.1": "SD 2.1",
        "sdxl turbo": "SDXL Turbo",
        "sdxl lightning": "SDXL Lightning",
        "sd 3": "SD 3",
        "sd3": "SD 3",
        "sd 3.5": "SD 3.5",
        "sd3.5": "SD 3.5",
        "hunyuan": "Hunyuan",
        "hunyuan video": "Hunyuan Video",
        "hyv1": "Hunyuan Video",
        "pixarta": "PixArt a",
        "pixart a": "PixArt a",
        "playgroundv2": "Playground v2",
        "playground v2": "Playground v2",
        "stable cascade": "Stable Cascade",
        "scascade": "Stable Cascade",
        "kolors": "Kolors",
        "lumina": "Lumina",
        "wan": "Wan",
        "wanvideo": "Wan Video",
        "wan video": "Wan Video",
        "cosmos": "Cosmos",
        "zimage": "ZImage",
        "zimageturbo": "ZImageTurbo",
        "zimage turbo": "ZImageTurbo",
        "zimagebase": "ZImageBase",
        "zimage base": "ZImageBase",
    }
    if compact in aliases:
        return aliases[compact]

    return " ".join(word.upper() if word.isupper() else word.capitalize() for word in text.split())


def base_model_filter_key(base_model):
    text = normalize_base_model(base_model)
    lowered = re.sub(r"[^a-z0-9]+", " ", text.lower())
    return " ".join(lowered.split())


def base_model_matches_filter(item_base_model, wanted_base_model):
    wanted_key = base_model_filter_key(wanted_base_model)
    if not wanted_key:
        return True

    item_key = base_model_filter_key(item_base_model)
    if not item_key:
        return False

    return (
        item_key == wanted_key or
        item_key.startswith(f"{wanted_key} ") or
        (wanted_key in FAMILY_PREFIX_BASE_MODEL_KEYS and item_key.startswith(wanted_key))
    )


def apply_api_filter_aliases(filters):
    normalized = dict(filters or {})
    base_model = normalize_base_model(normalized.get("base_model", ""))
    normalized["base_model"] = (
        "" if base_model in LOCAL_ONLY_BASE_MODEL_FILTERS else base_model
    )
    return normalized


def normalize_tag_filters(value):
    if isinstance(value, (list, tuple, set)):
        raw_values = value
    else:
        raw_values = str(value or "").split(",")

    normalized = []
    seen = set()
    for raw_value in raw_values:
        text = str(raw_value or "").strip().upper()
        if not text or text not in TAG_FILTER_KEYWORDS or text in seen:
            continue
        seen.add(text)
        normalized.append(text)
    return normalized


def normalize_tag_search_text(text):
    normalized = re.sub(r"[^a-z0-9]+", " ", str(text or "").lower())
    return f" {' '.join(normalized.split())} "


def item_matches_tag_filter(item, selected_tag):
    keywords = TAG_FILTER_KEYWORDS.get(selected_tag, [])
    if not keywords:
        return True
    search_text = normalize_tag_search_text(item.get("prompt", ""))
    if not search_text.strip():
        return False
    return any(normalize_tag_search_text(keyword) in search_text for keyword in keywords)


def uses_sparse_local_filters(filters):
    normalized = dict(filters or {})
    base_model = normalize_base_model(normalized.get("base_model", ""))
    return bool(
        normalized.get("metadata_only")
        or normalized.get("nsfw") == "true"
        or base_model in LOCAL_ONLY_BASE_MODEL_FILTERS
        or normalize_tag_filters(normalized.get("tags", []))
        or normalize_tag_filters(normalized.get("block_tags", []))
        or normalize_aspect_ratio(normalized.get("aspect_ratio", ""))
        or normalize_min_resolution(normalized.get("min_resolution", ""))
        or normalize_max_resolution(normalized.get("max_resolution", ""))
    )


def get_upstream_request_limit(limit, filters):
    limit = max(1, int(limit))
    if not uses_sparse_local_filters(filters):
        return min(limit, MAX_UPSTREAM_PAGE_LIMIT)
    return min(MAX_UPSTREAM_PAGE_LIMIT, max(limit, limit * EXPANDED_UPSTREAM_LIMIT_MULTIPLIER))


def should_use_family_base_model_strategy(filters):
    normalized = dict(filters or {})
    base_model = normalize_base_model(normalized.get("base_model", ""))
    return bool(
        base_model in FAMILY_BASE_MODEL_QUERY_VALUES
        and not normalized.get("model_id")
        and not normalized.get("model_version_id")
    )


def get_family_image_request_limit(limit):
    limit = max(1, int(limit))
    return min(FAMILY_IMAGE_PAGE_LIMIT_MAX, max(FAMILY_IMAGE_PAGE_LIMIT_MIN, limit * 2))


def build_family_models_request_url(base_model, limit, next_page="", filters=None):
    if next_page:
        return next_page
    filters = filters or {}
    params = {
        "limit": str(max(1, int(limit))),
        "baseModels": str(base_model or "").strip(),
    }
    if filters.get("model_tag"):
        params["tag"] = str(filters["model_tag"]).strip()
    return f"{CIVITAI_MODELS_URL}?{urlencode(params)}"


def extract_family_model_version_ids(payload, allowed_base_models):
    version_ids = []
    seen = set()
    allowed = {normalize_base_model(value) for value in (allowed_base_models or []) if value}
    for item in payload.get("items", []):
        for version in item.get("modelVersions") or []:
            version_id = str(version.get("id") or "").strip()
            if not version_id or version_id in seen:
                continue
            if allowed and normalize_base_model(version.get("baseModel")) not in allowed:
                continue
            if not (version.get("images") or []):
                continue
            seen.add(version_id)
            version_ids.append(version_id)
    return version_ids


def encode_custom_next_page(strategy, state):
    encoded = base64.urlsafe_b64encode(
        json.dumps(state, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    ).decode("ascii").rstrip("=")
    return f"{CIVITAI_IMAGES_URL}?{urlencode({CUSTOM_NEXT_PAGE_STRATEGY_KEY: strategy, CUSTOM_NEXT_PAGE_STATE_KEY: encoded})}"


def decode_custom_next_page(next_page):
    if not next_page:
        return "", None

    parts = urlsplit(str(next_page))
    query_items = dict(parse_qsl(parts.query, keep_blank_values=True))
    strategy = query_items.get(CUSTOM_NEXT_PAGE_STRATEGY_KEY, "").strip()
    encoded_state = query_items.get(CUSTOM_NEXT_PAGE_STATE_KEY, "").strip()
    if not strategy or not encoded_state:
        return "", None

    padded = encoded_state + ("=" * ((4 - len(encoded_state) % 4) % 4))
    try:
        state = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
    except Exception as error:
        raise ValueError("Invalid next_page state") from error
    if not isinstance(state, dict):
        raise ValueError("Invalid next_page state")
    return strategy, state


def normalize_family_strategy_state(base_model, state):
    normalized_base_model = normalize_base_model(base_model)
    state = state or {}
    return {
        "base_model": normalize_base_model(state.get("base_model", normalized_base_model)) or normalized_base_model,
        "variant_index": max(0, safe_int(state.get("variant_index"), 0)),
        "models_next_page": str(state.get("models_next_page", "") or "").strip(),
        "pending_version_ids": [str(value).strip() for value in state.get("pending_version_ids", []) if str(value).strip()],
        "current_version_id": str(state.get("current_version_id", "") or "").strip(),
        "current_images_next_page": str(state.get("current_images_next_page", "") or "").strip(),
    }


def normalize_nsfw(value):
    text = str(value or "").strip()
    if not text:
        return ""

    aliases = {
        "true": "true",
        "false": "false",
        "yes": "true",
        "no": "false",
        "none": "None",
        "soft": "Soft",
        "mature": "Mature",
        "x": "X",
    }
    normalized = aliases.get(text.lower(), text)
    return normalized if normalized in ALLOWED_NSFW_VALUES else ""


def normalize_sort(value):
    text = str(value or "").strip()
    if not text:
        return ""

    aliases = {
        "most reactions": "Most Reactions",
        "most comments": "Most Comments",
        "most collected": "Most Collected",
        "newest": "Newest",
        "oldest": "Oldest",
    }
    normalized = aliases.get(text.lower(), text)
    return normalized if normalized in ALLOWED_SORT_VALUES else ""


def normalize_aspect_ratio(value):
    text = str(value or "").strip()
    if not text:
        return ""

    aliases = {
        "portrait": "PORTRAIT",
        "landscape": "LANDSCAPE",
        "square": "SQUARE",
    }
    normalized = aliases.get(text.lower(), text.upper())
    return normalized if normalized in ALLOWED_ASPECT_RATIO_VALUES else ""


def normalize_min_resolution(value):
    text = str(value or "").strip()
    if not text:
        return ""
    return text if text in ALLOWED_MIN_RESOLUTION_VALUES else ""


def normalize_max_resolution(value):
    text = str(value or "").strip()
    if not text:
        return ""
    return text if text in ALLOWED_MAX_RESOLUTION_VALUES else ""


def build_thumbnail_url(image_url, width=256):
    text = str(image_url or "").strip()
    if not text:
        return ""
    marker = "/original=true/"
    replacement = f"/width={int(width)}/"
    if marker in text:
        return text.replace(marker, replacement, 1)
    return text


def is_allowed_proxy_image_url(image_url):
    text = str(image_url or "").strip()
    if not text:
        return False

    parts = urlsplit(text)
    host = (parts.hostname or "").strip().lower()
    if parts.scheme != "https" or not host:
        return False
    return host == "civitai.com" or host.endswith(ALLOWED_PROXY_IMAGE_HOST_SUFFIX)


def build_image_proxy_url(image_url):
    text = str(image_url or "").strip()
    if not is_allowed_proxy_image_url(text):
        return ""
    return f"{IMAGE_PROXY_ROUTE}?{urlencode({'url': text})}"


def extract_meta_text(meta, *keys):
    for key in keys:
        value = meta.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return ""


def safe_int(value, default=0):
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return default
        try:
            return int(float(text))
        except ValueError:
            return default
    return default


def extract_size_fields(meta, item):
    size_text = extract_meta_text(meta, "Size", "size", "Resolution", "resolution")
    match = SIZE_PATTERN.match(size_text)
    if match:
        width_text, height_text = match.groups()
        return f"{width_text}x{height_text}", width_text, height_text

    width_value = safe_int(meta.get("width"), safe_int(item.get("width"), 0))
    height_value = safe_int(meta.get("height"), safe_int(item.get("height"), 0))
    width_text = str(width_value) if width_value > 0 else ""
    height_text = str(height_value) if height_value > 0 else ""
    if width_text and height_text:
        return f"{width_text}x{height_text}", width_text, height_text
    return "", width_text, height_text


def get_item_dimensions(item):
    width = safe_int(item.get("width"), safe_int(item.get("width_text"), 0))
    height = safe_int(item.get("height"), safe_int(item.get("height_text"), 0))
    return width, height


def item_matches_aspect_ratio(item, wanted_aspect_ratio):
    wanted = normalize_aspect_ratio(wanted_aspect_ratio)
    if not wanted:
        return True

    width, height = get_item_dimensions(item)
    if width <= 0 or height <= 0:
        return False

    if wanted == "PORTRAIT":
        return height > width * (1 + SQUARE_RATIO_TOLERANCE)
    if wanted == "LANDSCAPE":
        return width > height * (1 + SQUARE_RATIO_TOLERANCE)
    if wanted == "SQUARE":
        return abs((width / height) - 1.0) <= SQUARE_RATIO_TOLERANCE

    ratio_parts = wanted.split(":")
    if len(ratio_parts) != 2:
        return True

    try:
        target_ratio = float(ratio_parts[0]) / float(ratio_parts[1])
    except (TypeError, ValueError, ZeroDivisionError):
        return True
    actual_ratio = width / height
    return abs(actual_ratio - target_ratio) <= EXACT_RATIO_TOLERANCE


def item_matches_min_resolution(item, wanted_min_resolution):
    wanted = normalize_min_resolution(wanted_min_resolution)
    if not wanted:
        return True

    width, height = get_item_dimensions(item)
    if width <= 0 or height <= 0:
        return False
    return max(width, height) >= int(wanted)


def item_matches_max_resolution(item, wanted_max_resolution):
    wanted = normalize_max_resolution(wanted_max_resolution)
    if not wanted:
        return True

    width, height = get_item_dimensions(item)
    if width <= 0 or height <= 0:
        return False
    return max(width, height) <= int(wanted)


def extract_model_id_fields(item):
    model = item.get("model") or {}
    model_version = item.get("modelVersion") or {}
    model_version_model = model_version.get("model") or {}

    candidates = [
        item.get("modelId"),
        model.get("id") if isinstance(model, dict) else None,
        model_version.get("modelId") if isinstance(model_version, dict) else None,
        model_version_model.get("id") if isinstance(model_version_model, dict) else None,
    ]
    for candidate in candidates:
        value = str(candidate or "").strip()
        if value:
            return value
    return ""


def extract_model_name_fields(item):
    model = item.get("model") or {}
    model_version = item.get("modelVersion") or {}
    model_version_model = model_version.get("model") or {}

    candidates = [
        item.get("modelName"),
        model.get("name") if isinstance(model, dict) else None,
        model_version.get("modelName") if isinstance(model_version, dict) else None,
        model_version_model.get("name") if isinstance(model_version_model, dict) else None,
    ]
    for candidate in candidates:
        value = str(candidate or "").strip()
        if value:
            return value
    return ""


def extract_model_version_name_fields(item):
    model_version = item.get("modelVersion") or {}
    candidates = [
        item.get("modelVersionName"),
        model_version.get("name") if isinstance(model_version, dict) else None,
    ]
    for candidate in candidates:
        value = str(candidate or "").strip()
        if value:
            return value
    return ""


def normalize_civitai_item(item, thumbnail_width=192):
    meta = item.get("meta") or {}
    prompt = extract_meta_text(
        meta,
        "prompt",
        "Prompt",
        "positivePrompt",
        "positive_prompt",
        "Positive prompt",
        "positive prompt",
    )
    negative_prompt = extract_meta_text(
        meta,
        "negativePrompt",
        "negative_prompt",
        "Negative prompt",
        "negative prompt",
    )
    size_text, width_text, height_text = extract_size_fields(meta, item)
    image_url = item.get("url")
    image_id = item.get("id")
    if not image_url or image_id is None:
        return None

    thumbnail_url = build_thumbnail_url(image_url, width=thumbnail_width)
    model_version_ids = item.get("modelVersionIds") or []
    return {
        "id": str(image_id),
        "model_id": extract_model_id_fields(item),
        "model_name": extract_model_name_fields(item),
        "model_version_name": extract_model_version_name_fields(item),
        "username": str(item.get("username") or "").strip(),
        "post_id": str(item.get("postId") or "").strip(),
        "created_at": str(item.get("createdAt") or "").strip(),
        "image_url": image_url,
        "thumbnail_url": thumbnail_url,
        "image_proxy_url": build_image_proxy_url(image_url),
        "thumbnail_proxy_url": build_image_proxy_url(thumbnail_url),
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "has_metadata": bool(prompt or negative_prompt or size_text),
        "size_text": size_text,
        "width_text": width_text,
        "height_text": height_text,
        "width": safe_int(item.get("width"), 0),
        "height": safe_int(item.get("height"), 0),
        "nsfw": bool(item.get("nsfw")),
        "nsfw_level": str(item.get("nsfwLevel") or ""),
        "base_model": normalize_base_model(item.get("baseModel")),
        "model_version_ids": model_version_ids,
        "resolved_model_ids": [],
    }


def normalize_civitai_payload(payload, thumbnail_width=192):
    items = []
    for item in payload.get("items", []):
        normalized = normalize_civitai_item(item, thumbnail_width=thumbnail_width)
        if normalized:
            items.append(normalized)
    metadata = payload.get("metadata") or {}
    return {
        "items": items,
        "next_page": metadata.get("nextPage") or "",
    }


def pick_model_search_version(item):
    versions = item.get("modelVersions") or []
    for version in versions:
        if (version.get("images") or []) and version.get("id") is not None:
            return version
    for version in versions:
        if version.get("id") is not None:
            return version
    return {}


def normalize_civitai_model_search_item(item, thumbnail_width=192):
    model_id = item.get("id")
    name = str(item.get("name") or "").strip()
    if model_id is None or not name:
        return None

    version = pick_model_search_version(item)
    version_id = str(version.get("id") or "").strip()
    version_name = str(version.get("name") or "").strip()
    base_model = normalize_base_model(version.get("baseModel"))
    images = version.get("images") or []
    thumbnail_url = ""
    for image in images:
        url = str((image or {}).get("url") or "").strip()
        if url:
            thumbnail_url = build_thumbnail_url(url, width=thumbnail_width)
            break

    label_parts = [name]
    if version_name:
        label_parts.append(version_name)
    if base_model:
        label_parts.append(base_model)
    if version_id:
        label_parts.append(f"VID:{version_id}")

    return {
        "id": str(model_id),
        "name": name,
        "label": " · ".join(label_parts),
        "model_version_id": version_id,
        "model_version_name": version_name,
        "base_model": base_model,
        "thumbnail_url": thumbnail_url,
    }


def normalize_civitai_model_search_payload(payload, thumbnail_width=192):
    items = []
    for item in payload.get("items", []):
        normalized = normalize_civitai_model_search_item(item, thumbnail_width=thumbnail_width)
        if normalized:
            items.append(normalized)
    return {"items": items}


def parse_filters(query):
    period = str(query.get("period", "")).strip()
    if period not in ALLOWED_PERIODS:
        period = ""

    base_model = normalize_base_model(query.get("base_model", ""))
    metadata_only = str(query.get("metadata_only", "")).strip().lower() in {"1", "true", "yes", "on"}
    model_id = str(query.get("model_id", "")).strip()
    model_version_id = str(query.get("model_version_id", "")).strip()
    username = str(query.get("username", "")).strip()
    post_id = str(query.get("post_id", "")).strip()
    model_tag = str(query.get("model_tag", "")).strip()
    nsfw = normalize_nsfw(query.get("nsfw", ""))
    sort = normalize_sort(query.get("sort", ""))
    tags = normalize_tag_filters(query.get("tags", ""))
    block_tags = normalize_tag_filters(query.get("block_tags", ""))
    aspect_ratio = normalize_aspect_ratio(query.get("aspect_ratio", ""))
    min_resolution = normalize_min_resolution(query.get("min_resolution", ""))
    max_resolution = normalize_max_resolution(query.get("max_resolution", ""))

    return {
        "period": period,
        "base_model": base_model,
        "metadata_only": metadata_only,
        "model_id": model_id,
        "model_version_id": model_version_id,
        "username": username,
        "post_id": post_id,
        "model_tag": model_tag,
        "nsfw": nsfw,
        "sort": sort,
        "tags": tags,
        "block_tags": block_tags,
        "aspect_ratio": aspect_ratio,
        "min_resolution": min_resolution,
        "max_resolution": max_resolution,
    }


def append_filters_to_next_page(next_page, filters):
    if not next_page:
        return ""

    filters = apply_api_filter_aliases(filters)
    parts = urlsplit(next_page)
    query_items = dict(parse_qsl(parts.query, keep_blank_values=True))
    if filters.get("period"):
        query_items["period"] = filters["period"]
    if filters.get("base_model"):
        query_items["baseModel"] = filters["base_model"]
    if filters.get("model_id"):
        query_items["modelId"] = filters["model_id"]
    if filters.get("model_version_id"):
        query_items["modelVersionId"] = filters["model_version_id"]
    if filters.get("post_id"):
        query_items["postId"] = filters["post_id"]
    if filters.get("username"):
        query_items["username"] = filters["username"]
    if filters.get("nsfw"):
        query_items["nsfw"] = filters["nsfw"]
    if filters.get("sort"):
        query_items["sort"] = filters["sort"]
    return urlunsplit(
        (parts.scheme, parts.netloc, parts.path, urlencode(query_items), parts.fragment)
    )


def apply_local_filters(items, filters):
    filtered = []
    wanted_base_model = filters.get("base_model")
    wanted_model_version_id = filters.get("model_version_id")
    wanted_nsfw = filters.get("nsfw")
    wanted_tags = normalize_tag_filters(filters.get("tags", []))
    blocked_tags = normalize_tag_filters(filters.get("block_tags", []))
    wanted_aspect_ratio = normalize_aspect_ratio(filters.get("aspect_ratio", ""))
    wanted_min_resolution = normalize_min_resolution(filters.get("min_resolution", ""))
    wanted_max_resolution = normalize_max_resolution(filters.get("max_resolution", ""))

    for item in items:
        if filters.get("metadata_only") and not str(item.get("prompt") or "").strip():
            continue
        if wanted_base_model and not base_model_matches_filter(item.get("base_model"), wanted_base_model):
            continue
        if wanted_nsfw == "false" and item.get("nsfw"):
            continue
        if wanted_nsfw == "true" and not item.get("nsfw"):
            continue
        if wanted_nsfw in {"Soft", "Mature", "X"} and item.get("nsfw_level") != wanted_nsfw:
            continue
        if wanted_model_version_id and wanted_model_version_id not in {
            str(value) for value in item.get("model_version_ids", [])
        }:
            continue
        if wanted_aspect_ratio and not item_matches_aspect_ratio(item, wanted_aspect_ratio):
            continue
        if wanted_min_resolution and not item_matches_min_resolution(item, wanted_min_resolution):
            continue
        if wanted_max_resolution and not item_matches_max_resolution(item, wanted_max_resolution):
            continue
        if wanted_tags and not all(item_matches_tag_filter(item, selected_tag) for selected_tag in wanted_tags):
            continue
        if blocked_tags and any(item_matches_tag_filter(item, selected_tag) for selected_tag in blocked_tags):
            continue
        filtered.append(item)
    return filtered


def build_diagnostics(upstream_items, filtered_items, next_page, filters):
    upstream_count = len(upstream_items)
    filtered_count = len(filtered_items)
    metadata_filtered_count = 0
    if filters.get("metadata_only"):
        metadata_filtered_count = sum(
            1 for item in upstream_items if not str(item.get("prompt") or "").strip()
        )

    empty_reason = ""
    if filtered_count == 0:
        if upstream_count == 0:
            if filters.get("model_version_id"):
                empty_reason = "no_public_model_version_images"
            elif filters.get("model_id"):
                empty_reason = "no_public_model_images"
            elif (
                filters.get("base_model")
                or filters.get("period")
                or filters.get("nsfw")
                or filters.get("tags")
                or filters.get("block_tags")
                or filters.get("aspect_ratio")
                or filters.get("min_resolution")
                or filters.get("max_resolution")
            ):
                empty_reason = "no_images_for_filters"
            else:
                empty_reason = "no_images_returned"
        elif filters.get("metadata_only") and metadata_filtered_count == upstream_count:
            empty_reason = "metadata_only_filtered_all"
        else:
            empty_reason = "filtered_out_by_combination"

    return {
        "upstream_count": upstream_count,
        "visible_count": filtered_count,
        "metadata_filtered_count": metadata_filtered_count,
        "has_next_page": bool(next_page),
        "auth_mode": "authenticated" if filters.get("api_key") else "anonymous",
        "empty_reason": empty_reason,
    }


def build_request_headers(filters):
    headers = dict(DEFAULT_HEADERS)
    api_key = str(filters.get("api_key", "")).strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


def extend_unique_items(target, items, seen_ids):
    for item in items:
        item_id = str(item.get("id") or "")
        if item_id and item_id in seen_ids:
            continue
        if item_id:
            seen_ids.add(item_id)
        target.append(item)


async def fetch_json(url, session):
    last_error = None
    for attempt in range(FETCH_RETRY_ATTEMPTS):
        try:
            async with session.get(url) as response:
                if response.status in {401, 403}:
                    raise PermissionError(
                        "Civitai rejected the request. Check the API Key or whether the content requires login/NSFW visibility."
                    )
                response.raise_for_status()
                return await response.json()
        except PermissionError:
            raise
        except (TimeoutError, ClientError) as error:
            last_error = error
            if attempt >= FETCH_RETRY_ATTEMPTS - 1:
                raise
            await asyncio.sleep(FETCH_RETRY_DELAY_SECONDS * (attempt + 1))

    if last_error:
        raise last_error
    raise RuntimeError("Civitai request failed without a response.")


def _fetch_binary_sync(url):
    response = requests.get(
        url,
        headers=DEFAULT_HEADERS,
        timeout=(IMAGE_PROXY_UPSTREAM_TIMEOUT_SECONDS, IMAGE_PROXY_UPSTREAM_TIMEOUT_SECONDS),
    )
    if response.status_code in {401, 403}:
        raise PermissionError(
            "Civitai rejected the image request. Check the API Key or visibility settings."
        )
    response.raise_for_status()
    content_type = str(response.headers.get("Content-Type") or "").split(";", 1)[0].strip()
    if not content_type.startswith("image/"):
        raise ValueError("Upstream response was not an image.")
    return {
        "body": response.content,
        "content_type": content_type,
        "etag": str(response.headers.get("ETag") or "").strip(),
        "last_modified": str(response.headers.get("Last-Modified") or "").strip(),
    }


async def fetch_binary(url):
    last_error = None
    for attempt in range(FETCH_RETRY_ATTEMPTS):
        try:
            return await asyncio.to_thread(_fetch_binary_sync, url)
        except PermissionError:
            raise
        except ValueError:
            raise
        except requests.Timeout as error:
            last_error = TimeoutError("Civitai image request timed out.")
            if attempt >= FETCH_RETRY_ATTEMPTS - 1:
                break
            await asyncio.sleep(FETCH_RETRY_DELAY_SECONDS * (attempt + 1))
        except (requests.RequestException, TimeoutError, ClientError, asyncio.TimeoutError) as error:
            last_error = TimeoutError("Civitai image request timed out.") if isinstance(
                error, asyncio.TimeoutError
            ) else error
            if attempt >= FETCH_RETRY_ATTEMPTS - 1:
                break
            await asyncio.sleep(FETCH_RETRY_DELAY_SECONDS * (attempt + 1))

    if last_error:
        raise last_error
    raise RuntimeError("Civitai image request failed without a response.")


async def resolve_model_id(model_version_id, session):
    details = await resolve_model_version_details(model_version_id, session)
    return str(details.get("model_id") or "").strip()


def normalize_model_version_details(payload):
    if not isinstance(payload, dict):
        return {
            "model_id": "",
            "model_name": "",
            "model_version_name": "",
        }

    model = payload.get("model") or {}
    candidates_model_id = [
        payload.get("modelId"),
        model.get("id") if isinstance(model, dict) else None,
    ]
    candidates_model_name = [
        payload.get("modelName"),
        model.get("name") if isinstance(model, dict) else None,
    ]
    model_id = ""
    model_name = ""
    for candidate in candidates_model_id:
        value = str(candidate or "").strip()
        if value:
            model_id = value
            break
    for candidate in candidates_model_name:
        value = str(candidate or "").strip()
        if value:
            model_name = value
            break

    return {
        "model_id": model_id,
        "model_name": model_name,
        "model_version_name": str(payload.get("name") or "").strip(),
    }


async def resolve_model_version_details(model_version_id, session):
    model_version_id = str(model_version_id)
    if model_version_id in MODEL_VERSION_DETAILS_CACHE:
        return MODEL_VERSION_DETAILS_CACHE[model_version_id]

    payload = await fetch_json(f"{CIVITAI_MODEL_VERSION_URL}/{model_version_id}", session)
    details = normalize_model_version_details(payload)
    MODEL_VERSION_DETAILS_CACHE[model_version_id] = details
    MODEL_VERSION_TO_MODEL_ID_CACHE[model_version_id] = details["model_id"]
    return details


def item_needs_model_version_details(item):
    if not item.get("model_version_ids"):
        return False
    return not (
        str(item.get("model_id") or "").strip()
        and str(item.get("model_name") or "").strip()
        and str(item.get("model_version_name") or "").strip()
    )


async def enrich_with_model_ids(items, session):
    tasks = {}
    for item in items:
        needs_details = item_needs_model_version_details(item)
        for model_version_id in item.get("model_version_ids", []):
            key = str(model_version_id)
            if not key or not needs_details:
                continue
            if key in tasks or key in MODEL_VERSION_DETAILS_CACHE:
                continue
            tasks[key] = resolve_model_version_details(key, session)

    if tasks:
        results = await __import__("asyncio").gather(*tasks.values(), return_exceptions=True)
        for key, result in zip(tasks.keys(), results):
            if isinstance(result, Exception):
                MODEL_VERSION_DETAILS_CACHE[key] = {
                    "model_id": "",
                    "model_name": "",
                    "model_version_name": "",
                }
                MODEL_VERSION_TO_MODEL_ID_CACHE[key] = ""
            else:
                MODEL_VERSION_DETAILS_CACHE[key] = result
                MODEL_VERSION_TO_MODEL_ID_CACHE[key] = str(result.get("model_id") or "").strip()

    for item in items:
        model_id = str(item.get("model_id") or "").strip()
        model_name = str(item.get("model_name") or "").strip()
        model_version_name = str(item.get("model_version_name") or "").strip()
        resolved = []
        if model_id:
            resolved.append(model_id)
        for model_version_id in item.get("model_version_ids", []):
            details = MODEL_VERSION_DETAILS_CACHE.get(str(model_version_id), {})
            resolved_model_id = str(details.get("model_id") or "").strip()
            if resolved_model_id:
                resolved.append(resolved_model_id)
                if not model_id:
                    model_id = resolved_model_id
            if not model_name:
                model_name = str(details.get("model_name") or "").strip()
            if not model_version_name:
                model_version_name = str(details.get("model_version_name") or "").strip()
        item["model_id"] = model_id
        item["model_name"] = model_name
        item["model_version_name"] = model_version_name
        item["resolved_model_ids"] = sorted(set(resolved))


def build_request_url(limit, next_page, filters):
    filters = apply_api_filter_aliases(filters)
    if next_page:
        return append_filters_to_next_page(next_page, filters)

    params = {"limit": str(int(limit))}
    if filters.get("period"):
        params["period"] = filters["period"]
    if filters.get("base_model"):
        params["baseModel"] = filters["base_model"]
    if filters.get("model_id"):
        params["modelId"] = filters["model_id"]
    if filters.get("model_version_id"):
        params["modelVersionId"] = filters["model_version_id"]
    if filters.get("post_id"):
        params["postId"] = filters["post_id"]
    if filters.get("username"):
        params["username"] = filters["username"]
    if filters.get("nsfw"):
        params["nsfw"] = "X" if filters["nsfw"] == "true" else filters["nsfw"]
    if filters.get("sort"):
        params["sort"] = filters["sort"]
    return f"{CIVITAI_IMAGES_URL}?{urlencode(params)}"


def build_models_request_url(query, limit, filters=None):
    filters = filters or {}
    params = {
        "limit": str(max(1, int(limit))),
        "query": str(query or "").strip(),
    }
    if filters.get("model_tag"):
        params["tag"] = str(filters["model_tag"]).strip()
    if filters.get("username"):
        params["username"] = str(filters["username"]).strip()
    return f"{CIVITAI_MODELS_URL}?{urlencode(params)}"


async def fetch_family_base_model_images(limit=12, next_page="", filters=None):
    filters = filters or {}
    strategy, decoded_state = decode_custom_next_page(next_page)
    base_model = normalize_base_model(
        filters.get("base_model", "") or (decoded_state or {}).get("base_model", "")
    )
    family_values = FAMILY_BASE_MODEL_QUERY_VALUES.get(base_model, [])
    if not family_values:
        return {
            "items": [],
            "next_page": "",
            "diagnostics": build_diagnostics([], [], "", filters),
        }

    state = normalize_family_strategy_state(
        base_model,
        decoded_state if strategy == CUSTOM_NEXT_PAGE_STRATEGY_FAMILY else None,
    )
    if not is_allowed_models_next_page(state["models_next_page"]):
        raise ValueError("Invalid next_page URL")
    if not is_allowed_next_page(state["current_images_next_page"]):
        raise ValueError("Invalid next_page URL")

    family_filters = dict(filters)
    family_filters["base_model"] = ""
    family_filters["model_id"] = ""
    family_filters["model_version_id"] = ""

    async with ClientSession(
        timeout=DEFAULT_TIMEOUT,
        headers=build_request_headers(filters),
    ) as session:
        aggregated_upstream_items = []
        aggregated_visible_items = []
        seen_upstream_ids = set()
        seen_visible_ids = set()
        source_requests_remaining = MAX_FAMILY_SOURCE_REQUESTS_PER_RESULT_PAGE

        while source_requests_remaining > 0 and len(aggregated_visible_items) < limit:
            if state["current_version_id"]:
                version_filters = dict(family_filters)
                version_filters["model_version_id"] = state["current_version_id"]
                request_url = build_request_url(
                    limit=get_family_image_request_limit(limit),
                    next_page=state["current_images_next_page"],
                    filters=version_filters,
                )
                payload = await fetch_json(request_url, session)
                normalized = normalize_civitai_payload(payload)
                upstream_items = normalized["items"]
                for item in upstream_items:
                    if not item.get("model_version_ids"):
                        item["model_version_ids"] = [state["current_version_id"]]

                visible_items = apply_local_filters(upstream_items, filters)
                await enrich_with_model_ids(visible_items, session)
                extend_unique_items(aggregated_upstream_items, upstream_items, seen_upstream_ids)
                extend_unique_items(aggregated_visible_items, visible_items, seen_visible_ids)

                state["current_images_next_page"] = normalized["next_page"] or ""
                if not state["current_images_next_page"]:
                    state["current_version_id"] = ""

                source_requests_remaining -= 1
                continue

            if state["pending_version_ids"]:
                state["current_version_id"] = state["pending_version_ids"].pop(0)
                state["current_images_next_page"] = ""
                continue

            if state["variant_index"] >= len(family_values):
                break

            request_url = build_family_models_request_url(
                family_values[state["variant_index"]],
                FAMILY_MODEL_PAGE_LIMIT,
                next_page=state["models_next_page"],
                filters=filters,
            )
            payload = await fetch_json(request_url, session)
            version_ids = extract_family_model_version_ids(
                payload,
                [family_values[state["variant_index"]]],
            )
            state["pending_version_ids"].extend(version_id for version_id in version_ids if version_id not in state["pending_version_ids"])

            metadata = payload.get("metadata") or {}
            state["models_next_page"] = str(metadata.get("nextPage") or "").strip()
            if not state["models_next_page"]:
                state["variant_index"] += 1

            source_requests_remaining -= 1

    has_more = bool(
        state["current_version_id"]
        or state["current_images_next_page"]
        or state["pending_version_ids"]
        or state["models_next_page"]
        or state["variant_index"] < len(family_values)
    )
    next_page = (
        encode_custom_next_page(CUSTOM_NEXT_PAGE_STRATEGY_FAMILY, state)
        if has_more
        else ""
    )
    return {
        "items": aggregated_visible_items,
        "next_page": next_page,
        "diagnostics": build_diagnostics(
            aggregated_upstream_items,
            aggregated_visible_items,
            next_page,
            filters,
        ),
    }


async def fetch_civitai_images(limit=12, next_page="", filters=None):
    filters = filters or {}
    if not is_allowed_next_page(next_page):
        raise ValueError("Invalid next_page URL")

    strategy, _ = decode_custom_next_page(next_page)
    if strategy and strategy != CUSTOM_NEXT_PAGE_STRATEGY_FAMILY:
        raise ValueError("Invalid next_page URL")
    if strategy == CUSTOM_NEXT_PAGE_STRATEGY_FAMILY or should_use_family_base_model_strategy(filters):
        return await fetch_family_base_model_images(limit=limit, next_page=next_page, filters=filters)

    async with ClientSession(
        timeout=DEFAULT_TIMEOUT,
        headers=build_request_headers(filters),
    ) as session:
        aggregated_upstream_items = []
        aggregated_visible_items = []
        seen_upstream_ids = set()
        seen_visible_ids = set()
        current_next_page = next_page
        request_limit = get_upstream_request_limit(limit, filters)

        for _ in range(MAX_SOURCE_PAGES_PER_RESULT_PAGE):
            request_url = build_request_url(limit=request_limit, next_page=current_next_page, filters=filters)
            payload = await fetch_json(request_url, session)
            normalized = normalize_civitai_payload(payload)

            upstream_items = normalized["items"]
            visible_items = apply_local_filters(upstream_items, filters)
            await enrich_with_model_ids(visible_items, session)
            extend_unique_items(aggregated_upstream_items, upstream_items, seen_upstream_ids)
            extend_unique_items(aggregated_visible_items, visible_items, seen_visible_ids)

            current_next_page = normalized["next_page"] or ""
            if not current_next_page or len(aggregated_visible_items) >= limit:
                break

    next_page = append_filters_to_next_page(current_next_page, filters)
    return {
        "items": aggregated_visible_items,
        "next_page": next_page,
        "diagnostics": build_diagnostics(
            aggregated_upstream_items,
            aggregated_visible_items,
            next_page,
            filters,
        ),
    }


async def fetch_civitai_models(query, limit=8, filters=None):
    query = str(query or "").strip()
    if not query:
        return {"items": []}

    filters = filters or {}
    async with ClientSession(
        timeout=DEFAULT_TIMEOUT,
        headers=build_request_headers(filters),
    ) as session:
        payload = await fetch_json(build_models_request_url(query, limit, filters=filters), session)
    return normalize_civitai_model_search_payload(payload)


async def _handle_civitai_images(request, fetcher):
    next_page = request.rel_url.query.get("next_page", "")
    if not is_allowed_next_page(next_page):
        return web.json_response({"error": "invalid next_page"}, status=400)

    limit = request.rel_url.query.get("limit", "12")
    try:
        limit = max(1, min(120, int(limit)))
    except ValueError:
        limit = 12

    filters = parse_filters(request.rel_url.query)
    filters["api_key"] = request.headers.get("X-Civitai-Api-Key", "").strip()

    try:
        payload = await fetcher(limit=limit, next_page=next_page, filters=filters)
        return web.json_response(payload)
    except ValueError as error:
        return web.json_response({"error": describe_error(error)}, status=400)
    except PermissionError as error:
        return web.json_response({"error": describe_error(error)}, status=403)
    except TimeoutError as error:
        return web.json_response({"error": describe_error(error)}, status=504)
    except Exception as error:
        return web.json_response({"error": describe_error(error)}, status=502)


async def _handle_civitai_models(request, model_fetcher):
    query = request.rel_url.query.get("query", "").strip()
    limit = request.rel_url.query.get("limit", "8")
    try:
        limit = max(1, min(20, int(limit)))
    except ValueError:
        limit = 8

    parsed_filters = parse_filters(request.rel_url.query)
    filters = {
        "api_key": request.headers.get("X-Civitai-Api-Key", "").strip(),
        "model_tag": parsed_filters.get("model_tag", ""),
    }
    if parsed_filters.get("username"):
        filters["username"] = parsed_filters["username"]

    try:
        payload = await model_fetcher(query=query, limit=limit, filters=filters)
        return web.json_response(payload)
    except ValueError as error:
        return web.json_response({"error": describe_error(error)}, status=400)
    except PermissionError as error:
        return web.json_response({"error": describe_error(error)}, status=403)
    except TimeoutError as error:
        return web.json_response({"error": describe_error(error)}, status=504)
    except Exception as error:
        return web.json_response({"error": describe_error(error)}, status=502)


async def _handle_civitai_image_proxy(request):
    image_url = request.rel_url.query.get("url", "").strip()
    if not is_allowed_proxy_image_url(image_url):
        return web.json_response({"error": "invalid image url"}, status=400)

    try:
        payload = await fetch_binary(image_url)
        headers = {
            "Cache-Control": f"public, max-age={IMAGE_PROXY_CACHE_SECONDS}",
        }
        if payload["etag"]:
            headers["ETag"] = payload["etag"]
        if payload["last_modified"]:
            headers["Last-Modified"] = payload["last_modified"]
        return web.Response(body=payload["body"], content_type=payload["content_type"], headers=headers)
    except ValueError as error:
        return web.json_response({"error": describe_error(error)}, status=415)
    except PermissionError as error:
        return web.json_response({"error": describe_error(error)}, status=403)
    except TimeoutError as error:
        return web.json_response({"error": describe_error(error)}, status=504)
    except Exception as error:
        return web.json_response({"error": describe_error(error)}, status=502)


def add_prompt_picker_routes(routes, fetcher=fetch_civitai_images, model_fetcher=fetch_civitai_models):
    @routes.get("/civitai-prompt-picker/images")
    async def get_civitai_images(request):
        return await _handle_civitai_images(request, fetcher)

    @routes.get("/civitai-prompt-picker/models")
    async def get_civitai_models(request):
        return await _handle_civitai_models(request, model_fetcher)

    @routes.get(IMAGE_PROXY_ROUTE)
    async def get_civitai_image_proxy(request):
        return await _handle_civitai_image_proxy(request)

    return get_civitai_images


_ROUTES_REGISTERED = False


def register_prompt_picker_routes():
    global _ROUTES_REGISTERED
    if _ROUTES_REGISTERED:
        return

    from server import PromptServer

    add_prompt_picker_routes(PromptServer.instance.routes)
    _ROUTES_REGISTERED = True
