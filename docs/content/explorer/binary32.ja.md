# binary32 explanation — ja

<!-- SPDX-License-Identifier: Unlicense -->

## checks.check-nonfinite.title

指数がすべて1か

## checks.check-nonfinite.body

格納された指数の最大値255は無限大かNaNを示します。有限値の丸め区間や10進スケールを作る前に、最初にこの判定を行います。

## checks.check-power.title

格納された仮数部が0か

## checks.check-power.body

無限大とNaNを除いた後、仮数部が0なら、指数も0のときは符号付きゼロ、それ以外は正確な2の累乗です。生成済みの表が両方の結果を持っています。

## checks.check-integer-range.title

整数の8つの指数区間を選ぶ

## checks.check-integer-range.body

この変換が整数の近道を試すのは、絶対値が2¹⁶以上2²⁴未満の範囲だけです。格納された指数143〜150がこの範囲を示します。ただし、範囲内であるだけでは整数とは限りません。

## checks.check-integer-bits.title

右シフトで捨てる部分を調べる

## checks.check-integer-bits.body

範囲の判定が成立した場合だけ評価します。整数部分の下にはs = 150 − Eビットがあります。そのビットがすべて0なら、右シフトしても値を失いません。隠れた先頭の1は、この捨てる部分には含まれません。

## checks.check-tiny.title

最初の10個の非正規数を完全精度へ

## checks.check-tiny.body

近似の経路では整数仮数が11未満の入力を除きます。ゼロはすでに返されているので、成立するのは最初の10個の非ゼロの非正規数です。正規数の仮数はすべてこれよりはるかに大きい値です。

## checks.check-coarse.title

誤差の余裕を含めて区間内だと保証する

## checks.check-coarse.body

aは近似した中心から粗い候補までの距離です。m + 1を加えることで、表で省いた小数部分と半径の誤差を見込みます。それでもhより厳密に小さければ、候補は確実に区間内です。不成立は「まだ保証できない」という意味で、区間外の証明ではありません。

## checks.check-boundary.title

不確かな境界と確実な区間外を分ける

## checks.check-boundary.body

粗い候補の採用判定が不成立だった場合に評価します。距離がh + m + 1以下なら、省いた情報が区間端の判定を変えるかもしれないため完全精度へ進みます。不成立なら粗い候補は確実に区間外なので、細かい格子が必要です。

## checks.check-fine-change.title

両端で丸めた桁を比較する

## checks.check-fine-change.body

上下限は、キャッシュで省いた情報によるすべての誤差を含みます。両端の桁が違えば近似だけでは桁を決められません。同じなら桁は安定していますが、同距離の境界にないことを別に調べる必要があります。

## checks.check-fine-tie.title

同距離になる境界を除く

## checks.check-fine-tie.body

細かい桁の上下限が一致した場合だけ評価します。余り0は、下限の計算が丸めの境界にちょうど乗ることを示します。同距離と省いた情報を完全精度で決着します。余りが0でなければ、安定した桁を安全に返せます。

## guard.evaluate-with-this-input.title

この入力で判定する

## guard.evaluate-with-this-input.body.detail.yes

成立

## guard.evaluate-with-this-input.body.detail.no

不成立

## guard.evaluate-with-this-input.body

この比較は「{{detail}}」です。下の整数はこの変換の計算が実際に使用する値です。

## guard.control.

 捨てるビットの条件は評価しません。

## guard.control.or

 OR条件の最初の項でフォールバックが決まるため、同距離の条件は評価しません。

## guard.follow-the-control-flow.title

制御の流れを追う

## guard.follow-the-control-flow.body.right

 成立・不成立のどちらも実行した判定として記録します。省略されるのは実行が到達しない条件だけです。

## decode.read-the-three-fields.title

3つのフィールドを読む

## decode.read-the-three-fields.body

{{bits}}は、符号1ビット、指数8ビット、格納された仮数部23ビットです。符号ビットは{{status}}、指数フィールドは{{raw}}、仮数フィールドは{{fraction}}です。

## decode.recognize-a-special-value.title

特別な値を見分ける

## decode.recognize-a-special-value.body.yes

指数がすべて1で仮数部が非ゼロならNaNです。仮数部はペイロードであり、有限値の仮数ではありません。

