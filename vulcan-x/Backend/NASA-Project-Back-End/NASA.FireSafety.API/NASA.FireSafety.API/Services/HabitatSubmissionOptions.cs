namespace NASA.FireSafety.API.Services;

public sealed class HabitatSubmissionOptions
{
    public bool Enabled { get; set; }
    // Must identify an actual fixture and its science-team approval, not a demo label.
    public string? ApprovedFixtureReference { get; set; }
}
