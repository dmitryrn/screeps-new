import { creepPrice, getUniqueCreepName } from "./utils";
import { ROLE_DISCOVERER, ROLE_HARVESTER, SMALL_ATTACKER } from "./main";
import { Mine } from "./room-mining";

export function shouldSpawnMoreHarvesters(creeps: Creep[], mines: Mine[]): boolean {
  const harvesters = creeps.filter(c => c.memory.role === ROLE_HARVESTER);

  let readyMines = 0;
  for (const m of mines) {
    if (!m.getContainer()) continue;
    if (!m.isMinerAlive()) continue;
    readyMines++;
  }
  const additional = 1 * readyMines;

  return harvesters.length < 8 + additional;
}

export function spawnHarvester(
  room: Room,
  spawn: StructureSpawn,
  creeps: Creep[],
  creepSpawning: CreepSpawning
): undefined {
  if (spawn.spawning) {
    // console.log("spawning");
    return;
  }

  let bodyParts = [WORK, CARRY, MOVE, MOVE];
  if (getExtensionsCount(room) >= 5) {
    bodyParts = [CARRY, CARRY, WORK, WORK, MOVE, MOVE, MOVE, MOVE];
  }
  if (creeps.filter(c => c.memory.role === ROLE_HARVESTER).length === 0) {
    bodyParts = [WORK, CARRY, MOVE, MOVE];
  }

  const code = creepSpawning.spawnCreep(spawn, bodyParts, getUniqueCreepName(Object.values(Game.creeps), "harvester"), {
    role: ROLE_HARVESTER
  });
  if (code === null) return; // already queued
  if (code !== OK) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.log(`error spawning harvester (${bodyParts}): ${code}`);
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

// export function placeExtensions(room: Room, spawn: StructureSpawn) {
//   if (!room.controller) {
//     console.log("no controller found");
//     return;
//   }
//
//   if (getExtensionsCount(room) === 8) return;
//
//   const maxAllowedExtensions = levelToExtensions[room.controller.level];
//   if (maxAllowedExtensions === undefined) {
//     console.log(`invalid room control level ${room.controller.level}`);
//     return;
//   }
//   if (getExtensionsCount(room) >= maxAllowedExtensions) return;
//
//   const extensionsConstrSites = spawn.room.find(FIND_MY_CONSTRUCTION_SITES, {
//     filter: object => object.structureType === STRUCTURE_EXTENSION
//   });
//   if (extensionsConstrSites.length > 0) return;
//
//   // eslint-disable-next-line @typescript-eslint/no-shadow
//   const [x, y] = chessGetNextLocation([spawn.pos.x, spawn.pos.y], (x, y) => {
//     const res = spawn.room.lookAt(x, y);
//     for (const re of res) {
//       if (re.type === "structure") return true;
//       if (re.type === "terrain" && re.terrain !== "plain") return true;
//     }
//     return false;
//   });
//
//   const code = room.createConstructionSite(x, y, STRUCTURE_EXTENSION);
//   // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
//   if (code !== OK) console.log(`error placing extension at ${[x, y]}, code: ${code}`);
// }

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

  const s = Object.values(Game.spawns)[0];
  s.room
    .lookForAtArea(LOOK_STRUCTURES, s.pos.y - 3, s.pos.x - 3, s.pos.y + 3, s.pos.x + 3, true)
    .filter(o => o.type === "structure" && o.structure.structureType === "extension")
    .forEach(ext => ext.structure.destroy());

  const res = room.lookForAtArea(LOOK_CREEPS, pos.y - 5, pos.x - 5, pos.y + 5, pos.x + 5, true);
  for (const re of res) {
    if (re.creep.owner !== controller.owner) {
      return re.creep.getActiveBodyparts(RANGED_ATTACK) > 0;
    }
  }
  return false;
}

