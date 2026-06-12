using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;

namespace AiSalesCoach.Api.Tests.Infrastructure;

// Kræver Docker at køre. Bruges af alle integration tests via IClassFixture<AiSalesCoachWebApplicationFactory>.
// Opdatér ConfigureWebHost når AiSalesCoachDbContext er tilføjet i Infrastructure.
public class AiSalesCoachWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    public string ConnectionString => _postgres.GetConnectionString();

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // TODO: Erstat DbContext-registrering med test-databasen når Infrastructure er tilføjet:
            // var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AiSalesCoachDbContext>));
            // if (descriptor != null) services.Remove(descriptor);
            // services.AddDbContext<AiSalesCoachDbContext>(o => o.UseNpgsql(ConnectionString));
        });
    }

    public new async Task DisposeAsync()
    {
        await _postgres.DisposeAsync();
    }
}
