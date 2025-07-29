import { describe, expect, test } from "vitest";

import { findSlug, parseUsesSlug } from "./parseUsesSlug";

describe("parseUsesSlug", () => {
  test("returns undefined for non-matching lines", () => {
    expect(parseUsesSlug("foo bar")).toBeUndefined();
    expect(parseUsesSlug("")).toBeUndefined();
  });

  test("extracts slug from simple uses line", () => {
    expect(parseUsesSlug("uses: $granite-code/models/foo")).toBe(
      "$granite-code/models/foo",
    );
  });

  test("extracts slug when cursor is within slug", () => {
    const line = "uses: $granite-code/models/foo";
    expect(parseUsesSlug(line, 20)).toBe("$granite-code/models/foo");
  });

  test("returns undefined when cursor is outside slug", () => {
    const line = "uses: $granite-code/models/foo";
    expect(parseUsesSlug(line, 2)).toBeUndefined();
  });
});

describe("findSlug", () => {
  test("finds unquoted slug", () => {
    const [slug, position] = findSlug("uses: $granite-code/models/foo");
    expect(slug).toBe("$granite-code/models/foo");
    expect(position).toBe(6);
  });

  test("finds quoted slug", () => {
    const [slug, position] = findSlug('uses: "$granite-code/models/foo"');
    expect(slug).toBe("$granite-code/models/foo");
    expect(position).toBe(7);
  });

  test("Handle multiple quotes", () => {
    const [slug, position] = findSlug(
      'uses: "$granite-code/models/foo" # Use " just because',
    );
    expect(slug).toBe("$granite-code/models/foo");
    expect(position).toBe(7);
  });

  test("handles single quotes", () => {
    const [slug, position] = findSlug("uses: '$granite-code/models/foo'");
    expect(slug).toBe("$granite-code/models/foo");
    expect(position).toBe(7);
  });

  test("ignores comments in unquoted slugs", () => {
    const [slug, position] = findSlug(
      "uses: $granite-code/models/foo # comment",
    );
    expect(slug).toBe("$granite-code/models/foo");
    expect(position).toBe(6);
  });

  test("preserves comments in quoted slugs", () => {
    const [slug, position] = findSlug(
      'uses: "$granite-code/models/foo # not a comment"',
    );
    expect(slug).toBe("$granite-code/models/foo # not a comment");
    expect(position).toBe(7);
  });

  test("ignores non-$ prefixed values", () => {
    const [slug, position] = findSlug("uses: granite-code/models/foo");
    expect(slug).toBeUndefined();
    expect(position).toBeUndefined();
  });

  test("handles position checks", () => {
    const line = "uses: $granite-code/models/foo";
    // Position within slug
    expect(findSlug(line, 20)[0]).toBe("$granite-code/models/foo");
    // Position before slug
    expect(findSlug(line, 2)[0]).toBeUndefined();
    // Position after slug
    expect(findSlug(line, 30)[0]).toBeUndefined();
  });

  test("handles position checks", () => {
    const line = "uses: '$granite-code/models/foo'";
    // Position within slug
    expect(findSlug(line, 7)[0]).toBe("$granite-code/models/foo");
    // Position before slug
    expect(findSlug(line, 6)[0]).toBeUndefined();
    // Position after slug
    expect(findSlug(line, 31)[0]).toBeUndefined();
  });

  test("returns undefined for non-matching lines", () => {
    const [slug, position] = findSlug("not a uses line");
    expect(slug).toBeUndefined();
    expect(position).toBeUndefined();
  });

  test("finds correct slug when multiple slugs exist on same line", () => {
    const line =
      "foo: $granite-code/models/autocomplete uses: $granite-code/models/foo";
    const [slug, position] = findSlug(line);
    expect(slug).toBe("$granite-code/models/foo");
    expect(position).toBe(45);
  });

  test("handles position check with multiple slugs on same line", () => {
    const line =
      "foo: $granite-code/models/autocomplete uses: $granite-code/models/foo";
    // Position in first slug - should not match
    expect(findSlug(line, 10)[0]).toBeUndefined();
    // Position in correct slug - should match
    expect(findSlug(line, 48)[0]).toBe("$granite-code/models/foo");
  });
});
