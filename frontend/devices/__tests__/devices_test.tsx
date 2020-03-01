jest.mock("../../api/crud", () => ({ save: jest.fn() }));

import * as React from "react";
import { shallow, render } from "enzyme";
import { RawDevices as Devices } from "../devices";
import { Props } from "../interfaces";
import { auth } from "../../__test_support__/fake_state/token";
import { bot } from "../../__test_support__/fake_state/bot";
import {
  fakeDevice, buildResourceIndex, FAKE_RESOURCES,
} from "../../__test_support__/resource_index_builder";
import { FarmbotOsSettings } from "../components/farmbot_os_settings";
import { fakeTimeSettings } from "../../__test_support__/fake_time_settings";
import { HardwareSettings } from "../components/hardware_settings";
import { DeepPartial } from "redux";
import { save } from "../../api/crud";
import { fakeWebAppConfig } from "../../__test_support__/fake_state/resources";

describe("<Devices/>", () => {
  const fakeProps = (): Props => ({
    userToApi: undefined,
    userToMqtt: undefined,
    botToMqtt: undefined,
    auth: auth,
    bot: bot,
    deviceAccount: fakeDevice(),
    images: [],
    dispatch: jest.fn(),
    resources: buildResourceIndex(FAKE_RESOURCES).index,
    sourceFbosConfig: () => ({ value: undefined, consistent: true }),
    sourceFwConfig: jest.fn(),
    shouldDisplay: jest.fn(),
    firmwareConfig: undefined,
    isValidFbosConfig: false,
    env: {},
    saveFarmwareEnv: jest.fn(),
    timeSettings: fakeTimeSettings(),
    alerts: [],
    webAppConfig: fakeWebAppConfig()
  });

  it("renders relevant panels", () => {
    const el = shallow(<Devices {...fakeProps()} />);
    expect(el.find(FarmbotOsSettings).length).toBe(1);
  });

  it("crashes when logged out", () => {
    const p = fakeProps();
    p.auth = undefined;
    expect(() => render(<Devices {...p} />)).toThrow();
  });

  it("has correct connection status", () => {
    const p = fakeProps();
    p.botToMqtt = { at: 123, state: "up" };
    const wrapper = shallow(<Devices {...p} />);
    expect(wrapper.find(FarmbotOsSettings).props().botToMqttLastSeen)
      .toEqual(123);
  });

  it("provides correct firmwareHardware value", () => {
    const p = fakeProps();
    p.sourceFbosConfig = () => ({ value: "arduino", consistent: true });
    const wrapper = shallow(<Devices {...p} />);
    expect(wrapper.find(HardwareSettings).props().firmwareHardware)
      .toEqual("arduino");
  });

  it("triggers a save", () => {
    type P = FarmbotOsSettings["props"];
    type DPP = DeepPartial<P>;
    const props: DPP = {
      deviceAccount: { uuid: "a.b.c" },
      dispatch: jest.fn()
    };
    const el = new FarmbotOsSettings(props as P);
    el.updateBot();
    expect(save)
      .toHaveBeenCalledWith(props.deviceAccount && props.deviceAccount.uuid);
  });
});
