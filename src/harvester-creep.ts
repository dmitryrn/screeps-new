import { Mine } from "./room-mining";
import { loop } from "./main";

const ErrCreepControllerUndefined = Error("creep controller undefined");

export class Harvester {
  public constructor(
    private creep: Creep,
    private shouldBeUpgradingController: boolean,
    private markObject: (id: string, creepId: string) => void,
    private whoMarkedObject: (id: string) => string | undefined,
    private mines: Mine[] = []
  ) {
    if (creep.memory.harvesterReadyToDeposit === undefined) {
      creep.memory.harvesterReadyToDeposit = false;
    }
  }

  private containerBelongsToMine(id: string): boolean | null {
    for (const mine of this.mines) {
      const container = mine.getContainer();
      if (!container) return null;
      if (container.id === id) return true;
    }
    return false;
  }

  private sourceBelongsToMine(id: string): boolean | null {
    for (const mine of this.mines) {
      const source = mine.getSource();
      if (!source) return null;
      if (source.id === id) return true;
    }
    return false;
  }

  private getMineBySource(sourceId: string): Mine | null {
    for (const mine of this.mines) {
      if (mine.getSource().id === sourceId) {
        return mine;
      }
    }
    return null;
  }

  private getController() {
    const { controller } = this.creep.room;
    if (!controller) throw ErrCreepControllerUndefined;
    return controller;
  }

  public perform() {
    const isEmpty = this.creep.store.getFreeCapacity() === this.creep.store.getCapacity();
    if (isEmpty) {
      this.creep.memory.harvesterReadyToDeposit = false;
    }

    const isFull = this.creep.store.getFreeCapacity() === 0;

    if (isFull || this.creep.memory.harvesterReadyToDeposit) {
      this.creep.memory.harvesterReadyToDeposit = true;

      const controller = () => {
        const c = this.creep.transfer(this.getController(), RESOURCE_ENERGY);
        if (c === ERR_NOT_IN_RANGE) {
          if (this.creep.moveTo(this.getController()) !== OK) {
            console.log(`error moving to controller for creep ${this.creep.name}, code: ${c}`);
            return;
          }
        } else if (c !== OK) {
          console.log(`error transferring to controller for creep ${this.creep.name}, code: ${c}`);
          return;
        }
        // ok
        if (this.creep.room.name === "E35N17") {
          if (this.creep.pos.getRangeTo(this.getController()) > 2) {
            this.creep.moveTo(this.getController());
          }
        }
      };

      if (this.shouldBeUpgradingController) {
        controller();
        return;
      }

      const spawnOrExtension = this.creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: object =>
          (object.structureType === STRUCTURE_EXTENSION || object.structureType === STRUCTURE_SPAWN) &&
          object.store.getFreeCapacity("energy") > 0
      });
      if (spawnOrExtension) {
        if (this.creep.transfer(spawnOrExtension, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          this.creep.moveTo(spawnOrExtension);
        }
        return;
      }

      const cstrSite = this.creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
      if (cstrSite) {
        if (this.creep.build(cstrSite) === ERR_NOT_IN_RANGE) {
          this.creep.moveTo(cstrSite);
        }
        return;
      }

      controller();
    } else {
      const possibleSources = [];

      const container = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: o => o.structureType === STRUCTURE_CONTAINER && o.store.energy > 0
      });
      if (container && this.containerBelongsToMine(container.id)) {
        possibleSources.push(container);
      }

      const source = this.creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE, {
        filter: o => {
          if (this.sourceBelongsToMine(o.id) && this.getMineBySource(o.id)?.isContainerReady()) {
            return false;
          }
          return true;
        }
      });
      if (source) {
        possibleSources.push(source);
      }

      const closest = this.creep.pos.findClosestByPath(possibleSources);
      if (!closest) {
        console.log(`didn't find closest source for harvester creep`);
        return;
      }

      try {
        if (
          "ticksToRegeneration" in closest &&
          "energyCapacity" in closest &&
          "energy" in closest &&
          "room" in closest
        ) {
          const c = this.creep.harvest(closest);
          if (c === ERR_NOT_IN_RANGE) {
            if (this.creep.moveTo(closest) !== OK) {
              console.log(`error moving to source for creep ${this.creep.name}, code: ${c}`);
              return;
            }
          } else if (c !== OK) {
            console.log(`error harvesting for creep ${this.creep.name}, code: ${c}`);
            return;
          }
        } else {
          if (closest?.structureType === STRUCTURE_CONTAINER) {
            if (this.creep.withdraw(closest, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              this.creep.moveTo(closest);
            }
          } else {
            console.log(`failed type assertion for closest source for harvester creep`);
          }
        }
      } catch (e) {
        console.log("caught something in harvester", e);
      }
    }
  }
}
