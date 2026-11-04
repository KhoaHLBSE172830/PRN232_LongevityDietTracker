namespace BuildingBlocks.Common.Primitives;

public abstract class Entity<TId>
{
    public TId Id { get; protected set; } = default!;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }

    protected Entity() { }

    protected Entity(TId id)
    {
        Id = id;
    }
}

public abstract class Entity : Entity<Guid>
{
    protected Entity() : base(Guid.NewGuid()) { }
    protected Entity(Guid id) : base(id) { }
}

