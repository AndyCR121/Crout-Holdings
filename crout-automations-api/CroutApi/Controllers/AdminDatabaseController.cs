using System.Security.Claims;
using CroutApi.DTOs;
using CroutApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/database-management")]
public class AdminDatabaseController(IDatabaseManagementService databaseManagement) : ControllerBase
{
    private bool IsAdmin =>
        string.Equals(
            User.FindFirstValue("is_admin"),
            "true",
            StringComparison.OrdinalIgnoreCase);

    [HttpGet("targets")]
    public async Task<IActionResult> GetTargets(CancellationToken cancellationToken)
    {
        if (!IsAdmin) return Forbid();
        return Ok(await databaseManagement.GetTargetsAsync(cancellationToken));
    }

    [HttpGet("sql-updates/preview")]
    public async Task<IActionResult> GetSqlUpdatePreview([FromQuery] string targetKey, CancellationToken cancellationToken)
    {
        if (!IsAdmin) return Forbid();
        return Ok(await databaseManagement.GetSqlUpdatePreviewAsync(targetKey, cancellationToken));
    }

    [HttpGet("sql-updates/latest")]
    public async Task<IActionResult> GetLatestSqlUpdateResult([FromQuery] string targetKey, CancellationToken cancellationToken)
    {
        if (!IsAdmin) return Forbid();
        var result = await databaseManagement.GetLatestSqlUpdateResultAsync(targetKey, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("sql-updates/run")]
    public async Task<IActionResult> RunSqlUpdate([FromBody] RunSqlUpdateRequestDto request, CancellationToken cancellationToken)
    {
        if (!IsAdmin) return Forbid();
        var result = await databaseManagement.RunSqlUpdateAsync(request, cancellationToken);
        if (!result.Success && string.Equals(result.ErrorMessage, "SQL updater is already running.", StringComparison.Ordinal))
        {
            return Conflict(new { error = result.ErrorMessage });
        }

        return Ok(result);
    }

    [HttpPost("migrations/validate")]
    public async Task<IActionResult> ValidateMigration([FromBody] ValidateDatabaseMigrationRequestDto request, CancellationToken cancellationToken)
    {
        if (!IsAdmin) return Forbid();
        return Ok(await databaseManagement.ValidateMigrationAsync(request, cancellationToken));
    }

    [HttpPost("migrations/start")]
    public async Task<IActionResult> StartMigration([FromBody] StartDatabaseMigrationRequestDto request, CancellationToken cancellationToken)
    {
        if (!IsAdmin) return Forbid();
        var operation = await databaseManagement.StartMigrationAsync(request, cancellationToken);
        if (string.Equals(operation.Status, "Conflict", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(new { error = operation.ErrorMessage, operationId = operation.OperationId });
        }

        return Accepted(operation);
    }

    [HttpGet("migrations/status/{operationId}")]
    public async Task<IActionResult> GetMigrationStatus(string operationId, CancellationToken cancellationToken)
    {
        if (!IsAdmin) return Forbid();
        var operation = await databaseManagement.GetMigrationStatusAsync(operationId, cancellationToken);
        return operation is null ? NotFound() : Ok(operation);
    }
}
