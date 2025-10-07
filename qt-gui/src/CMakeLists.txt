# Source files
set(SOURCES
    main.cpp
    core/EngineClient.cpp
    core/Configuration.cpp
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
    utils/ValidationUtils.h
    ui/MainWindow.h
    ui/panels/ConfigPanel.h
    ui/panels/EventLogPanel.h
    ui/panels/MetricsPanel.h
    ui/widgets/VisualizationWidget.h
    ui/widgets/MetricsChartWidget.h
)

# Create executable
add_executable(ecosysx-gui ${SOURCES} ${HEADERS})

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
