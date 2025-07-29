import { getVirtualConfigYamlContent } from "core/config/yaml/VirtualConfigYamlSupport";
import * as vscode from "vscode";

import { getExtensionVersion } from "../util/util";

import { GRANITE_CODE_CONFIG_SCHEME } from "./VirtualConfigUris";

export function registerVirtualConfigDocumentProvider(): vscode.Disposable {
  return vscode.workspace.registerTextDocumentContentProvider(
    GRANITE_CODE_CONFIG_SCHEME,
    new VirtualConfigYamlDocumentProvider(),
  );
}

class VirtualConfigYamlDocumentProvider
  implements vscode.TextDocumentContentProvider
{
  async provideTextDocumentContent(
    uri: vscode.Uri,
    _token: vscode.CancellationToken,
  ): Promise<string> {
    let slug = uri.path;
    if (slug.endsWith(".yaml")) {
      slug = slug.slice(0, -5); // Remove the .yaml extension
    }
    const content = getVirtualConfigYamlContent(slug, getExtensionVersion());
    if (content) {
      return content;
    }
    console.warn(`No virtual config found for slug: ${slug}!`);
    return "";
  }
}
