import { ROLE_HARVESTER, Task, TaskType } from "./state";
import {
  chessGetNextLocation,
  getUniqueCreepName,
  notifyOk,
  requireCreateConstructionSiteTask,
  requireRoomByName
} from "./utils";
import { Executor } from "./executor";
import { max } from "lodash";

export function shouldSpawnMoreHarvesters(room: Room): boolean {
  const harvesters = room.find(FIND_MY_CREEPS, {
    filter: object => object.memory.role === ROLE_HARVESTER
  });

  if (!room.controller) {
    console.log("no controller found");
    return false;
  }

  if (room.controller.level === 8) {
    console.log("ctrl is lvl 8");
    return false;
  }

  const extensions = room.find(FIND_MY_STRUCTURES, {
    filter: object => object.structureType === STRUCTURE_EXTENSION
  });
  if (extensions.length >= 4) return harvesters.length < 8;

  return harvesters.length < 4;
}

export function spawnHarvester(room: Room) {
  const spawns = room.find(FIND_MY_SPAWNS);
  if (!spawns[0]) {
    throw Error("can't find a spawn in room");
  }
  if (spawns[0].spawning) {
    console.log("spawning");
    return;
  }
  return spawns[0].spawnCreep([MOVE, MOVE, WORK, CARRY], getUniqueCreepName(Object.values(Game.creeps)), {
    memory: {
      role: ROLE_HARVESTER
    }
  });
}

const levelToExtensions: { [k: number]: number } = {
  1: 0,
  2: 5,
  3: 10,
  4: 20,
  5: 30,
  6: 40,
  7: 50,
  8: 60
};

export function placeExtensions(room: Room, spawn: StructureSpawn, executor: Executor) {
  if (!room.controller) {
    console.log("no controller found");
    return;
  }

  const extensions = spawn.room.find(FIND_MY_STRUCTURES, {
    filter: object => object.structureType === STRUCTURE_EXTENSION
  });
  if (extensions.length === 8) return;

  const maxAllowedExtensions = levelToExtensions[room.controller.level];
  if (maxAllowedExtensions === undefined) {
    console.log(`invalid room control level ${room.controller.level}`);
    return;
  }
  if (extensions.length >= maxAllowedExtensions) {
    return;
  }

  const extensionsConstrSites = spawn.room.find(FIND_MY_CONSTRUCTION_SITES, {
    filter: object => object.structureType === STRUCTURE_EXTENSION
  });
  if (extensionsConstrSites.length > 0) return;

  const [x, y] = chessGetNextLocation([spawn.pos.x, spawn.pos.y], (x, y) => {
    const res = spawn.room.lookAt(x, y);
    for (const re of res) {
      if (re.type === "structure") return true;
      if (re.type === "terrain" && re.terrain !== "plain") return true;
    }
    return false;
  });

  const code = executor.execute({
    Type: TaskType.CreateConstructionSite,
    StructureType: STRUCTURE_EXTENSION,
    Pos: [x, y],
    RoomName: spawn.room.name
  });
  if (code !== OK) console.log(`error placing extension at ${[x, y]}, code: ${code}`);
}

export function shouldBeUpgradingController(room: Room) {
  if (!room.controller) {
    console.log("no controller found");
    return;
  }

  if (room.controller.ticksToDowngrade >= 2000) {
    Memory.shouldBeUpgradingController = false;
  }

  if (room.controller.ticksToDowngrade <= 1000 || Memory.shouldBeUpgradingController) {
    Memory.shouldBeUpgradingController = true;
  }
}
