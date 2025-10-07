#pragma once

#include <QWidget>
#include <QVector>
#include <QJsonObject>
#include <QPointF>
#include <QColor>

class QPainter;
class QMouseEvent;
class QWheelEvent;

/**
 * @brief The VisualizationWidget renders a 2D view of the simulation grid
 * 
 * This widget displays agents on a 2D grid with:
 * - Color-coded agents by health state
 * - Zoom and pan controls
 * - Performance-optimized rendering for 10K+ agents
 * - Grid lines for spatial reference
 * - Hover information
 * 
 * Color Scheme:
 * - Susceptible: Green (#28a745)
 * - Infected: Red (#dc3545)
 * - Recovered: Blue (#007bff)
 * - Dead: Gray (#6c757d)
 * 
 * Controls:
 * - Mouse wheel: Zoom in/out
 * - Left drag: Pan view
 * - Hover: Show cell coordinates
 * 
 * Usage:
 * @code
 * VisualizationWidget* viz = new VisualizationWidget();
 * viz->setGridSize(100, 100);
 * connect(engineClient, &EngineClient::snapshotReceived,
 *         viz, &VisualizationWidget::updateAgents);
 * @endcode
 */
class VisualizationWidget : public QWidget {
    Q_OBJECT

public:
    /**
     * @brief Construct a VisualizationWidget
     * @param parent Parent widget
     */
    explicit VisualizationWidget(QWidget* parent = nullptr);
    
    /**
     * @brief Set the grid dimensions
     * @param width Grid width
     * @param height Grid height
     */
    void setGridSize(int width, int height);
    
    /**
     * @brief Get current zoom level
     * @return Zoom level (1.0 = normal, 2.0 = 2x, etc.)
     */
    double zoomLevel() const { return m_zoomLevel; }
    
    /**
     * @brief Get grid width
     * @return Grid width
     */
    int gridWidth() const { return m_gridWidth; }
    
    /**
     * @brief Get grid height
     * @return Grid height
     */
    int gridHeight() const { return m_gridHeight; }
    
    /**
     * @brief Get agent count
     * @return Number of agents currently displayed
     */
    int agentCount() const { return m_agents.size(); }
    
    /**
     * @brief Check if rendering is enabled
     * @return true if rendering
     */
    bool isRenderingEnabled() const { return m_renderingEnabled; }
    
    /**
     * @brief Enable or disable rendering
     * @param enabled true to enable rendering
     */
    void setRenderingEnabled(bool enabled);

public slots:
    /**
     * @brief Update agents from snapshot data
     * @param snapshot JSON snapshot from engine
     * 
     * Expected format:
     * {
     *   "agents": [
     *     { "id": 1, "x": 10.5, "y": 20.3, "state": "susceptible" },
     *     { "id": 2, "x": 30.1, "y": 40.8, "state": "infected" },
     *     ...
     *   ]
     * }
     */
    void updateAgents(const QJsonObject& snapshot);
    
    /**
     * @brief Clear all agents
     */
    void reset();
    
    /**
     * @brief Zoom in (increase zoom level)
     */
    void zoomIn();
    
    /**
     * @brief Zoom out (decrease zoom level)
     */
    void zoomOut();
    
    /**
     * @brief Reset zoom to 1.0 and center view
     */
    void resetZoom();
    
    /**
     * @brief Center view on grid
     */
    void centerView();

signals:
    /**
     * @brief Emitted when an agent is clicked
     * @param agentId Agent ID
     */
    void agentClicked(int agentId);
    
    /**
     * @brief Emitted when mouse hovers over a cell
     * @param x Grid X coordinate
     * @param y Grid Y coordinate
     */
    void cellHovered(int x, int y);
    
    /**
     * @brief Emitted when zoom level changes
     * @param level New zoom level
     */
    void zoomChanged(double level);
    
    /**
     * @brief Emitted when agents are updated
     * @param count Agent count
     */
    void agentsUpdated(int count);

protected:
    /**
     * @brief Paint event handler
     * @param event Paint event
     */
    void paintEvent(QPaintEvent* event) override;
    
    /**
     * @brief Mouse press event handler
     * @param event Mouse event
     */
    void mousePressEvent(QMouseEvent* event) override;
    
    /**
     * @brief Mouse move event handler
     * @param event Mouse event
     */
    void mouseMoveEvent(QMouseEvent* event) override;
    
    /**
     * @brief Mouse release event handler
     * @param event Mouse event
     */
    void mouseReleaseEvent(QMouseEvent* event) override;
    
    /**
     * @brief Mouse wheel event handler
     * @param event Wheel event
     */
    void wheelEvent(QWheelEvent* event) override;

private:
    /**
     * @brief Agent data structure
     */
    struct Agent {
        int id;
        double x, y;
        QString state;
        
        Agent() : id(0), x(0.0), y(0.0) {}
        Agent(int i, double px, double py, const QString& s)
            : id(i), x(px), y(py), state(s) {}
    };
    
    /**
     * @brief Render the grid lines
     * @param painter QPainter instance
     */
    void renderGrid(QPainter& painter);
    
    /**
     * @brief Render all agents
     * @param painter QPainter instance
     */
    void renderAgents(QPainter& painter);
    
    /**
     * @brief Render hover information
     * @param painter QPainter instance
     */
    void renderHoverInfo(QPainter& painter);
    
    /**
     * @brief Get color for agent state
     * @param state Agent state string
     * @return QColor for state
     */
    QColor getStateColor(const QString& state) const;
    
    /**
     * @brief Convert world coordinates to screen coordinates
     * @param x World X coordinate
     * @param y World Y coordinate
     * @return Screen coordinates
     */
    QPointF worldToScreen(double x, double y) const;
    
    /**
     * @brief Convert screen coordinates to world coordinates
     * @param screenX Screen X coordinate
     * @param screenY Screen Y coordinate
     * @return World coordinates
     */
    QPointF screenToWorld(int screenX, int screenY) const;
    
    /**
     * @brief Find agent at screen position
     * @param screenX Screen X coordinate
     * @param screenY Screen Y coordinate
     * @param threshold Search threshold in pixels
     * @return Agent ID or -1 if none found
     */
    int findAgentAt(int screenX, int screenY, double threshold = 5.0) const;
    
    /**
     * @brief Clamp zoom level to valid range
     * @param zoom Zoom level to clamp
     * @return Clamped zoom level
     */
    double clampZoom(double zoom) const;

private:
    // Grid properties
    int m_gridWidth;
    int m_gridHeight;
    
    // Agents
    QVector<Agent> m_agents;
    
    // View transform
    double m_zoomLevel;
    QPointF m_panOffset;
    
    // Interaction state
    bool m_isPanning;
    QPoint m_lastMousePos;
    QPoint m_currentMousePos;
    bool m_mouseInside;
    
    // Rendering settings
    bool m_renderingEnabled;
    bool m_showGrid;
    double m_agentRadius;  // Agent render radius in world units
    
    // Zoom constraints
    static constexpr double MIN_ZOOM = 0.1;
    static constexpr double MAX_ZOOM = 10.0;
    static constexpr double ZOOM_STEP = 0.2;
};