## decode.recognize-a-special-value.body.no

指数がすべて1で仮数部が0なら無限大です。有限の丸め区間を探す必要はありません。

## decode.use-subnormal-spacing.title

非正規数の間隔を使う

## decode.use-subnormal-spacing.body

指数フィールド0には暗黙の先頭の1がありません。非ゼロの非正規数はすべて2⁻¹⁴⁹の整数倍です。最小の正規数の付近も同じ間隔です。

## decode.restore-the-hidden-bit.title

隠れた先頭の1を復元する

## decode.restore-the-hidden-bit.body

正規数は先頭の2進の1より下の仮数だけを格納します。2²³を加えて整数仮数mを復元します。指数は、バイアス127と仮数の小数部分23ビットの両方を差し引いて調整します。

## decode.why-the-original-format-matters.title

元の形式が重要な理由

## decode.why-the-original-format-matters.body.detail.yes

符号は負です。以降は絶対値を計算します。

## decode.why-the-original-format-matters.body.detail.no

符号は正です。

## decode.why-the-original-format-matters.body

{{detail}} 変換には、このbinary32値と隣の値との間の丸め区間を使います。10進数は同じ32ビットに戻ればよく、2進の値そのものと等しくなくてもかまいません。binary64の区間を使うと別の変換問題になります。

## special.preserve-the-numeric-api-contract.title

数値APIの約束を保つ

## special.preserve-the-numeric-api-contract.body

返す指数10000は無限大・NaNを表す特別な値です。係数0なら無限大、非ゼロならNaNの仮数ペイロードを保持します。符号ビット{{detail}}もそのままです。

## special.do-not-search-a-grid.title

格子を探す必要はない

## special.do-not-search-a-grid.body

無限大やNaNには、有限の最短10進数を選ぶ問題は当てはまりません。表示する単語は表現上の選択です。Boundragonは特別な指数を含む数値の構成要素を返します。

## special.use-the-zero-table-entry.title

表のゼロの項目を使う

## special.use-the-zero-table-entry.body

指数も仮数部も0です。表の項目0は係数0、指数0を返すよう生成されています。負の符号ビットも保つので、−0と+0は区別されます。

## special.return-without-interval-arithmetic.title

区間の計算をせず返す

## special.return-without-interval-arithmetic.body.detail.yes

負

## special.return-without-interval-arithmetic.body.detail.no

正

## special.return-without-interval-arithmetic.body

乗算も末尾の0の除去も不要です。結果は{{detail}}のゼロです。

## special.why-powers-get-a-separate-route.title

2の累乗に専用の経路がある理由

## special.why-powers-get-a-separate-route.body

正規数の2の累乗では、直前の値は通常1つ小さい指数区間にあり、その間隔は直後の値までの半分です。そのため下側の中点は上側の中点より近くなります。最小の正規数は例外で、両側が非正規数と同じ間隔です。

## special.read-a-precomputed-canonical-answer.title

生成済みの正規化した結果を読む

## special.read-a-precomputed-canonical-answer.body

生成器は厳密な有理数演算で2の累乗の結果を求めています。この入力は表の項目{{raw}}を使い、その係数と指数は最短・最も近い・末尾の0なしという条件を満たします。

## special.why-this-bypasses-the-filter.title

近似の判定を通らない理由

## special.why-this-bypasses-the-filter.body

通常の対称な半径による判定は不要です。表引きが区間の形を直接扱い、最後に入力の符号を付けます。

## integer.prove-that-no-fractional-bits-remain.title

小数部分のビットが残らないと証明する

## integer.prove-that-no-fractional-bits-remain.body

指数フィールド143〜150は絶対値[2¹⁶, 2²⁴)を表します。24ビットの仮数を{{right_shift}}ビット右シフトして正確な整数になるのは、捨てるビットがすべて0だからです。

## integer.normalize-decimal-zeroes.title

10進数の末尾の0を除く

## integer.normalize-decimal-zeroes.body

{{integer}}は指数0の正確な整数係数です。末尾の0を1つ除くごとに、係数を10で割り、指数を1増やせます。この入力は合計{{zeroes}}個の0を除きます。

## integer.why-the-range-is-selective.title

範囲を絞る理由

## integer.why-the-range-is-selective.body

