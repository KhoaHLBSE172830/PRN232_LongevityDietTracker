using System.Linq.Expressions;
using BuildingBlocks.Common.Repositories;
using Identity.Application.DTOs;
using Identity.Application.Repositories;
using Identity.Domain.Entities;
using Identity.Domain.Enums;
using Identity.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Identity.Infrastructure.Repository;

public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    protected readonly IdentityDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public GenericRepository(IdentityDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public async Task<T> CreateAsync(T entity)
    {
        await _dbSet.AddAsync(entity);
        return entity;
    }

    public async Task CreateRangeAsync(IEnumerable<T> entities)
    {
        await _dbSet.AddRangeAsync(entities);
    }

    public async Task<List<T>> ListAsync(params string[] navigationProperties)
    {
        IQueryable<T> query = _dbSet.AsNoTracking();
        foreach (var property in navigationProperties)
        {
            query = query.Include(property);
        }
        return await query.ToListAsync();
    }

    public async Task<T?> FindByIdAsync(Guid id, params string[] navigationProperties)
    {
        IQueryable<T> query = _dbSet;
        foreach (var property in navigationProperties)
        {
            query = query.Include(property);
        }
        return await query.FirstOrDefaultAsync(e => EF.Property<Guid>(e, "Id") == id);
    }

    public async Task<T> FoundOrThrowAsync(Guid id, string message = "Resource not found", params string[] navigationProperties)
    {
        var entity = await FindByIdAsync(id, navigationProperties);
        if (entity == null)
            throw new BuildingBlocks.Common.Exceptions.NotFoundException(message);
        return entity;
    }

    public async Task<List<T>> WhereAsync(Expression<Func<T, bool>> predicate, params string[] navigationProperties)
    {
        IQueryable<T> query = _dbSet.Where(predicate);
        foreach (var property in navigationProperties)
        {
            query = query.Include(property);
        }
        return await query.ToListAsync();
    }

    public async Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, params string[] navigationProperties)
    {
        IQueryable<T> query = _dbSet.Where(predicate);
        foreach (var property in navigationProperties)
        {
            query = query.Include(property);
        }
        return await query.FirstOrDefaultAsync();
    }

    public Task<T> UpdateAsync(T updated)
    {
        _dbSet.Update(updated);
        return Task.FromResult(updated);
    }

    public Task UpdateRangeAsync(IEnumerable<T> entities)
    {
        _dbSet.UpdateRange(entities);
        return Task.CompletedTask;
    }

    public async Task<T> DeleteAsync(Guid id)
    {
        var entity = await FoundOrThrowAsync(id);
        _dbSet.Remove(entity);
        return entity;
    }

    public Task DeleteAsync(T entity)
    {
        _dbSet.Remove(entity);
        return Task.CompletedTask;
    }

    public Task DeleteRangeAsync(IEnumerable<T> entities)
    {
        _dbSet.RemoveRange(entities);
        return Task.CompletedTask;
    }

    public async Task<int> CountAsync(Expression<Func<T, bool>>? filter = null)
    {
        if (filter != null)
            return await _dbSet.CountAsync(filter);
        return await _dbSet.CountAsync();
    }

    public async Task<List<T>> WherePagedAsync(
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        int? page = null,
        int? pageSize = null,
        params string[] navigationProperties)
    {
        IQueryable<T> query = _dbSet;
        if (filter != null) query = query.Where(filter);
        foreach (var property in navigationProperties) query = query.Include(property);
        if (orderBy != null) query = orderBy(query);
        if (page.HasValue && pageSize.HasValue)
            query = query.Skip((page.Value - 1) * pageSize.Value).Take(pageSize.Value);
        return await query.ToListAsync();
    }
}

public class UnitOfWork : IUnitOfWork
{
    private readonly IdentityDbContext _context;
    private IDbContextTransaction? _currentTransaction;

    public UnitOfWork(IdentityDbContext context)
    {
        _context = context;
    }

    public async Task<IAsyncDisposable> BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_currentTransaction != null) return _currentTransaction;
        _currentTransaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        return _currentTransaction;
    }

    public async Task CommitTransactionAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await _context.SaveChangesAsync(cancellationToken);
            if (_currentTransaction != null)
                await _currentTransaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await RollbackTransactionAsync(cancellationToken);
            throw;
        }
        finally
        {
            if (_currentTransaction != null)
            {
                await _currentTransaction.DisposeAsync();
                _currentTransaction = null;
            }
        }
    }

    public async Task RollbackTransactionAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (_currentTransaction != null)
                await _currentTransaction.RollbackAsync(cancellationToken);
        }
        finally
        {
            if (_currentTransaction != null)
            {
                await _currentTransaction.DisposeAsync();
                _currentTransaction = null;
            }
        }
    }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }
}

