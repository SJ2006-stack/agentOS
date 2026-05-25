export type OsEnvStatus = {
  geminiConfigured: boolean;
  hydraConfigured: boolean;
  supabaseConfigured: boolean;
  missingRequired: string[];
};
