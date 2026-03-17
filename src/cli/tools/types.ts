export type EelzapEntry = {
  apiKey: string;
  baseUrl?: string;
  pathPrefix?: string;
};

export type Scope = {
  id: string;
  label: string;
  configPath: string;
};

export type ToolAdapter = {
  /** Human-readable tool name */
  name: string;

  /** Tool identifier for --tool flag */
  id: string;

  /** Available scopes for this tool */
  scopes: Scope[];

  /** Read the current eelzap config from the config file, if it exists */
  read(configPath: string): Promise<EelzapEntry | null>;

  /** Write/merge the eelzap config into the config file */
  write(configPath: string, entry: EelzapEntry): Promise<void>;

  /** Remove the eelzap entry from the config file */
  remove(configPath: string): Promise<void>;

  /** Tool-specific message shown after installation */
  postInstallMessage: string;
};

export type DetectedInstallation = {
  tool: ToolAdapter;
  scope: Scope;
  entry: EelzapEntry;
};
