// Where the Hall of Islanders (the global leaderboard) lives.
//
// Leave both values blank and the board runs on this device only. To make it global for
// everyone with the link, follow DEPLOY.md (about five minutes), then paste your Supabase
// project URL and publishable/anon key here and push.
//
// The publishable key is designed to ship in client code. The database exposes only a handful
// of guarded functions (see supabase/schema.sql); nobody can read or write the tables directly.
export const LEAGUE = {
  url: '',
  anonKey: '',
};
