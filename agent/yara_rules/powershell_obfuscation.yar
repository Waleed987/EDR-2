rule Obfuscated_PowerShell
{
    strings:
        $ps = "powershell"
        $enc = "-enc"
        $b64 = /[A-Za-z0-9+/]{100,}/
    condition:
        $ps and $enc and $b64
}
