/*
  GITHUB PAGES CONFIGURATION

  1. Create a Supabase project.
  2. Open Project Settings > API.
  3. Paste your Project URL and Publishable key below.
  4. Never paste a secret key or service_role key into this file.

  The publishable/anon key is designed to be used in browser code.
  Security is enforced by the Row Level Security policies in schema.sql.
*/

window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-ID.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "YOUR_SUPABASE_PUBLISHABLE_KEY",

  SITE_NAME: "Aurelia",
  CURRENCY: "LKR",
  LOCALE: "en-LK",

  PLACEHOLDER_IMAGE: "./assets/placeholder.svg"
};
