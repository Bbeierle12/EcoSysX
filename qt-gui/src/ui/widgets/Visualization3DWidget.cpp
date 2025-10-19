#include "Visualization3DWidget.h"
#include <QMouseEvent>
#include <QWheelEvent>
#include <QKeyEvent>
#include <QtMath>
#include <QJsonArray>

Visualization3DWidget::Visualization3DWidget(QWidget* parent)
    : QOpenGLWidget(parent)
    , m_worldSize(50.0f)
    , m_leftMousePressed(false)
    , m_rightMousePressed(false)
    , m_renderingEnabled(true)
    , m_showGrid(true)
    , m_showAxes(true)
    , m_agentRadius(0.5f)
{
    setFocusPolicy(Qt::StrongFocus);
    setMouseTracking(true);
    
    // Animation timer for smooth rendering
    m_animationTimer = new QTimer(this);
    connect(m_animationTimer, &QTimer::timeout, this, QOverload<>::of(&Visualization3DWidget::update));
    m_animationTimer->start(16); // ~60 FPS
}

Visualization3DWidget::~Visualization3DWidget() {
    makeCurrent();
    // Cleanup OpenGL resources
    doneCurrent();
}

void Visualization3DWidget::setWorldSize(float size) {
    m_worldSize = size;
    resetCamera();
}

void Visualization3DWidget::setRenderingEnabled(bool enabled) {
    m_renderingEnabled = enabled;
    update();
}

void Visualization3DWidget::updateAgents(const QJsonObject& snapshot) {
    if (!m_renderingEnabled) {
        return;
    }
    
    m_agents.clear();
    
    // Extract agents from snapshot.state.agents
    QJsonObject state = snapshot["state"].toObject();
    QJsonArray agentsArray = state["agents"].toArray();
    
    if (agentsArray.isEmpty()) {
        // Fallback: try direct agents array
        agentsArray = snapshot["agents"].toArray();
    }
    
    m_agents.reserve(agentsArray.size());
    
    for (const QJsonValue& agentValue : agentsArray) {
        QJsonObject agentObj = agentValue.toObject();
        
        Agent3D agent;
        agent.id = agentObj["id"].toString();
        
        // Extract position
        if (agentObj.contains("position")) {
            QJsonObject pos = agentObj["position"].toObject();
            float x = static_cast<float>(pos["x"].toDouble());
            float y = static_cast<float>(pos["y"].toDouble());
            float z = static_cast<float>(pos["z"].toDouble(0.0)); // Z is optional, default to 0
            
            // Center coordinates around origin
            agent.position = QVector3D(
                x - m_worldSize / 2.0f,
                z,  // Use z as height (Y-up convention)
                y - m_worldSize / 2.0f
            );
        } else {
            // Fallback: flat x, y, z
            float x = static_cast<float>(agentObj["x"].toDouble());
            float y = static_cast<float>(agentObj["y"].toDouble());
            float z = static_cast<float>(agentObj["z"].toDouble(0.0));
            
            agent.position = QVector3D(
                x - m_worldSize / 2.0f,
                z,
                y - m_worldSize / 2.0f
            );
        }
        
        // Extract SIR state
        agent.sirState = agentObj["sirState"].toInt(0);
        
        m_agents.append(agent);
    }
    
    emit agentsUpdated(m_agents.size());
    update();
}

void Visualization3DWidget::reset() {
    m_agents.clear();
    resetCamera();
    emit agentsUpdated(0);
    update();
}

void Visualization3DWidget::resetCamera() {
    m_camera = Camera();
    m_camera.distance = m_worldSize * 1.5f;
    m_camera.target = QVector3D(0, 0, 0);
    updateCamera();
    emit cameraChanged();
    update();
}

void Visualization3DWidget::initializeGL() {
    initializeOpenGLFunctions();
    
    // Enable depth testing
    glEnable(GL_DEPTH_TEST);
    glDepthFunc(GL_LESS);
    
    // Enable blending for transparency
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    
    // Enable smooth shading
    glShadeModel(GL_SMOOTH);
    
    // Enable lighting
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    
    // Set light properties
    GLfloat lightAmbient[] = {0.3f, 0.3f, 0.3f, 1.0f};
    GLfloat lightDiffuse[] = {0.8f, 0.8f, 0.8f, 1.0f};
    GLfloat lightPosition[] = {50.0f, 100.0f, 50.0f, 1.0f};
    
    glLightfv(GL_LIGHT0, GL_AMBIENT, lightAmbient);
    glLightfv(GL_LIGHT0, GL_DIFFUSE, lightDiffuse);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPosition);
    
    // Set material properties
    glEnable(GL_COLOR_MATERIAL);
    glColorMaterial(GL_FRONT_AND_BACK, GL_AMBIENT_AND_DIFFUSE);
    
    // Set background color
    glClearColor(0.1f, 0.1f, 0.15f, 1.0f);
}

