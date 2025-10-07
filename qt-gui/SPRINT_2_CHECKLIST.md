# Phase 2: Sprint 2 — Metrics & Visualization

## Sprint Overview

**Sprint**: Phase 2 - Sprint 2  
**Focus**: Real-time Metrics and 2D Visualization  
**Duration**: 2-3 weeks (Oct 6 - Oct 27, 2025)  
**Dependencies**: Sprint 1 Complete ✅

---

## Objectives

Build a comprehensive visualization and metrics system that displays:
1. Real-time simulation metrics (population, infection rates, etc.)
2. 2D grid visualization with agent rendering
3. Time-series charts for historical data tracking
4. Performance optimization for smooth rendering

---

## Sprint Goals

### Primary Goals
- [ ] **MetricsPanel** - Display real-time statistics
- [ ] **VisualizationWidget** - 2D grid with agent rendering
- [ ] **ChartWidgets** - Time-series plots using Qt Charts
- [ ] **Performance** - Achieve 60 FPS with 10,000 agents

### Secondary Goals
- [ ] Agent color coding by state (Susceptible/Infected/Recovered/Dead)
- [ ] Zoom and pan controls for visualization
- [ ] Chart legends and tooltips
- [ ] Export visualization as image

---

## Component Breakdown

### 1. MetricsPanel (Priority 1)

**Purpose**: Real-time display of simulation statistics

**Features**:
- Live metric updates from snapshot data
- Key metrics: Population, Infected, Recovered, Dead, Infection Rate
- Clean grid layout with labels and values
- Color coding for critical thresholds
- Update rate: Every simulation step

**Implementation**:
- `src/ui/panels/MetricsPanel.h`
- `src/ui/panels/MetricsPanel.cpp`

**API**:
```cpp
class MetricsPanel : public QWidget {
    Q_OBJECT
public:
    explicit MetricsPanel(QWidget* parent = nullptr);
    
public slots:
    void updateMetrics(const QJsonObject& snapshot);
    void reset();
    
signals:
    void metricsUpdated();
    
private:
    struct Metrics {
        int totalPopulation;
        int susceptible;
        int infected;
        int recovered;
        int dead;
        double infectionRate;
        int currentStep;
    };
    
    Metrics extractMetrics(const QJsonObject& snapshot);
    void updateDisplay();
    
    QLabel* m_populationLabel;
    QLabel* m_susceptibleLabel;
    QLabel* m_infectedLabel;
    QLabel* m_recoveredLabel;
    QLabel* m_deadLabel;
    QLabel* m_infectionRateLabel;
    QLabel* m_stepLabel;
    Metrics m_currentMetrics;
};
```

**Acceptance Criteria**:
- [ ] Displays all 7 key metrics
- [ ] Updates on every snapshot
- [ ] Color codes infection rate (green <10%, yellow 10-30%, red >30%)
- [ ] Formats numbers with thousand separators
- [ ] Resets on simulation reset

**Estimated Time**: 1-2 days

---

### 2. VisualizationWidget (Priority 2)

**Purpose**: 2D grid visualization of agent positions and states

**Features**:
- Render grid with agent positions
- Color-code agents by health state:
  - Susceptible: Green
  - Infected: Red
  - Recovered: Blue
  - Dead: Gray
- Zoom and pan controls
- Performance-optimized rendering
- Grid cell highlighting on hover

**Implementation**:
- `src/ui/widgets/VisualizationWidget.h`
- `src/ui/widgets/VisualizationWidget.cpp`

**API**:
```cpp
class VisualizationWidget : public QWidget {
    Q_OBJECT
public:
    explicit VisualizationWidget(QWidget* parent = nullptr);
    
    void setGridSize(int width, int height);
    double zoomLevel() const { return m_zoomLevel; }
    
public slots:
    void updateAgents(const QJsonObject& snapshot);
    void reset();
    void zoomIn();
    void zoomOut();
    void resetZoom();
    
signals:
    void agentClicked(int agentId);
    void cellHovered(int x, int y);
    
protected:
    void paintEvent(QPaintEvent* event) override;
    void mousePressEvent(QMouseEvent* event) override;
    void mouseMoveEvent(QMouseEvent* event) override;
    void wheelEvent(QWheelEvent* event) override;
    
private:
    struct Agent {
        int id;
        double x, y;
        QString state;  // "susceptible", "infected", "recovered", "dead"
    };
    
    void renderGrid(QPainter& painter);
    void renderAgents(QPainter& painter);
    QColor getStateColor(const QString& state) const;
    QPointF worldToScreen(double x, double y) const;
    QPointF screenToWorld(int screenX, int screenY) const;
    
    int m_gridWidth;
    int m_gridHeight;
    QVector<Agent> m_agents;
    double m_zoomLevel;
    QPointF m_panOffset;
    bool m_isPanning;
    QPoint m_lastMousePos;
};
```

