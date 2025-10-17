#include "MetricsChartWidget.h"
#include "core/SnapshotBuffer.h"
#include <QVBoxLayout>
#include <QtCharts/QChartView>
#include <QtCharts/QLineSeries>
#include <QtCharts/QValueAxis>
#include <QtCharts/QLegend>
#include <QtCharts/QLegendMarker>
#include <QJsonArray>
#include <QFileDialog>
#include <QMessageBox>
#include <QtAlgorithms>

// Note: Qt Charts types are in global namespace in Qt 6.9.3

MetricsChartWidget::MetricsChartWidget(QWidget* parent)
    : QWidget(parent)
    , m_chart(new QChart())
    , m_chartView(new QChartView(m_chart, this))
    , m_snapshotBuffer(new SnapshotBuffer(1000, this))
    , m_maxDataPoints(1000)
    , m_dataPointCount(0)
    , m_minStep(0)
    , m_maxStep(0)
    , m_maxValue(100)
{
    // Create series
    m_susceptibleSeries = createSeries("Susceptible", QColor("#28a745"));
    m_infectedSeries = createSeries("Infected", QColor("#dc3545"));
    m_recoveredSeries = createSeries("Recovered", QColor("#007bff"));
    m_deadSeries = createSeries("Dead", QColor("#6c757d"));
    
    // Add series to chart
    m_chart->addSeries(m_susceptibleSeries);
    m_chart->addSeries(m_infectedSeries);
    m_chart->addSeries(m_recoveredSeries);
    m_chart->addSeries(m_deadSeries);
    
    // Create axes
    m_axisX = new QValueAxis();
    m_axisX->setTitleText("Simulation Step");
    m_axisX->setLabelFormat("%d");
    m_axisX->setRange(0, 100);
    
    m_axisY = new QValueAxis();
    m_axisY->setTitleText("Agent Count");
    m_axisY->setLabelFormat("%d");
    m_axisY->setRange(0, 100);
    
    // Attach axes to chart
    m_chart->addAxis(m_axisX, Qt::AlignBottom);
    m_chart->addAxis(m_axisY, Qt::AlignLeft);
    
    // Attach series to axes
    m_susceptibleSeries->attachAxis(m_axisX);
    m_susceptibleSeries->attachAxis(m_axisY);
    m_infectedSeries->attachAxis(m_axisX);
    m_infectedSeries->attachAxis(m_axisY);
    m_recoveredSeries->attachAxis(m_axisX);
    m_recoveredSeries->attachAxis(m_axisY);
    m_deadSeries->attachAxis(m_axisX);
    m_deadSeries->attachAxis(m_axisY);
    
    setupChart();
    
    // Setup chart view
    m_chartView->setRenderHint(QPainter::Antialiasing);
    m_chartView->setMinimumHeight(300);
    
    // Layout
    QVBoxLayout* layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->addWidget(m_chartView);
}

void MetricsChartWidget::setMaxDataPoints(int max) {
    m_maxDataPoints = qMax(10, max);
    m_snapshotBuffer->setMaxCapacity(max);
    
    // Rebuild chart if data exists
    if (m_dataPointCount > 0) {
        rebuildChartFromBuffer();
    }
}

bool MetricsChartWidget::isSeriesVisible(const QString& seriesName) const {
    QLineSeries* series = nullptr;
    
    if (seriesName == "susceptible") {
        series = m_susceptibleSeries;
    } else if (seriesName == "infected") {
        series = m_infectedSeries;
    } else if (seriesName == "recovered") {
        series = m_recoveredSeries;
    } else if (seriesName == "dead") {
        series = m_deadSeries;
    }
    
    return series ? series->isVisible() : false;
}

void MetricsChartWidget::addDataPoint(int step, const QJsonObject& snapshot) {
    // Store in snapshot buffer
    m_snapshotBuffer->addSnapshot(step, snapshot);
    
    // Extract metrics
    Metrics metrics = extractMetrics(snapshot);
    
    // Add points to series
    m_susceptibleSeries->append(step, metrics.susceptible);
    m_infectedSeries->append(step, metrics.infected);
    m_recoveredSeries->append(step, metrics.recovered);
    m_deadSeries->append(step, metrics.dead);
    
    m_dataPointCount++;
    
    // Remove old points if exceeding max
    if (m_susceptibleSeries->count() > m_maxDataPoints) {
        m_susceptibleSeries->remove(0);
        m_infectedSeries->remove(0);
        m_recoveredSeries->remove(0);
        m_deadSeries->remove(0);
        m_dataPointCount = m_maxDataPoints;
    }
    
    // Update ranges
    m_maxStep = step;
    if (m_dataPointCount == 1) {
        m_minStep = step;
    } else if (m_susceptibleSeries->count() > 0) {
        m_minStep = qRound(m_susceptibleSeries->at(0).x());
    }
    
    int maxValue = qMax(qMax(metrics.susceptible, metrics.infected),
                        qMax(metrics.recovered, metrics.dead));
    m_maxValue = qMax(m_maxValue, maxValue);
    
    updateYAxisRange();
    
    emit dataAdded(step);
}

