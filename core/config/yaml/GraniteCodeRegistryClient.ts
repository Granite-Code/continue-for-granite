import {
  FullSlug,
  IgnoredBlockException,
  PackageIdentifier,
  Registry,
} from "@continuedev/config-yaml";
import * as fs from "node:fs";
import * as path from "node:path";
import { IdeInfo } from "../..";
import { getVirtualConfigYamlContent } from "./VirtualConfigYamlSupport";

interface GraniteCodeRegistryClientConfig {
  rootPath?: string;
  ideInfo: IdeInfo;
}

export class GraniteCodeRegistryClient implements Registry {
  private readonly rootPath?: string;
  private readonly ideInfo: IdeInfo;
  constructor(private readonly config: GraniteCodeRegistryClientConfig) {
    this.rootPath = config.rootPath;
    this.ideInfo = config.ideInfo;
  }

  async getContent(id: PackageIdentifier): Promise<string> {
    switch (id.uriType) {
      case "file":
        return this.getContentFromFilePath(id.filePath);
      case "slug":
        return this.getContentFromSlug(id.fullSlug);
      default:
        throw new Error(
          `Unknown package identifier type: ${(id as any).uriType}`,
        );
    }
  }

  private getContentFromFilePath(filepath: string): string {
    if (filepath.startsWith("file://")) {
      // For Windows file:///C:/path/to/file, we need to handle it properly
      // On other systems, we might have file:///path/to/file
      return fs.readFileSync(new URL(filepath), "utf8");
    } else if (path.isAbsolute(filepath)) {
      return fs.readFileSync(filepath, "utf8");
    } else if (this.rootPath) {
      return fs.readFileSync(path.join(this.rootPath, filepath), "utf8");
    } else {
      throw new Error("No rootPath provided for relative file path");
    }
  }

  private async getContentFromSlug(fullSlug: FullSlug): Promise<string> {
    const id = `${fullSlug.ownerSlug}/${fullSlug.packageSlug}/${fullSlug.versionSlug}`;
    if (id.startsWith("$granite-code/models/")) {
      const content = getVirtualConfigYamlContent(
        id,
        this.ideInfo.extensionVersion,
      );
      if (content) {
        return content;
      }
      // The slug is not recognized, but we don't want to throw an error
      // because it might be a valid slug from a more recent Granite.Code version,
      // we just ignore it.
      throw new IgnoredBlockException(
        `Ignoring unknown granite-code model ${id}`,
      );
    }
    throw new Error(`Block ${id} is not supported`);
  }
}
