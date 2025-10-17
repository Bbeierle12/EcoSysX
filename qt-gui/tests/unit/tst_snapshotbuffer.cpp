#include <QtTest>
#include <QJsonObject>
#include <QJsonArray>
#include "core/SnapshotBuffer.h"

/**
 * @brief Unit tests for SnapshotBuffer class
 */
class TestSnapshotBuffer : public QObject
{
    Q_OBJECT

private slots:
    // Initialization tests
    void testConstruction();
    void testCapacityConfiguration();
    void testDownsampleConfiguration();

    // Basic operations
    void testAddSnapshot();
    void testAddMetrics();
    void testClear();
    void testSizeTracking();

    // Ring buffer behavior
    void testRingBufferWrapping();
    void testCapacityEnforcement();
    void testOldestDataOverwrite();

    // Downsampling
    void testDownsampleInterval2();
    void testDownsampleInterval5();
    void testDownsampleIntervalChange();

    // Data retrieval
    void testGetLatestSnapshot();
    void testGetSnapshotAt();
    void testGetAllSnapshots();
    void testGetStepRange();

    // Time-series extraction
    void testTimeSeriesSimplePath();
    void testTimeSeriesNestedPath();
    void testTimeSeriesStepFiltering();
    void testTimeSeriesInvalidPath();

    // Thread safety (basic)
    void testConcurrentAccess();

    // Edge cases
    void testEmptyBuffer();
    void testSingleEntry();
    void testCapacityResize();
    void testInvalidIndices();

    // Signals
    void testSnapshotAddedSignal();
    void testBufferClearedSignal();
    void testBufferWrappedSignal();

private:
    QJsonObject createTestSnapshot(int step, int population, int susceptible, int infected, int recovered);
};

void TestSnapshotBuffer::testConstruction()
{
    SnapshotBuffer buffer1;
    QCOMPARE(buffer1.maxCapacity(), 1000);  // Default capacity
    QCOMPARE(buffer1.size(), 0);
    QCOMPARE(buffer1.downsampleInterval(), 1);
    QVERIFY(buffer1.isEmpty());
    QVERIFY(!buffer1.isFull());

    SnapshotBuffer buffer2(500);
    QCOMPARE(buffer2.maxCapacity(), 500);
    QCOMPARE(buffer2.size(), 0);
}

void TestSnapshotBuffer::testCapacityConfiguration()
{
    SnapshotBuffer buffer(100);
    QCOMPARE(buffer.maxCapacity(), 100);

    buffer.setMaxCapacity(200);
    QCOMPARE(buffer.maxCapacity(), 200);

    // Invalid capacities should be ignored
    buffer.setMaxCapacity(-1);
    QCOMPARE(buffer.maxCapacity(), 200);

    buffer.setMaxCapacity(0);
    QCOMPARE(buffer.maxCapacity(), 200);
}

void TestSnapshotBuffer::testDownsampleConfiguration()
{
    SnapshotBuffer buffer;
    QCOMPARE(buffer.downsampleInterval(), 1);

    buffer.setDownsampleInterval(5);
    QCOMPARE(buffer.downsampleInterval(), 5);

    buffer.setDownsampleInterval(1);
    QCOMPARE(buffer.downsampleInterval(), 1);

    // Invalid intervals should be clamped to 1
    buffer.setDownsampleInterval(0);
    QCOMPARE(buffer.downsampleInterval(), 1);

    buffer.setDownsampleInterval(-5);
    QCOMPARE(buffer.downsampleInterval(), 1);
}

void TestSnapshotBuffer::testAddSnapshot()
{
    SnapshotBuffer buffer(10);
    
    auto snapshot = createTestSnapshot(0, 100, 80, 10, 10);
    buffer.addSnapshot(0, snapshot);
    
    QCOMPARE(buffer.size(), 1);
    QVERIFY(!buffer.isEmpty());
    QVERIFY(!buffer.isFull());
}

void TestSnapshotBuffer::testAddMetrics()
{
    SnapshotBuffer buffer(10);
    
    QJsonObject metrics;
    metrics["population"] = 100;
    metrics["energyMean"] = 50.5;
    
    buffer.addMetrics(5, metrics);
    
    QCOMPARE(buffer.size(), 1);
    
    auto latest = buffer.getLatestSnapshot();
    QCOMPARE(latest["step"].toInt(), 5);
    QVERIFY(latest.contains("metrics"));
}

void TestSnapshotBuffer::testClear()
{
    SnapshotBuffer buffer(10);
    
    for (int i = 0; i < 5; ++i) {
        buffer.addSnapshot(i, createTestSnapshot(i, 100 + i, 80, 10, 10));
    }
    
    QCOMPARE(buffer.size(), 5);
    
    buffer.clear();
    
    QCOMPARE(buffer.size(), 0);
    QVERIFY(buffer.isEmpty());
}

