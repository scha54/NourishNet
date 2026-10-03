<#
.SYNOPSIS
    Verifies the active AWS credentials by calling `aws sts get-caller-identity`.

.DESCRIPTION
    Confirms that the AWS CLI is installed and that valid credentials are
    configured in the current environment. Prints the caller's Account, UserId,
    and Arn to the console, and writes an evidence record (including a timestamp
    and the resolved AWS region) to docs/evidence/command-output/aws-identity.txt.

    Security notes:
      - This script never prints or writes secret access keys, session tokens,
        or any other credential material. Only the non-sensitive identity fields
        returned by STS (Account, UserId, Arn) are surfaced.

.NOTES
    Exits with a non-zero code if the AWS CLI is missing or the call fails.
#>

$ErrorActionPreference = 'Stop'

function Resolve-AwsRegion {
    if ($env:AWS_REGION) { return $env:AWS_REGION }
    if ($env:AWS_DEFAULT_REGION) { return $env:AWS_DEFAULT_REGION }

    try {
        $configuredRegion = (& aws configure get region 2>$null)
        if ($LASTEXITCODE -eq 0 -and $configuredRegion) {
            return $configuredRegion.Trim()
        }
    } catch {
        # Fall through to the unknown default below.
    }

    return '(unknown)'
}

# --- 1. Confirm the AWS CLI is installed -----------------------------------
$awsCommand = Get-Command aws -ErrorAction SilentlyContinue
if (-not $awsCommand) {
    Write-Error 'AWS CLI not found on PATH. Install it from https://aws.amazon.com/cli/ and ensure `aws` is available.'
    exit 1
}

# --- 2. Call STS get-caller-identity ---------------------------------------
try {
    $identityJson = (& aws sts get-caller-identity --output json 2>&1)
    if ($LASTEXITCODE -ne 0) {
        Write-Error "aws sts get-caller-identity failed. Check that valid AWS credentials are configured. Details: $identityJson"
        exit 1
    }
} catch {
    Write-Error "Failed to invoke the AWS CLI: $($_.Exception.Message)"
    exit 1
}

try {
    $identity = $identityJson | ConvertFrom-Json
} catch {
    Write-Error 'Unable to parse the response from aws sts get-caller-identity.'
    exit 1
}

$region = Resolve-AwsRegion
$timestamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')

# --- 3. Print non-sensitive identity fields to the console -----------------
Write-Host 'AWS connection verified.'
Write-Host "  Account : $($identity.Account)"
Write-Host "  UserId  : $($identity.UserId)"
Write-Host "  Arn     : $($identity.Arn)"
Write-Host "  Region  : $region"
Write-Host "  Checked : $timestamp"

# --- 4. Write evidence output ----------------------------------------------
$evidenceDir = Join-Path $PSScriptRoot '..\docs\evidence\command-output'
if (-not (Test-Path -LiteralPath $evidenceDir)) {
    New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null
}

$evidenceFile = Join-Path $evidenceDir 'aws-identity.txt'

$lines = @(
    'NourishNet — AWS connection verification',
    "Timestamp : $timestamp",
    "Region    : $region",
    "Account   : $($identity.Account)",
    "UserId    : $($identity.UserId)",
    "Arn       : $($identity.Arn)",
    '',
    'Note: credentials/secrets are intentionally omitted from this record.'
)

Set-Content -LiteralPath $evidenceFile -Value $lines -Encoding utf8

$resolvedEvidencePath = (Resolve-Path -LiteralPath $evidenceFile).Path
Write-Host "Evidence written to: $resolvedEvidencePath"

exit 0