この変換では整数の入力群に多い大きな整数だけにこの近道を使います。小さい指数区間まで毎回調べると、普通の10進数の入力に余分な時間がかかります。

## scale.pick-the-two-neighboring-decimal-grids.title

隣り合う2つの10進格子を選ぶ

## scale.pick-the-two-neighboring-decimal-grids.body

格子は10進数の候補の集合であり、表示する小数点以下の桁数ではありません。粗い格子は $10^e$ の整数倍、細かい格子はその10分の1の間隔 $10^{e-1}$ の点です。粗い候補はすべて細かい候補でもあります。

$e$ は入力の絶対値 $|x|$ ではなく、**2進数の間隔** $2^q$ から選びます。下の最後の不等式のように、2つの間隔がこの2進間隔を挟みます。左右対称の経路では丸め区間の幅は $2^q$ なので、粗い点は最大1個しか入らず、細かい格子には有効な点が得られる密度があります。有効な粗い点を先に選ぶと有効桁を少なくできます。2つの格子の見取り図では、この入力の候補を厳密に確認できます。

$10^e$ で割るのは座標の変換で、値や区間への包含は保たれます。粗い候補は整数、細かい候補は0.1刻みとなり、入力の厳密な位置は $m\alpha$ です。ここで $\alpha=2^q/10^e$ とします。次の乗算でこの位置を近似します。

## scale.keep-40-fractional-bits.title

小数部分を40ビット保つ

## scale.keep-40-fractional-bits.body

粗い格子1間隔を $Q=2^{40}$ 単位の固定小数点で表します。キャッシュには $W=\lfloor\alpha Q\rfloor$ を保存するので、$W/Q$ はスケールの下向きの近似です。入力ごとに $\alpha=2^q/10^e$ と $\alpha Q$ の正確な丸めを求めるには、大きな整数の累乗と除算が必要です。キャッシュはその計算を事前に済ませます。

24ビットの仮数 $m$ と $W$ の積は64ビットに収まります。乗算1回と半単位 $Q/2$ の加算で、近い整数を選ぶための積 $P$ を得ます。

## scale.center-the-leftover-fraction.title

残った小数部分を0中心にする

## scale.center-the-leftover-fraction.body

半単位を足した積 $P$ を $Q$ で割った商が粗い整数候補 $I$ です。余りから半単位を引いて $r$ を定めると、粗い単位での近似位置は $I+r/Q$ です。候補の10進数の値は $I\times10^e$ で、$r$ は0からではなくこの候補からのずれです。その符号は入力の近似が $I$ の左右どちらにあるかを表し、固定小数点単位での距離は $a=|r|$ です。

## scale.bound-the-omitted-information.title

省いた情報の上限を押さえる

## scale.bound-the-omitted-information.body

キャッシュの乗数を切り下げたとき、省いた量は $W$ の1単位未満です。乗算後の厳密な中心は、近似から右へ固定小数点の $m$ 単位未満だけ動きえます。この省いた位置の誤差を $\delta$ とします。半径は $h$ と $h+1$ の間です。次の判定では両方の誤差を見込み、候補を保証します。

## coarse.leave-a-full-error-margin.title

誤差をすべて見込んでも余裕がある

## coarse.leave-a-full-error-margin.body

aは粗い点Iへの近似距離です。m+1を足すと、省いた中心の情報と半径の不確かさを含められます。この保守的な距離でもhより厳密に小さいため、Iは確実に丸め区間内です。

## coarse.prefer-the-grid-with-fewer-digits.title

桁の少ない格子を優先する

## coarse.prefer-the-grid-with-fewer-digits.body

保証された粗い係数はI = {{integral}}、指数は{{gridexp}}です。細かい格子なら10進数の桁が1つ増えます。2つの格子のスケールの上限により粗い候補が最短だと分かります。さらに末尾の0があれば係数を短くできます。

## coarse.use-bounded-zero-removal.title

回数の決まった0の除去を使う

## coarse.use-bounded-zero-removal.body

粗い係数は8桁未満なので、末尾の0は最大7個です。モジュラ逆数による判定で4個、2個、1個のまとまりとして除き、逐次的な除算ループを避けます。この入力では合計{{zeroes}}個を除きます。

## outside.the-coarse-acceptance-test-did-not-pass.title

