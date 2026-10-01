# Writing the explorer / 説明の書き方

The explanation belongs to the reader's current calculation. Introduce a
quantity's purpose before the formula that computes it, and keep short symbol
reminders beside the formula that needs them. The full symbol reference is
available in a disclosure; it is not required reading before every step.

説明は、その場で読んでいる計算に合わせて書きます。何を求めるかを先に述べ、
そのための数式を示します。記号の短い説明は、その記号を使う式の近くに置きます。
詳しい記号一覧は必要なときに開く参照用です。

## Writing rules / 書き方の方針

- Explain the operation's purpose, define its new quantities, then show the
  calculation and interpret the result. A sequence of formulas alone does not
  explain the algorithm.
- Keep variables in the calculation. Put evaluated numeric outputs on the
  right: `k = floor(q × 315653 / 2^20) = 7`. Keep useful constants such as word
  widths and grid spacings visible.
- Introduce a symbol at first use. Briefly remind the reader when changing
  steps, scales or procedures, or after intervening explanation. Do not repeat
  every full definition on every line.
- Distinguish the input binary exponent `q` from the decimal-power exponent
  `b`, and distinguish the ordinary radius from the exact finish's radius.
  A reminder must include the current unit when the scale changes.
- Use inline math for short definitions and display math for calculations.
  Single-letter variables are italic; multi-letter identifiers such as
  `hi` and `fs` use `\mathrm{hi}` and `\mathrm{fs}`. Functions use `\log`,
  `\lfloor…\rfloor`, or `\operatorname{…}`, not a product of letters.
- Put large integer substitutions near the calculation. A compact value row
  is useful after a variable has just been explained. A new or distant symbol
  needs a short reminder, not just an unexplained number.
- Write complete sentences around formulas. Use ordinary words for the
  consequence of a comparison and explain both outcomes when appropriate.
  Distinguish an unevaluated condition from a false condition.

日本語でも同じ方針です。

- 「何を求めるか → 新しい量の定義 → 数式 → 結果の意味」の順にします。
- 計算中は変数を使い、計算結果は式の右辺に数値で示します。
- 「ここで、q = 25 は入力の2進指数です」のように、意味と現在値を近くで説明します。
  毎回括弧付きの代入一覧を足す必要はありません。
- 初出・別ステップ・別スケール・間に長い説明を挟んだ場所で、必要な記号だけ再紹介します。
  直前に説明した記号は短い値の確認で十分です。
- 単位や役割が変わる場合は明示します。特に近似の半径と完全精度の半径を混同させません。
- 定数まで変数名に隠さず、2048や64ビットなど意味のある値は数式に残します。
- 比較の成立・不成立が次に何を意味するかを文章で説明します。未評価と不成立は別です。

### Example / 例

English:

> Choose the fine decimal-grid exponent from the input's binary exponent.
> Here $q=25$ is the binary exponent. The fixed integer formula gives
> $k=\lfloor q\times315653/2^{20}\rfloor=7$.
> Thus the cached power has exponent $p=-k-1=-8$.

日本語:

> 入力の2進指数から、細かい10進格子の指数を選びます。
> ここで、$q=25$ は2進指数です。決まった整数の式により、
> $k=\lfloor q\times315653/2^{20}\rfloor=7$ となります。
> したがって、キャッシュから選ぶ10の累乗の指数は $p=-k-1=-8$ です。

This is a writing example for `q = 25`, not a fixed value in the explorer.
これは書き方の例です。実際のページは選んだ入力の値を使います。

## Authoring files / 編集するファイル

| Content | Source |
| --- | --- |
| Binary32 English / 日本語 | `content/explorer/binary32.en.md`, `binary32.ja.md` |
| Binary64 English / 日本語 | `content/explorer/binary64.en.md`, `binary64.ja.md` |
| Short local symbol reminders / 記号の短い説明 | `content/explorer/symbols.en.md`, `symbols.ja.md` |
| Shared equations and symbol typesetting / 共通の数式・記号の組版 | `content/explorer/equations.md` |
| Branch selection and trace-value binding / 分岐の選択・計算値の対応 | `assets/explanations.js`, `explanations64.js`, `result-derivation.js` |
| Binary32 localized text selection / 日本語の本文選択 | `assets/explanations-ja.js` |
| Shared content binding / 生成した本文への値の設定 | `assets/content.js`, `notation.js` |

