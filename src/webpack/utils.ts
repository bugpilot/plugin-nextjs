import path from "path";

import { NodePath } from "@babel/core";
import * as t from "@babel/types";

import { BugpilotPluginError } from "../errors";
import { BugpilotBuildContext } from "../types";

export function getRelativePath(fullPath: string) {
  const root = process.cwd();
  const relativePath = path.relative(root, fullPath);
  return relativePath;
}

export function isClientComponent(source: string) {
  return source.includes("__next_internal_client_entry_do_not_use__");
}

export function isPageComponentFile(filePath: string) {
  // in the future add support for .ts, .js, .jsx
  const includePatternAppRouter = /(src\/app|app).*\/page\.tsx$/;
  const includePatternPagesRouter = /(src\/pages|pages).*\/.+\.tsx$/;
  return (
    includePatternAppRouter.test(filePath) ||
    includePatternPagesRouter.test(filePath)
  );
}

export function isServerComponentFile(filePath: string) {
  const includePattern = /\.tsx$/;
  const excludePatternPagesRouter =
    /((src\/pages|pages)\/)|(\/(_app|_document|_error|404|500)\.tsx$)/;
  const excludePatternAppRouter =
    /\/(page|layout|error|global-error|loading|not-found|middleware|route|template|default)\.tsx$/;

  if (
    includePattern.test(filePath) === true &&
    excludePatternAppRouter.test(filePath) === false &&
    excludePatternPagesRouter.test(filePath) === false
  ) {
    return true;
  }

  return false;
}

export function isMiddlewareFile(filePath: string) {
  const includePattern = /\/middleware.ts$/;

  return includePattern.test(filePath);
}

export function isRouteHandlerFile(filePath: string) {
  const includePattern = /(src\/app|app).*\/route\.ts$/;
  return includePattern.test(filePath);
}

export function isApiRouteFile(filePath: string) {
  const includePattern = /(src\/pages|pages).*\/api\/.+\.ts/;
  return includePattern.test(filePath);
}

export function getFunctionName(
  path: NodePath<t.FunctionDeclaration | t.ArrowFunctionExpression>,
) {
  let name: string | undefined = undefined;

  if (path.isFunctionDeclaration()) {
    name = path.node.id?.name;
  } else if (
    path.isArrowFunctionExpression() &&
    path.parentPath?.isVariableDeclarator() &&
    path.parentPath.node.id.type === "Identifier"
  ) {
    name = path.parentPath.node.id?.name;
  }

  return name === undefined ? "unknown" : name;
}

export function getKind(
  filePath: string,
  nodePath: NodePath,
): BugpilotBuildContext["kind"] {
  if (isPageComponentFile(filePath) && isReactElement(nodePath)) {
    return "page-component";
  } else if (isServerComponentFile(filePath) && isReactElement(nodePath)) {
    return "server-component";
  } else if (isServerAction(nodePath)) {
    return "server-action";
  } else if (isRouteHandlerFile(filePath)) {
    return "route-handler";
  } else if (isMiddlewareFile(filePath)) {
    return "middleware";
  } else if (isApiRouteFile(filePath)) {
    return "api-route";
  }

  return "function";
}

// function containsServerActions(source: string) {
//   return source.includes("createActionProxy");
// }
/**
 * Returns true if node is exported (named, not default), async, function or arrow function.
 * Important: Additionally we check if the "use server" directive is used.
 * i.e export async function myServerAction() {} or export const myServerAction = async () => {}
 */
function isServerAction(nodePath: NodePath) {
  const isDeclaration =
    nodePath.isFunctionDeclaration() &&
    nodePath.node.async === true &&
    nodePath.parentPath?.isExportNamedDeclaration();

  const isArrowFunction =
    nodePath.isArrowFunctionExpression() &&
    nodePath.node.async === true &&
    nodePath.parentPath?.isVariableDeclarator() &&
    nodePath.parentPath?.parentPath?.isVariableDeclaration() &&
    nodePath.parentPath?.parentPath?.parentPath?.isExportNamedDeclaration();

  return (
    (isDeclaration || isArrowFunction) &&
    isReturningJSXElement(nodePath) === false
  );
}

/**
 * Wraps FunctionDeclaration or ArrowFunctionExpression with a function call with context.
 */
export function wrapWithFunction(
  path: NodePath<t.Node>,
  wrapFunctionName: string,
  context: BugpilotBuildContext,
) {
  // create a node from the options object
  const optionsExpression = t.objectExpression(
    Object.entries(context).map(([key, value]) => {
      const literalValue =
        typeof value === "string"
          ? t.stringLiteral(value)
          : typeof value === "boolean"
            ? t.booleanLiteral(value)
            : typeof value === "number"
              ? t.numericLiteral(value)
              : t.nullLiteral();

      return t.objectProperty(t.identifier(key), literalValue);
    }),
  );

  if (path.isArrowFunctionExpression()) {
    return wrapArrowFunction(path, wrapFunctionName, optionsExpression);
  } else if (path.isFunctionDeclaration()) {
    return wrapFunctionDeclaration(path, wrapFunctionName, optionsExpression);
  } else {
    throw new BugpilotPluginError(
      "wrapWithFunction(): Unsupported node type. Only arrow functions and function declarations are supported.",
    );
  }
}

/**
 * IMPORTANT: We don't check for React class components.
 * Return true if node is a function declaration (function MyReactComponent) or arrow function (()=>{}) and returns jsx.
 * @param {Path} path
 * @returns {boolean}
 */
function isReactElement(path: NodePath) {
  let isReactElement = false;
  if (path.isFunctionDeclaration() || path.isArrowFunctionExpression()) {
    isReactElement = isReturningJSXElement(path);
  }

  return isReactElement;
}

/**
 * Helper function that returns true if node returns a JSX element.
 * @param {Path} path
 * @returns {boolean}
 */
function isReturningJSXElement(path: NodePath) {
  let foundJSX = false;

  path.traverse({
    CallExpression(callPath: NodePath<t.CallExpression>) {
      if (foundJSX) {
        return;
      }

      const calleePath = callPath.get("callee");
      if (
        t.isIdentifier(calleePath.node) &&
        (calleePath.node.name === "_jsx" || calleePath.node.name === "_jsxs")
      ) {
        foundJSX = true;
        path.skip();
      }
    },
  });

  return foundJSX;
}

function wrapArrowFunction(
  path: NodePath,
  wrapFunctionName: string,
  optionsNode,
) {
  return path.replaceWith(
    t.callExpression(t.identifier(wrapFunctionName), [path.node, optionsNode]),
  );
}

function wrapFunctionDeclaration(
  path: NodePath<t.FunctionDeclaration>,
  wrapFunctionName: string,
  argumentsExpression: t.ObjectExpression,
) {
  const expression = t.functionExpression(
    null,
    path.node.params,
    path.node.body,
    path.node.generator,
    path.node.async,
  );

  if (path.node.id == null) {
    throw new BugpilotPluginError(
      "Internal error. FunctionDeclaration has no id.",
    );
  }

  const originalFunctionIdentifier = t.identifier(path.node.id.name);
  const wrappedFunction = t.variableDeclaration("var", [
    t.variableDeclarator(
      originalFunctionIdentifier,
      t.callExpression(t.identifier(wrapFunctionName), [
        expression,
        argumentsExpression,
      ]),
    ),
  ]);

  if (path?.parentPath?.isExportDefaultDeclaration()) {
    path.parentPath.replaceWithMultiple([
      wrappedFunction,
      t.exportDefaultDeclaration(originalFunctionIdentifier),
    ]);
  } else {
    path.replaceWith(wrappedFunction);
  }
}
