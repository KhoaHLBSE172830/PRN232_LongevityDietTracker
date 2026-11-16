using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DietFasting.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHabitSleepMindful : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "mindful_minutes",
                table: "habit_logs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "sleep_minutes",
                table: "habit_logs",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "mindful_minutes",
                table: "habit_logs");

            migrationBuilder.DropColumn(
                name: "sleep_minutes",
                table: "habit_logs");
        }
    }
}
