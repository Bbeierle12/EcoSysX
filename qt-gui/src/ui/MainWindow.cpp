#include "MainWindow.h"
#include "panels/ConfigPanel.h"
#include "panels/EventLogPanel.h"
#include "panels/MetricsPanel.h"
#include "widgets/VisualizationWidget.h"
#include "widgets/Visualization3DWidget.h"
#include "widgets/MetricsChartWidget.h"
#include <QMenuBar>
#include <QToolBar>
#include <QStatusBar>
#include <QDockWidget>
#include <QLabel>
#include <QMessageBox>
#include <QFileDialog>
#include <QCloseEvent>
#include <QSettings>
#include <QDesktopServices>
#include <QUrl>
#include <QThread>
#include <QApplication>
#include <QTabWidget>
#include <QTimer>

MainWindow::MainWindow(QWidget* parent)
    : QMainWindow(parent)
    , m_engineClient(nullptr)
    , m_engineInterface(nullptr)
    , m_engineThread(nullptr)
    , m_hasUnsavedChanges(false)
    , m_currentStep(0)
    , m_useWebSocket(true)  // Default to WebSocket mode
    , m_currentState(EngineState::Idle)  // Initialize engine state
{
    setWindowTitle("EcoSysX - Qt GUI [WebSocket Mode]");
    setWindowIcon(QIcon(":/icons/icons/app.svg"));
    resize(1200, 800);
    
    // Create UI components
    createActions();
    createMenus();
    createToolBar();
    createDockWidgets();
    createStatusBar();
    
    // Set central widget - 3D visualization
    m_visualization3DWidget = new Visualization3DWidget();
    setCentralWidget(m_visualization3DWidget);
    
    // Keep 2D widget for potential fallback (not shown)
    m_visualizationWidget = new VisualizationWidget();
    m_visualizationWidget->hide();
    
    // Snapshot timer for periodic updates via WebSocket
    m_snapshotTimer = new QTimer(this);
    m_snapshotTimer->setInterval(1000);
    connect(m_snapshotTimer, &QTimer::timeout, this, [this]() {
        // Request snapshot via WebSocket
        m_engineInterface->requestSnapshot("full");
    });
    
    // Create engine client in worker thread
    m_engineThread = new QThread(this);
    m_engineClient = new EngineClient();
    m_engineClient->moveToThread(m_engineThread);
    
    // Connect engine signals (use QueuedConnection for thread safety)
    connect(m_engineClient, &EngineClient::started,
            this, &MainWindow::onEngineStarted, Qt::QueuedConnection);
    connect(m_engineClient, &EngineClient::stopped,
            this, &MainWindow::onEngineStopped, Qt::QueuedConnection);
    connect(m_engineClient, &EngineClient::stepped,
            this, [this](int tick) {
                onEngineStepped(tick, 0);
                // Snapshot will be requested by timer or on state change to Running
            }, Qt::QueuedConnection);
    connect(m_engineClient, &EngineClient::errorOccurred,
            this, &MainWindow::onEngineError, Qt::QueuedConnection);
    connect(m_engineClient, &EngineClient::stateChanged,
            this, &MainWindow::onEngineStateChanged, Qt::QueuedConnection);
    connect(m_engineClient, &EngineClient::snapshotReceived,
            this, &MainWindow::onEngineSnapshotReceived, Qt::QueuedConnection);
    connect(m_engineClient, &EngineClient::logMessage,
            this, &MainWindow::onEngineLogMessage, Qt::QueuedConnection);
    
    // Connect config panel signals
    connect(m_configPanel, &ConfigPanel::configurationChanged,
            this, &MainWindow::onConfigurationChanged);
    connect(m_configPanel, &ConfigPanel::dirtyStateChanged,
            this, &MainWindow::onConfigDirtyStateChanged);
    
    // Connect engine control methods via WebSocket
    connect(m_startAction, &QAction::triggered, [this]() {
        m_logPanel->logInfo("User initiated: Start simulation");
        
        // Validate configuration
        if (!m_currentConfig.validate()) {
            QStringList errors;
            m_currentConfig.validate(&errors);
            QString errorMsg = QString("Configuration invalid: %1").arg(errors.join("; "));
            m_logPanel->logError(errorMsg);
            QMessageBox::warning(this, "Invalid Configuration", errorMsg);
            return;
        }
        
        // Start simulation via WebSocket with provider info
        QJsonObject options;
        options["provider"] = "internal";  // Use internal Genesis Engine provider
        m_engineInterface->startSimulation(m_currentConfig.toJson(), options, false);
    });
    
    connect(m_stopAction, &QAction::triggered, [this]() {
        m_logPanel->logInfo("User initiated: Stop simulation");
        m_engineInterface->stopSimulation();
    });
    
    connect(m_stepAction, &QAction::triggered, [this]() {
        m_logPanel->logInfo("User initiated: Step simulation");
        m_engineInterface->stepSimulation(1);
    });
    
    connect(m_resetAction, &QAction::triggered, [this]() {
        m_logPanel->logInfo("User initiated: Reset simulation");
        
        // Stop current simulation, then restart
        m_engineInterface->stopSimulation();
        
        // Wait for clean stop, then restart with current config
        QTimer::singleShot(500, this, [this]() {
            if (m_currentConfig.validate()) {
                QJsonObject options;
                options["provider"] = "internal";  // Use internal Genesis Engine provider
                m_engineInterface->startSimulation(m_currentConfig.toJson(), options, false);
            }
        });
    });
    
    // Start engine thread
    m_engineThread->start();
    
    // Create WebSocket-based engine interface
    m_engineInterface = new EngineInterface(this);
    
    // Connect WebSocket signals
    connect(m_engineInterface, &EngineInterface::connected,
            this, &MainWindow::onWebSocketConnected);
    connect(m_engineInterface, &EngineInterface::disconnected,
            this, &MainWindow::onWebSocketDisconnected);
    connect(m_engineInterface, &EngineInterface::errorOccurred,
            this, &MainWindow::onWebSocketError);
    connect(m_engineInterface, &EngineInterface::stateUpdated,
            this, &MainWindow::onWebSocketStateUpdated);
    connect(m_engineInterface, &EngineInterface::simulationStarted,
            this, &MainWindow::onWebSocketSimulationStarted);
    connect(m_engineInterface, &EngineInterface::simulationStopped,
            this, &MainWindow::onWebSocketSimulationStopped);
    connect(m_engineInterface, &EngineInterface::simulationStepped,
            this, &MainWindow::onWebSocketSimulationStepped);
    connect(m_engineInterface, &EngineInterface::snapshotReceived,
            this, &MainWindow::onWebSocketSnapshotReceived);
    connect(m_engineInterface, &EngineInterface::snapshotReceived,
            m_visualization3DWidget, &Visualization3DWidget::updateAgents);
    connect(m_engineInterface, &EngineInterface::logMessage,
            m_logPanel, &EventLogPanel::logInfo);
    
    // Connect to engine server
    m_engineInterface->connectToEngine("ws://localhost:8765");
    
    // Load settings
    loadSettings();
    
    // Initial state
    updateUIState();
    updateStatusBar();
    
    m_logPanel->logInfo("Application started");
    m_logPanel->logInfo("Connecting to engine server at ws://localhost:8765...");
}

