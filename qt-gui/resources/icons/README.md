# EcoSysX Qt GUI Resources

## Icons

This directory contains icons and graphics for the application.

### Required Icons (To Be Added)

- `app.png` - Application icon (256x256)
- `app.ico` - Windows application icon
- `start.svg` - Start simulation action
- `stop.svg` - Stop simulation action
- `step.svg` - Step simulation action
- `pause.svg` - Pause simulation action
- `config.svg` - Configuration panel icon
- `metrics.svg` - Metrics panel icon
- `world.svg` - World view icon
- `log.svg` - Event log icon

### Icon Guidelines

- Use SVG format for scalability
- Provide PNG fallbacks at common sizes (16, 24, 32, 48, 64, 128, 256)
- Follow consistent style and color palette
- Ensure icons are visible on light and dark backgrounds

### Placeholder Icons

For Phase 1, standard Qt icons can be used via:
```cpp
QIcon icon = style()->standardIcon(QStyle::SP_MediaPlay);
```

Custom icons will be added in later phases.
