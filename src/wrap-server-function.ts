import { captureError } from "./capture-error";
import { BugpilotBuildContext, NextError } from "./types";

type UnknownFunctionType = (...args: unknown[]) => unknown | Promise<unknown>;
type ArgsType = unknown[];

export function wrapServerFunction(
  fun: UnknownFunctionType,
  buildContext: BugpilotBuildContext,
) {
  return new Proxy(fun, {
    apply: (
      originalFunction: UnknownFunctionType,
      thisArg: unknown,
      args: ArgsType,
    ) => {
      try {
        // Call the original function with its 'this' and arguments.
        const result: unknown | Promise<unknown> = originalFunction.apply(
          thisArg,
          args,
        );

        // If the result is a Promise, catch its rejections and
        // capture the reason.
        if (result instanceof Promise) {
          // Do not return the result of this expression, you must
          // return the original promise, instead.
          Promise.resolve(result).catch((e) => {
            const err = e as NextError;
            void captureError(err, buildContext);
          });
        }

        // Return the original function result (or Promise), so the
        // caller can await or .then()/.catch()
        return result;
      } catch (e) {
        // Captures synchronous invokation errors (e.g., if the original function
        // is not async)
        const err = e as NextError;
        void captureError(err, buildContext);

        // Rethrow the error so the caller can handle it as usual with a try-catch
        throw err;
      }
    },
  });
}
