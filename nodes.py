import io

import numpy as np
import requests
import torch
from PIL import Image, ImageOps


class CivitaiPromptPicker:
    REQUEST_HEADERS = {"User-Agent": "ComfyUI-CivitaiPromptPicker/1.0"}
    REQUEST_TIMEOUT_SECONDS = 35
    RESIZED_FALLBACK_WIDTH = 1024

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
                return torch.from_numpy(image_array).unsqueeze(0)
            except Exception as error:
                last_error = error

        if last_error is not None:
            raise last_error
        raise ValueError("Missing image URL")

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
            }
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
    ):
        _ = (limit, selected_image_id, next_page)
        width_value = self._parse_dimension(selected_width_text)
        height_value = self._parse_dimension(selected_height_text)
        image_tensor = self._empty_image_tensor()
        if str(selected_image_url or "").strip():
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
