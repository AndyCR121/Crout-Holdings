# Reusable Notes

No task history has been captured in this pack yet.

## Entry template
```md
## YYYY-MM-DD — Short title
- Evidence/source: `path/to/file` and relevant symbol/command.
- Affected paths: `...`
- Confirmed behavior/decision: ...
- Constraint/gotcha: ...
- Validation: command/result or why not run.
- Follow-up: ...
```

## Seeded constraints
- Scope is deliberately centered on `crout-automations/` and `crout-automations-api/CroutApi/`.
- Do not infer API endpoints or database schema from names; verify from controller/service/repository code.
- Treat authentication, roles, CORS, encryption/HMAC, and Paystack flows as high-risk changes.
