#include "VisualizationWidget.h"
#include <QPainter>
#include <QMouseEvent>
#include <QWheelEvent>
#include <QJsonArray>
#include <QtMath>

VisualizationWidget::VisualizationWidget(QWidget* parent)
    : QWidget(parent)
    , m_gridWidth(100)
    , m_gridHeight(100)
    , m_zoomLevel(1.0)
    , m_panOffset(0, 0)
    , m_isPanning(false)
    , m_mouseInside(false)
    , m_renderingEnabled(true)
    , m_showGrid(true)
    , m_agentRadius(0.5)
{
    setMinimumSize(400, 400);
    setMouseTracking(true);
    setFocusPolicy(Qt::StrongFocus);
    
    // Set background color
    QPalette pal = palette();
    pal.setColor(QPalette::Window, QColor(240, 240, 240));
    setAutoFillBackground(true);
    setPalette(pal);
}

void VisualizationWidget::setGridSize(int width, int height) {
    m_gridWidth = width;
    m_gridHeight = height;
    centerView();
    update();
}

void VisualizationWidget::setRenderingEnabled(bool enabled) {
    m_renderingEnabled = enabled;
    update();
}

void VisualizationWidget::updateAgents(const QJsonObject& snapshot) {
    if (!m_renderingEnabled) {
        return;
    }
    
    m_agents.clear();
    
    QJsonArray agentsArray = snapshot["agents"].toArray();
    m_agents.reserve(agentsArray.size());
    
    for (const QJsonValue& agentValue : agentsArray) {
        QJsonObject agentObj = agentValue.toObject();
        
        Agent agent;
        agent.id = agentObj["id"].toInt();
        agent.x = agentObj["x"].toDouble();
        agent.y = agentObj["y"].toDouble();
        agent.state = agentObj["state"].toString().toLower();
        
        m_agents.append(agent);
    }
    
    emit agentsUpdated(m_agents.size());
    update();
}

void VisualizationWidget::reset() {
    m_agents.clear();
    resetZoom();
    emit agentsUpdated(0);
    update();
}

void VisualizationWidget::zoomIn() {
    double newZoom = clampZoom(m_zoomLevel + ZOOM_STEP);
    if (newZoom != m_zoomLevel) {
        m_zoomLevel = newZoom;
        emit zoomChanged(m_zoomLevel);
        update();
    }
}

void VisualizationWidget::zoomOut() {
    double newZoom = clampZoom(m_zoomLevel - ZOOM_STEP);
    if (newZoom != m_zoomLevel) {
        m_zoomLevel = newZoom;
        emit zoomChanged(m_zoomLevel);
        update();
    }
}

void VisualizationWidget::resetZoom() {
    m_zoomLevel = 1.0;
    centerView();
    emit zoomChanged(m_zoomLevel);
    update();
}

void VisualizationWidget::centerView() {
    m_panOffset = QPointF(0, 0);
}

void VisualizationWidget::paintEvent(QPaintEvent* event) {
    Q_UNUSED(event);
    
    QPainter painter(this);
    painter.setRenderHint(QPainter::Antialiasing, m_zoomLevel > 2.0);
    
    // Fill background
    painter.fillRect(rect(), QColor(240, 240, 240));
    
    // Render grid
    if (m_showGrid) {
        renderGrid(painter);
    }
    
    // Render agents
    if (m_renderingEnabled) {
        renderAgents(painter);
    }
    
    // Render hover info
    if (m_mouseInside) {
        renderHoverInfo(painter);
    }
}

void VisualizationWidget::mousePressEvent(QMouseEvent* event) {
    if (event->button() == Qt::LeftButton) {
        // Check if clicking on agent
        int agentId = findAgentAt(event->pos().x(), event->pos().y());
        if (agentId >= 0) {
            emit agentClicked(agentId);
        } else {
            // Start panning
            m_isPanning = true;
            m_lastMousePos = event->pos();
            setCursor(Qt::ClosedHandCursor);
        }
    }
}

