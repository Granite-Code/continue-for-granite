import * as vscode from "vscode";

import { parseUsesSlug } from "core/granite/utils/parseUsesSlug";
import { getVirtualConfigUri } from "./VirtualConfigUris";

export function registerConfigYamlDefinitionProvider(): vscode.Disposable {
  return vscode.languages.registerDefinitionProvider(
    { language: "yaml" },
    new ConfigYamlDefinitionProvider(),
  );
}

class ConfigYamlDefinitionProvider implements vscode.DefinitionProvider {
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ): Promise<vscode.Location[] | undefined> {
    const line = document.lineAt(position.line);
    const slug = parseUsesSlug(line.text, position.character);
    if (!slug) {
      return undefined;
    }

    const virtualUri = getVirtualConfigUri(slug);
    if (!virtualUri) {
      return undefined;
    }
    const location = new vscode.Location(
      vscode.Uri.parse(virtualUri),
      new vscode.Position(0, 0),
    );
    return [location];
  }
}
