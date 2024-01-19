import { NodePath } from "@babel/core";
import generate from "@babel/generator";
import * as babelParser from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { LoaderContext } from "webpack";

import { BugpilotPluginError } from "../../errors";
import { isReactElement } from "../utils";

type InjectOptions = {
  workspaceId: string;
};

export default function rootLayoutLoader(
  this: LoaderContext<InjectOptions>,
  source: string,
) {
  const options = this.getOptions() as InjectOptions;

  let shouldAddImport = true;
  let wasWrapped = false;

  const ast = babelParser.parse(source, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

  traverse(ast, {
    enter(path: NodePath<t.Node>) {
      if (path.isImportDeclaration()) {
        const importPath = path.node.source.value;
        if (importPath === "@bugpilot/plugin-nextjs") {
          shouldAddImport = false;
        }
      }

      if (!isReactElement(path)) {
        return;
      }

      path.traverse({
        CallExpression(reactElementPath: NodePath<t.CallExpression>) {
          const [bodyString, bodyProps] = reactElementPath.node.arguments;

          if (!t.isStringLiteral(bodyString)) {
            return;
          }

          if (!t.isObjectExpression(bodyProps)) {
            return;
          }

          if (bodyString.value !== "body") {
            return;
          }

          const bugpilotComponentNode = t.callExpression(t.identifier("_jsx"), [
            t.identifier("Bugpilot"),
            t.objectExpression([
              t.objectProperty(
                t.stringLiteral("workspaceId"),
                t.stringLiteral(options?.workspaceId),
              ),
            ]),
          ]);

          wasWrapped = true;

          const bodyChildren = bodyProps.properties.find((prop) => {
            if (!t.isObjectProperty(prop)) {
              return false;
            }

            return t.isIdentifier(prop.key, { name: "children" });
          });

          if (!bodyChildren || !t.isObjectProperty(bodyChildren)) {
            throw new BugpilotPluginError(
              "Could not find a <body> tag in the root layout.",
            );
          }

          if (t.isArrayExpression(bodyChildren.value)) {
            bodyChildren.value.elements.push(bugpilotComponentNode);
          } else if (t.isCallExpression(bodyChildren.value)) {
            bodyChildren.value = t.arrayExpression([
              bodyChildren.value,
              bugpilotComponentNode,
            ]);
          } else {
            throw new BugpilotPluginError(
              "Unsupported <body> children type the root layout.",
            );
          }

          reactElementPath.skip();
        },
      });

      path.skip();
    },
  });

  if (shouldAddImport && wasWrapped) {
    const bugpilotImports = t.importDeclaration(
      [t.importSpecifier(t.identifier("Bugpilot"), t.identifier("Bugpilot"))],
      t.stringLiteral("@bugpilot/plugin-nextjs"),
    );

    ast.program.body.unshift(bugpilotImports);
  }

  const output = generate(ast) as { code: string };
  return output.code;
}
