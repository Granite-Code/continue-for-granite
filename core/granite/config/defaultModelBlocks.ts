import { Block } from "@continuedev/config-yaml";
import fs from "fs";
import path from "path";
import * as YAML from "yaml";
import type { LocalModelSize } from "../..";
import {
  DEFAULT_GRANITE_COMPLETION_MODEL,
  DEFAULT_GRANITE_EMBEDDING_MODEL,
  DEFAULT_MODEL_GRANITE_LARGE,
  DEFAULT_MODEL_GRANITE_SMALL,
} from "../../config/default";
import { getGlobalFolderWithName } from "../../util/paths";
function generateBlockYamlFile(block: Block) {
  return YAML.stringify(block);
}

const chatModelBlockLarge: Block = {
  name: "Default chat model",
  version: "1.0.0",
  schema: "v1",
  models: [{ ...DEFAULT_MODEL_GRANITE_LARGE }],
};

const chatModelBlockSmall: Block = {
  name: "Default chat model",
  version: "1.0.0",
  schema: "v1",
  models: [{ ...DEFAULT_MODEL_GRANITE_SMALL }],
};

const autocompleteModelBlock: Block = {
  name: "Default autocomplete model",
  version: "1.0.0",
  schema: "v1",
  models: [{ ...DEFAULT_GRANITE_COMPLETION_MODEL }],
};

const embedModelBlock: Block = {
  name: "Default embed model",
  version: "1.0.0",
  schema: "v1",
  models: [{ ...DEFAULT_GRANITE_EMBEDDING_MODEL }],
};

export function overrideDefaultModelBlocks(
  appName: string,
  version: string,
  modelSize: LocalModelSize,
) {
  const defaultModelsDir = path.join(
    getGlobalFolderWithName("default-models"),
    `${appName}v${version}`,
  );

  if (!fs.existsSync(defaultModelsDir)) {
    fs.mkdirSync(defaultModelsDir, { recursive: true });
  }

  const defaultChatModelBlock =
    modelSize === "large" ? chatModelBlockLarge : chatModelBlockSmall;

  fs.writeFileSync(
    path.join(defaultModelsDir, "chat.yaml"),
    generateBlockYamlFile(defaultChatModelBlock),
  );
  fs.writeFileSync(
    path.join(defaultModelsDir, "autocomplete.yaml"),
    generateBlockYamlFile(autocompleteModelBlock),
  );
  fs.writeFileSync(
    path.join(defaultModelsDir, "embed.yaml"),
    generateBlockYamlFile(embedModelBlock),
  );
}
