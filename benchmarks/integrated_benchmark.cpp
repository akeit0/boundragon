// SPDX-License-Identifier: Unlicense
#include "integrated_methods.h"
#include <atomic>
#include <vector>
#include "numeric_corpora.h"
#include "deps/dragonbox/dragonbox.h"
#include <algorithm>
#include <array>
#include <charconv>
#include <cstring>
#include <string>
#include <ctime>
#include <sched.h>

namespace {
constexpr size_t string_slot = 64;
#ifdef INTEGRATED_INCLUDE_FAST
constexpr unsigned method_count = 7;
#else
constexpr unsigned method_count = 5;
#endif
constexpr const char* names[] = {"boundragon-balanced-integrated-zmij", "boundragon-balanced-integrated-xjb",
    "zmij-native", "xjb-native", "xjb-compact-native",
    "boundragon-fast-integrated-zmij", "boundragon-fast-integrated-xjb"};
const char* name(unsigned method){return names[method];}
bool zmij_family(unsigned method){return method==0||method==2||method==5;}
template<unsigned method> size_t convert(uint64_t bits,char* buffer){
    return size_t(integrated_methods::write<method>(buffer,std::bit_cast<double>(bits))-buffer);
}
size_t invoke(unsigned method,uint64_t bits,char* buffer){
    switch(method){
#define CASE(P) case P: return convert<P>(bits,buffer);
        CASE(0) CASE(1) CASE(2) CASE(3) CASE(4)
#ifdef INTEGRATED_INCLUDE_FAST
        CASE(5) CASE(6)
#endif
#undef CASE
        default:std::abort();
    }
}
template<unsigned method> void batch_method(const std::vector<uint64_t>& bits,unsigned repeats,char* buffers,uint8_t* lengths){
    for(unsigned r=0;r<repeats;++r){
        std::atomic_signal_fence(std::memory_order_seq_cst);
        for(size_t i=0;i<bits.size();++i)lengths[i]=uint8_t(convert<method>(bits[i],buffers+i*string_slot));
    }
}
void batch(unsigned method,const std::vector<uint64_t>& bits,unsigned repeats,char* buffers,uint8_t* lengths){
    switch(method){
#define CASE(P) case P: return batch_method<P>(bits,repeats,buffers,lengths);
        CASE(0) CASE(1) CASE(2) CASE(3) CASE(4)
#ifdef INTEGRATED_INCLUDE_FAST
        CASE(5) CASE(6)
#endif
#undef CASE
        default:std::abort();
    }
}
uint64_t hash_bytes(const std::vector<char>& buffers,const std::vector<uint8_t>& lengths) {
    uint64_t hash=UINT64_C(14695981039346656037);
    for(size_t i=0;i<lengths.size();++i){
        if(lengths[i]>=string_slot)std::abort();
        hash=(hash^lengths[i])*UINT64_C(1099511628211);
        for(unsigned j=0;j<lengths[i];++j)hash=(hash^uint8_t(buffers[i*string_slot+j]))*UINT64_C(1099511628211);
    }
    return hash;
}
double cpu_ns(){timespec t{};if(clock_gettime(CLOCK_THREAD_CPUTIME_ID,&t))std::abort();return double(t.tv_sec)*1e9+t.tv_nsec;}
uint64_t checked=0, finite_checked=0, special_checked=0, compact_capacity_excess=0;
[[noreturn]] void fail(const char* what,unsigned method,uint64_t bits,const std::string& text) {
    std::fprintf(stderr,"FAIL %s format=binary64 method=%s bits=%016llx text=%s\n",what,name(method),(unsigned long long)bits,text.c_str());std::exit(2);
}
struct Components {uint64_t sig;int exp;bool negative;};
Components parse_components(const std::string& text){
    size_t pos=text[0]=='-'?1:0;bool sign=pos;uint64_t sig=0;int decimals=0;bool point=false;
    for(;pos<text.size()&&text[pos]!='e'&&text[pos]!='E';++pos){
        if(text[pos]=='.'){point=true;continue;}
        if(text[pos]<'0'||text[pos]>'9')std::abort();
        sig=sig*10+unsigned(text[pos]-'0');decimals+=point;
    }
    int exp=0;
    if(pos<text.size())exp=std::atoi(text.c_str()+pos+1);
    exp-=decimals;
    if(sig==0)exp=0;
    else while(sig%10==0){sig/=10;++exp;}
    return{sig,exp,sign};
}
void validate(uint64_t bits){
    double value=numeric_corpora::value_of<double>(bits);
    std::array<std::string,method_count> outputs;
    Components expected{};
    if(std::isfinite(value)){
        if(value==0)expected={0,0,std::signbit(value)};
        else{auto d=jkj::dragonbox::to_decimal(value,jkj::dragonbox::policy::cache::full,jkj::dragonbox::policy::trailing_zero::remove);
            expected={d.significand,d.exponent,d.is_negative};}
    }
    for(unsigned method=0;method<method_count;++method){
        // Integrated writers may store beyond logical end, but must respect their advertised
        // capacity. Canaries enclose the whole writable buffer, not the string.
        std::array<char,96> storage;storage.fill(char(0xa5));char* buffer=storage.data()+16;
        size_t advertised=zmij_family(method)?34:33;
        // The pinned compact native writer exceeds its 33-byte comment for
        // negative values around 1e15. Keep it unmodified and safely give 64;
        // record that upstream capacity discrepancy separately.
        size_t capacity=method==4?64:advertised;
        size_t len=invoke(method,bits,buffer);
        if(len>=capacity)fail("length",method,bits,"");
        for(size_t i=0;i<16;++i)if(uint8_t(storage[i])!=0xa5)fail("prefix canary",method,bits,"");
        for(size_t i=16+capacity;i<storage.size();++i)if(uint8_t(storage[i])!=0xa5)fail("suffix canary",method,bits,"");
        if(method==4){
            bool excess=false;
            for(size_t i=16+advertised;i<16+capacity;++i)excess|=uint8_t(storage[i])!=0xa5;
            compact_capacity_excess+=excess;
        }
        std::string text(buffer,len);outputs[method]=text;
        if(std::isfinite(value)){
            double parsed{};auto result=std::from_chars(buffer,buffer+len,parsed,std::chars_format::general);
            if(result.ec!=std::errc()||result.ptr!=buffer+len||numeric_corpora::bits_of(parsed)!=bits)fail("round-trip",method,bits,text);
            Components actual=parse_components(text);
            if(actual.sig!=expected.sig||actual.exp!=expected.exp||actual.negative!=expected.negative)fail("Dragonbox shortest/closest/even",method,bits,text);
            ++finite_checked;
        }else{
            std::string token=std::signbit(value)?"-":"";token+=std::isnan(value)?"nan":"inf";
            if(text!=token)fail("special/sign",method,bits,text);
            ++special_checked;
        }
        ++checked;
    }
    for(unsigned method=0;method<method_count;++method){
        if(method==4)continue; // compact native is a separately preserved writer contract.
        unsigned reference=zmij_family(method)?2:3;
        if(outputs[method]!=outputs[reference])fail("same-tail text parity",method,bits,outputs[method]);
    }
}
void run(size_t n,unsigned trials,unsigned repeats,uint64_t seed,bool validation_only){
    for(uint64_t bits:numeric_corpora::adversarial<double>())validate(bits);
    std::mt19937_64 rng(seed^UINT64_C(0x71a80b3));
    for(unsigned corpus=0;corpus<std::size(numeric_corpora::names);++corpus){
        auto bits=numeric_corpora::make<double>(corpus,n,seed);
        for(uint64_t b:bits)validate(b);
        if(validation_only)continue;
        std::vector<char> buffers(n*string_slot,0);std::vector<uint8_t>lengths(n);
        uint64_t expected[method_count]{};
        std::vector<unsigned> order;
        for(unsigned method=0;method<method_count;++method){
                batch(method,bits,1,buffers.data(),lengths.data());expected[method]=hash_bytes(buffers,lengths);
            order.push_back(method);
        }
        for(unsigned trial=0;trial<trials;++trial){
            std::shuffle(order.begin(),order.end(),rng);
            for(unsigned method:order){
                std::fill(buffers.begin(),buffers.end(),0);std::fill(lengths.begin(),lengths.end(),0);
                int start_cpu=sched_getcpu();double start=cpu_ns();
                batch(method,bits,repeats,buffers.data(),lengths.data());
                double elapsed=cpu_ns()-start;int end_cpu=sched_getcpu();
                uint64_t hash=hash_bytes(buffers,lengths);if(hash!=expected[method])std::abort();
                std::printf("%llu,binary64,%s,%s,%u,%zu,%u,%.6f,%016llx,%d,%d\n",(unsigned long long)seed,name(method),numeric_corpora::names[corpus],trial,n,repeats,elapsed/(double(n)*repeats),(unsigned long long)hash,start_cpu,end_cpu);
            }
        }
    }
}
} // namespace
int main(int argc,char**argv){
    if(argc!=6)return 1;
    size_t n=std::strtoull(argv[1],nullptr,0);unsigned trials=unsigned(std::strtoul(argv[2],nullptr,0)),repeats=unsigned(std::strtoul(argv[3],nullptr,0));
    uint64_t seed=std::strtoull(argv[4],nullptr,0);bool only=std::atoi(argv[5]);
    if(!n||!trials||!repeats)return 1;
    if(!only)std::puts("seed,format,method,corpus,trial,n,repeats,ns_per_value,checksum,cpu_start,cpu_end");
    run(n,trials,repeats,seed,only);
    std::fprintf(stderr,"PASS integrated binary64 validation: %llu writer outputs; %llu finite shortest/closest/even round-trips; %llu signed specials; buffer canaries and same-tail text parity\nCompact native writes beyond advertised capacity (safe 64-byte allocation): %llu\n",(unsigned long long)checked,(unsigned long long)finite_checked,(unsigned long long)special_checked,(unsigned long long)compact_capacity_excess);
}
