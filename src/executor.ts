import { Task, TaskType } from "./state";
import {
  getUniqueCreepName,
  notifyOk,
  requireCreateConstructionSiteTask,
  requireCreepByName,
  requireHarvestTask,
  requireMoveToTask,
  requireOk,
  requirePickupTask,
  requireRoomByName,
  requireTransferTask,
  requireWithdrawTask
} from "./utils";

export class Executor {
  public constructor(private spawn: StructureSpawn) {}

  public execute(task: Task): ScreepsReturnCode {
    console.log(TaskType[task.Type]);

    switch (task.Type) {
      case TaskType.SpawnCreep: {
        if (!task.SpawnName) throw Error("no spawn name");
        const spawnLocal = Game.spawns[task.SpawnName];
        if (!spawnLocal) throw Error("no spawn found");
        if (!task.BodyParts) throw Error("no body parts");
        return spawnLocal.spawnCreep(task.BodyParts, getUniqueCreepName(Object.values(Game.creeps)));
      }

      case TaskType.Harvest: {
        const t = requireHarvestTask(task);
        const creep = requireCreepByName(t.CreepName);
        return creep.harvest(t.HarvestTarget);
      }

      case TaskType.Withdraw: {
        const t = requireWithdrawTask(task);
        const creep = requireCreepByName(t.CreepName);
        return creep.withdraw(t.WithdrawTarget, t.Resource);
      }

      case TaskType.Pickup: {
        const t = requirePickupTask(task);
        const creep = requireCreepByName(t.CreepName);
        return creep.pickup(t.ResourceObject);
      }

      case TaskType.MoveTo: {
        const t = requireMoveToTask(task);
        const creep = requireCreepByName(t.CreepName);
        return creep.moveTo(new RoomPosition(t.Pos[0], t.Pos[1], t.RoomName));
      }

      case TaskType.Transfer: {
        const t = requireTransferTask(task);
        const creep = requireCreepByName(t.CreepName);
        const pos = new RoomPosition(t.Pos[0], t.Pos[1], t.RoomName);
        const res = pos.look();
        let str: Structure | ConstructionSite | StructureController | undefined;
        for (const re of res) {
          if (re.type === "creep") {
            if (!(t.Pos[0] === this.spawn.pos.x && t.Pos[1] === this.spawn.pos.y)) {
              throw Error("got creep in transfer task (and it's not the spawn location)");
            }
            continue;
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
        try {
          if ("progress" in str && !("ticksToDowngrade" in str)) {
            return creep.build(str);
          } else {
            return creep.transfer(str, t.Resource);
          }
        } catch (e) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          throw Error(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `error processing transfer task (pos: ${t.Pos}, type: ${
              "progress" in str ? "constructionSite" : "structure"
              // eslint-disable-next-line @typescript-eslint/restrict-template-expressions,@typescript-eslint/no-unsafe-member-access
            }): ${(e as any).message}`
          );
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
