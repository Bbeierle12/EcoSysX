#include <QtTest/QtTest>
#include "../src/ui/MainWindow.h"
#include "../src/ui/panels/ConfigPanel.h"
#include "../src/ui/panels/EventLogPanel.h"
#include "../src/core/EngineClient.h"
#include <QSignalSpy>
#include <QPushButton>
#include <QAction>

/**
 * @brief Integration tests for MainWindow workflows
 * 
 * These tests verify end-to-end workflows through the MainWindow UI,
 * including configuration changes, engine control, and error handling.
 */
class TestMainWindowIntegration : public QObject {
    Q_OBJECT
    
private slots:
    void initTestCase() {
        // Setup test environment
    }
    
    void cleanupTestCase() {
        // Cleanup test environment
    }
    
    void init() {
        m_mainWindow = new MainWindow();
        m_mainWindow->show();
        QTest::qWaitForWindowExposed(m_mainWindow);
    }
    
    void cleanup() {
        delete m_mainWindow;
    }
    
    /**
     * Test initial window state
     */
    void testInitialState() {
        QVERIFY(m_mainWindow->isVisible());
        QVERIFY(m_mainWindow->windowTitle().contains("EcoSysX"));
        
        // Check that panels are present
        ConfigPanel* configPanel = m_mainWindow->findChild<ConfigPanel*>();
        QVERIFY(configPanel != nullptr);
        
        EventLogPanel* logPanel = m_mainWindow->findChild<EventLogPanel*>();
        QVERIFY(logPanel != nullptr);
    }
    
    /**
     * Test configuration panel interaction
     */
    void testConfigPanelInteraction() {
        ConfigPanel* configPanel = m_mainWindow->findChild<ConfigPanel*>();
        QVERIFY(configPanel != nullptr);
        
        Configuration config;
        config.simulation.maxSteps = 50000;
        config.agents.initialPopulation = 500;
        
        QSignalSpy dirtyStateSpy(configPanel, &ConfigPanel::dirtyStateChanged);
        
        configPanel->setConfiguration(config);
        
        QCOMPARE(configPanel->configuration().simulation.maxSteps, 50000);
        QCOMPARE(configPanel->configuration().agents.initialPopulation, 500);
        
        // Initially not dirty after setConfiguration
        QVERIFY(!configPanel->isDirty());
    }
    
    /**
     * Test event log panel
     */
    void testEventLogPanel() {
        EventLogPanel* logPanel = m_mainWindow->findChild<EventLogPanel*>();
        QVERIFY(logPanel != nullptr);
        
        int initialCount = logPanel->entryCount();
        
        logPanel->logInfo("Test info message");
        QVERIFY(logPanel->entryCount() > initialCount);
        
        logPanel->logWarning("Test warning message");
        logPanel->logError("Test error message");
        
        QVERIFY(logPanel->entryCount() >= initialCount + 3);
    }
    
    /**
     * Test toolbar actions are present
     */
    void testToolbarActions() {
        QList<QAction*> actions = m_mainWindow->findChildren<QAction*>();
        
        QStringList actionTexts;
        for (QAction* action : actions) {
            actionTexts << action->text();
        }
        
        // Check for key actions
        QVERIFY(actionTexts.contains("Start"));
        QVERIFY(actionTexts.contains("Stop"));
        QVERIFY(actionTexts.contains("Step"));
        QVERIFY(actionTexts.contains("Reset"));
    }
    
    /**
     * Test menu structure
     */
    void testMenuStructure() {
        QMenuBar* menuBar = m_mainWindow->menuBar();
        QVERIFY(menuBar != nullptr);
        
        QList<QMenu*> menus = menuBar->findChildren<QMenu*>();
        QStringList menuTitles;
        for (QMenu* menu : menus) {
            menuTitles << menu->title();
        }
        
        // Check for expected menus
        QVERIFY(menuTitles.join(" ").contains("File"));
        QVERIFY(menuTitles.join(" ").contains("Help"));
    }
    
