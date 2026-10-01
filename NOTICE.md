# Licensing and attribution

Original Boundragon code, tools, tests and documentation are dedicated to the
public domain under [the Unlicense](LICENSE).

The exact rounding and compact fallback contain code adapted from Victor
Zverovich's zmij. Those inherited portions retain their MIT license and
copyright notice in [licenses/zmij-MIT.txt](licenses/zmij-MIT.txt). In particular,
`include/boundragon/detail/decimal_core.h`, `canonical_decimal.h`, and the
binary32 adaptation `float_decimal.h` combine original work with inherited
rounding logic; the Unlicense does not remove zmij's notice requirements.
Installation ships both license texts and this notice.

The browser adaptations in `docs/assets/converter.js` and `converter64.js`
also retain those MIT terms. Published static assets include `zmij-MIT.txt`
and the Unlicense.

The documentation build also bundles Temml's pinned local MathML stylesheet
and supporting font under MIT. Its notice is generated from the installed
package into `docs/assets/temml-MIT.txt` and included in the Pages artifact.
The site uses compiled MathML without a browser JavaScript math renderer.

Optional benchmarks download pinned Dragonbox, zmij and xjb references with
their Boost, MIT and Apache-2.0 license texts. Those references retain their
upstream copyright notices and licenses and are excluded from library
installation. The generated formatter headers under `benchmarks/generated/`
are modified extracts: zmij's formatter remains MIT, and xjb's formatter remains
Apache-2.0. Each header identifies the pinned source, modifications and original
copyright notice. The xjb license is also retained in
[licenses/xjb-Apache-2.0.txt](licenses/xjb-Apache-2.0.txt); no xjb implementation
is included in the installed Boundragon headers.

The experimental integrated writer kernel in `benchmarks/integrated_writer.h`
retains the same MIT terms for inherited zmij exact rounding. Its prepared-digit
writer entries use the licensed formatter extracts described above. Generated
formatter extracts and local source snapshots preserve those notices and are
excluded from installation.

Algorithmic acknowledgements: decimal scaling is credited to Xiang JunBo
(xjb), normalized power reconstruction follows Dougall Johnson, and the
coarse/fine exact conversion follows zmij. See the
[algorithm overview](docs/algorithm.md) for related work and contribution scope.
