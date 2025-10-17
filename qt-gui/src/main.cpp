#include <QApplication>
#include "ui/MainWindow.h"

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    
    // Set application metadata
    app.setApplicationName("EcoSysX GUI");
    app.setApplicationVersion("0.1.0");
    app.setOrganizationName("EcoSysX");
    
    // Set application icon
    app.setWindowIcon(QIcon(":/icons/icons/app.svg"));
    
    // Create and show main window
    MainWindow window;
    window.show();
    
    return app.exec();
}
