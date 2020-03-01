import * as React from "react";
import { connect } from "react-redux";
import {
  DesignerPanel, DesignerPanelHeader, DesignerPanelContent
} from "../designer_panel";
import { t } from "../../i18next_wrapper";
import { history, getPathArray } from "../../history";
import { Panel } from "../panel_header";
import { Everything } from "../../interfaces";
import { TaggedGenericPointer } from "farmbot";
import { maybeFindGenericPointerById } from "../../resources/selectors";
import { Actions } from "../../constants";
import {
  EditPointProperties, updatePoint, PointActions
} from "./point_edit_actions";

export interface EditPointProps {
  dispatch: Function;
  findPoint(id: number): TaggedGenericPointer | undefined;
}

export const mapStateToProps = (props: Everything): EditPointProps => ({
  dispatch: props.dispatch,
  findPoint: id => maybeFindGenericPointerById(props.resources.index, id),
});

export class RawEditPoint extends React.Component<EditPointProps, {}> {
  get stringyID() { return getPathArray()[4] || ""; }
  get point() {
    if (this.stringyID) {
      return this.props.findPoint(parseInt(this.stringyID));
    }
  }
  get panelName() { return "point-info"; }
  get backTo() { return "/app/designer/points"; }

  render() {
    !this.point && history.push(this.backTo);
    return <DesignerPanel panelName={this.panelName} panel={Panel.Points}>
      <DesignerPanelHeader
        panelName={this.panelName}
        panel={Panel.Points}
        title={t("Edit point")}
        backTo={this.backTo}
        onBack={() => this.props.dispatch({
          type: Actions.TOGGLE_HOVERED_POINT, payload: undefined
        })} />
      <DesignerPanelContent panelName={this.panelName}>
        {this.point
          ? <div className={"point-panel-content-wrapper"}>
            <EditPointProperties point={this.point}
              updatePoint={updatePoint(this.point, this.props.dispatch)} />
            <PointActions
              x={this.point.body.x}
              y={this.point.body.y}
              z={this.point.body.z}
              uuid={this.point.uuid}
              dispatch={this.props.dispatch} />
          </div>
          : <span>{t("Redirecting")}...</span>}
      </DesignerPanelContent>
    </DesignerPanel>;
  }
}

export const EditPoint = connect(mapStateToProps)(RawEditPoint);
