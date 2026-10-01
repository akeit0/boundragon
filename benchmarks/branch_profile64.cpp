// SPDX-License-Identifier: Unlicense
// Binary64 canonical Balanced route counts. Every input is checked against the
// native instrumented kernel; outlined calls include powers and special values.
#include <boundragon/boundragon.h>
#include <array>
#include <bit>
#include <cfenv>
#include <clocale>
#include <cstdio>
#include <cstdlib>
#include <random>
#include <string>
constexpr std::array checks{"check-special","check-integer-range","check-integer-bits","check-power",
    "check-boundary","check-rounding","check-ambiguity","check-tail"};
constexpr std::array branches{"nonfinite","zero","power","integer","coarse","fine","fallback"};
constexpr std::array reasons{"subnormal","check-boundary","check-rounding"};
struct Counts {
    std::array<uint64_t,checks.size()> reached{},yes{};
    std::array<uint64_t,branches.size()> results{};
    std::array<uint64_t,reasons.size()> causes{};
    bool check(unsigned i,bool v){++reached[i];yes[i]+=v;return v;}
    unsigned finish(unsigned b,unsigned cause=0){++results[b];if(b==6)++causes[cause];return b;}
    unsigned classify(uint64_t bits){
        unsigned raw=unsigned(bits>>52)&2047;
        uint64_t m=bits&((uint64_t(1)<<52)-1);
        if(check(0,raw==0||raw==2047)){
            if(raw==2047)return finish(0);
            return m?finish(6,0):finish(1);
        }
        unsigned shift=1075-raw;
        if(check(1,shift<=52)&&check(2,(m&((uint64_t(1)<<shift)-1))==0))return finish(3);
        if(check(3,m==0))return finish(2);
        int q=int(raw)-1075,k=boundragon::detail::dec_exp(q);
        unsigned fs=boundragon::detail::exp_shift(q,k+1)+11;
        uint64_t hi=boundragon::detail::high_powers[-k-1-boundragon::detail::pow_min];
        m|=uint64_t(1)<<52;
        uint64_t u=uint64_t((boundragon::detail::u128(m<<fs)*hi)>>64),centered=u+1025;
        int w=int(centered&2047)-1024;
        unsigned h=unsigned(hi>>(65-fs));
        int d=(w<0?-w:w)-int(h),mask=d>>31,R=5*w+512;
        unsigned g=(unsigned(R+5)&1023)|unsigned(mask);
        bool boundary=check(4,unsigned(d)<2),rounding=check(5,g<=10);
        if(check(6,boundary|rounding))return finish(6,boundary?1:2);
        int tail=(R>>10)&~mask;
        return finish(check(7,tail==0)?4:5);
    }
    void add(uint64_t bits){
        unsigned b=classify(bits);
        uint64_t calls=0;
        boundragon::detail::centered_half_hot<true,false,true,true>(bits,&calls);
        bool outlined=b==0||b==1||b==2||b==6;
        if(calls!=uint64_t(outlined)){std::fprintf(stderr,"Binary64 dispatch differs: %016llx\n",(unsigned long long)bits);std::exit(3);}
    }
};
uint64_t finite(std::mt19937_64& rng){uint64_t bits;do{bits=rng();}while(((bits>>52)&2047)==2047);return bits;}
int main(){
    if(std::fegetround()!=FE_TONEAREST||!std::setlocale(LC_ALL,"C"))return 2;
    std::puts("corpus,seed,n,kind,name,reached,true_count");
    for(uint64_t seed:{uint64_t(0x3156a5),uint64_t(0x9a71de)})for(int pool=0;pool<=18;++pool){
        std::mt19937_64 rng(seed+uint64_t(pool)*0x9e3779b97f4a7c15ULL);
        uint64_t n=pool==0?1048576:131072;
        std::string name=pool==0?"random-finite-bits":pool==1?"decimal-1-to-6":"precision-d"+std::to_string(pool-1);
        Counts c;
        for(uint64_t i=0;i<n;++i){
            uint64_t bits;char text[96];
            if(pool==0)bits=finite(rng);
            else if(pool==1){
                unsigned digits=1+unsigned(rng()%6),low=1;for(unsigned j=1;j<digits;++j)low*=10;
                unsigned coefficient=low+unsigned(rng()%(9*low));int exponent=int(rng()%41)-20;
                std::snprintf(text,sizeof(text),"%ue%d",coefficient,exponent);
                bits=std::bit_cast<uint64_t>(std::strtod(text,nullptr))|((rng()&1)<<63);
            }else{
                do{bits=finite(rng);std::snprintf(text,sizeof(text),"%.*g",pool-1,std::bit_cast<double>(bits));bits=std::bit_cast<uint64_t>(std::strtod(text,nullptr));}while(((bits>>52)&2047)==2047);
            }
            c.add(bits);
        }
        auto row=[&](const char* kind,const char* item,uint64_t reached,uint64_t yes){std::printf("%s,%llu,%llu,%s,%s,%llu,%llu\n",name.c_str(),(unsigned long long)seed,(unsigned long long)n,kind,item,(unsigned long long)reached,(unsigned long long)yes);};
        for(unsigned i=0;i<checks.size();++i)row("guard",checks[i],c.reached[i],c.yes[i]);
        for(unsigned i=0;i<branches.size();++i)row("branch",branches[i],n,c.results[i]);
        for(unsigned i=0;i<reasons.size();++i)row("reason",reasons[i],n,c.causes[i]);
    }
}
