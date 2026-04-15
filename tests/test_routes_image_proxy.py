import pathlib
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit


PLUGIN_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(PLUGIN_ROOT))

import routes  # noqa: E402


class DummyClientSession:
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


class ImageProxyRouteTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        routes.MODEL_VERSION_TO_MODEL_ID_CACHE.clear()
        if hasattr(routes, "MODEL_VERSION_DETAILS_CACHE"):
            routes.MODEL_VERSION_DETAILS_CACHE.clear()

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
            "modelId": 987,
            "modelName": "Demo Checkpoint",
            "modelVersionName": "v1",
            "username": "demo-user",
            "postId": 456,
            "createdAt": "2026-04-15T12:34:56.000Z",
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
        self.assertEqual(normalized["model_id"], "987")
        self.assertEqual(normalized["model_name"], "Demo Checkpoint")
        self.assertEqual(normalized["model_version_name"], "v1")
        self.assertEqual(normalized["username"], "demo-user")
        self.assertEqual(normalized["post_id"], "456")
        self.assertEqual(normalized["created_at"], "2026-04-15T12:34:56.000Z")

    async def test_fetch_civitai_images_enriches_model_fields_from_model_version_lookup(self):
        async def fake_fetch_json(url, session):
            if url.startswith(routes.CIVITAI_IMAGES_URL):
                return {
                    "items": [
                        {
                            "id": 321,
                            "url": (
                                "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/"
                                "demo/original=true/fetch-image.jpeg"
                            ),
                            "width": 832,
                            "height": 1216,
                            "meta": {"prompt": "fetch prompt"},
                            "modelVersionIds": [4321],
                            "modelId": None,
                            "modelName": None,
                            "modelVersionName": None,
                        }
                    ],
                    "metadata": {},
                }
            if url == f"{routes.CIVITAI_MODEL_VERSION_URL}/4321":
                return {
                    "id": 4321,
                    "modelId": 987,
                    "name": "XL v2",
                    "model": {"name": "Dream Shaper"},
                }
            raise AssertionError(url)

        with patch.object(routes, "ClientSession", DummyClientSession), patch.object(
            routes, "fetch_json", side_effect=fake_fetch_json
        ):
            payload = await routes.fetch_civitai_images(limit=1, filters={})

        self.assertEqual(len(payload["items"]), 1)
        item = payload["items"][0]
        self.assertEqual(item["model_id"], "987")
        self.assertEqual(item["model_name"], "Dream Shaper")
        self.assertEqual(item["model_version_name"], "XL v2")
        self.assertEqual(item["resolved_model_ids"], ["987"])

    async def test_fetch_family_base_model_images_enriches_model_fields_from_model_version_lookup(self):
        async def fake_fetch_json(url, session):
            if url.startswith(routes.CIVITAI_MODELS_URL):
                return {
                    "items": [
                        {
                            "id": 555,
                            "modelVersions": [
                                {
                                    "id": 2468,
                                    "baseModel": "Anima",
                                    "images": [
                                        {
                                            "url": (
                                                "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/"
                                                "demo/original=true/family-model.jpeg"
                                            )
                                        }
                                    ],
                                }
                            ],
                        }
                    ],
                    "metadata": {},
                }
            if url.startswith(routes.CIVITAI_IMAGES_URL):
                return {
                    "items": [
                        {
                            "id": 654,
                            "url": (
                                "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/"
                                "demo/original=true/family-image.jpeg"
                            ),
                            "width": 1024,
                            "height": 1024,
                            "meta": {"prompt": "family prompt"},
                            "baseModel": "Anima",
                            "modelVersionIds": [],
                            "modelId": None,
                            "modelName": None,
                            "modelVersionName": None,
                        }
                    ],
                    "metadata": {},
                }
            if url == f"{routes.CIVITAI_MODEL_VERSION_URL}/2468":
                return {
                    "id": 2468,
                    "modelId": 8642,
                    "name": "Anima XL",
                    "model": {"name": "AnimaMix"},
                }
            raise AssertionError(url)

        with patch.object(routes, "ClientSession", DummyClientSession), patch.object(
            routes, "fetch_json", side_effect=fake_fetch_json
        ):
            payload = await routes.fetch_family_base_model_images(
                limit=1,
                filters={"base_model": "Anima"},
            )

        self.assertEqual(len(payload["items"]), 1)
        item = payload["items"][0]
        self.assertEqual(item["model_version_ids"], ["2468"])
        self.assertEqual(item["model_id"], "8642")
        self.assertEqual(item["model_name"], "AnimaMix")
        self.assertEqual(item["model_version_name"], "Anima XL")
        self.assertEqual(item["resolved_model_ids"], ["8642"])

    async def test_handle_civitai_image_proxy_rejects_invalid_url(self):
        request = SimpleNamespace(
            rel_url=SimpleNamespace(query={"url": "https://example.com/not-allowed.png"})
        )

        response = await routes._handle_civitai_image_proxy(request)

        self.assertEqual(response.status, 400)


if __name__ == "__main__":
    unittest.main()
