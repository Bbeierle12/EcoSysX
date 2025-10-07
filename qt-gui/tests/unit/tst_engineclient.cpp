#include <QtTest/QtTest>
#include "../src/core/EngineClient.h"
#include "../src/core/Configuration.h"
#include <QSignalSpy>
#include <QJsonDocument>

/**
 * @brief FakeTransport simulates the engine process for testing
 * 
 * This class replaces QProcess with a controllable fake that can
 * simulate various engine behaviors without launching a real process.
 */
class FakeTransport : public QObject {
    Q_OBJECT
    
public:
    explicit FakeTransport(QObject* parent = nullptr)
        : QObject(parent)
        , m_simulateStartupFailure(false)
        , m_simulateRuntimeError(false)
        , m_startupDelay(0)
    {}
    
    void setSimulateStartupFailure(bool fail) { m_simulateStartupFailure = fail; }
    void setSimulateRuntimeError(bool error) { m_simulateRuntimeError = error; }
    void setStartupDelay(int ms) { m_startupDelay = ms; }
    
    void start() {
        if (m_simulateStartupFailure) {
            QTimer::singleShot(m_startupDelay, this, [this]() {
                emit errorOccurred("Simulated startup failure");
            });
        } else {
            QTimer::singleShot(m_startupDelay, this, [this]() {
                sendMessage("ready", QJsonObject());
            });
        }
    }
    
    void sendMessage(const QString& type, const QJsonObject& payload) {
        QJsonObject msg;
        msg["type"] = type;
        msg["payload"] = payload;
        
        QString line = QString::fromUtf8(QJsonDocument(msg).toJson(QJsonDocument::Compact));
        emit lineReceived(line);
    }
    
    void sendInit() {
        QJsonObject payload;
        payload["step"] = 0;
        sendMessage("init", payload);
    }
    
    void sendStep(int step) {
        QJsonObject payload;
        payload["step"] = step;
        sendMessage("step", payload);
    }
    
    void sendSnapshot(const QJsonObject& data) {
        sendMessage("snapshot", data);
    }
    
    void sendError(const QString& errorMsg) {
        QJsonObject payload;
        payload["message"] = errorMsg;
        sendMessage("error", payload);
    }
    
signals:
    void lineReceived(const QString& line);
    void errorOccurred(const QString& error);
    
private:
    bool m_simulateStartupFailure;
    bool m_simulateRuntimeError;
    int m_startupDelay;
};

/**
 * @brief Unit tests for EngineClient
 */
class TestEngineClient : public QObject {
    Q_OBJECT
    
private slots:
    void initTestCase() {
        // Setup test environment
    }
    
    void cleanupTestCase() {
        // Cleanup test environment
    }
    
    void init() {
        // Reset before each test
        m_client = new EngineClient(this);
        m_transport = new FakeTransport(this);
    }
    
    void cleanup() {
        delete m_client;
        delete m_transport;
    }
    
    /**
     * Test initial state
     */
    void testInitialState() {
        QCOMPARE(m_client->state(), EngineClient::State::Idle);
        QCOMPARE(m_client->currentStep(), 0);
    }
    
    /**
     * Test successful startup flow
     */
    void testSuccessfulStartup() {
        QSignalSpy startedSpy(m_client, &EngineClient::started);
        QSignalSpy stateChangedSpy(m_client, &EngineClient::stateChanged);
        
        Configuration config;
        m_client->start(config);
        
        // Simulate engine responding with "ready"
        m_transport->start();
        m_transport->sendInit();
        
        QVERIFY(startedSpy.wait(1000));
        QCOMPARE(startedSpy.count(), 1);
        QCOMPARE(m_client->state(), EngineClient::State::Running);
        QVERIFY(stateChangedSpy.count() >= 2);  // Starting -> Running
    }
    
    /**
     * Test startup timeout
     */
    void testStartupTimeout() {
        QSignalSpy errorSpy(m_client, &EngineClient::errorOccurred);
        
        Configuration config;
        m_transport->setStartupDelay(6000);  // 6 seconds (exceeds 5s timeout)
        m_client->start(config);
        
        QVERIFY(errorSpy.wait(6000));
        QCOMPARE(errorSpy.count(), 1);
        QVERIFY(errorSpy[0][0].toString().contains("timeout"));
        QCOMPARE(m_client->state(), EngineClient::State::Error);
    }
    
