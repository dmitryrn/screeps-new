enum State {
  NeedToHarvestMore,
  LookingForDepositing
}

class HarvesterMachine {
  private state: State;
  private creep: Creep;

  public constructor(creep: Creep) {
    this.state = State.NeedToHarvestMore;
    this.creep = creep;
  }
}