void MetricsChartWidget::clear() {
    m_susceptibleSeries->clear();
    m_infectedSeries->clear();
    m_recoveredSeries->clear();
    m_deadSeries->clear();
    
    m_snapshotBuffer->clear();
    
    m_dataPointCount = 0;
    m_minStep = 0;
    m_maxStep = 0;
    m_maxValue = 100;
    
    m_axisX->setRange(0, 100);
    m_axisY->setRange(0, 100);
    
    emit chartCleared();
}

void MetricsChartWidget::setSeriesVisible(const QString& seriesName, bool visible) {
    QLineSeries* series = nullptr;
    
    if (seriesName == "susceptible") {
        series = m_susceptibleSeries;
    } else if (seriesName == "infected") {
        series = m_infectedSeries;
    } else if (seriesName == "recovered") {
        series = m_recoveredSeries;
    } else if (seriesName == "dead") {
        series = m_deadSeries;
    }
    
    if (series) {
        series->setVisible(visible);
        emit seriesToggled(seriesName, visible);
    }
}

bool MetricsChartWidget::exportToPng(const QString& filePath) {
    QPixmap pixmap = m_chartView->grab();
    bool saved = pixmap.save(filePath, "PNG");
    
    if (!saved) {
        QMessageBox::critical(this, "Export Error",
            QString("Failed to export chart to:\n%1").arg(filePath));
    }
    
    return saved;
}

bool MetricsChartWidget::exportWithDialog() {
    QString fileName = QFileDialog::getSaveFileName(
        this,
        "Export Chart",
        "metrics-chart.png",
        "PNG Images (*.png);;All Files (*)"
    );
    
    if (fileName.isEmpty()) {
        return false;
    }
    
    return exportToPng(fileName);
}

MetricsChartWidget::Metrics MetricsChartWidget::extractMetrics(const QJsonObject& snapshot) {
    Metrics metrics = {0, 0, 0, 0};
    
    QJsonArray agents = snapshot["agents"].toArray();
    
    for (const QJsonValue& agentValue : agents) {
        QJsonObject agent = agentValue.toObject();
        QString state = agent["state"].toString().toLower();
        
        if (state == "susceptible") {
            metrics.susceptible++;
        } else if (state == "infected") {
            metrics.infected++;
        } else if (state == "recovered") {
            metrics.recovered++;
        } else if (state == "dead") {
            metrics.dead++;
        }
    }
    
    return metrics;
}

void MetricsChartWidget::updateYAxisRange() {
    // Update X-axis
    int xRange = m_maxStep - m_minStep;
    int xPadding = qMax(10, xRange / 10);
    m_axisX->setRange(m_minStep - xPadding, m_maxStep + xPadding);
    
    // Update Y-axis with padding
    int yPadding = qMax(10, m_maxValue / 10);
    m_axisY->setRange(0, m_maxValue + yPadding);
}

void MetricsChartWidget::setupChart() {
    m_chart->setTitle("Population Dynamics");
    m_chart->setAnimationOptions(QChart::NoAnimation);  // Disable for performance
    
    // Configure legend
    m_chart->legend()->setVisible(true);
    m_chart->legend()->setAlignment(Qt::AlignBottom);
    
    // Note: Interactive legend (QLegend::clicked) not available in Qt 6.9.3
    // TODO: Implement alternative legend interaction if needed
}

QLineSeries* MetricsChartWidget::createSeries(const QString& name, const QColor& color) {
    QLineSeries* series = new QLineSeries();
    series->setName(name);
    series->setColor(color);
    series->setPen(QPen(color, 2));
    return series;
}

void MetricsChartWidget::rebuildChartFromBuffer() {
    // Clear existing series data
    m_susceptibleSeries->clear();
    m_infectedSeries->clear();
    m_recoveredSeries->clear();
    m_deadSeries->clear();
    
    // Get all snapshots from buffer
    auto snapshots = m_snapshotBuffer->getAllSnapshots();
    
    if (snapshots.isEmpty()) {
        return;
    }
    
    m_maxValue = 0;
    
    // Rebuild series from buffer
    for (const QJsonObject& snapshot : snapshots) {
        int step = snapshot["step"].toInt();
        Metrics metrics = extractMetrics(snapshot);
        
        m_susceptibleSeries->append(step, metrics.susceptible);
        m_infectedSeries->append(step, metrics.infected);
        m_recoveredSeries->append(step, metrics.recovered);
        m_deadSeries->append(step, metrics.dead);
        
        int maxValue = qMax(qMax(metrics.susceptible, metrics.infected),
                            qMax(metrics.recovered, metrics.dead));
        m_maxValue = qMax(m_maxValue, maxValue);
    }
    
    // Update tracking variables
    m_dataPointCount = snapshots.size();
    
    int minStep, maxStep;
    m_snapshotBuffer->getStepRange(minStep, maxStep);
    m_minStep = minStep;
    m_maxStep = maxStep;
    
    // Update axes
    updateYAxisRange();
}
