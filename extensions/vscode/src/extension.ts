/**
 * This is the entry point for the extension.
 */

import { setupCa } from "core/util/ca";
import { extractMinimalStackTraceInfo } from "core/util/extractMinimalStackTraceInfo";
import { Telemetry } from "core/util/posthog";
import * as vscode from "vscode";

import { getExtensionVersion } from "./util/util";
export { default as buildTimestamp } from "./.buildTimestamp";

let ctx: vscode.ExtensionContext | undefined;

async function dynamicImportAndActivate(context: vscode.ExtensionContext) {
  await setupCa();
  const { activateExtension } = await import("./activation/activate");
  return await activateExtension(context);
}

export function activate(context: vscode.ExtensionContext) {
  ctx = context;
  return dynamicImportAndActivate(context).catch((e) => {
    console.log("Error activating extension: ", e);
    Telemetry.capture(
      "vscode_extension_activation_error",
      {
        stack: extractMinimalStackTraceInfo(e.stack),
        message: e.message,
      },
      false,
      true,
    );
    vscode.window
      .showWarningMessage(
        "Error activating the Continue extension.",
        "View Logs",
        "Retry",
      )
      .then((selection) => {
        if (selection === "View Logs") {
          vscode.commands.executeCommand("continue.viewLogs");
        } else if (selection === "Retry") {
          // Reload VS Code window
          vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
      });
  });
}

export async function deactivate() {
  const start = Date.now();
  Telemetry.capture(
    "deactivate",
    {
      extensionVersion: getExtensionVersion(),
    },
    true,
  );
  Telemetry.shutdownPosthogClient();
  if (ctx) {
    const { deactivate } = await import("./activation/activate");
    await deactivate(ctx);
  }
  const elapsed = Date.now() - start;
  console.log(`Deactivating done in ${elapsed} ms`);
}