Paths above are relative to `docs/`. Markdown sections have permanent IDs:

```markdown
## scale.one-64-64-bit-product-retain-its-upper-half.body

@notation q b

Align the significand by shifting it left by $\mathrm{fs}$ bits;
call the resulting integer $n$.
```

The ID connects a paragraph to the numeric model; changing the title does not
change this ID. Paragraph order in the Markdown file has no runtime meaning.
English and Japanese may organize sentences differently. Numerical formulas,
inputs and results remain shared. Binary32 joins its translated blocks to
calculations by ID, not array position.

IDは本文と計算モデルを結びます。見出しの文言を変えてもIDは変えません。
Markdown内の並び順を変えても動作は変わりません。英語と日本語の文の組み方は
独立ですが、数式・入力値・計算結果は共通です。

`@notation q b` asks for a short explanation of `q` and `b` immediately before
the live calculation. The remaining input values get a compact binding row.
Without the directive, inputs receive local reminders by default. An empty
`@notation` suppresses reminders for a paragraph whose variables were just
explained. Use this deliberately; do not hide unfamiliar symbols.

`@notation q b` を書くと、計算の直前でqとbを短く説明します。残りの入力値は
小さな値の行で示します。指定しなければ入力の記号を説明します。空の
`@notation` は、直前に記号を説明済みの本文で使えます。

Local definitions can specialize a name by format or step:
`h`, `binary64.T`, `binary64.resolve.h`. The most specific definition wins.

Named fields insert trace values, with no expression evaluation:

```markdown
For this input, the selected cache index is {{cache_index}}.

The binary exponent is $q={{q}}$.
```

The model supplies `cache_index` or `q`. A missing value is an error. Text
values are escaped, and math values fill MathML text nodes. Keep conditional
fragments plain; put formatted prose and math in the containing paragraph.
Do not put JavaScript, arithmetic, or conditionals inside `{{…}}`.

`{{cache_index}}` などの名前に対応する値はJSの計算モデルが渡します。
`{{…}}` の中には式や条件分岐を書きません。新しい計算は計算モデル、文章の
改善はMarkdown、記号の短い説明はsymbolsのファイルを編集します。

Inline math uses `$…$`; display math uses a fenced `math` block. All live
equations, decision predicates and symbol typesetting are also authored in
Markdown, in `equations.md`. English and Japanese share those equations.
Temml compiles both prose math and live calculations into MathML at build time.
The browser fills named numeric slots; it does not parse notation.

文中の式も、入力によって結果が変わる計算式もMarkdownに書きます。計算式・判定式・
記号の組版は `equations.md` にまとめ、英語と日本語で共有します。LaTeXの構文解析は
ビルド時のTemmlに任せます。ブラウザー側は名前に対応する数値を設定するだけです。

### Live equation / 入力に対応する計算式

````markdown
## binary64.scale.measure-the-input-on-the-decimal-grids.calculation

```math
\begin{aligned}
k &= \left\lfloor\log_{10}(2^q)\right\rfloor\result{k} \\
p &= -k-1\result{p} \\
z &= \frac{\lvert x\rvert}{10^{k+1}}=m\times2^q\times10^p
\end{aligned}
```
````

The teaching model selects the permanent equation ID and supplies
`results: {k: -17, p: 16}`. `\result{k}` appends `= −17`; an unsupplied result
adds nothing. Symbolic variables remain in the calculation. `\value{name}`
inserts a required named value, for example a final coefficient or input sign.
These two macros only bind values; their contents are never evaluated.

The compiler gives evaluated results their own alignment column. Within each
block, both the defining `=` and the result `=` line up across rows, even when
formulas or numeric values have different widths. Keep `\result{…}` at the end
of its row. For an explicit substituted expression, write the second pair as
`x &= m\times2^q &\quad&= \value{m}\times2^{\value{q}}`.
The build bundles the pinned Temml stylesheet needed for MathML alignment;
long equations scroll horizontally on narrow screens.
For a directly evaluated expression, use `T\bmod Q &\result{T mod Q}`;
its result occupies the first relation column. Put conditions' relation signs
after `&`, for example `T\bmod Q &\ne 0`. Multiple aligned fragments in one
calculation panel share columns, with spacing between derivation groups.