**Rendering Strategy**:
- Use QPainter for 2D rendering
- Batch render agents by state for efficiency
- Cull off-screen agents
- Cache grid lines
- Target: 60 FPS with 10,000 agents

**Acceptance Criteria**:
- [ ] Renders grid with correct dimensions
- [ ] Displays agents with correct colors
- [ ] Smooth zoom (mouse wheel)
- [ ] Smooth pan (mouse drag)
- [ ] Updates at 60 FPS with 10K agents
- [ ] Shows agent count in status

**Estimated Time**: 3-4 days

---

### 3. ChartWidgets (Priority 3)

**Purpose**: Time-series plots for historical metric tracking

**Features**:
- Multiple chart types: Line, Area, Stacked Area
- Tracked metrics: Population, Infected, Recovered, Dead
- X-axis: Simulation step
- Y-axis: Count
- Interactive legends (show/hide series)
- Auto-scaling Y-axis
- Export chart as PNG

**Implementation**:
- `src/ui/widgets/MetricsChartWidget.h`
- `src/ui/widgets/MetricsChartWidget.cpp`

**API**:
```cpp
class MetricsChartWidget : public QWidget {
    Q_OBJECT
public:
    explicit MetricsChartWidget(QWidget* parent = nullptr);
    
    void setMaxDataPoints(int max);
    
public slots:
    void addDataPoint(int step, const QJsonObject& metrics);
    void clear();
    void exportToPng(const QString& filePath);
    
signals:
    void seriesToggled(const QString& seriesName, bool visible);
    
private:
    QChart* m_chart;
    QLineSeries* m_susceptibleSeries;
    QLineSeries* m_infectedSeries;
    QLineSeries* m_recoveredSeries;
    QLineSeries* m_deadSeries;
    QValueAxis* m_axisX;
    QValueAxis* m_axisY;
    int m_maxDataPoints;
};
```

**Acceptance Criteria**:
- [ ] Displays 4 series (Susceptible, Infected, Recovered, Dead)
- [ ] Updates in real-time
- [ ] Auto-scales Y-axis
- [ ] Interactive legend
- [ ] Export to PNG
- [ ] Smooth rendering

**Estimated Time**: 2-3 days

---

### 4. MainWindow Integration (Priority 4)

**Purpose**: Integrate new panels into MainWindow

**Changes to MainWindow**:
- Add MetricsPanel as right dock widget
- Add VisualizationWidget as central widget
- Add ChartWidgets as tabbed bottom dock (alongside EventLog)
- Connect snapshot signals to all visualization components
- Add View menu items for show/hide panels
- Add toolbar zoom controls

**Updated Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ Menu Bar: File | Edit | View | Help                    │
├─────────────────────────────────────────────────────────┤
│ Toolbar: Start | Stop | Step | Reset | Zoom+ | Zoom-   │
├───────────┬─────────────────────────────┬───────────────┤
│           │                             │               │
│  Config   │    VisualizationWidget      │   Metrics     │
│  Panel    │      (Central Widget)       │   Panel       │
│  (Left)   │                             │   (Right)     │
│           │                             │               │
├───────────┴─────────────────────────────┴───────────────┤
│ Tabs: Event Log | Charts                                │
│                                                          │
│ [Selected tab content]                                  │
└─────────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] All panels integrated
- [ ] Snapshot data flows to all components
- [ ] Zoom controls affect VisualizationWidget
- [ ] View menu toggles panel visibility
- [ ] Layout saves/restores correctly

**Estimated Time**: 2 days

---

### 5. Unit Tests (Priority 5)

**Test Coverage**:

**tst_metricspanel.cpp**:
- Metric extraction from JSON
- Display formatting
- Color thresholds
- Reset functionality

**tst_visualizationwidget.cpp**:
- Agent rendering
- Coordinate transformations
- Zoom calculations
- Pan offset calculations

