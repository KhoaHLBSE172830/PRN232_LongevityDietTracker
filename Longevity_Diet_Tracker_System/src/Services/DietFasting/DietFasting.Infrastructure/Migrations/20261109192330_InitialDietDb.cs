using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DietFasting.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialDietDb : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "fasting_sessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FastingType = table.Column<int>(type: "integer", nullable: false),
                    StartTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TargetEndTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActualEndTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    MoodNotes = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fasting_sessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "fmd_cycles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CycleNumber = table.Column<int>(type: "integer", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CurrentDay = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    TargetCaloriesDay1 = table.Column<double>(type: "double precision", nullable: false),
                    TargetCaloriesDays2To5 = table.Column<double>(type: "double precision", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fmd_cycles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "meal_logs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    MealType = table.Column<int>(type: "integer", nullable: false),
                    LoggedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalCalories = table.Column<double>(type: "double precision", nullable: false),
                    TotalProteinGrams = table.Column<double>(type: "double precision", nullable: false),
                    TotalCarbsGrams = table.Column<double>(type: "double precision", nullable: false),
                    TotalFatGrams = table.Column<double>(type: "double precision", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_meal_logs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "meal_templates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    AssociatedFastingType = table.Column<int>(type: "integer", nullable: false),
                    FmdDayNumber = table.Column<int>(type: "integer", nullable: true),
                    TotalCalories = table.Column<double>(type: "double precision", nullable: false),
                    IsAdminTemplate = table.Column<bool>(type: "boolean", nullable: false),
                    RecipeContentJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_meal_templates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "meal_food_items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MealLogId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExternalFoodId = table.Column<string>(type: "text", nullable: false),
                    FoodName = table.Column<string>(type: "text", nullable: false),
                    ServingSize = table.Column<double>(type: "double precision", nullable: false),
                    ServingUnit = table.Column<string>(type: "text", nullable: false),
                    Calories = table.Column<double>(type: "double precision", nullable: false),
                    ProteinGrams = table.Column<double>(type: "double precision", nullable: false),
                    CarbsGrams = table.Column<double>(type: "double precision", nullable: false),
                    FatGrams = table.Column<double>(type: "double precision", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_meal_food_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_meal_food_items_meal_logs_MealLogId",
                        column: x => x.MealLogId,
                        principalTable: "meal_logs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_fasting_sessions_UserId_Status",
                table: "fasting_sessions",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_fmd_cycles_UserId_Status",
                table: "fmd_cycles",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_meal_food_items_MealLogId",
                table: "meal_food_items",
                column: "MealLogId");

            migrationBuilder.CreateIndex(
                name: "IX_meal_logs_UserId_LoggedAt",
                table: "meal_logs",
                columns: new[] { "UserId", "LoggedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "fasting_sessions");

            migrationBuilder.DropTable(
                name: "fmd_cycles");

            migrationBuilder.DropTable(
                name: "meal_food_items");

            migrationBuilder.DropTable(
                name: "meal_templates");

            migrationBuilder.DropTable(
                name: "meal_logs");
        }
    }
}
