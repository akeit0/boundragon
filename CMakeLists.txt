cmake_minimum_required(VERSION 3.16)
project(boundragon LANGUAGES CXX)

include(CheckCXXSourceCompiles)
check_cxx_source_compiles("int main() { __uint128_t n = 1; return int(n); }" BOUNDRAGON_HAS_UINT128)
if(NOT BOUNDRAGON_HAS_UINT128)
  message(FATAL_ERROR "boundragon currently requires GCC/Clang __uint128_t support")
endif()

include(GNUInstallDirs)
add_library(boundragon INTERFACE)
add_library(boundragon::boundragon ALIAS boundragon)
target_compile_features(boundragon INTERFACE cxx_std_20)
target_include_directories(boundragon INTERFACE
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>)

set(boundragon_top_level OFF)
if(CMAKE_SOURCE_DIR STREQUAL PROJECT_SOURCE_DIR)
  set(boundragon_top_level ON)
endif()
option(BOUNDRAGON_BUILD_TESTS "Build correctness checks" ${boundragon_top_level})
option(BOUNDRAGON_BUILD_EXAMPLES "Build the usage example" ${boundragon_top_level})

if(BOUNDRAGON_BUILD_EXAMPLES)
  add_executable(boundragon-example examples/decimal.cpp)
  target_link_libraries(boundragon-example PRIVATE boundragon::boundragon)
endif()
if(BOUNDRAGON_BUILD_TESTS)
  enable_testing()
  add_subdirectory(tests)
endif()

install(DIRECTORY include/boundragon DESTINATION ${CMAKE_INSTALL_INCLUDEDIR})
install(TARGETS boundragon EXPORT boundragonTargets)
install(EXPORT boundragonTargets NAMESPACE boundragon:: DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/boundragon)
install(FILES cmake/boundragon-config.cmake DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/boundragon)
install(FILES LICENSE NOTICE.md DESTINATION ${CMAKE_INSTALL_DATADIR}/boundragon)
install(FILES licenses/zmij-MIT.txt DESTINATION ${CMAKE_INSTALL_DATADIR}/boundragon/licenses)
