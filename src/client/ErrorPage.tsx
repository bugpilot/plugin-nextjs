"use client";
import { useEffect } from "react";

import { captureError } from "../capture-error";
import { NextError } from "../types";

import { useBugpilot } from "./Bugpilot";
import { FallbackDialog } from "./ui/FallbackDialog";

const isDevelopment = process.env.NODE_ENV === "development";

function ErrorPage({ error, reset }: { error: NextError; reset: () => void }) {
  const { saveBugReport } = useBugpilot();

  useEffect(() => {
    void captureError(error, { kind: "error-page" });
    saveBugReport({ triggerType: "error-page" });
  }, [error]);

  return <FallbackDialog reset={reset} />;
}

export const BugpilotErrorPage = isDevelopment ? undefined : ErrorPage;
