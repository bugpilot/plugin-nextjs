import { NextConfig } from "next/types";

import { BugpilotPluginError } from "./errors";
import logger from "./logger";
import { BugpilotConfig } from "./types";
import { webpackConfigFnFactory } from "./webpack/webpack";

export function withBugpilot(
  originalNextConfig: NextConfig,
  config: BugpilotConfig,
) {
  if (!config) {
    throw new BugpilotPluginError(
      "Missing required argument `config` in withBugpilot(). Check next.config.js.",
    );
  }

  try {
    if (config.debug) {
      logger.setDebug(true);
      logger.debug("Debug mode enabled.");
    }

    if (!config.workspaceId) {
      throw new BugpilotPluginError(
        "Missing required property `workspaceId` in bugpilot.config.js.",
      );
    }

    if (process.env.NODE_ENV !== "production") {
      logger.info("Disabled in development.");
      return originalNextConfig;
    }

    const bugpilotNextConfig = config.next || {};
    const webpackConfigFn = webpackConfigFnFactory(config);

    return {
      ...originalNextConfig,
      ...bugpilotNextConfig,
      webpack: webpackConfigFn,
    };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "MODULE_NOT_FOUND") {
      logger.error("Cannot load bugpilot.config.js: file not found.");
      throw e;
    }

    if (e instanceof BugpilotPluginError) {
      // BugpilotPluginError is a known error with a user-friendly message,
      // so we don't need log it as "unexpected".
      throw e;
    }

    logger.error("withBugpilot() unexpected error:", (e as Error).message);
    throw e;
  }
}
