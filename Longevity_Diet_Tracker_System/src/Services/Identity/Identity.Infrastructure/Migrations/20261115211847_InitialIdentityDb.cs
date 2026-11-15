using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialIdentityDb : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: true),
                    full_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    role = table.Column<int>(type: "integer", nullable: false),
                    google_id = table.Column<string>(type: "text", nullable: true),
                    is_email_verified = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "refresh_tokens",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token = table.Column<string>(type: "text", nullable: false),
                    jwt_id = table.Column<string>(type: "text", nullable: true),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_revoked = table.Column<bool>(type: "boolean", nullable: false),
                    replaced_by_token = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_refresh_tokens", x => x.id);
                    table.ForeignKey(
                        name: "fk_refresh_tokens_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_profiles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date_of_birth = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    gender = table.Column<string>(type: "text", nullable: true),
                    height_cm = table.Column<double>(type: "double precision", nullable: true),
                    current_weight_kg = table.Column<double>(type: "double precision", nullable: true),
                    target_weight_kg = table.Column<double>(type: "double precision", nullable: true),
                    dietary_preference = table.Column<string>(type: "text", nullable: true),
                    health_goals = table.Column<string>(type: "text", nullable: true),
                    daily_calorie_target = table.Column<int>(type: "integer", nullable: true),
                    protein_percent = table.Column<int>(type: "integer", nullable: true),
                    carbs_percent = table.Column<int>(type: "integer", nullable: true),
                    fat_percent = table.Column<int>(type: "integer", nullable: true),
                    preferred_fasting_type = table.Column<string>(type: "text", nullable: true),
                    water_reminder_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    evening_reminder_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_profiles", x => x.id);
                    table.ForeignKey(
                        name: "fk_user_profiles_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_refresh_tokens_token",
                table: "refresh_tokens",
                column: "token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_refresh_tokens_user_id",
                table: "refresh_tokens",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_profiles_user_id",
                table: "user_profiles",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_users_email",
                table: "users",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "refresh_tokens");

            migrationBuilder.DropTable(
                name: "user_profiles");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
