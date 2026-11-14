namespace NASA.FireSafety.API.Services;

public sealed class HabitatSubmissionOptions
{
    // Qualitative AI interpretation is independent of legacy numerical simulation approval.
    public bool InterpretationEnabled { get; set; } = true;
    public bool Enabled { get; set; }
    // Must identify an actual fixture and its science-team approval, not a demo label.
    public string? ApprovedFixtureReference { get; set; }
}