export function smallAttack(spawn: StructureSpawn, creeps: Creep[], creepSpawning: CreepSpawning) {
  const attackers = [];
  for (const creep of creeps) {
    if (creep.memory.role === SMALL_ATTACKER) attackers.push(creep);
  }

  const claimer = [MOVE, CLAIM];
  const attacker = [MOVE, ATTACK];

  const roomToAttack = "E35N18";
  if (attackers.length < 1) {
    const b: BodyPartConstant[] = attacker;
    // if (attackers.some(c => !!c.body.find(x => x.type === ATTACK))) {
    //   b = claimer;
    // }
    console.log(
      "spawn attacker",
      creepSpawning.spawnCreep(spawn, b, getUniqueCreepName(creeps, "juicer"), {
        role: SMALL_ATTACKER
      })
    );
  } else {
    // move
    for (const creep of attackers) {
      if (creep.room.name !== roomToAttack) {
        const p = new RoomPosition(23, 47, roomToAttack);
        creep.moveTo(p);
      } else {
        // eslint-disable-next-line no-empty
        if (moveAwayFromRoomEdge(creep)) {
        } else {
          const closestHostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
          if (closestHostile) {
            if (creep.attack(closestHostile) === ERR_NOT_IN_RANGE) {
              creep.moveTo(closestHostile);
            }
          }
          if (creep.room.controller && creep.getActiveBodyparts(CLAIM) > 0) {
            console.log("claim", creep.claimController(creep.room.controller));
          }
        }
      }
    }
  }
}

export function moveAwayFromRoomEdge(creep: Creep): boolean {
  const r = Math.floor(Math.random() * 3);

  if (creep.pos.x === 0) {
    const d = [TOP_RIGHT, RIGHT, BOTTOM_RIGHT][r];
    creep.move(d);
    return true;
  }
  if (creep.pos.x === 49) {
    const d = [TOP_LEFT, LEFT, BOTTOM_LEFT][r];
    creep.move(d);
    return true;
  }
  if (creep.pos.y === 0) {
    const d = [BOTTOM_LEFT, BOTTOM, BOTTOM_RIGHT][r];
    creep.move(d);
    return true;
  }
  if (creep.pos.y === 49) {
    const d = [TOP_LEFT, TOP, TOP_RIGHT][r];
    creep.move(d);
    return true;
  }
  return false;
}

let memoExtensionsCount: undefined | number;
let lastRefreshed = Date.now();

export function getExtensionsCount(homeRoom: Room): number {
  if (memoExtensionsCount !== undefined && Date.now() - lastRefreshed < 1000 * 10) {
    return memoExtensionsCount;
  }

  const extensions = homeRoom.find(FIND_MY_STRUCTURES, {
    filter: object => object.structureType === STRUCTURE_EXTENSION
  });
  lastRefreshed = Date.now();
  memoExtensionsCount = extensions.length;
  return extensions.length;
}

export function placeExtensionsV2(room: Room) {
  if (room.name !== "E35N17") {
    return;
  }

  if (!room.controller) {
    console.log("no controller found");
    return;
  }

  if (room.find(FIND_MY_CONSTRUCTION_SITES).length > 0) return;

  const maxAllowedExtensions = levelToExtensions[room.controller.level];
  if (maxAllowedExtensions === undefined) {
    console.log(`invalid room control level ${room.controller.level}`);
    return;
  }
  if (getExtensionsCount(room) >= maxAllowedExtensions) return;

  const tl = [36, 10];
  const br = [48, 23];

  const path = new Set<string>(); // x-y

  const checkWall = (x: number, y: number) => room.lookAt(x, y).some(o => o.terrain === "wall");

  const checkInBounds = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < 50 && y < 50 && !checkWall(x, y) && x <= br[0] && x >= tl[0] && y >= tl[1] && y <= br[1];

  const placeSite = (x: number, y: number) => room.createConstructionSite(x, y, STRUCTURE_EXTENSION);

  const placePath1 = () => {
    let x = tl[0];
    let y = tl[1];
    let c = x;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (y > br[1]) {
        if (x >= br[0]) break;

        c += 4;
        x = c;
        y = tl[1];
      }

      if (checkInBounds(x, y)) {
        room.visual.circle(x, y, {
          fill: "#00FF00"
        });
        path.add(x.toString() + "-" + y.toString());
      }
      x--;
      y++;
    }
  };
  const placePath2 = () => {
    let c = tl[0] - (br[1] - tl[1]);
    let x = c;
    let y = tl[1];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (y > br[1]) {
        c += 4;
        x = c;
        y = tl[1];

        if (x >= br[0]) break;
      }

      if (checkInBounds(x, y)) {
        room.visual.circle(x, y, {
          fill: "#00FF00"
        });
        path.add(x.toString() + "-" + y.toString());
      }
      x++;
      y++;
    }
  };

  placePath1();
  placePath2();

  let placed = false;

  let totalMarked = 0;
  outer: for (let y = tl[1]; y <= br[1]; y++) {
    for (let x = tl[0]; x <= br[0]; x++) {
      if (!path.has(x.toString() + "-" + y.toString()) && !checkWall(x, y)) {
        room.visual.circle(x, y, {
          fill: "#FFFF00"
        });
        if (room.lookAt(x, y).some(o => o.type === "structure")) {
          continue;
        }
        const c = placeSite(x, y);
        placed = true;
        if (c !== OK) {
          console.log(`error placing construction site`);
        }
        if (placed) return;
        if (totalMarked === 49) {
          break outer;
        }
        totalMarked++;
      }
    }
  }

  console.log(`total extensions drawn`, totalMarked);
}

