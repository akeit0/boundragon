# binary64 explanation — ja

<!-- SPDX-License-Identifier: Unlicense -->

## definition.E

格納された11ビットの指数{{raw}}。0は非正規数・ゼロ、2047は無限大・NaNです。

## definition.F

格納された52ビットの仮数部{{fraction}}。隠れたビットを加える前の値です。

## definition.m

整数として読んだ2進仮数{{m}}。正規数は52ビット目に先頭の1を復元します。

## definition.q

2進指数。この入力では $q={{q}}$ で、$|x|=m\,2^q$ です。

## definition.s

捨てる2進のビット数。1075から格納された指数を引きます。

## definition.k

細かい10進格子の指数。隣の粗い格子は指数k+1です。

## definition.p

10進キャッシュの指数−k−1。正規化した10の累乗を選びます。

## definition.fs

位置を合わせる左シフト数。8〜11で、積の上位Wordに小数部分11ビットを残します。

## definition.hi

キャッシュの上位64ビット。省いた下位Wordの影響は保証された誤差の上限に含めます。

## definition.b

10の累乗の2進指数$\lfloor\log_2(10^p)\rfloor$。入力の2進指数qとは別です。

## definition.T

正規化した10の累乗$10^p\times2^{63-b}$。範囲は[2⁶³,2⁶⁴)で、キャッシュhiはその切り下げです。

## definition.n

位置を合わせた整数仮数$m\times2^{\mathrm{fs}}$。64ビットに収まります。

## definition.z

粗い格子の間隔で測った入力の絶対値$|x|/10^{k+1}$。整数が粗い格子、0.1刻みが細かい格子です。

## definition.Y

厳密なスケーリング後の位置2048z。1単位は粗い格子の間隔の1/2048です。

## definition.v

中心化した近似u+1。粗い候補を取り出すための半間隔のバイアスを加える前の値です。

## definition.centered

vに半間隔1024を加えた値。その商と余りからIとwを得ます。

## definition.ρ

同じ1/2048単位で測った厳密な丸め区間の半径。整数半径hはその切り下げです。

## definition.u

位置を合わせた仮数と上位キャッシュの積の上位64ビット。

## definition.I

中心化した積から得る粗い整数候補。$10^{k+1}$を掛けると10進値になります。

## definition.w

符号付きの中心化した残差。範囲は[−1024,1023]で、粗い間隔の1/2048が単位です。

## definition.h.yes

64ビット小数単位で補正した厳密な区間半径。高速経路の半径とは別のスケールです。

## definition.h.no

現在のスケールでの区間半径。2の累乗の手続きでは下側の半径が小さくなります。

## definition.d

符号付きの境界との差|w|−h。0と1が不確かで、負なら粗い点が区間内です。

## definition.c

粗い候補のマスク。d<0なら−1、それ以外は0。粗い候補では細かい桁とその判定を抑制します。

## definition.R

細かい桁の丸めの分子5w+512。1024で割る計算は(10w+1024)/2048と等価です。

## definition.g

細かい桁の不確かさの判定値。R+5の下位10ビットと符号なしの粗いマスクのOR。10以下なら完全精度が必要です。

## definition.tail

細かい格子の単位で $10I$ に加える符号付きの調整値（−5〜5）。粗い格子を選ぶマスクが有効なら0になります。

## definition.P

完全なスケーリングの整数積。cacheと位置を合わせた仮数の積を$2^{64}$で割り、切り下げます。

## definition.cache

完全精度の計算用に復元した、正規化した128ビットの10の累乗。

## definition.shift

完全な積または2の累乗の計算用の左シフト数。通常経路のfsとは別です。

## definition.integer

10進数の末尾の0を除く前の、正確な整数係数。

## definition.digit

完全な小数位置から選ぶ、細かい格子の桁。

## definition.up

上側の粗い候補が丸め区間に含まれるとき成立。

## definition.down

下側の粗い候補が丸め区間に含まれるとき成立。

## definition.boundary

境界の判定0 ≤ d < 2の結果。

## definition.rounding

細かい丸めの判定g ≤ 10の結果。

