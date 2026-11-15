using Consultation.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Consultation.Infrastructure.Database;

public static class ConsultationDbSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ConsultationDbContext>();
        var logger = scope.ServiceProvider.GetService<ILogger<ConsultationDbContext>>();

        try
        {
            if (!await context.Nutritionists.AnyAsync())
            {
                var nutritionists = new List<NutritionistProfile>
                {
                    new()
                    {
                        Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                        UserId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                        FullName = "TS. BS Đặng Minh Tuấn",
                        Certification = "Board Certified in Longevity & Anti-Aging Medicine (ABAARM)",
                        Specialization = "Dinh Dưỡng Vùng Xanh & Tối Ưu Hóa Trao Đổi Chất",
                        Bio = "15 năm kinh nghiệm nghiên cứu mô hình sống thọ Okinawa và Loma Linda. Cố vấn chế độ ăn thực vật giàu đạm đậu và kiểm soát chỉ số no 80% (Hara Hachi Bu).",
                        IsVerified = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                        UserId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                        FullName = "ThS. BS Lê Thị Hoàng Oanh",
                        Certification = "Chuyên gia Dinh Dưỡng Lâm Sàng & Fasting Mimicking Diet",
                        Specialization = "Liệu Trình Nhịn Ăn Gián Đoạn (IF) & FMD 5 Ngày",
                        Bio = "Chuyên gia đồng hành cùng hàng ngàn khách hàng hoàn thành chu kỳ thanh lọc tái tạo tế bào (Autophagy) và tái thiết lập độ nhạy insulin.",
                        IsVerified = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                        UserId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc"),
                        FullName = "BS. CKI Trần Thanh Tùng",
                        Certification = "Y Học Thể Thao & Dinh Dưỡng Trường Thọ",
                        Specialization = "Cân Bằng Đa Lượng (Macros) & Khối Lượng Cơ Lão Hóa (Sarcopenia)",
                        Bio = "Tập trung xây dựng thực đơn cá nhân hóa kết hợp đạm thực vật sạch và bảo toàn khối cơ nạc khi thực hiện chu kỳ nhịn ăn.",
                        IsVerified = true,
                        CreatedAt = DateTime.UtcNow
                    }
                };

                await context.Nutritionists.AddRangeAsync(nutritionists);
                await context.SaveChangesAsync();
                logger?.LogInformation("[ConsultationDbSeeder] Seeded 3 verified Nutritionist profiles successfully.");
            }
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "[ConsultationDbSeeder] Error during seeding: {Message}", ex.Message);
        }
    }
}

