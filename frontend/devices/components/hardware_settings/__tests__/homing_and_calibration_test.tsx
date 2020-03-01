jest.mock("../../../actions", () => ({
  updateMCU: jest.fn(),
  commandErr: jest.fn(),
}));

const mockDevice = {
  calibrate: jest.fn(() => Promise.resolve({})),
  findHome: jest.fn(() => Promise.resolve({})),
  setZero: jest.fn(() => Promise.resolve({})),
};
jest.mock("../../../../device", () => ({ getDevice: () => mockDevice }));

import * as React from "react";
import { mount, shallow } from "enzyme";
import { HomingAndCalibration } from "../homing_and_calibration";
import { bot } from "../../../../__test_support__/fake_state/bot";
import { updateMCU } from "../../../actions";
import {
  fakeFirmwareConfig,
} from "../../../../__test_support__/fake_state/resources";
import { error, warning } from "../../../../toast/toast";
import { inputEvent } from "../../../../__test_support__/fake_html_events";
import { panelState } from "../../../../__test_support__/control_panel_state";
import { HomingAndCalibrationProps } from "../../interfaces";
import { CalibrationRow } from "../calibration_row";

describe("<HomingAndCalibration />", () => {
  const fakeProps = (): HomingAndCalibrationProps => ({
    dispatch: jest.fn(),
    bot,
    controlPanelState: panelState(),
    sourceFwConfig: x => ({
      value: bot.hardware.mcu_params[x], consistent: true
    }),
    firmwareConfig: fakeFirmwareConfig().body,
    botDisconnected: false,
    firmwareHardware: undefined,
  });

  function testAxisLengthInput(
    provided: string, expected: string | undefined) {
    const p = fakeProps();
    p.bot.controlPanelState.homing_and_calibration = true;
    const result = mount(<HomingAndCalibration {...p} />);
    const e = inputEvent(provided);
    const input = result.find("input").first().props();
    input.onChange && input.onChange(e);
    input.onSubmit && input.onSubmit(e);
    expected
      ? expect(updateMCU)
        .toHaveBeenCalledWith("movement_axis_nr_steps_x", expected)
      : expect(updateMCU).not.toHaveBeenCalled();
  }

  it("long int: too long", () => {
    testAxisLengthInput("10000000000", undefined);
    expect(error)
      .toHaveBeenCalledWith("Value must be less than or equal to 2000000000.");
  });

  it("long int: ok", () => {
    testAxisLengthInput("100000", "100000");
    expect(warning).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("finds home", () => {
    const wrapper = shallow(<HomingAndCalibration {...fakeProps()} />);
    wrapper.find(CalibrationRow).first().props().action("x");
    expect(mockDevice.findHome).toHaveBeenCalledWith({
      axis: "x", speed: 100
    });
  });

  it("calibrates", () => {
    const wrapper = shallow(<HomingAndCalibration {...fakeProps()} />);
    wrapper.find(CalibrationRow).at(1).props().action("all");
    expect(mockDevice.calibrate).toHaveBeenCalledWith({ axis: "all" });
  });

  it("sets zero", () => {
    const wrapper = shallow(<HomingAndCalibration {...fakeProps()} />);
    wrapper.find(CalibrationRow).last().props().action("all");
    expect(mockDevice.setZero).toHaveBeenCalledWith("all");
  });

  it("shows express board related labels", () => {
    const p = fakeProps();
    p.firmwareHardware = "express_k10";
    p.controlPanelState.homing_and_calibration = true;
    const wrapper = shallow(<HomingAndCalibration {...p} />);
    expect(wrapper.find(CalibrationRow).first().props().toolTip)
      .toContain("stall detection");
  });
});
