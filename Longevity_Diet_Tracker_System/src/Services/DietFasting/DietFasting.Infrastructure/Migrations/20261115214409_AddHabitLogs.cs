using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DietFasting.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHabitLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "habit_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    log_date = table.Column<DateOnly>(type: "date", nullable: false),
                    water_ml = table.Column<int>(type: "integer", nullable: false),
                    movement_minutes = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_habit_logs", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_habit_logs_user_id_log_date",
                table: "habit_logs",
                columns: new[] { "user_id", "log_date" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "habit_logs");
        }
    }
}
