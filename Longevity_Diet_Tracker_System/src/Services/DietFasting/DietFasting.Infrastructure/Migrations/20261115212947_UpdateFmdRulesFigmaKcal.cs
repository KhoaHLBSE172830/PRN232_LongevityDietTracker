using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DietFasting.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateFmdRulesFigmaKcal : Migration
    {
        /// <inheritdoc />
                protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Đưa định mức kcal FMD về theo thiết kế (1100/780/760/760/780). Chỉ đổi dòng còn giữ giá trị mặc định cũ (725),
            // không đè lên giá trị Admin đã tự chỉnh.
            foreach (var (day, kcal) in new[] { (2, 780), (3, 760), (4, 760), (5, 780) })
            {
                migrationBuilder.Sql($"UPDATE fmd_rules SET max_calories = {kcal}, description = REPLACE(description, '(725 kcal)', '({kcal} kcal)') WHERE day_number = {day} AND max_calories = 725;");
            }
        }

        /// <inheritdoc />
                protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var (day, kcal) in new[] { (2, 780), (3, 760), (4, 760), (5, 780) })
            {
                migrationBuilder.Sql($"UPDATE fmd_rules SET max_calories = 725, description = REPLACE(description, '({kcal} kcal)', '(725 kcal)') WHERE day_number = {day} AND max_calories = {kcal};");
            }
        }
    }
}
