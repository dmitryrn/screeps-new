import { chessGetNextLocation, getUniqueCreepName } from "./utils";
import { ROLE_HARVESTER, ROLE_MINER } from "./main";
import { Mine } from "./room-mining";
import { read } from "fs";

export function shouldSpawnMoreHarvesters(room: Room, mines: Mine[]): boolean {
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

  // const extensions = room.find(FIND_MY_STRUCTURES, {
  //   filter: object => object.structureType === STRUCTURE_EXTENSION
  // });
  // if (extensions.length >= 5) {
  //   return harvesters.length < 8;
  // }

  let readyMines = 0;
  for (const m of mines) {
    if (!m.isContainerReady()) continue;
    if (m.getAliveMiners() < m.getPossibleSimultaniousMiners()) continue;
    readyMines++;
  }

  return harvesters.length < 8 + 4 * readyMines;
}

export function spawnHarvester(room: Room, spawn: StructureSpawn): undefined {
  if (spawn.spawning) {
    console.log("spawning");
    return;
  }

  const extensions = room.find(FIND_MY_STRUCTURES, {
    filter: object => object.structureType === STRUCTURE_EXTENSION
  });

  const maxMoney = extensions.length * 50 + 300;

  let moveParts = 0;
  let workParts = 0;
  let carryParts = 0;
  let cost;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const intermediateCost =
      (moveParts + 2) * BODYPART_COST[MOVE] +
      (workParts + 1) * BODYPART_COST[WORK] +
      (carryParts + 1) * BODYPART_COST[CARRY];
    if (intermediateCost <= maxMoney) {
      cost = intermediateCost;
      moveParts += 2;
      workParts += 1;
      carryParts += 1;
      continue;
    }
    break;
  }

  const bodyParts = [
    ...Array.from({ length: carryParts }).map(() => CARRY),
    ...Array.from({ length: workParts }).map(() => WORK),
    ...Array.from({ length: moveParts }).map(() => MOVE)
  ];

  const code = spawn.spawnCreep(bodyParts, getUniqueCreepName(Object.values(Game.creeps)), {
    memory: {
      role: ROLE_HARVESTER
    }
  });
  if (code !== OK) {
    // console.log(`error spawning creep (${bodyParts}, cost: ${cost}): ${code}`);
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

export function placeExtensions(room: Room, spawn: StructureSpawn) {
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

  // eslint-disable-next-line @typescript-eslint/no-shadow
  const [x, y] = chessGetNextLocation([spawn.pos.x, spawn.pos.y], (x, y) => {
    const res = spawn.room.lookAt(x, y);
    for (const re of res) {
      if (re.type === "structure") return true;
      if (re.type === "terrain" && re.terrain !== "plain") return true;
    }
    return false;
  });

  const code = room.createConstructionSite(x, y, STRUCTURE_EXTENSION);
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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

  const res = room.lookForAtArea(LOOK_CREEPS, pos.y - 5, pos.x - 5, pos.y + 5, pos.x + 5, true);
  for (const re of res) {
    if (re.creep.owner !== controller.owner) {
      return re.creep.getActiveBodyparts(RANGED_ATTACK) > 0;
    }
  }
  return false;
}
