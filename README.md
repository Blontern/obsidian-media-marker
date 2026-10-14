# Media Marker

Click timestamps in transcription documents to seek and play the embedded audio/video, with a fully custom player, sticky media, subtitles, and keyboard shortcuts.

[中文文档](https://github.com/blontern/obsidian-media-marker/blob/master/README_CN.md)

# Feature Showcase

## Clickable Timestamps

In your notes, timestamp-formatted text `[HH:]mm:ss[.SSS]` written below a video is rendered as buttons. Click one to jump the associated media to that position and start playing. During playback, the current timestamp is highlighted, and its icon toggles between play/pause with the playback state.

## Custom Media Player

Embedded `audio` and `video` are replaced with a custom control bar: play/pause, seekable progress bar with hover tooltip, volume slider, playback speed menu (`0.5x` – `2x`), subtitle toggle, picture-in-picture and fullscreen (video), and a settings menu.

## Video Step Seeking

There are three granularities: frame / keyframe / 5 seconds.

## Timestamp Insertion

Insert the current playback position as a timestamp with a single action. New timestamps are inserted in correct chronological order into the "timestamp queue" below the media source line.

## Media Pinning

While scrolling a long transcription, the player pins to the top of the pane and follows the page down. It automatically releases when the next media block or the end of the current timestamp section is reached. The feature can be toggled per view via the pin button in the view header.

## Subtitles and Lyrics

Place a same-named `.vtt`, `.srt`, or `.lrc` file next to the media to enable subtitles. Video shows a single subtitle line; audio switches to a scrolling lyrics view, with support for same-named cover art.

## Customizable Keyboard Shortcuts

Play/pause, seek forward/backward, step-size cycling, volume, subtitle toggle, timestamp insertion, fullscreen, and more can all be bound to keys and rebound in the shortcut settings panel.

## Playback Settings

Once configured, they are applied live to every player:

- Playback mode: pause at end / loop
- Video ratio: auto / `4:3` / `16:9`
- Orientation: landscape / portrait
