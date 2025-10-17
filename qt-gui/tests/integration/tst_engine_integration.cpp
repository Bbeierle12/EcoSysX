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
    bool waitForState(EngineClient::State targetState, int timeout = 5000);
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
    m_testConfig.simulation.populationSize = 50;
    m_testConfig.simulation.totalSteps = 100;
    m_testConfig.simulation.worldSize = 100;
}

void TestEngineIntegration::cleanupTestCase()
{
    // Nothing to clean up
}

void TestEngineIntegration::init()
{
    m_client = new EngineClient(this);
    m_client->setEnginePath(m_nodePath);
    m_client->setEngineArgs(QStringList() << m_stubPath);
}

void TestEngineIntegration::cleanup()
{
    if (m_client) {
        if (m_client->state() != EngineClient::State::Idle) {
            m_client->stop();
            waitForState(EngineClient::State::Idle, 3000);
        }
        delete m_client;
        m_client = nullptr;
    }
}

void TestEngineIntegration::testEngineStartup()
{
    QSignalSpy startedSpy(m_client, &EngineClient::started);
    QSignalSpy errorSpy(m_client, &EngineClient::errorOccurred);
    
    m_client->start(m_testConfig);
    
    // Wait for started signal
    QVERIFY(startedSpy.wait(5000));
    QCOMPARE(startedSpy.count(), 1);
    QCOMPARE(errorSpy.count(), 0);
    
    // Verify state
    QCOMPARE(m_client->state(), EngineClient::State::Ready);
    QCOMPARE(m_client->currentStep(), 0);
}

void TestEngineIntegration::testInitCommand()
{
    m_client->start(m_testConfig);
    QVERIFY(waitForState(EngineClient::State::Ready));
    
    // Client should auto-initialize on start
    QCOMPARE(m_client->state(), EngineClient::State::Ready);
}

void TestEngineIntegration::testStepCommand()
{
    m_client->start(m_testConfig);
    QVERIFY(waitForState(EngineClient::State::Ready));
    
    QSignalSpy steppedSpy(m_client, &EngineClient::stepped);
    
    // Step once
    m_client->step();
    
    QVERIFY(steppedSpy.wait(2000));
    QCOMPARE(steppedSpy.count(), 1);
    
    // Verify step incremented
    QVERIFY(m_client->currentStep() > 0);
    
    // Get arguments from signal
    QList<QVariant> arguments = steppedSpy.takeFirst();
    int currentStep = arguments.at(0).toInt();
    int totalSteps = arguments.at(1).toInt();
    
    QVERIFY(currentStep > 0);
    QCOMPARE(totalSteps, m_testConfig.simulation.totalSteps);
}

void TestEngineIntegration::testSnapshotCommand()
{
    m_client->start(m_testConfig);
    QVERIFY(waitForState(EngineClient::State::Ready));
    
    // Step a few times first
    m_client->step();
    QTest::qWait(100);
    m_client->step();
    QTest::qWait(100);
    
    QSignalSpy snapshotSpy(m_client, &EngineClient::snapshotReceived);
    
    // Request snapshot - note: may be sent automatically by step
    // Just wait for one to arrive
    if (snapshotSpy.isEmpty()) {
        m_client->step();  // This should trigger a snapshot
    }
    
    QVERIFY(snapshotSpy.wait(2000));
    QVERIFY(snapshotSpy.count() >= 1);
    
    // Verify snapshot structure
    QJsonObject snapshot = snapshotSpy.first().at(0).toJsonObject();
    
    QVERIFY(snapshot.contains("step"));
    QVERIFY(snapshot.contains("metrics"));
    
    QJsonObject metrics = snapshot["metrics"].toObject();
    QVERIFY(metrics.contains("population"));
    QVERIFY(metrics.contains("sir"));
    
    QJsonObject sir = metrics["sir"].toObject();
    QVERIFY(sir.contains("susceptible"));
    QVERIFY(sir.contains("infected"));
    QVERIFY(sir.contains("recovered"));
    QVERIFY(sir.contains("dead"));
}

