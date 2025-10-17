#include <QtTest>
#include <QSignalSpy>
#include <QJsonObject>
#include <QJsonArray>
#include "core/EngineClient.h"

Q_DECLARE_METATYPE(EngineState)

/**
 * @brief Testable subclass exposing protected helpers.
 */
class TestableEngineClient : public EngineClient {
public:
    explicit TestableEngineClient(QObject* parent = nullptr)
        : EngineClient(parent) {}
    
    using EngineClient::handleResponse;
    using EngineClient::setState;
    using EngineClient::state;
    using EngineClient::currentTick;
    using EngineClient::isRunning;
    
    void forceState(EngineState state) { setState(state); }
};

/**
 * @brief Unit tests covering EngineClient protocol handling.
 */
class TestEngineClient : public QObject {
    Q_OBJECT

private slots:
    void initTestCase() {
        qRegisterMetaType<EngineState>("EngineState");
    }
    
    void testInitResponseUpdatesState() {
        TestableEngineClient client;
        QSignalSpy stateSpy(&client, &EngineClient::stateChanged);
        QSignalSpy stepSpy(&client, &EngineClient::stepped);
        
        QJsonObject data{
            {"tick", 0}
        };
        QJsonObject json{
            {"success", true},
            {"op", "init"},
            {"data", data}
        };
        
        client.handleResponse(json);
        
        QCOMPARE(client.state(), EngineState::Running);
        QCOMPARE(client.currentTick(), 0);
        QVERIFY(stateSpy.count() >= 1);
        QCOMPARE(stepSpy.count(), 1);
        QCOMPARE(stepSpy.takeFirst().at(0).toInt(), 0);
    }
    
    void testStepResponseUpdatesTick() {
        TestableEngineClient client;
        client.forceState(EngineState::Running);
        
        QSignalSpy stepSpy(&client, &EngineClient::stepped);
        
        QJsonObject data{
            {"tick", 42}
        };
        QJsonObject json{
            {"success", true},
            {"op", "step"},
            {"data", data}
        };
        
        client.handleResponse(json);
        
        QCOMPARE(client.currentTick(), 42);
        QCOMPARE(stepSpy.count(), 1);
        QCOMPARE(stepSpy.takeFirst().at(0).toInt(), 42);
        QCOMPARE(client.state(), EngineState::Running);
    }
    
    void testSnapshotResponseEmitsSnapshot() {
        TestableEngineClient client;
        client.forceState(EngineState::Running);
        
        QSignalSpy snapshotSpy(&client, &EngineClient::snapshotReceived);
        
        QJsonObject snapshot{
            {"step", 5},
            {"agents", QJsonArray{1, 2, 3}}
        };
        QJsonObject data{
            {"snapshot", snapshot},
            {"kind", "full"}
        };
        QJsonObject json{
            {"success", true},
            {"op", "snapshot"},
            {"data", data}
        };
        
        client.handleResponse(json);
        
        QCOMPARE(snapshotSpy.count(), 1);
        QJsonObject received = snapshotSpy.takeFirst().at(0).toJsonObject();
        QCOMPARE(received["step"].toInt(), 5);
        QVERIFY(received.contains("agents"));
    }
    
    void testPingFromStartingTransitionsToRunning() {
        TestableEngineClient client;
        client.forceState(EngineState::Starting);
        
        QSignalSpy stepSpy(&client, &EngineClient::stepped);
        QSignalSpy stateSpy(&client, &EngineClient::stateChanged);
        
        QJsonObject data{
            {"tick", 7},
            {"status", "running"}
        };
        QJsonObject json{
            {"success", true},
            {"op", "ping"},
            {"data", data}
        };
        
        client.handleResponse(json);
        
        QCOMPARE(client.state(), EngineState::Running);
        QCOMPARE(client.currentTick(), 7);
        QCOMPARE(stepSpy.count(), 1);
        QVERIFY(stateSpy.count() >= 1);
    }
    
    void testErrorResponseEntersErrorState() {
        TestableEngineClient client;
        client.forceState(EngineState::Running);
        
        QSignalSpy errorSpy(&client, &EngineClient::errorOccurred);
        QSignalSpy stateSpy(&client, &EngineClient::stateChanged);
        
        QJsonObject json{
            {"success", false},
            {"op", "step"},
            {"error", "Simulation failure"},
            {"stack", "stack trace"}
        };
        
        client.handleResponse(json);
        
        QCOMPARE(errorSpy.count(), 1);
        QCOMPARE(errorSpy.takeFirst().at(0).toString(), QStringLiteral("Simulation failure"));
        QCOMPARE(client.state(), EngineState::Error);
        QVERIFY(stateSpy.count() >= 1);
    }
    
    void testUnhandledOperationLogsButDoesNotCrash() {
        TestableEngineClient client;
        client.forceState(EngineState::Running);
        
        QSignalSpy logSpy(&client, &EngineClient::logMessage);
        
        QJsonObject json{
            {"success", true},
            {"op", "unknown-op"},
            {"data", QJsonObject{}}
        };
        
        client.handleResponse(json);
        
        QVERIFY(logSpy.count() >= 1);
    }
};

QTEST_MAIN(TestEngineClient)
#include "tst_engineclient.moc"
