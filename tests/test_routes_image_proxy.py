import pathlib
import sys
import unittest
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit


PLUGIN_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(PLUGIN_ROOT))

import routes  # noqa: E402


class ImageProxyRouteTests(unittest.IsolatedAsyncioTestCase):
    def test_build_image_proxy_url_accepts_civitai_image_urls(self):
        image_url = (
            "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/"
            "demo/original=true/demo-image.jpeg"
        )

        proxy_url = routes.build_image_proxy_url(image_url)

        self.assertTrue(proxy_url.startswith("/civitai-prompt-picker/image-proxy?"))
        parsed = urlsplit(proxy_url)
        self.assertEqual(parse_qs(parsed.query).get("url"), [image_url])

    def test_build_image_proxy_url_rejects_non_civitai_hosts(self):
        self.assertEqual(routes.build_image_proxy_url("https://example.com/demo.png"), "")

    def test_normalize_civitai_item_includes_proxy_urls(self):
        item = {
            "id": 123,
            "url": (
                "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/"
                "demo/original=true/demo-image.jpeg"
            ),
            "width": 832,
            "height": 1216,
            "meta": {"prompt": "demo prompt"},
        }

        normalized = routes.normalize_civitai_item(item)

        self.assertEqual(
            normalized["thumbnail_proxy_url"],
            routes.build_image_proxy_url(normalized["thumbnail_url"]),
        )
        self.assertEqual(
            normalized["image_proxy_url"],
            routes.build_image_proxy_url(normalized["image_url"]),
        )

    async def test_handle_civitai_image_proxy_rejects_invalid_url(self):
        request = SimpleNamespace(
            rel_url=SimpleNamespace(query={"url": "https://example.com/not-allowed.png"})
        )

        response = await routes._handle_civitai_image_proxy(request)

        self.assertEqual(response.status, 400)


if __name__ == "__main__":
    unittest.main()
