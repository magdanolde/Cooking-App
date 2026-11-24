# Recipes – personal cooking app

Store recipes (typed in or imported from a link), search them, scale them to what you have, and – next – plan your week and get a shopping list.

Built with Next.js, a free Neon Postgres database and free Vercel hosting.

## What works in this version

- **Password protection.** One password, remembered on each device for a year.
- **Recipes.** Add, edit and delete them. Ingredients are split into amount, unit, name and note, and you can paste a whole list at once.
- **Import from a link.** Reads the recipe data (schema.org JSON-LD) that most recipe sites include, then shows an editable preview before saving.
- **Search.** Searches titles, ingredients and tags, with tag filter chips.
- **Scaling.** Use the servings +/− buttons, or tap an ingredient and enter the amount you have. "Prise" and "Msp." stay unchanged.
- **Phone install.** It can be added to your phone's home screen.
- **Week plan.** Lunch and dinner for each day, a different number of servings per meal, and a leftovers option. You can add meals from the plan or from any recipe.
- **Shopping list.** Built from the week's meals at their planned servings. Matching items are added up, leftovers aren't counted, and spices and basics go under "Check at home". You can tick items off (saved per week), add your own items and copy the list as text.

## Put it online (no installs needed)

1. **GitHub:** create a free account at github.com. Make a new *private* repository called `cooking-app`, choose "uploading an existing file", and drag in everything from this folder.
2. **Vercel:** sign up at vercel.com with your GitHub account on the free Hobby plan. Click **Add New → Project**, pick `cooking-app`, then **Deploy**.
3. **Database:** in your Vercel project, open **Storage → Create Database → Neon** and choose the free plan. Connect it to the project. This adds `DATABASE_URL` automatically.
4. **Create the tables:** from the Storage tab, click **Open in Neon**, go to the **SQL Editor**, paste the contents of `db/schema.sql`, and press **Run**.
5. **Password:** in Vercel, open **Settings → Environment Variables** and add:
   - `APP_PASSWORD`: the password you'll type to open the app
   - `AUTH_SECRET`: any long random text, for example 40 characters from a password generator
6. **Redeploy:** go to **Deployments**, open the ⋯ menu on the latest one, and choose **Redeploy**. Settings only take effect after a new deploy.
7. **Use it:** open the `…vercel.app` address on your phone and log in. Then use **Share → Add to Home Screen** on iPhone, or **⋮ → Install app** on Android.

From then on, every change pushed to GitHub is deployed automatically.

## Run it on your computer (optional)

You need Node.js 20 or newer.

```bash
npm install
cp .env.example .env        # then fill in DATABASE_URL, APP_PASSWORD, AUTH_SECRET
npm run db:push             # creates the tables (or run db/schema.sql in Neon instead)
npm run dev                 # http://localhost:3000
npm test                    # unit tests for parsing, scaling, import, shopping list
```

To copy the database address from Vercel: `npx vercel link`, then `npx vercel env pull .env`.

## Where things are

| Path | What |
| --- | --- |
| `src/lib/ingredients.ts` | Splitting ingredient lines, formatting amounts, scaling |
| `src/lib/import.ts` | Reading recipe data from a web page |
| `src/lib/shopping.ts` | Adding up a week's meals into a shopping list |
| `src/lib/validate.ts` | Checks form data before saving |
| `src/lib/recipes.ts` | Database queries |
| `src/db/schema.ts`, `db/schema.sql` | Database tables (same thing in two forms) |
| `src/app/` | Pages: list, recipe, new/edit, login, week plan, shopping list |
| `src/lib/plan.ts`, `src/lib/dates.ts` | Week plan data and date helpers |
| `src/components/` | Recipe form, scalable ingredient list, search box, navigation |
| `src/middleware.ts` | Password check |
| `tests/` | Unit tests (`npm test`) |

## Notes

- The import only works on sites that include recipe data in the page. Most big recipe sites and food blogs do. For other sites, use **Type it in**, then **Paste a list** to split all the ingredients at once.
- The free Vercel plan is for personal, non-commercial use.