    /**
     * Test startup failure
     */
    void testStartupFailure() {
        QSignalSpy errorSpy(m_client, &EngineClient::errorOccurred);
        
        Configuration config;
        m_transport->setSimulateStartupFailure(true);
        m_client->start(config);
        m_transport->start();
        
        QVERIFY(errorSpy.wait(1000));
        QCOMPARE(errorSpy.count(), 1);
        QCOMPARE(m_client->state(), EngineClient::State::Error);
    }
    
    /**
     * Test step command
     */
    void testStep() {
        // Start engine first
        Configuration config;
        m_client->start(config);
        m_transport->start();
        m_transport->sendInit();
        QTest::qWait(100);
        
        QSignalSpy steppedSpy(m_client, &EngineClient::stepped);
        
        m_client->step();
        m_transport->sendStep(1);
        
        QVERIFY(steppedSpy.wait(1000));
        QCOMPARE(steppedSpy.count(), 1);
        QCOMPARE(steppedSpy[0][0].toInt(), 1);  // currentStep
        QCOMPARE(m_client->currentStep(), 1);
    }
    
    /**
     * Test stop command
     */
    void testStop() {
        // Start engine first
        Configuration config;
        m_client->start(config);
        m_transport->start();
        m_transport->sendInit();
        QTest::qWait(100);
        
        QSignalSpy stoppedSpy(m_client, &EngineClient::stopped);
        
        m_client->stop();
        
        QVERIFY(stoppedSpy.wait(1000));
        QCOMPARE(stoppedSpy.count(), 1);
        QCOMPARE(m_client->state(), EngineClient::State::Stopped);
    }
    
    /**
     * Test reset command
     */
    void testReset() {
        // Start and step engine
        Configuration config;
        m_client->start(config);
        m_transport->start();
        m_transport->sendInit();
        QTest::qWait(100);
        
        m_client->step();
        m_transport->sendStep(1);
        QTest::qWait(100);
        
        QCOMPARE(m_client->currentStep(), 1);
        
        // Reset
        m_client->reset();
        m_transport->sendInit();
        QTest::qWait(100);
        
        QCOMPARE(m_client->currentStep(), 0);
    }
    
    /**
     * Test snapshot reception
     */
    void testSnapshotReceived() {
        QSignalSpy snapshotSpy(m_client, &EngineClient::snapshotReceived);
        
        // Start engine
        Configuration config;
        m_client->start(config);
        m_transport->start();
        m_transport->sendInit();
        QTest::qWait(100);
        
        // Send snapshot
        QJsonObject snapshotData;
        snapshotData["agents"] = 100;
        snapshotData["infected"] = 10;
        m_transport->sendSnapshot(snapshotData);
        
        QVERIFY(snapshotSpy.wait(1000));
        QCOMPARE(snapshotSpy.count(), 1);
        
        QJsonObject received = snapshotSpy[0][0].toJsonObject();
        QCOMPARE(received["agents"].toInt(), 100);
        QCOMPARE(received["infected"].toInt(), 10);
    }
    
    /**
     * Test runtime error handling
     */
    void testRuntimeError() {
        QSignalSpy errorSpy(m_client, &EngineClient::errorOccurred);
        
        // Start engine
        Configuration config;
        m_client->start(config);
        m_transport->start();
        m_transport->sendInit();
        QTest::qWait(100);
        
        // Send error
        m_transport->sendError("Runtime error occurred");
        
        QVERIFY(errorSpy.wait(1000));
        QCOMPARE(errorSpy.count(), 1);
        QVERIFY(errorSpy[0][0].toString().contains("Runtime error"));
    }
    
    /**
     * Test state transitions
     */
    void testStateTransitions() {
        QSignalSpy stateChangedSpy(m_client, &EngineClient::stateChanged);
        
        // Idle -> Starting -> Running
        Configuration config;
        m_client->start(config);
        QCOMPARE(m_client->state(), EngineClient::State::Starting);
        
        m_transport->start();
        m_transport->sendInit();
        QTest::qWait(100);
        QCOMPARE(m_client->state(), EngineClient::State::Running);
        
        // Running -> Stopping -> Stopped
        m_client->stop();
        QCOMPARE(m_client->state(), EngineClient::State::Stopping);
        QTest::qWait(100);
        QCOMPARE(m_client->state(), EngineClient::State::Stopped);
        
        QVERIFY(stateChangedSpy.count() >= 4);
    }
    
private:
    EngineClient* m_client;
    FakeTransport* m_transport;
};

QTEST_MAIN(TestEngineClient)
#include "tst_engineclient.moc"
