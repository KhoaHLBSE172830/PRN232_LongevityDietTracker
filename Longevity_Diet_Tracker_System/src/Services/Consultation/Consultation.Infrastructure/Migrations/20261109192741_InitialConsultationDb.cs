using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Consultation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialConsultationDb : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "nutritionist_profiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "text", nullable: false),
                    Certification = table.Column<string>(type: "text", nullable: false),
                    Specialization = table.Column<string>(type: "text", nullable: false),
                    Bio = table.Column<string>(type: "text", nullable: false),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_nutritionist_profiles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "consultation_sessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    NutritionistId = table.Column<Guid>(type: "uuid", nullable: false),
                    ScheduledAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DurationMinutes = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_consultation_sessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_consultation_sessions_nutritionist_profiles_NutritionistId",
                        column: x => x.NutritionistId,
                        principalTable: "nutritionist_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "advice_notes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ConsultationSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    NutritionistId = table.Column<Guid>(type: "uuid", nullable: false),
                    AdviceSummary = table.Column<string>(type: "text", nullable: false),
                    DietaryRecommendations = table.Column<string>(type: "text", nullable: false),
                    FastingRecommendations = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_advice_notes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_advice_notes_consultation_sessions_ConsultationSessionId",
                        column: x => x.ConsultationSessionId,
                        principalTable: "consultation_sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_advice_notes_ConsultationSessionId",
                table: "advice_notes",
                column: "ConsultationSessionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_consultation_sessions_NutritionistId_ScheduledAtUtc",
                table: "consultation_sessions",
                columns: new[] { "NutritionistId", "ScheduledAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_nutritionist_profiles_UserId",
                table: "nutritionist_profiles",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "advice_notes");

            migrationBuilder.DropTable(
                name: "consultation_sessions");

            migrationBuilder.DropTable(
                name: "nutritionist_profiles");
        }
    }
}
