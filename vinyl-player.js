"use client";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import "./vinyl-player.css";
const SPIN = 45;
const COPIES = 8;
const SHUTTER = 1 / 25;
const icon = (body) => /* @__PURE__ */ jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: body });
const speaker = "M4 9.3h2.5l3.9-3.2c.6-.5 1.6-.1 1.6.8v10.2c0 .9-1 1.3-1.6.8l-3.9-3.2H4c-.6 0-1-.4-1-1v-3.4c0-.6.4-1 1-1Z";
const skip = "M3.5 7.1v9.8c0 .8.9 1.3 1.6.8l6.6-4.9c.5-.4.5-1.2 0-1.6L5.1 6.3c-.7-.5-1.6 0-1.6.8Zm9 0v9.8c0 .8.9 1.3 1.6.8l6.6-4.9c.5-.4.5-1.2 0-1.6l-6.6-4.9c-.7-.5-1.6 0-1.6.8Z";
const icons = {
  play: icon(/* @__PURE__ */ jsx("path", { d: "M7.5 5.7v12.6c0 .9 1 1.4 1.7.9l9.9-6.3c.7-.4.7-1.4 0-1.8L9.2 4.8c-.7-.5-1.7 0-1.7.9Z" })),
  pause: icon(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("rect", { x: "6", y: "5", width: "4.2", height: "14", rx: "1.3" }),
      /* @__PURE__ */ jsx("rect", { x: "13.8", y: "5", width: "4.2", height: "14", rx: "1.3" })
    ] })
  ),
  previous: icon(/* @__PURE__ */ jsx("path", { d: skip, transform: "matrix(-1 0 0 1 24 0)" })),
  next: icon(/* @__PURE__ */ jsx("path", { d: skip })),
  quiet: icon(/* @__PURE__ */ jsx("path", { d: speaker })),
  loud: icon(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("path", { d: speaker }),
      /* @__PURE__ */ jsx("path", { d: "M15.3 9.2a4 4 0 0 1 0 5.6M17.9 6.6a7.6 7.6 0 0 1 0 10.8", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })
    ] })
  )
};
const VOLUME = 0.8;
let settable;
const canSetVolume = () => {
  if (settable === void 0) {
    const probe = document.createElement("audio");
    probe.volume = 0.5;
    settable = probe.volume === 0.5;
  }
  return settable;
};
const never = () => () => {
};
function Volume({ label, onChange }) {
  const [value, setValue] = useState(VOLUME);
  const adjustable = useSyncExternalStore(never, canSetVolume, () => true);
  const drag = useRef(null);
  if (!adjustable) return null;
  const set = (v) => {
    const next = Math.min(1, Math.max(0, v));
    setValue(next);
    onChange(next);
  };
  const percent = Math.round(value * 100);
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "vp-volume",
      role: "slider",
      tabIndex: 0,
      "aria-label": label,
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      "aria-valuenow": percent,
      "aria-valuetext": `${percent}%`,
      style: { "--vp-volume": value },
      onKeyDown: (e) => {
        const by = { ArrowRight: 0.05, ArrowUp: 0.05, ArrowLeft: -0.05, ArrowDown: -0.05, Home: -1, End: 1 }[e.key];
        if (by === void 0) return;
        e.preventDefault();
        set(value + by);
      },
      onPointerDown: (e) => {
        const r = e.currentTarget.querySelector(".vp-track").getBoundingClientRect();
        const width = r.width - 14;
        const from = e.target.closest(".vp-knob") ? value : (e.clientX - r.left - 7) / width;
        drag.current = { x: e.clientX, from, width };
        set(from);
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e) => {
        const d = drag.current;
        if (d) set(d.from + (e.clientX - d.x) / d.width);
      },
      onPointerUp: () => drag.current = null,
      onPointerCancel: () => drag.current = null,
      children: [
        icons.quiet,
        /* @__PURE__ */ jsxs("span", { className: "vp-track", children: [
          /* @__PURE__ */ jsx("span", { className: "vp-level" }),
          /* @__PURE__ */ jsx("span", { className: "vp-knob" })
        ] }),
        icons.loud
      ]
    }
  );
}
const clock = (seconds) => {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
function VinylPlayer({ tracks, labels, onChange }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [swap, setSwap] = useState(false);
  const id = `vp${useId().replace(/[^\w-]/g, "")}`;
  const root = useRef(null);
  const audio = useRef(null);
  const spins = useRef([]);
  const motion = useRef({ angle: 0, speed: 0, last: 0, frame: 0, swap: 0 });
  useEffect(() => {
    if (tracks[0]) audio.current.src = tracks[0].src;
    audio.current.volume = VOLUME;
  }, []);
  useEffect(() => onChange?.({ index, playing }), [index, playing]);
  useEffect(() => {
    const m = motion.current;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = (now) => {
      const dt = m.last ? Math.min(now - m.last, 100) / 1e3 : 0;
      m.last = now;
      m.speed += ((playing && !still ? SPIN : 0) - m.speed) * (1 - Math.exp(-dt * 2.5));
      m.angle = (m.angle + m.speed * dt) % 360;
      const spread = m.speed * SHUTTER;
      spins.current.forEach((el, k) => {
        if (el) el.style.transform = `rotate(${m.angle - spread * k / (COPIES - 1)}deg)`;
      });
      const a = audio.current;
      root.current.style.setProperty("--vp-progress", String(a.duration ? a.currentTime / a.duration : 0));
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
  function select(next, play, dip = !audio.current.paused) {
    const a = audio.current;
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
    if (play) a.play().catch(() => {
    });
    else a.pause();
  }
  const toggle = () => select(index, audio.current.paused);
  const step = (by) => {
    const a = audio.current;
    if (by < 0 && a.currentTime > 3) a.currentTime = 0;
    else select((index + by + tracks.length) % tracks.length, !a.paused);
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref: root,
      className: "vp",
      "data-playing": playing || void 0,
      "data-swap": swap || void 0,
      style: { "--vp-index": index },
      children: [
        /* @__PURE__ */ jsxs("div", { className: "vp-case", children: [
          /* @__PURE__ */ jsx("div", { className: "vp-record", "aria-hidden": "true", children: Array.from({ length: COPIES }, (_, k) => /* @__PURE__ */ jsxs(
            "div",
            {
              ref: (el) => {
                spins.current[k] = el;
              },
              className: "vp-spin",
              style: { opacity: 1 / (k + 1) },
              children: [
                /* @__PURE__ */ jsx("img", { className: "vp-label", src: disc.cover, alt: "", draggable: false }),
                /* @__PURE__ */ jsxs("svg", { className: "vp-print", viewBox: "0 0 100 100", children: [
                  /* @__PURE__ */ jsx("path", { id: `${id}-${k}`, d: "M9.5 50a40.5 40.5 0 1 1 81 0a40.5 40.5 0 1 1-81 0", fill: "none" }),
                  /* @__PURE__ */ jsx("circle", { className: "vp-ring", cx: "50", cy: "50", r: "46.5" }),
                  /* @__PURE__ */ jsx("circle", { className: "vp-hub", cx: "50", cy: "50", r: "10" }),
                  /* @__PURE__ */ jsx("text", { children: /* @__PURE__ */ jsx("textPath", { href: `#${id}-${k}`, startOffset: "25%", textAnchor: "middle", children: `${disc.artist} \xB7 ${disc.title}`.toLocaleUpperCase() }) }),
                  /* @__PURE__ */ jsx("text", { x: "50", y: "86", textAnchor: "middle", children: "33\u2153" })
                ] })
              ]
            },
            k
          )) }),
          /* @__PURE__ */ jsxs("button", { type: "button", className: "vp-cover", "aria-label": playing ? labels.pause : labels.play, onClick: toggle, children: [
            tracks.map((t, i) => /* @__PURE__ */ jsx("img", { className: "vp-art", src: t.cover, alt: "", draggable: false, "data-on": i === index || void 0 }, i)),
            /* @__PURE__ */ jsx("span", { className: "vp-glint" }, index)
          ] })
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "vp-meta", "aria-live": "polite", children: [
          /* @__PURE__ */ jsx("span", { className: "vp-artist", children: track.artist }, `a${index}`),
          /* @__PURE__ */ jsx("span", { className: "vp-title", children: track.title }, `t${index}`)
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "vp-controls", children: [
          /* @__PURE__ */ jsx("button", { type: "button", className: "vp-btn", "aria-label": labels.previous, onClick: () => step(-1), children: icons.previous }),
          /* @__PURE__ */ jsx("button", { type: "button", className: "vp-btn vp-play", "aria-label": playing ? labels.pause : labels.play, onClick: toggle, children: playing ? icons.pause : icons.play }),
          /* @__PURE__ */ jsx("button", { type: "button", className: "vp-btn", "aria-label": labels.next, onClick: () => step(1), children: icons.next })
        ] }),
        /* @__PURE__ */ jsx(
          Volume,
          {
            label: labels.volume,
            onChange: (volume) => {
              audio.current.volume = volume;
            }
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "vp-setlist", children: [
          /* @__PURE__ */ jsx("span", { className: "vp-now", "aria-hidden": "true", children: /* @__PURE__ */ jsx("span", { className: "vp-fill" }) }),
          /* @__PURE__ */ jsx("ol", { "aria-label": labels.setlist, children: tracks.map((t, i) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              className: "vp-row",
              "aria-current": i === index || void 0,
              onClick: () => i === index ? toggle() : select(i, true),
              children: [
                /* @__PURE__ */ jsxs("span", { className: "vp-thumb", children: [
                  /* @__PURE__ */ jsx("img", { src: t.cover, alt: "", draggable: false }),
                  i === index && /* @__PURE__ */ jsxs("span", { className: "vp-eq", children: [
                    /* @__PURE__ */ jsx("i", {}),
                    /* @__PURE__ */ jsx("i", {}),
                    /* @__PURE__ */ jsx("i", {})
                  ] })
                ] }),
                /* @__PURE__ */ jsx("span", { className: "vp-name", children: t.title }),
                t.duration ? /* @__PURE__ */ jsx("span", { className: "vp-time", children: clock(t.duration) }) : null
              ]
            }
          ) }, i)) })
        ] }),
        /* @__PURE__ */ jsx(
          "audio",
          {
            ref: audio,
            preload: "auto",
            onPlay: () => setPlaying(true),
            onPause: () => setPlaying(false),
            onEnded: () => select((index + 1) % tracks.length, true, true)
          }
        )
      ]
    }
  );
}
export {
  VinylPlayer
};
