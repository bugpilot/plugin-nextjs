import {
  NextConfig,
  WebpackConfigContext,
} from "next/dist/server/config-shared";

import {
  BugpilotConfig,
  WebpackConfiguration,
  WebpackLoaderOptions,
} from "../types";

import {
  isApiRouteFile,
  isMiddlewareFile,
  isPageComponentFile,
  isRouteHandlerFile,
  isServerComponentFile,
} from "./utils";

const serverFunctionLoaderPath = __dirname + "/loaders/serverFunctionLoader.js";

export function webpackConfigFnFactory(
  originalNextConfig: NextConfig,
  bugpilotConfig: BugpilotConfig,
) {
  return function (
    config: WebpackConfiguration,
    context: WebpackConfigContext,
  ) {
    let newConfig = { ...config };

    // if the user has a custom webpack config in their next.config.js, we run it
    if (typeof originalNextConfig.webpack === "function") {
      newConfig = originalNextConfig.webpack(
        config,
        context,
      ) as WebpackConfiguration;
    }

    const newConfigWithRules = {
      ...newConfig,
      module: {
        ...newConfig.module,
        // Note: rules is optional in WebpackConfiguration
        rules: [...(newConfig.module?.rules || [])],
      },
    };

    const { buildId, dev, isServer, nextRuntime } = context;

    if (!isServer) {
      // We don't wrap client code for performance reasons,
      // client errors are still bubbled up to the closes error
      // boundary (or error.tsx) and reported to Bugpilot.
      return newConfigWithRules;
    }

    const commonOptions: Omit<WebpackLoaderOptions, "kind"> = {
      buildId,
      dev,
      nextRuntime,
      workspaceId: bugpilotConfig?.workspaceId,
      debug: bugpilotConfig?.debug,
    };

    // New Wrap
    newConfigWithRules.module.rules.unshift({
      test: (filePath) =>
        isPageComponentFile(filePath) ||
        isServerComponentFile(filePath) ||
        isRouteHandlerFile(filePath) ||
        isMiddlewareFile(filePath) ||
        isApiRouteFile(filePath),
      use: [
        {
          loader: serverFunctionLoaderPath,
          options: commonOptions,
        },
      ],
    });

    return newConfigWithRules;
  };
}
