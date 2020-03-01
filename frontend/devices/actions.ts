import axios from "axios";
import { success, warning, info, error } from "../toast/toast";
import { getDevice } from "../device";
import { Everything } from "../interfaces";
import {
  GithubRelease, MoveRelProps, MinOsFeatureLookup, SourceFwConfig, Axis
} from "./interfaces";
import { Thunk } from "../redux/interfaces";
import {
  McuParams, TaggedFirmwareConfig, ParameterApplication,
  ALLOWED_PIN_MODES,
  FirmwareHardware
} from "farmbot";
import { ControlPanelState } from "../devices/interfaces";
import { oneOf, versionOK, trim } from "../util";
import { Actions, Content } from "../constants";
import { mcuParamValidator } from "./update_interceptor";
import { edit, save as apiSave } from "../api/crud";
import { CONFIG_DEFAULTS } from "farmbot/dist/config";
import { Log } from "farmbot/dist/resources/api_resources";
import { FbosConfig } from "farmbot/dist/resources/configs/fbos";
import { FirmwareConfig } from "farmbot/dist/resources/configs/firmware";
import { getFirmwareConfig, getFbosConfig } from "../resources/getters";
import { isObject, isString, get, noop } from "lodash";
import { t } from "../i18next_wrapper";

const ON = 1, OFF = 0;
export type ConfigKey = keyof McuParams;
// Already filtering messages in FarmBot OS and the API- this is just for
// an additional layer of safety.
const BAD_WORDS = ["WPA", "PSK", "PASSWORD", "NERVES"];
const MESSAGE: keyof Log = "message";

export function isLog(x: unknown): x is Log {
  const msg = get(x, MESSAGE);
  const yup = isObject(x) && isString(msg);
  if (yup) {
    if (oneOf(BAD_WORDS, msg.toUpperCase())) { // SECURITY CRITICAL CODE.
      console.error("Refusing to display log: " + JSON.stringify(x));
      return false;
    }
    return true;
  } else {
    return false;
  }
}

/** Toast message upon request error. */
export const commandErr =
  (noun = "Command") => () => error(t(`${noun} failed`));

/** Toast message upon request success. */
export const commandOK = (noun = "Command") => () => {
  const msg = t(noun) + t(" request sent to device.");
  success(msg, t("Request sent"));
};

/** Update FBOS. */
export function checkControllerUpdates() {
  const noun = t("Check for Updates");
  commandOK(noun)();
  getDevice()
    .checkUpdates()
    .catch(commandErr(noun));
}

/** Shutdown FBOS. */
export function powerOff() {
  const noun = t("Power Off Bot");
  getDevice()
    .powerOff()
    .then(commandOK(noun), commandErr(noun));
}

/** Factory reset FBOS. */
export function factoryReset() {
  if (!confirm(t(Content.FACTORY_RESET_ALERT))) {
    return;
  }
  getDevice().resetOS();
}

/** Reboot FBOS. */
export function reboot() {
  const noun = t("Reboot Bot");
  getDevice()
    .reboot()
    .then(commandOK(noun), commandErr(noun));
}

/** Restart Farmduino firmware serial connection. */
export function restartFirmware() {
  const noun = t("Restart Firmware");
  const device = getDevice();
  return device
    .rebootFirmware()
    .then(device.emergencyLock)
    .then(device.emergencyUnlock)
    .then(commandOK(noun), commandErr(noun));
}

export function flashFirmware(firmwareName: FirmwareHardware) {
  const noun = t("Flash Firmware");
  getDevice()
    .flashFirmware(firmwareName)
    .then(commandOK(noun), commandErr(noun));
}

export function emergencyLock() {
  const noun = t("Emergency stop");
  getDevice()
    .emergencyLock()
    .then(commandOK(noun), commandErr(noun));
}

export function emergencyUnlock(force = false) {
  const noun = t("Emergency unlock");
  if (force || confirm(t(`Are you sure you want to unlock the device?`))) {
    getDevice()
      .emergencyUnlock()
      .then(commandOK(noun), commandErr(noun));
  }
}

