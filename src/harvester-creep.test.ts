/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Harvester } from "./harvester-creep";
import { assert } from "chai";
import { Task, TaskType } from "./state";

describe("harverster", () => {
  it("constructor", () => {
    const c = {
      memory: {} as any
    };
    let h;
    assert.doesNotThrow(() => {
      h = new Harvester(c as unknown as Creep, false);
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    assert.isFalse(c.memory.harvesterReadyToDeposit);
  });

  it("when doesn't have energy, moves to energy source", () => {
    const c = {
      store: {
        getFreeCapacity: () => 0
      },
      room: {
        controller: {}
      },
      harvesterReadyToDeposit: false,
      memory: {},
      pos: {
        isNearTo(ctrl: any) {
          return false;
        }
      }
    };
    const h = new Harvester(c as unknown as Creep, false);
    let t: Task | undefined;
    assert.doesNotThrow(() => {
      t = h.produceTask();
    });
    assert.isDefined(t);
    assert.equal(t!.Type, TaskType.MoveTo);
  });
});
