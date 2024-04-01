export class GameState {
    debugModeActive: boolean = false;
    justSpawned: boolean = false;
    justLoaded: boolean = false;
    justSaved: boolean = false;
    currentCheckpoint: string = "";
    cellCount: number = 0;
    buzzerCount: number = 0;
    orbCount: number = 0;
    deathCount: number = 0;

    constructor() {
        
    }
}