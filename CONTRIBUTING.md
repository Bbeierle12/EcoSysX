# Contributing to EcoSysX

Thank you for your interest in contributing to EcoSysX! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [AI Agent Contributions](#ai-agent-contributions)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:
- Be respectful and considerate
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/EcoSysX.git
   cd EcoSysX
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/Bbeierle12/EcoSysX.git
   ```

## Development Setup

EcoSysX is a multi-language, multi-framework project. Follow these setup guides:

### Frontend (React + Vite)

```bash
npm install
npm run dev
```

### Qt GUI Application

See [qt-gui/DEVELOPMENT_SETUP.md](qt-gui/DEVELOPMENT_SETUP.md) for detailed instructions.

Requirements:
- Qt 6.9.3+
- CMake 3.16+
- C++17 compiler

```bash
cd qt-gui
mkdir build && cd build
cmake ..
cmake --build .
```

### Services

#### Julia Agent Sidecar
```bash
cd services/agents-sidecar
julia --project=. -e 'using Pkg; Pkg.instantiate()'
```

#### Python Services
```bash
cd services/llama-service
pip install -r requirements.txt
```

## Project Structure

```
EcoSysX/
├── src/                    # React frontend source
├── qt-gui/                 # Qt C++ GUI application
├── services/               # Backend services
│   ├── agents-sidecar/    # Julia agent system
│   ├── engine-sidecar/    # Core engine service
│   ├── llama-service/     # LLM integration
│   ├── mason-sidecar/     # Agent coordination
│   └── mesa-sidecar/      # Mesa ABM integration
├── packages/              # Shared packages
│   └── genx-engine/       # Core engine library
├── docs/                  # General documentation
└── examples/              # Usage examples
```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `bugfix/` - Bug fixes
- `hotfix/` - Critical production fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates

Example: `feature/add-agent-visualization`

### Commit Messages

Follow conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

Example:
```
feat(qt-gui): add real-time performance monitoring

Implement GPU metrics visualization panel with:
- Frame rate monitoring
- Memory usage tracking
- Agent count display

Closes #123
```

### Keeping Your Fork Updated

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

## Coding Standards

### JavaScript/TypeScript

- Use ES6+ features
- Follow ESLint configuration
- Use async/await over callbacks
- Add JSDoc comments for public APIs

### C++ (Qt GUI)

- Follow [qt-gui/CODING_STANDARDS.md](qt-gui/CODING_STANDARDS.md)
- Use C++17 features
- Follow Qt naming conventions
- Use smart pointers (no raw `new`/`delete`)
- Document public APIs with Doxygen comments

### Julia

- Follow Julia style guide
- Use descriptive variable names
- Add docstrings to functions
- Keep functions focused and small

### Python

- Follow PEP 8
- Use type hints
- Add docstrings (Google style)
- Use virtual environments

## Testing

### Test Requirements

All contributions should include appropriate tests:

1. **Unit Tests**: Test individual functions/classes
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Test complete workflows

### Running Tests

#### Frontend
```bash
npm test
npm run test:coverage
```

#### Qt GUI
```bash
cd qt-gui/build
ctest
```

#### Julia Services
```bash
cd services/agents-sidecar
julia --project=. test/runtests.jl
```

### Test Policy

- All new features must include tests
- Bug fixes should include regression tests
- Aim for >80% code coverage
- Tests must pass before PR merge

## Submitting Changes

### Before Submitting

1. **Run tests**: Ensure all tests pass
2. **Check formatting**: Run linters and formatters
3. **Update documentation**: Add/update relevant docs
4. **Test locally**: Verify changes work as expected
5. **Review your changes**: Self-review the diff

### Pull Request Process

1. **Create a PR** against the `main` branch
2. **Fill out the PR template** completely
3. **Link related issues** (e.g., "Closes #123")
4. **Request review** from maintainers
5. **Address feedback** promptly
6. **Keep PR focused**: One feature/fix per PR

### PR Checklist

- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] Code follows style guidelines
- [ ] Commit messages follow conventions
- [ ] No merge conflicts
- [ ] PR description is clear and complete

## AI Agent Contributions

If you're an AI agent or using AI-assisted development tools, please see [AGENTS.md](AGENTS.md) for specific guidelines on:

- Coding conventions
- Module scope and boundaries
- Test requirements and patterns
- Documentation standards
- Integration protocols

## Getting Help

- **Documentation**: Check [DOCS_INDEX.md](DOCS_INDEX.md) for all docs
- **Issues**: Search existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions
- **Qt GUI**: See [qt-gui/START_HERE.md](qt-gui/START_HERE.md)

## License

By contributing to EcoSysX, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing to EcoSysX! 🌱
