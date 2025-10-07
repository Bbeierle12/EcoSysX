#include "MainWindow.h"
#include "panels/ConfigPanel.h"
#include "panels/EventLogPanel.h"
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

MainWindow::MainWindow(QWidget* parent)
    : QMainWindow(parent)
    , m_engineClient(nullptr)
    , m_engineThread(nullptr)
    , m_hasUnsavedChanges(false)
    , m_currentStep(0)
{
    setWindowTitle("EcoSysX - Qt GUI");
    resize(1200, 800);
    
    // Create UI components
    createActions();
    createMenus();
    createToolBar();
    createDockWidgets();
    createStatusBar();
    
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
            this, &MainWindow::onEngineStepped, Qt::QueuedConnection);
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
    
    // Connect engine control methods via QMetaObject (thread-safe)
    connect(m_startAction, &QAction::triggered, [this]() {
        QMetaObject::invokeMethod(m_engineClient, [this]() {
            m_engineClient->start(m_currentConfig);
        });
    });
    
    connect(m_stopAction, &QAction::triggered, [this]() {
        QMetaObject::invokeMethod(m_engineClient, &EngineClient::stop);
    });
    
    connect(m_stepAction, &QAction::triggered, [this]() {
        QMetaObject::invokeMethod(m_engineClient, &EngineClient::step);
    });
    
    connect(m_resetAction, &QAction::triggered, [this]() {
        QMetaObject::invokeMethod(m_engineClient, &EngineClient::reset);
    });
    
    // Start engine thread
    m_engineThread->start();
    
    // Load settings
    loadSettings();
    
    // Initial state
    updateUIState();
    updateStatusBar();
    
    m_logPanel->logInfo("Application started");
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
    m_logDock->setVisible(!m_logDock->isVisible());
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
    m_logPanel->logInfo("Engine started successfully");
    updateUIState();
    updateStatusBar();
}

void MainWindow::onEngineStopped() {
    m_logPanel->logInfo("Engine stopped");
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
    updateUIState();
    updateStatusBar();
}

void MainWindow::onEngineStateChanged(EngineClient::State state) {
    updateUIState();
    updateStatusBar();
    
    QString stateStr;
    switch (state) {
        case EngineClient::State::Idle:
            stateStr = "idle";
            break;
        case EngineClient::State::Starting:
            stateStr = "starting";
            break;
        case EngineClient::State::Running:
            stateStr = "running";
            break;
        case EngineClient::State::Stopping:
            stateStr = "stopping";
            break;
        case EngineClient::State::Stopped:
            stateStr = "stopped";
            break;
        case EngineClient::State::Error:
            stateStr = "error";
            break;
    }
    
    m_logPanel->logInfo(QString("Engine state changed to: %1").arg(stateStr));
}

void MainWindow::onEngineSnapshotReceived(const QJsonObject& snapshot) {
    // Future: Display snapshot data in visualization
    m_logPanel->logInfo("Snapshot received");
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
}

void MainWindow::createDockWidgets() {
    // Config panel (left)
    m_configPanel = new ConfigPanel();
    m_configDock = new QDockWidget("Configuration", this);
    m_configDock->setObjectName("ConfigDock");
    m_configDock->setWidget(m_configPanel);
    addDockWidget(Qt::LeftDockWidgetArea, m_configDock);
    
    // Log panel (bottom)
    m_logPanel = new EventLogPanel();
    m_logDock = new QDockWidget("Event Log", this);
    m_logDock->setObjectName("LogDock");
    m_logDock->setWidget(m_logPanel);
    addDockWidget(Qt::BottomDockWidgetArea, m_logDock);
    
    // Synchronize toggle actions with dock visibility
    connect(m_configDock, &QDockWidget::visibilityChanged,
            m_toggleConfigAction, &QAction::setChecked);
    connect(m_logDock, &QDockWidget::visibilityChanged,
            m_toggleLogAction, &QAction::setChecked);
}

void MainWindow::createStatusBar() {
    m_statusLabel = new QLabel("Ready");
    m_stepLabel = new QLabel("Step: 0");
    
    statusBar()->addWidget(m_statusLabel, 1);
    statusBar()->addPermanentWidget(m_stepLabel);
}

void MainWindow::updateUIState() {
    EngineClient::State state = m_engineClient->state();
    
    // Enable/disable actions based on state
    bool isIdle = (state == EngineClient::State::Idle || 
                   state == EngineClient::State::Stopped);
    bool isRunning = (state == EngineClient::State::Running);
    bool canStop = (state == EngineClient::State::Running || 
                    state == EngineClient::State::Starting);
    
    m_startAction->setEnabled(isIdle);
    m_stopAction->setEnabled(canStop);
    m_stepAction->setEnabled(isRunning);
    m_resetAction->setEnabled(!isIdle);
    
    // Disable config panel during simulation
    m_configPanel->setEnabled(isIdle);
}

void MainWindow::updateStatusBar() {
    m_statusLabel->setText(stateToStatusText(m_engineClient->state()));
    m_stepLabel->setText(QString("Step: %1").arg(m_currentStep));
}

QString MainWindow::stateToStatusText(EngineClient::State state) const {
    switch (state) {
        case EngineClient::State::Idle:
            return "Ready";
        case EngineClient::State::Starting:
            return "Starting engine...";
        case EngineClient::State::Running:
            return "Simulation running";
        case EngineClient::State::Stopping:
            return "Stopping...";
        case EngineClient::State::Stopped:
            return "Stopped";
        case EngineClient::State::Error:
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
