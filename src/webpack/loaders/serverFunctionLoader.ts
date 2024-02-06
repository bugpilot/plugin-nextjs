import { NodePath } from "@babel/core";
import generate from "@babel/generator";
import * as babelParser from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { LoaderContext } from "webpack";

import logger from "../../logger";
import { BugpilotBuildContext, WebpackLoaderOptions } from "../../types";
import {
  getFunctionName,
  getKind,
  getRelativePath,
  isClientComponent,
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

      const buildContext: BugpilotBuildContext = {
        buildId: options.buildId,
        dev: options.dev,
        nextRuntime: options.nextRuntime,
        filePath: getRelativePath(resourcePath),
        workspaceId: options.workspaceId,
        debug: options.debug,
        kind: getKind(resourcePath, path),
        functionName: getFunctionName(path),
      };

      wrapWithFunction(path, "wrapServerFunction", buildContext);
      wasWrapped = true;
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

    ast.program.body.unshift(bugpilotImports);
  }

  const output = generate(ast) as { code: string };

  console.log(resourcePath, output.code);
  return output.code;
}
