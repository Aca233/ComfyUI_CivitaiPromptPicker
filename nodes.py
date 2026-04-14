import io
from collections import OrderedDict

import numpy as np
import requests
import torch
from PIL import Image, ImageOps


class CivitaiPromptPicker:
    REQUEST_HEADERS = {"User-Agent": "ComfyUI-CivitaiPromptPicker/1.0"}
    REQUEST_TIMEOUT_SECONDS = 35
    RESIZED_FALLBACK_WIDTH = 1024
    IMAGE_CACHE_MAX_ITEMS = 8
    IMAGE_OUTPUT_INDEX = 4
    _image_tensor_cache = OrderedDict()

    @staticmethod
    def _parse_dimension(value):
        try:
            parsed = int(str(value or "").strip())
        except (TypeError, ValueError):
            return 0
        return parsed if parsed > 0 else 0

    @staticmethod
    def _empty_image_tensor():
        return torch.zeros((1, 1, 1, 3), dtype=torch.float32)

    @classmethod
    def _get_cached_image_tensor(cls, image_url):
        cache_key = str(image_url or "").strip()
        if not cache_key:
            return None
        cached = cls._image_tensor_cache.get(cache_key)
        if cached is None:
            return None
        cls._image_tensor_cache.move_to_end(cache_key)
        return cached

    @classmethod
    def _store_cached_image_tensor(cls, image_url, image_tensor):
        cache_key = str(image_url or "").strip()
        if not cache_key or image_tensor is None:
            return
        cls._image_tensor_cache[cache_key] = image_tensor
        cls._image_tensor_cache.move_to_end(cache_key)
        while len(cls._image_tensor_cache) > cls.IMAGE_CACHE_MAX_ITEMS:
            cls._image_tensor_cache.popitem(last=False)

    @classmethod
    def _candidate_image_urls(cls, image_url):
        text = str(image_url or "").strip()
        if not text:
            return []

        candidates = [text]
        original_marker = "/original=true/"
        resized_marker = f"/width={cls.RESIZED_FALLBACK_WIDTH}/"
        if original_marker in text:
            candidates.append(text.replace(original_marker, resized_marker, 1))
        return candidates

    @classmethod
    def _load_image_tensor_from_url(cls, image_url):
        cached = cls._get_cached_image_tensor(image_url)
        if cached is not None:
            return cached

        last_error = None
        for candidate_url in cls._candidate_image_urls(image_url):
            try:
                response = requests.get(
                    candidate_url,
                    headers=cls.REQUEST_HEADERS,
                    timeout=cls.REQUEST_TIMEOUT_SECONDS,
                )
                response.raise_for_status()
                with Image.open(io.BytesIO(response.content)) as image:
                    normalized_image = ImageOps.exif_transpose(image).convert("RGB")
                    image_array = np.asarray(normalized_image, dtype=np.float32) / 255.0
                image_tensor = torch.from_numpy(image_array).unsqueeze(0)
                cls._store_cached_image_tensor(image_url, image_tensor)
                return image_tensor
            except Exception as error:
                last_error = error

        if last_error is not None:
            raise last_error
        raise ValueError("Missing image URL")

    @staticmethod
    def _candidate_prompt_node_ids(unique_id):
        text = str(unique_id or "").strip()
        if not text:
            return []

        candidates = [text]
        if "." in text:
            parts = [part for part in text.split(".") if part]
            if parts:
                candidates.extend([parts[0], parts[-1]])
        seen = set()
        normalized = []
        for candidate in candidates:
            value = str(candidate or "").strip()
            if value and value not in seen:
                seen.add(value)
                normalized.append(value)
        return normalized

    @classmethod
    def _contains_output_link(cls, value, node_id, output_index):
        if isinstance(value, (list, tuple)):
            if (
                len(value) == 2
                and str(value[0]) == str(node_id)
                and value[1] == output_index
            ):
                return True
            return any(
                cls._contains_output_link(item, node_id, output_index) for item in value
            )
        if isinstance(value, dict):
            return any(
                cls._contains_output_link(item, node_id, output_index)
                for item in value.values()
            )
        return False

    @classmethod
    def _is_output_connected(cls, prompt, unique_id, output_index):
        if not isinstance(prompt, dict):
            return True

        candidate_ids = cls._candidate_prompt_node_ids(unique_id)
        if not candidate_ids:
            return True

        node_id = next((candidate for candidate in candidate_ids if candidate in prompt), None)
        if node_id is None:
            return True

        for node in prompt.values():
            if not isinstance(node, dict):
                continue
            inputs = node.get("inputs")
            if not isinstance(inputs, dict):
                continue
            if cls._contains_output_link(inputs, node_id, output_index):
                return True
        return False

    @classmethod
    def _should_load_selected_image(cls, selected_image_url, prompt=None, unique_id=None):
        if not str(selected_image_url or "").strip():
            return False
        return cls._is_output_connected(prompt, unique_id, cls.IMAGE_OUTPUT_INDEX)

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "limit": ("INT", {"default": 12, "min": 1, "max": 60, "step": 1}),
                "selected_prompt": ("STRING", {"multiline": True, "default": ""}),
                "selected_negative_prompt": ("STRING", {"multiline": True, "default": ""}),
                "selected_width_text": ("STRING", {"default": ""}),
                "selected_height_text": ("STRING", {"default": ""}),
                "selected_image_id": ("STRING", {"default": ""}),
                "next_page": ("STRING", {"default": ""}),
                "selected_image_url": ("STRING", {"default": ""}),
            },
            "hidden": {
                "prompt": "PROMPT",
                "unique_id": "UNIQUE_ID",
            },
        }

    RETURN_TYPES = ("STRING", "STRING", "INT", "INT", "IMAGE")
    RETURN_NAMES = ("prompt", "negative_prompt", "width", "height", "image")
    FUNCTION = "pick_prompt"
    CATEGORY = "text/Civitai"

    def pick_prompt(
        self,
        limit,
        selected_prompt,
        selected_negative_prompt,
        selected_width_text,
        selected_height_text,
        selected_image_id,
        next_page,
        selected_image_url,
        prompt=None,
        unique_id=None,
    ):
        _ = (limit, selected_image_id, next_page)
        width_value = self._parse_dimension(selected_width_text)
        height_value = self._parse_dimension(selected_height_text)
        image_tensor = self._empty_image_tensor()
        if self._should_load_selected_image(
            selected_image_url,
            prompt=prompt,
            unique_id=unique_id,
        ):
            try:
                image_tensor = self._load_image_tensor_from_url(selected_image_url)
            except Exception:
                image_tensor = self._empty_image_tensor()
        return (
            selected_prompt or "",
            selected_negative_prompt or "",
            width_value,
            height_value,
            image_tensor,
        )


NODE_CLASS_MAPPINGS = {
    "Civitai Prompt Picker": CivitaiPromptPicker,
}


NODE_DISPLAY_NAME_MAPPINGS = {
    "Civitai Prompt Picker": "Civitai Prompt Picker",
}
