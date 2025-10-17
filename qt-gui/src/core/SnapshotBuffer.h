#pragma once

#include <QObject>
#include <QJsonObject>
#include <QVector>
#include <QMutex>
#include <QMutexLocker>

/**
 * @class SnapshotBuffer
 * @brief Ring buffer for storing and managing simulation snapshots with downsampling support
 *
 * The SnapshotBuffer manages a rolling window of simulation snapshots, providing:
 * - Fixed-size ring buffer with automatic wrapping
 * - Downsampling for efficient storage of long-running simulations
 * - Thread-safe access for concurrent UI and worker threads
 * - Efficient retrieval of time-series data for charting
 *
 * ## Usage Example:
 * @code
 * SnapshotBuffer buffer(1000);  // Store up to 1000 snapshots
 * buffer.setDownsampleInterval(5);  // Keep every 5th snapshot
 * 
 * // Add snapshots
 * buffer.addSnapshot(stepNum, snapshotJson);
 * 
 * // Retrieve data for charting
 * auto data = buffer.getTimeSeriesData("population", 0, 1000);
 * @endcode
 *
 * ## Thread Safety:
 * All public methods are thread-safe and can be called from multiple threads.
 *
 * @see MetricsChartWidget
 * @see EngineClient
 */
class SnapshotBuffer : public QObject
{
    Q_OBJECT

public:
    /**
     * @brief Data point for time-series
     */
    struct DataPoint {
        int step;           ///< Simulation step number
        double value;       ///< Metric value
        
        DataPoint() : step(0), value(0.0) {}
        DataPoint(int s, double v) : step(s), value(v) {}
    };

    /**
     * @brief Construct a snapshot buffer
     * @param maxCapacity Maximum number of snapshots to store (default: 1000)
     * @param parent Parent QObject for memory management
     */
    explicit SnapshotBuffer(int maxCapacity = 1000, QObject *parent = nullptr);

    /**
     * @brief Destructor
     */
    ~SnapshotBuffer() override = default;

    // Configuration
    
    /**
     * @brief Set the maximum buffer capacity
     * @param capacity Maximum number of snapshots to store
     */
    void setMaxCapacity(int capacity);

    /**
     * @brief Get the current maximum capacity
     * @return Maximum buffer capacity
     */
    int maxCapacity() const;

    /**
     * @brief Set the downsample interval
     * @param interval Keep every Nth snapshot (1 = no downsampling, 2 = every other, etc.)
     */
    void setDownsampleInterval(int interval);

    /**
     * @brief Get the current downsample interval
     * @return Downsample interval (1 = no downsampling)
     */
    int downsampleInterval() const;

    // Data Management
    
    /**
     * @brief Add a snapshot to the buffer
     * @param step Simulation step number
     * @param snapshot Full snapshot JSON object
     * 
     * If downsampling is enabled, only every Nth snapshot is stored.
     * If buffer is full, oldest snapshot is removed (ring buffer behavior).
     */
    void addSnapshot(int step, const QJsonObject& snapshot);

    /**
     * @brief Add a metrics-only snapshot
     * @param step Simulation step number
     * @param metrics Metrics portion of snapshot
     */
    void addMetrics(int step, const QJsonObject& metrics);

    /**
     * @brief Clear all stored snapshots
     */
    void clear();

    /**
     * @brief Get the number of snapshots currently stored
     * @return Number of snapshots in buffer
     */
    int size() const;

    /**
     * @brief Check if buffer is empty
     * @return true if no snapshots stored
     */
    bool isEmpty() const;

    /**
     * @brief Check if buffer is at capacity
     * @return true if buffer is full
     */
    bool isFull() const;

    // Data Retrieval
    
    /**
     * @brief Get the most recent snapshot
     * @return Latest snapshot JSON object, or empty object if buffer is empty
     */
    QJsonObject getLatestSnapshot() const;

    /**
     * @brief Get snapshot at specific index
     * @param index Index in buffer (0 = oldest, size()-1 = newest)
     * @return Snapshot at index, or empty object if index invalid
     */
    QJsonObject getSnapshotAt(int index) const;

    /**
     * @brief Get all snapshots in chronological order
     * @return Vector of all snapshots (oldest first)
     */
    QVector<QJsonObject> getAllSnapshots() const;

    /**
     * @brief Extract time-series data for a specific metric
     * @param metricPath JSON path to metric (e.g., "metrics.population")
     * @param startStep Starting step number (inclusive)
     * @param endStep Ending step number (inclusive)
     * @return Vector of data points for the metric
     * 
     * Example paths:
     * - "metrics.population"
     * - "metrics.sir.susceptible"
     * - "metrics.energyMean"
     */
    QVector<DataPoint> getTimeSeriesData(const QString& metricPath,
                                         int startStep = 0,
                                         int endStep = INT_MAX) const;

    /**
     * @brief Get the step range currently in buffer
     * @param[out] minStep Minimum step number (or -1 if empty)
     * @param[out] maxStep Maximum step number (or -1 if empty)
     */
    void getStepRange(int& minStep, int& maxStep) const;

signals:
    /**
     * @brief Emitted when a new snapshot is added
     * @param step Step number of new snapshot
     */
    void snapshotAdded(int step);

    /**
     * @brief Emitted when buffer is cleared
     */
    void bufferCleared();

    /**
     * @brief Emitted when buffer reaches capacity and starts wrapping
     */
    void bufferWrapped();

private:
    // Data storage
    struct SnapshotEntry {
        int step;
        QJsonObject data;
        
        SnapshotEntry() : step(-1) {}
        SnapshotEntry(int s, const QJsonObject& d) : step(s), data(d) {}
    };

    QVector<SnapshotEntry> m_buffer;  ///< Ring buffer storage
    int m_head;                        ///< Current write position
    int m_size;                        ///< Current number of snapshots
    int m_maxCapacity;                 ///< Maximum buffer capacity
    int m_downsampleInterval;          ///< Downsample interval (1 = no downsampling)
    int m_downsampleCounter;           ///< Counter for downsampling
    
    mutable QMutex m_mutex;            ///< Thread safety mutex

    /**
     * @brief Extract value from JSON using dot-notation path
     * @param obj JSON object to search
     * @param path Dot-separated path (e.g., "metrics.population")
     * @return Value at path, or 0.0 if not found
     */
    double extractValue(const QJsonObject& obj, const QString& path) const;

    /**
     * @brief Check if snapshot should be stored based on downsampling
     * @return true if this snapshot should be stored
     */
    bool shouldStore();
};
