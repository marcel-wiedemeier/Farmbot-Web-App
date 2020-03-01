import * as React from "react";
import { Widget, WidgetHeader, WidgetBody, Row, Col } from "../../ui";
import { Content } from "../../constants";
import { t } from "../../i18next_wrapper";

export function ExportAccountPanel(props: { onClick: () => void }) {
  return <Widget>
    <WidgetHeader title={t("Export Account Data")} />
    <WidgetBody>
      <div className={"export-account-data-description"}>
        {t(Content.EXPORT_DATA_DESC)}
      </div>
      <form>
        <Row>
          <Col xs={8}>
            <label>
              {t("Send Account Export File (Email)")}
            </label>
          </Col>
          <Col xs={4}>
            <button className="green fb-button" type="button"
              title={t("Export")}
              onClick={props.onClick}>
              {t("Export")}
            </button>
          </Col>
        </Row>
      </form>
    </WidgetBody>
  </Widget>;
}
