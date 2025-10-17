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
# TODO: Update tst_configuration to match refactored Configuration struct fields
# add_qt_test(tst_configuration unit/tst_configuration.cpp)
# TODO: Check if tst_validation_utils needs updates
# add_qt_test(tst_validation_utils unit/tst_validation_utils.cpp)
add_qt_test(tst_snapshotbuffer unit/tst_snapshotbuffer.cpp)

# Integration tests
# TODO: Update tst_mainwindow_integration to match new Configuration fields
# add_qt_test(tst_mainwindow_integration integration/tst_mainwindow_integration.cpp)
# TODO: Update tst_engine_integration to match refactored EngineClient API (use sendInit, sendStep, etc.)
# add_qt_test(tst_engine_integration integration/tst_engine_integration.cpp)

# Link tests to main project sources (not the executable)
# SnapshotBuffer test only needs SnapshotBuffer
target_sources(tst_snapshotbuffer PRIVATE
    ../src/core/SnapshotBuffer.cpp
)

# Integration tests need EngineClient
# target_sources(tst_engine_integration PRIVATE
#     ../src/core/EngineClient.cpp
#     ../src/core/Configuration.cpp
# )

# MainWindow integration needs full UI stack
# set(MAINWINDOW_TEST_SOURCES
#     ../src/core/EngineClient.cpp
#     ../src/core/Configuration.cpp
#     ../src/core/SnapshotBuffer.cpp
#     ../src/ui/MainWindow.cpp
#     ../src/ui/panels/ConfigPanel.cpp
#     ../src/ui/panels/EventLogPanel.cpp
# )
# target_sources(tst_mainwindow_integration PRIVATE ${MAINWINDOW_TEST_SOURCES})

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
