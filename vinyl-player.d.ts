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
    onChange?: (detail: {
        index: number;
        playing: boolean;
    }) => void;
};
export declare function VinylPlayer({ tracks, labels, onChange }: VinylPlayerProps): import("react/jsx-runtime").JSX.Element;