粗い候補の採用判定は不成立だった

## outside.the-coarse-acceptance-test-did-not-pass.body

最初の判定が不成立なだけでは、区間外だとは言えません。区間の境界に近いだけかもしれません。この2つ目の比較で、確実な除外と不確かさを区別します。

## outside.exclude-the-coarse-point-with-its-error-bound.title

誤差の上限を使って粗い候補を除く

## outside.exclude-the-coarse-point-with-its-error-bound.body

h+m+1という余裕を見込んでも残差の距離aより小さいため、最も近い粗い候補は確実に区間外です。別に保証されたスケールの上限により、もう一方の粗い候補も除外できます。

## outside.spend-one-more-decimal-digit.title

10進数の桁を1つ増やす

## outside.spend-one-more-decimal-digit.body

指数を{{gridexp}}から{{status}}にすると、間隔が10分の1になり、丸め区間はそのままです。同じ粗い点の係数は $10I$ になります。そこに符号付きの桁を加え、近くの細かい点を係数 $10I+\mathrm{digit}$ で表します。桁が負なら $I$ より左の点を選びますが、入力の符号は変わりません。

## round.move-the-residual-to-the-fine-grid.title

残差を細かい格子へ移す

## round.move-the-residual-to-the-fine-grid.body

粗い格子に有効な点がないことは確認済みです。細かい間隔は粗い間隔の10分の1なので、ずれ $r/Q$ は細かい単位では $10r/Q$ になります。この調整値を丸めて $10I$ に加えればよく、入力全体を丸め直す必要はありません。$Q/2$ を加えて最近接丸めを準備し、負の調整値も数学的な切り下げの除算で扱います。次の計算で省いた誤差を見込み、桁を採用できるか確認します。

## round.round-both-bounds-of-the-omitted-information.title

省いた情報の上下限を丸める

## round.round-both-bounds-of-the-omitted-information.body

表のスケールは下向きに丸められているので、真の残差は固定小数点単位でm未満だけ大きい可能性があります。10倍後の不確かさは10m未満です。両端を切り下げの除算で評価します。上端には安全側の上限をあえて使います。

## round.do-not-accept-a-digit-yet.title

この時点では桁を採用しない

## round.do-not-accept-a-digit-yet.body

次の判定で2つの桁を比較します。一致しても、同距離の境界の判定が通るまでは返せません。上下限を計算するだけでは結果の保証になりません。

## fine.round-a-digit-not-the-whole-float.title

値全体ではなく1桁を丸める

## fine.round-a-digit-not-the-whole-float.body

中心化した残差を10倍して細かい格子へ移し、Q/2を加えて最も近い桁に丸めます。符号付きシフトは負の残差も含めて切り下げの除算を実装します。

## fine.prove-the-digit-cannot-change.title

桁が変わらないと証明する

## fine.prove-the-digit-cannot-change.body

両端の評価は同じ桁{{lower_digit}}です。省いた中心の情報がどの値でも、この桁になります。またTは丸めの境界にちょうど乗っていません。同距離の可能性があれば完全精度の処理が必要です。

## fine.assemble-a-canonical-result.title

末尾の0のない結果を組み立てる

## fine.assemble-a-canonical-result.body

粗い整数Iと保証した細かい桁を合わせます。粗い候補の除外判定から、この桁は非ゼロだと分かります。係数の末尾には0がなく、正規化の追加処理は不要です。

## exact.a-deliberately-excluded-tiny-case.title

意図的に除いた最小付近の例外

## exact.a-deliberately-excluded-tiny-case.body

m = {{m}}は最初の10個の非ゼロの非正規数の1つです。近似経路の保証はこれらを対象外としているので、すぐ完全精度の処理を使います。

## exact.the-coarse-boundary-is-uncertain.title

粗い格子の境界が不確か

## exact.the-coarse-boundary-is-uncertain.body

最初の判定では区間内と証明できませんでした。一方、距離はまだh+m+1以下なので、区間外とも証明できません。表で省いた小さな部分が区間端の判定を変えるかもしれません。

## exact.fine-rounding-needs-more-information.title

細かい桁の丸めに情報が足りない

## exact.fine-rounding-needs-more-information.body.note.yes

下限が10進数の丸めの境界にちょうど乗っています。