void VisualizationWidget::mouseMoveEvent(QMouseEvent* event) {
    m_currentMousePos = event->pos();
    m_mouseInside = true;
    
    if (m_isPanning) {
        // Update pan offset
        QPoint delta = event->pos() - m_lastMousePos;
        m_panOffset += QPointF(delta.x(), delta.y());
        m_lastMousePos = event->pos();
        update();
    } else {
        // Emit hover event
        QPointF worldPos = screenToWorld(event->pos().x(), event->pos().y());
        emit cellHovered(qFloor(worldPos.x()), qFloor(worldPos.y()));
        update();
    }
}

void VisualizationWidget::mouseReleaseEvent(QMouseEvent* event) {
    if (event->button() == Qt::LeftButton && m_isPanning) {
        m_isPanning = false;
        setCursor(Qt::ArrowCursor);
    }
}

void VisualizationWidget::wheelEvent(QWheelEvent* event) {
    // Zoom in/out with mouse wheel
    double delta = event->angleDelta().y() / 120.0;  // Standard wheel step
    double zoomFactor = qPow(1.1, delta);
    
    double newZoom = clampZoom(m_zoomLevel * zoomFactor);
    if (newZoom != m_zoomLevel) {
        m_zoomLevel = newZoom;
        emit zoomChanged(m_zoomLevel);
        update();
    }
    
    event->accept();
}

void VisualizationWidget::renderGrid(QPainter& painter) {
    painter.save();
    
    // Calculate visible grid bounds
    int widgetWidth = width();
    int widgetHeight = height();
    
    double cellSize = qMin(widgetWidth, widgetHeight) / qMax(m_gridWidth, m_gridHeight) * m_zoomLevel;
    
    if (cellSize < 2.0) {
        // Don't render grid if cells are too small
        painter.restore();
        return;
    }
    
    // Center the grid
    double offsetX = (widgetWidth - m_gridWidth * cellSize) / 2.0 + m_panOffset.x();
    double offsetY = (widgetHeight - m_gridHeight * cellSize) / 2.0 + m_panOffset.y();
    
    painter.setPen(QPen(QColor(200, 200, 200), 0.5));
    
    // Draw vertical lines
    for (int x = 0; x <= m_gridWidth; ++x) {
        double screenX = offsetX + x * cellSize;
        painter.drawLine(QPointF(screenX, offsetY),
                        QPointF(screenX, offsetY + m_gridHeight * cellSize));
    }
    
    // Draw horizontal lines
    for (int y = 0; y <= m_gridHeight; ++y) {
        double screenY = offsetY + y * cellSize;
        painter.drawLine(QPointF(offsetX, screenY),
                        QPointF(offsetX + m_gridWidth * cellSize, screenY));
    }
    
    // Draw border
    painter.setPen(QPen(Qt::black, 2.0));
    painter.drawRect(QRectF(offsetX, offsetY,
                            m_gridWidth * cellSize, m_gridHeight * cellSize));
    
    painter.restore();
}

void VisualizationWidget::renderAgents(QPainter& painter) {
    painter.save();
    
    // Batch agents by state for efficient rendering
    QMap<QString, QVector<Agent>> agentsByState;
    for (const Agent& agent : m_agents) {
        agentsByState[agent.state].append(agent);
    }
    
    // Render each state batch
    for (auto it = agentsByState.begin(); it != agentsByState.end(); ++it) {
        const QString& state = it.key();
        const QVector<Agent>& agents = it.value();
        
        QColor color = getStateColor(state);
        painter.setBrush(color);
        painter.setPen(Qt::NoPen);
        
        for (const Agent& agent : agents) {
            QPointF screenPos = worldToScreen(agent.x, agent.y);
            
            // Cull off-screen agents
            if (screenPos.x() < -20 || screenPos.x() > width() + 20 ||
                screenPos.y() < -20 || screenPos.y() > height() + 20) {
                continue;
            }
            
            // Calculate radius in screen space
            double radius = m_agentRadius * (width() / qMax(m_gridWidth, m_gridHeight)) * m_zoomLevel;
            radius = qMax(2.0, qMin(radius, 20.0));  // Clamp between 2 and 20 pixels
            
            painter.drawEllipse(screenPos, radius, radius);
        }
    }
    
    painter.restore();
}

