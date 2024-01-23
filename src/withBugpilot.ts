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
      logger.info(
        "Bugpilot only works in production. To test it, run: `npm run build && npm run start` on your local machine.",
      );
      return originalNextConfig;
    }

    // Next supports functions, async functions and object as next.config
    if (typeof originalNextConfig === "function") {
      const configFn = (...args: unknown[]) => {
        const configOrPromise = originalNextConfig(...args);

        if (configOrPromise instanceof Promise) {
          return configOrPromise.then((nextConfig: NextConfig) => {
            return mergeNextConfig({
              bugpilotConfig,
              nextConfig,
            });
          });
        }

        return mergeNextConfig({
          bugpilotConfig,
          nextConfig: configOrPromise,
        });
      };

      return configFn;
    } else {
      return mergeNextConfig({
        bugpilotConfig,
        nextConfig: originalNextConfig,
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

function mergeNextConfig({
  bugpilotConfig,
  nextConfig,
}: {
  bugpilotConfig: BugpilotConfig;
  nextConfig: NextConfig;
}) {
  const bugpilotNextConfig = bugpilotConfig.next || {};
  const webpackConfigFn = webpackConfigFnFactory(nextConfig, bugpilotConfig);

  return {
    ...nextConfig,
    ...bugpilotNextConfig,
    webpack: webpackConfigFn,
  };
}
