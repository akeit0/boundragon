// SPDX-License-Identifier: Unlicense
// Native sources are included without modification in isolated translation units.
#include "deps/xjb/ftoa.cpp"
char* native_xjb(char* buf, double value) { return xjb_ftoa(value, buf); }
char* native_xjb(char* buf, float value) { return xjb_ftoa(value, buf); }