void TestSnapshotBuffer::testSizeTracking()
{
    SnapshotBuffer buffer(5);
    
    QCOMPARE(buffer.size(), 0);
    QVERIFY(buffer.isEmpty());
    
    for (int i = 0; i < 5; ++i) {
        buffer.addSnapshot(i, createTestSnapshot(i, 100, 80, 10, 10));
        QCOMPARE(buffer.size(), i + 1);
    }
    
    QVERIFY(buffer.isFull());
    QVERIFY(!buffer.isEmpty());
}

void TestSnapshotBuffer::testRingBufferWrapping()
{
    SnapshotBuffer buffer(3);  // Small buffer for easy testing
    
    // Fill buffer
    buffer.addSnapshot(0, createTestSnapshot(0, 100, 80, 10, 10));
    buffer.addSnapshot(1, createTestSnapshot(1, 101, 79, 11, 11));
    buffer.addSnapshot(2, createTestSnapshot(2, 102, 78, 12, 12));
    
    QCOMPARE(buffer.size(), 3);
    QVERIFY(buffer.isFull());
    
    // Add one more - should wrap and overwrite oldest
    buffer.addSnapshot(3, createTestSnapshot(3, 103, 77, 13, 13));
    
    QCOMPARE(buffer.size(), 3);  // Still at capacity
    
    // Oldest (step 0) should be gone, newest (step 3) should be present
    auto snapshots = buffer.getAllSnapshots();
    QCOMPARE(snapshots.size(), 3);
    QCOMPARE(snapshots[0]["step"].toInt(), 1);  // Step 0 was overwritten
    QCOMPARE(snapshots[1]["step"].toInt(), 2);
    QCOMPARE(snapshots[2]["step"].toInt(), 3);
}

void TestSnapshotBuffer::testCapacityEnforcement()
{
    SnapshotBuffer buffer(5);
    
    // Add more than capacity
    for (int i = 0; i < 10; ++i) {
        buffer.addSnapshot(i, createTestSnapshot(i, 100 + i, 80, 10, 10));
    }
    
    // Should never exceed capacity
    QCOMPARE(buffer.size(), 5);
    
    // Should contain steps 5-9 (newest 5)
    auto snapshots = buffer.getAllSnapshots();
    QCOMPARE(snapshots.size(), 5);
    QCOMPARE(snapshots[0]["step"].toInt(), 5);
    QCOMPARE(snapshots[4]["step"].toInt(), 9);
}

void TestSnapshotBuffer::testOldestDataOverwrite()
{
    SnapshotBuffer buffer(3);
    
    // Add initial data
    buffer.addSnapshot(0, createTestSnapshot(0, 100, 80, 10, 10));
    buffer.addSnapshot(1, createTestSnapshot(1, 101, 79, 11, 11));
    buffer.addSnapshot(2, createTestSnapshot(2, 102, 78, 12, 12));
    
    auto snapshot0 = buffer.getSnapshotAt(0);
    QCOMPARE(snapshot0["step"].toInt(), 0);
    
    // Overwrite by adding more
    buffer.addSnapshot(3, createTestSnapshot(3, 103, 77, 13, 13));
    
    // Index 0 should now be step 1 (oldest in buffer)
    auto newSnapshot0 = buffer.getSnapshotAt(0);
    QCOMPARE(newSnapshot0["step"].toInt(), 1);
}

void TestSnapshotBuffer::testDownsampleInterval2()
{
    SnapshotBuffer buffer(10);
    buffer.setDownsampleInterval(2);  // Keep every other snapshot
    
    // Add 10 snapshots
    for (int i = 0; i < 10; ++i) {
        buffer.addSnapshot(i, createTestSnapshot(i, 100 + i, 80, 10, 10));
    }
    
    // Should have stored 5 snapshots (0, 2, 4, 6, 8)
    QCOMPARE(buffer.size(), 5);
    
    auto snapshots = buffer.getAllSnapshots();
    QCOMPARE(snapshots[0]["step"].toInt(), 0);
    QCOMPARE(snapshots[1]["step"].toInt(), 2);
    QCOMPARE(snapshots[2]["step"].toInt(), 4);
    QCOMPARE(snapshots[3]["step"].toInt(), 6);
    QCOMPARE(snapshots[4]["step"].toInt(), 8);
}

