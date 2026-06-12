var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddOpenApi();
builder.Services.AddAuthentication().AddJwtBearer();
builder.Services.AddAuthorization();

var app = builder.Build();

app.MapDefaultEndpoints();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

// Endpoint groups tilføjes her efterhånden som features bygges:
// app.MapGroup("/api/auth").MapAuthEndpoints();
// app.MapGroup("/api/sessions").RequireAuthorization().MapSessionEndpoints();
// app.MapGroup("/api/coaching").RequireAuthorization().MapCoachingEndpoints();

app.Run();

public partial class Program { } // Required for WebApplicationFactory in integration tests
