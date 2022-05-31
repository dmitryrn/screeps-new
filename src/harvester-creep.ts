import { Task, TaskType } from "./state";
import { NoEnergySourceFound } from "./says";

const ErrCreepControllerUndefined = Error("creep controller undefined");
const ErrCreepCantFindEnergySource = Error("creep can't find energy source");

export class Harvester {
  public constructor(private creep: Creep, private shouldBeUpgradingController: boolean) {
    if (creep.memory.harvesterReadyToDeposit === undefined) {
      creep.memory.harvesterReadyToDeposit = false;
    }
  }

  private findNearestEntityToDepositTo(): RoomPosition {
    if (this.shouldBeUpgradingController) {
      return this.getController().pos;
    }

    const toSearch = [];
    const closestSitePos = this.creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)?.pos;
    if (closestSitePos) toSearch.push(closestSitePos);

    const closestExtensionPos = this.creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: object => {
        if (object.structureType !== "extension") return false;
        return object.store.getFreeCapacity("energy") > 0;
      }
    })?.pos;
    if (closestExtensionPos) toSearch.push(closestExtensionPos);

    if (toSearch.length > 1) {
      if (closestExtensionPos!.getRangeTo(closestSitePos!) <= 5) return closestExtensionPos!;
    }

    const closestPos = this.creep.pos.findClosestByPath(toSearch);
    if (closestPos) return closestPos;

    return this.getController().pos;
  }

  private getController() {
    const { controller } = this.creep.room;
    if (!controller) throw ErrCreepControllerUndefined;
    return controller;
  }

  public produceTask(): Task | null {
    if (this.creep.store.getFreeCapacity() === this.creep.store.getCapacity()) {
      this.creep.memory.harvesterReadyToDeposit = false;
    }

    const isFull = this.creep.store.getFreeCapacity() === 0;

    if (isFull || this.creep.memory.harvesterReadyToDeposit) {
      this.creep.memory.harvesterReadyToDeposit = true;

      const nearestEntityToDepositTo = this.findNearestEntityToDepositTo();

      const isNearEntity = this.creep.pos.isNearTo(nearestEntityToDepositTo);
      if (isNearEntity) {
        return {
          Type: TaskType.Transfer,
          Resource: RESOURCE_ENERGY,
          Pos: [nearestEntityToDepositTo.x, nearestEntityToDepositTo.y],
          CreepName: this.creep.name,
          RoomName: this.creep.room.name
        };
      } else {
        return {
          Type: TaskType.MoveTo,
          Pos: [nearestEntityToDepositTo.x, nearestEntityToDepositTo.y],
          RoomName: this.creep.room.name,
          CreepName: this.creep.name
        };
      }
    } else {
      const nearestEnergySource = this.creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
      if (!nearestEnergySource) {
        this.creep.say(NoEnergySourceFound);
        console.log(ErrCreepCantFindEnergySource);
        return null;
      }

      const nearEnergySource = this.creep.pos.isNearTo(nearestEnergySource);
      if (nearEnergySource) {
        return {
          Type: TaskType.Harvest,
          HarvestTarget: nearestEnergySource,
          CreepName: this.creep.name
        };
      } else {
        return {
          Type: TaskType.MoveTo,
          Pos: [nearestEnergySource.pos.x, nearestEnergySource.pos.y],
          RoomName: this.creep.room.name,
          CreepName: this.creep.name
        };
      }
    }
  }
}
