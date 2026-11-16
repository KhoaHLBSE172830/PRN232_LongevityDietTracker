using BuildingBlocks.Common.Repositories;
using Identity.Application.DTOs;
using Identity.Domain.Entities;
using Identity.Domain.Enums;

namespace Identity.Application.Repositories;

public interface IUserRepository : IGenericRepository<User>
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByGoogleIdAsync(string googleId);
    Task<User?> GetWithProfileAsync(Guid userId);
    Task<User?> GetWithRefreshTokensAsync(Guid userId);
    Task<(List<User> Users, int TotalCount)> GetUsersPagedAsync(
        int pageNumber,
        int pageSize,
        string? searchTerm = null,
        UserRole? role = null,
        bool? isActive = null);
    Task<AdminDashboardStatsDto> GetDashboardStatsAsync();
}

