using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OnlyGlamps.Api.Data;
using OnlyGlamps.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "OnlyGlamps API", Version = "v1" });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddSingleton<AuthService>();
builder.Services.AddSingleton<StorageService>();
builder.Services.AddScoped<ImportService>();
builder.Services.AddHttpClient<GlampingsRfCrawler>();

var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "onlyglamps-dev-jwt-secret-key-min-32-chars!!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "onlyglamps",
            ValidAudience = "onlyglamps",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });
builder.Services.AddAuthorization();

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
    ?? ["http://localhost:3000"];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Auto-create DB and seed
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();

    // Idempotent schema upgrade for dynamic object-type fields (works on existing DBs,
    // where EnsureCreated skips creation because the schema already exists).
    await db.Database.ExecuteSqlRawAsync(@"
        ALTER TABLE ""ObjectTypes""
            ADD COLUMN IF NOT EXISTS ""DisabledBuiltinFields"" TEXT NULL;

        CREATE TABLE IF NOT EXISTS ""ObjectTypeFields"" (
            ""Id"" SERIAL PRIMARY KEY,
            ""ObjectTypeId"" INTEGER NOT NULL REFERENCES ""ObjectTypes""(""Id"") ON DELETE CASCADE,
            ""Key"" TEXT NOT NULL,
            ""Label"" TEXT NOT NULL,
            ""FieldType"" TEXT NOT NULL DEFAULT 'number',
            ""Unit"" TEXT NULL,
            ""Placeholder"" TEXT NULL,
            ""HelpText"" TEXT NULL,
            ""Options"" TEXT NULL,
            ""MinValue"" NUMERIC(14,4) NULL,
            ""MaxValue"" NUMERIC(14,4) NULL,
            ""IsRequired"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""SortOrder"" INTEGER NOT NULL DEFAULT 0,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_ObjectTypeFields_ObjectTypeId_Key""
            ON ""ObjectTypeFields"" (""ObjectTypeId"", ""Key"");

        CREATE TABLE IF NOT EXISTS ""ObjectFieldValues"" (
            ""Id"" SERIAL PRIMARY KEY,
            ""ObjectId"" INTEGER NOT NULL REFERENCES ""GlampingObjects""(""Id"") ON DELETE CASCADE,
            ""FieldId"" INTEGER NOT NULL REFERENCES ""ObjectTypeFields""(""Id"") ON DELETE CASCADE,
            ""ValueText"" TEXT NULL,
            ""ValueNumber"" NUMERIC(14,4) NULL,
            ""ValueBool"" BOOLEAN NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_ObjectFieldValues_ObjectId_FieldId""
            ON ""ObjectFieldValues"" (""ObjectId"", ""FieldId"");
    ");

    await DataSeeder.SeedAsync(db);
}

app.Run();
