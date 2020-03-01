import { Everything } from "../interfaces";
import {
  selectAllImages, maybeGetDevice, maybeGetTimeSettings
} from "../resources/selectors";
import {
  FarmwareProps, Feature, SaveFarmwareEnv, UserEnv, ShouldDisplay, BotState
} from "../devices/interfaces";
import { prepopulateEnv } from "./weed_detector/remote_env/selectors";
import {
  selectAllFarmwareEnvs, selectAllFarmwareInstallations
} from "../resources/selectors_by_kind";
import {
  determineInstalledOsVersion,
  createShouldDisplayFn,
  betterCompact
} from "../util";
import { ResourceIndex } from "../resources/interfaces";
import { TaggedFarmwareEnv, JobProgress } from "farmbot";
import { save, edit, initSave } from "../api/crud";
import { chain } from "lodash";
import { FarmwareManifestInfo, Farmwares } from "./interfaces";
import { manifestInfo, manifestInfoPending } from "./generate_manifest_info";
import { t } from "../i18next_wrapper";
import { getStatus } from "../connectivity/reducer_support";
import { DevSettings } from "../account/dev/dev_support";
import { getWebAppConfigValue } from "../config_storage/actions";

/** Edit an existing Farmware env variable or add a new one. */
export const saveOrEditFarmwareEnv = (ri: ResourceIndex): SaveFarmwareEnv =>
  (key: string, value: string) => (dispatch: Function) => {
    const fwEnvLookup: Record<string, TaggedFarmwareEnv> = {};
    selectAllFarmwareEnvs(ri)
      .map(x => { fwEnvLookup[x.body.key] = x; });
    if (Object.keys(fwEnvLookup).includes(key)) {
      const fwEnv = fwEnvLookup[key];
      dispatch(edit(fwEnv, { value }));
      dispatch(save(fwEnv.uuid));
    } else {
      dispatch(initSave("FarmwareEnv", { key, value }));
    }
  };

export const isPendingInstallation = (farmware: FarmwareManifestInfo | undefined) =>
  !farmware || farmware.installation_pending;

export const reduceFarmwareEnv =
  (ri: ResourceIndex): UserEnv => {
    const farmwareEnv: UserEnv = {};
    selectAllFarmwareEnvs(ri)
      .map(x => { farmwareEnv[x.body.key] = "" + x.body.value; });
    return farmwareEnv;
  };

export const getEnv =
  (ri: ResourceIndex, shouldDisplay: ShouldDisplay, bot: BotState) =>
    shouldDisplay(Feature.api_farmware_env)
      ? reduceFarmwareEnv(ri)
      : bot.hardware.user_env;

export const getShouldDisplayFn = (ri: ResourceIndex, bot: BotState) => {
  const lookupData = bot.minOsFeatureData;
  const installed = determineInstalledOsVersion(bot, maybeGetDevice(ri));
  const override = DevSettings.overriddenFbosVersion();
  const shouldDisplay = createShouldDisplayFn(installed, lookupData, override);
  return shouldDisplay;
};

export function mapStateToProps(props: Everything): FarmwareProps {
  const images = chain(selectAllImages(props.resources.index))
    .sortBy(x => x.body.id)
    .reverse()
    .value();
  const firstImage = images[0];
  const currentImage = images
    .filter(i => i.uuid === props.resources.consumers.farmware.currentImage)[0]
    || firstImage;
  const botStateFarmwares = props.bot.hardware.process_info.farmwares;
  const { currentFarmware, firstPartyFarmwareNames, infoOpen } =
    props.resources.consumers.farmware;

  const shouldDisplay = getShouldDisplayFn(props.resources.index, props.bot);
  const env = getEnv(props.resources.index, shouldDisplay, props.bot);

  const taggedFarmwareInstallations =
    selectAllFarmwareInstallations(props.resources.index);

  const namePendingInstall =
    (packageName: string | undefined, id: number | undefined): string => {
      const nameBase = packageName || `${t("Unknown Farmware")} ${id}`;
      const pendingInstall = ` (${t("pending install")}...)`;
      return nameBase + pendingInstall;
    };

  const farmwares: Farmwares = {};
  Object.values(botStateFarmwares).map((fm: unknown) => {
    const info = manifestInfo(fm);
    farmwares[info.name] = manifestInfo(fm);
  });
  shouldDisplay(Feature.api_farmware_installations) &&
    taggedFarmwareInstallations.map(x => {
      const n = namePendingInstall(x.body.package, x.body.id);
      const alreadyAdded = Object.keys(farmwares).includes(x.body.package || n);
      const alreadyInstalled = Object.values(farmwares)
        .map(fw => fw.url).includes(x.body.url);
      if (x.body.id && !alreadyAdded && !alreadyInstalled) {
        farmwares[n] = manifestInfoPending(n, x.body.url);
      }
    });

  const jobs = props.bot.hardware.jobs || {};
  const imageJobNames = Object.keys(jobs).filter(x => x != "FBOS_OTA");
  const imageJobs: JobProgress[] =
    chain(betterCompact(imageJobNames.map(x => jobs[x])))
      .sortBy("time")
      .reverse()
      .value();

  const botToMqttStatus = getStatus(props.bot.connectivity.uptime["bot.mqtt"]);
  const syncStatus = props.bot.hardware.informational_settings.sync_status;

  return {
    timeSettings: maybeGetTimeSettings(props.resources.index),
    currentFarmware,
    farmwares,
    botToMqttStatus,
    wDEnv: prepopulateEnv(env),
    env,
    dispatch: props.dispatch,
    currentImage,
    images,
    syncStatus,
    getConfigValue: getWebAppConfigValue(() => props),
    firstPartyFarmwareNames,
    shouldDisplay,
    saveFarmwareEnv: saveOrEditFarmwareEnv(props.resources.index),
    taggedFarmwareInstallations,
    imageJobs,
    infoOpen,
  };
}
