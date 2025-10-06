#include <QApplication>
#include <QMainWindow>
#include <QMenuBar>
#include <QMenu>
#include <QAction>
#include <QMessageBox>

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    
    // Set application metadata
    app.setApplicationName("EcoSysX GUI");
    app.setApplicationVersion("0.1.0");
    app.setOrganizationName("EcoSysX");
    
    // Create main window
    QMainWindow mainWindow;
    mainWindow.setWindowTitle("EcoSysX - Ecosystem Simulator");
    mainWindow.resize(1280, 800);
    
    // Create menu bar
    QMenuBar* menuBar = mainWindow.menuBar();
    
    // File menu
    QMenu* fileMenu = menuBar->addMenu("&File");
    
    QAction* exitAction = fileMenu->addAction("E&xit");
    exitAction->setShortcut(QKeySequence::Quit);
    QObject::connect(exitAction, &QAction::triggered, &app, &QApplication::quit);
    
    // Help menu
    QMenu* helpMenu = menuBar->addMenu("&Help");
    
    QAction* aboutAction = helpMenu->addAction("&About");
    QObject::connect(aboutAction, &QAction::triggered, [&mainWindow]() {
        QMessageBox::about(&mainWindow, "About EcoSysX GUI",
            "EcoSysX GUI v0.1.0\n\n"
            "Native desktop interface for the EcoSysX ecosystem simulator.\n\n"
            "Phase 1: Project Setup Complete");
    });
    
    // Show the window
    mainWindow.show();
    
    return app.exec();
}
