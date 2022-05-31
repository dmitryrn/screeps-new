import { Task, TaskType } from "./state";
import {
  notifyOk,
  requireCreateConstructionSiteTask,
  requireCreepByName,
  requireHarvestTask,
  requireMoveToTask,
  requireRoomByName,
  requireTransferTask
} from "./utils";

export class Executor {
  public execute(task: Task): ScreepsReturnCode {
    switch (task.Type) {
      case TaskType.Harvest: {
        const t = requireHarvestTask(task);
        const creep = requireCreepByName(t.CreepName);
        return creep.harvest(t.HarvestTarget);
      }

      case TaskType.MoveTo: {
        const t = requireMoveToTask(task);
        const creep = requireCreepByName(t.CreepName);
        return creep.moveTo(new RoomPosition(t.Pos[0], t.Pos[1], t.RoomName));
      }

      case TaskType.Transfer: {
        const t = requireTransferTask(task);
        try {
          const creep = requireCreepByName(t.CreepName);
          const pos = new RoomPosition(t.Pos[0], t.Pos[1], t.RoomName);
          const res = pos.look();
          let str: Structure | ConstructionSite | undefined;
          for (const re of res) {
            if (re.type === "creep") {
              throw Error("got creep in transfer task");
            }
            if (re.type === "structure") {
              str = re.structure;
              break;
            }
            if (re.type === "constructionSite") {
              str = re.constructionSite;
              break;
            }
          }
          if (!str) throw Error("didn't find structure in transfer task");
          if ("progress" in str) {
            return creep.build(str);
          } else {
            return creep.transfer(str, t.Resource);
          }
        } catch (e: any) {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions,@typescript-eslint/no-unsafe-member-access
          throw Error(`error processing transfer task (pos: ${t.Pos}): ${e.message}`);
        }
      }

      case TaskType.CreateConstructionSite: {
        const t = requireCreateConstructionSiteTask(task);
        const roomLocal = requireRoomByName(t.RoomName);
        return roomLocal.createConstructionSite(t.Pos[0], t.Pos[1], t.StructureType);
      }

      default: {
        throw Error(`error in Executor: not implemented for task type: ${task.Type}`);
      }
    }
  }
}
