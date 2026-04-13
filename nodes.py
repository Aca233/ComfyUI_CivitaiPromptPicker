class CivitaiPromptPicker:
    @staticmethod
    def _parse_dimension(value):
        try:
            parsed = int(str(value or "").strip())
        except (TypeError, ValueError):
            return 0
        return parsed if parsed > 0 else 0

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
            }
        }

    RETURN_TYPES = ("STRING", "STRING", "INT", "INT")
    RETURN_NAMES = ("prompt", "negative_prompt", "width", "height")
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
    ):
        _ = (limit, selected_image_id, next_page)
        width_value = self._parse_dimension(selected_width_text)
        height_value = self._parse_dimension(selected_height_text)
        return (
            selected_prompt or "",
            selected_negative_prompt or "",
            width_value,
            height_value,
        )


NODE_CLASS_MAPPINGS = {
    "Civitai Prompt Picker": CivitaiPromptPicker,
}


NODE_DISPLAY_NAME_MAPPINGS = {
    "Civitai Prompt Picker": "Civitai Prompt Picker",
}
