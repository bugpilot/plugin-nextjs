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

export function containsServerActions(source: string) {
  return source.includes("createActionProxy");
}

/**
 * IMPORTANT: We don't check for React class components.
 * Return true if node is a function declaration (function MyReactComponent) or arrow function (()=>{}) and returns jsx.
 * @param {Path} path
 * @returns {boolean}
 */
export function isReactElement(path: NodePath) {
  let isReactElement = false;
  if (path.isFunctionDeclaration() || path.isArrowFunctionExpression()) {
    isReactElement = isReturningJSXElement(path);
  }

  return isReactElement;
}

/**
 * Returns true if node is exported (named, not default), async, function or arrow function.
 * Important: Additionally we check if the "use server" directive is used.
 * i.e export async function myServerAction() {} or export const myServerAction = async () => {}
 */
export function isServerAction(path: NodePath) {
  const isDeclaration =
    path.isFunctionDeclaration() &&
    path.node.async === true &&
    path.parentPath?.isExportNamedDeclaration();

  const isArrowFunction =
    path.isArrowFunctionExpression() &&
    path.node.async === true &&
    path.parentPath?.isVariableDeclarator() &&
    path.parentPath?.parentPath?.isVariableDeclaration() &&
    path.parentPath?.parentPath?.parentPath?.isExportNamedDeclaration();

  return (
    (isDeclaration || isArrowFunction) && isReturningJSXElement(path) === false
  );
}

/**
 * Returns true if node is exported (named, not default), function declaration and has the name "middleware".
 */
export function isMiddleware(path: NodePath) {
  return (
    path.isFunctionDeclaration() &&
    path.parentPath?.isExportNamedDeclaration() &&
    path.node.id?.name === "middleware"
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
        return;
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
