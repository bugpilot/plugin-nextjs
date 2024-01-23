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
  return (
    source.includes("__next_internal_client_entry_do_not_use__") ||
    source.includes("use client") ||
    source.includes("import { createProxy }")
  );
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
  // export function middleware(){}
  const isExportNamedFunction =
    path.isFunctionDeclaration() &&
    path.parentPath?.isExportNamedDeclaration() &&
    path.node.id?.name === "middleware";

  // export const middleware = () => {}
  const isExportNamedArrowFunction =
    path.isArrowFunctionExpression() &&
    path.parentPath.isVariableDeclarator() &&
    path.parentPath.node.id.type === "Identifier" &&
    path.parentPath?.node.id.name === "middleware";

  // export default middleware;
  const isExportDefaultIdentifier =
    path.isIdentifier() &&
    path.node.name === "middleware" &&
    path.parentPath?.isExportDefaultDeclaration();

  // export { middleware }
  const isExportNamedExportSpecifier =
    path.isExportSpecifier() &&
    t.isIdentifier(path.node.exported) &&
    path.node.exported.name === "middleware" &&
    path.parentPath?.isExportNamedDeclaration();

  return (
    isExportNamedFunction ||
    isExportNamedArrowFunction ||
    isExportDefaultIdentifier ||
    isExportNamedExportSpecifier
  );
}

export function isPageComponent(path: NodePath) {
  // export default () => {}
  const isDefaultExportArrowFunction =
    path.isArrowFunctionExpression() &&
    path.parentPath?.isExportDefaultDeclaration();

  // export default function Home() {}
  const isDefaultExportFunction =
    path.isFunctionDeclaration() &&
    path.parentPath?.isExportDefaultDeclaration();

  // export default Home;
  const isDefaultExportIdentifier =
    path.isIdentifier() && path.parentPath?.isExportDefaultDeclaration();

  return (
    isDefaultExportArrowFunction ||
    isDefaultExportFunction ||
    isDefaultExportIdentifier
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
  } else if (path.isIdentifier()) {
    return wrapIdentifier(path, wrapFunctionName, optionsExpression);
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
    ReturnStatement(returnPath: NodePath<t.ReturnStatement>) {
      if (foundJSX) {
        return;
      }

      const argument = returnPath.get("argument");

      if (
        t.isCallExpression(argument.node) &&
        t.isIdentifier(argument.node.callee) &&
        (argument.node.callee.name === "_jsx" ||
          argument.node.callee.name === "_jsxs")
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

function wrapIdentifier(
  path: NodePath<t.Identifier>,
  wrapFunctionName: string,
  optionsExpression: t.ObjectExpression,
) {
  const originalFunctionIdentifier = t.identifier(path.node.name);

  const wrappedIdentifier = t.callExpression(t.identifier(wrapFunctionName), [
    originalFunctionIdentifier,
    optionsExpression,
  ]);

  path.replaceWith(wrappedIdentifier);
}
