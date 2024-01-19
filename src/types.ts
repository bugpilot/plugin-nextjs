export type BugpilotSession = {
  anonymousId: string;
  origin: string;
  reportId: string;
  url: string;
  workspaceId: string;
};

export type BugpilotBuildContext = {
  // if you include value types other than string | boolean | number | null,
  // please update wrapWithFunction() in src/webpack/utils.ts
  buildId: string;
  debug?: boolean;
  dev: boolean;
  filePath: string;
  functionName: string;
  kind: "page-component" | "server-component" | "server-action" | "middleware";
  nextRuntime?: string;
  workspaceId: string;
};

export type BugpilotClientContext = {
  debug?: string;
  kind: "global-error-page" | "error-page";
};

export type WebpackLoaderOptions = Omit<
  BugpilotBuildContext,
  "filePath" | "functionName"
>;

export type BugpilotContext = BugpilotBuildContext | BugpilotClientContext;

export type BugpilotConfig = {
  debug?: boolean;
  workspaceId: string;
  next?: {
    productionBrowserSourceMaps?: boolean;
  };
};
export type NextError = Error & { digest?: string };

export type WebpackConfiguration = {
  // Sorry, type definitions imported from 'webpack' cannot be used here
  // and throw an unknown error.
  module?: {
    rules?: unknown[];
  };
};

export type ErrorEndpointPayload = {
  kind: string;
  error: {
    type: string;
    jsErrors: {
      name: string;
      message: string;
      stack?: string;
      digest?: string;
      filePath?: string | null;
      functionName?: string | null;
    }[];
  };
  build?: string;
  nextRuntime?: string;
  workspaceId: string;
  userId: string;
  reportId: string;
  url: string;
  timestamp: number;
};