MainWindow::~MainWindow() {
    // Stop engine thread gracefully
    if (m_engineThread) {
        m_engineThread->quit();
        m_engineThread->wait(3000);
    }
    
    // Clean up (engine client deleted by thread)
    delete m_engineClient;
}

void MainWindow::closeEvent(QCloseEvent* event) {
    if (m_hasUnsavedChanges && !confirmDiscardChanges()) {
        event->ignore();
        return;
    }
    
    saveSettings();
    event->accept();
}

void MainWindow::onNewConfig() {
    if (m_hasUnsavedChanges && !confirmDiscardChanges()) {
        return;
    }
    
    m_configPanel->reset();
    m_currentConfigFile.clear();
    m_logPanel->logInfo("Created new configuration");
}

void MainWindow::onOpenConfig() {
    if (m_hasUnsavedChanges && !confirmDiscardChanges()) {
        return;
    }
    
    if (m_configPanel->loadFromFile()) {
        m_currentConfigFile = QString();  // ConfigPanel handles file path
    }
}

void MainWindow::onSaveConfig() {
    if (m_currentConfigFile.isEmpty()) {
        onSaveConfigAs();
    } else {
        m_configPanel->saveToFile(m_currentConfigFile);
    }
}

void MainWindow::onSaveConfigAs() {
    if (m_configPanel->saveToFile()) {
        // ConfigPanel handles save dialog
    }
}