export function sync(): Thunk {
  const noun = t("Sync");
  return function (_dispatch, getState) {
    const currentFBOSversion =
      getState().bot.hardware.informational_settings.controller_version;
    const IS_OK = versionOK(currentFBOSversion);
    if (IS_OK) {
      getDevice()
        .sync()
        .catch(commandErr(noun));
    } else {
      if (currentFBOSversion) {
        badVersion();
      } else {
        info(t("FarmBot is not connected."), t("Disconnected"), "red");
      }
    }
  };
}

export function execSequence(
  sequenceId: number | undefined,
  bodyVariables?: ParameterApplication[]
) {
  const noun = t("Sequence execution");
  if (sequenceId) {
    commandOK(noun)();
    return getDevice()
      .execSequence(sequenceId, bodyVariables)
      .catch((x: Error) => {
        if (x && (typeof x == "object") && (typeof x.message == "string")) {
          error(x.message);
        } else {
          commandErr(noun)();
        }
      });
  } else {
    throw new Error(t("Can't execute unsaved sequences"));
  }
}

const tagNameToVersionString = (tagName: string): string =>
  tagName.toLowerCase().replace("v", "");

/**
 * Fetch FarmBot OS beta release data.
 * Ignores a specific release provided by the url (i.e., `releases/1234`)
 * in favor of the latest `-beta` release.
 */
export const fetchLatestGHBetaRelease =
  (url: string) =>
    (dispatch: Function) => {
      const urlArray = url.split("/");
      const releasesURL = urlArray.splice(0, urlArray.length - 1).join("/");
      axios
        .get<GithubRelease[]>(releasesURL)
        .then(resp => {
          const latestBeta = resp.data.filter(x =>
            x.tag_name.includes("beta") || x.tag_name.includes("rc"))[0];
          const { tag_name, target_commitish } = latestBeta;
          const version = tagNameToVersionString(tag_name);
          dispatch({
            type: Actions.FETCH_BETA_OS_UPDATE_INFO_OK,
            payload: { version, commit: target_commitish }
          });
        })
        .catch(ferror => dispatch({
          type: "FETCH_BETA_OS_UPDATE_INFO_ERROR",
          payload: ferror
        }));
    };

/** Fetch FarmBot OS release data. */
export const fetchReleases =
  (url: string, options = { beta: false }) =>
    (dispatch: Function) => {
      axios
        .get<GithubRelease>(url)
        .then(resp => {
          const { tag_name, target_commitish } = resp.data;
          const version = tagNameToVersionString(tag_name);
          dispatch({
            type: options.beta
              ? Actions.FETCH_BETA_OS_UPDATE_INFO_OK
              : Actions.FETCH_OS_UPDATE_INFO_OK,
            payload: { version, commit: target_commitish }
          });
        })
        .catch((ferror) => {
          !options.beta &&
            console.error(t("Could not download FarmBot OS update information."));
          dispatch({
            type: options.beta
              ? "FETCH_BETA_OS_UPDATE_INFO_ERROR"
              : "FETCH_OS_UPDATE_INFO_ERROR",
            payload: ferror
          });
        });
    };

/**
 * Structure and type checks for fetched minimum FBOS version feature object.
 * @param x axios response data
 */
function validMinOsFeatureLookup(x: MinOsFeatureLookup): boolean {
  return isObject(x) &&
    Object.entries(x).every(([key, val]) =>
      typeof key === "string" && // feature name
      typeof val === "string" && // version string
      val.split(".").length > 2); // "0.0.0"
}

/**
 * Fetch and save minimum FBOS version data for UI feature display.
 * @param url location of data
 */
export const fetchMinOsFeatureData = (url: string) =>
  (dispatch: Function) => {
    axios
      .get<MinOsFeatureLookup>(url)
      .then(resp => {
        const data = resp.data;
        if (validMinOsFeatureLookup(data)) {
          dispatch({
            type: Actions.FETCH_MIN_OS_FEATURE_INFO_OK,
            payload: data
          });
        } else {
          console.log(`Warning! Got '${JSON.stringify(data)}', ` +
            "expected min OS feature data.");
        }
      })
      .catch((ferror) => {
        dispatch({
          type: Actions.FETCH_MIN_OS_FEATURE_INFO_ERROR,
          payload: ferror
        });
      });
  };

