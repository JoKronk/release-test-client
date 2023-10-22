import { GameTask } from "../opengoal/game-task";
import { Task } from "../opengoal/task";
import { TaskStatus } from "../opengoal/task-status";
import { Buzzer, BuzzerBase } from "./buzzer";
import { Crate, CrateBase } from "./crate";
import { LevelCollectables } from "./level-collectables";
import { Orb, OrbBase } from "./orb";

export class RunStateHandler {
    levels: LevelCollectables[] = [];

    ////unused in LevelHandler
    tasksStatuses: Map<string, number>;
    cellCount: number;
    buzzerCount: number;
    orbCount: number;

    constructor() {
        this.levels = [];
        this.tasksStatuses = new Map();
        this.cellCount = 0;
        this.buzzerCount = 0;
        this.orbCount = 0;
    }

    isNewTaskStatus(task: GameTask) {
        const statusValue: number = TaskStatus.getEnumValue(task.status);
        return !this.tasksStatuses.has(task.name) || this.tasksStatuses.get(task.name)! < statusValue;
    }

    addTask(task: GameTask, levelName: string) {
        this.tasksStatuses.set(task.name, TaskStatus.getEnumValue(task.status));

        if (Task.isCellCollect(task)) {
            this.addCell(task.name, levelName);
            this.orbCount -= Task.cellCost(task);
        }
    }

    addCell(taskName: string, levelName: string) {
        const level = this.getCreateLevel(levelName);
        level.cellUpdates.push(taskName);
        this.cellCount += 1;
    }

    addBuzzer(buzzer: Buzzer) {
        const level = this.getCreateLevel(buzzer.level);
        level.buzzerUpdates.push(new BuzzerBase(buzzer.id, buzzer.parentEname));
        this.buzzerCount += 1;
    }

    addOrb(orb: Orb, level: LevelCollectables | undefined = undefined) {
        if (!level)
            level = this.getCreateLevel(orb.level);
    
        level.orbUpdates.push(new OrbBase(orb.ename, orb.parentEname));
        this.orbCount += 1;
    }

    addCrate(crate: Crate) {
        const level = this.getCreateLevel(crate.level);
        level.crateUpdates.push(new CrateBase(crate.ename, crate.type, crate.pickupAmount));
    }


    getCreateLevel(levelName: string): LevelCollectables {
        let level = this.levels.find(x => x.levelName === levelName);
        if (!level) {
            level = new LevelCollectables(levelName);
            this.levels.push(level);
        }
        return level;
    }


    isOrbDupe(orb: Orb, level: LevelCollectables | undefined = undefined): boolean {
        if (!level)
            level = this.getCreateLevel(orb.level);

        if (orb.parentEname.startsWith("orb-cache-top-"))
            return 15 < (level.orbUpdates.filter(x => x.parentEname === orb.parentEname).length + 1);
        else if (orb.parentEname.startsWith("crate-")) {
            let parentCrate = level.crateUpdates.find(x => x.ename === orb.parentEname);
            if (parentCrate) 
                return parentCrate.pickupAmount < (level.orbUpdates.filter(x => x.parentEname === orb.parentEname).length + 1);
            return false;
        }
        else {
            return level.orbUpdates.find(x => x.ename === orb.ename) !== undefined; 
        }
    }
}