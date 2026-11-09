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
        // AGENT.md 4.2: Standardized cache key: nutrition:food:{normalized_name}
        var normalized = query.Trim().ToLowerInvariant().Replace(" ", "_");
        var cacheKey = $"nutrition:food:{normalized}";
        var cached = await _cacheService.GetAsync<List<FoodItemDto>>(cacheKey);
        if (cached != null) return cached;

        await Task.Yield();
        // Blue Zones Plant Slant items with rich dietary fiber
        var mockResults = new List<FoodItemDto>
        {
            new("food-001", $"{query} (Blue Zones Whole & Plant Slant)", 100, "g", 145, 7.5, 22.0, 2.5, FiberGrams: 8.5),
            new("food-002", $"{query} (Steamed Legume & Vegetable Mix)", 150, "g", 195, 9.0, 28.0, 3.5, FiberGrams: 11.0)
        };

        await _cacheService.SetAsync(cacheKey, mockResults, TimeSpan.FromHours(24));
        return mockResults;
    }

    public async Task<FoodItemDto> GetFoodDetailsAsync(string externalFoodId)
    {
        var cacheKey = $"nutrition:food:{externalFoodId}";
        var cached = await _cacheService.GetAsync<FoodItemDto>(cacheKey);
        if (cached != null) return cached;

        await Task.Yield();
        var details = new FoodItemDto(externalFoodId, "Nutrient Dense Blue Zones Centenarian Food", 100, "g", 130, 8, 20, 2, FiberGrams: 9.0);
        await _cacheService.SetAsync(cacheKey, details, TimeSpan.FromDays(7));
        return details;
    }
}