void MainWindow::onExit() {
    close();
}

void MainWindow::onPreferences() {
    QMessageBox::information(this, "Preferences",
        "Preferences dialog not yet implemented.");
}

void MainWindow::onToggleConfigPanel() {
    m_configDock->setVisible(!m_configDock->isVisible());
}

void MainWindow::onToggleLogPanel() {
    m_bottomDock->setVisible(!m_bottomDock->isVisible());
    // Switch to log tab if showing
    if (m_bottomDock->isVisible()) {
        m_bottomTabs->setCurrentWidget(m_logPanel);
    }
}

void MainWindow::onToggleMetricsPanel() {
    m_metricsDock->setVisible(!m_metricsDock->isVisible());
}

void MainWindow::onToggleBottomDock() {
    m_bottomDock->setVisible(!m_bottomDock->isVisible());
}

void MainWindow::onZoomIn() {
    if (m_visualizationWidget) {
        m_visualizationWidget->zoomIn();
    }
}

void MainWindow::onZoomOut() {
    if (m_visualizationWidget) {
        m_visualizationWidget->zoomOut();
    }
}

void MainWindow::onResetZoom() {
    if (m_visualizationWidget) {
        m_visualizationWidget->resetZoom();
    }
}

void MainWindow::onExportChart() {
    QString fileName = QFileDialog::getSaveFileName(
        this,
        "Export Metrics Chart",
        "metrics_chart.png",
        "PNG Images (*.png);;All Files (*)");
    
    if (!fileName.isEmpty()) {
        if (m_chartWidget->exportToPng(fileName)) {
            m_logPanel->logInfo("Chart exported to: " + fileName);
            QMessageBox::information(this, "Export Successful",
                "Chart exported successfully to:\n" + fileName);
        } else {
            m_logPanel->logError("Failed to export chart to: " + fileName);
            QMessageBox::warning(this, "Export Failed",
                "Failed to export chart to:\n" + fileName);
        }
    }
}

void MainWindow::onAbout() {
    QMessageBox::about(this, "About EcoSysX",
        "<h2>EcoSysX Qt GUI</h2>"
        "<p>Version 0.1.0</p>"
        "<p>A high-performance ecosystem simulation platform.</p>"
        "<p>Copyright © 2025</p>");
}

void MainWindow::onDocumentation() {
    QDesktopServices::openUrl(QUrl("https://github.com/yourusername/ecosysx"));
}

void MainWindow::onStart() {
    m_logPanel->logInfo("Starting simulation...");
    m_currentStep = 0;
    // Actual start happens via connected lambda
}

void MainWindow::onStop() {
    m_logPanel->logInfo("Stopping simulation...");
    // Actual stop happens via connected lambda
}

void MainWindow::onStep() {
    m_logPanel->logInfo("Stepping simulation...");
    // Actual step happens via connected lambda
}

void MainWindow::onReset() {
    m_logPanel->logInfo("Resetting simulation...");
    m_currentStep = 0;
    updateStatusBar();
    // Actual reset happens via connected lambda
}

void MainWindow::onEngineStarted() {
    // Engine is now fully initialized and ready
    m_logPanel->logInfo("Engine initialized and ready");
    
    updateUIState();
    updateStatusBar();
    // Don't start timer yet - wait for Running state with actual steps
}

void MainWindow::onEngineStopped() {
    m_logPanel->logInfo("Engine stopped");
    if (m_snapshotTimer) {
        m_snapshotTimer->stop();
    }
    updateUIState();
    updateStatusBar();
}

void MainWindow::onEngineStepped(int currentStep, int totalSteps) {
    m_currentStep = currentStep;
    updateStatusBar();
    
    if (currentStep % 100 == 0) {
        m_logPanel->logInfo(QString("Step %1 of %2 complete")
            .arg(currentStep).arg(totalSteps));
    }
}

void MainWindow::onEngineError(const QString& error) {
    m_logPanel->logError(QString("Engine error: %1").arg(error));
    QMessageBox::critical(this, "Engine Error", error);
    if (m_snapshotTimer) {
        m_snapshotTimer->stop();
    }
    updateUIState();
    updateStatusBar();
}