JSは式のIDと `results: {k: -17, p: 16}` を渡します。`\result{k}` の位置には
`= −17` が入り、計算中のqなどは変数のままです。結果の指定がない箇所には何も
追加しません。`\value{name}` は符号や最終係数など、必須の値を式に挿入します。
どちらも値の対応付けだけを行い、マクロの中で計算はしません。

コンパイラは計算結果を専用の列に配置します。同じ式のブロック内で、定義と
結果の両方の `=` が縦に揃います。`\result{…}` は行の末尾に置きます。
値を代入した式を直接書く場合は、`&\quad&=` で結果の列を指定します。
MathMLの位置合わせに必要なTemmlのCSSもビルド時に同梱します。

For a translated word inside an equation, use `\copy{common.math.coarse-spacing}`.
The corresponding plain label is authored in `common.en.md` and `common.ja.md`;
the mathematical structure stays shared. Keep variable identifiers unchanged.

式の中の「粗い格子の間隔」のような文言は `\copy{common.math.coarse-spacing}` とし、
英語と日本語の短い本文をcommonのMarkdownに書きます。数式の構造と変数名は共通です。

`values` introduces input symbols near the equation; `results` supplies its
evaluated outputs. `equation(id, mathValues)` provides direct substitutions
without adding another value row. `resultEquation(id)` explicitly marks the
block where the selected grid coefficient becomes the returned components;
the shared result model adds candidate selection and zero removal. It does
not infer that block from formula text or paragraph order.

`values` は式の近くで説明する入力の記号、`results` は計算結果です。
`equation(id, mathValues)` は式への直接代入に使います。返す成分への変換を説明する
ブロックは `resultEquation(id)` で明示し、候補の選択と末尾の0の除去を共通モデルで
つなぎます。数式の文字列や本文の順番から推測しません。

## Build and verify / 生成と確認

From the repository root:

```sh
npm ci
npm run build:docs
npm run check:docs
npm run build:site
python3 -m http.server 8765 --directory dist/site --bind 127.0.0.1
```

`build:docs` compiles Markdown with markdown-it and authored LaTeX with Temml
to `docs/assets/content.generated.js` and `equations.generated.js`. Both are ignored build outputs. Commit the Markdown sources and compiler
changes. GitHub Actions generates these files and the rendered Pages site;
the browser loads neither build dependency.

The check rejects stale generated content, duplicate IDs, missing binary64
translations, inconsistent translated fields or notation, unknown notation,
malformed TeX, and lost MathML binding attributes. It then exercises actual conversion paths at every exponent,
preset paths and varied significands, checking field resolution and equality
of English/Japanese calculations. For visual changes, also inspect both
languages at desktop and mobile widths.

生成した `content.generated.js` と `equations.generated.js` はGitに含めません。Markdownと
コンパイラの変更をコミットし、GitHub Actionsで静的サイトを生成します。検査では生成漏れ、IDの重複、翻訳の
対応、数式の構文、差し込み先の欠落、値の不足、両言語の計算の一致を確認します。見た目を変えたときは
デスクトップとモバイルの両方で、式と説明の距離や行の長さも確認します。

## References / 参考資料

- [Knuth, Larrabee and Roberts, *Mathematical Writing*](https://www-cs-faculty.stanford.edu/~knuth/papers/cs1193.pdf),
  especially §1, items 10–16, and the discussion of defining symbols near
  their use in §4. These motivate the nearby definitions and explanatory prose.
  The [author's book page](https://cs.stanford.edu/~knuth/klr.html) also lists
  the Japanese translation, 『クヌース先生のドキュメント纂法』, 有沢誠訳。
- [東京大学「数式の書き方 (1)」](https://hwb.ecc.u-tokyo.ac.jp/hwb2023/applications/latex/math/):
  文中数式と別行立て数式、変数と関数・演算子の書体や間隔の具体例。
- [markdown-it renderer examples](https://github.com/markdown-it/markdown-it/blob/master/docs/examples/renderer_rules.md):
  standard Markdown parsing and focused renderer extensions.
- [Temml administration and server-side API](https://temml.org/docs/en/administration):
  build-time TeX-to-MathML rendering and error handling.

The local reminder policy and trace-value format above are this explorer's
application of those writing principles, rather than a universal paper style.
