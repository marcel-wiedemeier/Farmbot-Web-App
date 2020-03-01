jest.mock("../../../history", () => ({ history: { push: jest.fn() } }));

jest.mock("../../../api/crud", () => ({
  edit: jest.fn(),
  save: jest.fn(),
}));

import * as React from "react";
import {
  PlantPanel, PlantPanelProps, EditPlantStatusProps,
  EditDatePlantedProps, EditDatePlanted, EditPlantLocationProps,
  EditPlantLocation,
} from "../plant_panel";
import { shallow, mount } from "enzyme";
import { FormattedPlantInfo } from "../map_state_to_props";
import { Actions } from "../../../constants";
import { clickButton } from "../../../__test_support__/helpers";
import { history } from "../../../history";
import moment from "moment";
import { fakeTimeSettings } from "../../../__test_support__/fake_time_settings";
import { fakePlant } from "../../../__test_support__/fake_state/resources";
import { edit } from "../../../api/crud";
import {
  EditPlantStatus, PlantStatusBulkUpdateProps, PlantStatusBulkUpdate
} from "../edit_plant_status";

describe("<PlantPanel/>", () => {
  const info: FormattedPlantInfo = {
    x: 12,
    y: 34,
    id: undefined,
    name: "tomato",
    uuid: "Plant.0.0",
    daysOld: 1,
    plantedAt: moment("2017-06-19T08:02:22.466-05:00"),
    slug: "tomato",
    plantStatus: "planned",
  };

  const fakeProps = (): PlantPanelProps => ({
    info,
    onDestroy: jest.fn(),
    updatePlant: jest.fn(),
    dispatch: jest.fn(),
    inSavedGarden: false,
    timeSettings: fakeTimeSettings(),
  });

  it("renders: editing", () => {
    const p = fakeProps();
    const wrapper = mount(<PlantPanel {...p} />);
    const txt = wrapper.text().toLowerCase();
    expect(txt).toContain("1 days old");
    const x = wrapper.find("input").at(1).props().value;
    const y = wrapper.find("input").at(2).props().value;
    expect(x).toEqual(12);
    expect(y).toEqual(34);
  });

  it("calls destroy", () => {
    const p = fakeProps();
    const wrapper = mount(<PlantPanel {...p} />);
    clickButton(wrapper, 2, "Delete");
    expect(p.onDestroy).toHaveBeenCalledWith("Plant.0.0");
  });

  it("renders", () => {
    const p = fakeProps();
    const wrapper = mount(<PlantPanel {...p} />);
    const txt = wrapper.text().toLowerCase();
    expect(txt).toContain("1 days old");
    expect(wrapper.find("button").length).toEqual(4);
  });

  it("renders in saved garden", () => {
    const p = fakeProps();
    p.inSavedGarden = true;
    const wrapper = mount(<PlantPanel {...p} />);
    const txt = wrapper.text().toLowerCase();
    expect(txt).not.toContain("days old");
    expect(wrapper.find("button").length).toEqual(3);
  });

  it("enters select mode", () => {
    const p = fakeProps();
    const wrapper = mount(<PlantPanel {...p} />);
    clickButton(wrapper, 3, "Delete multiple");
    expect(history.push).toHaveBeenCalledWith("/app/designer/plants/select");
  });

  it("navigates to 'move to' mode", async () => {
    const p = fakeProps();
    const innerDispatch = jest.fn();
    p.dispatch = jest.fn(x => x(innerDispatch));
    const wrapper = mount(<PlantPanel {...p} />);
    await clickButton(wrapper, 0, "Move FarmBot to this plant");
    expect(history.push).toHaveBeenCalledWith("/app/designer/move_to");
    expect(innerDispatch).toHaveBeenLastCalledWith({
      type: Actions.CHOOSE_LOCATION,
      payload: { x: 12, y: 34, z: undefined }
    });
  });
});

describe("<EditPlantStatus />", () => {
  const fakeProps = (): EditPlantStatusProps => ({
    uuid: "Plant.0.0",
    plantStatus: "planned",
    updatePlant: jest.fn(),
  });

  it("changes stage to planted", () => {
    const p = fakeProps();
    const wrapper = shallow(<EditPlantStatus {...p} />);
    wrapper.find("FBSelect").simulate("change", { value: "planted" });
    expect(p.updatePlant).toHaveBeenCalledWith("Plant.0.0", {
      plant_stage: "planted",
      planted_at: expect.stringContaining("Z")
    });
  });

  it("changes stage to planned", () => {
    const p = fakeProps();
    const wrapper = shallow(<EditPlantStatus {...p} />);
    wrapper.find("FBSelect").simulate("change", { value: "planned" });
    expect(p.updatePlant).toHaveBeenCalledWith("Plant.0.0", {
      plant_stage: "planned",
      planted_at: undefined
    });
  });
});

describe("<PlantStatusBulkUpdate />", () => {
  const fakeProps = (): PlantStatusBulkUpdateProps => ({
    plants: [],
    selected: [],
    dispatch: jest.fn(),
  });

  it("doesn't update plant statuses", () => {
    const p = fakeProps();
    const plant1 = fakePlant();
    const plant2 = fakePlant();
    p.plants = [plant1, plant2];
    p.selected = [plant1.uuid];
    const wrapper = shallow(<PlantStatusBulkUpdate {...p} />);
    window.confirm = jest.fn(() => false);
    wrapper.find("FBSelect").simulate("change", { label: "", value: "planted" });
    expect(window.confirm).toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it("updates plant statuses", () => {
    const p = fakeProps();
    const plant1 = fakePlant();
    const plant2 = fakePlant();
    const plant3 = fakePlant();
    p.plants = [plant1, plant2, plant3];
    p.selected = [plant1.uuid, plant2.uuid];
    const wrapper = shallow(<PlantStatusBulkUpdate {...p} />);
    window.confirm = jest.fn(() => true);
    wrapper.find("FBSelect").simulate("change", { label: "", value: "planted" });
    expect(window.confirm).toHaveBeenCalledWith(
      "Change the plant status to 'planted' for 2 plants?");
    expect(edit).toHaveBeenCalledTimes(2);
  });
});

describe("<EditDatePlanted />", () => {
  const fakeProps = (): EditDatePlantedProps => ({
    uuid: "Plant.0.0",
    datePlanted: moment("2017-06-19T08:02:22.466-05:00"),
    updatePlant: jest.fn(),
    timeSettings: fakeTimeSettings(),
  });

  it("changes date planted", () => {
    const p = fakeProps();
    const wrapper = shallow(<EditDatePlanted {...p} />);
    wrapper.find("BlurableInput").simulate("commit", {
      currentTarget: { value: "2010-10-10" }
    });
    expect(p.updatePlant).toHaveBeenCalledWith("Plant.0.0", {
      planted_at: expect.stringContaining("Z")
    });
  });
});

describe("<EditPlantLocation />", () => {
  const fakeProps = (): EditPlantLocationProps => ({
    uuid: "Plant.0.0",
    xyLocation: { x: 1, y: 2 },
    updatePlant: jest.fn(),
  });

  it("changes location", () => {
    const p = fakeProps();
    const wrapper = shallow(<EditPlantLocation {...p} />);
    wrapper.find("BlurableInput").first().simulate("commit", {
      currentTarget: { value: "100" }
    });
    expect(p.updatePlant).toHaveBeenCalledWith("Plant.0.0", {
      x: 100
    });
  });
});
