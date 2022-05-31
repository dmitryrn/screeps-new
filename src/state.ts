// import { battleStats, canForSureWin, chessGetNextLocation, creepPrice } from "./utils";
// import { NoEnergySourceFound } from "./says";
//
export const ROLE_HARVESTER = "ROLE_HARVESTER";
export type RoleConstant = typeof ROLE_HARVESTER;

export enum TaskType {
  MoveTo,
  SpawnCreep,
  Transfer,
  Harvest,
  CreateConstructionSite
}

export interface Task {
  Type: TaskType;
  Pos?: [number, number];
  SpawnName?: string;
  BodyParts?: BodyPartConstant[];
  Resource?: ResourceConstant;
  Target?: Structure | Source;
  TransferTarget?: Structure<StructureConstant> | AnyCreep;
  HarvestTarget?: Source | Mineral | Deposit;
  CreepName?: string;
  StructureType?: BuildableStructureConstant;
  RoomName?: string;
}

// interface State {
//   Tasks: Task[];
// }

// export const machine = (state: State, event: string): State => {
//   const room = Object.values(Game.rooms)[0];
//   if (!room) throw Error("no room found");
//   const controller = room.controller;
//   if (!controller) throw Error("no controller found");
//   const spawn = Object.values(Game.spawns)[0];
//   if (!spawn) throw Error("no spawn found");
//   if (spawn.room.name !== room.name) throw Error("spawn is not in the room");
//
//   const creeps = Object.values(Game.creeps).sort((a, b) => {
//     if (a.name > b.name) return 1;
//     if (a.name < b.name) return -1;
//     return 0;
//   });
//
//   // const hostiles = room.find(FIND_HOSTILE_CREEPS);
//   // if (hostiles.length > 0) {
//   //   handleHostilesInRoom(state, spawn, room, creeps, hostiles);
//   // }
//
//   const canUpgradeController = controller.level !== 8;
//   if (canUpgradeController) {
//     state = handleUpgradingController(state, spawn, room, creeps, controller);
//   }
//
//   state = handleExtensions(state, spawn, controller, room);
//
//   return state;
// };
//
// function handleExtensions(state: State, spawn: StructureSpawn, controller: StructureController, room: Room): State {
//   const numExtensions = room.find(FIND_MY_STRUCTURES, {
//     filter: o => o.structureType === "extension"
//   }).length;
//   if (numExtensions === 8) return state;
//
//   if (controller.level < 2) {
//     // console.log(`can't build extensions at RCL=1`);
//     return state;
//   }
//
//   const extensionConstructionSites = room.find(FIND_MY_CONSTRUCTION_SITES, {
//     filter: site => site.structureType === "extension"
//   });
//   if (extensionConstructionSites.length > 0) {
//     return state;
//   }
//
//   function isOccupied(x: number, y: number): boolean {
//     for (const el of room.lookAt(x, y)) {
//       if (el.type === "creep") {
//         return true;
//       }
//       if (el.type === "structure") {
//         return true;
//       }
//       if (el.type === "terrain" && el.terrain !== "plain") {
//         return true;
//       }
//     }
//     return false;
//   }
//
//   console.log(`spawn pos ${spawn.pos}`);
//   const goodBuildLocation = chessGetNextLocation([spawn.pos.x, spawn.pos.y], isOccupied);
//   if (goodBuildLocation[0] === -1 || goodBuildLocation[1] === -1) {
//     throw Error("bad chess location return value");
//   }
//   state.Tasks.push({
//     Type: TaskType.CreateConstructionSite,
//     StructureType: STRUCTURE_EXTENSION,
//     Pos: [goodBuildLocation[0], goodBuildLocation[1]],
//     RoomName: room.name
//   });
//   console.log(`newConstr site ${goodBuildLocation}`);
//   return state;
// }
//
// function handleHostilesInRoom(state: State, spawn: StructureSpawn, room: Room, creeps: Creep[], hostiles: Creep[]) {
//   function getParts(cs: Creep[]): BodyPartDefinition[] {
//     const parts = [];
//     for (const creep of cs) {
//       for (const part of creep.body) {
//         parts.push(part);
//       }
//     }
//     return parts;
//   }
//
//   const creepsCapableOfStriking = [];
//   for (const creep of creeps) {
//     if (creep.hits === 0) continue;
//
//     let canFight = false;
//     let canMove = false;
//     for (const bodyElement of creep.body) {
//       if (bodyElement.type === "attack" || bodyElement.type === "ranged_attack") {
//         canFight = true;
//         continue;
//       }
//       if (bodyElement.type === "move") {
//         canMove = true;
//         continue;
//       }
//     }
//     if (canFight && canMove) {
//       creepsCapableOfStriking.push(creep);
//     }
//   }
//
//   const ourParts = getParts(creepsCapableOfStriking);
//   const theirParts = getParts(hostiles);
//   if (battleStats(ourParts, theirParts).canForSureWin) {
//     console.log("send attack");
//   } else {
//     console.log("spawn more creeps");
//
//     const newParts: BodyPartDefinition[] = [];
//     while (true) {
//       newParts.push({ type: "move", hits: 100 }, { type: "attack", hits: 100 });
//       const stats = battleStats(ourParts.concat(newParts), theirParts);
//       if (stats.canForSureWin) {
//         console.log(stats.theyKillUsInTicks, stats.weKillThemInTicks);
//         break;
//       }
//     }
//     console.log(`new parts len ${newParts.length}`);
//     const totalCost = newParts.reduce((acc, c) => acc + BODYPART_COST[c.type], 0);
//
//     const partsPerCreep: BodyPartConstant[][] = [];
//     while (true) {
//       const slice = newParts.splice(0, 50);
//       if (slice.length === 0) break;
//       partsPerCreep.push(slice.map(p => p.type));
//     }
//     console.log(`to spawn ${partsPerCreep.length} creeps; ${partsPerCreep.map(parts => parts.length)}`);
//     console.log(`creeps cost ${totalCost}`);
//   }
// }
//
// function handleUpgradingController(
//   newState: State,
//   spawn: StructureSpawn,
//   room: Room,
//   creeps: Creep[],
//   controller: StructureController
// ): State {
//   const creepsWhoCanUpgrade = [];
//
//   creepsLoop: for (const creep of creeps) {
//     if (Object.keys(creep.store).some(r => r !== RESOURCE_ENERGY)) {
//       continue;
//     }
//     let hasCarry = false;
//     let hasMove = false;
//     let hasWork = false;
//     for (const bodyElement of creep.body) {
//       if (bodyElement.hits === 0) continue creepsLoop;
//
//       if (bodyElement.type === CARRY) {
//         hasCarry = true;
//       }
//       if (bodyElement.type === MOVE) {
//         hasMove = true;
//       }
//       if (bodyElement.type === WORK) {
//         hasWork = true;
//       }
//     }
//     if (hasWork && hasCarry && hasMove) {
//       creepsWhoCanUpgrade.push(creep);
//     }
//   }
//
//   if (!spawn.spawning) {
//     newState.Tasks.push({
//       Type: TaskType.SpawnCreep,
//       SpawnName: spawn.name,
//       BodyParts: [MOVE, MOVE, CARRY, WORK]
//     });
//   }
//
//   for (const creep of creepsWhoCanUpgrade) {
//     if (creep.memory.controllerUpgradeMovesToController === undefined) {
//       creep.memory.controllerUpgradeMovesToController = false;
//     }
//     if (creep.store.energy === 0) {
//       creep.memory.controllerUpgradeMovesToController = false;
//     }
//
//     const isFull = creep.store.getFreeCapacity() === 0;
//     const nearController = creep.pos.isNearTo(controller);
//     const nearestEnergySource = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
//     if (!nearestEnergySource) {
//       creep.say(NoEnergySourceFound);
//       continue;
//     }
//     const nearEnergySource = creep.pos.isNearTo(nearestEnergySource);
//
//     if (isFull || creep.memory.controllerUpgradeMovesToController) {
//       creep.memory.controllerUpgradeMovesToController = true;
//       if (nearController) {
//         newState.Tasks.push({
//           Type: TaskType.Transfer,
//           Resource: RESOURCE_ENERGY,
//           TransferTarget: controller,
//           CreepName: creep.name
//         });
//       } else {
//         newState.Tasks.push({
//           Type: TaskType.MoveTo,
//           Target: controller,
//           CreepName: creep.name
//         });
//       }
//     } else {
//       if (nearEnergySource) {
//         newState.Tasks.push({
//           Type: TaskType.Harvest,
//           HarvestTarget: nearestEnergySource,
//           CreepName: creep.name
//         });
//       } else {
//         newState.Tasks.push({
//           Type: TaskType.MoveTo,
//           Target: nearestEnergySource,
//           CreepName: creep.name
//         });
//       }
//     }
//   }
//
//   return newState;
// }
