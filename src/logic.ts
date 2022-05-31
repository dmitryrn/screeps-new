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
  if (extensions.length >= 5) {
    return harvesters.length < 8;
  }

  return harvesters.length < 4;
}

export function spawnHarvester(room: Room): undefined {
  const spawns = room.find(FIND_MY_SPAWNS);
  if (!spawns[0]) {
    throw Error("can't find a spawn in room");
  }
  if (spawns[0].spawning) {
    console.log("spawning");
    return;
  }

  const maxMoney = 5 * 50 + 300;

  let moveParts = 2;
  let workParts = 1;
  let carryParts = 1;
  let cost;
  while (true) {
    const intermediateCost =
      (moveParts + 2) * BODYPART_COST[MOVE] +
      (workParts + 1) * BODYPART_COST[WORK] +
      (carryParts + 1) * BODYPART_COST[CARRY];
    if (intermediateCost <= maxMoney) {
      moveParts += 2;
      workParts += 1;
      carryParts += 1;
      cost = intermediateCost;
      continue;
    }
    break;
  }

  const bodyParts = [
    ...Array.from({ length: moveParts }).map(() => MOVE),
    ...Array.from({ length: workParts }).map(() => WORK),
    ...Array.from({ length: carryParts }).map(() => CARRY)
  ];

  const code = spawns[0].spawnCreep(bodyParts, getUniqueCreepName(Object.values(Game.creeps)), {
    memory: {
      role: ROLE_HARVESTER
    }
  });
  if (code !== OK) {
    console.log(`error spawning creep (${bodyParts}, cost: ${cost}): ${code}`);
  }
  return;
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

export function isInRangeOfEnemy(pos: RoomPosition): boolean {
  const room = Game.rooms[pos.roomName];
  if (!room) {
    throw Error('isInRangeOfEnemy: didn"t find room');
  }
  const controller = room.controller;
  if (!controller) {
    throw Error('isInRangeOfEnemy: didn"t find controller');
  }

  const res = room.lookForAtArea(LOOK_CREEPS, pos.x - 3, pos.y - 3, pos.x + 3, pos.y + 3, true);
  for (const re of res) {
    if (re.creep.owner !== controller.owner) {
      return re.creep.getActiveBodyparts(RANGED_ATTACK) > 0;
    }
  }
  return false;
}
