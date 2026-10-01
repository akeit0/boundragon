// Minimal runtime caller, identical for each linked footprint and its control.
#include "boundragon/detail/decimal_core.h"
using boundragon::detail::Decimal;
extern "C" Decimal decimal_convert_one(uint64_t);
volatile uint64_t comparison_input = 0x3ff3c083126e978dULL;
volatile uint64_t comparison_output;
int main() {
    auto d = decimal_convert_one(comparison_input);
    comparison_output = d.sig ^ uint64_t(d.exp) ^ uint64_t(d.negative);
    return 0;
}