**tst_chartwidget.cpp**:
- Data point addition
- Series management
- Auto-scaling
- Clear functionality

**Acceptance Criteria**:
- [ ] 20+ test cases total
- [ ] All critical paths covered
- [ ] Mock snapshot data

**Estimated Time**: 2 days

---

### 6. Performance Optimization (Priority 6)

**Targets**:
- [ ] 60 FPS with 10,000 agents
- [ ] <100ms snapshot processing
- [ ] <16ms paint event
- [ ] <50MB memory for visualization data

**Optimization Strategies**:
- Spatial indexing for agent culling
- Batch rendering by state
- QPainter optimization (antialiasing only when needed)
- Circular buffer for chart data
- Lazy updates (skip frames if needed)

**Profiling Tools**:
- Qt Creator Performance Analyzer
- QElapsedTimer for critical sections
- Memory profiler for leak detection

**Acceptance Criteria**:
- [ ] Meets all performance targets
- [ ] No memory leaks
- [ ] Smooth user interaction

**Estimated Time**: 1-2 days

---

## Timeline

### Week 1 (Oct 6-12)
- **Day 1-2**: MetricsPanel implementation and testing
- **Day 3-5**: VisualizationWidget implementation
- **Day 6-7**: Initial integration and testing

### Week 2 (Oct 13-19)
- **Day 8-10**: ChartWidgets implementation
- **Day 11-12**: Complete MainWindow integration
- **Day 13-14**: Unit tests

### Week 3 (Oct 20-27)
- **Day 15-16**: Performance optimization
- **Day 17-18**: Polish and bug fixes
- **Day 19-20**: Documentation
- **Day 21**: Sprint review and demo

---

## Dependencies

### External
- Qt Charts module (`find_package(Qt6 REQUIRED COMPONENTS Charts)`)
- Qt >= 6.2 for Charts API

### Internal
- EngineClient snapshot signals (from Sprint 1) ✅
- Configuration for grid dimensions ✅
- EventLogPanel pattern for panel creation ✅

---

## Risk Assessment

### Technical Risks

**Risk**: Performance issues with 10K agents  
**Mitigation**: Implement spatial culling early, profile frequently

**Risk**: Qt Charts learning curve  
**Mitigation**: Start with simple line charts, iterate

**Risk**: Coordinate transformation bugs  
**Mitigation**: Extensive unit tests for math functions

### Schedule Risks

**Risk**: Visualization complexity underestimated  
**Mitigation**: MVP first (basic rendering), then polish

**Risk**: Integration takes longer than expected  
**Mitigation**: Incremental integration, test as we go

---

## Definition of Done

A Sprint 2 task is "done" when:
- [ ] Code is complete and follows CODING_STANDARDS.md
- [ ] Unit tests written and passing
- [ ] Integration tested with real snapshot data
- [ ] Doxygen documentation complete
- [ ] Performance targets met
- [ ] Code reviewed
- [ ] Merged to main branch

---

## Success Metrics

### Quantitative
- 60 FPS rendering at 10K agents
- <100ms snapshot processing time
- 20+ unit test cases
- 100% Doxygen coverage

### Qualitative
- Smooth, responsive visualization
- Clear, readable metrics display
- Intuitive zoom/pan controls
- Professional chart appearance

---

## Sprint Artifacts

### Code Deliverables
1. `src/ui/panels/MetricsPanel.h/.cpp`
2. `src/ui/widgets/VisualizationWidget.h/.cpp`
3. `src/ui/widgets/MetricsChartWidget.h/.cpp`
4. Updated `src/ui/MainWindow.h/.cpp`
5. `tests/unit/tst_metricspanel.cpp`
6. `tests/unit/tst_visualizationwidget.cpp`
7. `tests/unit/tst_chartwidget.cpp`

### Documentation
1. `SPRINT_2_CHECKLIST.md` (this file)
2. `SPRINT_2_COMPLETE.md` (at completion)
3. Updated `PHASE_2_SUMMARY.md`
4. Performance profiling report

---

## Next Sprint Preview

### Sprint 3: Advanced Features
- Agent inspection (click to view details)
- Heatmap visualization (infection density)
- Playback controls (pause, step-back, speed control)
- Multiple simulation comparison
- Configuration presets library

---

**Sprint Owner**: Development Team  
**Started**: October 6, 2025  
**Target Completion**: October 27, 2025  
**Status**: 🟢 Ready to Start
