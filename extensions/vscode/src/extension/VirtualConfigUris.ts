import { isSupportedSlug } from "core/config/yaml/VirtualConfigYamlSupport";

export const GRANITE_CODE_CONFIG_SCHEME = "granitecode-config";

export function getVirtualConfigUri(slug: string): string | undefined {
  if (!isSupportedSlug(slug)) {
    return undefined;
  }
  return `${GRANITE_CODE_CONFIG_SCHEME}:${encodeURIComponent(`${slug}.yaml`)}`;
}
