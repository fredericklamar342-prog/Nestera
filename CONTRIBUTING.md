# Contributing to Amana

Thank you for your interest in contributing to Amana! This document outlines our contribution guidelines, code ownership policy, and review requirements.

## Code Ownership & Review Requirements

We maintain a CODEOWNERS file (`.github/CODEOWNERS`) that defines ownership of critical paths in the codebase. This ensures domain expertise is applied to high-impact changes.

### Critical Paths Requiring Review

The following areas require approval from designated code owners before merging:

#### Smart Contracts
- **Path**: `contracts/amana_escrow/**`
- **Reason**: Core escrow logic affecting fund security and dispute resolution
- **Owner**: @KingFRANKHOOD

#### Backend: Authentication & Authorization
- **Path**: `backend/src/auth/**`, `backend/src/common/guards/**`
- **Reason**: Security-critical authentication and access control
- **Owner**: @KingFRANKHOOD

#### Backend: Blockchain Integration
- **Path**: `backend/src/modules/blockchain/**`, `backend/src/modules/transactions/**`
- **Reason**: Contract interaction and transaction integrity
- **Owner**: @KingFRANKHOOD

#### Backend: Trade & Dispute Critical Paths
- **Path**: `backend/src/modules/claims/**`, `backend/src/modules/disputes/**`
- **Reason**: Core business logic for trade lifecycle and dispute resolution
- **Owner**: @KingFRANKHOOD

#### Backend: Observability & Audit
- **Path**: `backend/src/common/interceptors/**`, `backend/src/common/filters/**`
- **Reason**: Request tracing, audit logging, and incident debugging
- **Owner**: @KingFRANKHOOD

#### Database Migrations
- **Path**: `backend/src/migrations/**`
- **Reason**: Schema changes affect all services and data integrity
- **Owner**: @KingFRANKHOOD

#### Frontend: Dashboard & Contract Details
- **Path**: `frontend/app/components/dashboard/**`
- **Reason**: User-facing contract and trade information
- **Owner**: @KingFRANKHOOD

### How Code Ownership Works

1. **Branch Protection**: PRs touching owned paths require approval from the designated code owner
2. **Automatic Checks**: GitHub branch protection rules enforce this requirement
3. **Exceptions**: Code owners can approve exceptions for urgent fixes or emergency patches

## Contribution Workflow

### 1. Create a Feature Branch

```bash
git checkout -b <type>/<issue-number>-<description>
```

**Branch naming conventions**:
- `feat/` - New features
- `fix/` - Bug fixes
- `hardening/` - Security or reliability improvements
- `observability/` - Logging, monitoring, tracing
- `governance/` - Policy, documentation, ownership
- `refactor/` - Code improvements without behavior changes

**Example**:
```bash
git checkout -b hardening/e2e-critical-path-tests
git checkout -b observability/request-correlation-audit-logs
git checkout -b governance/codeowners-required-review
```

### 2. Make Your Changes

- Follow the existing code style and patterns
- Write tests for new functionality
- Update documentation as needed
- Ensure all checks pass locally

### 3. Commit Your Changes

Use clear, descriptive commit messages:

```bash
git commit -m "feat: add E2E tests for critical trade path"
git commit -m "observability: add correlation ID and audit logging"
git commit -m "governance: add CODEOWNERS and review policy"
```

### 4. Push and Create a PR

```bash
git push origin <your-branch>
```

Then create a PR on GitHub with:
- Clear title describing the change
- Description of what changed and why
- Reference to related issues (e.g., `Closes #177`)
- Screenshots or test results if applicable

### 5. Code Review

- Address feedback from code owners
- Ensure all CI checks pass
- Request re-review after making changes

## Testing Requirements

### Unit Tests
- Required for all new services and utilities
- Run: `npm run test`

### E2E Tests
- Required for critical path changes (trade, dispute, auth)
- Run: `npm run test:e2e`

### Integration Tests
- Required for blockchain and database interactions
- Run: `npm run test:integration`

## Commit Message Format

We follow conventional commits for clear history:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Build, dependencies, tooling

**Scopes**:
- `auth`: Authentication module
- `blockchain`: Blockchain integration
- `claims`: Claims module
- `disputes`: Disputes module
- `observability`: Logging and tracing
- `governance`: Code ownership and policy

**Examples**:
```
feat(claims): add E2E tests for critical trade path
observability(audit): add request correlation IDs and structured logs
governance: add CODEOWNERS and required review rules
```

## Incident Tracing with Correlation IDs

When debugging production issues, use correlation IDs to trace requests:

```bash
# Find all logs for a specific request
grep "correlation-id-uuid" logs/*.log

# Trace through database mutations
SELECT * FROM audit_logs WHERE correlation_id = 'uuid' ORDER BY timestamp;

# Check contract events
grep "correlation-id-uuid" contract-events.log
```

See `OBSERVABILITY.md` for detailed runbook.

## Security Considerations

- Never commit secrets or private keys
- Use environment variables for sensitive configuration
- Follow OWASP guidelines for web security
- Report security issues privately to maintainers

## Questions?

- Check existing issues and PRs
- Review the README and documentation
- Ask in discussions or contact maintainers

Thank you for contributing to Amana!
