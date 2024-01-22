import logger from "../logger";
import { GlobalBugpilot } from "../types";

const BUGPILOT_CHECK_INTERVAL_MS = 1.5 * 1000;
const BUGPILOT_CHECK_MAX_ATTEMPTS = 3;

export const waitForBugpilot = (
  cb: (bugpilot: GlobalBugpilot) => void,
  attempts_ = 0,
) => {
  if (typeof window === "undefined") {
    return;
  }

  if (attempts_ >= BUGPILOT_CHECK_MAX_ATTEMPTS) {
    logger.debug(
      `window.Bugpilot not available after ${attempts_} attempts. Giving up.`,
    );
    return;
  }

  if (!window.Bugpilot) {
    setTimeout(
      () => waitForBugpilot(cb, attempts_ + 1),
      BUGPILOT_CHECK_INTERVAL_MS,
    );

    return;
  }

  cb(window.Bugpilot);
};
