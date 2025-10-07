#include "MetricsChartWidget.h"
#include <QVBoxLayout>
#include <QChartView>
#include <QLineSeries>
#include <QValueAxis>
#include <QLegend>
#include <QJsonArray>
#include <QFileDialog>
#include <QMessageBox>

QT_CHARTS_USE_NAMESPACE

MetricsChartWidget::MetricsChartWidget(QWidget* parent)
    : QWidget(parent)
    , m_chart(new QChart())
    , m_chartView(new QChartView(m_chart, this))
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
        m_dataPointCount--;
    }
    
    // Update ranges
    m_maxStep = step;
    if (m_dataPointCount == 1) {
        m_minStep = step;
    } else if (m_susceptibleSeries->count() > 0) {
        m_minStep = qRound(m_susceptibleSeries->at(0).x());
    }
    
    int maxValue = qMax({metrics.susceptible, metrics.infected,
                         metrics.recovered, metrics.dead});
    m_maxValue = qMax(m_maxValue, maxValue);
    
    updateYAxisRange();
    
    emit dataAdded(step);
}

void MetricsChartWidget::clear() {
    m_susceptibleSeries->clear();
    m_infectedSeries->clear();
    m_recoveredSeries->clear();
    m_deadSeries->clear();
    
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
    
    // Make legend interactive
    connect(m_chart->legend(), &QLegend::clicked, this, [this](QLegendMarker* marker) {
        if (!marker) return;
        
        // Toggle series visibility
        marker->series()->setVisible(!marker->series()->isVisible());
        
        // Update marker appearance
        marker->setVisible(true);
        qreal alpha = marker->series()->isVisible() ? 1.0 : 0.5;
        
        QColor color = marker->labelBrush().color();
        color.setAlphaF(alpha);
        marker->setLabelBrush(QBrush(color));
        
        // Find series name
        QString seriesName;
        if (marker->series() == m_susceptibleSeries) seriesName = "susceptible";
        else if (marker->series() == m_infectedSeries) seriesName = "infected";
        else if (marker->series() == m_recoveredSeries) seriesName = "recovered";
        else if (marker->series() == m_deadSeries) seriesName = "dead";
        
        if (!seriesName.isEmpty()) {
            emit seriesToggled(seriesName, marker->series()->isVisible());
        }
    });
}

QLineSeries* MetricsChartWidget::createSeries(const QString& name, const QColor& color) {
    QLineSeries* series = new QLineSeries();
    series->setName(name);
    series->setColor(color);
    series->setPen(QPen(color, 2));
    return series;
}