## definition.low.yes

復元したキャッシュの下位64ビット。

## definition.low.no

バイアスを加えた桁の積の下位64ビット。limitと比較します。

## definition.limit

省いた誤差を加えても、上位の桁へ桁上がりしない下位Wordの最大値。

## definition.sig_0

末尾の0を除く前の10進係数。

## definition.exp_0

末尾の0を除く前の10進指数。

## definition.f

完全精度の処理の64ビットの小数位置。2の累乗の手続きでは上下限を持つ位置です。

## definition.error

2の累乗の小数スケールで、省いた下位キャッシュの影響の最大値。

## definition.upper

2の累乗の小数位置の最大値f + error。両者のビットは重なりません。

## definition.half

非対称な2の累乗の場合の下側の半径。h/2を切り下げます。

## definition.sig

正規化した10進係数{{sig}}。有限の非ゼロの結果は末尾に0がありません。

## definition.exp

10進指数{{exp}}。10000は無限大・NaNを示す特別な値です。

## definition.negative

入力から保った符号。ゼロも含め、絶対値の計算後に適用します。

## decode.read-all-64-bits.title

64ビットを読む

## decode.read-all-64-bits.body

{{bits}}は符号1ビット、指数11ビット、仮数部52ビットを格納します。正規数は隠れた先頭の1を復元すると、2進の有効桁53ビットになります。

## decode.restore-this-binary-value.title

この2進数の値を復元する

## decode.restore-this-binary-value.body.yes

指数2047は無限大・NaNなので、有限値の式は作りません。

## decode.restore-this-binary-value.body.no.yes

非正規数には隠れたビットがなく、間隔は2⁻¹⁰⁷⁴です。

## decode.restore-this-binary-value.body.no.no

指数のバイアス1023と、格納された仮数の小数部分52ビットを引きます。

## decode.use-the-binary64-interval.title

binary64の区間を使う

## decode.use-the-binary64-interval.body

最短の10進数は同じ64ビットに丸めて戻る必要があります。binary32の区間はより広く、別の問題になります。符号は別に適用します。

## check-special.dispatch-before-the-approximation.title

近似の前に経路を選ぶ

## check-special.dispatch-before-the-approximation.body

指数0ではゼロも非正規数も専用の低速処理へ進みます。指数2047なら無限大・NaNのペイロードを直接返します。binary32とは異なり、binary64の非ゼロの非正規数はすべて完全精度で処理します。

## check-integer-range.cover-exact-integers-below-2.title

2⁵³未満の正確な整数を対象にする

## check-integer-range.cover-exact-integers-below-2.body

整数の近道は1 ≤ |x| < 2⁵³を調べます。指数1023〜1075では右シフト数が52〜0です。小数ビットの判定は内側にあり、この範囲内でだけ評価します。

## check-integer-bits.no-nonzero-bit-may-be-discarded.title

非ゼロのビットを捨てない

## check-integer-bits.no-nonzero-bit-may-be-discarded.body

s = 1075 − Eです。仮数部の下位sビットがすべて0なら、シフトで正確な整数になります。2の累乗の判定より先なので、この範囲の2の累乗もここで返します。

## integer.shift-then-remove-decimal-zeroes.title

シフトし、10進数の末尾の0を除く

## integer.shift-then-remove-decimal-zeroes.body

捨てるビットはすべて0でした。指数0の正確な係数です。モジュラ逆数と回転の判定で最初の0を除き、8・4・2・1個のまとまりを調べます。回数の定まらないループはありません。

## check-power.a-dedicated-asymmetric-interval-procedure.title

非対称な区間の専用手続き

## check-power.a-dedicated-asymmetric-interval-procedure.body

整数の近道は不成立か対象外でした。仮数部0なら残った2の累乗です。下側の隣との間隔は通常上側の半分なので、通常の対称な判定は使いません。

## scale.measure-the-input-on-the-decimal-grids.title

入力を10進格子上の位置に変換する

## scale.measure-the-input-on-the-decimal-grids.body

