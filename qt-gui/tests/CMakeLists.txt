# Test configuration

enable_testing()

# Helper function to create a test
function(add_qt_test TEST_NAME TEST_SOURCE)
    add_executable(${TEST_NAME} ${TEST_SOURCE})
    target_link_libraries(${TEST_NAME} PRIVATE
        Qt6::Test
        Qt6::Core
        Qt6::Widgets
        Qt6::Network
        Qt6::Charts
        Qt6::WebSockets
    )
    add_test(NAME ${TEST_NAME} COMMAND ${TEST_NAME})
    
    # Set test properties
    set_target_properties(${TEST_NAME} PROPERTIES
        AUTOMOC ON
        CXX_STANDARD 17
        CXX_STANDARD_REQUIRED ON
    )
endfunction()

# Unit tests
add_qt_test(tst_engineclient unit/tst_engineclient.cpp)
add_qt_test(tst_configuration unit/tst_configuration.cpp)
add_qt_test(tst_validation_utils unit/tst_validation_utils.cpp)
add_qt_test(tst_snapshotbuffer unit/tst_snapshotbuffer.cpp)

# Integration tests
add_qt_test(tst_mainwindow_integration integration/tst_mainwindow_integration.cpp)
add_qt_test(tst_engine_integration integration/tst_engine_integration.cpp)

# Link tests to main project sources (not the executable)

# SnapshotBuffer test only needs SnapshotBuffer
target_sources(tst_snapshotbuffer PRIVATE
    ../src/core/SnapshotBuffer.cpp
)

# Configuration test needs Configuration and ValidationUtils
target_sources(tst_configuration PRIVATE
    ../src/core/Configuration.cpp
)

# Engine integration test needs EngineClient and Configuration
target_sources(tst_engine_integration PRIVATE
    ../src/core/EngineClient.cpp
    ../src/core/Configuration.cpp
)

# MainWindow integration needs full UI stack
set(MAINWINDOW_TEST_SOURCES
    ../src/core/EngineClient.cpp
    ../src/core/Configuration.cpp
    ../src/core/SnapshotBuffer.cpp
    ../src/ui/MainWindow.cpp
    ../src/ui/panels/ConfigPanel.cpp
    ../src/ui/panels/EventLogPanel.cpp
)
target_sources(tst_mainwindow_integration PRIVATE ${MAINWINDOW_TEST_SOURCES})

# Include directories for tests
# target_include_directories(tst_engineclient PRIVATE ${CMAKE_SOURCE_DIR}/src)
# target_include_directories(tst_configuration PRIVATE ${CMAKE_SOURCE_DIR}/src)
# target_include_directories(tst_validation_utils PRIVATE ${CMAKE_SOURCE_DIR}/src)
target_include_directories(tst_snapshotbuffer PRIVATE ${CMAKE_SOURCE_DIR}/src)
target_sources(tst_engineclient PRIVATE
    ../src/core/EngineClient.cpp
)
target_include_directories(tst_engineclient PRIVATE ${CMAKE_SOURCE_DIR}/src)
# target_include_directories(tst_mainwindow_integration PRIVATE ${CMAKE_SOURCE_DIR}/src)
# target_include_directories(tst_engine_integration PRIVATE ${CMAKE_SOURCE_DIR}/src)

message(STATUS "Tests configured successfully")
