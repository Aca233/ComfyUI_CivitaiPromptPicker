from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS
from .routes import register_prompt_picker_routes


WEB_DIRECTORY = "./web"

try:
    register_prompt_picker_routes()
except Exception:
    # Allow isolated imports in unit tests where the full ComfyUI server stack
    # is not initialized yet.
    pass


__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
