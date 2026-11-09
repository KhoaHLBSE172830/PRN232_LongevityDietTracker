using System.Linq.Expressions;
using BuildingBlocks.Common.Repositories;
using DietFasting.Application.Repositories;
using DietFasting.Domain.Entities;
using DietFasting.Domain.Enums;
using DietFasting.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace DietFasting.Infrastructure.Repository;

public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    protected readonly DietDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public GenericRepository(DietDbContext context)
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
        foreach (var property in navigationProperties) query = query.Include(property);
        return await query.ToListAsync();
    }

    public async Task<T?> FindByIdAsync(Guid id, params string[] navigationProperties)
    {
        IQueryable<T> query = _dbSet;
        foreach (var property in navigationProperties) query = query.Include(property);
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
        foreach (var property in navigationProperties) query = query.Include(property);
        return await query.ToListAsync();
    }

    public async Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, params string[] navigationProperties)
    {
        IQueryable<T> query = _dbSet.Where(predicate);
        foreach (var property in navigationProperties) query = query.Include(property);
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
        if (filter != null) return await _dbSet.CountAsync(filter);
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
    private readonly DietDbContext _context;
    private IDbContextTransaction? _currentTransaction;

    public UnitOfWork(DietDbContext context)
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

public class MealLogRepository : GenericRepository<MealLog>, IMealLogRepository
{
    public MealLogRepository(DietDbContext context) : base(context) { }

    public async Task<List<MealLog>> GetUserMealsByDateAsync(Guid userId, DateTime date)
    {
        var start = date.Date;
        var end = start.AddDays(1);
        return await _dbSet.Include(m => m.FoodItems)
                           .Where(m => m.UserId == userId && m.LoggedAt >= start && m.LoggedAt < end)
                           .OrderBy(m => m.LoggedAt)
                           .ToListAsync();
    }

    public async Task<double> GetUserTotalCaloriesForDateAsync(Guid userId, DateTime date)
    {
        var start = date.Date;
        var end = start.AddDays(1);
        return await _dbSet.Where(m => m.UserId == userId && m.LoggedAt >= start && m.LoggedAt < end)
                           .SumAsync(m => m.TotalCalories);
    }

    public async Task<MealLog?> GetWithItemsAsync(Guid mealLogId)
    {
        return await _dbSet.Include(m => m.FoodItems)
                           .FirstOrDefaultAsync(m => m.Id == mealLogId);
    }
}

public class FastingSessionRepository : GenericRepository<FastingSession>, IFastingSessionRepository
{
    public FastingSessionRepository(DietDbContext context) : base(context) { }

    public async Task<FastingSession?> GetActiveSessionAsync(Guid userId)
    {
        return await _dbSet.FirstOrDefaultAsync(s => s.UserId == userId && s.Status == FastingStatus.InProgress);
    }

    public async Task<List<FastingSession>> GetCompletedSessionsAsync(Guid userId)
    {
        return await _dbSet.Where(s => s.UserId == userId && s.Status == FastingStatus.Completed)
                           .OrderByDescending(s => s.StartTimeUtc)
                           .ToListAsync();
    }
}

public class FmdCycleRepository : GenericRepository<FmdCycle>, IFmdCycleRepository
{
    public FmdCycleRepository(DietDbContext context) : base(context) { }

    public async Task<FmdCycle?> GetActiveCycleAsync(Guid userId)
    {
        return await _dbSet.FirstOrDefaultAsync(c => c.UserId == userId && c.Status == FmdStatus.Active);
    }

    public async Task<int> GetCycleCountAsync(Guid userId)
    {
        return await _dbSet.CountAsync(c => c.UserId == userId);
    }
}

public class FmdRuleRepository : GenericRepository<FmdRule>, IFmdRuleRepository
{
    public FmdRuleRepository(DietDbContext context) : base(context) { }

    public async Task<FmdRule?> GetRuleByDayAsync(int dayNumber)
    {
        return await _dbSet.FirstOrDefaultAsync(r => r.DayNumber == dayNumber);
    }

    public async Task<List<FmdRule>> GetAllRulesAsync()
    {
        return await _dbSet.OrderBy(r => r.DayNumber).ToListAsync();
    }
}

public class MealTemplateRepository : GenericRepository<MealTemplate>, IMealTemplateRepository
{
    public MealTemplateRepository(DietDbContext context) : base(context) { }

    public async Task<List<MealTemplate>> GetTemplatesAsync(bool adminOnly = false)
    {
        var query = _dbSet.AsNoTracking();
        if (adminOnly) query = query.Where(t => t.IsAdminTemplate);
        return await query.OrderBy(t => t.Name).ToListAsync();
    }
}