void TestSnapshotBuffer::testDownsampleInterval5()
{
    SnapshotBuffer buffer(10);
    buffer.setDownsampleInterval(5);  // Keep every 5th snapshot
    
    // Add 20 snapshots
    for (int i = 0; i < 20; ++i) {
        buffer.addSnapshot(i, createTestSnapshot(i, 100 + i, 80, 10, 10));
    }
    
    // Should have stored 4 snapshots (0, 5, 10, 15)
    QCOMPARE(buffer.size(), 4);
}

void TestSnapshotBuffer::testDownsampleIntervalChange()
{
    SnapshotBuffer buffer(10);
    
    // Add 3 with no downsampling
    for (int i = 0; i < 3; ++i) {
        buffer.addSnapshot(i, createTestSnapshot(i, 100, 80, 10, 10));
    }
    QCOMPARE(buffer.size(), 3);
    
    // Change to interval 2
    buffer.setDownsampleInterval(2);
    
    // Add 6 more (should store 3)
    for (int i = 3; i < 9; ++i) {
        buffer.addSnapshot(i, createTestSnapshot(i, 100, 80, 10, 10));
    }
    
    QCOMPARE(buffer.size(), 6);  // 3 original + 3 new
}

void TestSnapshotBuffer::testGetLatestSnapshot()
{
    SnapshotBuffer buffer(10);
    
    // Empty buffer
    auto emptySnapshot = buffer.getLatestSnapshot();
    QVERIFY(emptySnapshot.isEmpty());
    
    // Add snapshots
    buffer.addSnapshot(0, createTestSnapshot(0, 100, 80, 10, 10));
    buffer.addSnapshot(1, createTestSnapshot(1, 101, 79, 11, 11));
    buffer.addSnapshot(2, createTestSnapshot(2, 102, 78, 12, 12));
    
    auto latest = buffer.getLatestSnapshot();
    QCOMPARE(latest["step"].toInt(), 2);
    QCOMPARE(latest["metrics"].toObject()["population"].toInt(), 102);
}

void TestSnapshotBuffer::testGetSnapshotAt()
{
    SnapshotBuffer buffer(10);
    
    // Invalid index on empty buffer
    auto invalid1 = buffer.getSnapshotAt(0);
    QVERIFY(invalid1.isEmpty());
    
    // Add snapshots
    for (int i = 0; i < 5; ++i) {
        buffer.addSnapshot(i, createTestSnapshot(i, 100 + i, 80, 10, 10));
    }
    
    // Valid indices
    auto snapshot0 = buffer.getSnapshotAt(0);
    QCOMPARE(snapshot0["step"].toInt(), 0);
    
    auto snapshot4 = buffer.getSnapshotAt(4);
    QCOMPARE(snapshot4["step"].toInt(), 4);
    
    // Invalid indices
    auto invalid2 = buffer.getSnapshotAt(-1);
    QVERIFY(invalid2.isEmpty());
    
    auto invalid3 = buffer.getSnapshotAt(5);
    QVERIFY(invalid3.isEmpty());
}

void TestSnapshotBuffer::testGetAllSnapshots()
{
    SnapshotBuffer buffer(10);
    
    // Empty buffer
    auto empty = buffer.getAllSnapshots();
    QCOMPARE(empty.size(), 0);
    
    // Add snapshots
    for (int i = 0; i < 5; ++i) {
        buffer.addSnapshot(i, createTestSnapshot(i, 100 + i, 80, 10, 10));
    }
    
    auto all = buffer.getAllSnapshots();
    QCOMPARE(all.size(), 5);
    
    // Verify chronological order
    for (int i = 0; i < 5; ++i) {
        QCOMPARE(all[i]["step"].toInt(), i);
    }
}

void TestSnapshotBuffer::testGetStepRange()
{
    SnapshotBuffer buffer(10);
    
    int minStep, maxStep;
    
    // Empty buffer
    buffer.getStepRange(minStep, maxStep);
    QCOMPARE(minStep, -1);
    QCOMPARE(maxStep, -1);
    
    // Add snapshots (not necessarily sequential)
    buffer.addSnapshot(5, createTestSnapshot(5, 100, 80, 10, 10));
    buffer.addSnapshot(2, createTestSnapshot(2, 100, 80, 10, 10));
    buffer.addSnapshot(10, createTestSnapshot(10, 100, 80, 10, 10));
    buffer.addSnapshot(7, createTestSnapshot(7, 100, 80, 10, 10));
    
    buffer.getStepRange(minStep, maxStep);
    QCOMPARE(minStep, 2);
    QCOMPARE(maxStep, 10);
}

