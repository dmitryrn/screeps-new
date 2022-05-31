import { Task } from "./state";

export function requireCreepByName(name: string): Creep {
  const c = Game.creeps[name];
  if (!c) throw Error(`creep not found, name: ${name}`);
  return c;
}

export function requireRoomByName(name: string): Room {
  const c = Game.rooms[name];
  if (!c) throw Error(`room not found, name: ${name}`);
  return c;
}

export function requireHarvestTask(task: Task): Required<Pick<Task, "CreepName" | "HarvestTarget">> {
  if (task.CreepName === undefined) throw Error("CreepName not found in task");
  if (task.HarvestTarget === undefined) throw Error("HarvestTarget not found in task");
  return {
    ...task,
    CreepName: task.CreepName,
    HarvestTarget: task.HarvestTarget
  };
}

export function requireMoveToTask(task: Task): Required<Pick<Task, "Target" | "CreepName">> {
  if (task.CreepName === undefined) throw Error("CreepName not found in task");
  if (task.Target === undefined) throw Error("Target not found in task");
  return {
    ...task,
    CreepName: task.CreepName,
    Target: task.Target
  };
}

export function requireTransferTask(task: Task): Required<Pick<Task, "Resource" | "TransferTarget" | "CreepName">> {
  if (task.CreepName === undefined) throw Error("CreepName not found in task");
  if (task.TransferTarget === undefined) throw Error("TransferTarget not found in task");
  if (task.Resource === undefined) throw Error("Resource not found in task");
  return {
    ...task,
    CreepName: task.CreepName,
    Resource: task.Resource,
    TransferTarget: task.TransferTarget
  };
}

export function requireCreateConstructionSiteTask(
  task: Task
): Required<Pick<Task, "Pos" | "RoomName" | "StructureType">> {
  if (task.Pos === undefined) throw Error("Pos not found in task");
  if (task.RoomName === undefined) throw Error("RoomName not found in task");
  if (task.StructureType === undefined) throw Error("StructureType not found in task");
  return {
    ...task,
    Pos: task.Pos,
    RoomName: task.RoomName,
    StructureType: task.StructureType
  };
}

export function getUniqueCreepName(creeps: Creep[]): string {
  let c = 0;
  const m = new Set<string>();
  for (const creep of creeps) {
    m.add(creep.name);
  }
  let debugC = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (m.has(c.toString(10))) {
      c++;
    } else {
      return c.toString(10);
    }

    if (debugC > 10000) {
      throw Error("unique name generation takes too long, BUG!");
    }
    debugC++;
  }
}

export function sumAttackPower(parts: BodyPartDefinition[]): number {
  let hitsPerTick = 0;
  for (const part of parts) {
    if (part.type === "attack") {
      hitsPerTick += 30; // ATTACK_POWER
    }
    if (part.type === "ranged_attack") {
      hitsPerTick += 10 * 3; // RANGED_ATTACK_POWER
    }
  }
  return hitsPerTick;
}

export function canForSureWin(myParts: BodyPartDefinition[], theirParts: BodyPartDefinition[]): boolean {
  return battleStats(myParts, theirParts).canForSureWin;
}

export function battleStats(
  myParts: BodyPartDefinition[],
  theirParts: BodyPartDefinition[]
): {
  theirTotalHits: number;
  weDealHitsPerTick: number;
  weKillThemInTicks: number;
  ourTotalHits: number;
  theyDealHitsPerTick: number;
  theyKillUsInTicks: number;
  canForSureWin: boolean;
} {
  const theirTotalHits = theirParts.reduce(s => s + 100, 0);
  const weDealHitsPerTick = sumAttackPower(myParts);
  const weKillThemInTicks = Math.ceil(theirTotalHits / weDealHitsPerTick);

  const ourTotalHits = myParts.reduce(s => s + 100, 0);
  const theyDealHitsPerTick = sumAttackPower(theirParts);
  const theyKillUsInTicks = Math.ceil(ourTotalHits / theyDealHitsPerTick);

  return {
    theirTotalHits,
    weDealHitsPerTick,
    weKillThemInTicks,
    ourTotalHits,
    theyDealHitsPerTick,
    theyKillUsInTicks,
    canForSureWin: weKillThemInTicks < theyKillUsInTicks - 1 // -1 to make sure we kill them faster if they attack first
  };
}

export function chessGetNextLocation(
  [startX, startY]: [number, number],
  checkOccupied: (x: number, y: number) => boolean
): [number, number] {
  // TODO: rewrite without using Set, can be simplified
  const visited = new Set<string>();
  let rectSize = 1;
  while (true) {
    if (rectSize >= 25) {
      console.log("chess rect size is way too big");
      return [-1, -1];
    }

    let c = -1;
    for (let x = startX - rectSize; x <= startX + rectSize; x++) {
      for (let y = startY - rectSize; y <= startY + rectSize; y++) {
        c += 1;
        if (visited.has([x, y].toString())) continue;
        visited.add([x, y].toString());
        if (c % 2 !== 0) continue;
        if (x === startX && y === startY) continue;
        if (!checkOccupied(x, y)) {
          return [x, y];
        }
      }
    }
    rectSize += 1;
  }
}

export function requireOk(value: number) {
  if (value !== OK) throw Error(`not ok, got: ${value}`);
}

export function notifyOk(value: number) {
  if (value !== OK) console.log(`not ok, got: ${value}`);
}

export function creepPrice(parts: BodyPartConstant[]): number {
  return parts.reduce((acc, c) => acc + BODYPART_COST[c], 0);
}
