import { graniteCodeModelSlugs } from "@continuedev/config-yaml";
import fs from "fs";
import * as YAML from "yaml";
import { IDE } from "../..";
import { getConfigYamlPath } from "../../util/paths";
import { parseUsesSlug } from "../utils/parseUsesSlug";

const keyOrder = ["name", "version", "schema", "models"];

function extractSlugsFromComment(comment: string | undefined | null): string[] {
  const res: string[] = [];

  if (!comment) {
    return res;
  }

  const lines = comment.split("\n");
  for (const line of lines) {
    let slug = parseUsesSlug(line);
    if (slug) {
      res.push(slug);
    }
  }
  return res;
}

/**
 * Determines which model slugs need to be added.
 *
 * This function identifies which model slugs from the predefined `graniteCodeModelSlugs` array are not currently in use within the provided YAML sequence of models. It considers two sources of "in-use" slugs:
 * 1. An active model entry (e.g. `- uses: $granite-code/models/chat`).
 * 2. Any comment within the `models` block (checked via a deep search).
 *
 * @param models The YAML sequence of models to check against.
 * @returns An array of strings representing the model slugs that are not in use.
 */
function slugsToAdd(models: YAML.YAMLSeq): string[] {
  const graniteCodeModelSlugsSet = new Set(graniteCodeModelSlugs);

  // Trailing comments of models section
  const slugs = extractSlugsFromComment(models.comment);
  for (const slug of slugs) {
    graniteCodeModelSlugsSet.delete(slug);
  }

  // Models in use
  for (const model of models.items) {
    if (YAML.isMap(model)) {
      const usesSlug = model.get("uses");
      if (usesSlug && typeof usesSlug === "string") {
        graniteCodeModelSlugsSet.delete(usesSlug);
      }
    }
  }

  // Commented out models
  const extractedSlugs = extractYamlCommentsDFS(models);
  extractedSlugs.forEach((slug) => graniteCodeModelSlugsSet.delete(slug));

  return [...graniteCodeModelSlugsSet];
}

/**
 * Recursively extracts "slugs" from all comments within a YAML document structure.
 *
 * This function performs a depth-first search (DFS) through a given YAML Map (`{...}`) or
 * Sequence (`[...]`). It inspects the `comment` (inline) and `commentBefore` (on the preceding line)
 * properties of every key, value, and item. It then uses a helper function, `extractSlugsFromComment`,
 * to parse slugs from those comment strings.
 *
 * The final result is a deduplicated array of all unique slugs found throughout the entire
 * nested structure.
 *
 * @param {YAML.YAMLMap | YAML.YAMLSeq} yamlNode - The root YAML node (Map or Sequence) to start the search from.
 * @returns {string[]} A unique, flat array of all slugs extracted from the comments.
 */
function extractYamlCommentsDFS(
  yamlNode: YAML.YAMLMap | YAML.YAMLSeq,
): string[] {
  let extractedSlugs: string[] = [];

  function pushSlugs(node: YAML.Node) {
    extractedSlugs.push(...extractSlugsFromComment(node.comment));
    extractedSlugs.push(...extractSlugsFromComment(node.commentBefore));
  }

  // Comments of the current node
  pushSlugs(yamlNode);

  for (const item of yamlNode.items) {
    if (YAML.isPair(item)) {
      // Key Section
      // If it's not a scalar, ignore it
      if (YAML.isScalar(item.key)) {
        pushSlugs(item.key);
      }

      // Value Section
      // Only consider Scalar, Map, and Seq
      if (YAML.isScalar(item.value)) {
        pushSlugs(item.value);
      } else if (YAML.isMap(item.value)) {
        extractedSlugs.push(...extractYamlCommentsDFS(item.value));
      } else if (YAML.isSeq(item.value)) {
        extractedSlugs.push(...extractYamlCommentsDFS(item.value));
      }
    } else if (YAML.isMap(item)) {
      extractedSlugs.push(...extractYamlCommentsDFS(item));
    } else if (YAML.isSeq(item)) {
      extractedSlugs.push(...extractYamlCommentsDFS(item));
    }
  }

  return [...new Set(extractedSlugs)];
}

/**
 * Validates and injects missing virtual references into the global configuration YAML file.
 *
 * This function reads the global YAML config, ensures a `models` sequence (an array) exists,
 * and then populates it with any required virtual model references ("slugs") that are missing.
 * The changes are then written back to the file.
 *
 * It operates safely by:
 * - Aborting without changes if the YAML file has parsing errors.
 * - Catching any exceptions during file I/O or processing and displaying a warning toast in the IDE.
 *
 * @param {IDE} ide - The IDE instance, used to display a warning notification if the process fails.
 * @param {string} configFilePath - The path to the config YAML file to validate. If not provided, the default path will be used.
 */
export async function validateVirtualReferences(
  ide: IDE,
  configFilePath?: string,
): Promise<void> {
  try {
    const filePath = configFilePath || getConfigYamlPath("vscode");
    const rawContent = (await fs.promises.readFile(filePath)).toString();
    const yamlDoc = YAML.parseDocument(rawContent);

    // Don't do anything, if there is a parsing error
    if (yamlDoc.errors.length !== 0) {
      return;
    }

    // Add an empty models section if there is no models section
    if (yamlDoc.get("models") === undefined) {
      yamlDoc.add(new YAML.Pair("models", []));
    }

    const models = yamlDoc.get("models");

    // Models should be a Seq
    if (YAML.isSeq(models)) {
      // Change to block style if models section is empty
      if (models.items.length === 0) {
        models.flow = false;
      }

      const missingRefs = slugsToAdd(models);
      // Only inject missing references if there are any
      if (missingRefs.length > 0) {
        for (const missingRef of missingRefs) {
          const node = yamlDoc.createNode({ uses: missingRef });
          models.add(node);
        }
        const stringYaml = yamlDoc.toString();
        await fs.promises.writeFile(filePath, stringYaml);
      }
    }
  } catch {
    void ide.showToast(
      "warning",
      "Failed to inject missing virtual references",
    );
  }
}