void TestSnapshotBuffer::testTimeSeriesSimplePath()
{
    SnapshotBuffer buffer(10);
    
    // Add snapshots with varying population
    for (int i = 0; i < 5; ++i) {
        buffer.addSnapshot(i, createTestSnapshot(i, 100 + i * 10, 80, 10, 10));
    }
    
    auto data = buffer.getTimeSeriesData("metrics.population");
    
    QCOMPARE(data.size(), 5);
    QCOMPARE(data[0].step, 0);
    QCOMPARE(data[0].value, 100.0);
    QCOMPARE(data[4].step, 4);
    QCOMPARE(data[4].value, 140.0);
}

void TestSnapshotBuffer::testTimeSeriesNestedPath()
{
    SnapshotBuffer buffer(10);
    
    // Add snapshots
    for (int i = 0; i < 5; ++i) {
        buffer.addSnapshot(i, createTestSnapshot(i, 100, 80 - i, 10 + i, 10));
    }
    
    auto susceptibleData = buffer.getTimeSeriesData("metrics.sir.susceptible");
    auto infectedData = buffer.getTimeSeriesData("metrics.sir.infected");
    
    QCOMPARE(susceptibleData.size(), 5);
    QCOMPARE(infectedData.size(), 5);
    
    QCOMPARE(susceptibleData[0].value, 80.0);
    QCOMPARE(susceptibleData[4].value, 76.0);
    
    QCOMPARE(infectedData[0].value, 10.0);
    QCOMPARE(infectedData[4].value, 14.0);
}

void TestSnapshotBuffer::testTimeSeriesStepFiltering()
{
    SnapshotBuffer buffer(10);
    
    // Add 10 snapshots
    for (int i = 0; i < 10; ++i) {
        buffer.addSnapshot(i, createTestSnapshot(i, 100 + i, 80, 10, 10));
    }
    
    // Get subset
    auto data = buffer.getTimeSeriesData("metrics.population", 3, 7);
    
    QCOMPARE(data.size(), 5);  // Steps 3, 4, 5, 6, 7
    QCOMPARE(data[0].step, 3);
    QCOMPARE(data[4].step, 7);
}

void TestSnapshotBuffer::testTimeSeriesInvalidPath()
{
    SnapshotBuffer buffer(10);
    
    buffer.addSnapshot(0, createTestSnapshot(0, 100, 80, 10, 10));
    
    // Non-existent path should return 0.0 values
    auto data = buffer.getTimeSeriesData("nonexistent.path");
    
    QCOMPARE(data.size(), 1);
    QCOMPARE(data[0].value, 0.0);
}

void TestSnapshotBuffer::testConcurrentAccess()
{
    // Basic thread safety test
    // Note: Comprehensive thread testing would require QThreads
    SnapshotBuffer buffer(100);
    
    // Multiple operations should not crash
    buffer.addSnapshot(0, createTestSnapshot(0, 100, 80, 10, 10));
    auto size1 = buffer.size();
    auto latest = buffer.getLatestSnapshot();
    auto size2 = buffer.size();
    
    QCOMPARE(size1, 1);
    QCOMPARE(size2, 1);
    QVERIFY(!latest.isEmpty());
}

void TestSnapshotBuffer::testEmptyBuffer()
{
    SnapshotBuffer buffer(10);
    
    QVERIFY(buffer.isEmpty());
    QVERIFY(!buffer.isFull());
    QCOMPARE(buffer.size(), 0);
    
    QVERIFY(buffer.getLatestSnapshot().isEmpty());
    QVERIFY(buffer.getSnapshotAt(0).isEmpty());
    QCOMPARE(buffer.getAllSnapshots().size(), 0);
    
    int minStep, maxStep;
    buffer.getStepRange(minStep, maxStep);
    QCOMPARE(minStep, -1);
    QCOMPARE(maxStep, -1);
    
    auto data = buffer.getTimeSeriesData("any.path");
    QCOMPARE(data.size(), 0);
}

void TestSnapshotBuffer::testSingleEntry()
{
    SnapshotBuffer buffer(10);
    
    buffer.addSnapshot(42, createTestSnapshot(42, 200, 150, 30, 20));
    
    QCOMPARE(buffer.size(), 1);
    QVERIFY(!buffer.isEmpty());
    QVERIFY(!buffer.isFull());
    
    auto latest = buffer.getLatestSnapshot();
    QCOMPARE(latest["step"].toInt(), 42);
    
    auto at0 = buffer.getSnapshotAt(0);
    QCOMPARE(at0["step"].toInt(), 42);
    
    auto all = buffer.getAllSnapshots();
    QCOMPARE(all.size(), 1);
    
    int minStep, maxStep;
    buffer.getStepRange(minStep, maxStep);
    QCOMPARE(minStep, 42);
    QCOMPARE(maxStep, 42);
}