## exact.fine-rounding-needs-more-information.body.note.no

両者の差は、省いた情報が丸める桁を変えうることを示します。短絡評価により同距離の判定は省略されます。

## exact.fine-rounding-needs-more-information.body

誤差の上下限を丸めた桁は{{lower_digit}}と{{upper_digit}}です。{{note}} 近似の判定では決めず、完全精度へ進みます。

## exact.recover-the-full-integer-product.title

整数の積の全情報を取り戻す

## exact.recover-the-full-integer-product.body

完全精度の変換は、正規化された64ビットのキャッシュと積の上位・下位の両方を使い、区間端と偶奇を補正します。保証された式によって、浮動小数点演算や回数の定まらない探索なしに決着できます。

## exact.fallback-is-part-of-the-algorithm.title

フォールバックもアルゴリズムの一部

## exact.fallback-is-part-of-the-algorithm.body

判定の不確かさは想定内であり、誤った答えを意味しません。軽い計算では結果を保証できなかったという意味です。完全精度の経路も同じbinary32の区間に対して、最短・最も近い・同距離なら偶数という条件を保ちます。

## resolve.rescale-with-the-complete-cache.title

完全なキャッシュでスケールする

## resolve.rescale-with-the-complete-cache.body

完全精度の変換はk = {{k}}、表の指数p = {{p}}を選び、mを{{shift}}ビット左シフトして位置を合わせます。これは2の累乗の乗算です。積には近似の経路で使えなかった下位の情報も残します。

## resolve.correct-the-radius-for-midpoint-parity.title

中点の偶奇に合わせて半径を補正する

## resolve.correct-the-radius-for-midpoint-parity.body

キャッシュの上半分から、完全精度の小数スケールでの区間の半幅を求めます。2進仮数が偶数なら1単位加え、含まれる中点を反映します。奇数の入力では同距離の中点を含みません。

## resolve.test-the-interval-endpoints.title

区間の両端を調べる

## resolve.test-the-interval-endpoints.body

補正した半径hで隣の粗い点を調べます。upは区間が上側の粗い点に届くこと、downは下側に届くことを表します。剰余はC++の上端判定で使う32ビットの桁あふれを表現しています。

## resolve.round-the-fine-digit-and-correct-a-decimal-tie.title

細かい桁を丸め、同距離を補正する

## resolve.round-the-fine-digit-and-correct-a-decimal-tie.body.detail.yes

この入力はその補正を使います。

## resolve.round-the-fine-digit-and-correct-a-decimal-tie.body.detail.no

この入力はその補正を使いません。

## resolve.round-the-fine-digit-and-correct-a-decimal-tie.body

完全な積の小数部分から細かい桁を計算できます。小さい整数の補正は保証された式の一部です。f = 2³⁰なら小数は正確に1/4で、10倍すると2.5になるため偶数の桁2を選びます。{{detail}}

## resolve.choose-coarse-or-fine-then-normalize.title

粗い・細かいを選び、末尾の0を除く

## resolve.choose-coarse-or-fine-then-normalize.body.yes

粗い点が有効なので、細かい桁を0として結果を作ります。10進数の末尾の0を除き、正規化した係数を返します。

## resolve.choose-coarse-or-fine-then-normalize.body.no

粗い点はどちらも無効です。補正済みの最近接の細かい桁が、最短で最も近い結果になります。区間端と同距離の補正もここで済ませます。

## output.read-the-numeric-components.title

数値の構成要素を読む

## output.read-the-numeric-components.body.yes

特別な指数は無限大・NaNを示します。無限大は係数0、NaNは仮数ペイロードを係数に保ちます。符号も維持します。

## output.read-the-numeric-components.body.no

係数{{sig}}と指数{{exp}}が10進数の絶対値を表します。別の符号を適用すると表示の{{decimal}}になります。

## output.what-shortest-and-closest-mean.title

最短・最も近いとは

## output.what-shortest-and-closest-mean.body

元のbinary32に丸められる10進数のうち、係数の有効桁数が最も少ないものを選びます。その最短の候補の中で正確な2進値に最も近いものを選び、10進数で同距離なら偶数の係数を選びます。符号付きゼロは別に保持します。

## output.separate-conversion-from-formatting.title

