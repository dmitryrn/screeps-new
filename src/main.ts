import { ErrorMapper } from "utils/ErrorMapper";
import { ROLE_HARVESTER, RoleConstant, Task, TaskType } from "./state";
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
import { placeExtensions, shouldBeUpgradingController, shouldSpawnMoreHarvesters, spawnHarvester } from "./logic";
import { Harvester } from "./harvester-creep";
import { Executor } from "./executor";

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
    shouldBeUpgradingController: boolean;
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

  const tasks: Task[] = [];

  const rooms = Object.values(Game.rooms);
  if (rooms.length !== 1) {
    throw Error("found more rooms than expected");
  }
  const room = rooms[0];
  const spawns = Object.values(Game.spawns);
  if (spawns.length !== 1) throw Error("more spawns than expected");
  const spawn = spawns[0];

  if (Memory.shouldBeUpgradingController === undefined) Memory.shouldBeUpgradingController = false;
  shouldBeUpgradingController(room);

  if (shouldSpawnMoreHarvesters(room)) {
    spawnHarvester(room);
  }

  for (const creep of Object.values(Game.creeps)) {
    if (creep.memory.role === ROLE_HARVESTER) {
      const harvester = new Harvester(creep, Memory.shouldBeUpgradingController);
      const task = harvester.produceTask();
      if (task) {
        tasks.push(task);
      }
    }
  }

  const executor = new Executor();

  placeExtensions(room, spawn, executor);

  for (const task of tasks) {
    console.log(TaskType[task.Type]);
    switch (task.Type) {
      case TaskType.SpawnCreep: {
        if (!task.SpawnName) throw Error("no spawn name");
        const spawnLocal = Game.spawns[task.SpawnName];
        if (!spawnLocal) throw Error("no spawn found");
        if (!task.BodyParts) throw Error("no body parts");
        notifyOk(spawnLocal.spawnCreep(task.BodyParts, getUniqueCreepName(Object.values(Game.creeps))));
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
        notifyOk(creep.moveTo(new RoomPosition(t.Pos[0], t.Pos[1], t.RoomName)));
        break;
      }
      case TaskType.Transfer: {
        const t = requireTransferTask(task);
        const creep = requireCreepByName(t.CreepName);
        const pos = new RoomPosition(t.Pos[0], t.Pos[1], t.RoomName);
        const res = pos.look();
        let str: Structure | ConstructionSite | StructureController | undefined;
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
        try {
          if ("progress" in str && !("ticksToDowngrade" in str)) {
            requireOk(creep.build(str));
          } else {
            requireOk(creep.transfer(str, t.Resource));
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
        break;
      }
      case TaskType.CreateConstructionSite: {
        const t = requireCreateConstructionSiteTask(task);
        const roomLocal = requireRoomByName(t.RoomName);
        notifyOk(roomLocal.createConstructionSite(t.Pos[0], t.Pos[1], t.StructureType));
        break;
      }
    }
  }
});