void TestEngineIntegration::testStopCommand()
{
    m_client->start(m_testConfig);
    QVERIFY(waitForState(EngineClient::State::Ready));
    
    QSignalSpy stoppedSpy(m_client, &EngineClient::stopped);
    
    m_client->stop();
    
    QVERIFY(stoppedSpy.wait(2000));
    QCOMPARE(stoppedSpy.count(), 1);
    QCOMPARE(m_client->state(), EngineClient::State::Idle);
}

void TestEngineIntegration::testFullWorkflow()
{
    // Complete workflow: start -> step multiple times -> snapshot -> stop
    
    QSignalSpy startedSpy(m_client, &EngineClient::started);
    QSignalSpy steppedSpy(m_client, &EngineClient::stepped);
    QSignalSpy snapshotSpy(m_client, &EngineClient::snapshotReceived);
    QSignalSpy stoppedSpy(m_client, &EngineClient::stopped);
    
    // Start
    m_client->start(m_testConfig);
    QVERIFY(startedSpy.wait(5000));
    
    // Step 5 times
    for (int i = 0; i < 5; ++i) {
        m_client->step();
        QTest::qWait(100);
    }
    
    QVERIFY(steppedSpy.count() >= 5);
    QVERIFY(m_client->currentStep() >= 5);
    
    // Snapshots may arrive automatically
    // If not, step once more
    if (snapshotSpy.isEmpty()) {
        m_client->step();
        QVERIFY(snapshotSpy.wait(2000));
    }
    
    QVERIFY(snapshotSpy.count() >= 1);
    
    // Stop
    m_client->stop();
    QVERIFY(stoppedSpy.wait(2000));
    
    QCOMPARE(m_client->state(), EngineClient::State::Idle);
}

void TestEngineIntegration::testMultipleSteps()
{
    m_client->start(m_testConfig);
    QVERIFY(waitForState(EngineClient::State::Ready));
    
    QSignalSpy steppedSpy(m_client, &EngineClient::stepped);
    
    int initialStep = m_client->currentStep();
    
    // Step 10 times rapidly
    for (int i = 0; i < 10; ++i) {
        m_client->step();
    }
    
    // Wait for all steps to complete
    QTest::qWait(1000);
    
    // Should have received multiple stepped signals
    QVERIFY(steppedSpy.count() >= 10);
    
    // Current step should be at least 10 more than initial
    QVERIFY(m_client->currentStep() >= initialStep + 10);
}

void TestEngineIntegration::testErrorHandling()
{
    // Test error handling with invalid engine path
    EngineClient* errorClient = new EngineClient(this);
    errorClient->setEnginePath("nonexistent-command-xyz");
    errorClient->setEngineArgs(QStringList() << "dummy.js");
    
    QSignalSpy errorSpy(errorClient, &EngineClient::errorOccurred);
    QSignalSpy startedSpy(errorClient, &EngineClient::started);
    
    errorClient->start(m_testConfig);
    
    // Should get error, not started
    QVERIFY(errorSpy.wait(3000));
    QCOMPARE(startedSpy.count(), 0);
    QVERIFY(errorSpy.count() > 0);
    
    delete errorClient;
}

void TestEngineIntegration::testEngineRestart()
{
    // Start
    m_client->start(m_testConfig);
    QVERIFY(waitForState(EngineClient::State::Ready));
    
    // Step a few times
    for (int i = 0; i < 3; ++i) {
        m_client->step();
        QTest::qWait(100);
    }
    
    int firstRunSteps = m_client->currentStep();
    QVERIFY(firstRunSteps >= 3);
    
    // Stop
    QSignalSpy stoppedSpy(m_client, &EngineClient::stopped);
    m_client->stop();
    QVERIFY(stoppedSpy.wait(2000));
    
    // Restart
    QSignalSpy restartedSpy(m_client, &EngineClient::started);
    m_client->start(m_testConfig);
    QVERIFY(restartedSpy.wait(5000));
    
    // Step count should reset
    QVERIFY(m_client->currentStep() < firstRunSteps);
    
    // Should be able to step again
    m_client->step();
    QTest::qWait(100);
    QVERIFY(m_client->currentStep() > 0);
}

// Helper methods

bool TestEngineIntegration::waitForSignal(QObject* obj, const char* signal, int timeout)
{
    QSignalSpy spy(obj, signal);
    return spy.wait(timeout);
}

bool TestEngineIntegration::waitForState(EngineClient::State targetState, int timeout)
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
