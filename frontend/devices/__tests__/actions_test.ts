const mockDeviceDefault: DeepPartial<Farmbot> = {
  checkUpdates: jest.fn(() => Promise.resolve()),
  powerOff: jest.fn(() => Promise.resolve()),
  resetOS: jest.fn(),
  reboot: jest.fn(() => Promise.resolve()),
  rebootFirmware: jest.fn(() => Promise.resolve()),
  flashFirmware: jest.fn(() => Promise.resolve()),
  emergencyLock: jest.fn(() => Promise.resolve()),
  emergencyUnlock: jest.fn(() => Promise.resolve()),
  execSequence: jest.fn(() => Promise.resolve()),
  resetMCU: jest.fn(() => Promise.resolve()),
  togglePin: jest.fn(() => Promise.resolve()),
  readPin: jest.fn(() => Promise.resolve()),
  home: jest.fn(() => Promise.resolve()),
  sync: jest.fn(() => Promise.resolve()),
  readStatus: jest.fn(() => Promise.resolve())
};

const mockDevice = {
  current: mockDeviceDefault
};

jest.mock("../../device", () => ({ getDevice: () => mockDevice.current }));

jest.mock("../../api/crud", () => ({
  edit: jest.fn(),
  save: jest.fn(),
}));

let mockGetRelease: Promise<{}> = Promise.resolve({});
jest.mock("axios", () => ({ get: jest.fn(() => mockGetRelease) }));

import * as actions from "../actions";
import {
  fakeFirmwareConfig, fakeFbosConfig,
} from "../../__test_support__/fake_state/resources";
import { fakeState } from "../../__test_support__/fake_state";
import {
  changeStepSize, commandErr,
} from "../actions";
import { Actions } from "../../constants";
import { buildResourceIndex } from "../../__test_support__/resource_index_builder";
import axios from "axios";
import { success, error, warning, info } from "../../toast/toast";
import { edit, save } from "../../api/crud";
import { DeepPartial } from "redux";
import { Farmbot } from "farmbot";

const replaceDeviceWith = async (d: DeepPartial<Farmbot>, cb: Function) => {
  jest.clearAllMocks();
  mockDevice.current = { ...mockDeviceDefault, ...d };
  await cb();
  mockDevice.current = mockDeviceDefault;
};

describe("checkControllerUpdates()", function () {
  it("calls checkUpdates", async () => {
    await actions.checkControllerUpdates();
    expect(mockDevice.current.checkUpdates).toHaveBeenCalled();
    expect(success).toHaveBeenCalled();
  });
});

describe("powerOff()", function () {
  it("calls powerOff", async () => {
    await actions.powerOff();
    expect(mockDevice.current.powerOff).toHaveBeenCalled();
    expect(success).toHaveBeenCalled();
  });
});

describe("factoryReset()", () => {
  it("doesn't call factoryReset", async () => {
    window.confirm = () => false;
    await actions.factoryReset();
    expect(mockDevice.current.resetOS).not.toHaveBeenCalled();
  });

  it("calls factoryReset", async () => {
    window.confirm = () => true;
    await actions.factoryReset();
    expect(mockDevice.current.resetOS).toHaveBeenCalled();
  });
});

describe("reboot()", function () {
  it("calls reboot", async () => {
    await actions.reboot();
    expect(mockDevice.current.reboot).toHaveBeenCalled();
    expect(success).toHaveBeenCalled();
  });
});

describe("restartFirmware()", function () {
  it("calls restartFirmware", async () => {
    await actions.restartFirmware();
    expect(mockDevice.current.rebootFirmware).toHaveBeenCalled();
    expect(success).toHaveBeenCalled();
  });
});

describe("flashFirmware()", function () {
  it("calls flashFirmware", async () => {
    await actions.flashFirmware("arduino");
    expect(mockDevice.current.flashFirmware).toHaveBeenCalled();
    expect(success).toHaveBeenCalled();
  });
});

describe("emergencyLock() / emergencyUnlock", function () {
  it("calls emergencyLock", () => {
    actions.emergencyLock();
    expect(mockDevice.current.emergencyLock).toHaveBeenCalled();
  });

  it("calls emergencyUnlock", () => {
    window.confirm = () => true;
    actions.emergencyUnlock();
    expect(mockDevice.current.emergencyUnlock).toHaveBeenCalled();
  });

  it("doesn't call emergencyUnlock", () => {
    window.confirm = () => false;
    actions.emergencyUnlock();
    expect(mockDevice.current.emergencyUnlock).not.toHaveBeenCalled();
  });
});