void VisualizationWidget::renderHoverInfo(QPainter& painter) {
    QPointF worldPos = screenToWorld(m_currentMousePos.x(), m_currentMousePos.y());
    int gridX = qFloor(worldPos.x());
    int gridY = qFloor(worldPos.y());
    
    // Only show if within grid bounds
    if (gridX >= 0 && gridX < m_gridWidth && gridY >= 0 && gridY < m_gridHeight) {
        QString infoText = QString("Cell: (%1, %2)").arg(gridX).arg(gridY);
        
        // Find nearby agent
        int nearbyAgent = findAgentAt(m_currentMousePos.x(), m_currentMousePos.y(), 10.0);
        if (nearbyAgent >= 0) {
            // Find agent details
            for (const Agent& agent : m_agents) {
                if (agent.id == nearbyAgent) {
                    infoText += QString(" | Agent #%1: %2").arg(agent.id).arg(agent.state);
                    break;
                }
            }
        }
        
        // Draw info box
        QFontMetrics fm(font());
        QRect textRect = fm.boundingRect(infoText);
        textRect.adjust(-5, -3, 5, 3);
        textRect.moveTopLeft(QPoint(10, 10));
        
        painter.save();
        painter.setBrush(QColor(255, 255, 255, 230));
        painter.setPen(Qt::black);
        painter.drawRect(textRect);
        painter.drawText(textRect, Qt::AlignCenter, infoText);
        painter.restore();
    }
}

QColor VisualizationWidget::getStateColor(const QString& state) const {
    if (state == "susceptible") {
        return QColor("#28a745");  // Green
    } else if (state == "infected") {
        return QColor("#dc3545");  // Red
    } else if (state == "recovered") {
        return QColor("#007bff");  // Blue
    } else if (state == "dead") {
        return QColor("#6c757d");  // Gray
    } else {
        return QColor("#000000");  // Black (unknown)
    }
}

QPointF VisualizationWidget::worldToScreen(double x, double y) const {
    int widgetWidth = width();
    int widgetHeight = height();
    
    double cellSize = qMin(widgetWidth, widgetHeight) / qMax(m_gridWidth, m_gridHeight) * m_zoomLevel;
    
    double offsetX = (widgetWidth - m_gridWidth * cellSize) / 2.0 + m_panOffset.x();
    double offsetY = (widgetHeight - m_gridHeight * cellSize) / 2.0 + m_panOffset.y();
    
    double screenX = offsetX + x * cellSize;
    double screenY = offsetY + y * cellSize;
    
    return QPointF(screenX, screenY);
}

QPointF VisualizationWidget::screenToWorld(int screenX, int screenY) const {
    int widgetWidth = width();
    int widgetHeight = height();
    
    double cellSize = qMin(widgetWidth, widgetHeight) / qMax(m_gridWidth, m_gridHeight) * m_zoomLevel;
    
    double offsetX = (widgetWidth - m_gridWidth * cellSize) / 2.0 + m_panOffset.x();
    double offsetY = (widgetHeight - m_gridHeight * cellSize) / 2.0 + m_panOffset.y();
    
    double worldX = (screenX - offsetX) / cellSize;
    double worldY = (screenY - offsetY) / cellSize;
    
    return QPointF(worldX, worldY);
}

int VisualizationWidget::findAgentAt(int screenX, int screenY, double threshold) const {
    double minDist = threshold;
    int foundId = -1;
    
    for (const Agent& agent : m_agents) {
        QPointF screenPos = worldToScreen(agent.x, agent.y);
        double dx = screenPos.x() - screenX;
        double dy = screenPos.y() - screenY;
        double dist = qSqrt(dx * dx + dy * dy);
        
        if (dist < minDist) {
            minDist = dist;
            foundId = agent.id;
        }
    }
    
    return foundId;
}

double VisualizationWidget::clampZoom(double zoom) const {
    return qBound(MIN_ZOOM, zoom, MAX_ZOOM);
}
