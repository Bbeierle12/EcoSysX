#include <QtTest>
#include <QSignalSpy>
#include <QJsonObject>
#include <QJsonDocument>
#include <QProcess>
#include <QTimer>
#include "core/EngineClient.h"
#include "core/Configuration.h"

/**
 * @brief Integration tests for EngineClient with test engine stub
 * 
 * These tests verify the complete RPC protocol flow using a Node.js test stub
 * that simulates the real EcoSysX engine.
 */
class TestEngineIntegration : public QObject
{
    Q_OBJECT

private slots:
    void initTestCase();
    void cleanupTestCase();
    void init();
    void cleanup();

    // Integration tests
    void testEngineStartup();
    void testInitCommand();
    void testStepCommand();
    void testSnapshotCommand();
    void testStopCommand();
    void testFullWorkflow();
    void testMultipleSteps();
    void testErrorHandling();
    void testEngineRestart();
    
private:
    EngineClient* m_client;
    Configuration m_testConfig;
    QString m_nodePath;
    QString m_stubPath;
    
    bool waitForSignal(QObject* obj, const char* signal, int timeout = 5000);
    bool waitForState(EngineState targetState, int timeout = 5000);
};

void TestEngineIntegration::initTestCase()
{
    // Find Node.js executable
    QProcess nodeCheck;
    nodeCheck.start("node", QStringList() << "--version");
    nodeCheck.waitForFinished();
    
    if (nodeCheck.exitCode() != 0) {
        QSKIP("Node.js not found - skipping integration tests");
    }
    
    m_nodePath = "node";
    
    // Find test stub
    m_stubPath = QCoreApplication::applicationDirPath() + "/../tests/fixtures/test-engine-stub.mjs";
    QFileInfo stubInfo(m_stubPath);
    
    if (!stubInfo.exists()) {
        // Try alternative path
        m_stubPath = QCoreApplication::applicationDirPath() + "/../../tests/fixtures/test-engine-stub.mjs";
        stubInfo.setFile(m_stubPath);
        
        if (!stubInfo.exists()) {
            QSKIP("Test engine stub not found - skipping integration tests");
        }
    }
    
    qDebug() << "Using test stub:" << m_stubPath;
    
    // Setup test configuration
    m_testConfig.agents.initialPopulation = 50;
    m_testConfig.simulation.maxSteps = 100;
    m_testConfig.simulation.worldSize = 100.0;
}

void TestEngineIntegration::cleanupTestCase()
{
    // Nothing to clean up
}

void TestEngineIntegration::init()
{
    m_client = new EngineClient(this);
    m_client->setNodePath(m_nodePath);
    m_client->setSidecarScript(m_stubPath);
}

void TestEngineIntegration::cleanup()
{
    if (m_client) {
        if (m_client->state() != EngineState::Idle && m_client->state() != EngineState::Stopped) {
            m_client->stop();
            QTest::qWait(1000);  // Give time for cleanup
        }
        delete m_client;
        m_client = nullptr;
    }
}

void TestEngineIntegration::testEngineStartup()
{
    QSignalSpy startedSpy(m_client, &EngineClient::started);
    QSignalSpy errorSpy(m_client, &EngineClient::errorOccurred);
    
    m_client->start();
    
    // Wait for started signal
    QVERIFY(startedSpy.wait(5000));
    QCOMPARE(startedSpy.count(), 1);
    QCOMPARE(errorSpy.count(), 0);
    
    // Verify state
    QCOMPARE(m_client->state(), EngineState::Running);
    QCOMPARE(m_client->currentTick(), 0);
}

void TestEngineIntegration::testInitCommand()
{
    m_client->start();
    QVERIFY(waitForState(EngineState::Running));
    
    // Send init with configuration
    m_client->sendInit(m_testConfig.toJson());
    
    // Wait a bit for processing
    QTest::qWait(500);
    
    // Should remain in Running state after init
    QCOMPARE(m_client->state(), EngineState::Running);
}

void TestEngineIntegration::testStepCommand()
{
    m_client->start();
    QVERIFY(waitForState(EngineState::Running));
    
    // Initialize first
    m_client->sendInit(m_testConfig.toJson());
    QTest::qWait(500);
    
    QSignalSpy steppedSpy(m_client, &EngineClient::stepped);
    
    // Step once
    m_client->sendStep(1);
    
    QVERIFY(steppedSpy.wait(2000));
    QCOMPARE(steppedSpy.count(), 1);
    
    // Verify step incremented
    QVERIFY(m_client->currentTick() > 0);
    
    // Get arguments from signal
    QList<QVariant> arguments = steppedSpy.takeFirst();
    int currentTick = arguments.at(0).toInt();
    
    QVERIFY(currentTick > 0);
}

void TestEngineIntegration::testSnapshotCommand()
{
    m_client->start();
    QVERIFY(waitForState(EngineState::Running));
    
    m_client->sendInit(m_testConfig.toJson());
    QTest::qWait(500);
    
    // Step a few times first
    m_client->sendStep(2);
    QTest::qWait(500);
    
    QSignalSpy snapshotSpy(m_client, &EngineClient::snapshotReceived);
    
    // Request snapshot explicitly
    m_client->requestSnapshot("metrics");
    
    QVERIFY(snapshotSpy.wait(2000));
    QVERIFY(snapshotSpy.count() >= 1);
    
    // Verify snapshot structure
    QJsonObject snapshot = snapshotSpy.first().at(0).toJsonObject();
    
    QVERIFY(snapshot.contains("tick") || snapshot.contains("step"));
    QVERIFY(snapshot.contains("metrics") || snapshot.contains("data"));
}

