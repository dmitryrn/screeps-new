import { getUniqueCreepName } from "./utils";
import { ROLE_REPAIRER } from "./main";

function log(...msgs: string[]) {
  console.log("handleRepairs:", ...msgs);
}

export function handleRepairs(room: Room, spawn: StructureSpawn, creeps: Creep[]) {
  if (!room.controller) {
    log("no controller in the room");
    return;
  }
  if (spawn.room !== room) {
    log("room mismatch");
    return;
  }

  const repairers = [];
  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < creeps.length; i++) {
    if (creeps[i].memory.role === ROLE_REPAIRER) {
      repairers.push(creeps[i]);
    }
  }

  for (const creep of repairers) {
    if (creep.store.energy === 0) {
      creep.memory.repairerReadyToRepair = false;
    }

    if (creep.store.getFreeCapacity() === 0 || creep.memory.repairerReadyToRepair) {
      creep.memory.repairerReadyToRepair = true;

      const targets = creep.room.find(FIND_STRUCTURES, {
        filter: object => object.structureType !== STRUCTURE_WALL && object.hits < object.hitsMax
      });

      targets.sort((a, b) => a.hits - b.hits);

      if (targets.length > 0) {
        console.log("repair target", targets[0]);
        if (creep.repair(targets[0]) === ERR_NOT_IN_RANGE) {
          creep.moveTo(targets[0]);
        }
      } else {
        const rally = room.find(FIND_FLAGS, {
          filter: o => o.name === "REPAIRERS"
        });
        if (!rally) {
          throw Error("no rally point for repairers");
        }
        creep.moveTo(rally[0]);
      }
    } else {
      const str = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: o =>
          (o.structureType === STRUCTURE_CONTAINER ||
            o.structureType === STRUCTURE_STORAGE ||
            o.structureType === STRUCTURE_SPAWN ||
            o.structureType === STRUCTURE_EXTENSION) &&
          o.store.energy >= 0
      });
      if (!str) {
        log(`didn't find any energy sources`);
        return;
      }
      if (!("store" in str)) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        console.log(`found struct at ${str.pos} but it doesn't have store, shouldn't happen`);
        return;
      }
      if (creep.withdraw(str, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        const c = creep.moveTo(str);
        if (c !== OK) {
          log(`got ${c} when moving to str`);
        }
      }
    }
  }

  if (repairers.length >= 2) return;

  if (spawn.spawning) return;

  const code = spawn.spawnCreep([CARRY, WORK, MOVE, MOVE], getUniqueCreepName(creeps), {
    memory: {
      role: ROLE_REPAIRER,
      repairerReadyToRepair: false
    }
  });
  if (code !== OK) {
    if (code !== ERR_NOT_ENOUGH_RESOURCES) {
      console.log(`got bad code ${code}`);
    }
    return;
  }
}
