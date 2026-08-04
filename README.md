# GitHub Pages Owner-Managed Catalog

This version is designed specifically for **GitHub Pages**.

It uses only:

- HTML
- CSS
- Browser JavaScript
- Supabase for authentication and database storage

There is no Node.js server, npm installation, PHP, Python, or build command.

## What works

- Public Apple-inspired catalog
- Secure owner email/password login
- Add, edit, publish, unpublish, feature, reorder, and delete items
- Draft items remain owner-only
- Changes appear globally on the public website
- Mobile and desktop responsive layout
- GitHub project-page compatible relative file paths

## Step 1 — Create a Supabase project

1. Create a free Supabase project.
2. Open **SQL Editor**.
3. Copy everything from `schema.sql`.
4. Run the SQL.

## Step 2 — Create the owner account

1. Open **Authentication > Users**.
2. Select **Add user**.
3. Create the owner's email and password.
4. Copy the new user's UUID.
5. Return to the SQL Editor and run:

```sql
insert into public.app_admins (user_id)
values ('PASTE-THE-OWNER-USER-UUID-HERE')
on conflict (user_id) do nothing;
```

For a single-owner website, disable public sign-ups in Supabase Authentication settings.

## Step 3 — Configure the website

Open `config.js`.

Replace:

```javascript
SUPABASE_URL: "https://YOUR-PROJECT-ID.supabase.co",
SUPABASE_PUBLISHABLE_KEY: "YOUR_SUPABASE_PUBLISHABLE_KEY",
```

Use the values from the Supabase project's **Connect** or **API Settings** page.

Use only the browser-safe **Publishable** or legacy **anon** key.

**Never place a secret key or `service_role` key in GitHub.**

You can also edit:

```javascript
SITE_NAME: "Aurelia",
CURRENCY: "LKR",
LOCALE: "en-LK",
```

## Step 4 — Upload to GitHub

Upload these files to the root of a GitHub repository:

```text
index.html
owner.html
styles.css
config.js
app.js
owner.js
schema.sql
.nojekyll
assets/
```

Do not upload the outer ZIP file into the repository.

## Step 5 — Enable GitHub Pages

1. Open the repository.
2. Go to **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch `main`.
5. Select folder `/ (root)`.
6. Save.

Your URLs will normally be:

```text
Public:
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/

Owner:
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/owner.html
```

## Important image note

Use direct public image URLs ending in a real image response. Google Drive sharing-page links and many social-media page links will not display as images.

Recommended options:

- Supabase Storage public image URLs
- Cloudinary URLs
- Your own website image URLs
- Unsplash image URLs for testing

## Security model

The Supabase publishable key is visible in browser code by design. Security is enforced by PostgreSQL Row Level Security:

- Anonymous users can only select rows where `published = true`.
- Authenticated non-admin users cannot manage items.
- Only UUIDs registered in `app_admins` can create, edit, or delete items.
- The secret/service-role key is never used in browser code.

## Troubleshooting

### “Supabase setup required”

`config.js` still contains placeholder values.

### Login works but says “Not an owner”

The user's UUID has not been inserted into `public.app_admins`.

### Items do not appear publicly

Check that:

- `Published` is enabled.
- `schema.sql` was run successfully.
- The Supabase project URL and key are correct.
- The browser console does not show a database-policy error.

### GitHub Pages shows an old version

Hard-refresh the page:

- Windows: `Ctrl + F5`
- Mac: `Command + Shift + R`

GitHub Pages may also require a short deployment refresh after a new commit.

## Production guidance

This starter is suitable for catalogs, portfolios, travel packages, room listings, and inquiry-based services. Do not use GitHub Pages to collect passwords, card details, or other sensitive transaction information.
