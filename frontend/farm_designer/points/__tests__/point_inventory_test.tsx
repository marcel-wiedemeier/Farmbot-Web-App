jest.mock("../../../history", () => ({
  push: jest.fn(),
  getPathArray: () => [],
}));

import * as React from "react";
import { mount, shallow } from "enzyme";
import { RawPoints as Points, PointsProps } from "../point_inventory";
import { fakePoint } from "../../../__test_support__/fake_state/resources";
import { push } from "../../../history";
import { fakeState } from "../../../__test_support__/fake_state";
import {
  buildResourceIndex,
} from "../../../__test_support__/resource_index_builder";
import { mapStateToProps } from "../point_inventory";

describe("<Points> />", () => {
  const fakeProps = (): PointsProps => ({
    genericPoints: [],
    dispatch: jest.fn(),
    hoveredPoint: undefined,
  });

  it("renders no points", () => {
    const wrapper = mount(<Points {...fakeProps()} />);
    expect(wrapper.text()).toContain("No points yet.");
  });

  it("renders points", () => {
    const p = fakeProps();
    p.genericPoints = [fakePoint()];
    const wrapper = mount(<Points {...p} />);
    expect(wrapper.text()).toContain("Point 1");
  });

  it("navigates to point info", () => {
    const p = fakeProps();
    p.genericPoints = [fakePoint()];
    p.genericPoints[0].body.id = 1;
    const wrapper = mount(<Points {...p} />);
    wrapper.find(".point-search-item").first().simulate("click");
    expect(push).toHaveBeenCalledWith("/app/designer/points/1");
  });

  it("changes search term", () => {
    const p = fakeProps();
    p.genericPoints = [fakePoint(), fakePoint()];
    p.genericPoints[0].body.name = "point 0";
    p.genericPoints[1].body.name = "point 1";
    const wrapper = shallow<Points>(<Points {...p} />);
    wrapper.find("input").first().simulate("change",
      { currentTarget: { value: "0" } });
    expect(wrapper.state().searchTerm).toEqual("0");
  });

  it("filters points", () => {
    const p = fakeProps();
    p.genericPoints = [fakePoint(), fakePoint()];
    p.genericPoints[0].body.name = "point 0";
    p.genericPoints[1].body.name = "point 1";
    const wrapper = mount(<Points {...p} />);
    wrapper.setState({ searchTerm: "0" });
    expect(wrapper.text()).not.toContain("point 1");
  });
});

describe("mapStateToProps()", () => {
  it("returns props", () => {
    const state = fakeState();
    const point = fakePoint();
    const discarded = fakePoint();
    discarded.body.discarded_at = "2016-05-22T05:00:00.000Z";
    state.resources = buildResourceIndex([point, discarded]);
    const props = mapStateToProps(state);
    expect(props.genericPoints).toEqual([point]);
  });
});