void MainWindow::onEngineStateChanged(EngineState state) {
    // Handle snapshot timer based on state
    if (state == EngineState::Running && m_snapshotTimer) {
        // Engine is now fully initialized and running - start periodic snapshots
        m_snapshotTimer->start();
        m_engineInterface->requestSnapshot("full");
    } else if (state != EngineState::Running && m_snapshotTimer) {
        m_snapshotTimer->stop();
    }
    
    updateUIState();
    updateStatusBar();
    
    QString stateStr;
    switch (state) {
        case EngineState::Idle:
            stateStr = "idle";
            break;
        case EngineState::Starting:
            stateStr = "starting";
            break;
        case EngineState::Running:
            stateStr = "running";
            break;
        case EngineState::Stepping:
            stateStr = "stepping";
            break;
        case EngineState::Stopping:
            stateStr = "stopping";
            break;
        case EngineState::Stopped:
            stateStr = "stopped";
            break;
        case EngineState::Error:
            stateStr = "error";
            break;
    }
    
    m_logPanel->logInfo(QString("Engine state changed to: %1").arg(stateStr));
}

void MainWindow::onEngineSnapshotReceived(const QJsonObject& snapshot) {
    // Update all visualization components
    m_metricsPanel->updateMetrics(snapshot);
    m_visualizationWidget->updateAgents(snapshot);
    
    int step = snapshot["step"].toInt();
    m_chartWidget->addDataPoint(step, snapshot);
}

void MainWindow::onEngineLogMessage(const QString& message) {
    m_logPanel->logInfo(QString("Engine: %1").arg(message));
}

void MainWindow::onConfigurationChanged(const Configuration& config) {
    m_currentConfig = config;
    m_logPanel->logInfo("Configuration applied");
}

void MainWindow::onConfigDirtyStateChanged(bool dirty) {
    m_hasUnsavedChanges = dirty;
    
    QString title = "EcoSysX - Qt GUI";
    if (!m_currentConfigFile.isEmpty()) {
        title += QString(" - %1").arg(m_currentConfigFile);
    }
    if (dirty) {
        title += " *";
    }
    setWindowTitle(title);
}

