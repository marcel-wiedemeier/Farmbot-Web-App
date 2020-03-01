import * as React from "react";
import axios from "axios";
import { t } from "../../i18next_wrapper";
import { FarmbotOsProps, FarmbotOsState, Feature } from "../interfaces";
import { Widget, WidgetHeader, WidgetBody, Row, Col } from "../../ui";
import { save, edit } from "../../api/crud";
import { isBotOnline } from "../must_be_online";
import { Content, DeviceSetting } from "../../constants";
import { TimezoneSelector } from "../timezones/timezone_selector";
import { timezoneMismatch } from "../timezones/guess_timezone";
import { CameraSelection } from "./fbos_settings/camera_selection";
import { BoardType } from "./fbos_settings/board_type";
import { FarmbotOsRow } from "./fbos_settings/farmbot_os_row";
import { AutoUpdateRow } from "./fbos_settings/auto_update_row";
import { AutoSyncRow } from "./fbos_settings/auto_sync_row";
import { PowerAndReset } from "./fbos_settings/power_and_reset";
import { BootSequenceSelector } from "./fbos_settings/boot_sequence_selector";
import { ExternalUrl } from "../../external_urls";
import { Highlight } from "./maybe_highlight";
import { OtaTimeSelectorRow } from "./fbos_settings/ota_time_selector";

export enum ColWidth {
  label = 3,
  description = 7,
  button = 2
}

export class FarmbotOsSettings
  extends React.Component<FarmbotOsProps, FarmbotOsState> {
  state: FarmbotOsState = { allOsReleaseNotes: "" };

  componentDidMount() {
    this.fetchReleaseNotes(ExternalUrl.osReleaseNotes);
  }

  get osMajorVersion() {
    return (this.props.bot.hardware.informational_settings
      .controller_version || "6").split(".")[0];
  }

  fetchReleaseNotes = (url: string) => {
    axios
      .get<string>(url)
      .then(resp => this.setState({ allOsReleaseNotes: resp.data }))
      .catch(() => this.setState({ allOsReleaseNotes: "" }));
  }

  get osReleaseNotes() {
    const notes = (this.state.allOsReleaseNotes
      .split("# v")
      .filter(x => x.startsWith(this.osMajorVersion))[0] || "")
      .split("\n\n").slice(1).join("\n") || t("Could not get release notes.");
    const heading = "FarmBot OS v" + this.osMajorVersion;
    return { heading, notes };
  }

  changeBot = (e: React.FormEvent<HTMLInputElement>) => {
    const { deviceAccount, dispatch } = this.props;
    dispatch(edit(deviceAccount, { name: e.currentTarget.value }));
  }

  updateBot = () => {
    const { deviceAccount, dispatch } = this.props;
    dispatch(save(deviceAccount.uuid));
  }

  handleTimezone = (timezone: string) => {
    const { deviceAccount, dispatch } = this.props;
    dispatch(edit(deviceAccount, { timezone }));
    dispatch(save(deviceAccount.uuid));
  }

  maybeWarnTz = () => {
    const wrongTZ = timezoneMismatch(this.props.deviceAccount.body.timezone);
    return wrongTZ ? t(Content.DIFFERENT_TZ_WARNING) : "";
  }

  render() {
    const { bot, sourceFbosConfig, botToMqttStatus } = this.props;
    const { sync_status } = bot.hardware.informational_settings;
    const botOnline = isBotOnline(sync_status, botToMqttStatus);
    return <Widget className="device-widget">
      <form onSubmit={(e) => e.preventDefault()}>
        <WidgetHeader title="Device">
        </WidgetHeader>
        <WidgetBody>
          <Row>
            <Highlight settingName={DeviceSetting.name}>
              <Col xs={ColWidth.label}>
                <label>
                  {t(DeviceSetting.name)}
                </label>
              </Col>
              <Col xs={9}>
                <input name="name"
                  onChange={this.changeBot}
                  onBlur={this.updateBot}
                  value={this.props.deviceAccount.body.name} />
              </Col>
            </Highlight>
          </Row>
          <Row>
            <Highlight settingName={DeviceSetting.timezone}>
              <Col xs={ColWidth.label}>
                <label>
                  {t("TIME ZONE")}
                </label>
              </Col>
              <Col xs={ColWidth.description}>
                <div className="note">
                  {this.maybeWarnTz()}
                </div>
                <TimezoneSelector
                  currentTimezone={this.props.deviceAccount.body.timezone}
                  onUpdate={this.handleTimezone} />
              </Col>
            </Highlight>
          </Row>
          <CameraSelection
            env={this.props.env}
            botOnline={botOnline}
            saveFarmwareEnv={this.props.saveFarmwareEnv}
            shouldDisplay={this.props.shouldDisplay}
            dispatch={this.props.dispatch} />
          <BoardType
            botOnline={botOnline}
            bot={bot}
            alerts={this.props.alerts}
            dispatch={this.props.dispatch}
            shouldDisplay={this.props.shouldDisplay}
            timeSettings={this.props.timeSettings}
            sourceFbosConfig={sourceFbosConfig} />
          <OtaTimeSelectorRow
            timeSettings={this.props.timeSettings}
            device={this.props.deviceAccount}
            dispatch={this.props.dispatch}
            sourceFbosConfig={sourceFbosConfig} />
          <AutoUpdateRow
            dispatch={this.props.dispatch}
            sourceFbosConfig={sourceFbosConfig} />
          <FarmbotOsRow
            bot={this.props.bot}
            osReleaseNotesHeading={this.osReleaseNotes.heading}
            osReleaseNotes={this.osReleaseNotes.notes}
            dispatch={this.props.dispatch}
            sourceFbosConfig={sourceFbosConfig}
            shouldDisplay={this.props.shouldDisplay}
            botOnline={botOnline}
            botToMqttLastSeen={new Date(this.props.botToMqttLastSeen).getTime()}
            timeSettings={this.props.timeSettings}
            deviceAccount={this.props.deviceAccount} />
          <AutoSyncRow
            dispatch={this.props.dispatch}
            sourceFbosConfig={sourceFbosConfig} />
          {this.props.shouldDisplay(Feature.boot_sequence) &&
            <BootSequenceSelector />}
          <PowerAndReset
            controlPanelState={this.props.bot.controlPanelState}
            dispatch={this.props.dispatch}
            sourceFbosConfig={sourceFbosConfig}
            botOnline={botOnline} />
        </WidgetBody>
      </form>
    </Widget>;
  }
}
