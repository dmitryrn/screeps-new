// eslint-disable-next-line max-classes-per-file
import { ROLE_MINER } from "./main";
import { getUniqueCreepName } from "./utils";

export class Mine {
  private simultaneousMiners: number | null = null;
  private container: StructureContainer | null = null;
  private containerBuildLocation: RoomPosition | null = null;

  public constructor(private source: Source, private spawn: StructureSpawn, private creeps: Creep[]) {
    this.simultaneousMiners = 0;

    const visited = new Set();

    const innerLookup = source.room.lookAtArea(
      source.pos.y - 1,
      source.pos.x - 1,
      source.pos.y + 1,
      source.pos.x + 1,
      true
    );

    for (const square of innerLookup) {
      const k = square.x.toString() + "-" + square.y.toString();
      if (visited.has(k)) continue;
      visited.add(k);
      if (square.x === source.pos.x && square.y === source.pos.y) continue;
      if (square.type === "terrain" && square.terrain === "wall") {
        continue;
      }
      this.simultaneousMiners += 1;
    }

    const t: [LookAtResult<LookConstant>[], [number, number]] = [
      source.room.lookAt(source.pos.x, source.pos.y - 2),
      [source.pos.x, source.pos.y - 2]
    ];
    const b: [LookAtResult<LookConstant>[], [number, number]] = [
      source.room.lookAt(source.pos.x, source.pos.y + 2),
      [source.pos.x, source.pos.y + 2]
    ];
    const l: [LookAtResult<LookConstant>[], [number, number]] = [
      source.room.lookAt(source.pos.x - 2, source.pos.y),
      [source.pos.x - 2, source.pos.y]
    ];
    const r: [LookAtResult<LookConstant>[], [number, number]] = [
      source.room.lookAt(source.pos.x + 2, source.pos.y),
      [source.pos.x + 2, source.pos.y]
    ];

    let minRange = Math.ceil(50 * Math.sqrt(2) + 1);
    let minRangePos: RoomPosition | undefined;
    outer: for (const [result, pos] of [t, b, l, r]) {
      for (const square of result) {
        if (square.type === "terrain" && square.terrain === "wall") continue outer;
      }

      const p = new RoomPosition(pos[0], pos[1], source.room.name);

      // check if all adjacent squares are passable
      const adjacentArea = source.room.lookAtArea(p.y - 1, p.x - 1, p.y + 1, p.x + 1, true);
      for (const square of adjacentArea) {
        if (square.type === "terrain" && square.terrain === "wall") continue outer;
      }

      const range = p.getRangeTo(spawn);
      if (range < minRange) {
        minRange = range;
        minRangePos = p;
      }
    }

    // console.log("source", source);
    if (minRangePos) {
      this.containerBuildLocation = minRangePos;
      // console.log("min range pos", minRangePos);
    } else {
      console.log(`didn't find min range pos, source: ${source.id}`);
    }
    // console.log("simultaneousMiners", this.simultaneousMiners);
  }

  public getAliveMiners(): number {
    let c = 0;
    for (const cr of this.creeps) {
      if (cr.memory.role === ROLE_MINER && cr.memory.minerAssignedSourceId === this.getSource().id) {
        c++;
      }
    }
    return c;
  }

  public getSource(): Source {
    return this.source;
  }

  public isContainerReady(): boolean {
    return !!this.getContainer();
  }

  public hasContainerConstructionSite(): boolean {
    if (this.containerBuildLocation === null) return false;
    return this.containerBuildLocation.look().some(r => r.type === "constructionSite");
  }

  public getContainer(): StructureContainer | null {
    if (this.container) return this.container;
    const containers = this.source.pos.findInRange(FIND_STRUCTURES, 2, {
      filter: o => o.structureType === STRUCTURE_CONTAINER
    });
    if (containers.length < 1) {
      return null;
    }
    if (!("ticksToDecay" in containers[0] && "store" in containers[0])) {
      console.log(`bad container type assertion. structureID: ${containers[0].id}`);
      return null;
    }
    this.container = containers[0];
    return containers[0];
  }

  public getPossibleSimultaniousMiners(): number {
    if (this.simultaneousMiners !== null) return this.simultaneousMiners;

    const innerLookup = this.source.room.lookAtArea(
      this.source.pos.y - 1,
      this.source.pos.x - 1,
      this.source.pos.y + 1,
      this.source.pos.x + 1,
      true
    );

    let simultaneousMiners = 0;
    const visited = new Set();
    for (const square of innerLookup) {
      const k = square.x.toString() + "-" + square.y.toString();
      if (visited.has(k)) continue;
      visited.add(k);
      if (square.x === this.source.pos.x && square.y === this.source.pos.y) continue;
      if (square.type === "terrain" && square.terrain === "wall") {
        continue;
      }
      simultaneousMiners += 1;
    }

    this.simultaneousMiners = simultaneousMiners;
    return simultaneousMiners;
  }
}

