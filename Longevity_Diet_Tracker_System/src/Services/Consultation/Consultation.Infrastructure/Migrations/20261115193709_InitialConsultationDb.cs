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
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    full_name = table.Column<string>(type: "text", nullable: false),
                    certification = table.Column<string>(type: "text", nullable: false),
                    specialization = table.Column<string>(type: "text", nullable: false),
                    bio = table.Column<string>(type: "text", nullable: false),
                    is_verified = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_nutritionist_profiles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "consultation_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    nutritionist_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scheduled_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    duration_minutes = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_consultation_sessions", x => x.id);
                    table.ForeignKey(
                        name: "fk_consultation_sessions_nutritionists_nutritionist_id",
                        column: x => x.nutritionist_id,
                        principalTable: "nutritionist_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "advice_notes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    consultation_session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    nutritionist_id = table.Column<Guid>(type: "uuid", nullable: false),
                    advice_summary = table.Column<string>(type: "text", nullable: false),
                    dietary_recommendations = table.Column<string>(type: "text", nullable: false),
                    fasting_recommendations = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_advice_notes", x => x.id);
                    table.ForeignKey(
                        name: "fk_advice_notes_sessions_consultation_session_id",
                        column: x => x.consultation_session_id,
                        principalTable: "consultation_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_advice_notes_consultation_session_id",
                table: "advice_notes",
                column: "consultation_session_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_consultation_sessions_nutritionist_id_scheduled_at_utc",
                table: "consultation_sessions",
                columns: new[] { "nutritionist_id", "scheduled_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_nutritionist_profiles_user_id",
                table: "nutritionist_profiles",
                column: "user_id",
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