describe("sync()", function () {
  it("calls sync", () => {
    const state = fakeState();
    state.bot.hardware.informational_settings.controller_version = "999.0.0";
    actions.sync()(jest.fn(), () => state);
    expect(mockDevice.current.sync).toHaveBeenCalled();
  });

  it("calls badVersion", () => {
    const state = fakeState();
    state.bot.hardware.informational_settings.controller_version = "1.0.0";
    actions.sync()(jest.fn(), () => state);
    expect(mockDevice.current.sync).not.toHaveBeenCalled();
    expect(info).toBeCalledWith(
      expect.stringContaining("old version"),
      expect.stringContaining("Please Update"),
      "red");
  });

  it("doesn't call sync: disconnected", () => {
    const state = fakeState();
    state.bot.hardware.informational_settings.controller_version = undefined;
    actions.sync()(jest.fn(), () => state);
    expect(mockDevice.current.sync).not.toHaveBeenCalled();
    const expectedMessage = ["FarmBot is not connected.", "Disconnected", "red"];
    expect(info).toBeCalledWith(...expectedMessage);
  });
});

describe("execSequence()", function () {
  it("handles normal errors", () => {
    const errorThrower: DeepPartial<Farmbot> = {
      execSequence: jest.fn(() => Promise.reject(new Error("yolo")))
    };

    replaceDeviceWith(errorThrower, async () => {
      await actions.execSequence(1, []);
      expect(mockDevice.current.execSequence).toHaveBeenCalledWith(1, []);
      expect(error).toHaveBeenCalledWith("yolo");
    });
  });

  it("handles unexpected errors", async () => {
    const errorThrower: DeepPartial<Farmbot> = {
      execSequence: jest.fn(() => Promise.reject("unexpected"))
    };

    await replaceDeviceWith(errorThrower, async () => {
      await actions.execSequence(22, []);
      expect(mockDevice.current.execSequence).toHaveBeenCalledWith(22, []);
      expect(error).toHaveBeenCalledWith("Sequence execution failed");
    });
  });

  it("calls execSequence", async () => {
    await actions.execSequence(1);
    expect(mockDevice.current.execSequence).toHaveBeenCalledWith(1, undefined);
    expect(success).toHaveBeenCalled();
  });

  it("calls execSequence with variables", async () => {
    await actions.execSequence(1, []);
    expect(mockDevice.current.execSequence).toHaveBeenCalledWith(1, []);
    expect(success).toHaveBeenCalled();
  });

  it("implodes when executing unsaved sequences", () => {
    expect(() => actions.execSequence(undefined)).toThrow();
    expect(mockDevice.current.execSequence).not.toHaveBeenCalled();
  });
});

describe("MCUFactoryReset()", function () {
  it("doesn't call resetMCU", () => {
    window.confirm = () => false;
    actions.MCUFactoryReset();
    expect(mockDevice.current.resetMCU).not.toHaveBeenCalled();
  });

  it("calls resetMCU", () => {
    window.confirm = () => true;
    actions.MCUFactoryReset();
    expect(mockDevice.current.resetMCU).toHaveBeenCalled();
  });
});

describe("settingToggle()", () => {
  it("toggles mcu param via FirmwareConfig", () => {
    const sourceSetting = () => ({ value: 1, consistent: true });
    const state = fakeState();
    const fakeConfig = fakeFirmwareConfig();
    state.resources = buildResourceIndex([fakeConfig]);
    actions.settingToggle(
      "param_mov_nr_retry", sourceSetting)(jest.fn(), () => state);
    expect(edit).toHaveBeenCalledWith(fakeConfig, { param_mov_nr_retry: 0 });
    expect(save).toHaveBeenCalledWith(fakeConfig.uuid);
  });

  it("displays an alert message", () => {
    window.alert = jest.fn();
    const msg = "this is an alert.";
    actions.settingToggle(
      "param_mov_nr_retry", jest.fn(() => ({ value: 1, consistent: true })),
      msg)(jest.fn(), fakeState);
    expect(window.alert).toHaveBeenCalledWith(msg);
  });
});