void TestSnapshotBuffer::testCapacityResize()
{
    SnapshotBuffer buffer(5);
    
    // Fill buffer
    for (int i = 0; i < 5; ++i) {
        buffer.addSnapshot(i, createTestSnapshot(i, 100 + i, 80, 10, 10));
    }
    QCOMPARE(buffer.size(), 5);
    
    // Expand capacity
    buffer.setMaxCapacity(10);
    QCOMPARE(buffer.maxCapacity(), 10);
    QCOMPARE(buffer.size(), 5);  // Data preserved
    
    // Shrink capacity (should keep newest)
    buffer.setMaxCapacity(3);
    QCOMPARE(buffer.maxCapacity(), 3);
    QCOMPARE(buffer.size(), 3);
    
    // Verify newest data preserved
    auto snapshots = buffer.getAllSnapshots();
    QCOMPARE(snapshots[0]["step"].toInt(), 2);  // Oldest of the 3 kept
    QCOMPARE(snapshots[2]["step"].toInt(), 4);  // Newest
}

void TestSnapshotBuffer::testInvalidIndices()
{
    SnapshotBuffer buffer(10);
    
    buffer.addSnapshot(0, createTestSnapshot(0, 100, 80, 10, 10));
    
    // Negative index
    QVERIFY(buffer.getSnapshotAt(-1).isEmpty());
    QVERIFY(buffer.getSnapshotAt(-100).isEmpty());
    
    // Out of bounds index
    QVERIFY(buffer.getSnapshotAt(1).isEmpty());
    QVERIFY(buffer.getSnapshotAt(100).isEmpty());
}

void TestSnapshotBuffer::testSnapshotAddedSignal()
{
    SnapshotBuffer buffer(10);
    
    QSignalSpy spy(&buffer, &SnapshotBuffer::snapshotAdded);
    
    buffer.addSnapshot(0, createTestSnapshot(0, 100, 80, 10, 10));
    buffer.addSnapshot(1, createTestSnapshot(1, 101, 79, 11, 11));
    
    QCOMPARE(spy.count(), 2);
    QCOMPARE(spy[0][0].toInt(), 0);  // First signal with step 0
    QCOMPARE(spy[1][0].toInt(), 1);  // Second signal with step 1
}

void TestSnapshotBuffer::testBufferClearedSignal()
{
    SnapshotBuffer buffer(10);
    
    QSignalSpy spy(&buffer, &SnapshotBuffer::bufferCleared);
    
    buffer.addSnapshot(0, createTestSnapshot(0, 100, 80, 10, 10));
    buffer.clear();
    
    QCOMPARE(spy.count(), 1);
    
    buffer.clear();  // Clear again
    QCOMPARE(spy.count(), 2);
}

void TestSnapshotBuffer::testBufferWrappedSignal()
{
    SnapshotBuffer buffer(3);  // Small capacity
    
    QSignalSpy spy(&buffer, &SnapshotBuffer::bufferWrapped);
    
    // Fill buffer (no wrap yet)
    buffer.addSnapshot(0, createTestSnapshot(0, 100, 80, 10, 10));
    buffer.addSnapshot(1, createTestSnapshot(1, 101, 79, 11, 11));
    buffer.addSnapshot(2, createTestSnapshot(2, 102, 78, 12, 12));
    
    QCOMPARE(spy.count(), 0);  // Not wrapped yet
    
    // This should trigger wrap
    buffer.addSnapshot(3, createTestSnapshot(3, 103, 77, 13, 13));
    QCOMPARE(spy.count(), 1);
    
    // Each subsequent add wraps
    buffer.addSnapshot(4, createTestSnapshot(4, 104, 76, 14, 14));
    QCOMPARE(spy.count(), 2);
}

// Helper function implementation
QJsonObject TestSnapshotBuffer::createTestSnapshot(int step, int population, 
                                                    int susceptible, int infected, int recovered)
{
    QJsonObject snapshot;
    snapshot["step"] = step;
    snapshot["tick"] = step * 100;  // Arbitrary tick value
    
    QJsonObject sir;
    sir["susceptible"] = susceptible;
    sir["infected"] = infected;
    sir["recovered"] = recovered;
    sir["dead"] = population - (susceptible + infected + recovered);
    
    QJsonObject metrics;
    metrics["population"] = population;
    metrics["energyMean"] = 50.0 + step * 0.5;
    metrics["sir"] = sir;
    
    snapshot["metrics"] = metrics;
    
    return snapshot;
}

QTEST_MAIN(TestSnapshotBuffer)
#include "tst_snapshotbuffer.moc"