void Visualization3DWidget::resizeGL(int w, int h) {
    glViewport(0, 0, w, h);
    
    // Update projection matrix
    m_projectionMatrix.setToIdentity();
    float aspect = static_cast<float>(w) / static_cast<float>(h > 0 ? h : 1);
    m_projectionMatrix.perspective(45.0f, aspect, 0.1f, 1000.0f);
}

void Visualization3DWidget::paintGL() {
    // Clear buffers
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    
    // Update camera matrices
    updateCamera();
    
    // Set projection matrix
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    glMultMatrixf(m_projectionMatrix.data());
    
    // Set view matrix
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    glMultMatrixf(m_viewMatrix.data());
    
    // Render scene
    if (m_showGrid) {
        renderGrid();
    }
    
    if (m_showAxes) {
        renderAxes();
    }
    
    if (m_renderingEnabled) {
        renderAgents();
    }
}

void Visualization3DWidget::renderGrid() {
    glDisable(GL_LIGHTING);
    glLineWidth(1.0f);
    
    float halfSize = m_worldSize / 2.0f;
    float gridStep = m_worldSize / 10.0f;
    
    // Draw grid on XZ plane (Y=0)
    glColor4f(0.3f, 0.3f, 0.4f, 0.5f);
    glBegin(GL_LINES);
    
    // Lines parallel to X axis
    for (float z = -halfSize; z <= halfSize; z += gridStep) {
        glVertex3f(-halfSize, 0.0f, z);
        glVertex3f(halfSize, 0.0f, z);
    }
    
    // Lines parallel to Z axis
    for (float x = -halfSize; x <= halfSize; x += gridStep) {
        glVertex3f(x, 0.0f, -halfSize);
        glVertex3f(x, 0.0f, halfSize);
    }
    
    glEnd();
    
    // Draw border
    glLineWidth(2.0f);
    glColor4f(0.5f, 0.5f, 0.6f, 0.8f);
    glBegin(GL_LINE_LOOP);
    glVertex3f(-halfSize, 0.0f, -halfSize);
    glVertex3f(halfSize, 0.0f, -halfSize);
    glVertex3f(halfSize, 0.0f, halfSize);
    glVertex3f(-halfSize, 0.0f, halfSize);
    glEnd();
    
    glEnable(GL_LIGHTING);
}

void Visualization3DWidget::renderAxes() {
    glDisable(GL_LIGHTING);
    glLineWidth(3.0f);
    
    float axisLength = m_worldSize * 0.3f;
    
    glBegin(GL_LINES);
    
    // X axis - Red
    glColor3f(1.0f, 0.0f, 0.0f);
    glVertex3f(0.0f, 0.0f, 0.0f);
    glVertex3f(axisLength, 0.0f, 0.0f);
    
    // Y axis - Green
    glColor3f(0.0f, 1.0f, 0.0f);
    glVertex3f(0.0f, 0.0f, 0.0f);
    glVertex3f(0.0f, axisLength, 0.0f);
    
    // Z axis - Blue
    glColor3f(0.0f, 0.0f, 1.0f);
    glVertex3f(0.0f, 0.0f, 0.0f);
    glVertex3f(0.0f, 0.0f, axisLength);
    
    glEnd();
    
    glEnable(GL_LIGHTING);
}

void Visualization3DWidget::renderAgents() {
    for (const Agent3D& agent : m_agents) {
        QVector3D color = getStateColor(agent.sirState);
        renderSphere(agent.position, m_agentRadius, color);
    }
}

void Visualization3DWidget::renderSphere(const QVector3D& pos, float radius, const QVector3D& color) {
    glPushMatrix();
    glTranslatef(pos.x(), pos.y(), pos.z());
    
    // Set material color
    GLfloat matColor[] = {color.x(), color.y(), color.z(), 1.0f};
    GLfloat matSpec[] = {0.5f, 0.5f, 0.5f, 1.0f};
    glMaterialfv(GL_FRONT_AND_BACK, GL_AMBIENT_AND_DIFFUSE, matColor);
    glMaterialfv(GL_FRONT_AND_BACK, GL_SPECULAR, matSpec);
    glMaterialf(GL_FRONT_AND_BACK, GL_SHININESS, 32.0f);
    
    // Draw sphere
    drawSimpleSphere(radius);
    
    glPopMatrix();
}

