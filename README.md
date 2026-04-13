# ComfyUI Civitai Prompt Picker

ComfyUI custom node for browsing Civitai image prompts directly inside a node.

## Features

- Thumbnail browser embedded in the node UI
- Click image to output `prompt`, `negative_prompt`, `width`, and `height`
- Infinite scroll
- Filters for time range, sort order, NSFW, base model, model ID, model version ID, and metadata-only results
- Exact local NSFW filtering when Civitai upstream results are mixed
- Faster first-screen loading with background prefill

## Install

Clone this repository into your ComfyUI `custom_nodes` directory:

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/Aca233/ComfyUI_CivitaiPromptPicker.git
```

Then restart ComfyUI.

## Node Outputs

- `prompt`
- `negative_prompt`
- `width`
- `height`