// moves a 1 MOVE creep to a room so that I have visibility of it
export function discover(targetRooms: string[], spawn: StructureSpawn, creeps: Creep[], creepSpawning: CreepSpawning) {
  for (const room of targetRooms) {
    const creep = creeps.find(c => c.memory.discovererTargetRoom === room);
    if (!creep) {
      if (spawn.spawning) return;
      const parts = [MOVE];
      creepSpawning.spawnCreep(spawn, parts, getUniqueCreepName(creeps, "sussy-baka"), {
        role: ROLE_DISCOVERER,
        discovererTargetRoom: room
      });
      continue;
    }

    if (creep.pos.roomName !== room) {
      const route = Game.map.findRoute(creep.room.name, room);
      if (typeof route !== "object" || route.length === 0) {
        console.log(`discoverer: no path`);
        return;
      }
      const exit = creep.pos.findClosestByPath(route[0].exit);
      if (!exit) {
        console.log(`discoverer: can't find exit`);
        return;
      }
      creep.moveTo(exit);
    } else {
      moveAwayFromRoomEdge(creep);
    }
  }
}

export function closestToSpawnExtensions(spawn: StructureSpawn, cost: number): StructureExtension[] | null {
  const exts = spawn.room.find(FIND_MY_STRUCTURES, {
    filter: o => o.structureType === "extension" && o.store.energy > 0
  }) as unknown as StructureExtension[];
  if (exts.length === 0) return [];
  if (exts[0].structureType !== "extension") {
    console.log(`unexpectedly got non-extension`);
    return [];
  }

  const targets = [];
  exts.sort((a, b) => a.pos.getRangeTo(spawn) - b.pos.getRangeTo(spawn));

  let intermCost = 0;
  for (const ext of exts) {
    if (intermCost >= cost) return targets;
    intermCost += ext.store.energy;
    targets.push(ext);
  }

  // console.log(`closestExtensionsToSpawn: not enough to cover cost, returning what we got`);
  return targets;
}

export class CreepSpawning {
  private queuedSpawn = false;

  public spawnCreep(
    spawn: StructureSpawn,
    parts: BodyPartConstant[],
    name: string,
    memory?: CreepMemory
  ): ScreepsReturnCode | null {
    if (this.queuedSpawn || spawn.spawning) return null;

    const opts: SpawnOptions = {
      energyStructures: closestToSpawnExtensions(spawn, creepPrice(parts)) ?? undefined
    };
    if (memory) opts.memory = memory;

    const c = spawn.spawnCreep(parts, name, opts);
    if (c === OK) {
      console.log(`spawnCreep(): queued spawn '${name}'`);
      this.queuedSpawn = true;
      return null;
    }

    return c;
  }
}

export function placeStorage(rcl: number, spawn: StructureSpawn) {
  if (rcl < 4) return;
  if (spawn.room.storage) return;

  if (
    spawn.room.find(FIND_MY_STRUCTURES, {
      filter: o => o.structureType === "storage"
    }).length > 0
  )
    return;
  if (
    spawn.room.find(FIND_MY_CONSTRUCTION_SITES, {
      filter: o => o.structureType === "storage"
    }).length > 0
  )
    return;

  const c = spawn.room.createConstructionSite(spawn.pos.x - 1, spawn.pos.y - 1, STRUCTURE_STORAGE);
  if (c !== OK) console.log(`error placing storage`);
}

export function placeTower(rcl: number, spawn: StructureSpawn) {
  if (rcl < 3) return;
  let allowedTowers = 1;
  if (rcl > 4) allowedTowers += 1;
  if (rcl > 6) allowedTowers += 1;
  if (rcl === 8) allowedTowers += 3;

  if (
    spawn.room.find(FIND_MY_STRUCTURES, {
      filter: o => o.structureType === "tower"
    }).length > allowedTowers
  )
    return;
  if (
    spawn.room.find(FIND_MY_CONSTRUCTION_SITES, {
      filter: o => o.structureType === "tower"
    }).length > 0
  )
    return;

  const c = spawn.room.createConstructionSite(spawn.pos.x + 1, spawn.pos.y + 1, STRUCTURE_TOWER);
  if (c !== OK) console.log(`error placing tower`);
}
