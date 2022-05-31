import { HarvesterMachine } from "./harvester-machine";
import { assert } from "chai";
import { createMock } from "ts-auto-mock";

describe("harverster", () => {
  it("attacks", () => {
    const c = createMock<Creep>();
    const h = new HarvesterMachine(c);
    assert.isFalse(false);
  });
});