void MainWindow::createActions() {
    // File menu
    m_newAction = new QAction("&New Configuration", this);
    m_newAction->setShortcut(QKeySequence::New);
    connect(m_newAction, &QAction::triggered, this, &MainWindow::onNewConfig);
    
    m_openAction = new QAction("&Open Configuration...", this);
    m_openAction->setShortcut(QKeySequence::Open);
    connect(m_openAction, &QAction::triggered, this, &MainWindow::onOpenConfig);
    
    m_saveAction = new QAction("&Save Configuration", this);
    m_saveAction->setShortcut(QKeySequence::Save);
    connect(m_saveAction, &QAction::triggered, this, &MainWindow::onSaveConfig);
    
    m_saveAsAction = new QAction("Save Configuration &As...", this);
    m_saveAsAction->setShortcut(QKeySequence::SaveAs);
    connect(m_saveAsAction, &QAction::triggered, this, &MainWindow::onSaveConfigAs);
    
    m_exitAction = new QAction("E&xit", this);
    m_exitAction->setShortcut(QKeySequence::Quit);
    connect(m_exitAction, &QAction::triggered, this, &MainWindow::onExit);
    
    // Edit menu
    m_preferencesAction = new QAction("&Preferences...", this);
    m_preferencesAction->setShortcut(QKeySequence::Preferences);
    connect(m_preferencesAction, &QAction::triggered, this, &MainWindow::onPreferences);
    
    // View menu
    m_toggleConfigAction = new QAction("Show &Configuration Panel", this);
    m_toggleConfigAction->setCheckable(true);
    m_toggleConfigAction->setChecked(true);
    connect(m_toggleConfigAction, &QAction::triggered, this, &MainWindow::onToggleConfigPanel);
    
    m_toggleLogAction = new QAction("Show &Event Log", this);
    m_toggleLogAction->setCheckable(true);
    m_toggleLogAction->setChecked(true);
    connect(m_toggleLogAction, &QAction::triggered, this, &MainWindow::onToggleLogPanel);
    
    // Help menu
    m_aboutAction = new QAction("&About", this);
    connect(m_aboutAction, &QAction::triggered, this, &MainWindow::onAbout);
    
    m_documentationAction = new QAction("&Documentation", this);
    m_documentationAction->setShortcut(QKeySequence::HelpContents);
    connect(m_documentationAction, &QAction::triggered, this, &MainWindow::onDocumentation);
    
    // Toolbar actions
    m_startAction = new QAction("Start", this);
    m_startAction->setToolTip("Start simulation");
    
    m_stopAction = new QAction("Stop", this);
    m_stopAction->setToolTip("Stop simulation");
    
    m_stepAction = new QAction("Step", this);
    m_stepAction->setToolTip("Step simulation one tick");
    
    m_resetAction = new QAction("Reset", this);
    m_resetAction->setToolTip("Reset simulation state");
    
    // Sprint 2: Visualization controls
    m_zoomInAction = new QAction("Zoom &In", this);
    m_zoomInAction->setShortcut(QKeySequence::ZoomIn);
    m_zoomInAction->setToolTip("Zoom in on visualization");
    connect(m_zoomInAction, &QAction::triggered, this, &MainWindow::onZoomIn);
    
    m_zoomOutAction = new QAction("Zoom &Out", this);
    m_zoomOutAction->setShortcut(QKeySequence::ZoomOut);
    m_zoomOutAction->setToolTip("Zoom out on visualization");
    connect(m_zoomOutAction, &QAction::triggered, this, &MainWindow::onZoomOut);
    
    m_resetZoomAction = new QAction("&Reset Zoom", this);
    m_resetZoomAction->setShortcut(QKeySequence("Ctrl+0"));
    m_resetZoomAction->setToolTip("Reset visualization zoom to 1:1");
    connect(m_resetZoomAction, &QAction::triggered, this, &MainWindow::onResetZoom);
    
    m_exportChartAction = new QAction("&Export Chart...", this);
    m_exportChartAction->setShortcut(QKeySequence("Ctrl+E"));
    m_exportChartAction->setToolTip("Export metrics chart to PNG file");
    connect(m_exportChartAction, &QAction::triggered, this, &MainWindow::onExportChart);
}

void MainWindow::createMenus() {
    // File menu
    QMenu* fileMenu = menuBar()->addMenu("&File");
    fileMenu->addAction(m_newAction);
    fileMenu->addAction(m_openAction);
    fileMenu->addSeparator();
    fileMenu->addAction(m_saveAction);
    fileMenu->addAction(m_saveAsAction);
    fileMenu->addSeparator();
    fileMenu->addAction(m_exitAction);
    
    // Edit menu
    QMenu* editMenu = menuBar()->addMenu("&Edit");
    editMenu->addAction(m_preferencesAction);
    
    // View menu
    QMenu* viewMenu = menuBar()->addMenu("&View");
    viewMenu->addAction(m_toggleConfigAction);
    viewMenu->addAction(m_toggleLogAction);
    viewMenu->addSeparator();
    
    // Sprint 2: Add new dock toggles
    m_toggleMetricsAction = new QAction("Show &Metrics Panel", this);
    m_toggleMetricsAction->setCheckable(true);
    m_toggleMetricsAction->setChecked(true);
    connect(m_toggleMetricsAction, &QAction::triggered, this, &MainWindow::onToggleMetricsPanel);
    viewMenu->addAction(m_toggleMetricsAction);
    
    m_toggleBottomDockAction = new QAction("Show &Bottom Panel", this);
    m_toggleBottomDockAction->setCheckable(true);
    m_toggleBottomDockAction->setChecked(true);
    connect(m_toggleBottomDockAction, &QAction::triggered, this, &MainWindow::onToggleBottomDock);
    viewMenu->addAction(m_toggleBottomDockAction);
    
    viewMenu->addSeparator();
    viewMenu->addAction(m_zoomInAction);
    viewMenu->addAction(m_zoomOutAction);
    viewMenu->addAction(m_resetZoomAction);
    viewMenu->addSeparator();
    viewMenu->addAction(m_exportChartAction);
    
    // Help menu
    QMenu* helpMenu = menuBar()->addMenu("&Help");
    helpMenu->addAction(m_documentationAction);
    helpMenu->addSeparator();
    helpMenu->addAction(m_aboutAction);
}

