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
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    fasting_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    start_time_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    target_end_time_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actual_end_time_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    mood_notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    notification_email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_fasting_sessions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "fmd_cycles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    cycle_number = table.Column<int>(type: "integer", nullable: false),
                    start_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    end_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    current_day = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    target_calories_day1 = table.Column<double>(type: "double precision", nullable: false),
                    target_calories_days2to5 = table.Column<double>(type: "double precision", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_fmd_cycles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "fmd_rules",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    day_number = table.Column<int>(type: "integer", nullable: false),
                    max_calories = table.Column<double>(type: "double precision", nullable: false),
                    target_protein_percent = table.Column<double>(type: "double precision", nullable: false),
                    target_fat_percent = table.Column<double>(type: "double precision", nullable: false),
                    target_carb_percent = table.Column<double>(type: "double precision", nullable: false),
                    description = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_fmd_rules", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "meal_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    meal_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    logged_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    total_calories = table.Column<double>(type: "double precision", nullable: false),
                    total_protein_grams = table.Column<double>(type: "double precision", nullable: false),
                    total_carbs_grams = table.Column<double>(type: "double precision", nullable: false),
                    total_fat_grams = table.Column<double>(type: "double precision", nullable: false),
                    total_fiber_grams = table.Column<double>(type: "double precision", nullable: false),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_hara_hachi_bu_compliant = table.Column<bool>(type: "boolean", nullable: false),
                    satiety_percentage = table.Column<int>(type: "integer", nullable: false),
                    exceeded_threshold = table.Column<bool>(type: "boolean", nullable: false),
                    threshold_violation_notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_meal_logs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "meal_templates",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    associated_fasting_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    fmd_day_number = table.Column<int>(type: "integer", nullable: true),
                    total_calories = table.Column<double>(type: "double precision", nullable: false),
                    total_protein_grams = table.Column<double>(type: "double precision", nullable: false),
                    total_carbs_grams = table.Column<double>(type: "double precision", nullable: false),
                    total_fat_grams = table.Column<double>(type: "double precision", nullable: false),
                    total_fiber_grams = table.Column<double>(type: "double precision", nullable: false),
                    is_plant_slant_compliant = table.Column<bool>(type: "boolean", nullable: false),
                    is_hara_hachi_bu_optimized = table.Column<bool>(type: "boolean", nullable: false),
                    is_admin_template = table.Column<bool>(type: "boolean", nullable: false),
                    recipe_content_json = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_meal_templates", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "meal_food_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    meal_log_id = table.Column<Guid>(type: "uuid", nullable: false),
                    external_food_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    food_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    serving_size = table.Column<double>(type: "double precision", nullable: false),
                    serving_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    calories = table.Column<double>(type: "double precision", nullable: false),
                    protein_grams = table.Column<double>(type: "double precision", nullable: false),
                    carbs_grams = table.Column<double>(type: "double precision", nullable: false),
                    fat_grams = table.Column<double>(type: "double precision", nullable: false),
                    fiber_grams = table.Column<double>(type: "double precision", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_meal_food_items", x => x.id);
                    table.ForeignKey(
                        name: "fk_meal_food_items_meal_logs_meal_log_id",
                        column: x => x.meal_log_id,
                        principalTable: "meal_logs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_fasting_sessions_user_id_status",
                table: "fasting_sessions",
                columns: new[] { "user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ux_fasting_sessions_user_active",
                table: "fasting_sessions",
                column: "user_id",
                unique: true,
                filter: "status = 'InProgress'");

            migrationBuilder.CreateIndex(
                name: "ix_fmd_cycles_user_id_status",
                table: "fmd_cycles",
                columns: new[] { "user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_fmd_rules_day_number",
                table: "fmd_rules",
                column: "day_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_meal_food_items_meal_log_id",
                table: "meal_food_items",
                column: "meal_log_id");

            migrationBuilder.CreateIndex(
                name: "ix_meal_logs_user_id_logged_at",
                table: "meal_logs",
                columns: new[] { "user_id", "logged_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "fasting_sessions");

            migrationBuilder.DropTable(
                name: "fmd_cycles");

            migrationBuilder.DropTable(
                name: "fmd_rules");

            migrationBuilder.DropTable(
                name: "meal_food_items");

            migrationBuilder.DropTable(
                name: "meal_templates");

            migrationBuilder.DropTable(
                name: "meal_logs");
        }
    }
}
