# SuccessFactors Skip Video

A Tampermonkey userscript that fast-forwards mandatory videos and audio clips in SAP SuccessFactors.

For every `<video>` and `<audio>` element on the page it sets the playback rate to `10` and seeks to `duration - 1s`, so the player reaches its end state almost immediately.

## Features

- Detects all media elements, including ones added later by the SPA (MutationObserver + periodic re-scan)
- Sets `playbackRate = 10` and re-applies it when the player resets it
- Seeks to the last second as soon as the duration is known
- Works inside iframes (embedded players)
- Floating **Skip Video (S)** button in the bottom right corner
- Keyboard shortcut <kbd>S</kbd> (ignored while typing in inputs, textareas, selects or contenteditable elements)

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser.
2. Open the Tampermonkey dashboard → **+** (new script).
3. Replace the template with the contents of [successfactors-skip-video.user.js](successfactors-skip-video.user.js) and save.

## Usage

Open a training/course page in SuccessFactors. The script runs automatically. If a player loads late or resets its position, trigger it manually with the button or the <kbd>S</kbd> key.

## Supported domains

```
*://*.successfactors.com/*
*://*.successfactors.eu/*
*://*.sapsf.com/*
*://*.sapsf.eu/*
```

If your tenant uses a different domain, add a matching `@match` line to the script header.

## Configuration

| Constant | Default | Meaning |
| --- | --- | --- |
| `PLAYBACK_RATE` | `10` | Playback speed applied to every media element |
| `END_OFFSET` | `1` | Seconds before the end to seek to |

## Notes

- Some players ignore or override `playbackRate` and `currentTime`; in that case press <kbd>S</kbd> again.
- Cross-origin iframes cannot be reached from the parent page. With `@all-frames`, the script runs inside a frame only when that frame's own URL matches one of the `@match` patterns above.
- Skipping mandatory trainings may violate your employer's policies. Use at your own risk.

## License

[MIT](LICENSE)
