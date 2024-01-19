import logger from "../logger";

const BUGPILOT_CHECK_INTERVAL_MS = 1.5 * 1000;
const BUGPILOT_CHECK_MAX_ATTEMPTS = 3;
const BUGPILOT_HOST = "https://script.bugpilot.io";
const BUGPILOT_SCRIPT_FILENAME = "adopto.js";
// this value is replaced by the post-build script
const BUGPILOT_VERSION = "BUGPILOT_VERSION_VALUE";

export const waitUntilBugpilotAvailable = (cb: () => void, attempts_ = 0) => {
  if (typeof window === "undefined") {
    return;
  }

  if (attempts_ >= BUGPILOT_CHECK_MAX_ATTEMPTS) {
    logger.warn(
      `Bugpilot not available after ${attempts_} attempts. Giving up.`,
    );
    return;
  }

  if (!window.Bugpilot) {
    logger.debug(
      `Bugpilot not available yet. Waiting ${BUGPILOT_CHECK_INTERVAL_MS}ms...`,
    );

    setTimeout(
      () => waitUntilBugpilotAvailable(cb, attempts_ + 1),
      BUGPILOT_CHECK_INTERVAL_MS,
    );

    return;
  }

  cb();
};

export const makeScriptUrl = (workspaceId: string) => {
  const url = new URL(BUGPILOT_HOST);
  url.pathname = `${workspaceId}/${BUGPILOT_SCRIPT_FILENAME}`;
  url.searchParams.set("source", "bugpilot-next");
  url.searchParams.set("packageVersion", BUGPILOT_VERSION);
  return url.toString();
};
