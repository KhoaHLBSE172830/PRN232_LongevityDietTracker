using BuildingBlocks.Common.Repositories;
using Identity.Domain.Entities;

namespace Identity.Application.Repositories;

public interface IUserRepository : IGenericRepository<User>
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByGoogleIdAsync(string googleId);
    Task<User?> GetWithProfileAsync(Guid userId);
}

