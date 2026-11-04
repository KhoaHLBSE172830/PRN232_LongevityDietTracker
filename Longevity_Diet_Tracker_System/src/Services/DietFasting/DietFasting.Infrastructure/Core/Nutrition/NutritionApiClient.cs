using DietFasting.Application.DTOs;
using DietFasting.Application.Services;
using Microsoft.Extensions.Configuration;

namespace DietFasting.Infrastructure.Core.Nutrition;

public class NutritionApiClient : INutritionService
{
    private readonly HttpClient _httpClient;
    private readonly IRedisCacheService _cacheService;
    private readonly string _apiKey;

    public NutritionApiClient(
        HttpClient httpClient,
        IRedisCacheService cacheService,
        IConfiguration configuration)
    {
        _httpClient = httpClient;
        _cacheService = cacheService;
        _apiKey = configuration["NutritionApi:ApiKey"] ?? "demo-api-key";
    }

    public async Task<List<FoodItemDto>> SearchFoodItemsAsync(string query)
    {
        var cacheKey = $"nutrition:search:{query.ToLowerInvariant().Trim()}";
        var cached = await _cacheService.GetAsync<List<FoodItemDto>>(cacheKey);
        if (cached != null) return cached;

        await Task.Yield();
        var mockResults = new List<FoodItemDto>
        {
            new("food-001", $"{query} (Standard Serving)", 100, "g", 150, 5, 25, 3),
            new("food-002", $"{query} (Organic Whole)", 150, "g", 210, 8, 30, 4)
        };

        await _cacheService.SetAsync(cacheKey, mockResults, TimeSpan.FromHours(24));
        return mockResults;
    }

    public async Task<FoodItemDto> GetFoodDetailsAsync(string externalFoodId)
    {
        var cacheKey = $"nutrition:item:{externalFoodId}";
        var cached = await _cacheService.GetAsync<FoodItemDto>(cacheKey);
        if (cached != null) return cached;

        await Task.Yield();
        var details = new FoodItemDto(externalFoodId, "Nutrient Dense Blue Zones Food", 100, "g", 120, 6, 18, 2);
        await _cacheService.SetAsync(cacheKey, details, TimeSpan.FromDays(7));
        return details;
    }
}

