import { PHASE_PRODUCTION_BUILD } from "next/constants";

import packageJson from "../package.json";

import { getSession } from "./get-session-context";
import logger from "./logger";
import {
  BugpilotBuildContext,
  BugpilotContext,
  ErrorEndpointPayload,
  NextError,
} from "./types";

const ERROR_ENDPOINT = "https://events-error.bugpilot.io/error";

export async function captureError(error: NextError, context: BugpilotContext) {
  if (context.debug === true) {
    logger.setDebug(true);
  }

  if (
    isNextNotFound(error) ||
    isNextRedirect(error) ||
    isNextProductionBuildPhase()
  ) {
    logger.debug(
      "captureError(): this is a 404 or redirect error or a production build phase, it will not be sent to Bugpilot.",
    );
    return;
  }

  if (
    error.digest &&
    error.message?.includes(
      "The specific message is omitted in production builds to avoid leaking sensitive details.",
    )
  ) {
    logger.debug(
      "captureError(): this is a client error with a digest property, it will not be sent to Bugpilot because we likely already have it reported.",
    );
    return;
  }

  try {
    const session = getSession();

    const buildContext = (context as BugpilotBuildContext).buildId
      ? (context as BugpilotBuildContext)
      : null; // in this case it's a client context with only kind and debug

    if (session === null) {
      logger.debug(
        "captureError(): session is null, cannot report error. Error likely to be occurred on the first page load of a new user session.",
      );
      return;
    }

    const body: ErrorEndpointPayload = {
      kind: context.kind,
      error: {
        type: "error-click",
        jsErrors: [
          {
            message: error.message,
            stack: error.stack,
            name: error.name,
            digest: error.digest,
            filePath: buildContext?.filePath ?? null,
            functionName: buildContext?.functionName ?? null,
          },
        ],
      },
      build: buildContext?.buildId,
      nextRuntime: buildContext?.nextRuntime,
      workspaceId: buildContext?.workspaceId || session.workspaceId,
      userId: session.anonymousId,
      reportId: session.reportId,
      url: session.url,
      timestamp: Date.now(),
    };

    logger.debug("captureError(): reporting error", JSON.stringify(body, null));

    const isDevelopment =
      buildContext?.dev ||
      session.url?.includes("localhost") ||
      session.url?.includes("127.0.0.1");

    if (isDevelopment === true) {
      logger.info(
        "captureError(): errors are not captured in while running in development mode, or on localhost.",
      );
      return;
    }

    const response = await fetch(ERROR_ENDPOINT, {
      method: "POST",
      headers: {
        Origin: session.origin,
        "Content-Type": "application/json",
        "User-Agent": "Bugpilot/Next.js v" + packageJson.version,
        "X-Dev-Mode": "0",
      },
      body: JSON.stringify(body),
    });

    const resultText = await response.text();

    if (response.ok === true) {
      logger.debug("captureError(): error sent successfully");
      return;
    } else {
      logger.debug("captureError(): upstream error", resultText);
    }
  } catch (error) {
    logger.debug("captureError(): error failed to send", error);
  }
}

function isNextNotFound(error: NextError) {
  return error.digest === "NEXT_NOT_FOUND";
}

function isNextRedirect(error: NextError) {
  return error.digest?.startsWith("NEXT_REDIRECT;");
}

function isNextProductionBuildPhase() {
  return process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;
}
