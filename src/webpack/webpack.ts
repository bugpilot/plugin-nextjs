import { WebpackConfigContext } from "next/dist/server/config-shared";

import {
  BugpilotConfig,
  WebpackConfiguration,
  WebpackLoaderOptions,
} from "../types";

const serverFunctionLoaderPath = __dirname + "/loaders/serverFunctionLoader.js";

export function webpackConfigFnFactory(bugpilotConfig: BugpilotConfig) {
  return function (
    config: WebpackConfiguration,
    { buildId, dev, isServer, nextRuntime }: WebpackConfigContext,
  ) {
    const configWithRules = {
      ...config,
      module: {
        ...config.module,
        // Note: rules is optional in WebpackConfiguration
        rules: [...(config.module?.rules || [])],
      },
    };

    const commonOptions: Omit<WebpackLoaderOptions, "kind"> = {
      buildId,
      dev,
      nextRuntime,
      workspaceId: bugpilotConfig?.workspaceId,
      debug: bugpilotConfig?.debug,
    };

    if (isServer === true) {
      // Wrap middleware
      configWithRules.module.rules.unshift({
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
      configWithRules.module.rules.unshift({
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
      configWithRules.module.rules.unshift({
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
      configWithRules.module.rules.unshift({
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
    }

    return configWithRules;
  };
}