void MainWindow::createToolBar() {
    QToolBar* toolbar = addToolBar("Controls");
    toolbar->setObjectName("ControlsToolBar");
    toolbar->addAction(m_startAction);
    toolbar->addAction(m_stopAction);
    toolbar->addAction(m_stepAction);
    toolbar->addSeparator();
    toolbar->addAction(m_resetAction);
    
    // Sprint 2: Add visualization controls to toolbar
    toolbar->addSeparator();
    toolbar->addAction(m_zoomInAction);
    toolbar->addAction(m_zoomOutAction);
    toolbar->addAction(m_resetZoomAction);
}

void MainWindow::createDockWidgets() {
    // Config panel (left)
    m_configPanel = new ConfigPanel();
    m_configDock = new QDockWidget("Configuration", this);
    m_configDock->setObjectName("ConfigDock");
    m_configDock->setWidget(m_configPanel);
    addDockWidget(Qt::LeftDockWidgetArea, m_configDock);
    
    // Sprint 2: Metrics panel (right)
    m_metricsPanel = new MetricsPanel();
    m_metricsDock = new QDockWidget("Metrics", this);
    m_metricsDock->setObjectName("MetricsDock");
    m_metricsDock->setWidget(m_metricsPanel);
    addDockWidget(Qt::RightDockWidgetArea, m_metricsDock);
    
    // Sprint 2: Bottom tabbed dock (Event Log + Charts)
    m_logPanel = new EventLogPanel();
    m_chartWidget = new MetricsChartWidget();
    
    m_bottomTabs = new QTabWidget();
    m_bottomTabs->addTab(m_logPanel, "Event Log");
    m_bottomTabs->addTab(m_chartWidget, "Metrics Charts");
    
    m_bottomDock = new QDockWidget("Data", this);
    m_bottomDock->setObjectName("BottomDock");
    m_bottomDock->setWidget(m_bottomTabs);
    addDockWidget(Qt::BottomDockWidgetArea, m_bottomDock);
    
    // Synchronize toggle actions with dock visibility
    connect(m_configDock, &QDockWidget::visibilityChanged,
            m_toggleConfigAction, &QAction::setChecked);
    connect(m_metricsDock, &QDockWidget::visibilityChanged,
            m_toggleMetricsAction, &QAction::setChecked);
    connect(m_bottomDock, &QDockWidget::visibilityChanged,
            m_toggleBottomDockAction, &QAction::setChecked);
}

void MainWindow::createStatusBar() {
    m_statusLabel = new QLabel("Ready");
    m_stepLabel = new QLabel("Step: 0");
    
    statusBar()->addWidget(m_statusLabel, 1);
    statusBar()->addPermanentWidget(m_stepLabel);
}

void MainWindow::updateUIState() {
    // Use tracked state instead of querying EngineClient
    EngineState state = m_currentState;
    
    // Enable/disable actions based on state
    bool isIdle = (state == EngineState::Idle || 
                   state == EngineState::Stopped);
    bool isRunning = (state == EngineState::Running);
    bool canStop = (state == EngineState::Running || 
                    state == EngineState::Starting);
    
    m_startAction->setEnabled(isIdle);
    m_stopAction->setEnabled(canStop);
    m_stepAction->setEnabled(isRunning);
    m_resetAction->setEnabled(!isIdle);
    
    // Disable config panel during simulation
    m_configPanel->setEnabled(isIdle);
}

void MainWindow::updateStatusBar() {
    m_statusLabel->setText(stateToStatusText(m_currentState));
    m_stepLabel->setText(QString("Step: %1").arg(m_currentStep));
}

QString MainWindow::stateToStatusText(EngineState state) const {
    switch (state) {
        case EngineState::Idle:
            return "Ready";
        case EngineState::Starting:
            return "Starting engine...";
        case EngineState::Running:
            return "Simulation running";
        case EngineState::Stepping:
            return "Executing step...";
        case EngineState::Stopping:
            return "Stopping...";
        case EngineState::Stopped:
            return "Stopped";
        case EngineState::Error:
            return "Error - see log for details";
        default:
            return "Unknown state";
    }
}

