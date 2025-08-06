import { graniteCodeModelSlugs } from "@continuedev/config-yaml";
import * as YAML from "yaml";
import {
  DEFAULT_GRANITE_CHAT_MODEL,
  DEFAULT_GRANITE_COMPLETION_MODEL,
  DEFAULT_GRANITE_EMBEDDING_MODEL,
} from "../default";

export function isSupportedSlug(slug: string): boolean {
  return graniteCodeModelSlugs.includes(slug);
}

export function getVirtualConfigYamlContent(
  slug: string,
  extensionVersion: string = "1.0.0",
): string | undefined {
  switch (slug) {
    case "$granite-code/models/chat":
      return getVirtualConfig(
        getTitle("Chat"),
        DEFAULT_GRANITE_CHAT_MODEL,
        extensionVersion,
      );
    case "$granite-code/models/autocomplete":
      return getVirtualConfig(
        getTitle("Autocomplete"),
        DEFAULT_GRANITE_COMPLETION_MODEL,
        extensionVersion,
      );
    case "$granite-code/models/embeddings":
      return getVirtualConfig(
        getTitle("Embeddings"),
        DEFAULT_GRANITE_EMBEDDING_MODEL,
        extensionVersion,
      );
    default:
      return undefined;
  }
}

function getTitle(role: string): string {
  return `Granite Code ${role} [Read-only]`;
}

const keyOrder = [
  "name",
  "model",
  "provider",
  "defaultCompletionOptions",
  "roles",
];
const keyOrderMap = new Map(keyOrder.map((k, i) => [k, i]));

function getVirtualConfig(
  name: string,
  model: any,
  extensionVersion: string,
): string {
  const serializedModel = YAML.stringify(model, {
    sortMapEntries: (a, b) => {
      const aKey = String(a.key);
      const bKey = String(b.key);
      const aIndex = keyOrderMap.get(aKey) ?? -1;
      const bIndex = keyOrderMap.get(bKey) ?? -1;
      if (aIndex === -1 && bIndex === -1) {
        return aKey.localeCompare(bKey);
      }
      if (aIndex === -1) {
        return 1;
      }
      if (bIndex === -1) {
        return -1;
      }
      return aIndex - bIndex;
    },
  });

  return `name: ${name}
version: ${extensionVersion}
schema: v1

models:
  - ${serializedModel.replaceAll("\n", "\n    ").trimEnd()}
`;
}
