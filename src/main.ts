import { ErrorMapper } from "utils/ErrorMapper";
import { RoleConstant, TaskType, machine } from "./state";
import {
  getUniqueCreepName,
  notifyOk,
  requireCreateConstructionSiteTask,
  requireCreepByName,
  requireHarvestTask,
  requireMoveToTask,
  requireOk,
  requireRoomByName,
  requireTransferTask
} from "./utils";

declare global {
  /*
    Example types, expand on these or remove them and add your own.
    Note: Values, properties defined here do no fully *exist* by this type definiton alone.
          You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

    Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
    Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
  */

  // Memory extension samples
  interface Memory {
    uuid: number;
    log: any;
  }

  interface CreepMemory {
    role: RoleConstant;

    harvesterReadyToDeposit?: boolean;
  }

  // Syntax for adding proprties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  const state = machine(
    {
      Tasks: []
    },
    ""
  );

  for (const task of state.Tasks) {
    console.log(TaskType[task.Type]);
    switch (task.Type) {
      case TaskType.SpawnCreep: {
        if (!task.SpawnName) throw Error("no spawn name");
        const spawn = Game.spawns[task.SpawnName];
        if (!spawn) throw Error("no spawn found");
        if (!task.BodyParts) throw Error("no body parts");
        notifyOk(spawn.spawnCreep(task.BodyParts, getUniqueCreepName(Object.values(Game.creeps))));
        break;
      }
      case TaskType.Harvest: {
        const t = requireHarvestTask(task);
        const creep = requireCreepByName(t.CreepName);
        notifyOk(creep.harvest(t.HarvestTarget));
        break;
      }
      case TaskType.MoveTo: {
        const t = requireMoveToTask(task);
        const creep = requireCreepByName(t.CreepName);
        notifyOk(creep.moveTo(t.Target));
        break;
      }
      case TaskType.Transfer: {
        const t = requireTransferTask(task);
        const creep = requireCreepByName(t.CreepName);
        notifyOk(creep.transfer(t.TransferTarget, t.Resource));
        break;
      }
      case TaskType.CreateConstructionSite: {
        const t = requireCreateConstructionSiteTask(task);
        const room = requireRoomByName(t.RoomName);
        notifyOk(room.createConstructionSite(t.Pos[0], t.Pos[1], t.StructureType));
        break;
      }
    }
  }
});
