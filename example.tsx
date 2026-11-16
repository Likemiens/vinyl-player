"use client";

import { useEffect, useState } from "react";
import { VinylPlayer, type VinylPlayerLabels, type VinylPlayerTrack } from "@likemiens/vinyl-player";

const labels: VinylPlayerLabels = {
  setlist: "Setlist",
  play: "Play",
  pause: "Pause",
  previous: "Previous song",
  next: "Next song",
  volume: "Volume",
  listen: "Listen on Apple Music",
};

// Songs by name. Apple's catalogue (the iTunes Search API, open to any page) gives each one a 30-second preview, its
// artwork and a link to the whole song: nothing to host, and every song links back to Apple Music, as Apple asks.
const SONGS = ["Avicii Levels", "The Lumineers Sleep on the Floor", "Weezer Say It Ain't So", "Alice in Chains Nutshell"];

type AppleSong = { trackName: string; artistName: string; artworkUrl100: string; previewUrl?: string; trackViewUrl: string };

async function fromAppleMusic(term: string): Promise<VinylPlayerTrack | undefined> {
  const query = new URLSearchParams({ term, entity: "song", limit: "1" });
  const response = await fetch(`https://itunes.apple.com/search?${query}`);
  const [song]: AppleSong[] = (await response.json()).results;
  if (!song?.previewUrl) return undefined;
  return {
    title: song.trackName,
    artist: song.artistName,
    cover: song.artworkUrl100.replace("100x100bb", "600x600bb"),
    src: song.previewUrl,
    link: song.trackViewUrl,
  };
}

export function Records() {
  const [tracks, setTracks] = useState<VinylPlayerTrack[]>();

  useEffect(() => {
    Promise.all(SONGS.map(fromAppleMusic)).then((found) => setTracks(found.filter((track): track is VinylPlayerTrack => !!track)));
  }, []);

  // The player reads its songs when it mounts, so it waits for them. Your own files work the same way:
  // { title, artist, cover: "/covers/song.jpg", src: "/songs/song.mp3", duration: 204 }.
  return tracks?.length ? <VinylPlayer tracks={tracks} labels={labels} /> : null;
}