describe("updateMCU()", () => {
  it("updates mcu param via FirmwareConfig", () => {
    const state = fakeState();
    const fakeConfig = fakeFirmwareConfig();
    state.resources = buildResourceIndex([fakeConfig]);
    actions.updateMCU(
      "param_mov_nr_retry", "0")(jest.fn(), () => state);
    expect(edit).toHaveBeenCalledWith(fakeConfig, { param_mov_nr_retry: "0" });
    expect(save).toHaveBeenCalledWith(fakeConfig.uuid);
  });

  it("prevents update with incompatible value", () => {
    const state = fakeState();
    const fakeConfig = fakeFirmwareConfig();
    fakeConfig.body.movement_max_spd_x = 0;
    state.resources = buildResourceIndex([fakeConfig]);
    actions.updateMCU(
      "movement_min_spd_x", "100")(jest.fn(), () => state);
    expect(warning).toHaveBeenCalledWith(
      "Minimum speed should always be lower than maximum");
  });
});

describe("pinToggle()", function () {
  it("calls togglePin", async () => {
    await actions.pinToggle(5);
    expect(mockDevice.current.togglePin).toHaveBeenCalledWith({ pin_number: 5 });
    expect(success).not.toHaveBeenCalled();
  });
});

describe("readPin()", function () {
  it("calls readPin", async () => {
    await actions.readPin(1, "label", 0);
    expect(mockDevice.current.readPin).toHaveBeenCalledWith({
      pin_number: 1, label: "label", pin_mode: 0,
    });
    expect(success).not.toHaveBeenCalled();
  });
});

describe("homeAll()", function () {
  it("calls home", async () => {
    await actions.homeAll(100);
    expect(mockDevice.current.home)
      .toHaveBeenCalledWith({ axis: "all", speed: 100 });
    expect(success).not.toHaveBeenCalled();
  });
});

describe("isLog()", function () {
  it("knows if it is a log or not", () => {
    expect(actions.isLog({})).toBe(false);
    expect(actions.isLog({ message: "foo" })).toBe(true);
  });

  it("filters sensitive logs", () => {
    const log = { message: "NERVESPSKWPASSWORD" };
    console.error = jest.fn();
    const result = actions.isLog(log);
    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Refusing to display log"));
  });
});

describe("commandErr()", () => {
  it("sends toast", () => {
    commandErr()();
    expect(error).toHaveBeenCalledWith("Command failed");
  });
});

describe("toggleControlPanel()", () => {
  it("toggles", () => {
    const action = actions.toggleControlPanel("homing_and_calibration");
    expect(action.payload).toEqual("homing_and_calibration");
  });
});

describe("changeStepSize()", () => {
  it("returns a redux action", () => {
    const payload = 23;
    const result = changeStepSize(payload);
    expect(result.type).toBe(Actions.CHANGE_STEP_SIZE);
    expect(result.payload).toBe(payload);
  });
});

describe("fetchReleases()", () => {
  it("fetches latest OS release version", async () => {
    mockGetRelease = Promise.resolve({ data: { tag_name: "v1.0.0" } });
    const dispatch = jest.fn();
    await actions.fetchReleases("url")(dispatch);
    expect(axios.get).toHaveBeenCalledWith("url");
    expect(error).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      payload: { version: "1.0.0", commit: undefined },
      type: Actions.FETCH_OS_UPDATE_INFO_OK
    });
  });

  it("fetches latest beta OS release version", async () => {
    mockGetRelease = Promise.resolve({
      data: { tag_name: "v1.0.0-beta", target_commitish: "commit" }
    });
    const dispatch = jest.fn();
    await actions.fetchReleases("url", { beta: true })(dispatch);
    expect(axios.get).toHaveBeenCalledWith("url");
    expect(error).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      payload: { version: "1.0.0-beta", commit: "commit" },
      type: Actions.FETCH_BETA_OS_UPDATE_INFO_OK
    });
  });

  it("fails to fetches latest OS release version", async () => {
    mockGetRelease = Promise.reject("error");
    const dispatch = jest.fn();
    console.error = jest.fn();
    await actions.fetchReleases("url")(dispatch);
    await expect(axios.get).toHaveBeenCalledWith("url");
    expect(console.error).toHaveBeenCalledWith(
      "Could not download FarmBot OS update information.");
    expect(dispatch).toHaveBeenCalledWith({
      payload: "error",
      type: Actions.FETCH_OS_UPDATE_INFO_ERROR
    });
  });

  it("fails to fetches latest beta OS release version", async () => {
    mockGetRelease = Promise.reject("error");
    const dispatch = jest.fn();
    await actions.fetchReleases("url", { beta: true })(dispatch);
    await expect(axios.get).toHaveBeenCalledWith("url");
    expect(error).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      payload: "error",
      type: Actions.FETCH_BETA_OS_UPDATE_INFO_ERROR
    });
  });
});

