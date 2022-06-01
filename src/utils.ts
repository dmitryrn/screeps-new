import { RoleConstant } from "./main";

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

export function getUniqueCreepName(creeps: Creep[], prefix?: string): string {
  let c = 0;
  const m = new Set<string>();
  for (const creep of creeps) {
    m.add(creep.name);
  }
  let debugC = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let name = c.toString(10);
    if (prefix) {
      name = prefix + "-" + name;
    }

    if (m.has(name)) {
      c++;
    } else {
      return name;
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
  // eslint-disable-next-line no-constant-condition
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

const lvlToExtCap = {
  "1": 50,
  "2": 50,
  "3": 50,
  "4": 50,
  "5": 50,
  "6": 50,
  "7": 100,
  "8": 200
};

export function canBarelyMove(
  fillWith: BodyPartConstant,
  extensions: number,
  rcl: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
): BodyPartConstant[] {
  const energyPerExt = lvlToExtCap[rcl];
  const totalEnergy = energyPerExt * extensions + 300;

  // let cost =

  return [];
}
