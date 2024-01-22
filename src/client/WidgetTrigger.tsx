"use client";

import { isValidElement, cloneElement, Children } from "react";

import logger from "../logger";

type WidgetTriggerProps = {
  children: React.ReactElement[];
};

type ValidTriggerElementTypes =
  | HTMLDivElement
  | HTMLAnchorElement
  | HTMLButtonElement
  | HTMLSpanElement;

export const WidgetTrigger = ({ children }: WidgetTriggerProps) => {
  // This component wraps a developer-provided component that's used to render
  // the widget trigger (e.g. a button or link).
  // It's responsible for adding the `bug-report-button` className to the child.

  if (children == null || children.length === 0) {
    logger.error(
      "Missing or invalid children prop on <WidgetTrigger />. Component expects a single child.",
    );
    return null;
  }

  const childrenWithClassName = Children.map(children, (child) => {
    if (isValidElement<ValidTriggerElementTypes>(child)) {
      return cloneElement(child, {
        className: `${child.props.className || ""} bug-report-button`,
      });
    }

    return child;
  });

  return childrenWithClassName;
};
