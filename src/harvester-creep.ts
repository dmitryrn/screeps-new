const ErrCreepControllerUndefined = Error("creep controller undefined");

export class Harvester {
  public constructor(
    private creep: Creep,
    private shouldBeUpgradingController: boolean,
    private markObject: (id: string, creepId: string) => void,
    private whoMarkedObject: (id: string) => string | undefined
  ) {
    if (creep.memory.harvesterReadyToDeposit === undefined) {
      creep.memory.harvesterReadyToDeposit = false;
    }
  }

  private findNearestSource(): Source | null {
    return this.creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
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
      const source = this.findNearestSource();
      if (!source) {
        console.log(`no source found for creep ${this.creep.name}`);
        return;
      }
      const c = this.creep.harvest(source);
      if (c === ERR_NOT_IN_RANGE) {
        if (this.creep.moveTo(source) !== OK) {
          console.log(`error moving to source for creep ${this.creep.name}, code: ${c}`);
          return;
        }
      } else if (c !== OK) {
        console.log(`error harvesting for creep ${this.creep.name}, code: ${c}`);
        return;
      }
    }
  }
}
