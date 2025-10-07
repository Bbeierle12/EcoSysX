# Sprint 2 Quick Reference

**Sprint**: Phase 1, Sprint 2 - Metrics & Visualization  
**Status**: ✅ COMPLETE  
**Components**: 3 widgets, 1,390+ lines

---

## Component Overview

### 1. MetricsPanel
**Location**: `src/ui/panels/MetricsPanel.h/.cpp`  
**Purpose**: Real-time simulation statistics display  
**Size**: 370 lines

**Usage**:
```cpp
MetricsPanel* panel = new MetricsPanel();
connect(engineClient, &EngineClient::snapshotReceived,
        panel, &MetricsPanel::updateMetrics);
```

**Key API**:
- `void updateMetrics(const QJsonObject& snapshot)` - Update all metrics
- **Signal**: `thresholdCrossed(QString metric, double value)` - Alert on threshold

**Metrics Displayed**:
- Population (total agent count)
- Susceptible (green)
- Infected (red, with color-coded %)
- Recovered (blue)
- Dead (gray)
- Infection Rate (%, green/yellow/red thresholds)
- Step Count

**Color Thresholds**:
- **Green**: <10% infected
- **Yellow**: 10-30% infected
- **Red**: >30% infected

---

### 2. VisualizationWidget
**Location**: `src/ui/widgets/VisualizationWidget.h/.cpp`  
**Purpose**: 2D spatial visualization of agents  
**Size**: 450 lines

**Usage**:
```cpp
VisualizationWidget* viz = new VisualizationWidget();
setCentralWidget(viz);

// Update agents from snapshot
viz->updateAgents(snapshot);

// Zoom controls
viz->zoomIn();   // Ctrl+Plus
viz->zoomOut();  // Ctrl+Minus
viz->resetZoom(); // Ctrl+0
```

**Key API**:
- `void updateAgents(const QJsonObject& snapshot)` - Render agents
- `void zoomIn()` - Zoom in 1.2x
- `void zoomOut()` - Zoom out 1/1.2x
- `void resetZoom()` - Reset to 1:1
- `QPointF worldToScreen(const QPointF& worldPos)` - Transform coords
- `QPointF screenToWorld(const QPointF& screenPos)` - Inverse transform
- **Signal**: `agentClicked(int agentId)` - Agent selection
- **Signal**: `zoomChanged(double zoomLevel)` - Zoom level update

