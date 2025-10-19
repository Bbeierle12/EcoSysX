#pragma once

#include <QOpenGLWidget>
#include <QOpenGLFunctions>
#include <QMatrix4x4>
#include <QVector3D>
#include <QQuaternion>
#include <QVector>
#include <QJsonObject>
#include <QTimer>

class QMouseEvent;
class QWheelEvent;

/**
 * @brief 3D visualization widget using OpenGL
 * 
 * Renders agents in 3D space with:
 * - Spherical agents colored by SIR state
 * - Camera controls (orbit, pan, zoom)
 * - 3D grid/floor plane
 * - Lighting and shading
 * - Performance optimized for thousands of agents
 * 
 * Controls:
 * - Left drag: Orbit camera
 * - Right drag: Pan camera
 * - Mouse wheel: Zoom in/out
 * - R key: Reset camera
 * 
 * Color Scheme:
 * - Susceptible: Blue
 * - Infected: Red
 * - Recovered: Green
 */
class Visualization3DWidget : public QOpenGLWidget, protected QOpenGLFunctions {
    Q_OBJECT

public:
    explicit Visualization3DWidget(QWidget* parent = nullptr);
    ~Visualization3DWidget() override;

    /**
     * @brief Set the world dimensions
     */
    void setWorldSize(float size);

    /**
     * @brief Get agent count
     */
    int agentCount() const { return m_agents.size(); }

    /**
     * @brief Enable/disable rendering
     */
    void setRenderingEnabled(bool enabled);
    bool isRenderingEnabled() const { return m_renderingEnabled; }

public slots:
    /**
     * @brief Update agents from snapshot
     * 
     * Expected format:
     * {
     *   "state": {
     *     "agents": [
     *       {
     *         "id": "agent-0",
     *         "position": {"x": 10.5, "y": 20.3, "z": 5.0},  // z optional
     *         "sirState": 0  // 0=S, 1=I, 2=R
     *       },
     *       ...
     *     ]
     *   }
     * }
     */
    void updateAgents(const QJsonObject& snapshot);

    /**
     * @brief Clear all agents
     */
    void reset();

    /**
     * @brief Reset camera to default position
     */
    void resetCamera();

signals:
    /**
     * @brief Emitted when agents are updated
     */
    void agentsUpdated(int count);

    /**
     * @brief Emitted when camera position changes
     */
    void cameraChanged();

protected:
    // OpenGL functions
    void initializeGL() override;
    void resizeGL(int w, int h) override;
    void paintGL() override;

    // Input events
    void mousePressEvent(QMouseEvent* event) override;
    void mouseMoveEvent(QMouseEvent* event) override;
    void mouseReleaseEvent(QMouseEvent* event) override;
    void wheelEvent(QWheelEvent* event) override;
    void keyPressEvent(QKeyEvent* event) override;

private:
    /**
     * @brief Agent data in 3D space
     */
    struct Agent3D {
        QString id;
        QVector3D position;
        int sirState;  // 0=S, 1=I, 2=R
        
        Agent3D() : sirState(0) {}
    };

    /**
     * @brief Camera state
     */
    struct Camera {
        float distance;       // Distance from center
        float pitch;          // Up/down rotation (degrees)
        float yaw;            // Left/right rotation (degrees)
        QVector3D target;     // Look-at point
        QVector3D panOffset;  // Pan offset
        
        Camera() 
            : distance(100.0f)
            , pitch(30.0f)
            , yaw(45.0f)
            , target(0, 0, 0)
            , panOffset(0, 0, 0)
        {}
        
        QVector3D position() const {
            float radPitch = qDegreesToRadians(pitch);
            float radYaw = qDegreesToRadians(yaw);
            
            float x = distance * cos(radPitch) * cos(radYaw);
            float y = distance * sin(radPitch);
            float z = distance * cos(radPitch) * sin(radYaw);
            
            return QVector3D(x, y, z) + target + panOffset;
        }
    };

    /**
     * @brief Render the grid/floor
     */
    void renderGrid();

    /**
     * @brief Render all agents as spheres
     */
    void renderAgents();

    /**
     * @brief Render a sphere at position with color
     */
    void renderSphere(const QVector3D& pos, float radius, const QVector3D& color);

    /**
     * @brief Render axes for orientation
     */
    void renderAxes();

    /**
     * @brief Get color for SIR state
     */
    QVector3D getStateColor(int sirState) const;

    /**
     * @brief Update camera matrices
     */
    void updateCamera();

    /**
     * @brief Render a simple sphere using triangle approximation
     */
    void drawSimpleSphere(float radius, int segments = 12);

private:
    // Agents
    QVector<Agent3D> m_agents;

    // World properties
    float m_worldSize;

    // Camera
    Camera m_camera;
    QMatrix4x4 m_projectionMatrix;
    QMatrix4x4 m_viewMatrix;

    // Mouse interaction
    bool m_leftMousePressed;
    bool m_rightMousePressed;
    QPoint m_lastMousePos;

    // Rendering
    bool m_renderingEnabled;
    bool m_showGrid;
    bool m_showAxes;
    float m_agentRadius;

    // Animation timer
    QTimer* m_animationTimer;
};
