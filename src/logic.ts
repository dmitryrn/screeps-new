import { chessGetNextLocation, getUniqueCreepName } from "./utils";
import { ROLE_HARVESTER, SMALL_ATTACKER } from "./main";
import { Mine } from "./room-mining";
import { callbackify } from "util";

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

  let readyMines = 0;
  for (const m of mines) {
    if (!m.isContainerReady()) continue;
    if (m.getAliveMiners() < m.getPossibleSimultaniousMiners()) continue;
    readyMines++;
  }
  const additional = 1 * readyMines;

  return harvesters.length < 8 + additional;
}

export function spawnHarvester(room: Room, spawn: StructureSpawn): undefined {
  if (spawn.spawning) {
    console.log("spawning");
    return;
  }

  const maxMoney = getExtensionsCount(room) * 50 + 300;

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

  const code = spawn.spawnCreep(bodyParts, getUniqueCreepName(Object.values(Game.creeps), "harvester"), {
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

  const res = room.lookForAtArea(LOOK_CREEPS, pos.y - 5, pos.x - 5, pos.y + 5, pos.x + 5, true);
  for (const re of res) {
    if (re.creep.owner !== controller.owner) {
      return re.creep.getActiveBodyparts(RANGED_ATTACK) > 0;
    }
  }
  return false;
}

export function smallAttack(spawn: StructureSpawn, creeps: Creep[]) {
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
      spawn.spawnCreep(b, getUniqueCreepName(creeps, "juicer"), {
        memory: {
          role: SMALL_ATTACKER
        }
      })
    );
  } else {
    // move
    for (const creep of attackers) {
      if (creep.room.name !== roomToAttack) {
        const p = new RoomPosition(23, 47, roomToAttack);
        creep.moveTo(p);
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

let memoExtensionsCount: undefined | Map<string, number>;
export function getExtensionsCount(room: Room): number {
  if (!memoExtensionsCount) {
    memoExtensionsCount = new Map();
  }
  const n = memoExtensionsCount.get(room.name);
  if (n !== undefined) return n;

  const extensions = room.find(FIND_MY_STRUCTURES, {
    filter: object => object.structureType === STRUCTURE_EXTENSION
  });
  memoExtensionsCount.set(room.name, extensions.length);
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

  if (
    room.find(FIND_MY_CONSTRUCTION_SITES, {
      filter: o => o.structureType === "extension"
    }).length > 0
  )
    return;

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