void Visualization3DWidget::drawSimpleSphere(float radius, int segments) {
    const int stacks = segments;
    const int slices = segments;
    
    for (int i = 0; i < stacks; ++i) {
        float lat0 = M_PI * (-0.5f + static_cast<float>(i) / stacks);
        float z0 = sin(lat0);
        float zr0 = cos(lat0);
        
        float lat1 = M_PI * (-0.5f + static_cast<float>(i + 1) / stacks);
        float z1 = sin(lat1);
        float zr1 = cos(lat1);
        
        glBegin(GL_QUAD_STRIP);
        for (int j = 0; j <= slices; ++j) {
            float lng = 2 * M_PI * static_cast<float>(j) / slices;
            float x = cos(lng);
            float y = sin(lng);
            
            glNormal3f(x * zr0, y * zr0, z0);
            glVertex3f(radius * x * zr0, radius * y * zr0, radius * z0);
            
            glNormal3f(x * zr1, y * zr1, z1);
            glVertex3f(radius * x * zr1, radius * y * zr1, radius * z1);
        }
        glEnd();
    }
}

QVector3D Visualization3DWidget::getStateColor(int sirState) const {
    switch (sirState) {
        case 0: // Susceptible
            return QVector3D(0.2f, 0.6f, 1.0f); // Blue
        case 1: // Infected
            return QVector3D(1.0f, 0.2f, 0.2f); // Red
        case 2: // Recovered
            return QVector3D(0.2f, 1.0f, 0.4f); // Green
        default:
            return QVector3D(0.5f, 0.5f, 0.5f); // Gray
    }
}

void Visualization3DWidget::updateCamera() {
    m_viewMatrix.setToIdentity();
    
    QVector3D eye = m_camera.position();
    QVector3D center = m_camera.target + m_camera.panOffset;
    QVector3D up(0, 1, 0);
    
    m_viewMatrix.lookAt(eye, center, up);
}

void Visualization3DWidget::mousePressEvent(QMouseEvent* event) {
    m_lastMousePos = event->pos();
    
    if (event->button() == Qt::LeftButton) {
        m_leftMousePressed = true;
    } else if (event->button() == Qt::RightButton) {
        m_rightMousePressed = true;
    }
}

void Visualization3DWidget::mouseMoveEvent(QMouseEvent* event) {
    QPoint delta = event->pos() - m_lastMousePos;
    m_lastMousePos = event->pos();
    
    if (m_leftMousePressed) {
        // Orbit camera
        m_camera.yaw += delta.x() * 0.5f;
        m_camera.pitch += delta.y() * 0.5f;
        
        // Clamp pitch
        m_camera.pitch = qBound(-89.0f, m_camera.pitch, 89.0f);
        
        emit cameraChanged();
        update();
    } else if (m_rightMousePressed) {
        // Pan camera
        float panSpeed = m_camera.distance * 0.001f;
        
        QVector3D right = QVector3D::crossProduct(
            m_camera.position() - m_camera.target,
            QVector3D(0, 1, 0)
        ).normalized();
        QVector3D up = QVector3D(0, 1, 0);
        
        m_camera.panOffset += right * (-delta.x() * panSpeed);
        m_camera.panOffset += up * (delta.y() * panSpeed);
        
        emit cameraChanged();
        update();
    }
}

void Visualization3DWidget::mouseReleaseEvent(QMouseEvent* event) {
    if (event->button() == Qt::LeftButton) {
        m_leftMousePressed = false;
    } else if (event->button() == Qt::RightButton) {
        m_rightMousePressed = false;
    }
}

void Visualization3DWidget::wheelEvent(QWheelEvent* event) {
    // Zoom in/out
    float delta = event->angleDelta().y() / 120.0f;
    m_camera.distance *= (1.0f - delta * 0.1f);
    
    // Clamp distance
    m_camera.distance = qBound(m_worldSize * 0.5f, m_camera.distance, m_worldSize * 5.0f);
    
    emit cameraChanged();
    update();
}

void Visualization3DWidget::keyPressEvent(QKeyEvent* event) {
    if (event->key() == Qt::Key_R) {
        // Reset camera
        resetCamera();
    } else if (event->key() == Qt::Key_G) {
        // Toggle grid
        m_showGrid = !m_showGrid;
        update();
    } else if (event->key() == Qt::Key_A) {
        // Toggle axes
        m_showAxes = !m_showAxes;
        update();
    }
    
    QOpenGLWidget::keyPressEvent(event);
}
