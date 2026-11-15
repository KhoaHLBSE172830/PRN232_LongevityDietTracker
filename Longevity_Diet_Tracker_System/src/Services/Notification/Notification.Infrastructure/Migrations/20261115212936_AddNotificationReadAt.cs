using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Notification.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationReadAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "read_at_utc",
                table: "notification_logs",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "read_at_utc",
                table: "notification_logs");
        }
    }
}
