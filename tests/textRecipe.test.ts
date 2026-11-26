import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessRecipeFromHtml, recipeFromText } from '../src/lib/textRecipe';
import { formatAmount, parseIngredientLine } from '../src/lib/ingredients';
import { buildShoppingList } from '../src/lib/shopping';

// Shaped like a blog post without recipe data (e.g. rozkoszny.pl): plain ingredient lines
// with sub-labels, a numbered list of steps, then tips and comments.
const BLOG = `<!doctype html><html><head><title>Pieczone tofu zmieniające życie - Rozkoszny</title></head><body>
<header><nav><a href="/">Przepisy</a><a href="/o-mnie">O mnie</a></nav></header>
<article>
<h1>Pieczone tofu zmieniające życie</h1>
<p>Długi wstęp o tym, dlaczego to tofu jest najlepsze na świecie i jak zmieniło moje życie, z wieloma zdaniami.</p>
<div class="recipe">
<p><strong>Pieczone tofu zmieniające życie</strong></p>
<p>Tofu<br>2 kostki (360 g) tofu<br>3 łyżki mąki ziemniaczanej lub kukurydzianej<br>½ łyżeczki wędzonej papryki<br>3 łyżki oleju</p>
<p>Sos<br>4 łyżki sosu sojowego<br>2 łyżki syropu klonowego<br>1 łyżka octu ryżowego<br>2 ząbki czosnku<br>1 łyżeczka startego imbiru<br>100 ml wody</p>
<p>do podania: ryż, szczypiorek, sezam</p>
<ol>
<li>Tofu odsącz, osusz ręcznikiem papierowym i pokrój w kostkę.</li>
<li>Obtocz w mące wymieszanej z papryką, solą i pieprzem.</li>
<li>Piecz około 20 minut w 220°C (góra-dół) do zezłocenia.</li>
<li>Składniki sosu zagotuj i gotuj około 5 minut, aż zgęstnieje.</li>
<li>Wrzuć tofu do sosu i podgrzewaj minutę lub dwie na małym ogniu.</li>
</ol>
<p>Rady/porady</p>
<p>Tofu najlepiej smakuje od razu po przygotowaniu, ale można je też odgrzać następnego dnia w piekarniku.</p>
</div>
</article>
<section id="comments"><p>Komentarze</p><p>Super przepis, robię co tydzień i zawsze wszystkim smakuje!</p></section>
<footer>© Rozkoszny</footer>
</body></html>`;

test('guesses ingredients, groups and steps from a blog page', () => {
  const r = guessRecipeFromHtml(BLOG, 'https://www.rozkoszny.pl/pieczone-tofu-zmieniajace-zycie/');
  assert.ok(r);
  assert.equal(r.title, 'Pieczone tofu zmieniające życie');
  assert.equal(r.ingredients.length, 10);
  assert.deepEqual(
    [r.ingredients[0].quantity, r.ingredients[0].unit, r.ingredients[0].name, r.ingredients[0].note, r.ingredients[0].group],
    [2, 'kostki', 'tofu', '360 g', 'Tofu'],
  );
  assert.equal(r.ingredients[2].quantity, 0.5);
  assert.equal(r.ingredients[2].unit, 'łyżeczki');
  assert.equal(r.ingredients[4].group, 'Sos');
  assert.equal(r.ingredients[9].unit, 'ml');
  assert.equal(r.steps.length, 5);
  assert.ok(r.steps[0].startsWith('Tofu odsącz'));
});

test('pasted text: title, ingredients and numbered steps', () => {
  const r = recipeFromText(
    [
      'Linsensuppe',
      '',
      'Zutaten',
      '250 g rote Linsen',
      '2 Karotten',
      '1 l Gemüsebrühe',
      'Salz und Pfeffer nach Geschmack',
      '',
      'Zubereitung',
      '1. Karotten schälen und würfeln.',
      '2. Mit Linsen und Brühe 20 Minuten kochen.',
      '3. Pürieren und abschmecken.',
    ].join('\n'),
  )!;
  assert.equal(r.title, 'Linsensuppe');
  assert.equal(r.ingredients.length, 4);
  assert.equal(r.ingredients[3].quantity, null);
  assert.deepEqual(r.steps, ['Karotten schälen und würfeln.', 'Mit Linsen und Brühe 20 Minuten kochen.', 'Pürieren und abschmecken.']);
});

test('text without an ingredient list keeps everything as steps', () => {
  const r = recipeFromText('Omas Kuchen\nAlles verrühren und eine Stunde backen, bis er goldbraun ist.')!;
  assert.equal(r.title, 'Omas Kuchen');
  assert.equal(r.ingredients.length, 0);
  assert.equal(r.steps.length, 1);
});

test('Polish units are kept as written, pinches do not scale, spoons go to the pantry', () => {
  assert.equal(formatAmount(parseIngredientLine('3 łyżki oleju'), 2), '6 łyżki');
  assert.equal(formatAmount(parseIngredientLine('1 szczypta soli'), 2), '1 szczypta');
  const lines = buildShoppingList([
    {
      recipeTitle: 'Tofu',
      recipeServings: 2,
      servings: 2,
      ingredients: ['2 kostki tofu', '1 łyżeczka imbiru', '2 papryki'].map(parseIngredientLine),
    },
  ]);
  const by = (n: string) => lines.find((l) => l.name === n)!;
  assert.equal(by('tofu').pantry, false);
  assert.equal(by('imbiru').pantry, true);
  assert.equal(by('papryki').pantry, false);
});
