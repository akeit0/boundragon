// SPDX-License-Identifier: Unlicense
#include "deps/xjb/ftoa_comp.cpp"
char* native_xjb_compact(char* buf, double value) { return xjb_comp::xjb64_comp(value, buf); }
char* native_xjb_compact(char* buf, float value) { return xjb_comp::xjb32_comp(value, buf); }
