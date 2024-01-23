import {
  NextConfig,
  WebpackConfigContext,
} from "next/dist/server/config-shared";

import {
  BugpilotConfig,
  WebpackConfiguration,
  WebpackLoaderOptions,
} from "../types";

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
      return;
    }

    const commonOptions: Omit<WebpackLoaderOptions, "kind"> = {
      buildId,
      dev,
      nextRuntime,
      workspaceId: bugpilotConfig?.workspaceId,
      debug: bugpilotConfig?.debug,
    };

    // Wrap middleware
    newConfigWithRules.module.rules.unshift({
      test: /\/middleware.ts$/,
      use: [
        {
          loader: serverFunctionLoaderPath,
          options: {
            ...commonOptions,
            kind: "middleware",
          } as WebpackLoaderOptions,
        },
      ],
    });

    // Wrap server components
    newConfigWithRules.module.rules.unshift({
      test: /\.tsx$/,
      exclude:
        /\/(page|layout|error|global-error|not-found|middleware|route|template|default).tsx$/,
      use: [
        {
          loader: serverFunctionLoaderPath,
          options: {
            ...commonOptions,
            kind: "server-component",
          } as WebpackLoaderOptions,
        },
      ],
    });

    // Wrap Server Actions and Inline Server Actions
    newConfigWithRules.module.rules.unshift({
      test: /\.(ts|tsx)$/,
      exclude:
        /\/(layout|error|global-error|not-found|middleware|route|template|default|api\/).tsx?$/,
      include: /\/app\//,
      use: [
        {
          loader: serverFunctionLoaderPath,
          options: {
            ...commonOptions,
            kind: "server-action",
          } as WebpackLoaderOptions,
        },
      ],
    });

    // Wrap server pages
    newConfigWithRules.module.rules.unshift({
      test: /\/page.tsx$/,
      include: /\/app\//,
      use: [
        {
          loader: serverFunctionLoaderPath,
          options: {
            ...commonOptions,
            kind: "page-component",
          } as WebpackLoaderOptions,
        },
      ],
    });

    return newConfigWithRules;
  };
}
