import { ControlPlaneClient } from "../../control-plane/client.js";
import { ContinueConfig, IDE, IdeSettings } from "../../index.js";
import { ConfigResult } from "../load.js";

import doLoadConfig from "./doLoadConfig.js";
import { IProfileLoader } from "./IProfileLoader.js";

export default class LocalProfileLoader implements IProfileLoader {
  static ID = "local";
  profileId = LocalProfileLoader.ID;
  profileTitle = "Local Config";

  constructor(
    private ide: IDE,
    private controlPlaneClient: ControlPlaneClient,
    private writeLog: (message: string) => Promise<void>,
  ) {}

  async doLoadConfig(ideSettingsPromise: Promise<IdeSettings>): Promise<ConfigResult<ContinueConfig>> {
    return doLoadConfig(
      this.ide,
      ideSettingsPromise,
      this.controlPlaneClient,
      this.writeLog,
      undefined,
    );
  }

  setIsActive(isActive: boolean): void {}
}
