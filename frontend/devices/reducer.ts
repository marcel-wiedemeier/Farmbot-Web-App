import {
  BotState,
  ControlPanelState,
  HardwareState,
  MinOsFeatureLookup,
  OsUpdateInfo,
} from "./interfaces";
import { generateReducer } from "../redux/generate_reducer";
import { Actions } from "../constants";
import { maybeNegateStatus } from "../connectivity/maybe_negate_status";
import { ReduxAction } from "../redux/interfaces";
import { connectivityReducer, PingResultPayload } from "../connectivity/reducer";
import { versionOK } from "../util";
import { DeepPartial } from "redux";
import { incomingLegacyStatus } from "../connectivity/connect_device";
import { merge } from "lodash";

const afterEach = (state: BotState, a: ReduxAction<{}>) => {
  state.connectivity = connectivityReducer(state.connectivity, a);
  return state;
};

export const initialState = (): BotState => ({
  consistent: true,
  stepSize: 100,
  controlPanelState: {
    homing_and_calibration: false,
    motors: false,
    encoders: false,
    endstops: false,
    error_handling: false,
    pin_bindings: false,
    danger_zone: false,
    power_and_reset: false,
    pin_guard: false
  },
  hardware: {
    gpio_registry: {},
    mcu_params: {},
    jobs: {},
    location_data: {
      "position": {
        x: undefined,
        y: undefined,
        z: undefined
      },
      "scaled_encoders": {
        x: undefined,
        y: undefined,
        z: undefined
      },
      "raw_encoders": {
        x: undefined,
        y: undefined,
        z: undefined
      },
    },
    pins: {},
    configuration: {},
    informational_settings: {
      busy: false,
      locked: false,
      commit: "---",
      target: "---",
      env: "---",
      node_name: "---",
      firmware_version: "---",
      firmware_commit: "---",
    },
    user_env: {},
    process_info: {
      farmwares: {},
    }
  },
  dirty: false,
  currentOSVersion: undefined,
  currentBetaOSVersion: undefined,
  minOsFeatureData: undefined,
  connectivity: {
    uptime: {
      "bot.mqtt": undefined,
      "user.mqtt": undefined,
      "user.api": undefined
    },
    pings: {}
  }
});

export const botReducer = generateReducer<BotState>(initialState())
  .afterEach(afterEach)
  .add<boolean>(Actions.SET_CONSISTENCY, (s, a) => {
    s.consistent = a.payload;
    s.hardware.informational_settings.sync_status = maybeNegateStatus({
      consistent: s.consistent,
      syncStatus: s.hardware.informational_settings.sync_status,
      fbosVersion: s.hardware.informational_settings.controller_version,
      autoSync: !!s.hardware.configuration.auto_sync
    });
    return s;
  })
  .add<void>(Actions.SETTING_UPDATE_START, (s) => {
    s.isUpdating = true;
    return s;
  })
  .add<void>(Actions.SETTING_UPDATE_END, (s) => {
    s.isUpdating = false;
    return s;
  })
  .add<number>(Actions.CHANGE_STEP_SIZE, (s, a) => {
    return Object.assign({}, s, {
      stepSize: a.payload
    });
  })
  .add<keyof ControlPanelState>(Actions.TOGGLE_CONTROL_PANEL_OPTION, (s, a) => {
    s.controlPanelState[a.payload] = !s.controlPanelState[a.payload];
    return s;
  })
  .add<boolean>(Actions.BULK_TOGGLE_CONTROL_PANEL, (s, a) => {
    s.controlPanelState.homing_and_calibration = a.payload;
    s.controlPanelState.motors = a.payload;
    s.controlPanelState.encoders = a.payload;
    s.controlPanelState.endstops = a.payload;
    s.controlPanelState.error_handling = a.payload;
    s.controlPanelState.pin_bindings = a.payload;
    s.controlPanelState.pin_guard = a.payload;
    s.controlPanelState.danger_zone = a.payload;
    return s;
  })
  .add<OsUpdateInfo>(Actions.FETCH_OS_UPDATE_INFO_OK, (s, { payload }) => {
    s.currentOSVersion = payload.version;
    return s;
  })
  .add<OsUpdateInfo>(Actions.FETCH_BETA_OS_UPDATE_INFO_OK, (s, { payload }) => {
    s.currentBetaOSVersion = payload.version;
    s.currentBetaOSCommit = payload.commit;
    return s;
  })
  .add<MinOsFeatureLookup>(Actions.FETCH_MIN_OS_FEATURE_INFO_OK,
    (s, { payload }) => {
      s.minOsFeatureData = payload;
      return s;
    })
  .add<DeepPartial<HardwareState>>(Actions.STATUS_UPDATE, (s, { payload }) => {
    s.hardware = merge(s.hardware, payload);
    legacyStatusHandler(s, incomingLegacyStatus(s.hardware));
    return s;
  })
  .add<HardwareState>(Actions.LEGACY_BOT_CHANGE, legacyStatusHandler)
  .add<void>(Actions.STASH_STATUS, (s) => {
    stash(s);
    return s;
  })
  .add<void>(Actions._RESOURCE_NO, (s) => {
    unstash(s);
    return s;
  })
  .add<PingResultPayload>(Actions.PING_OK, (s) => {
    // Going from "down" to "up"
    const currentState = s.connectivity.uptime["bot.mqtt"];
    const backOnline = currentState && currentState.state === "down";
    backOnline && unstash(s);
    return s;
  })
  .add<PingResultPayload>(Actions.PING_NO, (s) => {
    stash(s);
    s.hardware.informational_settings.sync_status = undefined;
    return s;
  });

/** Mutate syncStatus when transitioning from consistent to inconsistent. */
const stash = (s: BotState) => {
  const botStatus = s.hardware.informational_settings.sync_status;
  botStatus && (s.statusStash = botStatus);
};

/** Put the old syncStatus back where it was after bot becomes consistent. */
const unstash = (s: BotState) =>
  s.hardware.informational_settings.sync_status = s.statusStash;

function legacyStatusHandler(state: BotState,
  action: ReduxAction<HardwareState>): BotState {
  const { payload } = action;
  state.hardware = payload;
  const { informational_settings } = state.hardware;
  const syncStatus = informational_settings.sync_status;
  /** USE CASE: You reboot the bot. The old state values are still hanging
   * around. You think the bot is broke, but it isn't. The FE is holding on
   * to stale data. */
  if (syncStatus === "maintenance") {
    const emptyState = initialState();
    state.hardware = emptyState.hardware;
    state.hardware.informational_settings.sync_status = "maintenance";
    return state;
  }

  const info = {
    consistent: state.consistent,
    syncStatus,
    fbosVersion: informational_settings.controller_version,
    autoSync: !!state.hardware.configuration.auto_sync
  };
  state.consistent = info.consistent;
  info.consistent = state.consistent;

  const nextSyncStatus = maybeNegateStatus(info);

  versionOK(informational_settings.controller_version);
  state.hardware.informational_settings.sync_status = nextSyncStatus;
  return state;
}
