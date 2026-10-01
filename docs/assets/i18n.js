// SPDX-License-Identifier: Unlicense
// Presentation only: the conversion trace and caches stay shared.
let language='en';
export const locale=()=>language;
export const bi=(en,ja)=>language==='ja'?ja:en;
export function setLanguage(value){language=value==='ja'?'ja':'en';}
const words=new Map([
  ['Just above 1','1の直上'],
  ['Decode the bits','ビットを読み解く'],['Check for infinity or NaN','無限大・NaNの判定'],['Check for zero or a power of two','ゼロ・2の累乗の判定'],
  ['Check the integer-shortcut range','整数の近道を使う範囲か'],['Check the discarded binary bits','捨てるビットはすべて0か'],['Check the tiny-subnormal exception','最小付近の非正規数の例外'],
  ['One Q40 product','Q40精度の乗算を1回'],['Test the coarse acceptance guard','粗い格子の採用判定'],['Certify the coarse grid','粗い格子の候補を保証'],
  ['Test the boundary-uncertainty guard','区間境界の不確かさを判定'],['Exclude the coarse grid','粗い格子の候補を除外'],['Compute the fine rounding bounds','細かい桁の丸めの上下限'],
  ['Test whether the fine digit changes','細かい桁が変わるか'],['Test the fine tie threshold','同距離になる境界の判定'],['Certify the fine grid','細かい格子の候補を保証'],
  ['Exact fallback','完全精度へのフォールバック'],['Resolve the two grids','完全精度で2つの格子を決着'],['Canonical decimal','正規化した10進数'],['Exact integer shortcut','正確な整数の近道'],
  ['Power lookup','2の累乗の表引き'],['Signed zero','符号付きゼロ'],['Infinity','無限大'],['NaN payload','NaNのペイロード'],['Power of two','2の累乗'],
  ['Boundary guard','区間境界の判定'],['Fine digit guard','細かい桁の判定'],['Fine tie guard','同距離の判定'],['Smallest subnormal','最小の非正規数'],['Smallest normal','最小の正規数'],['Largest finite','最大の有限値'],
  ['Coarse grid accepted','粗い格子を採用'],['Fine grid accepted','細かい格子を採用'],['Integer shortcut','整数の近道'],['Nonfinite','無限大・NaN'],
  ['Return the nonfinite components.','無限大・NaNの構成要素を返します。'],['Continue to the zero/power check.','ゼロ・2の累乗の判定へ進みます。'],
  ['Use the generated zero/power result.','生成済みのゼロ・2の累乗の結果を使います。'],['Check the selected integer range.','整数の近道の対象範囲か調べます。'],
  ['Test whether the discarded binary bits are zero.','捨てる2進ビットがすべて0か調べます。'],['Bypass the integer-bit test and check the tiny-subnormal case.','整数のビット判定を省略し、最小付近の非正規数を調べます。'],
  ['Return the exact integer shortcut.','正確な整数の近道で結果を返します。'],['Continue to the tiny-subnormal check.','最小付近の非正規数の判定へ進みます。'],
  ['Use the complete exact finish.','完全精度の処理で決着します。'],['Form the exponent-indexed Q40 product.','指数に対応する表を使い、Q40の積を作ります。'],
  ['Accept and normalize the coarse point.','粗い格子の候補を採用し、末尾の0を除きます。'],['The coarse point is not certified; evaluate the boundary guard.','粗い候補をまだ保証できません。区間境界を調べます。'],
  ['Use exact fallback to resolve the uncertain boundary.','完全精度の処理で不確かな境界を決着します。'],['The coarse grid is certainly outside; prepare the fine digit.','粗い候補は確実に区間外です。細かい桁を計算します。'],
  ['Use exact fallback; the tie test is not evaluated.','完全精度の処理へ進みます。同距離の判定は評価しません。'],['Evaluate the fine tie-threshold guard.','細かい桁が同距離の境界にあるか調べます。'],
  ['Use exact fallback to resolve the tie.','完全精度の処理で同距離の場合を決着します。'],['Accept the stable, non-tie fine digit.','変動せず、同距離でもない細かい桁を採用します。'],
  ['Decode binary32','binary32を解読'],['Nonfinite?','無限大・NaN？'],['sentinel','特別な指数'],['Zero or power?','ゼロ・2の累乗？'],['Zero / power','ゼロ・2の累乗'],['lookup','表引き'],
  ['Integer range?','整数の対象範囲？'],['Integer bits zero?','捨てるビットが0？'],['Integer','整数'],['normalize','末尾の0を除去'],['Tiny subnormal?','最小付近の例外？'],
  ['Scale significand','仮数を10進格子へ'],['Coarse point safe?','粗い候補は安全？'],['Coarse grid','粗い格子'],['Boundary uncertain?','境界が不確か？'],['Exclude coarse grid','粗い候補を除外'],
  ['Round fine digit','細かい桁を丸める'],['Digit changes?','桁が変わる？'],['On a tie threshold?','同距離の境界？'],['Fine grid','細かい格子'],['Already canonical','末尾の0なし'],
  ['Exact','完全精度'],['fallback','フォールバック'],['Resolve','決着'],['Decimal components','10進数の構成要素'],['True','成立'],['False','不成立'],['TRUE','成立'],['FALSE','不成立'],['true','成立'],['false','不成立'],
  ['Infinity / NaN check','無限大・NaNの判定'],['Zero / power check','ゼロ・2の累乗の判定'],['Integer range check','整数の対象範囲の判定'],['Discarded integer bits','捨てる整数ビットの判定'],
  ['Tiny subnormal check','最小付近の非正規数の判定'],['Coarse acceptance guard','粗い候補の採用判定'],['Boundary uncertainty guard','区間境界の不確かさの判定'],['Fine digit-change guard','細かい桁の変動の判定'],['Fine tie-threshold guard','細かい桁の同距離の判定'],
  ['Random finite bits','ランダムな有限値のビット'],['Random 1–6-digit decimals','ランダムな1〜6桁の10進数'],['First ten subnormals','最初の10個の非正規数'],['Boundary uncertainty','境界の不確かさ'],['Fine digit changes','細かい桁の変動'],['Fine tie threshold','細かい桁の同距離'],
  ['not reached','未到達'],['0 observed','観測0件'],['Not reached in this sample','この標本では未到達'],['Coarse accepted','粗い候補の採用'],['Fallback','フォールバック'],
  ['Enter 1–8 hex digits, optionally starting with 0x.','16進数を1〜8桁で入力してください。先頭の0xは省略できます。'],['Use at most 4096 input characters.','入力は4096文字以内にしてください。'],['Enter a decimal number, Infinity, -Infinity, or NaN.','10進数、Infinity、-Infinity、NaNのいずれかを入力してください。'],
  ['Sign · 1 bit','符号 · 1ビット'],['Exponent · 8 bits','指数 · 8ビット'],['Fraction · 23 bits','仮数部 · 23ビット'],['negative','負'],['positive','正'],
  ['Coarse','粗い'],['Fine','細かい'],['exact float magnitude','浮動小数点値の正確な絶対値'],['selected decimal','選ばれた10進数'],
  ['exponent field E','指数フィールド E'],['fraction field F','仮数フィールド F'],['significand','2進仮数'],['discarded bits','捨てるビット'],['left side','左辺'],['right side','右辺'],['right shift','右シフト'],
  ['decimal grid exponent','10進格子の指数'],['m × W + Q/2','m × W + Q/2'],['lower digit','下限の桁'],['upper digit','上限の桁'],['tie test evaluated','同距離の判定を評価'],['normalize','末尾の0を除去'],
  ['raw bits','元のビット'],['browser binary32 value','ブラウザーが表示するbinary32値'],['exact magnitude','正確な絶対値'],['magnitude lower midpoint','絶対値の下側の中点'],['magnitude upper midpoint','絶対値の上側の中点'],['midpoint ties','中点の扱い'],['negative input','負の入力'],['included (even)','含む（仮数が偶数）'],['excluded (odd)','含まない（仮数が奇数）'],['Negate and reverse the two magnitude endpoints.','絶対値の両端を符号反転し、大小を入れ替えます。'],
  ['coefficient','係数'],['exponent','指数'],['removed zero groups','除いた0のまとまり'],['none','なし'],['sign','符号'],['sign bit','符号ビット'],['exponent bits','指数ビット'],['fraction bits','仮数ビット'],['fraction','仮数部'],['binary significand','2進仮数'],['binary exponent','2進指数'],['exponent field','指数フィールド'],['fraction field','仮数フィールド'],['fraction / payload','仮数部 / ペイロード'],['binary exponent q','2進指数 q'],['table index','表の項目'],['stored coefficient','表の係数'],['stored exponent','表の指数'],['strict inequality','厳密な不等式'],['raw coefficient','正規化前の係数'],['raw exponent','正規化前の指数'],['coefficient = 10I + digit','係数 = 10I + digit'],['product','積'],['integral','整数部分'],['cache','キャッシュ'],['up','上側の粗い点に届く'],['down','下側の粗い点に届く']
]);
export function t(en){
  if(language!=='ja')return en;
  const precision=/^Full range · (\d+) requested digits?$/.exec(en);
  return precision?`全範囲 · 入力${precision[1]}桁`:words.get(en)??en;
}
export function registerTranslations(entries){for(const [en,ja] of entries)words.set(en,ja);}
// Each selector owns static markup only; dynamic panels render from the shared trace.
const pageText=[
  ['#format-label','形式'],
  ['.edition','アルゴリズムをたどる / BINARY32'],['.idea-link','考え方 <span aria-hidden="true">↗</span>'],
  ['.intro .eyebrow','2進数のビットから10進数の桁へ'],['#title','少ない精度で、<br>判定を保証する。'],
  ['.intro-copy p:first-child','<strong>丸めて元の浮動小数点数に戻る</strong>最短の10進数を選びます。同じ桁数なら最も近いものを選び、同距離なら偶数を選びます。'],
  ['.intro-copy p:nth-child(2)','Boundragonは近似値を計算し、省いた情報の誤差を抑えます。中心化した判定で、その誤差が候補の選択を変えないと証明できれば結果を返します。不確かな境界や同距離の場合は、完全精度の整数計算で決着します。'],
  ['.intro-copy a','数値を試す <span aria-hidden="true">↓</span>'],['.section-heading h2','変換をたどる'],['.section-heading .small','ネイティブfloat · 2進の有効桁24ビット'],
  ['label[for="input-value"]','入力値'],['#input-mode option[value="decimal"]','10進数'],['#input-mode option[value="bits"]','16進ビット'],['#input-form button[type="submit"]','変換 <span aria-hidden="true">→</span>'],
  ['#input-note','10進入力は先にbinary32に丸めます。16進ビットなら元の32ビットを直接指定できます。'],['label[for="random-kind"]','ランダムに試す'],
  ['#random-kind option[value="finite"]','有限値のビット列'],['#random-kind option[value="unit"]','0以上1未満'],['#random-kind option[value="subnormal"]','非正規数'],['#random-kind option[value="integer"]','大きな正確な整数'],['#random-kind option[value="fallback"]','フォールバックを探す'],['#random','ランダム <span aria-hidden="true">⤨</span>'],
  ['.result-panel .eyebrow','最短の10進数'],['.result-components div:nth-child(1) span','係数'],['.result-components div:nth-child(2) span','× 10の指数'],['.result-components div:nth-child(3) span','符号'],
  ['#input-bits-title','まず入力ビットを見る'],['#show-grid','2つの格子 ↓'],['[data-step-action="previous"]','← 前へ'],['[data-step-action="next"]','次へ →'],['#path-title','分岐の経路'],['#expand-flow','拡大 ↗'],['#flow-view','フローチャート'],['#steps-view','ステップ'],
  ['#symbols-title','このステップで使う記号'],['#guard-decision .eyebrow','評価した判定'],['.arithmetic-details summary','このステップのすべての中間値'],
  ['#grid-title','2つの10進格子 · 全体の見取り図'],['.overview-heading p','変換全体を図で見るための独立した説明です。実行ステップではありません。10進数の候補とbinary32の正確な丸め区間を比較します。'],['#return-to-step','ステップに戻る ↑'],
  ['.legend span:nth-child(1)','<i class="interval-key"></i>丸め区間'],['.legend span:nth-child(2)','<i class="binary-key"></i>正確な浮動小数点値'],['.legend span:nth-child(3)','<i class="selected-key"></i>選ばれた10進数'],
  ['#flow-dialog-title','変換 · 全体のフローチャート'],['#close-flow','閉じる ×'],['.bits-details summary','正確な値と丸め区間を調べる'],['.bits-content p','負の入力でも図は絶対値を示します。元の区間は0を中心に反転したものです。中点を含むかどうかは2進仮数の偶奇で決まります。'],
  ['#how-it-works > .eyebrow','計算の前に、考え方をつかむ'],['#idea-title','少ない計算で、同じ答えを保証する。'],
  ['.explanation-grid article:nth-child(1) h3','有効な答えの範囲を決める'],['.explanation-grid article:nth-child(1) p','隣り合う浮動小数点値との中点に挟まれた数は、この入力に丸められます。仮数が偶数なら中点も含み、奇数なら含みません。有効な10進数はこの区間の中にあります。'],
  ['.explanation-grid article:nth-child(2) h3','省いた情報の誤差を抑える'],['.explanation-grid article:nth-child(2) p','整数演算で2進仮数を拡大し、残差を誤差範囲の中心に置きます。省いたキャッシュのビットの誤差境界から、正確な値が近似値からどこまで離れうるかを求めます。'],
  ['.explanation-grid article:nth-child(3) h3','保証できれば返し、不確かなら完全精度へ'],['.explanation-grid article:nth-child(3) p','誤差の範囲内で、区間への包含、最後の桁、同距離の判定が変わりうるかを調べます。変わらなければ結果を返し、不確かなら必要な精度を復元して完全精度の整数変換で決着します。'],
  ['.context > div:first-child .eyebrow','BOUNDRAGONの工夫'],['.context > div:first-child h2','判定に必要な場所へ、<br>精度を使う。'],['.context > div:first-child > p:last-child','Boundragonは中心化した採用判定と、明示的なキャッシュ誤差の保証を組み合わせます。binary32は64ビットの積に精度を配分し、binary64は積の上位語と圧縮キャッシュを使います。実行可能な証明で、誤差の境界をC++の表と照合します。'],
  ['.context-notes h3:nth-of-type(1)','由来と関連研究'],['.context-notes p:nth-of-type(1)','粗い・細かい候補の幾何は、既存の最短10進変換に由来します。10進のスケーリングはxjb、完全精度の決着はzmijを基にしています。SchubfachとDragonboxも丸め区間を使い、Grisu3は近似とフォールバックを確立しました。格子の見取り図は、この共通の基礎を説明します。'],
  ['.context-notes h3:nth-of-type(2)','このページについて'],['.context-notes p:nth-of-type(2)','生成したC++のキャッシュ表を使い、<code>binary32_to_decimal</code>を整数演算まで一致するようJavaScriptに移したものです。BigIntで中間値を表示するため、ブラウザーの実行時間はC++の性能を表しません。このページはbinary32とbinary64の変換を扱います。'],
  ['.context-notes a:nth-of-type(1)','アルゴリズムの全文（英語）↗'],['.context-notes a:nth-of-type(2)','Q40の上限と証明（英語）↗'],['.context-notes a:nth-of-type(3)','C++での使い方（英語）↗'],['.context-notes a:nth-of-type(4)','ベンチマークの方法（英語）↗'],['footer > p:first-of-type','最短 · 最も近い · 同距離なら偶数'],['footer > p:last-of-type','ローカルで動作 · <a href="assets/Unlicense.txt">Unlicense</a> + <a href="assets/zmij-MIT.txt">継承したMIT</a>'],['.noscript','JavaScriptを有効にすると変換をたどれます。上の説明はそのまま読めます。']
];
const attributes=[
  ['#explorer','aria-label','浮動小数点から10進数への対話的な変換'],['#input-mode','aria-label','入力の表現'],['#presets','aria-label','入力のプリセット'],['#bit-strip','aria-label','IEEE 754のビットフィールド'],
  ['.step-toolbar','aria-label','変換ステップの移動'],['#step-select','aria-label','変換ステップを選ぶ'],['.view-switch','aria-label','分岐経路の表示方法'],['#flow-tools','aria-label','フローチャートの倍率'],
  ['#zoom-out','aria-label','フローチャートを縮小'],['#zoom-in','aria-label','フローチャートを拡大'],['#zoom-fit','title','標準のチャートサイズに戻す'],['#flowchart','aria-label','変換全体の判定フローチャート'],['#close-flow','aria-label','拡大したフローチャートを閉じる']
];
let originals;
export function applyPageLanguage(overrides={}){
  originals??={text:pageText.map(([selector])=>[...document.querySelectorAll(selector)].map(el=>[el,el.innerHTML])),attrs:attributes.map(([selector,attr])=>document.querySelector(selector).getAttribute(attr))};
  pageText.forEach(([selector,ja],i)=>originals.text[i].forEach(([el,en])=>el.innerHTML=overrides[selector]?bi(...overrides[selector]):bi(en,ja)));
  attributes.forEach(([selector,attr,ja],i)=>document.querySelector(selector).setAttribute(attr,bi(originals.attrs[i],ja)));
  document.documentElement.lang=language;
  document.title=bi('Boundragon — Float to decimal, step by step','Boundragon — 浮動小数点から10進数へ、一歩ずつ');
  document.querySelector('meta[name="description"]').content=bi("Explore how Boundragon certifies shortest decimal conversion with centered error bounds, compact caches, and exact fallback.",'中心化した誤差の境界、圧縮キャッシュ、完全精度へのフォールバックで、Boundragonが最短10進変換を保証する仕組みをたどる。');
  document.querySelectorAll('[data-language]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.language===language)));
}
