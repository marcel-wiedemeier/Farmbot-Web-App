jest.mock("../../../api/crud", () => ({ overwrite: jest.fn() }));

import * as React from "react";
import { mount } from "enzyme";
import { ActiveEditor, editRegimenVariables } from "../active_editor";
import { fakeRegimen } from "../../../__test_support__/fake_state/resources";
import { ActiveEditorProps } from "../interfaces";
import {
  buildResourceIndex,
} from "../../../__test_support__/resource_index_builder";
import { overwrite } from "../../../api/crud";
import { VariableDeclaration } from "farmbot";
import { clickButton } from "../../../__test_support__/helpers";
import { Actions } from "../../../constants";

const testVariable: VariableDeclaration = {
  kind: "variable_declaration",
  args: {
    label: "variable", data_value: {
      kind: "coordinate", args: { x: 1, y: 2, z: 3 }
    }
  }
};

describe("<ActiveEditor />", () => {
  const fakeProps = (): ActiveEditorProps => ({
    dispatch: jest.fn(),
    regimen: fakeRegimen(),
    calendar: [{
      day: "1",
      items: [{
        name: "Item 0",
        color: "red",
        hhmm: "10:00",
        sortKey: 0,
        day: 1,
        dispatch: jest.fn(),
        regimen: fakeRegimen(),
        item: {
          sequence_id: 0, time_offset: 1000
        },
        variable: undefined,
      }]
    }],
    resources: buildResourceIndex([]).index,
    shouldDisplay: () => false,
    variableData: {},
  });

  it("renders", () => {
    const wrapper = mount(<ActiveEditor {...fakeProps()} />);
    ["Day", "Item 0", "10:00"].map(string =>
      expect(wrapper.text()).toContain(string));
  });

  it("removes regimen item", () => {
    const keptItem = { sequence_id: 1, time_offset: 1000 };
    const p = fakeProps();
    p.calendar[0].items[0].regimen.body.regimen_items =
      [p.calendar[0].items[0].item, keptItem];
    const wrapper = mount(<ActiveEditor {...p} />);
    wrapper.find("i").simulate("click");
    expect(overwrite).toHaveBeenCalledWith(expect.any(Object),
      expect.objectContaining({ regimen_items: [keptItem] }));
  });

  it("opens scheduler", () => {
    const p = fakeProps();
    const wrapper = mount(<ActiveEditor {...p} />);
    clickButton(wrapper, 3, "Schedule item");
    expect(p.dispatch).toHaveBeenCalledWith({
      type: Actions.SET_SCHEDULER_STATE, payload: true
    });
  });

  it("has correct height without variable form", () => {
    const p = fakeProps();
    p.regimen.body.body = [];
    p.shouldDisplay = () => true;
    const wrapper = mount(<ActiveEditor {...p} />);
    expect(wrapper.find(".regimen").props().style).toEqual({
      height: "calc(100vh - 200px)"
    });
  });

  it("has correct height with variable form", () => {
    const p = fakeProps();
    p.regimen.body.body = [testVariable];
    p.shouldDisplay = () => true;
    const wrapper = mount(<ActiveEditor {...p} />);
    expect(wrapper.find(".regimen").props().style)
      .toEqual({ height: "calc(100vh - 500px)" });
  });

  it("has correct height with variable form collapsed", () => {
    const p = fakeProps();
    p.regimen.body.body = [testVariable];
    p.shouldDisplay = () => true;
    const wrapper = mount(<ActiveEditor {...p} />);
    wrapper.setState({ variablesCollapsed: true });
    expect(wrapper.find(".regimen").props().style)
      .toEqual({ height: "calc(100vh - 300px)" });
  });

  it("automatically calculates height", () => {
    document.getElementById = () => ({ offsetHeight: 101 } as HTMLElement);
    const wrapper = mount(<ActiveEditor {...fakeProps()} />);
    expect(wrapper.find(".regimen").props().style)
      .toEqual({ height: "calc(100vh - 301px)" });
  });

  it("toggles variable form state", () => {
    const wrapper = mount<ActiveEditor>(<ActiveEditor {...fakeProps()} />);
    wrapper.instance().toggleVarShow();
    expect(wrapper.state()).toEqual({ variablesCollapsed: true });
  });

  it("shows location variable label: coordinate", () => {
    const p = fakeProps();
    p.calendar[0].items[0].regimen.body.body = [testVariable];
    p.calendar[0].items[0].variable = testVariable.args.label;
    const wrapper = mount(<ActiveEditor {...p} />);
    expect(wrapper.find(".regimen-event-variable").text())
      .toEqual("Location Variable - Coordinate (1, 2, 3)");
  });

  it("doesn't show location variable label", () => {
    const p = fakeProps();
    p.calendar[0].items[0].regimen.body.body = [];
    p.calendar[0].items[0].variable = "variable";
    const wrapper = mount(<ActiveEditor {...p} />);
    expect(wrapper.find(".regimen-event-variable").length).toEqual(0);
  });
});

describe("editRegimenVariables()", () => {
  it("updates bodyVariables", () => {
    const regimen = fakeRegimen();
    editRegimenVariables({ dispatch: jest.fn(), regimen })([])(testVariable);
    expect(overwrite).toHaveBeenCalledWith(regimen,
      expect.objectContaining({ body: [testVariable] }));
  });
});
