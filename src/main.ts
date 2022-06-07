import { ErrorMapper } from "./utils/ErrorMapper";
import {
  CreepSpawning,
  discover,
  placeExtensionsV2,
  placeStorage,
  placeTower,
  shouldBeUpgradingController,
  shouldSpawnMoreHarvesters,
  smallAttack,
  spawnHarvester
} from "./logic";
import { Harvester } from "./harvester-creep";
import { handleRepairs } from "./repairer";
import { RoomMining } from "./room-mining";
import { seed } from "./utils";

export const ROLE_HARVESTER = "ROLE_HARVESTER";
export const ROLE_REPAIRER = "ROLE_REPAIRER";
export const ROLE_MINER = "ROLE_MINER";
export const SMALL_ATTACKER = "SMALL_ATTACKER";
export const ROLE_DISCOVERER = "ROLE_DISCOVERER";
export type RoleConstant =
  | typeof ROLE_HARVESTER
  | typeof ROLE_REPAIRER
  | typeof ROLE_MINER
  | typeof SMALL_ATTACKER
  | typeof ROLE_DISCOVERER;

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

    roleSmallAttacker?: boolean;

    discovererTargetRoom?: string;
  }

  // Syntax for adding proprties to `global` (ex "global.log")
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}

let c = 0;
function getNextOffset(): number {
  c += 1;
  return c;
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

  seed(10);

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

    // eslint-disable-next-line no-inner-declarations
    function markObject(id: string, creepId: string) {
      Memory.markedObjects[id.toString()] = creepId.toString();
    }
    // eslint-disable-next-line no-inner-declarations
    function whoMarkedObject(id: string): string | undefined {
      return Memory.markedObjects[id.toString()];
    }

    // if (rooms.length !== 1) {
    //   throw Error("found more rooms than expected");
    // }

    const homeRoom = Game.rooms.sim ?? Game.rooms.E35N17;
    if (!homeRoom) {
      throw Error("didn't find room in main");
    }

    if (!homeRoom.controller) {
      Game.notify("no controller found in home room, FIX this");
      return;
    }
    const homeRCL = homeRoom.controller.level;

    // if (room.name !== "E35N17" && room.name !== "sim") {
    //   throw Error(`got weird room name ${room.name}`);
    // }
    const spawns = Object.values(Game.spawns);
    if (spawns.length !== 1) throw Error("more spawns than expected");
    const spawn = spawns[0];

    if (Memory.shouldBeUpgradingController === undefined) Memory.shouldBeUpgradingController = false;
    shouldBeUpgradingController(homeRoom);

    const creeps = Object.values(Game.creeps);

    const creepSpawning = new CreepSpawning();

    const mining = new RoomMining(homeRoom, [homeRoom.name, "E35N18"], spawn, creeps, creepSpawning);
    mining.process();

    // handleRepairs(homeRoom, spawn, creeps, creepSpawning);

    if ((Game.time + getNextOffset()) % 10 === 0) {
      if (shouldSpawnMoreHarvesters(creeps, mining.getMines())) {
        spawnHarvester(homeRoom, spawn, creeps, creepSpawning);
      }
    }

    if ((Game.time + getNextOffset()) % 10 === 0) {
      console.log("trying to place extensions");
      // placeExtensions(room, spawn);
      placeExtensionsV2(homeRoom);
    }

    smallAttack(spawn, creeps, creepSpawning);

    discover(["E35N18"], spawn, creeps, creepSpawning);

    for (const creep of creeps) {
      if (creep.memory.role === ROLE_HARVESTER) {
        const harvester = new Harvester(
          creep,
          Memory.shouldBeUpgradingController,
          markObject,
          whoMarkedObject,
          mining.getMines(),
          homeRoom
        );
        harvester.perform();
      }
    }

    if ((Game.time + getNextOffset()) % 10 === 0) {
      placeStorage(homeRCL, spawn);
    }

    if ((Game.time + getNextOffset()) % 10 === 0) {
      placeTower(homeRCL, spawn);
    }
  } catch (e) {
    console.log("caught something in main", e);
  }
});
