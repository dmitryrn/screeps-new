import { TaskType } from "./state";
import { Executor } from "./executor";
import { isInRangeOfEnemy } from "./logic";

const ErrCreepControllerUndefined = Error("creep controller undefined");
const ErrCreepCantFindEnergySource = Error("creep can't find energy source");

export class Harvester {
  public constructor(
    private creep: Creep,
    private executor: Executor,
    private shouldBeUpgradingController: boolean,
    private markObject: (id: string, creepId: string) => void,
    private whoMarkedObject: (id: string) => string | undefined
  ) {
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

    const closestContainersPos = this.creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: object => {
        if (object.structureType === "extension" || object.structureType === "spawn") {
          if (object.store.getFreeCapacity("energy") > 0) {
            return true;
          }
        }
        return false;
      }
    })?.pos;
    if (closestContainersPos) toSearch.push(closestContainersPos);

    if (toSearch.length > 1) {
      if (closestContainersPos!.getRangeTo(closestSitePos!) <= 5) return closestContainersPos!;
    }

    const closestPos = this.creep.pos.findClosestByPath(toSearch);
    if (closestPos) return closestPos;

    return this.getController().pos;
  }

  private findNearestSource(): Tombstone | Source | Resource | null {
    const droppedEnergy = this.creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
      filter: o => o.resourceType === "energy"
    });
    if (
      droppedEnergy &&
      (this.whoMarkedObject(droppedEnergy.id) === this.creep.id ||
        this.whoMarkedObject(droppedEnergy.id) === undefined) &&
      !isInRangeOfEnemy(droppedEnergy.pos)
    ) {
      console.log("!!!!!!!found dropped energy");
      this.markObject(droppedEnergy.id, this.creep.id);
      return droppedEnergy;
    }

    const closestTombstone = this.creep.pos.findClosestByPath(FIND_TOMBSTONES, {
      filter: o => o.store.energy > 0
    });
    if (
      closestTombstone &&
      (this.whoMarkedObject(closestTombstone.id) === this.creep.id ||
        this.whoMarkedObject(closestTombstone.id) === undefined) &&
      !isInRangeOfEnemy(closestTombstone.pos)
    ) {
      console.log("!!!!!!!!!!found tombstone");
      this.markObject(closestTombstone.id, this.creep.id);
      return closestTombstone;
    }

    const nearestEnergySource = this.creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    if (nearestEnergySource && !isInRangeOfEnemy(nearestEnergySource.pos)) {
      return nearestEnergySource;
    }

    console.log(ErrCreepCantFindEnergySource);
    return null;
  }

  private getController() {
    const { controller } = this.creep.room;
    if (!controller) throw ErrCreepControllerUndefined;
    return controller;
  }

  public perform(): undefined {
    if (this.creep.store.getFreeCapacity() === this.creep.store.getCapacity()) {
      this.creep.memory.harvesterReadyToDeposit = false;
    }

    const isFull = this.creep.store.getFreeCapacity() === 0;

    if (isFull || this.creep.memory.harvesterReadyToDeposit) {
      this.creep.memory.harvesterReadyToDeposit = true;

      const nearestEntityToDepositTo = this.findNearestEntityToDepositTo();

      const isNearEntity = this.creep.pos.isNearTo(nearestEntityToDepositTo);
      if (isNearEntity) {
        this.executor.execute({
          Type: TaskType.Transfer,
          Resource: RESOURCE_ENERGY,
          Pos: [nearestEntityToDepositTo.x, nearestEntityToDepositTo.y],
          CreepName: this.creep.name,
          RoomName: this.creep.room.name
        });
        return;
      } else {
        this.executor.execute({
          Type: TaskType.MoveTo,
          Pos: [nearestEntityToDepositTo.x, nearestEntityToDepositTo.y],
          RoomName: this.creep.room.name,
          CreepName: this.creep.name
        });
        return;
      }
    } else {
      const nearestEnergySource = this.findNearestSource();
      if (!nearestEnergySource) {
        return;
      }

      const nearEnergySource = this.creep.pos.isNearTo(nearestEnergySource);
      if (nearEnergySource) {
        if ("deathTime" in nearestEnergySource) {
          this.executor.execute({
            Type: TaskType.Withdraw,
            WithdrawTarget: nearestEnergySource,
            CreepName: this.creep.name,
            Resource: RESOURCE_ENERGY,
            RoomName: this.creep.room.name
          });
        } else if ("energy" in nearestEnergySource) {
          this.executor.execute({
            Type: TaskType.Harvest,
            HarvestTarget: nearestEnergySource,
            CreepName: this.creep.name
          });
        } else {
          this.executor.execute({
            Type: TaskType.Pickup,
            ResourceObject: nearestEnergySource,
            CreepName: this.creep.name
          });
        }
        return;
      } else {
        this.executor.execute({
          Type: TaskType.MoveTo,
          Pos: [nearestEnergySource.pos.x, nearestEnergySource.pos.y],
          RoomName: this.creep.room.name,
          CreepName: this.creep.name
        });
        return;
      }
    }
  }
}
