// eslint-disable-next-line max-classes-per-file
import { ROLE_MINER } from "./main";
import { creepPrice, getUniqueCreepName } from "./utils";
import { closestToSpawnExtensions, getExtensionsCount } from "./logic";

export class Mine {
  private container: StructureContainer | null = null;

  public constructor(
    private source: Source,
    private spawn: StructureSpawn,
    private creeps: Creep[],
    private room: Room
  ) {
    const around = source.room.lookAtArea(source.pos.y - 1, source.pos.x - 1, source.pos.y + 1, source.pos.x + 1, true);

    let containerPos: RoomPosition | undefined;
    for (const square of around) {
      if (square.x === source.pos.x && square.y === source.pos.y) continue;
      if (square.type === "terrain" && square.terrain === "wall") continue;

      if (square.type === "constructionSite" || square.type === "structure") return;

      containerPos = new RoomPosition(square.x, square.y, room.name);
    }
    if (!containerPos) {
      console.log(`didn't find where to place container`);
      return;
    }

    room.createConstructionSite(containerPos, STRUCTURE_CONTAINER);
  }

  public isMinerAlive(): boolean {
    for (const cr of this.creeps) {
      if (cr.memory.role === ROLE_MINER && cr.memory.minerAssignedSourceId === this.getSource().id) {
        return true;
      }
    }
    return false;
  }

  public getSource(): Source {
    return this.source;
  }

  public getRoom(): Room {
    return this.room;
  }

  public getContainer(): StructureContainer | null {
    // if (this.container !== null) return this.container;
    const containers = this.source.pos.findInRange(FIND_STRUCTURES, 1, {
      filter: o => o.structureType === STRUCTURE_CONTAINER
    });
    if (containers.length < 1) {
      return null;
    }
    if (!("ticksToDecay" in containers[0] && "store" in containers[0])) {
      console.log(`bad container type assertion. structureID: ${containers[0].id}`);
      return null;
    }
    // this.container = containers[0];
    return containers[0];
  }

  public getContainerConstructionSite(): ConstructionSite | null {
    const sites = this.source.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 1, {
      filter: o => o.structureType === "container"
    });
    if (sites.length < 1) {
      return null;
    }
    return sites[0];
  }
}

export class RoomMining {
  private rallyPoint: Flag | null = null;
  private mines: Mine[] = [];
  private queuedSpawn = false;

  public constructor(
    private homeRoom: Room,
    private roomsToMineIn: string[],
    private spawn: StructureSpawn,
    private creeps: Creep[]
  ) {}

  public process() {
    if (getExtensionsCount(this.homeRoom) < 5) {
      console.log(`not doing mining cuz extensions < 5`);
      return;
    }

    for (const roomName of this.roomsToMineIn) {
      const room = Game.rooms[roomName];
      if (!room) {
        console.log(`mining: room ${roomName} doesn't have visibility, skipping`);
        continue;
      }

      for (const source of room.find(FIND_SOURCES)) {
        try {
          const m = new Mine(source, this.spawn, this.creeps, room);
          this.mines.push(m);
        } catch (e) {
          console.log(`error initializing mine (sourceID: ${source.id})`);
        }
      }
    }

    for (const creep of this.creeps) {
      this.processCreep(creep);
    }

    for (const mine of this.mines) {
      this.spawnCreepForMineIfNeeded(mine);
    }
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

    const source = mine.getSource();
    if (!source) {
      console.log(
        `miner creep (creep name: ${creep.name}): didn't find source by id (${creep.memory.minerAssignedSourceId})`
      );
      return;
    }

    const container = mine.getContainer();
    if (!container) {
      if (!mine.getContainerConstructionSite()) {
        console.log(`didn't find container for source (id: ${source.id})`);
      }

      return;
    }

    if (!creep.pos.isEqualTo(container.pos)) {
      creep.moveTo(container);
      return;
    }

    if (container.hits < container.hitsMax) {
      if (creep.store.energy === 0) {
        creep.harvest(source);
      } else {
        creep.repair(container);
      }
      return;
    }
    creep.harvest(source);
    creep.drop("energy");
  }

  public getMines(): Mine[] {
    return this.mines;
  }

  private spawnCreepForMineIfNeeded(mine: Mine) {
    if (this.queuedSpawn || this.spawn.spawning) return;
    if (mine.isMinerAlive()) return;
    if (!mine.getContainer()) return;

    const containerLocation = mine.getContainer()?.pos;
    if (!containerLocation) {
      console.log(`didn't find container for mine ${mine.getSource().id}`);
      return;
    }
    const sourceID = mine.getSource().id;

    const parts = [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE];
    this.spawn.spawnCreep(parts, getUniqueCreepName(this.creeps, "miner"), {
      memory: {
        role: ROLE_MINER,
        minerAssignedSourceId: sourceID
      },
      energyStructures: closestToSpawnExtensions(this.spawn, creepPrice(parts)) ?? undefined
    });
    this.queuedSpawn = true;
  }
}