bool MainWindow::confirmDiscardChanges() {
    auto reply = QMessageBox::question(
        this,
        "Unsaved Changes",
        "You have unsaved configuration changes. Discard them?",
        QMessageBox::Discard | QMessageBox::Cancel
    );
    
    return reply == QMessageBox::Discard;
}

void MainWindow::loadSettings() {
    QSettings settings("EcoSysX", "QtGUI");
    
    // Window geometry
    restoreGeometry(settings.value("geometry").toByteArray());
    restoreState(settings.value("windowState").toByteArray());
    
    // Last config file
    m_currentConfigFile = settings.value("lastConfigFile").toString();
    if (!m_currentConfigFile.isEmpty() && QFile::exists(m_currentConfigFile)) {
        m_configPanel->loadFromFile(m_currentConfigFile);
    }
}

void MainWindow::saveSettings() {
    QSettings settings("EcoSysX", "QtGUI");
    
    // Window geometry
    settings.setValue("geometry", saveGeometry());
    settings.setValue("windowState", saveState());
    
    // Last config file
    settings.setValue("lastConfigFile", m_currentConfigFile);
}

void MainWindow::requestSnapshotAsync(const QString& kind) {
    if (!m_engineClient) {
        return;
    }
    
    QMetaObject::invokeMethod(m_engineClient, [this, kind]() {
        if (m_engineClient->isRunning()) {
            m_engineClient->requestSnapshot(kind);
        }
    }, Qt::QueuedConnection);
}

// ===========================================================================
// WebSocket-based EngineInterface slots
// ===========================================================================

void MainWindow::onWebSocketConnected() {
    m_logPanel->logInfo("✅ Connected to Genesis Engine via WebSocket");
    m_statusLabel->setText("Connected to engine server");
    
    // Request initial state
    m_engineInterface->requestState();
}

void MainWindow::onWebSocketDisconnected() {
    m_logPanel->logWarning("❌ Disconnected from Genesis Engine");
    m_statusLabel->setText("Disconnected - attempting to reconnect...");
}

void MainWindow::onWebSocketError(const QString& error) {
    m_logPanel->logError(QString("Engine error: %1").arg(error));
    QMessageBox::warning(this, "Engine Error", error);
}

void MainWindow::onWebSocketStateUpdated(bool running, int tick) {
    m_currentStep = tick;
    
    // Update tracked state
    m_currentState = running ? EngineState::Running : EngineState::Stopped;
    
    // Update UI based on state
    updateUIState();
    updateStatusBar();
}

void MainWindow::onWebSocketSimulationStarted(int tick, const QString& provider) {
    m_currentStep = tick;
    m_currentState = EngineState::Running;
    
    m_logPanel->logInfo(QString("✅ Simulation started (provider: %1)").arg(provider));
    
    // Start snapshot timer for periodic updates
    m_snapshotTimer->start();
    
    // Update UI
    updateUIState();
    updateStatusBar();
    m_configPanel->setEnabled(false);
}

void MainWindow::onWebSocketSimulationStopped(int tick) {
    m_currentStep = tick;
    m_currentState = EngineState::Stopped;
    
    m_logPanel->logInfo(QString("⏹️ Simulation stopped at tick %1").arg(tick));
    
    // Stop snapshot timer
    m_snapshotTimer->stop();
    
    // Update UI
    updateUIState();
    updateStatusBar();
}

void MainWindow::onWebSocketSimulationStepped(int steps, int tick) {
    m_currentStep = tick;
    m_currentState = EngineState::Stepping;
    
    updateStatusBar();
    
    // Request snapshot after stepping
    m_engineInterface->requestSnapshot("metrics");
}

void MainWindow::onWebSocketSnapshotReceived(const QJsonObject& snapshot) {
    // Extract metrics and update panels
    if (snapshot.contains("metrics")) {
        QJsonObject metrics = snapshot["metrics"].toObject();
        m_metricsPanel->updateMetrics(metrics);
        m_chartWidget->addDataPoint(m_currentStep, snapshot);
    }
    
    // Update visualization with agent state data
    if (snapshot.contains("state") && snapshot["state"].toObject().contains("agents")) {
        QJsonObject state = snapshot["state"].toObject();
        m_visualizationWidget->updateAgents(state);
    }
}
