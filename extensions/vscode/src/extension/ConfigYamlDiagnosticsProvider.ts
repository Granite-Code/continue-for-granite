import { isSupportedSlug } from "core/config/yaml/VirtualConfigYamlSupport";
import * as vscode from "vscode";

import { findSlug } from "core/granite/utils/parseUsesSlug";

export function registerConfigYamlDiagnosticsProvider(): vscode.Disposable {
  const diagnosticCollection = vscode.languages.createDiagnosticCollection(
    "granite-config-yaml",
  );

  const updateDiagnostics = (document: vscode.TextDocument) => {
    if (
      document.languageId !== "yaml" ||
      !document.uri.fsPath.includes(".granite-code")
    ) {
      diagnosticCollection.delete(document.uri);
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    let inModelsCollection = false;
    let modelIndent: number | undefined = undefined;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const text = line.text;
      const trimmed = text.trim();
      if (trimmed === "" || trimmed.startsWith("#")) {
        continue; // Skip empty lines and comments
      }
      // Detect start of models collection
      if (/^models\s*:/i.test(trimmed)) {
        inModelsCollection = true;
        modelIndent = line.firstNonWhitespaceCharacterIndex;
        continue;
      }
      // Detect end of models collection (by indentation)
      if (
        inModelsCollection &&
        modelIndent !== undefined &&
        line.firstNonWhitespaceCharacterIndex <= modelIndent
      ) {
        inModelsCollection = false;
        modelIndent = undefined;
      }
      if (!inModelsCollection) {
        continue;
      }

      // Find slug in current line
      const [slug, index] = findSlug(text);
      if (
        slug &&
        index !== undefined &&
        slug.startsWith("$granite-code/models/") &&
        !isSupportedSlug(slug)
      ) {
        const range = new vscode.Range(i, index, i, index + slug.length);
        diagnostics.push(
          new vscode.Diagnostic(
            range,
            `Unknown $granite-code model: ${slug}`,
            vscode.DiagnosticSeverity.Warning,
          ),
        );
      }
    }
    diagnosticCollection.set(document.uri, diagnostics);
  };

  vscode.workspace.onDidOpenTextDocument(updateDiagnostics);
  vscode.workspace.onDidChangeTextDocument((e) =>
    updateDiagnostics(e.document),
  );
  vscode.workspace.textDocuments.forEach(updateDiagnostics);

  return {
    dispose: () => diagnosticCollection.dispose(),
  };
}
