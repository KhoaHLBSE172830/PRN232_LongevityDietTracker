using System.Collections.Concurrent;
using DietFasting.Application.Services;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace DietFasting.Infrastructure.Core.Cache;

/// <summary>
/// Atomic "first caller wins" marker. Uses Redis <c>SET key value NX EX ttl</c> when Redis is reachable and falls back to a
/// process-local dictionary otherwise (enough for a single instance, e.g. local demo).
/// </summary>
public sealed class RedisReminderDedupStore : IReminderDedupStore
{
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<RedisReminderDedupStore> _logger;
    private readonly ConcurrentDictionary<string, DateTime> _local = new();

    public RedisReminderDedupStore(ILogger<RedisReminderDedupStore> logger, IConnectionMultiplexer? redis = null)
    {
        _logger = logger;
        _redis = redis;
    }

    public async Task<bool> TryAcquireAsync(string key, TimeSpan lease, CancellationToken cancellationToken = default)
    {
        if (RedisAvailable)
        {
            try
            {
                return await _redis!.GetDatabase().StringSetAsync(key, "pending", lease, When.NotExists);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis unavailable for reminder dedup, falling back to in-memory store.");
            }
        }

        var now = DateTime.UtcNow;
        foreach (var expired in _local.Where(kv => kv.Value <= now).Select(kv => kv.Key).ToList())
            _local.TryRemove(expired, out _);

        return _local.TryAdd(key, now.Add(lease));
    }

    public async Task CommitAsync(string key, TimeSpan timeToLive, CancellationToken cancellationToken = default)
    {
        if (RedisAvailable)
        {
            try
            {
                await _redis!.GetDatabase().StringSetAsync(key, "done", timeToLive);
                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis unavailable while committing reminder dedup key, using in-memory store.");
            }
        }

        _local[key] = DateTime.UtcNow.Add(timeToLive);
    }

    public async Task ReleaseAsync(string key, CancellationToken cancellationToken = default)
    {
        if (RedisAvailable)
        {
            try
            {
                await _redis!.GetDatabase().KeyDeleteAsync(key);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis unavailable while releasing reminder dedup key.");
            }
        }

        _local.TryRemove(key, out _);
    }

    private bool RedisAvailable => _redis is { IsConnected: true };
}
