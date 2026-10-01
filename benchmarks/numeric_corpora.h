// SPDX-License-Identifier: Unlicense
#pragma once
#include <bit>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <random>
#include <type_traits>
#include <vector>

namespace numeric_corpora {
inline constexpr const char* names[] = {"random-finite-bits", "one-to-two", "decimal-1-to-6",
    "precision-mixed", "simple", "powers-of-two", "subnormals", "integers"};
template<typename Float> using Bits = std::conditional_t<sizeof(Float)==4,uint32_t,uint64_t>;
template<typename Float> uint64_t bits_of(Float value) { return std::bit_cast<Bits<Float>>(value); }
template<typename Float> Float value_of(uint64_t bits) { return std::bit_cast<Float>(Bits<Float>(bits)); }
template<typename Float> Float parse(const char* text) {
    if constexpr (sizeof(Float)==4) return std::strtof(text,nullptr);
    else return std::strtod(text,nullptr);
}
template<typename Float> std::vector<uint64_t> make(unsigned kind, size_t n, uint64_t seed) {
    constexpr bool f32 = sizeof(Float)==4;
    constexpr unsigned fb=f32?23:52, raw_max=f32?255:2047, bias=f32?127:1023;
    constexpr uint64_t fraction=(uint64_t(1)<<fb)-1;
    std::mt19937_64 rng(seed);
    std::vector<uint64_t> bits; bits.reserve(n);
    constexpr double simple[] = {0,-0.0,1,-1,.1,.5,10,1000,1e6,1e-6,123.45,1.25,1e15,1e-20};
    while(bits.size()<n) {
        uint64_t b = f32?uint32_t(rng()):rng();
        if(kind==1) b=(rng()&fraction)|(uint64_t(bias)<<fb);
        else if(kind==2) {
            unsigned digits=1+unsigned(rng()%6),limit=1;
            for(unsigned i=0;i<digits;++i)limit*=10;
            char text[48];std::snprintf(text,sizeof(text),"%s%ue%d",rng()&1?"-":"",
                1+unsigned(rng()%(limit-1)),int(rng()%41)-20);
            b=bits_of(parse<Float>(text));
        } else if(kind==3) {
            Float value=value_of<Float>(b);
            if(!std::isfinite(value))continue;
            char text[64]; std::snprintf(text,sizeof(text),"%.*g",1+int(rng()%(f32?9:17)),double(value));
            b=bits_of(parse<Float>(text));
        } else if(kind==4)b=bits_of(Float(simple[rng()%std::size(simple)]));
        else if(kind==5)b=(uint64_t(1+rng()%(raw_max-1))<<fb)|((rng()&1)<<(f32?31:63));
        else if(kind==6)b=(1+rng()%fraction)|((rng()&1)<<(f32?31:63));
        else if(kind==7) {
            uint64_t integer=rng()&((uint64_t(1)<<(f32?24:53))-1);
            b=bits_of(Float(integer));if(rng()&1)b|=uint64_t(1)<<(f32?31:63);
        }
        if(((b>>fb)&raw_max)==raw_max)continue;
        bits.push_back(b);
    }
    return bits;
}
template<typename Float> std::vector<uint64_t> adversarial() {
    constexpr bool f32=sizeof(Float)==4;
    constexpr unsigned fb=f32?23:52,raw_max=f32?255:2047;
    constexpr uint64_t frac=(uint64_t(1)<<fb)-1,sign=uint64_t(1)<<(f32?31:63);
    std::vector<uint64_t> result;
    auto add=[&](uint64_t magnitude){result.push_back(magnitude);result.push_back(magnitude|sign);};
    for(unsigned raw=0;raw<=raw_max;++raw)
        for(uint64_t f:{uint64_t(0),uint64_t(1),uint64_t(2),frac/2,frac-1,frac})add((uint64_t(raw)<<fb)|f);
    for(unsigned raw=1;raw<raw_max;++raw)
        for(int delta:{-1,0,1})add((uint64_t(raw)<<fb)+delta);
    for(unsigned bit=0;bit<fb;++bit)
        for(int delta:{-1,0,1})add((uint64_t(1)<<bit)+delta);
    for(uint64_t b=1;b<=1024;++b)add(b);
    for(int e=f32?-45:-324;e<=(f32?38:308);++e){
        char text[48];std::snprintf(text,sizeof(text),"1e%d",e);
        uint64_t b=bits_of(parse<Float>(text));
        for(int delta:{-2,-1,0,1,2})if(b>=uint64_t(delta<0?-delta:0))add(b+delta);
    }
    return result;
}
} // namespace numeric_corpora
