import type {ConfigHandler} from "core/config/ConfigHandler";
import type {IDE} from "core/index";
import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import type {VsCodeWebviewProtocol} from "../../webviewProtocol";
import {MaskResult, testAutocomplete} from "./testAutocomplete";

export async function runAutocompleteTest(
  configHandler: ConfigHandler,
  ide: IDE,
  webviewProtocol: VsCodeWebviewProtocol,
) {
  //specifying the 5 files for each codebase
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath!;

  const codebases = [
    {
      name: "Java",
      files: [
        path.join(
          workspaceRoot,
          "java/telegram-gpt-bot/src/main/java/es/achousa/services/GptService.java",
        ),
        path.join(
          workspaceRoot,
          "java/telegram-gpt-bot/src/main/java/es/achousa/model/response/Message.java",
        ),
        path.join(
          workspaceRoot,
          "java/telegram-gpt-bot/src/main/java/es/achousa/model/response/ChatResponse.java",
        ),
        path.join(
          workspaceRoot,
          "java/telegram-gpt-bot/src/main/java/es/achousa/model/response/Choice.java",
        ),
        path.join(
          workspaceRoot,
          "java/telegram-gpt-bot/src/main/java/es/achousa/model/response/Usage.java",
        ),
      ],
    },
    {
      name: "TypeScript",
      files: [
        path.join(
          workspaceRoot,
          "ts/sequelize-create-with-associations/src/sequelize/extended.ts",
        ),
        path.join(
          workspaceRoot,
          "ts/sequelize-create-with-associations/src/sequelize/associations/sequelize.post.ts",
        ),
        path.join(
          workspaceRoot,
          "ts/sequelize-create-with-associations/src/sequelize/associations/sequelize.patch.ts",
        ),
        path.join(
          workspaceRoot,
          "ts/sequelize-create-with-associations/src/sequelize/associations/index.ts",
        ),
        path.join(
          workspaceRoot,
          "ts/sequelize-create-with-associations/tests/extended.spec.ts",
        ),
      ],
    },
    {
      name: "Python",
      files: [
        path.join(workspaceRoot, "python/adapt.py/adapt/client.py"),
        path.join(workspaceRoot, "python/adapt.py/adapt/connection.py"),
        path.join(workspaceRoot, "python/adapt.py/adapt/http.py"),
        path.join(workspaceRoot, "python/adapt.py/adapt/util.py"),
        path.join(workspaceRoot, "python/adapt.py/adapt/websocket.py"),
      ],
    },
  ];

  //run tests for each file in each codebase
  const allResults: MaskResult[] = [];
  for (const { name, files } of codebases) {
    for (const filePath of files) {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(filePath),
      );
      const results = await testAutocomplete(
        doc,
        name,
        configHandler,
        ide,
        webviewProtocol,
      );
      allResults.push(...results);
    }
  }

  //group results by file path
  const grouped = allResults.reduce((map, r) => {
    const arr = map.get(r.file) ?? [];
    arr.push(r);
    map.set(r.file, arr);
    return map;
  }, new Map<string, MaskResult[]>());

  const stats: Record<string, { sum: number; count: number }> = {};
  allResults.forEach((r) => {
    if (r.similarity == null) return;
    const lang = r.project;
    stats[lang] = stats[lang] || { sum: 0, count: 0 };
    stats[lang].sum += r.similarity;
    stats[lang].count += 1;
  });

   //calculate average similarity for each language
  const averages = Object.entries(stats).map(([language, { sum, count }]) => ({
    language,
    avgSimilarity: count > 0 ? sum / count : 0,
  }));

  // build report
  let report =
    "----------------------------------------------------Autocomplete Benchmark----------------------------------------------------\n\n";
  report += "Average similarity by language:\n";
  for (const { language, avgSimilarity } of averages) {
    report += `  ${language}: ${(avgSimilarity * 100).toFixed(2)}%\n`;
  }
  report +=
    "\n------------------------------------------------------------------------------------------------------------------------------\n\n";
  for (const [file, masks] of grouped.entries()) {
    report += `File: ${file.replace(workspaceRoot, "")}\n\n`;
    for (const m of masks) {
      const num = m.maskIndex + 1;
      const chunk = m.maskedChunk;
      const comp = m.completion ?? "<none>";
      console.log("SIMILARITY:", m.similarity);
      const siml = `${(m.similarity * 100).toFixed(2)}%`;
      report += `  Mask ${num}\n`;
      report += `    Masked Region: ${chunk}\n`;
      report += `    Completion: ${comp}\n`;
      report += `    Similarity: ${siml}\n\n`;
    }
    report +=
      "------------------------------------------------------------------------------------------------------------------------------\n\n\n";
  }

  // to .txt
  const outputFile = path.join(workspaceRoot, "autocomplete_benchmark.txt");
  await fs.writeFile(outputFile, report, "utf8");
  vscode.window.showInformationMessage(`Benchmark complete. See ${outputFile}`);
}
