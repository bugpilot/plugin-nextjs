"use client";
import { useEffect } from "react";

import { captureError } from "../capture-error";
import { NextError } from "../types";

import { useBugpilot } from "./Bugpilot";
import { FallbackDialog } from "./ui/FallbackDialog";

const isDevelopment = process.env.NODE_ENV === "development";

function GlobalErrorPage({
  error,
  reset,
}: {
  error: NextError;
  reset: () => void;
}) {
  const { saveBugReport } = useBugpilot();

  useEffect(() => {
    void captureError(error, { kind: "global-error-page" });
    saveBugReport({ triggerType: "global-error-page" });
  }, [error]);

  return (
    <html>
      <body>
        <FallbackDialog reset={reset} />
      </body>
    </html>
  );
}

export const BugpilotGlobalErrorPage = isDevelopment
  ? undefined
  : GlobalErrorPage;
