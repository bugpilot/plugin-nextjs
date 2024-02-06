import { NodePath } from "@babel/core";
import generate from "@babel/generator";
import * as babelParser from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { LoaderContext } from "webpack";

import logger from "../../logger";
import { BugpilotBuildContext, WebpackLoaderOptions } from "../../types";
import {
  containsServerActions,
  getRelativePath,
  isClientComponent,
  isMiddleware,
  isPageComponent,
  isReactElement,
  isServerAction,
  isServerComponent,
  wrapWithFunction,
} from "../utils";

export default function serverFunctionLoader(
  this: LoaderContext<WebpackLoaderOptions>,
  source: string,
) {
  if (isClientComponent(source)) {
    return source;
  }

  const resourcePath = this.resourcePath;
  const options = this.getOptions() as WebpackLoaderOptions;

  const ast = babelParser.parse(source, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

  let shouldAddImport = true;
  let wasWrapped = false;

  traverse(ast, {
    enter(path: NodePath<t.Node>) {
      if (path.isImportDeclaration()) {
        const importPath = path.node.source.value;
        if (importPath === "@bugpilot/plugin-nextjs") {
          shouldAddImport = false;
        }
      }

      if (!path.isFunctionDeclaration() && !path.isArrowFunctionExpression()) {
        return;
      }

      // check if it's exported
      // if (
      //   !path.parentPath?.isExportNamedDeclaration() &&
      //   !path.parentPath?.isExportDefaultDeclaration()
      // ) {
      //   return;
      // }

      // but can also be exported as a variable at the bottom of the file i.e export default Page; or export { Page }

      // isReactElement(){
      // kind: isPageFile(resourePath) ? "page-component" : "server-component";
      //  wrapWithFunction(path, "wrapServerFunction", buildContext);
      // }

      // middleware, route handler, server-action, api handler, other db functions.
      if (isMiddleware(path)) {
        buildContext.kind = "middleware";
      }

      // @ts-expect-error the property id exists even if it's not in the type definition
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const functionName: string = path.isFunctionDeclaration()
        ? path.node.id?.name
        : path.parentPath?.isVariableDeclarator() &&
            path.parentPath.node.id.type === "Identifier"
          ? path.parentPath.node.id?.name
          : "unknown";

      const buildContext: BugpilotBuildContext = {
        buildId: options.buildId,
        dev: options.dev,
        nextRuntime: options.nextRuntime,
        filePath: getRelativePath(resourcePath),
        kind: options.kind,
        workspaceId: options.workspaceId,
        debug: options.debug,
        functionName,
      };

      let shouldWrap = false;

      if (isPageComponent(resourcePath, path)) {
        buildContext.kind = "page-component";
        shouldWrap = true;
      }

      if (isServerComponent(resourcePath, path)) {
        buildContext.kind = "server-component";
        shouldWrap = true;
      }

      // TODO: inline server actions have names like $$ACTION_0, $$ACTION_1, etc.
      // we should set a human readable name
      if (containsServerActions(source) && isServerAction(resourcePath, path)) {
        buildContext.kind === "server-action";
        shouldWrap = true;
      }

      if (buildContext.kind === "middleware" && isMiddleware(path)) {
        shouldWrap = true;
      }

      // if (buildContext.kind === "page-component" && isReactElement(path)) {
      //   shouldWrap = true;
      // }

      // if (buildContext.kind === "server-component" && isReactElement(path)) {
      //   shouldWrap = true;
      // }

      // if (
      //   buildContext.kind === "server-action" &&
      //   containsServerActions(source) && // TODO: refactor, remove or move to top
      //   isServerAction(path)
      // ) {
      //   // TODO: inline server actions have names like $$ACTION_0, $$ACTION_1, etc.
      //   // we should set a human readable name
      //   shouldWrap = true;
      // }

      // if (buildContext.kind === "middleware" && isMiddleware(path)) {
      //   shouldWrap = true;
      // }

      if (!shouldWrap) {
        return;
      }

      wasWrapped = true;
      wrapWithFunction(path, "wrapServerFunction", buildContext);
      path.skip();

      logger.debug(
        `Wrapped ${buildContext.kind} ${buildContext.filePath}:${buildContext.functionName}`,
      );
    },
  });

  if (shouldAddImport && wasWrapped) {
    const bugpilotImports = t.importDeclaration(
      [
        t.importSpecifier(
          t.identifier("wrapServerFunction"),
          t.identifier("wrapServerFunction"),
        ),
      ],
      t.stringLiteral("@bugpilot/plugin-nextjs"),
    );

    // create BuildContext object

    ast.program.body.unshift(bugpilotImports);
  }

  const output = generate(ast) as { code: string };
  return output.code;
}
