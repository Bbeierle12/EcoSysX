#include "SnapshotBuffer.h"
#include <QJsonValue>
#include <algorithm>
#include <limits>

SnapshotBuffer::SnapshotBuffer(int maxCapacity, QObject *parent)
    : QObject(parent)
    , m_head(0)
    , m_size(0)
    , m_maxCapacity(maxCapacity)
    , m_downsampleInterval(1)
    , m_downsampleCounter(0)
{
    if (m_maxCapacity < 1) {
        m_maxCapacity = 1000;  // Sensible default
    }
    m_buffer.resize(m_maxCapacity);
}

void SnapshotBuffer::setMaxCapacity(int capacity)
{
    QMutexLocker locker(&m_mutex);
    
    if (capacity < 1) {
        return;  // Invalid capacity
    }
    
    if (capacity == m_maxCapacity) {
        return;  // No change
    }
    
    // Create new buffer
    QVector<SnapshotEntry> newBuffer(capacity);
    
    // Copy existing data (preserve newest entries if shrinking)
    int entriesToCopy = std::min(m_size, capacity);
    int startIdx = (m_size > capacity) ? (m_size - capacity) : 0;
    
    for (int i = 0; i < entriesToCopy; ++i) {
        int oldIdx = (m_head - m_size + startIdx + i + m_maxCapacity) % m_maxCapacity;
        newBuffer[i] = m_buffer[oldIdx];
    }
    
    // Update state
    m_buffer = std::move(newBuffer);
    m_maxCapacity = capacity;
    m_head = entriesToCopy % capacity;
    m_size = entriesToCopy;
}

int SnapshotBuffer::maxCapacity() const
{
    QMutexLocker locker(&m_mutex);
    return m_maxCapacity;
}

void SnapshotBuffer::setDownsampleInterval(int interval)
{
    QMutexLocker locker(&m_mutex);
    
    if (interval < 1) {
        interval = 1;  // No downsampling below 1
    }
    
    m_downsampleInterval = interval;
    m_downsampleCounter = 0;  // Reset counter
}

int SnapshotBuffer::downsampleInterval() const
{
    QMutexLocker locker(&m_mutex);
    return m_downsampleInterval;
}

void SnapshotBuffer::addSnapshot(int step, const QJsonObject& snapshot)
{
    QMutexLocker locker(&m_mutex);
    
    // Check downsampling
    if (!shouldStore()) {
        return;
    }
    
    // Store in ring buffer
    m_buffer[m_head] = SnapshotEntry(step, snapshot);
    
    // Update indices
    m_head = (m_head + 1) % m_maxCapacity;
    
    bool wasAtCapacity = (m_size == m_maxCapacity);
    if (m_size < m_maxCapacity) {
        ++m_size;
    }
    
    // Release lock before emitting signals
    locker.unlock();
    
    emit snapshotAdded(step);
    
    if (wasAtCapacity) {
        emit bufferWrapped();
    }
}

void SnapshotBuffer::addMetrics(int step, const QJsonObject& metrics)
{
    // Create a minimal snapshot with just metrics
    QJsonObject snapshot;
    snapshot["step"] = step;
    snapshot["metrics"] = metrics;
    
    addSnapshot(step, snapshot);
}

void SnapshotBuffer::clear()
{
    QMutexLocker locker(&m_mutex);
    
    m_head = 0;
    m_size = 0;
    m_downsampleCounter = 0;
    
    // Clear data (optional, for memory management)
    for (auto& entry : m_buffer) {
        entry.step = -1;
        entry.data = QJsonObject();
    }
    
    locker.unlock();
    emit bufferCleared();
}

int SnapshotBuffer::size() const
{
    QMutexLocker locker(&m_mutex);
    return m_size;
}

bool SnapshotBuffer::isEmpty() const
{
    QMutexLocker locker(&m_mutex);
    return m_size == 0;
}

bool SnapshotBuffer::isFull() const
{
    QMutexLocker locker(&m_mutex);
    return m_size == m_maxCapacity;
}

QJsonObject SnapshotBuffer::getLatestSnapshot() const
{
    QMutexLocker locker(&m_mutex);
    
    if (m_size == 0) {
        return QJsonObject();
    }
    
    // Latest is just before head
    int latestIdx = (m_head - 1 + m_maxCapacity) % m_maxCapacity;
    return m_buffer[latestIdx].data;
}

QJsonObject SnapshotBuffer::getSnapshotAt(int index) const
{
    QMutexLocker locker(&m_mutex);
    
    if (index < 0 || index >= m_size) {
        return QJsonObject();
    }
    
    // Calculate actual position in ring buffer
    int actualIdx = (m_head - m_size + index + m_maxCapacity) % m_maxCapacity;
    return m_buffer[actualIdx].data;
}

QVector<QJsonObject> SnapshotBuffer::getAllSnapshots() const
{
    QMutexLocker locker(&m_mutex);
    
    QVector<QJsonObject> result;
    result.reserve(m_size);
    
    for (int i = 0; i < m_size; ++i) {
        int actualIdx = (m_head - m_size + i + m_maxCapacity) % m_maxCapacity;
        result.append(m_buffer[actualIdx].data);
    }
    
    return result;
}

QVector<SnapshotBuffer::DataPoint> SnapshotBuffer::getTimeSeriesData(
    const QString& metricPath,
    int startStep,
    int endStep) const
{
    QMutexLocker locker(&m_mutex);
    
    QVector<DataPoint> result;
    result.reserve(m_size);  // Pre-allocate
    
    for (int i = 0; i < m_size; ++i) {
        int actualIdx = (m_head - m_size + i + m_maxCapacity) % m_maxCapacity;
        const auto& entry = m_buffer[actualIdx];
        
        // Filter by step range
        if (entry.step < startStep || entry.step > endStep) {
            continue;
        }
        
        // Extract value
        double value = extractValue(entry.data, metricPath);
        result.append(DataPoint(entry.step, value));
    }
    
    return result;
}

void SnapshotBuffer::getStepRange(int& minStep, int& maxStep) const
{
    QMutexLocker locker(&m_mutex);
    
    if (m_size == 0) {
        minStep = -1;
        maxStep = -1;
        return;
    }
    
    minStep = std::numeric_limits<int>::max();
    maxStep = std::numeric_limits<int>::min();
    
    for (int i = 0; i < m_size; ++i) {
        int actualIdx = (m_head - m_size + i + m_maxCapacity) % m_maxCapacity;
        int step = m_buffer[actualIdx].step;
        
        if (step < minStep) minStep = step;
        if (step > maxStep) maxStep = step;
    }
}

double SnapshotBuffer::extractValue(const QJsonObject& obj, const QString& path) const
{
    QStringList parts = path.split('.');
    QJsonValue current = obj;
    
    for (const QString& part : parts) {
        if (!current.isObject()) {
            return 0.0;  // Path not found
        }
        current = current.toObject()[part];
    }
    
    if (current.isDouble()) {
        return current.toDouble();
    } else if (current.isString()) {
        // Try to convert string to double
        bool ok;
        double value = current.toString().toDouble(&ok);
        return ok ? value : 0.0;
    }
    
    return 0.0;  // Not a number
}

bool SnapshotBuffer::shouldStore()
{
    // Always store if no downsampling
    if (m_downsampleInterval <= 1) {
        return true;
    }
    
    // Check counter
    ++m_downsampleCounter;
    if (m_downsampleCounter >= m_downsampleInterval) {
        m_downsampleCounter = 0;
        return true;
    }
    
    return false;
}