変換と文字列の表示を分ける

## output.separate-conversion-from-formatting.body

Boundragonが返すのは数値であり、ASCIIのバッファではありません。ここでの小数点や指数表記は表示のための処理です。ブラウザーでの再読み込みと厳密な区間内の確認は、この例の検査です。ライブラリーの数学的証明の代わりにはなりません。

## output.distinguish-the-payload-from-its-display.title

ペイロードと表示を区別する

## output.distinguish-the-payload-from-its-display.body.yes

NaNという単語だけには、この入力のペイロードや符号は含まれません。それらは数値の係数と符号フィールドに保持されます。表示の単語だけを読み込んでも元のNaNのビット列には戻りません。

## output.distinguish-the-payload-from-its-display.body.no

無限大には有限の丸め区間も最短の係数もありません。符号と特別な構成要素を直接保ち、格子、キャッシュの積、末尾の0の除去は不要です。

## definition.E

格納された指数フィールド。8ビットを符号なし整数として読んだ{{raw}}です。

## definition.F

格納された仮数フィールド。23ビットを符号なし整数として読んだ{{fraction}}です。隠れたビットを加える前の値です。

## definition.s

整数の下にあるビット数。格納された指数を150から引いた値です。整数の近道には、この部分がすべて0であることが必要です。

## definition.T

細かい桁を丸める分子。符号付き残差を10倍し、固定小数点の半単位を加えます。Qで割って切り下げると下限の桁になります。

## definition.d_0

下限側の丸めた細かい桁。下向きに丸めた表による中心に半単位を加え、Qで割って切り下げます。

## definition.d_1

上限側の丸めた細かい桁。同じ分子に省いた誤差の安全側の上限10mを加え、Qで割って切り下げます。

## definition.m.detail.yes



## definition.m.detail.no

（{{m}}）

## definition.m

2進仮数。入力の仮数を整数として読んだ値{{detail}}です。正規数では隠れた先頭の1も含みます。

## definition.q

2進指数。整数仮数に2のこの累乗を掛けます。この入力では{{q}}です。

## definition.e

粗い10進格子の指数。粗い候補同士の間隔は10の{{gridexp}}乗です。細かい格子の指数は1つ小さくなります。

## definition.Q

固定小数点の単位。2⁴⁰ = {{Q}}です。粗い格子の1間隔を、この数の整数単位で表します。

## definition.P.yes

完全なスケーリングの整数積。64ビットのキャッシュと位置を合わせた仮数の積を2³²で割り、切り下げます。

## definition.P.no

丸め用のキャッシュ積。仮数とスケールWを掛け、最近接丸めのため固定小数点の半単位を加えます。

## definition.α

粗い10進格子上での正確な2進の間隔。2の2進指数乗を粗い10進間隔で割った値です。

## definition.W

表に保存したスケール。10進格子上の2進の間隔にQを掛け、切り下げた整数の近似です。

## definition.I.detail.yes

（{{integral}}）

## definition.I.detail.no



## definition.I

粗い候補。スケールした入力に最も近い整数{{detail}}です。10のe乗を掛けると10進数の絶対値になります。

## definition.r

中心化した残差。粗い候補からの符号付きのずれを固定小数点単位で表します。負なら候補の左側です。

## definition.a

残差の距離。符号付きのずれrの絶対値です。左右の方向を除いた粗い候補までの距離です。

## definition.h.yes

完全精度の処理が使う32ビットの小数スケールでの区間の半幅。区間端と偶奇を補正します。前のQ40のhとは別のスケールです。

## definition.h.no

半径の下限。丸め区間の幅の半分の下限を、残差と同じ固定小数点単位で表します。

## definition.shift

右にシフトするビット数。整数の近道が有効なのは、捨てるビットがすべて0の場合だけです。

## definition.digit

10Iに加える符号付きの細かい桁。間隔が10分の1の10進格子から1点を選びます。

## definition.k

完全精度の処理の10進指数（{{k}}）。この処理の粗い格子の指数はk+1です。

## definition.p

キャッシュの指数（{{p}}）。−k−1に等しく、正規化した10進スケールを選びます。

## definition.f

完全なキャッシュ積から取り出した、完全精度の処理の32ビット小数位置。

## definition.sig

