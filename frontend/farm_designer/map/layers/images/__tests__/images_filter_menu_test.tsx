import * as React from "react";
import { ImageFilterMenu, ImageFilterMenuProps } from "../image_filter_menu";
import { shallow, mount } from "enzyme";
import {
  fakeWebAppConfig,
} from "../../../../../__test_support__/fake_state/resources";
import { StringConfigKey } from "farmbot/dist/resources/configs/web_app";
import { setWebAppConfigValue } from "../../../../../config_storage/actions";
import {
  fakeTimeSettings,
} from "../../../../../__test_support__/fake_time_settings";

const mockConfig = fakeWebAppConfig();
jest.mock("../../../../../resources/selectors", () => ({
  getWebAppConfig: () => mockConfig,
  assertUuid: jest.fn(),
}));

jest.mock("../../../../../config_storage/actions", () => ({
  setWebAppConfigValue: jest.fn(),
}));

describe("<ImageFilterMenu />", () => {
  mockConfig.body.photo_filter_begin = "";
  mockConfig.body.photo_filter_end = "";

  const fakeProps = (): ImageFilterMenuProps => ({
    timeSettings: fakeTimeSettings(),
    dispatch: jest.fn(),
    getConfigValue: jest.fn(x => mockConfig.body[x as StringConfigKey]),
    imageAgeInfo: { newestDate: "", toOldest: 1 },
  });

  it("renders", () => {
    const p = fakeProps();
    const wrapper = shallow(<ImageFilterMenu {...p} />);
    ["Date", "Time", "Newer than", "Older than"].map(string =>
      expect(wrapper.text()).toContain(string));
  });

  it.each<[
    "beginDate" | "endDate", "photo_filter_begin" | "photo_filter_end", number
  ]>([
    ["beginDate", "photo_filter_begin", 0],
    ["endDate", "photo_filter_end", 2],
  ])("sets filter: %s", (filter, key, i) => {
    const p = fakeProps();
    const wrapper = shallow<ImageFilterMenu>(<ImageFilterMenu {...p} />);
    wrapper.find("BlurableInput").at(i).simulate("commit", {
      currentTarget: { value: "2001-01-03" }
    });
    expect(wrapper.instance().state[filter]).toEqual("2001-01-03");
    expect(setWebAppConfigValue)
      .toHaveBeenCalledWith(key, "2001-01-03T00:00:00.000Z");
  });

  it.each<[
    "beginTime" | "endTime", "photo_filter_begin" | "photo_filter_end", number
  ]>([
    ["beginTime", "photo_filter_begin", 1],
    ["endTime", "photo_filter_end", 3],
  ])("sets filter: %s", (filter, key, i) => {
    const p = fakeProps();
    const wrapper = shallow<ImageFilterMenu>(<ImageFilterMenu {...p} />);
    wrapper.setState({ beginDate: "2001-01-03", endDate: "2001-01-03" });
    wrapper.find("BlurableInput").at(i).simulate("commit", {
      currentTarget: { value: "05:00" }
    });
    expect(wrapper.instance().state[filter]).toEqual("05:00");
    expect(setWebAppConfigValue)
      .toHaveBeenCalledWith(key, "2001-01-03T05:00:00.000Z");
  });

  it("loads values from config", () => {
    mockConfig.body.photo_filter_begin = "2001-01-03T05:00:00.000Z";
    mockConfig.body.photo_filter_end = "2001-01-03T06:00:00.000Z";
    const wrapper = shallow(<ImageFilterMenu {...fakeProps()} />);
    expect(wrapper.state()).toEqual({
      beginDate: "2001-01-03", beginTime: "05:00",
      endDate: "2001-01-03", endTime: "06:00", slider: NaN
    });
  });

  it("changes slider", () => {
    const p = fakeProps();
    p.imageAgeInfo.newestDate = "2001-01-03T05:00:00.000Z";
    const wrapper = shallow<ImageFilterMenu>(<ImageFilterMenu {...p} />);
    wrapper.instance().sliderChange(1);
    expect(wrapper.instance().state.slider).toEqual(1);
    expect(setWebAppConfigValue)
      .toHaveBeenCalledWith("photo_filter_begin", "2001-01-02T00:00:00.000Z");
    expect(setWebAppConfigValue)
      .toHaveBeenCalledWith("photo_filter_end", "2001-01-03T00:00:00.000Z");
  });

  it("displays slider labels", () => {
    const p = fakeProps();
    p.imageAgeInfo.newestDate = "2001-01-03T00:00:00.000Z";
    const wrapper = mount(<ImageFilterMenu {...p} />);
    ["Jan-1", "Jan-2", "Jan-3"].map(date =>
      expect(wrapper.text()).toContain(date));
  });
});
