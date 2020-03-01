let mockPath = "";
jest.mock("../../../history", () => ({
  history: { push: jest.fn() },
  getPathArray: jest.fn(() => mockPath.split("/"))
}));

let mockDestroy = jest.fn(() => Promise.resolve());
jest.mock("../../../api/crud", () => ({ destroy: mockDestroy }));

let mockDev = false;
jest.mock("../../../account/dev/dev_support", () => ({
  DevSettings: { futureFeaturesEnabled: () => mockDev }
}));

jest.mock("../../point_groups/actions", () => ({ createGroup: jest.fn() }));

import * as React from "react";
import { mount } from "enzyme";
import {
  RawSelectPlants as SelectPlants, SelectPlantsProps, mapStateToProps,
} from "../select_plants";
import { fakePlant } from "../../../__test_support__/fake_state/resources";
import { Actions, Content } from "../../../constants";
import { clickButton } from "../../../__test_support__/helpers";
import { destroy } from "../../../api/crud";
import { createGroup } from "../../point_groups/actions";
import { fakeState } from "../../../__test_support__/fake_state";
import { error } from "../../../toast/toast";

describe("<SelectPlants />", () => {
  beforeEach(function () {
    mockPath = "/app/designer/plants/select";
  });

  function fakeProps(): SelectPlantsProps {
    const plant1 = fakePlant();
    plant1.uuid = "plant.1";
    plant1.body.name = "Strawberry";
    const plant2 = fakePlant();
    plant2.uuid = "plant.2";
    plant2.body.name = "Blueberry";
    return {
      selected: ["plant.1"],
      plants: [plant1, plant2],
      dispatch: jest.fn(x => x),
      gardenOpen: undefined,
    };
  }

  it("displays selected plant", () => {
    const wrapper = mount(<SelectPlants {...fakeProps()} />);
    expect(wrapper.text()).toContain("Strawberry");
  });

  it("displays multiple selected plants", () => {
    const p = fakeProps();
    p.selected = ["plant.1", "plant.2"];
    const wrapper = mount(<SelectPlants {...p} />);
    ["Strawberry", "Blueberry", "Delete"].map(string =>
      expect(wrapper.text()).toContain(string));
  });

  it("displays selected plant count", () => {
    const p = fakeProps();
    p.selected = ["plant.1", "plant.2"];
    const wrapper = mount(<SelectPlants {...p} />);
    expect(wrapper.text()).toContain("2 plants selected");
  });

  it("displays selected plant count: none", () => {
    const p = fakeProps();
    p.selected = undefined;
    const wrapper = mount(<SelectPlants {...p} />);
    expect(wrapper.text()).toContain("0 plants selected");
  });

  it("displays no selected plants: selection empty", () => {
    const p = fakeProps();
    p.selected = [];
    const wrapper = mount(<SelectPlants {...p} />);
    expect(wrapper.text()).not.toContain("Strawberry Plant");
  });

  it("displays no selected plants: selection invalid", () => {
    const p = fakeProps();
    p.selected = ["not a uuid"];
    const wrapper = mount(<SelectPlants {...p} />);
    expect(wrapper.text()).not.toContain("Strawberry Plant");
  });

  it("selects all", () => {
    const p = fakeProps();
    p.dispatch = jest.fn();
    const wrapper = mount(<SelectPlants {...p} />);
    clickButton(wrapper, 1, "select all");
    expect(p.dispatch).toHaveBeenCalledWith(
      { payload: ["plant.1", "plant.2"], type: Actions.SELECT_PLANT });
  });

  it("selects none", () => {
    const p = fakeProps();
    p.dispatch = jest.fn();
    const wrapper = mount(<SelectPlants {...p} />);
    clickButton(wrapper, 0, "select none");
    expect(p.dispatch).toHaveBeenCalledWith(
      { payload: undefined, type: Actions.SELECT_PLANT });
  });

  it("confirms deletion of selected plants", () => {
    const p = fakeProps();
    p.selected = ["plant.1", "plant.2"];
    const wrapper = mount(<SelectPlants {...p} />);
    expect(wrapper.text()).toContain("Delete");
    window.confirm = jest.fn();
    wrapper.find("button").at(2).simulate("click");
    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to delete 2 plants?");
  });

  it("deletes selected plants", () => {
    const p = fakeProps();
    mockDestroy = jest.fn(() => Promise.resolve());
    p.selected = ["plant.1", "plant.2"];
    const wrapper = mount(<SelectPlants {...p} />);
    expect(wrapper.text()).toContain("Delete");
    window.confirm = () => true;
    wrapper.find("button").at(2).simulate("click");
    expect(destroy).toHaveBeenCalledWith("plant.1", true);
    expect(destroy).toHaveBeenCalledWith("plant.2", true);
  });

  it("does not delete if selection is empty", () => {
    const p = fakeProps();
    mockDestroy = jest.fn(() => Promise.resolve());
    p.selected = undefined;
    const wrapper = mount(<SelectPlants {...p} />);
    expect(wrapper.text()).toContain("Delete");
    wrapper.find("button").at(2).simulate("click");
    expect(destroy).not.toHaveBeenCalled();
  });

  it("errors when deleting selected plants", () => {
    const p = fakeProps();
    mockDestroy = jest.fn(() => Promise.reject());
    p.selected = ["plant.1", "plant.2"];
    const wrapper = mount(<SelectPlants {...p} />);
    expect(wrapper.text()).toContain("Delete");
    window.confirm = () => true;
    wrapper.find("button").at(2).simulate("click");
    expect(destroy).toHaveBeenCalledWith("plant.1", true);
    expect(destroy).toHaveBeenCalledWith("plant.2", true);
  });

  it("shows other buttons", () => {
    mockDev = true;
    const wrapper = mount(<SelectPlants {...fakeProps()} />);
    expect(wrapper.text()).toContain("Create");
  });

  it("creates group", () => {
    const wrapper = mount(<SelectPlants {...fakeProps()} />);
    wrapper.find(".dark-blue").simulate("click");
    expect(createGroup).toHaveBeenCalled();
  });

  it("doesn't create group", () => {
    const p = fakeProps();
    p.gardenOpen = "uuid";
    const wrapper = mount(<SelectPlants {...p} />);
    wrapper.find(".dark-blue").simulate("click");
    expect(createGroup).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(Content.ERROR_PLANT_TEMPLATE_GROUP);
  });
});

describe("mapStateToProps", () => {
  it("selects correct props", () => {
    const state = fakeState();
    const result = mapStateToProps(state);
    expect(result).toBeTruthy();
    expect(result.selected).toBeUndefined();
    expect(result.plants.length).toBe(2);
    expect(result.dispatch).toBe(state.dispatch);
  });
});