public class UserRepository : GenericRepository<User>, IUserRepository
{
    public UserRepository(IdentityDbContext context) : base(context) { }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _dbSet.Include(u => u.RefreshTokens)
                           .FirstOrDefaultAsync(u => u.Email == email.ToLowerInvariant());
    }

    public async Task<User?> GetByGoogleIdAsync(string googleId)
    {
        return await _dbSet.Include(u => u.RefreshTokens)
                           .FirstOrDefaultAsync(u => u.GoogleId == googleId);
    }

    public async Task<User?> GetWithProfileAsync(Guid userId)
    {
        return await _dbSet.Include(u => u.Profile)
                           .FirstOrDefaultAsync(u => u.Id == userId);
    }

    public async Task<User?> GetWithRefreshTokensAsync(Guid userId)
    {
        return await _dbSet.Include(u => u.RefreshTokens)
                           .Include(u => u.Profile)
                           .FirstOrDefaultAsync(u => u.Id == userId);
    }

    public async Task<(List<User> Users, int TotalCount)> GetUsersPagedAsync(
        int pageNumber,
        int pageSize,
        string? searchTerm = null,
        UserRole? role = null,
        bool? isActive = null)
    {
        var query = _dbSet.AsNoTracking()
                          .Include(u => u.Profile)
                          .AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(u => u.Email.ToLower().Contains(term) || u.FullName.ToLower().Contains(term));
        }

        if (role.HasValue)
        {
            query = query.Where(u => u.Role == role.Value);
        }

        if (isActive.HasValue)
        {
            query = query.Where(u => u.IsActive == isActive.Value);
        }

        var totalCount = await query.CountAsync();

        var items = await query.OrderByDescending(u => u.CreatedAt)
                               .Skip((pageNumber - 1) * pageSize)
                               .Take(pageSize)
                               .ToListAsync();

        return (items, totalCount);
    }

    public async Task<AdminDashboardStatsDto> GetDashboardStatsAsync()
    {
        var now = DateTime.UtcNow;
        var todayUtc = now.Date;
        var sevenDaysAgo = now.AddDays(-7);
        var thirtyDaysAgo = now.AddDays(-30);

        var totalUsers = await _dbSet.CountAsync();
        var activeUsers = await _dbSet.CountAsync(u => u.IsActive);
        var lockedUsers = totalUsers - activeUsers;
        var emailVerifiedUsers = await _dbSet.CountAsync(u => u.IsEmailVerified);
        var googleLinkedUsers = await _dbSet.CountAsync(u => !string.IsNullOrEmpty(u.GoogleId));

        var regularUsers = await _dbSet.CountAsync(u => u.Role == UserRole.User);
        var nutritionists = await _dbSet.CountAsync(u => u.Role == UserRole.Nutritionist);
        var admins = await _dbSet.CountAsync(u => u.Role == UserRole.Admin);

        var newToday = await _dbSet.CountAsync(u => u.CreatedAt >= todayUtc);
        var newWeek = await _dbSet.CountAsync(u => u.CreatedAt >= sevenDaysAgo);
        var newMonth = await _dbSet.CountAsync(u => u.CreatedAt >= thirtyDaysAgo);

        // Profile statistics
        var profiles = await _context.UserProfiles.AsNoTracking().ToListAsync();
        var completedProfiles = profiles.Count;
        var completionRate = totalUsers > 0 ? Math.Round((double)completedProfiles / totalUsers * 100, 1) : 0.0;

        var caloriesList = profiles.Where(p => p.DailyCalorieTarget.HasValue && p.DailyCalorieTarget.Value > 0)
                                   .Select(p => (double)p.DailyCalorieTarget!.Value)
                                   .ToList();
        double? avgCalories = caloriesList.Count > 0 ? Math.Round(caloriesList.Average(), 1) : null;

        var heightList = profiles.Where(p => p.HeightCm.HasValue && p.HeightCm.Value > 0)
                                 .Select(p => p.HeightCm!.Value)
                                 .ToList();
        double? avgHeight = heightList.Count > 0 ? Math.Round(heightList.Average(), 1) : null;

        var weightList = profiles.Where(p => p.CurrentWeightKg.HasValue && p.CurrentWeightKg.Value > 0)
                                 .Select(p => p.CurrentWeightKg!.Value)
                                 .ToList();
        double? avgWeight = weightList.Count > 0 ? Math.Round(weightList.Average(), 1) : null;

        var dietaryPreferences = profiles
            .Where(p => !string.IsNullOrWhiteSpace(p.DietaryPreference))
            .GroupBy(p => p.DietaryPreference!)
            .ToDictionary(g => g.Key, g => g.Count());

        var fastingTypes = profiles
            .Where(p => !string.IsNullOrWhiteSpace(p.PreferredFastingType))
            .GroupBy(p => p.PreferredFastingType!)
            .ToDictionary(g => g.Key, g => g.Count());

        var waterReminders = profiles.Count(p => p.WaterReminderEnabled);
        var eveningReminders = profiles.Count(p => p.EveningReminderEnabled);

        var activeRefreshTokens = await _context.RefreshTokens.CountAsync(r => !r.IsRevoked && r.ExpiresAtUtc > now);

        return new AdminDashboardStatsDto(
            UserStats: new UserOverviewStatsDto(totalUsers, activeUsers, lockedUsers, emailVerifiedUsers, googleLinkedUsers),
            RoleStats: new RoleBreakdownStatsDto(regularUsers, nutritionists, admins),
            RegistrationTrends: new RegistrationTrendsDto(newToday, newWeek, newMonth),
            LongevityProfileStats: new LongevityProfileStatsDto(
                completedProfiles,
                completionRate,
                avgCalories,
                avgHeight,
                avgWeight,
                dietaryPreferences,
                fastingTypes,
                waterReminders,
                eveningReminders),
            SystemSummary: new SystemHealthSummaryDto(
                now,
                Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
                activeRefreshTokens)
        );
    }
}

