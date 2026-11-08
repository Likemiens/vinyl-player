# Vinyl Player — notes for coding agents

`<VinylPlayer>` is a React component: a music player as a record sleeve. Press the cover and the vinyl slides out and spins with the song's cover on its label; a setlist changes the songs, a slider sets the volume. It plays the files it is given and reports which song is on and whether it plays. The songs, the covers and the saving stay in the app.

## Install

`npm i @likemiens/vinyl-player`, then `import { VinylPlayer } from "@likemiens/vinyl-player"`: JavaScript with its types, and it imports its CSS itself. Or copy `vinyl-player.tsx` and `vinyl-player.css` into the app, side by side, and import from `./vinyl-player`. It starts with `"use client"` and needs React 18 or newer, nothing else. `example.tsx` is a complete, typed usage.

## Contract

```tsx
import { VinylPlayer, type VinylPlayerLabels, type VinylPlayerTrack } from "@likemiens/vinyl-player";

<VinylPlayer
  tracks={songs}   // required: VinylPlayerTrack[] — { title, artist, cover, src, duration?, link? }
  labels={labels}  // required: VinylPlayerLabels, 6 strings and an optional `listen` for the link
  onChange={({ index, playing }) => {}} // the song changed, or it started or stopped playing
/>
```

Labels: `setlist play pause previous next volume`, and `listen` (optional): with it, a track's `link` shows under the title as a link to the whole song, which is what a store's previews ask for. Colours and sizes: `--vp-ink --vp-quiet --vp-surface --vp-line --vp-focus --vp-size --vp-radius --vp-peek --vp-out --vp-label --vp-grain`; the player declares them on `.vp`, so set them with a more specific selector, such as `.records .vp`.

## Gotchas

- **It keeps the song and the play state itself.** There is no prop to start it: browsers allow sound only after a press, and the player starts it inside that press. `onChange` tells you what happened.
- **`cover` is square.** It is the sleeve and, cut to a circle, the label of the record.
- **Leave room on the right.** While it plays the record stands out of the sleeve by half a cover (`--vp-out`), outside the player's own box.
- **The cover is `min(280px, 50vw - 8px)`** so the record fits a phone. In a narrow container set `--vp-size` yourself.
- **`tracks` is read when it mounts.** To give it another setlist, give it a new `key`.
- **Volume on iOS** belongs to the phone's buttons: the slider is not shown there.
- `font-family: var(--ui-font, inherit)`: it uses the page's font unless the variable is set.

## Don't

- Don't set `src` on its `<audio>` or call `play()` from outside: the player sets the source inside the press, which is what lets the sound start, especially in Safari.
- Don't write words into the component: pass `labels`.
- Don't scale the volume knob on press or let it jump to the pointer: it is taken with its offset, by design.
- Don't make the record spin at a real 33⅓ rpm: at this size it looks frantic. 45° a second is what the references use.
