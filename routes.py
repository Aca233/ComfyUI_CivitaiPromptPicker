import asyncio
import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from aiohttp import ClientError, ClientSession, ClientTimeout, web


CIVITAI_IMAGES_URL = "https://civitai.com/api/v1/images"
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
DEFAULT_TIMEOUT = ClientTimeout(total=35)
DEFAULT_HEADERS = {"User-Agent": "ComfyUI-CivitaiPromptPicker/1.0"}
MODEL_VERSION_TO_MODEL_ID_CACHE = {}
SIZE_PATTERN = re.compile(r"^\s*(\d+)\s*[xX]\s*(\d+)\s*$")
FETCH_RETRY_ATTEMPTS = 3
FETCH_RETRY_DELAY_SECONDS = 1.0
MAX_SOURCE_PAGES_PER_RESULT_PAGE = 8
EXPANDED_UPSTREAM_LIMIT_MULTIPLIER = 5
MAX_UPSTREAM_PAGE_LIMIT = 120
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
    "Hunyuan",
    "Wan",
}


def is_allowed_next_page(next_page):
    return not next_page or next_page.startswith(CIVITAI_IMAGES_URL)


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
        "pony": "Pony",
        "sd 1.5": "SD 1.5",
        "sd1.5": "SD 1.5",
        "sdxl turbo": "SDXL Turbo",
        "sd 3": "SD 3",
        "sd3": "SD 3",
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

    return item_key == wanted_key or item_key.startswith(f"{wanted_key} ")


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
    )


def get_upstream_request_limit(limit, filters):
    limit = max(1, int(limit))
    if not uses_sparse_local_filters(filters):
        return min(limit, MAX_UPSTREAM_PAGE_LIMIT)
    return min(MAX_UPSTREAM_PAGE_LIMIT, max(limit, limit * EXPANDED_UPSTREAM_LIMIT_MULTIPLIER))


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


def build_thumbnail_url(image_url, width=256):
    text = str(image_url or "").strip()
    if not text:
        return ""
    marker = "/original=true/"
    replacement = f"/width={int(width)}/"
    if marker in text:
        return text.replace(marker, replacement, 1)
    return text


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


def normalize_civitai_item(item, thumbnail_width=192):
    meta = item.get("meta") or {}
    prompt = meta.get("prompt") or ""
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

    model_version_ids = item.get("modelVersionIds") or []
    return {
        "id": str(image_id),
        "image_url": image_url,
        "thumbnail_url": build_thumbnail_url(image_url, width=thumbnail_width),
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


def parse_filters(query):
    period = str(query.get("period", "")).strip()
    if period not in ALLOWED_PERIODS:
        period = ""

    base_model = normalize_base_model(query.get("base_model", ""))
    metadata_only = str(query.get("metadata_only", "")).strip().lower() in {"1", "true", "yes", "on"}
    model_id = str(query.get("model_id", "")).strip()
    model_version_id = str(query.get("model_version_id", "")).strip()
    nsfw = normalize_nsfw(query.get("nsfw", ""))
    sort = normalize_sort(query.get("sort", ""))
    tags = normalize_tag_filters(query.get("tags", ""))

    return {
        "period": period,
        "base_model": base_model,
        "metadata_only": metadata_only,
        "model_id": model_id,
        "model_version_id": model_version_id,
        "nsfw": nsfw,
        "sort": sort,
        "tags": tags,
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

    for item in items:
        if filters.get("metadata_only") and not item.get("has_metadata"):
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
        if wanted_tags and not all(item_matches_tag_filter(item, selected_tag) for selected_tag in wanted_tags):
            continue
        filtered.append(item)
    return filtered


def build_diagnostics(upstream_items, filtered_items, next_page, filters):
    upstream_count = len(upstream_items)
    filtered_count = len(filtered_items)
    metadata_filtered_count = 0
    if filters.get("metadata_only"):
        metadata_filtered_count = sum(1 for item in upstream_items if not item.get("has_metadata"))

    empty_reason = ""
    if filtered_count == 0:
        if upstream_count == 0:
            if filters.get("model_version_id"):
                empty_reason = "no_public_model_version_images"
            elif filters.get("model_id"):
                empty_reason = "no_public_model_images"
            elif filters.get("base_model") or filters.get("period") or filters.get("nsfw") or filters.get("tags"):
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


async def resolve_model_id(model_version_id, session):
    model_version_id = str(model_version_id)
    if model_version_id in MODEL_VERSION_TO_MODEL_ID_CACHE:
        return MODEL_VERSION_TO_MODEL_ID_CACHE[model_version_id]

    payload = await fetch_json(f"{CIVITAI_MODEL_VERSION_URL}/{model_version_id}", session)
    model_id = (payload.get("modelId") if isinstance(payload, dict) else None) or ""
    model_id = str(model_id) if model_id else ""
    MODEL_VERSION_TO_MODEL_ID_CACHE[model_version_id] = model_id
    return model_id


async def enrich_with_model_ids(items, session):
    tasks = {}
    for item in items:
        for model_version_id in item.get("model_version_ids", []):
            key = str(model_version_id)
            if key and key not in tasks and key not in MODEL_VERSION_TO_MODEL_ID_CACHE:
                tasks[key] = resolve_model_id(key, session)

    if tasks:
        results = await __import__("asyncio").gather(*tasks.values(), return_exceptions=True)
        for key, result in zip(tasks.keys(), results):
            if isinstance(result, Exception):
                MODEL_VERSION_TO_MODEL_ID_CACHE[key] = ""
            else:
                MODEL_VERSION_TO_MODEL_ID_CACHE[key] = result

    for item in items:
        resolved = []
        for model_version_id in item.get("model_version_ids", []):
            model_id = MODEL_VERSION_TO_MODEL_ID_CACHE.get(str(model_version_id), "")
            if model_id:
                resolved.append(model_id)
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
    if filters.get("nsfw"):
        params["nsfw"] = "X" if filters["nsfw"] == "true" else filters["nsfw"]
    if filters.get("sort"):
        params["sort"] = filters["sort"]
    return f"{CIVITAI_IMAGES_URL}?{urlencode(params)}"


async def fetch_civitai_images(limit=12, next_page="", filters=None):
    filters = filters or {}
    if not is_allowed_next_page(next_page):
        raise ValueError("Invalid next_page URL")

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


def add_prompt_picker_routes(routes, fetcher=fetch_civitai_images):
    @routes.get("/civitai-prompt-picker/images")
    async def get_civitai_images(request):
        return await _handle_civitai_images(request, fetcher)

    return get_civitai_images


_ROUTES_REGISTERED = False


def register_prompt_picker_routes():
    global _ROUTES_REGISTERED
    if _ROUTES_REGISTERED:
        return

    from server import PromptServer

    add_prompt_picker_routes(PromptServer.instance.routes)
    _ROUTES_REGISTERED = True