    /**
     * Test configuration workflow
     */
    void testConfigurationWorkflow() {
        ConfigPanel* configPanel = m_mainWindow->findChild<ConfigPanel*>();
        QVERIFY(configPanel != nullptr);
        
        QSignalSpy configChangedSpy(configPanel, &ConfigPanel::configurationChanged);
        
        // Modify configuration
        Configuration newConfig;
        newConfig.simulation.maxSteps = 75000;
        configPanel->setConfiguration(newConfig);
        
        // Apply configuration
        bool applied = configPanel->apply();
        QVERIFY(applied);
        
        QVERIFY(configChangedSpy.count() > 0);
    }
    
    /**
     * Test log clearing
     */
    void testLogClearing() {
        EventLogPanel* logPanel = m_mainWindow->findChild<EventLogPanel*>();
        QVERIFY(logPanel != nullptr);
        
        logPanel->logInfo("Message 1");
        logPanel->logInfo("Message 2");
        logPanel->logInfo("Message 3");
        
        int countBeforeClear = logPanel->entryCount();
        QVERIFY(countBeforeClear >= 3);
        
        logPanel->clear();
        
        // Clear adds one "Log cleared" message
        QVERIFY(logPanel->entryCount() < countBeforeClear);
    }
    
    /**
     * Test window resize
     */
    void testWindowResize() {
        QSize initialSize = m_mainWindow->size();
        
        m_mainWindow->resize(1000, 600);
        QTest::qWait(100);
        
        QCOMPARE(m_mainWindow->size(), QSize(1000, 600));
        QVERIFY(m_mainWindow->size() != initialSize);
    }
    
    /**
     * Test dock widget visibility
     */
    void testDockWidgetVisibility() {
        QList<QDockWidget*> docks = m_mainWindow->findChildren<QDockWidget*>();
        QVERIFY(docks.size() >= 2);  // Config and Log docks
        
        // Check initial visibility
        for (QDockWidget* dock : docks) {
            QVERIFY(dock->isVisible());
        }
    }
    
    /**
     * Test validation error display
     */
    void testValidationErrorDisplay() {
        ConfigPanel* configPanel = m_mainWindow->findChild<ConfigPanel*>();
        QVERIFY(configPanel != nullptr);
        
        // Set invalid configuration
        Configuration invalidConfig;
        invalidConfig.simulation.maxSteps = -1;  // Invalid
        configPanel->setConfiguration(invalidConfig);
        
        QStringList errors;
        bool valid = configPanel->validate(&errors);
        
        QVERIFY(!valid);
        QVERIFY(!errors.isEmpty());
    }
    
    /**
     * Test configuration reset
     */
    void testConfigurationReset() {
        ConfigPanel* configPanel = m_mainWindow->findChild<ConfigPanel*>();
        QVERIFY(configPanel != nullptr);
        
        // Set custom configuration
        Configuration customConfig;
        customConfig.simulation.maxSteps = 99999;
        configPanel->setConfiguration(customConfig);
        
        QCOMPARE(configPanel->configuration().simulation.maxSteps, 99999);
        
        // Reset to defaults
        configPanel->reset();
        
        // Should return to default value (10000)
        QCOMPARE(configPanel->configuration().simulation.maxSteps, 10000);
    }
    
    /**
     * Test status bar updates
     */
    void testStatusBarUpdates() {
        QStatusBar* statusBar = m_mainWindow->statusBar();
        QVERIFY(statusBar != nullptr);
        
        QString initialMessage = statusBar->currentMessage();
        QVERIFY(!initialMessage.isEmpty() || statusBar->findChildren<QLabel*>().size() > 0);
    }

private:
    MainWindow* m_mainWindow;
};

QTEST_MAIN(TestMainWindowIntegration)
#include "tst_mainwindow_integration.moc"