10進係数{{sig}}。有限の結果では末尾に10進数の0がありません。

## definition.exp

10進指数{{exp}}。有限の係数に10のこの累乗を掛けます。10000は無限大・NaNを表す特別な値です。

## definition.negative

入力から保った符号ビット。絶対値の計算の後に適用します。ゼロにも適用します。

## definition.integer

10進数の末尾の0を除く前の、正確な整数係数。

## definition.cache

厳密な計算に使う、正規化した完全なキャッシュの乗数。

## definition.high

完全な64ビットのキャッシュの上位32ビット。

## definition.δ

キャッシュで省いた位置の誤差。0以上m未満です。

## definition.margin

中心と半径の誤差を見込んだ後に残る、区間の半径までの余裕。

## definition.digit_final

同距離なら偶数にする補正を適用した後の細かい桁。

## definition.sig_0

末尾の0を除く前の10進係数。

## definition.up

上側の粗い候補が区間内か。係数を組み立てるときは成立を1、不成立を0として使います。

## definition.down

下側の粗い候補が区間内か。

## lead.decode

格納されたビットから始めます。符号と2進の絶対値、そして正規数・非正規数・ゼロ・無限大・NaNのどれかが分かります。

## lead.check-nonfinite

まず有限値かどうかを決めます。指数がすべて1なら、無限大とNaNの専用の戻り経路へ進みます。

## lead.check-power

隠れたビットを加える前の仮数部を調べます。仮数部が0なら、生成済みの表でゼロか2の累乗を直接返せます。

## lead.check-integer-range

整数の近道の対象範囲かを決めます。成立した場合だけ、内側のビット判定に進みます。

## lead.check-integer-bits

範囲の判定は成立しました。整数へのシフトで非ゼロのビットを捨てないか調べます。

## lead.check-tiny

保証付き近似の前に小さな例外集合を調べます。最初の10個の非ゼロの非正規数は完全精度で処理します。

## lead.scale

整数乗算1回で2進の絶対値を10進格子の座標へ移します。近い粗い候補と、近似によって中心が動く量の上限を求めます。

## lead.check-coarse

誤差の上限から、最も近い粗い10進数の点が丸め区間の安全な内側だと証明できるでしょうか。

## lead.coarse

近似の誤差を見込んでも粗い10進数の点が丸め区間内だと証明し、不要な末尾の0を除きます。

## lead.check-boundary

粗い候補が区間内だとは保証できませんでした。完全精度が必要なほど境界が不確かか、それとも確実に区間外で細かい格子を試せるかを決めます。

## lead.outside

粗い格子の候補が丸め区間外だと証明します。結果には、間隔が10分の1の細かい格子が必要です。

## lead.round

近似誤差の上下限で細かい桁を計算します。次の判定で、この桁を安全に返せるかを決めます。

## lead.check-fine-change

許される近似誤差によって、丸めた細かい桁が変わるでしょうか。変わるならすぐ完全精度へ進みます。

## lead.check-fine-tie

丸めた桁は一致しました。次に、下限の計算が同距離になる境界にちょうど乗っていないか調べます。

## lead.fine

許されるどの近似誤差でも同じ細かい桁になることを確認します。丸めが安定し、同距離の境界も避けていれば、その桁を安全に返せます。

## lead.exact

軽い計算ではこの入力の結果を保証できませんでした。完全な整数の計算で、区間端と10進数の丸めを決着します。

## lead.resolve

完全な積を使って隣の粗い点を調べます。どちらも入らなければ最も近い有効な細かい桁を選び、同距離なら偶数にします。

## lead.special.yes

生成済みの表が、この正確な2の累乗に対する最短の10進数をすでに持っています。

## lead.special.no.yes

ゼロを直接返し、符号を保ちます。

## lead.special.no.no

無限大・NaNの構成要素を直接返し、元の符号とペイロードを保ちます。

## lead.integer

捨てる小数部分の2進ビットはすべて0です。対象の大きな整数は、シフトと10進数の末尾の0の除去だけで返せます。

## lead.output

返された3つの構成要素、符号・整数係数・10進指数を読みます。表示の10進数はこれらを表したものです。

## next.yes

次へ：{{count}}。

## next.no

変換が完了しました。別の入力を試したり、各ステップを見直したりできます。
