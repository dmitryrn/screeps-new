import { requireCreepByName } from "./utils";

export class HarvesterMachine {
  public constructor(creep: Creep) {
    creep.attack(creep);
  }
}
