import { graniteCodeModelSlugs } from "@continuedev/config-yaml";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testIde } from "../../test/fixtures";
import {
  addToTestDir,
  setUpTestDir,
  tearDownTestDir,
  TEST_DIR_PATH,
} from "../../test/testDir";
import { localPathToUri } from "../../util/pathToUri";
import { validateVirtualReferences } from "./virtualReference";

describe("Test validateVirtualReferences", () => {
  beforeAll(async () => {
    setUpTestDir();
  });

  afterAll(async () => {
    tearDownTestDir();
  });

  it("injects all references when the models section is empty", async () => {
    const injectedReferences = graniteCodeModelSlugs
      .map((slug) => `  - uses: ${slug}`)
      .join("\n");
    const rawConfig = `name: Local Assistant
version: 1.0.0
schema: v1
models: []`;
    const expectedResult = `name: Local Assistant
version: 1.0.0
schema: v1
models:
${injectedReferences}
`;
    addToTestDir([["config.yaml", rawConfig]]);

    const configUri = localPathToUri(path.join(TEST_DIR_PATH, "config.yaml"));
    await validateVirtualReferences(
      testIde,
      path.join(TEST_DIR_PATH, "config.yaml"),
    );

    const res = await testIde.readFile(configUri);

    expect(res).toBe(expectedResult);
  });

  it("don't inject the references that are commented out", async () => {
    const commentedOutRef = graniteCodeModelSlugs[0];
    const injectedReferences = graniteCodeModelSlugs
      .slice(1)
      .map((slug) => `  - uses: ${slug}`)
      .join("\n");
    const rawConfig = `name: Local Assistant
version: 1.0.0
schema: v1
models:
  # - uses: ${commentedOutRef}
  - name: Local Chat Model
    provider: ollama
    model: granite3.3:8b
    roles:
      - chat`;

    const expectedResult = `name: Local Assistant
version: 1.0.0
schema: v1
models:
  # - uses: ${commentedOutRef}
  - name: Local Chat Model
    provider: ollama
    model: granite3.3:8b
    roles:
      - chat
${injectedReferences}
`;

    addToTestDir([["config.yaml", rawConfig]]);

    const configUri = localPathToUri(path.join(TEST_DIR_PATH, "config.yaml"));
    await validateVirtualReferences(
      testIde,
      path.join(TEST_DIR_PATH, "config.yaml"),
    );

    const res = await testIde.readFile(configUri);

    expect(res).toBe(expectedResult);
  });

  it("don't inject the references that are commented out (flow style)", async () => {
    const commentedOutRef = graniteCodeModelSlugs[0];
    const injectedReferences = graniteCodeModelSlugs
      .slice(1)
      .map((slug) => `    { uses: ${slug} }`)
      .join(",\n");
    const rawConfig = `name: Local Assistant
version: 1.0.0
schema: v1
models: [
  # {uses: ${commentedOutRef}, override: { name: new name }},
  { name: Local Chat Model,
    provider: ollama,
    model: granite3.3:8b,
    roles: [chat],
  }
]`;

    const expectedResult = `name: Local Assistant
version: 1.0.0
schema: v1
models:
  [
    # {uses: ${commentedOutRef}, override: { name: new name }},
    {
        name: Local Chat Model,
        provider: ollama,
        model: granite3.3:8b,
        roles: [ chat ]
      },
${injectedReferences}
  ]
`;

    addToTestDir([["config.yaml", rawConfig]]);

    const configUri = localPathToUri(path.join(TEST_DIR_PATH, "config.yaml"));
    await validateVirtualReferences(
      testIde,
      path.join(TEST_DIR_PATH, "config.yaml"),
    );

    const res = await testIde.readFile(configUri);

    expect(res).toBe(expectedResult);
  });

  it("don't rewtire the config file if there are no missing references", async () => {
    const commentedOutRefsWithIncreasingIndent = graniteCodeModelSlugs
      .map((slug, ind) => `#${" ".repeat(ind + 1)}{ uses: ${slug} }`)
      .join(",\n");
    const rawConfig = `name: Local Assistant
version: 1.0.0
schema: v1
models: [
${commentedOutRefsWithIncreasingIndent}
]`;

    // The expected result should keep the increasing indentation because we didn't rewrite the file
    const expectedResult = rawConfig;

    addToTestDir([["config.yaml", rawConfig]]);

    const configUri = localPathToUri(path.join(TEST_DIR_PATH, "config.yaml"));
    await validateVirtualReferences(
      testIde,
      path.join(TEST_DIR_PATH, "config.yaml"),
    );

    const res = await testIde.readFile(configUri);

    expect(res).toBe(expectedResult);
  });
});
