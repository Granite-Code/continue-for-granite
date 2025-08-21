import * as path from "path";

import { LocalModelSize } from "core";
import {
  DEFAULT_GRANITE_MODEL_IDS_LARGE,
  DEFAULT_GRANITE_MODEL_IDS_SMALL,
} from "core/config/default";
import { EXTENSION_NAME } from "core/control-plane/env";
import { GRANITE_INITIAL_ACTIVATION_COMPLETED_KEY } from "core/granite/commons/constants";
import { getContinueRcPath, getTsConfigPath } from "core/util/paths";
import { Telemetry } from "core/util/posthog";
import * as vscode from "vscode";
import { workspace } from "vscode";

import { VsCodeExtension } from "../extension/VsCodeExtension";
import { registerModelUpdater } from "../granite/ollama/modelUpdater";
import { OllamaServer } from "../granite/ollama/ollamaServer";
import { replaceCopilotWithGraniteCode } from "../granite/utils/compatibilityUtils";
import { isGraniteOnboardingComplete } from "../granite/utils/extensionUtils";
import registerQuickFixProvider from "../lang-server/codeActions";
import { getExtensionVersion } from "../util/util";

import { VsCodeContinueApi } from "./api";
import setupInlineTips from "./InlineTipManager";

export async function activateExtension(context: vscode.ExtensionContext) {
  // Add necessary files
  getTsConfigPath();
  getContinueRcPath();

  // Register commands and providers
  registerQuickFixProvider();
  setupInlineTips(context);

  const vscodeExtension = new VsCodeExtension(context);

  // Load Continue configuration
  if (!context.globalState.get("hasBeenInstalled")) {
    void context.globalState.update("hasBeenInstalled", true);
    void Telemetry.capture(
      "install",
      {
        extensionVersion: getExtensionVersion(),
      },
      true,
    );
  }

  // Register config.yaml schema by removing old entries and adding new one (uri.fsPath changes with each version)
  const yamlMatcher = ".granite-code*/**/*.yaml";
  const yamlConfig = vscode.workspace.getConfiguration("yaml");

  const newPath = path.join(
    context.extension.extensionUri.fsPath,
    "config-yaml-schema.json",
  );

  try {
    await yamlConfig.update(
      "schemas",
      { [newPath]: [yamlMatcher] },
      vscode.ConfigurationTarget.Global,
    );
  } catch (error) {
    console.error(
      "Failed to register Continue config.yaml schema, most likely, YAML extension is not installed",
      error,
    );
  }

  const api = new VsCodeContinueApi(vscodeExtension);
  const graniteOnboardingComplete = isGraniteOnboardingComplete(context);
  await vscode.commands.executeCommand(
    "setContext",
    "granite.initialized",
    graniteOnboardingComplete,
  );

  const initialActivationCompleted = context.globalState.get<boolean>(
    GRANITE_INITIAL_ACTIVATION_COMPLETED_KEY,
    false,
  );
  if (!initialActivationCompleted) {
    if (!graniteOnboardingComplete) {
      replaceCopilotWithGraniteCode();
      await vscode.commands.executeCommand("granite.setup");
    }
    await context.globalState.update(
      GRANITE_INITIAL_ACTIVATION_COMPLETED_KEY,
      true,
    );
  }

  await registerModelUpdater(context);

  const continuePublicApi = {
    registerCustomContextProvider: api.registerCustomContextProvider.bind(api),
  };

  // 'export' public api-surface
  // or entire extension for testing
  return process.env.NODE_ENV === "test"
    ? {
        ...continuePublicApi,
        extension: vscodeExtension,
      }
    : continuePublicApi;
}

export async function deactivate(context: vscode.ExtensionContext) {
  // Unload Granite LLMs from Ollama
  const type = workspace
    .getConfiguration(EXTENSION_NAME)
    .get<LocalModelSize>("localModelSize");
  const modelsToUnload =
    type === "large"
      ? DEFAULT_GRANITE_MODEL_IDS_LARGE
      : DEFAULT_GRANITE_MODEL_IDS_SMALL;

  const ollamaServer = new OllamaServer(context);
  let unloadedModels = 0;
  await Promise.all(
    modelsToUnload.map(async (model) => {
      try {
        await ollamaServer.unloadModel(model);
        unloadedModels++;
      } catch (error: any) {
        console.error(error?.message ?? error);
      }
    }),
  );
  console.log(`Unloaded ${unloadedModels} models`);
}
