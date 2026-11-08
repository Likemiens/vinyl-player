"use client";

import { useState } from "react";
import { VinylPlayer, type VinylPlayerLabels, type VinylPlayerTrack } from "@likemiens/vinyl-player";

const labels: VinylPlayerLabels = {
  setlist: "Setlist",
  play: "Play",
  pause: "Pause",
  previous: "Previous song",
  next: "Next song",
  volume: "Volume",
};

// Your own files: a square cover for each song (the sleeve and the record's label) and its audio.
const songs: VinylPlayerTrack[] = [
  { title: "Night Swim", artist: "Softcase", cover: "/covers/night-swim.jpg", src: "/songs/night-swim.mp3", duration: 204 },
  { title: "Afterglow", artist: "Softcase", cover: "/covers/afterglow.jpg", src: "/songs/afterglow.mp3", duration: 187 },
  { title: "Slow Tide", artist: "Softcase", cover: "/covers/slow-tide.jpg", src: "/songs/slow-tide.mp3", duration: 233 },
];

export function Records() {
  const [now, setNow] = useState({ index: 0, playing: false });

  return (
    <>
      <VinylPlayer tracks={songs} labels={labels} onChange={setNow} />
      <p>{now.playing ? `Playing ${songs[now.index].title}` : "Press the cover to play"}</p>
    </>
  );
}
