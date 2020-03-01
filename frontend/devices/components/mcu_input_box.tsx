import * as React from "react";
import { warning } from "../../toast/toast";
import { McuInputBoxProps } from "../interfaces";
import { updateMCU } from "../actions";
import { BlurableInput } from "../../ui/index";
import {
  clampUnsignedInteger, IntegerSize, getMaxInputFromIntSize,
} from "../../util";

import { isUndefined } from "lodash";
import { t } from "../../i18next_wrapper";

export class McuInputBox extends React.Component<McuInputBoxProps, {}> {

  get key() { return this.props.setting; }

  get config() {
    return this.props.sourceFwConfig(this.key);
  }

  get value() {
    const v = this.config.value;
    const { filter } = this.props;
    const goodValue = !isUndefined(v) && !(filter && v > filter);
    return goodValue ? (v || 0).toString() : "";
  }

  get showValue() {
    return this.props.scale
      ? "" + parseInt(this.value) / this.props.scale
      : this.value;
  }

  get className() {
    const dim = !this.config.consistent ? "dim" : "";
    const gray = this.props.gray ? "gray" : "";
    return [dim, gray].join(" ");
  }

  clampInputAndWarn = (input: string, intSize: IntegerSize): number => {
    const result = clampUnsignedInteger(input, intSize);
    const max = intSize === "long" ? "2,000,000,000" : "32,000";
    switch (result.outcome) {
      case "ok":
        break;
      case "high":
        warning(t(`Maximum input is ${max}. Rounding down.`));
        break;
      case "low":
        warning(t("Must be a positive number. Rounding up to 0."));
        break;
      default:
        warning(t(`Please enter a number between 0 and ${max}`));
        throw new Error("Bad input in mcu_input_box. Impossible?");
    }
    return result.result;
  }

  commit = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const { value } = e.currentTarget;
    const scaledValue = this.props.scale
      ? "" + Math.round(parseFloat(value) * this.props.scale)
      : value;
    const actuallyDifferent = this.value !== scaledValue;
    if (actuallyDifferent) {
      const result = this.props.float
        ? Math.max(0, parseFloat(scaledValue))
        : this.clampInputAndWarn(scaledValue, this.props.intSize);
      this.props.dispatch(updateMCU(this.key, result.toString()));
    }
  }

  render() {
    return <BlurableInput
      type="number"
      className={this.className}
      value={this.showValue}
      onCommit={this.commit}
      min={0}
      max={getMaxInputFromIntSize(this.props.intSize)} />;
  }
}
