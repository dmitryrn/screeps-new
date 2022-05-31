import { ErrorMapper } from "utils/ErrorMapper";
import { ROLE_HARVESTER, RoleConstant, Task, TaskType } from "./state";
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

    markedObjects: { [k: string]: string };
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

  if (!Memory.markedObjects) Memory.markedObjects = {};
  for (const [k, v] of Object.entries(Memory.markedObjects)) {
    if (typeof v !== "string") {
      delete Memory.markedObjects[k];
    }
  }
  if (Game.time % 10 === 0) {
    for (const id of Object.keys(Memory.markedObjects)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (!Game.getObjectById(id)) {
        delete Memory.markedObjects[id];
      }
    }
  }
  if (Game.time % 100 === 0) {
    Memory.markedObjects = {};
  }

  function markObject(id: string, creepId: string) {
    Memory.markedObjects[id.toString()] = creepId.toString();
  }
  function whoMarkedObject(id: string): string | undefined {
    return Memory.markedObjects[id.toString()];
  }

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

  const executor = new Executor(spawn);

  for (const creep of Object.values(Game.creeps)) {
    if (creep.memory.role === ROLE_HARVESTER) {
      const harvester = new Harvester(creep, executor, Memory.shouldBeUpgradingController, markObject, whoMarkedObject);
      harvester.perform();
    }
  }

  placeExtensions(room, spawn, executor);
});
