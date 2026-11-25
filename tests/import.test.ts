import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recipeFromHtml, parseDuration, parseYield, instructionsToSteps, decodeEntities } from '../src/lib/import';

// Shaped like the Yoast/WP Recipe Maker output used by many German food blogs.
const PAGE = `<!doctype html><html><head>
<script type="application/ld+json" class="yoast-schema-graph">{"@context":"https://schema.org","@graph":[
 {"@type":"WebPage","@id":"https://example.org/gulasch/","name":"Gulasch"},
 {"@type":"Recipe","name":"Klassisches Rindergulasch ganz einfach",
  "recipeYield":["4","4 Personen"],"prepTime":"PT30M","cookTime":"PT90M","totalTime":"PT120M",
  "recipeIngredient":["600 g Rindergulasch - ca. 3x3 cm große Stücke","400 ml Rinderfond","2-3 EL Butterschmalz (alternativ Pflanzen&ouml;l)","1 Prise Salz"],
  "recipeInstructions":[
    {"@type":"HowToStep","text":"Fleisch in W&uuml;rfel schneiden."},
    {"@type":"HowToSection","name":"Schmoren","itemListElement":[
      {"@type":"HowToStep","text":"Mit Rotwein abl&ouml;schen."},
      {"@type":"HowToStep","text":"Ca. 90 Minuten schmoren &#8211; fertig."}]}],
  "recipeCategory":["Hauptgerichte"],"keywords":"Fleisch, Winter, Fleisch"}
]}</script>
</head><body>…</body></html>`;

test('finds the recipe inside @graph and maps all fields', () => {
  const r = recipeFromHtml(PAGE, 'https://example.org/gulasch/');
  assert.ok(r);
  assert.equal(r.title, 'Klassisches Rindergulasch ganz einfach');
  assert.equal(r.servings, 4);
  assert.equal(r.prepMinutes, 30);
  assert.equal(r.cookMinutes, 90);
  assert.equal(r.totalMinutes, 120);
  assert.equal(r.ingredients.length, 4);
  assert.equal(r.ingredients[0].name, 'Rindergulasch');
  assert.equal(r.ingredients[2].note, 'alternativ Pflanzenöl');
  assert.deepEqual(r.steps, ['Fleisch in Würfel schneiden.', 'Mit Rotwein ablöschen.', 'Ca. 90 Minuten schmoren – fertig.']);
  assert.deepEqual(r.tags, []); // categories are not imported
});

test('returns null when a page has no recipe data', () => {
  assert.equal(recipeFromHtml('<html><script type="application/ld+json">{"@type":"Article"}</script></html>', null), null);
  assert.equal(recipeFromHtml('<html><script type="application/ld+json">{broken</script></html>', null), null);
});

test('recipe as top-level array with @type list', () => {
  const html = `<script type="application/ld+json">[{"@type":["Recipe","NewsArticle"],"name":"Linsensuppe","recipeIngredient":["250 g Linsen"],"recipeInstructions":"Linsen waschen.\\nKochen."}]</script>`;
  const r = recipeFromHtml(html, null)!;
  assert.equal(r.title, 'Linsensuppe');
  assert.deepEqual(r.steps, ['Linsen waschen.', 'Kochen.']);
  assert.equal(r.totalMinutes, null);
});

test('helpers', () => {
  assert.equal(parseDuration('PT1H30M'), 90);
  assert.equal(parseDuration('P0DT0H45M'), 45);
  assert.equal(parseDuration('nonsense'), null);
  assert.equal(parseYield('6 Portionen'), 6);
  assert.equal(parseYield(2), 2);
  assert.deepEqual(instructionsToSteps(['<p>Eins</p>', 'Zwei']), ['Eins', 'Zwei']);
  assert.equal(decodeEntities('S&uuml;&szlig; &amp; scharf &#x2013; lecker'), 'Süß & scharf – lecker');
});
