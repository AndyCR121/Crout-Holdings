using System.Text.Json.Nodes;
using CroutApi.DTOs;
using CroutApi.Models;
using CroutApi.Services;
using Xunit;

namespace CroutApi.Tests;

public class N8nTemplateWorkflowServiceTests
{
    [Fact]
    public async Task ResolveAndClone_UsesOnlyTheMatchingInactiveTemplate()
    {
        var template = Template("template-1", "Quote System", active: false);
        var client = new StubWorkflowClient([template]);
        var service = new N8nTemplateWorkflowService(client);
        var context = Context();

        var resolved = await service.ResolveAsync(new Integration(), context, CancellationToken.None);
        var clone = service.Clone(resolved, new Integration(), context);

        Assert.Equal("template-1", resolved.WorkflowId);
        Assert.Equal("s:quote-system", resolved.ServiceTag);
        Assert.False(clone.Active);
        Assert.Equal("Wooden Weld | Quote System", clone.Name);
        Assert.DoesNotContain(clone.Tags, tag => tag?.ToString() == "__template");
        Assert.Contains(clone.Tags, tag => tag?.ToString() == "us:714");
        Assert.Null(clone.Id);
        var notes = Assert.Single(clone.Nodes.OfType<JsonObject>(), node => node["name"]?.ToString() == "CROUT_SERVICE_NOTES");
        Assert.Contains("## Confirmed triggers", notes["parameters"]?["content"]?.ToString());
        Assert.DoesNotContain("super-secret", notes["parameters"]?["content"]?.ToString());
    }

    [Fact]
    public async Task ResolveAsync_RejectsDuplicateTemplates()
    {
        var client = new StubWorkflowClient([Template("one", "Quote System", false), Template("two", "Quote System", false)]);
        var service = new N8nTemplateWorkflowService(client);

        await Assert.ThrowsAsync<ArgumentException>(() => service.ResolveAsync(new Integration(), Context(), CancellationToken.None));
    }

    private static UserServiceIntegrationContextDto Context() => new()
    {
        UserServiceId = 714,
        CompanyId = 3,
        CompanyName = "Wooden Weld",
        ServiceName = "Quote System",
        AssignedDeveloperName = "Dev Example",
        Config = "{\"trigger\":[\"Website Form\"],\"action\":[\"Create Quote\"],\"output\":[\"Email\"],\"developerNotes\":\"Review email wording\",\"apiKey\":\"super-secret\"}"
    };

    private static N8nWorkflowDocument Template(string id, string service, bool active) => new()
    {
        Id = id,
        Name = service,
        Active = active,
        Tags = ["__template", N8nTemplateWorkflowService.NormalizeServiceTag(service)],
        Nodes =
        [
            new JsonObject
            {
                ["id"] = "notes-id",
                ["name"] = "CROUT_SERVICE_NOTES",
                ["type"] = "n8n-nodes-base.stickyNote",
                ["parameters"] = new JsonObject()
            }
        ]
    };

    private sealed class StubWorkflowClient(IReadOnlyList<N8nWorkflowDocument> workflows) : IN8nWorkflowClient
    {
        public Task<IReadOnlyList<N8nWorkflowDocument>> SearchWorkflowsAsync(CancellationToken cancellationToken = default) => Task.FromResult(workflows);
        public Task<N8nWorkflowDocument?> GetWorkflowAsync(string workflowId, CancellationToken cancellationToken = default) => Task.FromResult(workflows.SingleOrDefault(workflow => workflow.Id == workflowId));
        public Task<N8nWorkflowDocument> CreateWorkflowAsync(string name, N8nWorkflowDocument workflow, CancellationToken cancellationToken = default) => Task.FromResult(workflow);
        public Task<N8nWorkflowDocument> UpdateWorkflowAsync(string workflowId, N8nWorkflowDocument workflow, CancellationToken cancellationToken = default) => Task.FromResult(workflow);
        public Task UpdateWorkflowTagsAsync(string workflowId, JsonArray tags, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task ActivateWorkflowAsync(string workflowId, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task DeactivateWorkflowAsync(string workflowId, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
