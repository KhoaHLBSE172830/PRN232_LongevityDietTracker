using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DietFasting.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFastingPause : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "paused_at_utc",
                table: "fasting_sessions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "total_paused_seconds",
                table: "fasting_sessions",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "paused_at_utc",
                table: "fasting_sessions");

            migrationBuilder.DropColumn(
                name: "total_paused_seconds",
                table: "fasting_sessions");
        }
    }
}
