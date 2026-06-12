var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithDataVolume()
    .WithPgAdmin();

builder.AddProject<Projects.AiSalesCoach_Api>("api")
    .WithReference(postgres)
    .WaitFor(postgres);

builder.Build().Run();
