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
    /** where to hear the whole song, as when `src` is a preview: a link under the title, worded by `labels.listen` */
    link?: string;
};
export type VinylPlayerLabels = {
    /** the name of the list of songs */
    setlist: string;
    play: string;
    pause: string;
    previous: string;
    next: string;
    volume: string;
    /** the link to the whole song, for tracks with a `link` */
    listen?: string;
};
export type VinylPlayerProps = {
    tracks: VinylPlayerTrack[];
    labels: VinylPlayerLabels;
    /** the song or the play state changed */
    onChange?: (detail: {
        index: number;
        playing: boolean;
    }) => void;
};
export declare function VinylPlayer({ tracks, labels, onChange }: VinylPlayerProps): import("react/jsx-runtime").JSX.Element;
