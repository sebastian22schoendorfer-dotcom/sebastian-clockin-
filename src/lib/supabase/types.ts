// Generated DB types land here via `npm run db:types`.
// Until that runs, we ship a minimal hand-written type so the app compiles.
export type Database = {
  public: {
    Tables: Record<string, { Row: Record<string, unknown> }>;
    Enums: Record<string, string>;
  };
};
