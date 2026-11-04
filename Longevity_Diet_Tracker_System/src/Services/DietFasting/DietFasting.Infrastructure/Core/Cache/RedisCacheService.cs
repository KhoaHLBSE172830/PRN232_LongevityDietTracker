using System.Text.Json;
using DietFasting.Application.Services;
using StackExchange.Redis;

namespace DietFasting.Infrastructure.Core.Cache;

public class RedisCacheService : IRedisCacheService
{
    private readonly IConnectionMultiplexer? _redis;
    private readonly IDatabase? _db;

    public RedisCacheService(IConnectionMultiplexer? redis = null)
    {
        _redis = redis;
        _db = _redis?.GetDatabase();
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        if (_db == null) return default;
        var value = await _db.StringGetAsync(key);
        if (value.IsNullOrEmpty) return default;
        return JsonSerializer.Deserialize<T>(value.ToString()!);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null)
    {
        if (_db == null) return;
        var serialized = JsonSerializer.Serialize(value);
        await _db.StringSetAsync(key, serialized, expiry ?? TimeSpan.FromHours(1));
    }

    public async Task RemoveAsync(string key)
    {
        if (_db == null) return;
        await _db.KeyDeleteAsync(key);
    }
}

