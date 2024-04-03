import { RunData } from "../run/run-data";
import { RecordingBase } from "./recording-base";
import { UserRecordingBase } from "./user-recording";
import { RecordingPositionData } from "./recording-position-data";

export class RecordingFile {
    version: string;
    runData: RunData;
    recordings: RecordingBase[] = [];

    constructor (version: string, recordings: UserRecordingBase[] | RecordingBase[], removeUserIds: boolean = true) {
        this.version = version;

        recordings.forEach(recording => {
            if (recording instanceof RecordingBase || removeUserIds)
                this.recordings.push(RecordingBase.recreateFromDerivedClass(recording));
            else
                this.recordings.push(UserRecordingBase.recreateFromDerivedClass(recording));
        });
    }
}



//kept for a while in case migration is needed
export class OldRecordingFileStructure {
    version: string;
    displayName: string;
    playback: RecordingPositionData[] = [];

    constructor (version: string, playback: RecordingPositionData[], displayName?: string) {
        this.version = version;
        this.playback = playback;
        this.displayName = displayName ?? "Unknown";
    }
}