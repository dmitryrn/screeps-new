import { ErrorMapper } from "./utils/ErrorMapper";
import { placeExtensions, shouldBeUpgradingController, shouldSpawnMoreHarvesters, spawnHarvester } from "./logic";
import { Harvester } from "./harvester-creep";
import { handleRepairs } from "./repairer";
import { RoomMining } from "./room-mining";

export const ROLE_HARVESTER = "ROLE_HARVESTER";
export const ROLE_REPAIRER = "ROLE_REPAIRER";
export const ROLE_MINER = "ROLE_MINER";
export type RoleConstant = typeof ROLE_HARVESTER | typeof ROLE_REPAIRER | typeof ROLE_MINER;

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

    repairerReadyToRepair?: boolean;

    minerAssignedSourceId?: string;
    minerReadyToDeposit?: boolean;
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

  try {
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
    if (room.name !== "E35N17" && room.name !== "sim") {
      throw Error(`got weird room name ${room.name}`);
    }
    const spawns = Object.values(Game.spawns);
    if (spawns.length !== 1) throw Error("more spawns than expected");
    const spawn = spawns[0];

    if (Memory.shouldBeUpgradingController === undefined) Memory.shouldBeUpgradingController = false;
    shouldBeUpgradingController(room);

    const creeps = Object.values(Game.creeps);

    const mining = new RoomMining(room, spawn, creeps);
    mining.process();

    handleRepairs(room, spawn, creeps);

    if (shouldSpawnMoreHarvesters(room, mining.getMines())) {
      spawnHarvester(room, spawn);
    }

    for (const creep of creeps) {
      if (creep.memory.role === ROLE_HARVESTER) {
        const harvester = new Harvester(
          creep,
          Memory.shouldBeUpgradingController,
          markObject,
          whoMarkedObject,
          mining.getMines()
        );
        harvester.perform();
      }
    }

    placeExtensions(room, spawn);
  } catch (e) {
    console.log("caught something in main", e);
  }
});
