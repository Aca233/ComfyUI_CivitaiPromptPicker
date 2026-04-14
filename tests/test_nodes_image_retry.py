import io
import pathlib
import sys
import types
import unittest
from collections import OrderedDict
from unittest.mock import Mock, patch

import numpy as np
import requests
from PIL import Image


PLUGIN_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(PLUGIN_ROOT))


class FakeTensor:
    def __init__(self, array):
        self._array = np.asarray(array)

    @property
    def shape(self):
        return self._array.shape

    def unsqueeze(self, axis):
        return FakeTensor(np.expand_dims(self._array, axis))


fake_torch = types.ModuleType("torch")
fake_torch.float32 = np.float32
fake_torch.zeros = lambda shape, dtype=None: FakeTensor(np.zeros(shape, dtype=np.float32))
fake_torch.from_numpy = lambda array: FakeTensor(array)
sys.modules.setdefault("torch", fake_torch)

from nodes import CivitaiPromptPicker  # noqa: E402


def build_png_bytes(size=(1, 1), color=(255, 0, 0)):
    buffer = io.BytesIO()
    Image.new("RGB", size, color).save(buffer, format="PNG")
    return buffer.getvalue()


def build_prompt_graph(node_id="50", image_connected=False):
    image_links = {"some_image_input": [str(node_id), 4]} if image_connected else {}
    return {
        str(node_id): {
            "class_type": "Civitai Prompt Picker",
            "inputs": {},
        },
        "99": {
            "class_type": "PreviewImage",
            "inputs": image_links,
        },
    }


class CivitaiPromptPickerImageRetryTests(unittest.TestCase):
    def setUp(self):
        CivitaiPromptPicker._image_tensor_cache = OrderedDict()

    def test_candidate_image_urls_include_resized_fallback(self):
        original_url = (
            "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/"
            "demo/original=true/demo-image.jpeg"
        )

        urls = CivitaiPromptPicker._candidate_image_urls(original_url)

        self.assertEqual(
            urls,
            [
                original_url,
                original_url.replace("/original=true/", "/width=1024/", 1),
            ],
        )

    @patch("nodes.requests.get")
    def test_load_image_tensor_retries_with_resized_fallback(self, mock_get):
        original_url = (
            "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/"
            "demo/original=true/demo-image.jpeg"
        )
        resized_url = original_url.replace("/original=true/", "/width=1024/", 1)

        success_response = Mock()
        success_response.raise_for_status.return_value = None
        success_response.content = build_png_bytes()
        mock_get.side_effect = [requests.Timeout("timed out"), success_response]

        image_tensor = CivitaiPromptPicker._load_image_tensor_from_url(original_url)

        self.assertEqual(mock_get.call_args_list[0].args[0], original_url)
        self.assertEqual(mock_get.call_args_list[1].args[0], resized_url)
        self.assertEqual(tuple(image_tensor.shape), (1, 1, 1, 3))

    @patch("nodes.requests.get")
    def test_load_image_tensor_uses_memory_cache_for_same_url(self, mock_get):
        original_url = (
            "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/"
            "demo/original=true/demo-image.jpeg"
        )

        success_response = Mock()
        success_response.raise_for_status.return_value = None
        success_response.content = build_png_bytes()
        mock_get.return_value = success_response

        first_tensor = CivitaiPromptPicker._load_image_tensor_from_url(original_url)
        second_tensor = CivitaiPromptPicker._load_image_tensor_from_url(original_url)

        self.assertEqual(mock_get.call_count, 1)
        self.assertEqual(tuple(first_tensor.shape), (1, 1, 1, 3))
        self.assertEqual(tuple(second_tensor.shape), (1, 1, 1, 3))

    @patch.object(CivitaiPromptPicker, "_load_image_tensor_from_url")
    def test_pick_prompt_skips_image_download_when_image_output_unlinked(self, mock_load_image):
        node = CivitaiPromptPicker()

        result = node.pick_prompt(
            limit=12,
            selected_prompt="demo prompt",
            selected_negative_prompt="demo negative",
            selected_width_text="1024",
            selected_height_text="768",
            selected_image_id="123",
            next_page="",
            selected_image_url="https://image.civitai.com/demo.jpeg",
            prompt=build_prompt_graph(image_connected=False),
            unique_id="50",
        )

        mock_load_image.assert_not_called()
        self.assertEqual(result[0], "demo prompt")
        self.assertEqual(result[1], "demo negative")
        self.assertEqual(result[2], 1024)
        self.assertEqual(result[3], 768)
        self.assertEqual(tuple(result[4].shape), (1, 1, 1, 3))

    @patch.object(CivitaiPromptPicker, "_load_image_tensor_from_url")
    def test_pick_prompt_downloads_image_when_image_output_linked(self, mock_load_image):
        node = CivitaiPromptPicker()
        mock_load_image.return_value = FakeTensor(np.zeros((1, 2, 3, 3), dtype=np.float32))

        result = node.pick_prompt(
            limit=12,
            selected_prompt="demo prompt",
            selected_negative_prompt="demo negative",
            selected_width_text="1024",
            selected_height_text="768",
            selected_image_id="123",
            next_page="",
            selected_image_url="https://image.civitai.com/demo.jpeg",
            prompt=build_prompt_graph(image_connected=True),
            unique_id="50",
        )

        mock_load_image.assert_called_once_with("https://image.civitai.com/demo.jpeg")
        self.assertEqual(tuple(result[4].shape), (1, 2, 3, 3))


if __name__ == "__main__":
    unittest.main()
