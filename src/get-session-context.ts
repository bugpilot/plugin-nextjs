import { headers, cookies } from "next/headers";

import logger from "./logger";
import { BugpilotSession } from "./types";

const REPORTID_COOKIE_NAME = "com.bugpilot.report.id";
const ANONYMOUSID_COOKIE_NAME = "com.bugpilot.user.anonymousid";

function getBrowserCookie(name: string) {
  if (typeof document === "undefined") {
    throw new Error("This method is for client-side use only");
  }

  const cookie = `; ${document.cookie}`;
  const parts = cookie.split(`; ${name}=`);

  if (parts.length !== 2) {
    return null;
  }

  return parts.pop()?.split(";").shift() ?? "";
}

function getClientContext() {
  const workspaceIdReportId = getBrowserCookie(REPORTID_COOKIE_NAME);
  const [workspaceId, reportId] = workspaceIdReportId?.split(":") ?? [];

  if (!workspaceId || !reportId) {
    return null;
  }

  const anonymousId = getBrowserCookie(ANONYMOUSID_COOKIE_NAME);

  if (!anonymousId) {
    return null;
  }

  const context = {
    anonymousId,
    origin: window.location.origin,
    reportId: String(reportId),
    url: window.location.href,
    workspaceId: workspaceId,
  };

  return context;
}

function getServerContext() {
  const workspaceIdReportId = cookies()
    .get("com.bugpilot.report.id")
    ?.value.split(":");

  const [workspaceId, reportId] = workspaceIdReportId ?? [];

  if (!workspaceId || !reportId) {
    return null;
  }

  const anonymousId = cookies().get(ANONYMOUSID_COOKIE_NAME)?.value;

  if (!anonymousId) {
    return null;
  }

  const context = {
    anonymousId,
    origin: headers().get("origin") || "https://invalid.tld/",
    reportId: reportId,
    url: headers().get("referer") || "https://invalid.tld/",
    workspaceId: workspaceId,
  };

  return context;
}

export function getSession(): BugpilotSession | null {
  try {
    if (typeof window === "undefined") {
      return getServerContext();
    } else {
      return getClientContext();
    }
  } catch (err) {
    logger.debug(
      "getSession(): error while getting session context, this error cannot be reported",
      err,
    );

    return null;
  }
}
