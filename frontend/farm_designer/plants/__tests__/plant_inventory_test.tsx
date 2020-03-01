jest.mock("../../../open_farm/cached_crop", () => ({
  maybeGetCachedPlantIcon: jest.fn(),
}));

import * as React from "react";
import {
  RawPlants as Plants, PlantInventoryProps, mapStateToProps,
} from "../plant_inventory";
import { mount, shallow } from "enzyme";
import { fakePlant } from "../../../__test_support__/fake_state/resources";
import { fakeState } from "../../../__test_support__/fake_state";

describe("<PlantInventory />", () => {
  const fakeProps = (): PlantInventoryProps => ({
    plants: [fakePlant()],
    dispatch: jest.fn(),
    hoveredPlantListItem: undefined,
  });

  it("renders", () => {
    const wrapper = mount(<Plants {...fakeProps()} />);
    ["Strawberry Plant",
      "11 days old"].map(string => expect(wrapper.text()).toContain(string));
    expect(wrapper.find("input").props().placeholder)
      .toEqual("Search your plants...");
  });

  it("has link to crops", () => {
    const wrapper = mount(<Plants {...fakeProps()} />);
    expect(wrapper.html()).toContain("fa-plus");
    expect(wrapper.html()).toContain("/app/designer/plants/crop_search");
  });

  it("updates search term", () => {
    const wrapper = shallow<Plants>(<Plants {...fakeProps()} />);
    expect(wrapper.state().searchTerm).toEqual("");
    wrapper.find("input").first().simulate("change",
      { currentTarget: { value: "mint" } });
    expect(wrapper.state().searchTerm).toEqual("mint");
  });
});

describe("mapStateToProps()", () => {
  it("returns props", () => {
    const state = fakeState();
    state.resources.consumers.farm_designer.hoveredPlantListItem = "uuid";
    const result = mapStateToProps(state);
    expect(result.hoveredPlantListItem).toEqual("uuid");
  });
});