export class RoomMining {
  private rallyPoint: Flag | null = null;
  private mines: Mine[] = [];
  private queuedSpawn = false;

  public constructor(private room: Room, private spawn: StructureSpawn, private creeps: Creep[]) {}

  public process() {
    const res = this.room.find(FIND_SOURCES);

    for (const source of res) {
      try {
        const m = new Mine(source, this.spawn, this.creeps);
        this.mines.push(m);
      } catch (e) {
        console.log(`error initializing mine (sourceID: ${source.id})`);
      }
    }

    for (const creep of this.creeps) {
      this.processCreep(creep);
    }

    for (const mine of this.mines) {
      this.spawnCreepForMineIfNeeded(mine);
    }
  }

  private getMinersRallyPoint(): Flag | null {
    if (this.rallyPoint) return this.rallyPoint;

    const flags = this.room.find(FIND_FLAGS, {
      filter: o => o.name === "MINERS_RALLY"
    });
    if (flags.length < 1) {
      console.log("!!! didn't find miners rally point");
      return null;
    }

    this.rallyPoint = flags[0];
    return flags[0];
  }

  private getMineBySource(id: string): Mine | null {
    for (const mine of this.mines) {
      if (mine.getSource().id === id) {
        return mine;
      }
    }
    return null;
  }

  private processCreep(creep: Creep) {
    if (creep.memory.role !== ROLE_MINER) return;

    if (creep.memory.minerAssignedSourceId === undefined) {
      console.log(`miner creep (name: ${creep.name}) doesn't have source assigned`);
      return;
    }

    const mine = this.getMineBySource(creep.memory.minerAssignedSourceId);
    if (!mine) {
      console.log(
        `miner creep (name: ${creep.name}) didn't find mine by id (id: ${creep.memory.minerAssignedSourceId})`
      );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const source = mine.getSource();
    if (!source) {
      console.log(
        `miner creep (creep name: ${creep.name}): didn't find source by id (${creep.memory.minerAssignedSourceId})`
      );
      return;
    }

    const rally = this.getMinersRallyPoint();
    if (rally === null) {
      return;
    }

    const container = mine.getContainer();
    if (!container) {
      console.log(`didn't find container for source (id: ${source.id})`);

      creep.moveTo(rally);

      return;
    }

    if (creep.memory.minerReadyToDeposit === undefined) {
      creep.memory.minerReadyToDeposit = false;
    }

    const isEmpty = creep.store.getFreeCapacity() === creep.store.getCapacity();
    if (isEmpty) {
      creep.memory.minerReadyToDeposit = false;
    }

    const isFull = creep.store.getFreeCapacity() === 0;
    if (isFull || creep.memory.minerReadyToDeposit) {
      creep.memory.minerReadyToDeposit = true;

      const c = creep.transfer(container, RESOURCE_ENERGY);
      if (c === ERR_NOT_IN_RANGE) {
        creep.moveTo(container);
        return;
      } else if (c !== OK && c !== ERR_FULL) {
        console.log(`creep name: ${creep.name}): error transferring to container (id: ${container.id}) (code: ${c})`);
        return;
      }
    } else {
      const c = creep.harvest(source);
      if (c === ERR_NOT_IN_RANGE) {
        creep.moveTo(source);
        return;
      } else if (c !== OK && c !== ERR_NOT_ENOUGH_RESOURCES && c !== ERR_BUSY) {
        // busy means creep is spawning right now
        console.log(`creep name: ${creep.name}): error mining source (id: ${source.id}) (code: ${c})`);
        return;
      }
    }
  }

  public getMines(): Mine[] {
    return this.mines;
  }

  private spawnCreepForMineIfNeeded(mine: Mine) {
    if (!mine.isContainerReady()) return;

    const containerLocation = mine.getContainer()?.pos;
    if (!containerLocation) {
      console.log(`didn't find container for mine ${mine.getSource().id}`);
      return;
    }
    const sourceID = mine.getSource().id;

    if (!this.queuedSpawn && !this.spawn.spawning) {
      const aliveMiners = mine.getAliveMiners();
      console.log("aliveMiners", aliveMiners);

      if (mine.isContainerReady() && aliveMiners < mine.getPossibleSimultaniousMiners()) {
        this.spawn.spawnCreep([MOVE, CARRY, WORK, WORK], getUniqueCreepName(this.creeps), {
          memory: {
            role: ROLE_MINER,
            minerAssignedSourceId: sourceID
          }
        });
        this.queuedSpawn = true;
      }
    }

    if (mine.getContainer() !== null || mine.hasContainerConstructionSite()) {
      return;
    }
    const c = this.room.createConstructionSite(containerLocation, STRUCTURE_CONTAINER);
    if (c !== OK)
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      console.log(`error creating construction site for mine (id: ${sourceID}) container (pos: ${containerLocation})`);
  }
}
