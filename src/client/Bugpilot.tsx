"use client";

import { useEffect } from "react";

import logger from "../logger";
import { BugpilotProps } from "../types";

import { waitForBugpilot } from "./utils";

const BUGPILOT_HOST = "https://script.bugpilot.io";
const BUGPILOT_SCRIPT_FILENAME = "adopto.js";
const BUGPILOT_VERSION = "BUGPILOT_VERSION_VALUE"; // this value is replaced by the post-build script

export const makeScriptUrl = (workspaceId: string) => {
  const url = new URL(BUGPILOT_HOST);
  url.pathname = `${workspaceId}/${BUGPILOT_SCRIPT_FILENAME}`;
  url.searchParams.set("source", "bugpilot-next");
  url.searchParams.set("packageVersion", BUGPILOT_VERSION);
  return url.toString();
};

export const Bugpilot = ({ workspaceId, user }: BugpilotProps) => {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!workspaceId) {
      logger.error(
        "Missing workspaceId prop on <Bugpilot />. Please provide a `workspaceId` prop.",
      );
      return;
    }

    if (window.document.querySelector("#bugpilot-script")) {
      logger.debug(
        "Bugpilot script already loaded.",
        process.env.NODE_ENV === "development"
          ? "This is expected in dev mode because all effects run twice."
          : "",
      );
      return;
    }

    const src = makeScriptUrl(workspaceId);
    logger.debug("Loading Bugpilot script from URL", src);

    const script = window.document.createElement("script");
    script.id = "bugpilot-script";
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      logger.error(
        "Bugpilot client script failed to load, check for ad blockers and network connectivity.",
      );
    };
    script.onload = () => {
      logger.debug("Bugpilot client script loaded.");
    };
    window.document.body.appendChild(script);
  }, []);

  useEffect(() => {
    waitForBugpilot((bugpilot) => {
      if (!user) {
        return;
      }

      try {
        bugpilot.identify(user);
      } catch (e) {
        logger.error("Failed to call bugpilot.identify()", e);
      }
    });
  }, [user]);

  return null;
};
