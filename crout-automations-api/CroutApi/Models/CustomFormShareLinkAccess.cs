namespace CroutApi.Models;

public static class CustomFormShareLinkAccessActions
{
    public const string View = "view";
    public const string Submit = "submit";
}

public class CustomFormShareLinkAccess
{
    public int AccessId { get; set; }
    public int ShareLinkId { get; set; }
    public DateTime AccessedAt { get; set; }
    public string Action { get; set; } = CustomFormShareLinkAccessActions.View;
    public int? ServiceTriggerExecutionId { get; set; }
}
