using System.Linq.Expressions;

namespace BuildingBlocks.Common.Repositories;

public interface IGenericRepository<T> where T : class
{
    Task<T> CreateAsync(T entity);
    Task CreateRangeAsync(IEnumerable<T> entities);
    Task<List<T>> ListAsync(params string[] navigationProperties);
    Task<T?> FindByIdAsync(Guid id, params string[] navigationProperties);
    Task<T> FoundOrThrowAsync(Guid id, string message = "Resource not found", params string[] navigationProperties);
    Task<List<T>> WhereAsync(Expression<Func<T, bool>> predicate, params string[] navigationProperties);
    Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, params string[] navigationProperties);
    Task<T> UpdateAsync(T updated);
    Task UpdateRangeAsync(IEnumerable<T> entities);
    Task<T> DeleteAsync(Guid id);
    Task DeleteAsync(T entity);
    Task DeleteRangeAsync(IEnumerable<T> entities);
    Task<int> CountAsync(Expression<Func<T, bool>>? filter = null);
    Task<List<T>> WherePagedAsync(
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        int? page = null,
        int? pageSize = null,
        params string[] navigationProperties);
}

public interface IUnitOfWork
{
    Task<IAsyncDisposable> BeginTransactionAsync(CancellationToken cancellationToken = default);
    Task CommitTransactionAsync(CancellationToken cancellationToken = default);
    Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

