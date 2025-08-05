import { getVirtualConfigYamlContent } from "core/config/yaml/VirtualConfigYamlSupport";
import * as vscode from "vscode";

import { getExtensionVersion } from "../util/util";

import { parseUsesSlug } from "core/granite/utils/parseUsesSlug";

export function registerConfigYamlHoverProvider(): vscode.Disposable {
  return vscode.languages.registerHoverProvider(
    { language: "yaml" },
    new ConfigYamlHoverProvider(),
  );
}

class ConfigYamlHoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<vscode.Hover | undefined> {
    if (!document.uri.path.includes(".granite-code")) {
      return undefined;
    }
    const line = document.lineAt(position.line);
    const slug = parseUsesSlug(line.text, position.character);
    if (!slug) {
      return undefined;
    }

    const hoverContent = getVirtualConfigYamlContent(
      slug,
      getExtensionVersion(),
    );
    if (!hoverContent) {
      return undefined;
    }

    return {
      contents: [
        {
          language: "yaml",
          value: hoverContent,
        },
      ],
    };
  }
}
