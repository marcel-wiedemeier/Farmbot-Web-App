import React from "react";
import {
  GroupInventoryItem, GroupInventoryItemProps,
} from "../group_inventory_item";
import {
  fakePointGroup, fakePlant,
} from "../../../__test_support__/fake_state/resources";
import { mount } from "enzyme";

describe("<GroupInventoryItem />", () => {
  const fakeProps = (): GroupInventoryItemProps => ({
    group: fakePointGroup(),
    allPoints: [],
    dispatch: jest.fn(),
    onClick: jest.fn(),
    hovered: true,
  });

  it("renders information about the current group", () => {
    const p = fakeProps();
    p.group.body.point_ids = [1, 2, 3];
    p.group.body.name = "woosh";
    const point1 = fakePlant();
    point1.body.id = 1;
    const point2 = fakePlant();
    point2.body.id = 2;
    const point3 = fakePlant();
    point3.body.id = 3;
    p.allPoints = [point1, point2, point3];
    const x = mount(<GroupInventoryItem {...p} />);
    expect(x.text()).toContain("3 items");
    expect(x.text()).toContain("woosh");
    expect(x.find(".hovered").length).toBe(1);
  });
});
