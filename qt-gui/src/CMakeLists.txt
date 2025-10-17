# Source files
set(SOURCES
    main.cpp
    core/EngineClient.cpp
    core/Configuration.cpp
    core/SnapshotBuffer.cpp
    ui/MainWindow.cpp
    ui/panels/ConfigPanel.cpp
    ui/panels/EventLogPanel.cpp
    ui/panels/MetricsPanel.cpp
    ui/widgets/VisualizationWidget.cpp
    ui/widgets/MetricsChartWidget.cpp
)

set(HEADERS
    core/EngineClient.h
    core/Configuration.h
    core/SnapshotBuffer.h
    utils/ValidationUtils.h
    ui/MainWindow.h
    ui/panels/ConfigPanel.h
    ui/panels/EventLogPanel.h
    ui/panels/MetricsPanel.h
    ui/widgets/VisualizationWidget.h
    ui/widgets/MetricsChartWidget.h
)

# Resources
set(RESOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/../resources/resources.qrc
)

# Windows icon resource
if(WIN32)
    set(APP_ICON_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../resources/icons/app.ico")
    if(EXISTS "${APP_ICON_PATH}")
        set(APP_ICON_RC ${CMAKE_CURRENT_BINARY_DIR}/app_icon.rc)
        file(TO_NATIVE_PATH "${APP_ICON_PATH}" APP_ICON_PATH_NATIVE)
        file(WRITE ${APP_ICON_RC} "IDI_ICON1 ICON \"${APP_ICON_PATH_NATIVE}\"\n")
        set(RESOURCES ${RESOURCES} ${APP_ICON_RC})
    endif()
endif()

# Create executable
add_executable(ecosysx-gui ${SOURCES} ${HEADERS} ${RESOURCES})

# Link Qt libraries
target_link_libraries(ecosysx-gui PRIVATE
    Qt6::Core
    Qt6::Widgets
    Qt6::Network
    Qt6::Gui
    Qt6::Charts
)

# Set target properties
set_target_properties(ecosysx-gui PROPERTIES
    WIN32_EXECUTABLE ON
    MACOSX_BUNDLE ON
)
