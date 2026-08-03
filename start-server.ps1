param(
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$Root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "docs"))

function Get-ContentType([string]$Path) {
    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        ".html" { return "text/html; charset=utf-8" }
        ".htm"  { return "text/html; charset=utf-8" }
        ".css"  { return "text/css; charset=utf-8" }
        ".js"   { return "application/javascript; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".gif"  { return "image/gif" }
        ".svg"  { return "image/svg+xml" }
        ".ico"  { return "image/x-icon" }
        ".xlsx" { return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
        ".pdf"  { return "application/pdf" }
        default  { return "application/octet-stream" }
    }
}

function Send-Response {
    param(
        [System.IO.Stream]$Stream,
        [int]$StatusCode,
        [string]$StatusText,
        [byte[]]$Body,
        [string]$ContentType = "text/plain; charset=utf-8",
        [bool]$SendBody = $true
    )

    if ($null -eq $Body) { $Body = [byte[]]::new(0) }
    $Headers = "HTTP/1.1 $StatusCode $StatusText`r`n" +
               "Content-Type: $ContentType`r`n" +
               "Content-Length: $($Body.Length)`r`n" +
               "Cache-Control: no-cache`r`n" +
               "Connection: close`r`n`r`n"
    $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($Headers)
    $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
    if ($SendBody -and $Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }
    $Stream.Flush()
}

$Listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try {
    $Listener.Start()
} catch {
    Write-Host "Cannot start the website on port $Port." -ForegroundColor Red
    Write-Host "Another program may already be using this port." -ForegroundColor Yellow
    Write-Host "Close the other server window and try again." -ForegroundColor Yellow
    exit 1
}

$Url = "http://localhost:$Port/"
Write-Host "Website is running:" -ForegroundColor Green
Write-Host "  StaffTemplate Upload: $Url"
Write-Host "  Security/Admin: ${Url}admin.html"
Write-Host ""
Write-Host "Keep this window open. Press Ctrl+C to stop." -ForegroundColor Yellow

try {
    Start-Process $Url
} catch {
    Write-Host "Open $Url in Chrome or Edge." -ForegroundColor Yellow
}

try {
    while ($true) {
        $Client = $Listener.AcceptTcpClient()
        try {
            $Stream = $Client.GetStream()
            $Reader = [System.IO.StreamReader]::new(
                $Stream,
                [System.Text.Encoding]::ASCII,
                $false,
                1024,
                $true
            )

            $RequestLine = $Reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($RequestLine)) { continue }

            while ($true) {
                $HeaderLine = $Reader.ReadLine()
                if ($null -eq $HeaderLine -or $HeaderLine -eq "") { break }
            }

            $Parts = $RequestLine -split " "
            if ($Parts.Count -lt 2) {
                $Message = [System.Text.Encoding]::UTF8.GetBytes("Bad Request")
                Send-Response -Stream $Stream -StatusCode 400 -StatusText "Bad Request" -Body $Message
                continue
            }

            $Method = $Parts[0].ToUpperInvariant()
            $RawPath = ($Parts[1] -split "\?")[0]
            $RelativePath = [System.Uri]::UnescapeDataString($RawPath).TrimStart("/")
            if ([string]::IsNullOrWhiteSpace($RelativePath)) { $RelativePath = "index.html" }
            if ($RelativePath.EndsWith("/")) { $RelativePath += "index.html" }

            $RelativePath = $RelativePath.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
            $FilePath = [System.IO.Path]::GetFullPath((Join-Path $Root $RelativePath))

            if (-not $FilePath.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
                $Message = [System.Text.Encoding]::UTF8.GetBytes("Forbidden")
                Send-Response -Stream $Stream -StatusCode 403 -StatusText "Forbidden" -Body $Message
                continue
            }

            if ([System.IO.Directory]::Exists($FilePath)) {
                $FilePath = Join-Path $FilePath "index.html"
            }

            if ($Method -ne "GET" -and $Method -ne "HEAD") {
                $Message = [System.Text.Encoding]::UTF8.GetBytes("Method Not Allowed")
                Send-Response -Stream $Stream -StatusCode 405 -StatusText "Method Not Allowed" -Body $Message
                continue
            }

            if (-not [System.IO.File]::Exists($FilePath)) {
                $Message = [System.Text.Encoding]::UTF8.GetBytes("404 - File not found")
                Send-Response -Stream $Stream -StatusCode 404 -StatusText "Not Found" -Body $Message -SendBody ($Method -eq "GET")
                continue
            }

            $Body = [System.IO.File]::ReadAllBytes($FilePath)
            Send-Response -Stream $Stream -StatusCode 200 -StatusText "OK" -Body $Body -ContentType (Get-ContentType $FilePath) -SendBody ($Method -eq "GET")
        } catch {
            try {
                $Message = [System.Text.Encoding]::UTF8.GetBytes("Internal Server Error")
                Send-Response -Stream $Stream -StatusCode 500 -StatusText "Internal Server Error" -Body $Message
            } catch { }
        } finally {
            if ($null -ne $Reader) { $Reader.Dispose() }
            if ($null -ne $Stream) { $Stream.Dispose() }
            $Client.Close()
        }
    }
} finally {
    $Listener.Stop()
}
