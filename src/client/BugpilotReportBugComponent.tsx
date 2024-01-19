"use client";
import { Button } from "./ui/Button";

export function BugpilotReportBugComponent({
  style,
  className,
  children,
}: {
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Button
      variant="default"
      size="sm"
      onClick={() => {}}
      style={style}
      className={[className, "bug-report-button"].join(" ")}
    >
      {children}
    </Button>
  );
}