10進格子は、整数係数に同じ10の累乗を掛けた候補の集合です。ここでは $k$ が**細かい**指数で、細かい間隔は $10^k$、粗い間隔は $10^{k+1}$ です。粗い点は細かい点でもありますが、正規化前の係数に必要な10の因子が1つ少なくなります。

$k$ は絶対値 $|x|$ ではなく、**2進数の間隔** $2^q$ から選びます。細かい間隔はそれ以下で、粗い間隔はそれより大きくなります。この左右対称の経路では丸め区間の幅は $2^q$ なので、粗い点は最大1個しか入らず、最も近い細かい点から有効な答えが得られます。有効桁を減らすため粗い点を先に調べ、入らなければ最も近い細かい点を選びます。2つの格子の見取り図で、この入力の候補を厳密に判定できます。

ビットから $|x|=m\,2^q$ を復元しました。区間全体を $10^{k+1}$ で割ると、包含関係を保った座標 $z$ が得られます。粗い候補は整数、細かい候補は0.1刻みです。整数の積では $2048z$ を近似するので、取り出した1単位は粗い間隔の $1/2048$ に当たります。近い整数、その点からの符号付きのずれ、丸め区間の半径を、この共通の単位で求めます。

## scale.choose-a-power-from-a-finite-cache.title

有限範囲のキャッシュから10の累乗を選ぶ

## scale.choose-a-power-from-a-finite-cache.body

10進格子へのスケーリングには10の累乗が必要です。大きな $10^p$、または $p<0$ のときの逆数を求め、必要な精度へ正規化するには、入力ごとに大きな整数の累乗と除算が必要になります。キャッシュはこの計算を事前に済ませ、変換時は乗数を1つ選ぶだけにします。

細かい格子の指数 $k$ は、決まった整数の乗算とシフトで求めます。正規数全体の $-1074\le q\le971$ から $-324\le k\le292$、$-293\le p\le323$ が得られ、**必要な10の累乗は617種類**です。保存する表は{{cache_min}}〜{{cache_max}}の{{cache_entries}}項目で、最後の{{cache_max}}はこの通常経路では使いません。この入力が選ぶキャッシュの添字は{{cache_index}}です。

## scale.normalize-the-cached-multiplier-to-64-bits.title

乗算用の10の累乗を64ビットに正規化する

## scale.normalize-the-cached-multiplier-to-64-bits.body

$10^p$ は、小さい分数にも大きい整数にもなります。その2進指数 $b$ を分けて仮数を $[2^{63},2^{64})$ へ移します。この正規化した厳密な乗数を $T$ とし、切り下げた整数 $\mathrm{hi}$ をキャッシュに保存します。省いた小数部分は1未満です。この入力のキャッシュのWordは `{{bits}}` です。完全な計算では128ビットの乗数を復元できますが、この近似は上位64ビットを読みます。

## scale.one-64-64-bit-product-retain-its-upper-half.title

64ビット同士を1回掛け、積の上位半分を取る

## scale.one-64-64-bit-product-retain-its-upper-half.body

@notation q b

53ビットの仮数を $\mathrm{fs}$ ビット左へシフトして位置を合わせ、その整数を $n$ とします。これにより、取り出す積は粗い格子1間隔を2048単位で表します。正規数のすべての指数で $8\le\mathrm{fs}\le11$ なので、$n$ は64ビットに収まります。シフト数は格納された2進指数を添字とする表から読みます。

$n$ とキャッシュのWord $\mathrm{hi}$ を掛けると128ビットの積になります。その上位64ビットを取る操作は、$2^{64}$ で割って切り下げることです。整数乗算1回で、10進格子上の近似の位置 $u$ が得られます。

## scale.bound-both-sources-of-omitted-information.title

省いた2種類の情報による誤差を保証する

## scale.bound-both-sources-of-omitted-information.body

情報を省く操作は2つあります。厳密な乗数 $T$ を切り下げた $\mathrm{hi}$ に置き換えることと、積の下位64ビットを捨てることです。$n<2^{64}$、$0\le T-\mathrm{hi}<1$ なので、前者の損失はスケーリング後の1単位未満です。後者も1単位未満で、どちらも下向きに丸めるため、合計は2未満です。下の不等式は近似 $u$ と厳密な位置 $Y$ を直接比較しています。

