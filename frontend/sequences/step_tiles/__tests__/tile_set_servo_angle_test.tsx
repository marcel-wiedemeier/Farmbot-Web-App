jest.mock("../../../api/crud", () => ({ editStep: jest.fn() }));

import * as React from "react";
import {
  TileSetServoAngle, pinNumberChanger, createServoEditFn, ServoPinSelection,
} from "../tile_set_servo_angle";
import { mount } from "enzyme";
import { fakeSequence } from "../../../__test_support__/fake_state/resources";
import { SetServoAngle } from "farmbot";
import { emptyState } from "../../../resources/reducer";
import { StepParams } from "../../interfaces";
import { editStep } from "../../../api/crud";

describe("<TileSetServoAngle/>", () => {
  const currentStep: SetServoAngle = {
    kind: "set_servo_angle",
    args: {
      pin_number: 4,
      pin_value: 90,
    }
  };

  const fakeProps = (): StepParams => ({
    currentSequence: fakeSequence(),
    currentStep: currentStep,
    dispatch: jest.fn((fn: Function) => typeof fn === "function" && fn()),
    index: 0,
    resources: emptyState().index,
    confirmStepDeletion: false,
  });

  it("renders inputs", () => {
    const props = fakeProps();
    const block = mount(<TileSetServoAngle {...props} />);
    const inputs = block.find("input");
    const labels = block.find("label");
    const stepArgs = props.currentStep.args as SetServoAngle["args"];
    expect(inputs.length).toEqual(6);
    expect(labels.length).toEqual(6);
    expect(inputs.first().props().placeholder).toEqual("Control Servo");
    expect(labels.at(0).text()).toContain("Servo angle (0-180)");
    expect(inputs.at(1).props().value).toEqual(stepArgs.pin_value);
    expect(inputs.at(2).props().value).toEqual("" + stepArgs.pin_number);
  });

  it("Changes pin number", () => {
    const props = fakeProps();
    const fn = pinNumberChanger(props);
    fn("5");
    expect(editStep).toHaveBeenCalledWith({
      step: props.currentStep,
      sequence: props.currentSequence,
      index: props.index,
      executor: expect.any(Function)
    });
  });

  it("disallows named_pins", () => {
    const p = fakeProps();
    const step = p.currentStep;
    if (step.kind === "set_servo_angle") {
      step.args.pin_number = {
        kind: "named_pin",
        args: { pin_id: 0, pin_type: "Peripheral" }
      };
      const boom = () => ServoPinSelection(p);
      expect(boom).toThrowError();
      return;
    }

    fail();
  });

  it("creates a servo edit function", () => {
    const props = fakeProps();
    const step = props.currentStep;
    const fn = createServoEditFn("4");
    if (step.kind === "set_servo_angle") {
      step.args.pin_number = 1;
      fn(step);
      expect(step.args.pin_number).toEqual(4);
    } else {
      fail();
    }
  });
});
