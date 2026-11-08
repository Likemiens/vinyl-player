"use client";

// Vinyl Player: a music player as a record sleeve. Press the cover and the record slides out and spins, with the
// song's cover on its label; the setlist changes the songs. https://likemiens.com/ui/vinyl-player · MIT
import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import "./vinyl-player.css";

export type VinylPlayerTrack = {
  title: string;
  artist: string;
  /** a square image: the sleeve, and the label of the record */
  cover: string;
  /** the audio file */
  src: string;
  /** seconds; the setlist shows it next to the title */
  duration?: number;
};

export type VinylPlayerLabels = {
  /** the name of the list of songs */
  setlist: string;
  play: string;
  pause: string;
  previous: string;
  next: string;
  volume: string;
};

export type VinylPlayerProps = {
  tracks: VinylPlayerTrack[];
  labels: VinylPlayerLabels;
  /** the song or the play state changed */
  onChange?: (detail: { index: number; playing: boolean }) => void;
};

// Degrees a second. A real 33⅓ rpm (200) looks frantic at this size; MD Vinyl and Instagram turn theirs at 42–49.
const SPIN = 45;
const COPIES = 8; // motion blur: the turning part is drawn this many times, spread over the shutter
const SHUTTER = 1 / 25; // seconds

const icon = (body: ReactNode) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {body}
  </svg>
);
const speaker = "M4 9.3h2.5l3.9-3.2c.6-.5 1.6-.1 1.6.8v10.2c0 .9-1 1.3-1.6.8l-3.9-3.2H4c-.6 0-1-.4-1-1v-3.4c0-.6.4-1 1-1Z";
const skip = "M3.5 7.1v9.8c0 .8.9 1.3 1.6.8l6.6-4.9c.5-.4.5-1.2 0-1.6L5.1 6.3c-.7-.5-1.6 0-1.6.8Zm9 0v9.8c0 .8.9 1.3 1.6.8l6.6-4.9c.5-.4.5-1.2 0-1.6l-6.6-4.9c-.7-.5-1.6 0-1.6.8Z";
const icons = {
  play: icon(<path d="M7.5 5.7v12.6c0 .9 1 1.4 1.7.9l9.9-6.3c.7-.4.7-1.4 0-1.8L9.2 4.8c-.7-.5-1.7 0-1.7.9Z" />),
  pause: icon(
    <>
      <rect x="6" y="5" width="4.2" height="14" rx="1.3" />
      <rect x="13.8" y="5" width="4.2" height="14" rx="1.3" />
    </>,
  ),
  previous: icon(<path d={skip} transform="matrix(-1 0 0 1 24 0)" />),
  next: icon(<path d={skip} />),
  quiet: icon(<path d={speaker} />),
  loud: icon(
    <>
      <path d={speaker} />
      <path d="M15.3 9.2a4 4 0 0 1 0 5.6M17.9 6.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>,
  ),
};

const VOLUME = 0.8; // where the volume starts

// Whether a page may set the volume at all: iOS keeps it for the hardware buttons and reads 1 whatever is set.
// Asked once, on the client; the server assumes it may.
let settable: boolean | undefined;
const canSetVolume = () => {
  if (settable === undefined) {
    const probe = document.createElement("audio");
    probe.volume = 0.5;
    settable = probe.volume === 0.5;
  }
  return settable;
};
const never = () => () => {};