## scale.why-add-1025-and-why-keep-eleven-bits.title

1025を加える理由と、11ビットの意味

## scale.why-add-1025-and-why-keep-eleven-bits.body

粗い格子1間隔は2048単位、半間隔は1024単位です。まず1を加えて下向きの誤差を中心化し、位置 $v$ を定めます。さらに1024を加えると、最も近い粗い整数を選べます。実装ではこの2つを1025の加算にまとめます。商が候補 $I$、下位11ビットから1024を引いた値が符号付きのずれ $w$ です。負のずれは、入力の近似が $I$ の左にあることを表します。

## scale.get-the-interval-radius-from-the-same-cached-word.title

同じキャッシュから丸め区間の半径も求める

## scale.get-the-interval-radius-from-the-same-cached-word.body

隣の間隔が非対称になる2の累乗は、先の専用経路で処理済みです。この通常経路では隣の2進数との差が $2^q$ なので、丸め区間の半幅は $2^{q-1}$ です。同じ粗い間隔の1/2048単位で半径を測り、$\rho$ とします。その切り下げ $h$ は $\mathrm{hi}$ のシフトから得られ、この切り下げが正確であることは証明されています。次の判定では $|w|$ と $h$ を比べ、残る不確かさが細かい桁を変えるか調べます。

## scale.what-is-stored-and-what-is-reconstructed-only-when-needed.title

保存する表と、必要になったときだけ復元する情報

## scale.what-is-stored-and-what-is-reconstructed-only-when-needed.body

上位Wordの表は{{cache_entries}}項目 × 8 = {{highBytes}}バイトです。シフト表は特殊値の指数も含めた{{shift_entries}}項目で、各1バイトです。完全な累乗は128ビットの基準値{{major_entries}}個、64ビットの小さい累乗{{minor_entries}}個から復元し、{{compactBytes}}バイトで保持します。{{cache_entries}}個の128ビット値をすべて保存する{{full_cache_bytes}}バイトの表は必要ありません。これらの配列の合計は{{total_cache_bytes}}バイトです。通常経路で答えを保証できれば下位キャッシュの復元は不要で、不確かなガードに限って完全な計算へ進みます。

## check-boundary.only-distances-zero-and-one-are-uncertain.title

差が0と1のときだけ不確か

## check-boundary.only-distances-zero-and-one-are-uncertain.body

C++の符号なし比較では負のdは成立しません。数学的には0 ≤ d < 2と等価です。この2つの境界帯は上位Wordの近似だけでは保証できません。この結果によって細かい丸めの判定が省略されることはありません。

## check-rounding.guard-a-narrow-fine-rounding-window.title

細かい丸めの狭い境界帯を調べる

## check-rounding.guard-a-narrow-fine-rounding-window.body

剰余の項が丸めの境界を検出します。c = −1なら符号なしの値とのORでg = 2³²−1となり、粗い点が区間内のときの細かい桁の不確かさを抑えます。それ以外でg ≤ 10なら完全精度を要求します。境界の判定が成立していても、この判定を評価します。

## check-ambiguity.combine-two-already-evaluated-results.title

評価済みの2つの結果を合わせる

## check-ambiguity.combine-two-already-evaluated-results.body

元の式は真偽値のビットORを使い、短絡ORではありません。両方の判定を実行済みです。どちらかが不確かなら元のビットを完全精度の計算へ渡し、両方とも不成立なら近似から結果を保証できます。

## choose.select-the-signed-fine-adjustment.title

細かい格子への調整値を求める

## choose.select-the-signed-fine-adjustment.body

粗い候補の値は $I\times10^{k+1}$ です。細かい格子では同じ値の係数が $10I$ になり、1間隔ごとに係数が1変わります。粗い単位での中心化したずれ $w/2048$ は、細かい単位では $10w/2048$ です。半間隔を足した切り下げの除算で調整値 $\mathrm{tail}$ を丸め、細かい係数 $10I+\mathrm{tail}$ を得ます。省いた情報でこの選択が変わらず、同距離も隠れないことは、先の判定で保証済みです。粗い点が有効ならマスクで調整値を0にします。負の調整値は $I$ より左へ動く意味で、入力の符号とは無関係です。

