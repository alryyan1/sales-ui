/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_SCHEMA: string;
  readonly VITE_API_HOST: string;
  readonly VITE_PROJECT_FOLDER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
