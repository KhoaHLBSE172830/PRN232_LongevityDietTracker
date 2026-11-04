namespace Identity.Domain.Constants;

public static class IdentityConstants
{
    public static class Roles
    {
        public const string User = "User";
        public const string Nutritionist = "Nutritionist";
        public const string Admin = "Admin";
    }

    public static class Policies
    {
        public const string RequireUser = "RequireUser";
        public const string RequireNutritionist = "RequireNutritionist";
        public const string RequireAdmin = "RequireAdmin";
    }
}