## check-tail.avoid-an-unnecessary-multiply-divide-pair.title

不要な乗算と除算を避ける

## check-tail.avoid-an-unnecessary-multiply-divide-pair.body

$\mathrm{tail}=0$ なら $I\times10^{k+1}$ なので、$I$ を10倍してすぐ10で割る操作を省き、直接正規化します。$\mathrm{tail}\ne0$ なら、係数 $10I+\mathrm{tail}$ と指数 $k$ をそのまま返します。調整値は−5〜5なので、非ゼロの場合には係数の末尾も0になりません。

## fine.return-the-certified-grid-point.title

保証した格子の点を返す

## fine.return-the-certified-grid-point.body.yes

粗い格子が最短の候補を与えます。決まったまとまりで末尾の0を除きます。細かい格子は不要な桁を増やします。

## fine.return-the-certified-grid-point.body.no

粗い候補は除外され、細かい丸めは安定しています。前の判定で $\mathrm{tail}\ne0$ が確定したので、$\mathrm{sig}=10I+\mathrm{tail}$、$\mathrm{exp}=k$ を直接返します。末尾の0を除く処理は不要です。

## exact.why-this-input-needs-the-complete-finish.title

この入力に完全精度が必要な理由

## exact.why-this-input-needs-the-complete-finish.body.yes

非ゼロの非正規数はすべて、正規数の上位Wordの経路を迂回します。厳密な処理は固定のk = −324、シフト8、$10^{323}$の完全なキャッシュを使います。

## exact.why-this-input-needs-the-complete-finish.body.no

一方または両方の不確かさの判定が精度を要求しました。近似では答えを保証できなかったという想定内の分岐で、誤った結果ではありません。

## exact.recover-both-cache-limbs.title

キャッシュの両方のWordを取り戻す

## exact.recover-both-cache-limbs.body

大きい累乗と小さい累乗から、正確な上位Wordを持つ係数CまたはC+1を復元します。補正ビットマップを使わずに同じ丸め判定ができることを証明しています。両方のWordを掛け、高速経路で省いた区間の情報を取り戻します。

## resolve.use-the-complete-integer-product.title

整数の積の全情報を使う

## resolve.use-the-complete-integer-product.body

完全なスケーリングの積から、粗い整数部分と64ビットの小数位置を取り出します。シフトは厳密な処理用で、高速経路のfsとは別です。

## resolve.correct-endpoints-for-binary-parity.title

2進の偶奇で区間端を補正する

## resolve.correct-endpoints-for-binary-parity.body

仮数が偶数ならhに1単位を加え、含まれる同距離の中点を反映します。upは上側の粗い点での符号なしの桁あふれを、downは下側の点を調べます。

## resolve.choose-a-grid-and-resolve-decimal-ties.title

格子を選び、10進の同距離を決着する

## resolve.choose-a-grid-and-resolve-decimal-ties.body

有効な粗い点があれば細かい丸めより優先します。それ以外は完全な小数位置、保証された+6の補正、および$f=2^{62}$の例外を使います。1/4の10倍は2.5で、同距離なら偶数の桁2を選びます。粗い結果か桁0の結果だけ正規化します。

## power-scale.scale-an-asymmetric-power-interval.title

非対称な2の累乗の区間をスケールする

## power-scale.scale-an-asymmetric-power-interval.body

仮数は正確に$2^{52}$なので、乗算を上位キャッシュのシフトとして計算できます。全2,046個の正規指数について、上位Wordだけの小数位置が完全なキャッシュと同じ格子と細かい桁を選ぶことを証明しています。下側の半径はh/2です。

## check-power-coarse.certify-a-coarse-point-over-the-error-interval.title

2の累乗の粗い格子を選ぶ

## check-power-coarse.certify-a-coarse-point-over-the-error-interval.body