void TestEngineIntegration::testStopCommand()
{
    m_client->start();
    QVERIFY(waitForState(EngineState::Running));
    
    QSignalSpy stoppedSpy(m_client, &EngineClient::stopped);
    
    m_client->stop();
    
    QVERIFY(stoppedSpy.wait(2000));
    QCOMPARE(stoppedSpy.count(), 1);
    QVERIFY(m_client->state() == EngineState::Stopped || m_client->state() == EngineState::Idle);
}

void TestEngineIntegration::testFullWorkflow()
{
    // Complete workflow: start -> init -> step multiple times -> snapshot -> stop
    
    QSignalSpy startedSpy(m_client, &EngineClient::started);
    QSignalSpy steppedSpy(m_client, &EngineClient::stepped);
    QSignalSpy snapshotSpy(m_client, &EngineClient::snapshotReceived);
    QSignalSpy stoppedSpy(m_client, &EngineClient::stopped);
    
    // Start
    m_client->start();
    QVERIFY(startedSpy.wait(5000));
    
    // Init
    m_client->sendInit(m_testConfig.toJson());
    QTest::qWait(500);
    
    // Step 5 times
    for (int i = 0; i < 5; ++i) {
        m_client->sendStep(1);
        QTest::qWait(200);
    }
    
    QVERIFY(steppedSpy.count() >= 5);
    QVERIFY(m_client->currentTick() >= 5);
    
    // Request snapshot
    m_client->requestSnapshot("metrics");
    QVERIFY(snapshotSpy.wait(2000) || snapshotSpy.count() >= 1);
    
    // Stop
    m_client->stop();
    QVERIFY(stoppedSpy.wait(2000));
    
    QVERIFY(m_client->state() == EngineState::Stopped || m_client->state() == EngineState::Idle);
}

void TestEngineIntegration::testMultipleSteps()
{
    m_client->start();
    QVERIFY(waitForState(EngineState::Running));
    
    m_client->sendInit(m_testConfig.toJson());
    QTest::qWait(500);
    
    QSignalSpy steppedSpy(m_client, &EngineClient::stepped);
    
    int initialTick = m_client->currentTick();
    
    // Step 10 at once
    m_client->sendStep(10);
    
    // Wait for completion
    QTest::qWait(1500);
    
    // Should have received stepped signal
    QVERIFY(steppedSpy.count() >= 1);
    
    // Current tick should be at least 10 more than initial
    QVERIFY(m_client->currentTick() >= initialTick + 10);
}

void TestEngineIntegration::testErrorHandling()
{
    // Test error handling with invalid engine path
    EngineClient* errorClient = new EngineClient(this);
    errorClient->setNodePath("nonexistent-command-xyz");
    errorClient->setSidecarScript("dummy.js");
    
    QSignalSpy errorSpy(errorClient, &EngineClient::errorOccurred);
    QSignalSpy startedSpy(errorClient, &EngineClient::started);
    
    errorClient->start();
    
    // Should get error, not started
    QVERIFY(errorSpy.wait(3000));
    QCOMPARE(startedSpy.count(), 0);
    QVERIFY(errorSpy.count() > 0);
    
    delete errorClient;
}

void TestEngineIntegration::testEngineRestart()
{
    // Start
    m_client->start();
    QVERIFY(waitForState(EngineState::Running));
    
    m_client->sendInit(m_testConfig.toJson());
    QTest::qWait(500);
    
    // Step a few times
    m_client->sendStep(3);
    QTest::qWait(500);
    
    int firstRunTicks = m_client->currentTick();
    QVERIFY(firstRunTicks >= 3);
    
    // Stop
    QSignalSpy stoppedSpy(m_client, &EngineClient::stopped);
    m_client->stop();
    QVERIFY(stoppedSpy.wait(2000));
    
    // Restart
    QSignalSpy restartedSpy(m_client, &EngineClient::started);
    m_client->start();
    QVERIFY(restartedSpy.wait(5000));
    
    // Tick count should reset
    QVERIFY(m_client->currentTick() == 0);
    
    // Re-initialize and step
    m_client->sendInit(m_testConfig.toJson());
    QTest::qWait(500);
    m_client->sendStep(1);
    QTest::qWait(200);
    QVERIFY(m_client->currentTick() > 0);
}

// Helper methods

bool TestEngineIntegration::waitForSignal(QObject* obj, const char* signal, int timeout)
{
    QSignalSpy spy(obj, signal);
    return spy.wait(timeout);
}

bool TestEngineIntegration::waitForState(EngineState targetState, int timeout)
{
    QElapsedTimer timer;
    timer.start();
    
    while (m_client->state() != targetState && timer.elapsed() < timeout) {
        QTest::qWait(100);
    }
    
    return m_client->state() == targetState;
}

QTEST_MAIN(TestEngineIntegration)
#include "tst_engine_integration.moc"
