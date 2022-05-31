import { assert } from "chai";
import { loop } from "../../src/main";
import { Game, Memory } from "./mock";
import { canForSureWin } from "../../src/utils";

const ATTACK = "attack";
const MOVE = "move";
const TOUGH = "tough";

describe("main", () => {
  before(() => {
    // runs before all test in this block
  });

  beforeEach(() => {
    // runs before each test in this block
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore : allow adding Game to global
    global.Game = _.clone(Game);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore : allow adding Memory to global
    global.Memory = _.clone(Memory);
  });

  it("should export a loop function", () => {
    assert.isTrue(typeof loop === "function");
  });

  it("should return void when called with no context", () => {
    assert.isUndefined(loop());
  });

  it("Automatically delete memory of missing creeps", () => {
    Memory.creeps.persistValue = "any value";
    Memory.creeps.notPersistValue = "any value";

    Game.creeps.persistValue = "any value";

    loop();

    assert.isDefined(Memory.creeps.persistValue);
    assert.isUndefined(Memory.creeps.notPersistValue);
  });
});

function getBodyPartWithTypeOnly(type: BodyPartConstant): BodyPartDefinition {
  return {
    type,
    hits: 0
  };
}

describe("canWin", () => {
  it("test 1", () => {
    assert.isFalse(
      canForSureWin(
        [getBodyPartWithTypeOnly(ATTACK), getBodyPartWithTypeOnly(MOVE)],
        [getBodyPartWithTypeOnly(TOUGH), getBodyPartWithTypeOnly(ATTACK)]
      )
    );
    assert.isTrue(
      canForSureWin(
        [
          getBodyPartWithTypeOnly(ATTACK),
          getBodyPartWithTypeOnly(ATTACK),
          getBodyPartWithTypeOnly(ATTACK),
          getBodyPartWithTypeOnly(ATTACK)
        ],
        [getBodyPartWithTypeOnly(TOUGH), getBodyPartWithTypeOnly(ATTACK)]
      )
    );
  });
});
