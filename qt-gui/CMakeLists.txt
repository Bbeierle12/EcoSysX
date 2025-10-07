cmake_minimum_required(VERSION 3.16)

project(ecosysx-gui VERSION 0.1.0 LANGUAGES CXX)

# C++ Standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Qt Configuration
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

# Find Qt6 packages
find_package(Qt6 REQUIRED COMPONENTS 
    Core
    Widgets
    Network
    Gui
    Charts
)

# Output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

# Compiler warnings
if(MSVC)
    add_compile_options(/W4 /WX-)
else()
    add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# Project options
option(BUILD_TESTS "Build test suite" ON)
option(ENABLE_COVERAGE "Enable code coverage" OFF)

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_BINARY_DIR}
)

# Add subdirectories
add_subdirectory(src)

# Testing
if(BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

# Installation rules
install(TARGETS ecosysx-gui
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)

# Platform-specific installation
if(WIN32)
    # TODO: Add windeployqt post-build step
    message(STATUS "Windows packaging: Use scripts/package/windows.ps1")
elseif(APPLE)
    # TODO: Add macdeployqt post-build step
    message(STATUS "macOS packaging: Use scripts/package/macos.sh")
else()
    # Linux
    message(STATUS "Linux packaging: Use scripts/package/linux.sh")
endif()

# Summary
message(STATUS "")
message(STATUS "EcoSysX Qt GUI Configuration Summary:")
message(STATUS "  Version:        ${PROJECT_VERSION}")
message(STATUS "  C++ Standard:   ${CMAKE_CXX_STANDARD}")
message(STATUS "  Build Type:     ${CMAKE_BUILD_TYPE}")
message(STATUS "  Qt Version:     ${Qt6_VERSION}")
message(STATUS "  Build Tests:    ${BUILD_TESTS}")
message(STATUS "  Enable Coverage: ${ENABLE_COVERAGE}")
message(STATUS "")
