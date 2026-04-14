import io
import pathlib
import sys
import types
import unittest
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


class CivitaiPromptPickerImageRetryTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