/**
 * Toggles visibility of individual sections in the giant controls panel
 * found on the Devices page.
 */
export function toggleControlPanel(payload: keyof ControlPanelState) {
  return { type: Actions.TOGGLE_CONTROL_PANEL_OPTION, payload };
}

/** Toggle visibility of all hardware control panel sections. */
export function bulkToggleControlPanel(payload: boolean) {
  return { type: Actions.BULK_TOGGLE_CONTROL_PANEL, payload };
}

/** Factory reset all firmware settings. */
export function MCUFactoryReset() {
  if (!confirm(t(Content.MCU_RESET_ALERT))) {
    return;
  }
  return getDevice().resetMCU().catch(commandErr("MCU Reset"));
}

/** Toggle a firmware setting. */
export function settingToggle(
  key: ConfigKey,
  sourceFwConfig: SourceFwConfig,
  displayAlert?: string | undefined
) {
  return function (dispatch: Function, getState: () => Everything) {
    if (displayAlert) { alert(trim(displayAlert)); }
    const update = { [key]: (sourceFwConfig(key).value === 0) ? ON : OFF };
    const firmwareConfig = getFirmwareConfig(getState().resources.index);
    const toggleFirmwareConfig = (fwConfig: TaggedFirmwareConfig) => {
      dispatch(edit(fwConfig, update));
      dispatch(apiSave(fwConfig.uuid));
    };

    if (firmwareConfig) {
      return toggleFirmwareConfig(firmwareConfig);
    }
  };
}

export function moveRelative(props: MoveRelProps) {
  return getDevice()
    .moveRelative(props)
    .then(noop, commandErr("Relative movement"));
}

export function moveAbs(props: MoveRelProps) {
  const noun = t("Absolute movement");
  return getDevice()
    .moveAbsolute(props)
    .then(noop, commandErr(noun));
}

export function pinToggle(pin_number: number) {
  const noun = t("Setting toggle");
  return getDevice()
    .togglePin({ pin_number })
    .then(noop, commandErr(noun));
}

export function readPin(
  pin_number: number, label: string, pin_mode: ALLOWED_PIN_MODES
) {
  const noun = t("Read pin");
  return getDevice()
    .readPin({ pin_number, label, pin_mode })
    .then(noop, commandErr(noun));
}

export function homeAll(speed: number) {
  const noun = t("'Home All' command");
  getDevice()
    .home({ axis: "all", speed })
    .catch(commandErr(noun));
}

export function findHome(axis: Axis, speed = CONFIG_DEFAULTS.speed) {
  const noun = t("'Find Home' command");
  getDevice()
    .findHome({ axis, speed })
    .catch(commandErr(noun));
}

/** Update firmware setting. */
export function updateMCU(key: ConfigKey, val: string) {
  return function (dispatch: Function, getState: () => Everything) {
    const firmwareConfig = getFirmwareConfig(getState().resources.index);
    const getParams = () => {
      if (firmwareConfig) {
        return firmwareConfig.body;
      } else {
        return getState().bot.hardware.mcu_params;
      }
    };

    function proceed() {
      if (firmwareConfig) {
        dispatch(edit(firmwareConfig, { [key]: val } as Partial<FirmwareConfig>));
        dispatch(apiSave(firmwareConfig.uuid));
      }
    }

    const dont = (err: string) => warning(err);

    const validate = mcuParamValidator(key, parseInt(val, 10), getParams());
    validate(proceed, dont);
  };
}

/** Update FBOS setting. */
export function updateConfig(config: Partial<FbosConfig>) {
  return function (dispatch: Function, getState: () => Everything) {
    const fbosConfig = getFbosConfig(getState().resources.index);
    if (fbosConfig) {
      dispatch(edit(fbosConfig, config));
      dispatch(apiSave(fbosConfig.uuid));
    }
  };
}

/** Change jog button movement amount. */
export function changeStepSize(integer: number) {
  return {
    type: Actions.CHANGE_STEP_SIZE,
    payload: integer
  };
}

export function badVersion() {
  info(t("You are running an old version of FarmBot OS."),
    t("Please Update"), "red");
}
