import { NextConfig } from "next/types";

import { BugpilotPluginError } from "./errors";
import logger from "./logger";
import { BugpilotConfig } from "./types";
import { webpackConfigFnFactory } from "./webpack/webpack";

export function withBugpilot(
  originalNextConfig:
    | NextConfig
    | ((...args: unknown[]) => NextConfig)
    | ((...args: unknown[]) => Promise<NextConfig>),
  bugpilotConfig: BugpilotConfig,
) {
  if (!bugpilotConfig) {
    throw new BugpilotPluginError(
      "Missing required argument `bugpilotConfig` in withBugpilot(). Check next.config.js.",
    );
  }

  if (!bugpilotConfig.workspaceId) {
    throw new BugpilotPluginError(
      "Missing required property `workspaceId` in bugpilot.config.js.",
    );
  }

  try {
    if (bugpilotConfig.debug) {
      logger.setDebug(true);
      logger.debug("Debug mode enabled.");
    }

    if (process.env.NODE_ENV !== "production") {
      logger.info("Disabled in development.");
      return originalNextConfig;
    }

    // NextConfig can be a function, async function or object.
    if (typeof originalNextConfig === "function") {
      return function (this: unknown, ...args: unknown[]) {
        const maybeUserNextConfig = originalNextConfig.apply(this, args);

        if (maybeUserNextConfig instanceof Promise) {
          return maybeUserNextConfig.then((userNextConfig: NextConfig) => {
            return getFinalNextjsConfig({
              bugpilotConfig,
              userNextConfig,
            });
          });
        } else {
          return getFinalNextjsConfig({
            bugpilotConfig,
            userNextConfig: maybeUserNextConfig,
          });
        }
      };
    } else {
      return getFinalNextjsConfig({
        bugpilotConfig,
        userNextConfig: originalNextConfig,
      });
    }
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

function getFinalNextjsConfig({
  bugpilotConfig,
  userNextConfig,
}: {
  bugpilotConfig: BugpilotConfig;
  userNextConfig: NextConfig;
}) {
  const bugpilotNextConfig = bugpilotConfig.next || {};
  const webpackConfigFn = webpackConfigFnFactory(
    userNextConfig,
    bugpilotConfig,
  );

  return {
    ...userNextConfig,
    ...bugpilotNextConfig,
    webpack: webpackConfigFn,
  };
}
