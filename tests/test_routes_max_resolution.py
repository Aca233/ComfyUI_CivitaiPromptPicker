import pathlib
import sys
import unittest


PLUGIN_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(PLUGIN_ROOT))

import routes  # noqa: E402


class MaxResolutionFilterTests(unittest.TestCase):
    def test_parse_filters_reads_max_resolution(self):
        filters = routes.parse_filters({"max_resolution": "1536"})
        self.assertEqual(filters["max_resolution"], "1536")

    def test_item_matches_max_resolution_uses_long_edge_limit(self):
        item = {"width": 832, "height": 1216}

        self.assertTrue(routes.item_matches_max_resolution(item, "1536"))
        self.assertFalse(routes.item_matches_max_resolution(item, "1024"))


if __name__ == "__main__":
    unittest.main()