// The volume, as a slider of our own: a native range thumb jumps to sit under the pointer once it moves, and a handle
// that is held should never jump. It only reports the level; the player turns its audio. On iOS there is no slider.
function Volume({ label, onChange }: { label: string; onChange: (volume: number) => void }) {
  const [value, setValue] = useState(VOLUME);
  const adjustable = useSyncExternalStore(never, canSetVolume, () => true);
  const drag = useRef<{ x: number; from: number; width: number } | null>(null);
  if (!adjustable) return null;

  const set = (v: number) => {
    const next = Math.min(1, Math.max(0, v));
    setValue(next);
    onChange(next);
  };
  const percent = Math.round(value * 100);
  return (
    <div
      className="vp-volume"
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${percent}%`}
      style={{ "--vp-volume": value } as CSSProperties}
      onKeyDown={(e) => {
        const by = ({ ArrowRight: 0.05, ArrowUp: 0.05, ArrowLeft: -0.05, ArrowDown: -0.05, Home: -1, End: 1 } as Record<string, number>)[e.key];
        if (by === undefined) return;
        e.preventDefault();
        set(value + by);
      }}
      onPointerDown={(e) => {
        // The knob is taken where it was pressed; a press on the track puts the knob there first.
        const r = e.currentTarget.querySelector(".vp-track")!.getBoundingClientRect();
        const width = r.width - 14;
        const from = (e.target as Element).closest(".vp-knob") ? value : (e.clientX - r.left - 7) / width;
        drag.current = { x: e.clientX, from, width };
        set(from);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (d) set(d.from + (e.clientX - d.x) / d.width);
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      {icons.quiet}
      <span className="vp-track">
        <span className="vp-level" />
        <span className="vp-knob" />
      </span>
      {icons.loud}
    </div>
  );
}

const clock = (seconds: number) => {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function VinylPlayer({ tracks, labels, onChange }: VinylPlayerProps) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0); // the song on the record; it changes while the record is in the sleeve
  const [playing, setPlaying] = useState(false);
  const [swap, setSwap] = useState(false);
  const id = `vp${useId().replace(/[^\w-]/g, "")}`;
  const root = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const spins = useRef<(HTMLDivElement | null)[]>([]);
  const motion = useRef({ angle: 0, speed: 0, last: 0, frame: 0, swap: 0 });

  // The source is set by hand, inside the press: a src prop would reload the song after play() had started it.
  // Only the first song is set here, once; the volume starts where the slider does.
  useEffect(() => {
    if (tracks[0]) audio.current!.src = tracks[0].src;
    audio.current!.volume = VOLUME;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount: later songs are set inside the press
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- a new onChange each render must not report again
  useEffect(() => onChange?.({ index, playing }), [index, playing]);

  // The record spins up and coasts down, smeared over the shutter like on camera; the setlist shows how far the
  // song is. One rAF loop, outside React.
  useEffect(() => {
    const m = motion.current;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = (now: number) => {
      const dt = m.last ? Math.min(now - m.last, 100) / 1000 : 0;
      m.last = now;
      m.speed += ((playing && !still ? SPIN : 0) - m.speed) * (1 - Math.exp(-dt * 2.5));
      m.angle = (m.angle + m.speed * dt) % 360;
      const spread = m.speed * SHUTTER;
      spins.current.forEach((el, k) => {
        if (el) el.style.transform = `rotate(${m.angle - (spread * k) / (COPIES - 1)}deg)`;
      });
      const a = audio.current!;
      root.current!.style.setProperty("--vp-progress", String(a.duration ? a.currentTime / a.duration : 0));
      m.frame = playing || m.speed > 1 ? requestAnimationFrame(frame) : 0;
      if (!m.frame) m.last = 0;
    };
    m.last = 0;
    m.frame = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(m.frame);
  }, [playing, index]);

  const track = tracks[index];
  if (!track) return null;
  const disc = tracks[shown] ?? track;

  // Goes to song `next` and plays it or not. A record that is out dips into the sleeve, gets the new label there and
  // comes out with it.
  function select(next: number, play: boolean, dip = !audio.current!.paused) {
    const a = audio.current!;
    if (next !== index) {
      clearTimeout(motion.current.swap);
      setSwap(dip);
      if (dip)
        motion.current.swap = window.setTimeout(() => {
          setSwap(false);
          setShown(next);
        }, 240);
      else setShown(next);
      a.src = tracks[next].src;
      setIndex(next);
    }
    if (play) a.play().catch(() => {});
    else a.pause();
  }
  const toggle = () => select(index, audio.current!.paused);
  const step = (by: number) => {
    const a = audio.current!;
    if (by < 0 && a.currentTime > 3) a.currentTime = 0;
    else select((index + by + tracks.length) % tracks.length, !a.paused);
  };

  return (
    <div
      ref={root}
      className="vp"
      data-playing={playing || undefined}
      data-swap={swap || undefined}
      style={{ "--vp-index": index } as CSSProperties}
    >
      <div className="vp-case">
        <div className="vp-record" aria-hidden="true">
          {Array.from({ length: COPIES }, (_, k) => (
            <div
              key={k}
              ref={(el) => {
                spins.current[k] = el;
              }}
              className="vp-spin"
              style={{ opacity: 1 / (k + 1) }}
            >
              <img className="vp-label" src={disc.cover} alt="" draggable={false} />
              <svg className="vp-print" viewBox="0 0 100 100">
                <path id={`${id}-${k}`} d="M9.5 50a40.5 40.5 0 1 1 81 0a40.5 40.5 0 1 1-81 0" fill="none" />
                <circle className="vp-ring" cx="50" cy="50" r="46.5" />
                <circle className="vp-hub" cx="50" cy="50" r="10" />
                <text>
                  <textPath href={`#${id}-${k}`} startOffset="25%" textAnchor="middle">
                    {`${disc.artist} · ${disc.title}`.toLocaleUpperCase()}
                  </textPath>
                </text>
                <text x="50" y="86" textAnchor="middle">
                  33⅓
                </text>
              </svg>
            </div>
          ))}
        </div>
        <button type="button" className="vp-cover" aria-label={playing ? labels.pause : labels.play} onClick={toggle}>
          {tracks.map((t, i) => (
            <img key={i} className="vp-art" src={t.cover} alt="" draggable={false} data-on={i === index || undefined} />
          ))}
          <span key={index} className="vp-glint" />
        </button>
      </div>

      <p className="vp-meta" aria-live="polite">
        <span key={`a${index}`} className="vp-artist">{track.artist}</span>
        <span key={`t${index}`} className="vp-title">{track.title}</span>
      </p>

      <div className="vp-controls">
        <button type="button" className="vp-btn" aria-label={labels.previous} onClick={() => step(-1)}>
          {icons.previous}
        </button>
        <button type="button" className="vp-btn vp-play" aria-label={playing ? labels.pause : labels.play} onClick={toggle}>
          {playing ? icons.pause : icons.play}
        </button>
        <button type="button" className="vp-btn" aria-label={labels.next} onClick={() => step(1)}>
          {icons.next}
        </button>
      </div>

      <Volume
        label={labels.volume}
        onChange={(volume) => {
          audio.current!.volume = volume;
        }}
      />

      <div className="vp-setlist">
        <span className="vp-now" aria-hidden="true">
          <span className="vp-fill" />
        </span>
        <ol aria-label={labels.setlist}>
          {tracks.map((t, i) => (
            <li key={i}>
              <button
                type="button"
                className="vp-row"
                aria-current={i === index || undefined}
                onClick={() => (i === index ? toggle() : select(i, true))}
              >
                <span className="vp-thumb">
                  <img src={t.cover} alt="" draggable={false} />
                  {i === index && (
                    <span className="vp-eq">
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                </span>
                <span className="vp-name">{t.title}</span>
                {t.duration ? <span className="vp-time">{clock(t.duration)}</span> : null}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <audio
        ref={audio}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => select((index + 1) % tracks.length, true, true)}
      />
    </div>
  );
}