**Agent Colors**:
- **Susceptible**: Green (#4CAF50)
- **Infected**: Red (#F44336)
- **Recovered**: Blue (#2196F3)
- **Dead**: Gray (#9E9E9E)

**Interaction**:
- **Zoom**: Mouse wheel, Ctrl+Plus/Minus, or toolbar buttons
- **Pan**: Left-click drag
- **Hover**: Tooltip shows agent ID and state
- **Click**: Selects agent, emits `agentClicked` signal

**Performance**:
- View frustum culling (off-screen agents not rendered)
- Batched paint operations
- Target: 60 FPS with 10,000 agents

---

### 3. MetricsChartWidget
**Location**: `src/ui/widgets/MetricsChartWidget.h/.cpp`  
**Purpose**: Time-series plots using Qt Charts  
**Size**: 420 lines

**Usage**:
```cpp
MetricsChartWidget* chart = new MetricsChartWidget();
chart->setMaxDataPoints(1000); // Optional: default 1000

// Add data point each step
int step = snapshot["step"].toInt();
chart->addDataPoint(step, snapshot);

// Export to PNG
chart->exportToPng("metrics_chart.png");
```

**Key API**:
- `void addDataPoint(int step, const QJsonObject& snapshot)` - Add time point
- `void clear()` - Reset all series
- `void setSeriesVisible(const QString& seriesName, bool visible)` - Toggle series
- `bool exportToPng(const QString& filePath)` - Export chart
- `void setMaxDataPoints(int maxPoints)` - Configure buffer size
- **Signal**: `seriesVisibilityChanged(QString name, bool visible)` - Series toggle

**Series**:
1. **Susceptible** (Green) - Number of susceptible agents
2. **Infected** (Red) - Number of infected agents
3. **Recovered** (Blue) - Number of recovered agents
4. **Dead** (Gray) - Number of dead agents

**Features**:
- Auto-scaling X/Y axes
- Interactive legend (click to show/hide series)
- Circular buffer (default 1000 points, configurable)
- Smooth antialiased lines
- PNG export with preserved quality

**Axes**:
- **X-Axis**: Step count (auto-scales)
- **Y-Axis**: Population count (auto-scales)

---

## MainWindow Integration

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  Menu Bar: File | Edit | View | Help                    │
├─────────────────────────────────────────────────────────┤
│  Toolbar: [Start] [Stop] [Step] | [Reset] | [+] [-] [⊙]│
├────────────┬──────────────────────────────┬─────────────┤
│ Config     │  VisualizationWidget         │  Metrics    │
│ Panel      │  (Central Widget)            │  Panel      │
│ (Left)     │                              │  (Right)    │
│            │                              │             │
├────────────┴──────────────────────────────┴─────────────┤
│  Bottom Dock (Tabbed):                                  │
│  [Event Log] [Metrics Charts]                           │
└─────────────────────────────────────────────────────────┘
```

### New Menu Items

**View Menu**:
- Show &Configuration Panel (toggle)
- Show &Event Log (toggle)
- Show &Metrics Panel (toggle, **NEW**)
- Show &Bottom Panel (toggle, **NEW**)
- ───
- Zoom &In (Ctrl+Plus, **NEW**)
- Zoom &Out (Ctrl+Minus, **NEW**)
- &Reset Zoom (Ctrl+0, **NEW**)
- ───
- &Export Chart... (Ctrl+E, **NEW**)

### Toolbar Additions
- **[+]** - Zoom In (Ctrl+Plus)
- **[-]** - Zoom Out (Ctrl+Minus)
- **[⊙]** - Reset Zoom (Ctrl+0)

### Keyboard Shortcuts
| Key          | Action          | Description                    |
|--------------|-----------------|--------------------------------|
| Ctrl+Plus    | Zoom In         | Zoom in visualization          |
| Ctrl+Minus   | Zoom Out        | Zoom out visualization         |
| Ctrl+0       | Reset Zoom      | Reset zoom to 1:1              |
| Ctrl+E       | Export Chart    | Export metrics chart to PNG    |

---

## Data Flow

### Engine → UI Update Cycle
```cpp
// In MainWindow::onEngineSnapshotReceived(const QJsonObject& snapshot)
void MainWindow::onEngineSnapshotReceived(const QJsonObject& snapshot) {
    // 1. Update metrics panel (right dock)
    m_metricsPanel->updateMetrics(snapshot);
    
    // 2. Update visualization (central widget)
    m_visualizationWidget->updateAgents(snapshot);
    
    // 3. Add chart data point (bottom dock, Charts tab)
    int step = snapshot["step"].toInt();
    m_chartWidget->addDataPoint(step, snapshot);
}
```

### Expected Snapshot Format
```json
{
  "step": 42,
  "population": 1000,
  "susceptible": 850,
  "infected": 100,
  "recovered": 45,
  "dead": 5,
  "agents": [
    {"id": 0, "x": 10.5, "y": 20.3, "state": "Susceptible"},
    {"id": 1, "x": 15.2, "y": 18.7, "state": "Infected"},
    ...
  ]
}
```

---

## Build Configuration

### CMakeLists.txt Changes

**qt-gui/CMakeLists.txt** (add Charts component):
```cmake
find_package(Qt6 REQUIRED COMPONENTS 
    Core
    Widgets
    Network
    Gui
    Charts  # <-- NEW
)
```

**qt-gui/src/CMakeLists.txt** (add new source files):
```cmake
set(SOURCES
    # ... existing ...
    ui/panels/MetricsPanel.cpp
    ui/widgets/VisualizationWidget.cpp
    ui/widgets/MetricsChartWidget.cpp
)

set(HEADERS
    # ... existing ...
    ui/panels/MetricsPanel.h
    ui/widgets/VisualizationWidget.h
    ui/widgets/MetricsChartWidget.h
)

target_link_libraries(ecosysx-gui PRIVATE
    # ... existing ...
    Qt6::Charts  # <-- NEW
)
```

### Build Commands
```powershell
# Configure
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release

# Build
cmake --build build --config Release

# Run
.\build\bin\Release\ecosysx-gui.exe
```

---

## Testing Checklist

### Manual Tests
- [ ] Launch application
- [ ] Start simulation
- [ ] **MetricsPanel**:
  - [ ] All 7 metrics update in real-time
  - [ ] Infection rate color changes (green→yellow→red)
  - [ ] Numbers formatted with commas
- [ ] **VisualizationWidget**:
  - [ ] Agents render at correct positions
  - [ ] Agent colors match states
  - [ ] Zoom in/out works (mouse wheel + toolbar)
  - [ ] Reset zoom returns to 1:1
  - [ ] Pan with mouse drag works
  - [ ] Hover shows agent tooltip
- [ ] **MetricsChartWidget**:
  - [ ] All 4 series plot correctly
  - [ ] Legend interactive (click to toggle)
  - [ ] Axes auto-scale
  - [ ] Export to PNG succeeds
- [ ] **Docks**:
  - [ ] Toggle visibility from View menu
  - [ ] Drag to resize/rearrange
  - [ ] Bottom tabs switch correctly

### Performance Tests
- [ ] 1,000 agents: Smooth rendering (>30 FPS)
- [ ] 10,000 agents: Acceptable rendering (>15 FPS)
- [ ] 1-hour run: No memory leaks
- [ ] Chart with 1000 points: <5ms update latency

---

## Troubleshooting

### Build Errors

**"Qt6Charts not found"**:
```bash
# Install Qt6 Charts module
# Windows: Qt Maintenance Tool → Add or remove components → Qt Charts
# Linux: sudo apt install qt6-charts-dev
# macOS: brew install qt6 (includes Charts)
```

**"undefined reference to MetricsPanel"**:
```bash
# Ensure source files added to CMakeLists.txt
# Clean rebuild:
rm -rf build
cmake -B build -S .
cmake --build build
```

### Runtime Issues

**Charts not rendering**:
- Verify `Qt6::Charts` linked in `CMakeLists.txt`
- Check `QT_DEBUG_PLUGINS=1` for loading errors
- Ensure Qt Charts DLLs in PATH (Windows)

**Visualization slow with many agents**:
- Reduce zoom level (further out = more culling)
- Check GPU acceleration enabled
- Profile with Qt Creator's analyzer

**Metrics not updating**:
- Verify `EngineClient::snapshotReceived` signal connected
- Check JSON snapshot format matches expected structure
- Enable debug logging in `EngineClient`

---

## API Reference Summary

### MetricsPanel
```cpp
class MetricsPanel : public QWidget {
    Q_OBJECT
public:
    explicit MetricsPanel(QWidget* parent = nullptr);
    
public slots:
    void updateMetrics(const QJsonObject& snapshot);
    
signals:
    void thresholdCrossed(const QString& metric, double value);
};
```

### VisualizationWidget
```cpp
class VisualizationWidget : public QWidget {
    Q_OBJECT
public:
    explicit VisualizationWidget(QWidget* parent = nullptr);
    
    void zoomIn();
    void zoomOut();
    void resetZoom();
    QPointF worldToScreen(const QPointF& worldPos) const;
    QPointF screenToWorld(const QPointF& screenPos) const;
    
public slots:
    void updateAgents(const QJsonObject& snapshot);
    
signals:
    void agentClicked(int agentId);
    void zoomChanged(double zoomLevel);
};
```

### MetricsChartWidget
```cpp
class MetricsChartWidget : public QWidget {
    Q_OBJECT
public:
    explicit MetricsChartWidget(QWidget* parent = nullptr);
    
    void setMaxDataPoints(int maxPoints);
    bool exportToPng(const QString& filePath);
    
public slots:
    void addDataPoint(int step, const QJsonObject& snapshot);
    void clear();
    void setSeriesVisible(const QString& seriesName, bool visible);
    
signals:
    void seriesVisibilityChanged(const QString& seriesName, bool visible);
};
```

---

## File Locations

### Headers
```
src/ui/panels/MetricsPanel.h
src/ui/widgets/VisualizationWidget.h
src/ui/widgets/MetricsChartWidget.h
```

### Implementation
```
src/ui/panels/MetricsPanel.cpp
src/ui/widgets/VisualizationWidget.cpp
src/ui/widgets/MetricsChartWidget.cpp
```

### Modified
```
src/ui/MainWindow.h
src/ui/MainWindow.cpp
qt-gui/CMakeLists.txt
src/CMakeLists.txt
```

### Documentation
```
qt-gui/SPRINT_2_CHECKLIST.md
qt-gui/SPRINT_2_COMPLETE.md
qt-gui/SPRINT_2_QUICK_REF.md (this file)
```

---

## Performance Targets

| Component              | Target                        | Notes                      |
|-----------------------|-------------------------------|----------------------------|
| VisualizationWidget   | 60 FPS @ 10k agents           | With view frustum culling  |
| MetricsPanel          | <1ms update                   | Simple label updates       |
| MetricsChartWidget    | <5ms update                   | Circular buffer, 1k points |
| Total UI Update       | <16ms (60 FPS budget)         | All components combined    |

---

## Memory Footprint

| Component              | Baseline      | Per-Agent   | Notes                      |
|-----------------------|---------------|-------------|----------------------------|
| MetricsPanel          | ~1 KB         | -           | 7 labels                   |
| VisualizationWidget   | ~50 KB        | 24 bytes    | Agent data structure       |
| MetricsChartWidget    | ~200 KB       | -           | 4 series × 1k points       |
| **Total @ 10k agents**| **~490 KB**   | -           | Excludes Qt framework      |

---

## Common Patterns

### Adding a New Metric
1. **Update MetricsPanel.h**: Add label member
2. **Update MetricsPanel.cpp**:
   ```cpp
   m_newMetricLabel = new QLabel("New Metric: 0", this);
   layout->addRow("New Metric:", m_newMetricLabel);
   ```
3. **Update updateMetrics()**:
   ```cpp
   int newValue = snapshot["new_metric"].toInt();
   m_newMetricLabel->setText(QString("New Metric: %1").arg(newValue));
   ```

### Adding a Chart Series
1. **Update MetricsChartWidget.cpp**:
   ```cpp
   QLineSeries* newSeries = new QLineSeries();
   newSeries->setName("New Series");
   m_chart->addSeries(newSeries);
   newSeries->attachAxis(m_axisX);
   newSeries->attachAxis(m_axisY);
   ```
2. **Update addDataPoint()**:
   ```cpp
   double newValue = snapshot["new_value"].toDouble();
   newSeries->append(step, newValue);
   ```

### Customizing Agent Rendering
1. **Update VisualizationWidget::paintEvent()**:
   ```cpp
   // Change agent radius
   const double agentRadius = 8.0; // pixels
   
   // Change colors
   case AgentState::Custom:
       painter.setBrush(QColor(255, 165, 0)); // Orange
       break;
   ```

---

**Quick Ref Version**: 1.0  
**Last Updated**: January 2025  
**Sprint**: Phase 1, Sprint 2 - Metrics & Visualization  

---

*For full details, see [SPRINT_2_COMPLETE.md](SPRINT_2_COMPLETE.md)*
