import React, { useState } from "react";

import { Button } from "./Button";

type FallbackDialogProps = {
  reset: () => void;
  title?: string;
  description?: string;
  successMessage?: string;
};

export function FallbackDialog({
  reset,
  title = "OOPS! SOMETHING WENT WRONG",
  description = "We have encountered an unexpected error. Please try again.",
}: FallbackDialogProps) {
  const [status, setStatus] = useState("default");

  function onCloseClick() {
    setStatus("closed");
  }

  function onResetClick() {
    reset?.();
  }

  return status === "closed" ? null : (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backdropFilter: "blur(4px)",
        display: "flex",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 999999999,
      }}
    >
      <div
        style={{
          margin: "auto",
          marginTop: "8%",
          maxWidth: "640px",
          width: "100%",
          padding: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: "0.375rem",
            borderTop: "4px solid",
            borderTopColor: "rgb(220 38 38)",
            backgroundColor: "#ffff",
            padding: "2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "1rem",
            }}
            id="bugpilot-report-issue"
          >
            <p
              style={{
                flexGrow: 1,
                color: "rgb(220 38 38)",
                fontSize: "0.875rem",
                lineHeight: "1.25rem",
              }}
            >
              Error
            </p>
            <Button
              onClick={onCloseClick}
              style={{ marginLeft: "auto" }}
              size="icon"
            >
              <XIcon style={{ height: "1rem", width: "1rem", color: "#111" }} />
            </Button>
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              lineHeight: "2rem",
              fontWeight: 600,
              marginTop: "1rem",
              color: "#111",
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: "1.125rem",
              lineHeight: "1.75rem",
              marginTop: "0.5rem",
              color: "rgb(220 38 38)",
            }}
          >
            {description}
          </p>

          {status === "default" && (
            <div
              style={{
                marginTop: "1.5rem",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <Button onClick={onResetClick}>
                <RefreshIcon
                  style={{
                    width: "1rem",
                    height: "1rem",
                    marginRight: "0.5rem",
                  }}
                />
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RefreshIcon({ style }: { style?: {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function XIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