上向きの桁あふれなら上側の粗い点を選びます。それ以外でhalf > fなら下側の点を選びます。全ての正規の2の累乗で、上位Wordだけの判定が完全なキャッシュと一致します。粗い答えはすぐ正規化します。







## power-result.return-the-specialized-power-answer.title

専用手続きの答えを返す

## power-result.return-the-specialized-power-answer.body

粗い区間端の判定または細かい桁から、最短で最も近い答えを選びました。細かい桁は必ず1〜9で、末尾の0はありません。入力の符号は最後に付けます。

## special.return-special-components-directly.title

特殊値の構成要素を直接返す

## special.return-special-components-directly.body.yes

ゼロは係数0、指数0で元の符号を保ちます。

## special.return-special-components-directly.body.no

無限大は特別な指数10000、係数0です。NaNは元の52ビットのペイロードを係数に保ち、符号も維持します。

## output.read-the-returned-numeric-components.title

返された数値の構成要素を読む

## output.read-the-returned-numeric-components.body.yes

特別な指数が無限大・NaNを示します。表示された単語だけではNaNのペイロードを復元できません。

## output.read-the-returned-numeric-components.body.no

符号、係数、指数を合わせて{{decimal}}を表します。最短とはこのbinary64入力へ戻る10進数の有効桁が最少という意味で、その中から最も近いものを選び、同距離なら偶数にします。

## output.conversion-is-separate-from-formatting.title

変換と表示は別の仕事

## output.conversion-is-separate-from-formatting.body

Boundragonが返すのはASCIIではなく数値の構成要素です。このページはそれを表示し、例の再読み込みを確認します。BigIntの実行時間はC++の性能ではありません。

## guard.follow-the-evaluated-decision.title

評価した判定をたどる

## guard.follow-the-evaluated-decision.body.detail.yes

成立

## guard.follow-the-evaluated-decision.body.detail.no

不成立

## guard.follow-the-evaluated-decision.body

{{detail}}。{{nextaction}} 実行した比較には結果があり、省いた比較には架空の結果を付けません。

## lead.decode

64ビットを読み、仮数と指数を復元します。

## lead.check-special

正規数の高速経路か、専用の処理かを選びます。

## lead.check-integer-range

2⁵³未満の正確な整数の対象範囲か調べます。

## lead.check-integer-bits

シフトで捨てるのが0だけか証明します。

## lead.integer

10進の末尾の0を除き、正確な整数を返します。

## lead.check-power

整数の経路の後で、残った2の累乗を調べます。

## lead.scale

入力の絶対値を10進格子上の位置へ変換します。1回の整数乗算から粗い候補とその候補からのずれを求め、同じキャッシュから区間の半径も得ます。

## lead.check-boundary

境界との差が不確かな帯に入るでしょうか。

## lead.check-rounding

境界の結果によらず、細かい丸めの不確かさを評価します。

## lead.check-ambiguity

両方の判定は実行済みです。どちらかが不確かなら完全精度を要求します。

## lead.choose

符号付きの調整値tailを求め、粗い格子を選ぶ場合はマスクで0にします。

## lead.check-tail

調整値tailが0かを判定し、粗い候補の正規化と細かい候補の直接返却を分けます。

## lead.coarse

保証した粗い点を使い、係数を正規化します。

## lead.fine

非ゼロの調整値tailから係数と指数を直接返します。末尾の0を除く必要はありません。

## lead.exact

非正規数や不確かな判定に必要な精度を取り戻します。

## lead.resolve

完全な積で区間端を決め、10進の同距離を補正します。

## lead.power-scale

上位キャッシュをシフトします。全ての2の累乗の判定は下位Wordの復元なしで保証されています。

## lead.check-power-coarse

上位Wordだけの小数位置が粗い結果を選ぶでしょうか。





## lead.power-result

2の累乗の専用手続きが選んだ答えを返します。

## lead.special

特殊値の構成要素を直接返し、符号とペイロードを保ちます。

## lead.output

別々の符号、整数係数、10進指数を読みます。

## next.step

次へ：{{title}}。

## next.complete

変換が完了しました。別の入力を試したり、各ステップを見直したりできます。
