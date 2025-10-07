# Add source files
set(SOURCES
    main.cpp
    core/EngineClient.cpp
    core/Configuration.cpp
)

set(HEADERS
    core/EngineClient.h
    core/Configuration.h
    utils/ValidationUtils.h
)

# Create executable
add_executable(ecosysx-gui ${SOURCES} ${HEADERS})

# Link Qt libraries
target_link_libraries(ecosysx-gui PRIVATE
    Qt6::Core
    Qt6::Widgets
    Qt6::Network
    Qt6::Gui
)

# Set target properties
set_target_properties(ecosysx-gui PROPERTIES
    WIN32_EXECUTABLE ON
    MACOSX_BUNDLE ON
)