describe("fetchLatestGHBetaRelease()", () => {
  it.each<[string, string]>([
    ["v1.0.0-beta", "1.0.0-beta"],
    ["v1.0.0-rc1", "1.0.0-rc1"],
  ])("fetches latest beta OS release version: %s", async (tag_name, version) => {
    mockGetRelease = Promise.resolve({ data: [{ tag_name }] });
    const dispatch = jest.fn();
    await actions.fetchLatestGHBetaRelease("url/001")(dispatch);
    expect(axios.get).toHaveBeenCalledWith("url");
    expect(error).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      payload: { version, commit: undefined },
      type: Actions.FETCH_BETA_OS_UPDATE_INFO_OK
    });
  });

  it("fails to fetches latest beta OS release version", async () => {
    mockGetRelease = Promise.reject("error");
    const dispatch = jest.fn();
    await actions.fetchLatestGHBetaRelease("url/001")(dispatch);
    await expect(axios.get).toHaveBeenCalledWith("url");
    expect(error).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      payload: "error",
      type: Actions.FETCH_BETA_OS_UPDATE_INFO_ERROR
    });
  });
});

describe("fetchMinOsFeatureData()", () => {
  afterEach(() =>
    jest.restoreAllMocks());

  it("fetches min OS feature data: empty", async () => {
    mockGetRelease = Promise.resolve({ data: {} });
    const dispatch = jest.fn();
    await actions.fetchMinOsFeatureData("url")(dispatch);
    expect(axios.get).toHaveBeenCalledWith("url");
    expect(dispatch).toHaveBeenCalledWith({
      payload: {},
      type: Actions.FETCH_MIN_OS_FEATURE_INFO_OK
    });
  });

  it("fetches min OS feature data", async () => {
    mockGetRelease = Promise.resolve({
      data: { "a_feature": "1.0.0", "b_feature": "2.0.0" }
    });
    const dispatch = jest.fn();
    await actions.fetchMinOsFeatureData("url")(dispatch);
    expect(axios.get).toHaveBeenCalledWith("url");
    expect(dispatch).toHaveBeenCalledWith({
      payload: { a_feature: "1.0.0", b_feature: "2.0.0" },
      type: Actions.FETCH_MIN_OS_FEATURE_INFO_OK
    });
  });

  it("fetches bad min OS feature data: not an object", async () => {
    mockGetRelease = Promise.resolve({ data: "bad" });
    const dispatch = jest.fn();
    const mockConsole = jest.spyOn(console, "log").mockImplementation(() => { });
    await actions.fetchMinOsFeatureData("url")(dispatch);
    expect(axios.get).toHaveBeenCalledWith("url");
    expect(dispatch).not.toHaveBeenCalled();
    expect(mockConsole).toHaveBeenCalledWith(
      expect.stringContaining("\"bad\""));
  });

  it("fetches bad min OS feature data", async () => {
    mockGetRelease = Promise.resolve({ data: { a: "0", b: 0 } });
    const dispatch = jest.fn();
    const mockConsole = jest.spyOn(console, "log").mockImplementation(() => { });
    await actions.fetchMinOsFeatureData("url")(dispatch);
    expect(axios.get).toHaveBeenCalledWith("url");
    expect(dispatch).not.toHaveBeenCalled();
    expect(mockConsole).toHaveBeenCalledWith(
      expect.stringContaining("{\"a\":\"0\",\"b\":0}"));
  });

  it("fails to fetch min OS feature data", async () => {
    mockGetRelease = Promise.reject("error");
    const dispatch = jest.fn();
    await actions.fetchMinOsFeatureData("url")(dispatch);
    await expect(axios.get).toHaveBeenCalledWith("url");
    expect(error).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      payload: "error",
      type: Actions.FETCH_MIN_OS_FEATURE_INFO_ERROR
    });
  });
});

describe("updateConfig()", () => {
  it("updates config: FbosConfig", () => {
    const state = fakeState();
    const fakeConfig = fakeFbosConfig();
    state.resources = buildResourceIndex([fakeConfig]);
    actions.updateConfig({ auto_sync: true })(jest.fn(), () => state);
    expect(edit).toHaveBeenCalledWith(fakeConfig, { auto_sync: true });
    expect(save).toHaveBeenCalledWith(fakeConfig.uuid);
  });
});

describe("badVersion()", () => {
  it("warns of old FBOS version", () => {
    actions.badVersion();
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("old version"), "Please Update", "red");
  });
});
