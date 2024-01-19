import { captureError } from "./capture-error";
import { BugpilotBuildContext, NextError } from "./types";

export function wrapServerFunction(
  fun: (...args: unknown[]) => unknown | Promise<unknown>,
  buildContext: BugpilotBuildContext,
) {
  const bugpilotWrappedFunction = async (...args: unknown[]) => {
    try {
      const result: unknown = await fun(...args);
      return result;
    } catch (e) {
      const err = e as NextError;

      await captureError(err, buildContext);
      throw err;
    }
  };

  return bugpilotWrappedFunction;
}
