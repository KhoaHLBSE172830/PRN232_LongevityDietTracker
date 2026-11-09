using BuildingBlocks.Common.Repositories;
using Notification.Domain.Entities;

namespace Notification.Application.Repositories;

public interface INotificationLogRepository : IGenericRepository<NotificationLog>
{
    Task<IReadOnlyList<NotificationLog>> GetLogsByUserIdAsync(Guid userId, int limit = 50, CancellationToken cancellationToken = default);
    Task<bool> HasEventBeenProcessedAsync(string eventId, CancellationToken cancellationToken = default);
}

public interface INotificationPreferenceRepository : IGenericRepository<NotificationPreference>
{
    Task<NotificationPreference?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
}
